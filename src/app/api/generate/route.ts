import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  CATEGORY_PROMPT_CONFIGS,
  buildUltimatePrompt,
} from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

// Timeout for API calls (2 minutes)
const API_TIMEOUT = 120000;

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ===========================================
// 🖼️ IMAGE GENERATION FUNCTIONS
// ===========================================
type ModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

async function runFluxDev(
  prompt: string,
  seed: number,
  steps: number
): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    console.log("[FLUX-Dev] 🚀 Starting generation...");
    const output = await replicate.run(
      "black-forest-labs/flux-dev" as ModelIdentifier,
      {
        input: {
          prompt,
          seed,
          go_fast: false,
          guidance: 3.5,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 100,
          num_inference_steps: steps,
        },
      }
    );
    const imageUrl = extractUrl(output);
    if (imageUrl) {
      console.log("[FLUX-Dev] ✅ Success!");
      return { imageUrl };
    }
    return { imageUrl: null, error: "No output URL" };
  } catch (error) {
    console.error("[FLUX-Dev] ❌ Error:", error);
    return { imageUrl: null, error: String(error) };
  }
}

async function runFluxSchnell(
  prompt: string,
  seed: number
): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    console.log("[FLUX-Schnell] 🚀 Starting generation...");
    const output = await replicate.run(
      "black-forest-labs/flux-schnell" as ModelIdentifier,
      {
        input: {
          prompt,
          seed,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 100,
        },
      }
    );
    const imageUrl = extractUrl(output);
    if (imageUrl) {
      console.log("[FLUX-Schnell] ✅ Success!");
      return { imageUrl };
    }
    return { imageUrl: null, error: "No output URL" };
  } catch (error) {
    console.error("[FLUX-Schnell] ❌ Error:", error);
    return { imageUrl: null, error: String(error) };
  }
}

async function runSDXL(
  prompt: string,
  negative: string,
  seed: number,
  guidance: number,
  steps: number
): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    console.log("[SDXL] 🚀 Starting generation... (guidance:", guidance, ", steps:", steps, ")");
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b" as ModelIdentifier,
      {
        input: {
          prompt,
          negative_prompt: negative,
          seed,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          guidance_scale: guidance,
          num_inference_steps: steps,
          scheduler: "K_EULER",
          refine: "expert_ensemble_refiner",
          high_noise_frac: 0.8,
          apply_watermark: false,
        },
      }
    );
    const imageUrl = extractUrl(output);
    if (imageUrl) {
      console.log("[SDXL] ✅ Success!");
      return { imageUrl };
    }
    return { imageUrl: null, error: "No output URL" };
  } catch (error) {
    console.error("[SDXL] ❌ Error:", error);
    return { imageUrl: null, error: String(error) };
  }
}

function extractUrl(output: unknown): string | null {
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      if (typeof obj.url === "function") {
        try { return (obj.url as () => URL)().toString(); } catch { /* ignore */ }
      }
      if (typeof obj.url === "string") return obj.url;
      if (typeof obj.uri === "string") return obj.uri;
      if (typeof obj.href === "string") return obj.href;
    }
  }
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
  }
  return null;
}

// ===========================================
// 🔄 GENERATION WITH SMART FALLBACK
// ===========================================
// Replicate cost per model (USD) - based on their pricing
const MODEL_COSTS: Record<string, number> = {
  "flux-dev": 0.025,      // ~$0.025 per image (25 steps)
  "flux-schnell": 0.003,  // ~$0.003 per image (4 steps)
  "sdxl": 0.0023,         // ~$0.0023 per image
};

async function generateSprite(
  prompt: string,
  negative: string,
  preferredModel: "flux-dev" | "sdxl" | "flux-schnell",
  guidance: number,
  steps: number,
  seed: number
): Promise<{ success: boolean; imageUrl?: string; seed: number; model?: string; cost?: number; error?: string }> {

  // Try preferred model first, then fallbacks
  const modelOrder: Array<"flux-dev" | "sdxl" | "flux-schnell"> =
    preferredModel === "sdxl"
      ? ["sdxl", "flux-dev", "flux-schnell"]
      : preferredModel === "flux-schnell"
        ? ["flux-schnell", "flux-dev", "sdxl"]
        : ["flux-dev", "sdxl", "flux-schnell"];

  for (const modelId of modelOrder) {
    let result: { imageUrl: string | null; error?: string };

    switch (modelId) {
      case "flux-dev":
        result = await runFluxDev(prompt, seed, steps);
        break;
      case "sdxl":
        result = await runSDXL(prompt, negative, seed, guidance, steps);
        break;
      case "flux-schnell":
        result = await runFluxSchnell(prompt, seed);
        break;
    }

    if (result.imageUrl) {
      const cost = MODEL_COSTS[modelId] || 0.01;
      return { success: true, imageUrl: result.imageUrl, seed, model: modelId, cost };
    }

    console.log(`[Generate] ⚠️ ${modelId} failed, trying next model...`);

    // Small delay before trying next model
    await new Promise(r => setTimeout(r, 1000));
  }

  return { success: false, seed, error: "All models failed" };
}

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

    // 🏗️ Build Ultimate Prompt
    const { prompt: finalPrompt, negativePrompt, model, guidance, steps } = buildUltimatePrompt(
      prompt.trim(),
      categoryId,
      subcategoryId,
      styleId
    );

    // 🎨 Generate Sprite (with timeout)
    let result: { success: boolean; imageUrl?: string; seed: number; model?: string; cost?: number; error?: string };

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Generation timed out after 2 minutes")), API_TIMEOUT);
      });

      result = await Promise.race([
        withRetry(async () => {
          return await generateSprite(finalPrompt, negativePrompt, model, guidance, steps, usedSeed);
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

    if (!result.success || !result.imageUrl) {
      // Refund credits if generation failed
      console.log("[API] ⚠️ Generation returned no image, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      return NextResponse.json(
        { error: result.error || "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    // 📤 Upload to Storage
    console.log("[API] 📤 Uploading to storage...");
    const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${result.seed}`;
    const uploadResult = await uploadImageToStorage(result.imageUrl, user.id, fileName);
    const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : result.imageUrl;

    // 💾 Save to Database (including Replicate cost)
    await saveGeneration({
      userId: user.id,
      prompt: prompt.trim(),
      fullPrompt: finalPrompt,
      categoryId,
      subcategoryId,
      styleId,
      imageUrl: finalUrl,
      seed: result.seed,
      replicateCost: result.cost,
    });

    // 📊 Final Stats
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const styleConfig = STYLES_2D_FULL[styleId];

    console.log("\n" + "═".repeat(70));
    console.log("🎉 GENERATION COMPLETE!");
    console.log("═".repeat(70));
    console.log("⏱️  Duration:", duration + "s");
    console.log("🎨 Style:", styleConfig.name);
    console.log("🤖 Model:", result.model);
    console.log("💰 Cost: $" + (result.cost || 0).toFixed(4));
    console.log("🌱 Seed:", result.seed);
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
      seed: result.seed,
      modelUsed: result.model,
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

  return NextResponse.json({
    version: "3.0.0",
    name: "Ultimate 2D Sprite Generator",
    styles,
    categories,
    defaultStyle: "PIXEL_ART_16",
    outputFormat: "png",
    resolution: "1024x1024",
    creditsPerGeneration: 1,
    features: [
      "Hand-crafted prompts for every category",
      "Style-optimized model selection",
      "Smart fallback system",
      "Category-aware negative prompts",
      "Subcategory-specific object anchors",
    ],
  });
}
