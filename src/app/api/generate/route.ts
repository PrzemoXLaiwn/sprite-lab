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
import { generateImage, RUNWARE_MODELS, MODEL_COSTS, type RunwareModelId } from "@/lib/runware";

// Timeout for API calls (2 minutes)
const API_TIMEOUT = 120000;

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

    // 📦 Parse Request
    const body = await request.json();
    const {
      prompt,
      categoryId,
      subcategoryId,
      styleId = "PIXEL_ART_16",
      seed,
      // Premium features
      enableStyleMix = false,
      style2Id,
      style1Weight = 70,
      colorPaletteId,
      // Model selection (optional - tier-based by default)
      modelId,
    } = body;

    // ✅ Validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for your sprite." },
        { status: 400 }
      );
    }

    if (prompt.trim().length > 500) {
      return NextResponse.json(
        { error: "Description too long. Maximum 500 characters." },
        { status: 400 }
      );
    }

    if (!categoryId || !subcategoryId) {
      return NextResponse.json(
        { error: "Please select a category and type." },
        { status: 400 }
      );
    }

    // Validate category exists
    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}` },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid type: ${subcategoryId}` },
        { status: 400 }
      );
    }

    // Validate style exists
    if (!STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}` },
        { status: 400 }
      );
    }

    // 💳 Credits Check & Deduct ATOMICALLY (prevents race condition)
    const CREDITS_REQUIRED = 1;
    await getOrCreateUser(user.id, user.email!);

    // Get user tier for model selection
    const userTier = await getUserTier(user.id);
    console.log(`[API] 👤 User tier: ${userTier}`);

    // Atomically check and deduct credits BEFORE generation
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

    // 🏗️ Build Prompt (with Premium Features if enabled)
    const hasPremiumFeatures = enableStyleMix || colorPaletteId;

    const { prompt: builtPrompt, negativePrompt: builtNegative, guidance, steps } = hasPremiumFeatures
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

    // Use prompts directly from builder
    const finalPrompt = builtPrompt;
    const negativePrompt = builtNegative;

    console.log(`[API] 📝 Prompt: ${finalPrompt.substring(0, 100)}...`);

    // 🎨 Generate Sprite with Runware (with timeout)
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
      // Refund credits on timeout or error
      console.log("[API] ⚠️ Generation failed, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    if (!result.success || !result.images || result.images.length === 0) {
      // Refund credits if generation failed
      console.log("[API] ⚠️ Generation returned no image, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      return NextResponse.json(
        { error: result.error || "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const generatedImage = result.images[0];

    // 📤 Upload to Storage
    console.log("[API] 📤 Uploading to storage...");
    const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${generatedImage.seed}`;
    const uploadResult = await uploadImageToStorage(generatedImage.imageURL, user.id, fileName);
    const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : generatedImage.imageURL;

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
      replicateCost: generatedImage.cost, // Still called replicateCost for backwards compat
    });

    // 📊 Final Stats
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const styleConfig = STYLES_2D_FULL[styleId];

    console.log("\n" + "═".repeat(70));
    console.log("🎉 GENERATION COMPLETE! (Runware)");
    console.log("═".repeat(70));
    console.log("⏱️  Duration:", duration + "s");
    console.log("🎨 Style:", styleConfig.name);
    console.log("🤖 Model:", generatedImage.model);
    console.log("💰 Cost: $" + (generatedImage.cost || 0).toFixed(4));
    console.log("🌱 Seed:", generatedImage.seed);
    console.log("🖼️  URL:", finalUrl.substring(0, 80) + "...");
    console.log("═".repeat(70) + "\n");

    // ✅ Return Success Response
    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      format: "png",
      is2DSprite: true,
      prompt: prompt.trim(),
      fullPrompt: finalPrompt,
      seed: generatedImage.seed,
      modelUsed: generatedImage.model,
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
    console.error("[API] ❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
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
    version: "4.0.0",
    name: "Ultimate 2D Sprite Generator (Runware)",
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
    ],
  });
}
