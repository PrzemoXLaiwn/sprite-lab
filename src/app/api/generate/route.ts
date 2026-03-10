import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  CATEGORY_PROMPT_CONFIGS,
  buildUltimatePrompt,
  buildEnhancedPrompt,
} from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration, getUserTier } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { generateImage, removeBackground, RUNWARE_MODELS, MODEL_COSTS, type RunwareModelId } from "@/lib/runware";
import { enhancePromptWithLearnedFixes } from "@/lib/analytics/prompt-enhancer";
import { z } from "zod";
import { parseJsonBody, validateBody } from "@/lib/validation/common";

// Timeout for API calls (2 minutes)
const API_TIMEOUT = 120000;

// ─── Input validation schema ──────────────────────────────────────────────────
// This validates the raw request body before any business logic runs.
// Fields beyond this schema (qualityPreset, enableStyleMix, etc.) are
// extracted from the validated body below — Zod uses .passthrough() so
// unknown keys are preserved.
const GenerateBodySchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Please enter a description for your sprite.")
      .max(500, "Description too long. Maximum 500 characters.")
      .transform((v) => v.trim()),
    categoryId: z
      .string()
      .min(1, "Please select a category."),
    subcategoryId: z
      .string()
      .min(1, "Please select a type."),
    styleId: z.string().optional().default("PIXEL_ART_16"),
    seed: z.union([z.number(), z.string(), z.null()]).optional(),
    qualityPreset: z.enum(["draft", "normal", "hd"]).optional().default("normal"),
    enableStyleMix: z.boolean().optional().default(false),
    style2Id: z.string().optional(),
    style1Weight: z.number().min(0).max(100).optional().default(70),
    colorPaletteId: z.string().optional(),
    modelId: z.string().optional(),
  })
  .passthrough();

// ===========================================
// 🔁 RETRY WRAPPER
// ===========================================
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const msg = lastError.message?.toLowerCase() || "";

      if (msg.includes("429") || msg.includes("rate") || msg.includes("502") ||
          msg.includes("503") || msg.includes("504") || msg.includes("timeout")) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[Retry] ⏳ Attempt ${attempt + 1}/${maxRetries}, waiting ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

// ===========================================
// 🚀 MAIN API HANDLER - POST
// ===========================================
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 🔐 Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate sprites." },
        { status: 401 }
      );
    }

    // 📦 Parse + validate request body
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json(
        { error: "Invalid request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = validateBody(GenerateBodySchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const {
      prompt,
      categoryId,
      subcategoryId,
      styleId,
      seed,
      qualityPreset,
      enableStyleMix,
      style2Id,
      style1Weight,
      colorPaletteId,
      modelId,
    } = parsed.data;

    // Quality preset settings
    const QUALITY_SETTINGS: Record<string, { steps: number; guidance: number }> = {
      draft: { steps: 15, guidance: 2.5 },
      normal: { steps: 25, guidance: 3.0 },
      hd: { steps: 35, guidance: 3.5 },
    };
    const qualityConfig = QUALITY_SETTINGS[qualityPreset] || QUALITY_SETTINGS.normal;

    // ✅ Semantic validation (category/subcategory/style existence checks)
    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid type: ${subcategoryId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    if (!STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // 💳 Credits Check
    const CREDITS_REQUIRED = 1;
    await getOrCreateUser(user.id, user.email!);

    const userTier = await getUserTier(user.id);
    console.log(`[API] 👤 User tier: ${userTier}`);

    const creditResult = await checkAndDeductCredits(user.id, CREDITS_REQUIRED);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Not enough credits. You need ${CREDITS_REQUIRED} credit.`, noCredits: true },
        { status: 402 }
      );
    }

    // 🎲 Seed Handling
    let usedSeed: number;
    if (seed !== undefined && seed !== null && seed !== "") {
      usedSeed = Number(seed);
      if (isNaN(usedSeed) || usedSeed < 0 || usedSeed > 2147483647) {
        usedSeed = Math.floor(Math.random() * 2147483647);
      }
    } else {
      usedSeed = Math.floor(Math.random() * 2147483647);
    }

    // 🏗️ Build Base Prompt
    const hasPremiumFeatures = enableStyleMix || colorPaletteId;

    const { prompt: builtPrompt, negativePrompt: builtNegative, guidance: styleGuidance, steps: styleSteps } = hasPremiumFeatures
      ? buildEnhancedPrompt(
          prompt.trim(),
          categoryId,
          subcategoryId,
          styleId,
          {
            enableStyleMix,
            style2Id,
            style1Weight,
            colorPaletteId,
          }
        )
      : buildUltimatePrompt(
          prompt.trim(),
          categoryId,
          subcategoryId,
          styleId
        );

    // ✨🔥 NEW: APPLY LEARNED OPTIMIZATIONS! 🔥✨
    console.log(`[API] 🧠 Applying learned optimizations...`);
    const {
      enhancedPrompt,
      enhancedNegative,
      appliedFixes,
      warnings,
    } = await enhancePromptWithLearnedFixes(
      builtPrompt,
      builtNegative,
      categoryId,
      subcategoryId,
      styleId
    );

    // Log what was applied
    if (appliedFixes.length > 0) {
      console.log(`[API] ✅ Applied ${appliedFixes.length} learned fixes:`);
      appliedFixes.forEach((fix) => console.log(`  - ${fix}`));
    }
    if (warnings.length > 0) {
      console.log(`[API] ⚠️ Warnings:`, warnings);
    }

    // Use enhanced prompts
    const finalPrompt = enhancedPrompt;
    const negativePrompt = enhancedNegative;

    const steps = qualityConfig.steps || styleSteps;
    const guidance = qualityConfig.guidance || styleGuidance;

    console.log(`[API] 🎚️ Quality: ${qualityPreset} (steps: ${steps}, guidance: ${guidance})`);
    console.log(`[API] 📝 Final Prompt: ${finalPrompt.substring(0, 150)}...`);

    // 🎨 Generate Sprite
    let result: { success: boolean; images?: Array<{ imageURL: string; seed: number; model: string; cost: number }>; error?: string };

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Generation timed out after 2 minutes")), API_TIMEOUT);
      });

      result = await Promise.race([
        withRetry(async () => {
          return await generateImage(
            {
              prompt: finalPrompt,
              negativePrompt,
              model: modelId as RunwareModelId | undefined,
              seed: usedSeed,
              steps,
              guidance,
              width: 1024,
              height: 1024,
            },
            userTier
          );
        }),
        timeoutPromise
      ]);
    } catch (error) {
      console.log("[API] ⚠️ Generation failed, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    if (!result.success || !result.images || result.images.length === 0) {
      console.log("[API] ⚠️ Generation returned no image, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      return NextResponse.json(
        { error: result.error || "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const generatedImage = result.images[0];

    // 🔪 Auto Remove Background
    console.log("[API] 🔪 Auto-removing background for game-ready asset...");
    let imageUrlForUpload = generatedImage.imageURL;

    try {
      const bgRemovalResult = await removeBackground(generatedImage.imageURL);
      if (bgRemovalResult.success && bgRemovalResult.imageUrl) {
        imageUrlForUpload = bgRemovalResult.imageUrl;
        console.log("[API] ✅ Background removed successfully!");
      } else {
        console.log("[API] ⚠️ Background removal failed, using original image:", bgRemovalResult.error);
      }
    } catch (bgError) {
      console.log("[API] ⚠️ Background removal error, using original image:", bgError);
    }

    // 📤 Upload to Storage (R2 primary, Supabase fallback)
    console.log("[API] 📤 Uploading to storage...");
    let finalUrl = imageUrlForUpload;
    let storageUsed = "temporary";

    if (isR2Configured()) {
      // 🚀 R2 is primary storage (zero egress costs!)
      const r2Result = await uploadToR2(imageUrlForUpload, user.id);
      if (r2Result.success && r2Result.url) {
        finalUrl = r2Result.url;
        storageUsed = "R2";
        console.log(`[Generate] ✅ Image saved to R2: ${finalUrl}`);
      } else {
        // R2 failed, try Supabase as fallback
        console.log(`[Generate] ⚠️ R2 upload failed: ${r2Result.error}, trying Supabase...`);
        const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${generatedImage.seed}`;
        const supabaseResult = await uploadImageToStorage(imageUrlForUpload, user.id, fileName);
        if (supabaseResult.success && supabaseResult.url) {
          finalUrl = supabaseResult.url;
          storageUsed = "Supabase";
          console.log(`[Generate] ✅ Image saved to Supabase: ${finalUrl}`);
        }
      }
    } else {
      // R2 not configured, use Supabase
      const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${generatedImage.seed}`;
      const supabaseResult = await uploadImageToStorage(imageUrlForUpload, user.id, fileName);
      if (supabaseResult.success && supabaseResult.url) {
        finalUrl = supabaseResult.url;
        storageUsed = "Supabase";
        console.log(`[Generate] ✅ Image saved to Supabase: ${finalUrl}`);
      }
    }

    // 💾 Save to Database
    await saveGeneration({
      userId: user.id,
      prompt: prompt.trim(),
      fullPrompt: finalPrompt,
      categoryId,
      subcategoryId,
      styleId,
      imageUrl: finalUrl,
      seed: generatedImage.seed,
      replicateCost: generatedImage.cost,
    });

    // 📊 Final Stats
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const styleConfig = STYLES_2D_FULL[styleId];

    console.log("\n" + "═".repeat(70));
    console.log("🎉 GENERATION COMPLETE! (Runware + Learned Optimizations)");
    console.log("═".repeat(70));
    console.log("⏱️  Duration:", duration + "s");
    console.log("🎨 Style:", styleConfig.name);
    console.log("🤖 Model:", generatedImage.model);
    console.log("💰 Cost: $" + (generatedImage.cost || 0).toFixed(4));
    console.log("🌱 Seed:", generatedImage.seed);
    console.log("🧠 Fixes Applied:", appliedFixes.length);
    console.log("💾 Storage:", storageUsed);
    console.log("🖼️  URL:", finalUrl.substring(0, 80) + "...");
    console.log("═".repeat(70) + "\n");

    // ✅ Return Success Response
    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      format: "png",
      is2DSprite: true,
      transparentBackground: true,
      prompt: prompt.trim(),
      fullPrompt: finalPrompt,
      seed: generatedImage.seed,
      modelUsed: generatedImage.model,
      // 🆕 Include applied fixes in response for debugging
      appliedOptimizations: appliedFixes,
      warnings: warnings,
      style: {
        id: styleId,
        name: styleConfig.name,
      },
      category: {
        id: category.id,
        name: category.name,
      },
      subcategory: {
        id: subcategory.id,
        name: subcategory.name,
      },
      creditsUsed: CREDITS_REQUIRED,
      duration: `${duration}s`,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error("[API] ❌ Unexpected error:", {
      message: errorMessage,
      stack: errorStack,
      name: error instanceof Error ? error.name : "Unknown",
    });

    // Always return error details for debugging (temporarily)
    return NextResponse.json(
      {
        error: errorMessage || "Something went wrong. Please try again.",
        errorType: error instanceof Error ? error.name : "Unknown",
      },
      { status: 500 }
    );
  }
}

// ===========================================
// 📋 GET - API Info
// ===========================================
export async function GET() {
  const styles = Object.entries(STYLES_2D_FULL).map(([id, config]) => ({
    id,
    name: config.name,
    model: config.model,
  }));

  const categories = Object.keys(CATEGORY_PROMPT_CONFIGS).map(catId => ({
    id: catId,
    subcategories: Object.keys(CATEGORY_PROMPT_CONFIGS[catId]),
  }));

  const models = Object.entries(RUNWARE_MODELS).map(([id, air]) => ({
    id,
    air,
    cost: MODEL_COSTS[id as RunwareModelId],
  }));

  return NextResponse.json({
    version: "4.1.0", // Bumped version!
    name: "Ultimate 2D Sprite Generator (Runware + Auto-Learning)",
    provider: "Runware",
    styles,
    categories,
    models,
    defaultStyle: "PIXEL_ART_16",
    outputFormat: "png",
    resolution: "1024x1024",
    creditsPerGeneration: 1,
    features: [
      "Tier-based model selection",
      "FLUX.2 Pro for premium users",
      "Midjourney V7 support",
      "Hand-crafted prompts for every category",
      "Sub-second inference times",
      "Smart fallback system",
      "🆕 Auto-learning from quality analysis",
      "🆕 Automatic hallucination prevention",
    ],
  });
}