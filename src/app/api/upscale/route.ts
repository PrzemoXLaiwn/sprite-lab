import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getUserCredits, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

// Plans that have access to Upscale (SPARK is excluded!)
const ALLOWED_PLANS = ["FORGE", "INFINITE", "LIFETIME"];

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ===========================================
// UPSCALING MODELS - Updated for better quality
// ===========================================

interface UpscaleConfig {
  id: string;
  model: string;
  name: string;
  description: string;
  maxScale: number;
  credits: number;
  preservesPixelArt: boolean;
  getInput: (imageUrl: string, scale: number) => Record<string, unknown>;
}

const UPSCALE_MODELS: Record<string, UpscaleConfig> = {
  // Real-ESRGAN x4 Plus - Best quality general upscaler
  "real-esrgan": {
    id: "real-esrgan",
    model: "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
    name: "Real-ESRGAN x4+",
    description: "Best quality upscaling for realistic images. Sharpens details significantly.",
    maxScale: 4,
    credits: 2,
    preservesPixelArt: false,
    getInput: (imageUrl: string, scale: number) => ({
      image: imageUrl,
      scale: scale,
      face_enhance: false,
    }),
  },

  // Real-ESRGAN Anime - Optimized for anime/cartoon
  "real-esrgan-anime": {
    id: "real-esrgan-anime",
    model: "nightmareai/real-esrgan:f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa",
    name: "Real-ESRGAN Anime",
    description: "Optimized for anime, cartoons, and illustrated content.",
    maxScale: 4,
    credits: 2,
    preservesPixelArt: false,
    getInput: (imageUrl: string, scale: number) => ({
      image: imageUrl,
      scale: scale,
      face_enhance: false,
    }),
  },

  // Pixel Art Upscaler - Uses nearest neighbor interpolation to preserve sharp edges
  // We use a custom approach: upscale without smoothing
  "pixel-art": {
    id: "pixel-art",
    model: "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600571a0a236a5e89e8e334ed4da14c5ccfbf87",
    name: "Pixel Art Upscaler",
    description: "Preserves pixel-perfect sharp edges. Best for retro sprites and pixel art.",
    maxScale: 4,
    credits: 2,
    preservesPixelArt: true,
    getInput: (imageUrl: string, scale: number) => ({
      image: imageUrl,
      scale_factor: scale,
      resemblance: 1.0, // Maximum resemblance to original
      creativity: 0.0, // No creative changes
      prompt: "pixel art, sharp pixels, no smoothing, crisp edges",
      negative_prompt: "blurry, smooth, antialiased, soft edges",
      num_inference_steps: 10,
      guidance_scale: 3,
    }),
  },

  // Clarity Upscaler - AI-powered detail enhancement
  "clarity": {
    id: "clarity",
    model: "philz1337x/clarity-upscaler:dfad41707589d68ecdccd1dfa600571a0a236a5e89e8e334ed4da14c5ccfbf87",
    name: "Clarity Upscaler",
    description: "AI-powered upscaling that adds realistic details and sharpness.",
    maxScale: 4,
    credits: 3,
    preservesPixelArt: false,
    getInput: (imageUrl: string, scale: number) => ({
      image: imageUrl,
      scale_factor: scale,
      resemblance: 0.8,
      creativity: 0.35,
      prompt: "high quality, detailed, sharp, professional",
      negative_prompt: "blurry, low quality, artifacts, noise",
      num_inference_steps: 18,
      guidance_scale: 4,
    }),
  },

  // GFPGAN - Face enhancement
  "gfpgan": {
    id: "gfpgan",
    model: "tencentarc/gfpgan:0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
    name: "GFPGAN Face Enhancer",
    description: "Enhances and restores faces. Best for character portraits.",
    maxScale: 2,
    credits: 2,
    preservesPixelArt: false,
    getInput: (imageUrl: string, scale: number) => ({
      img: imageUrl,
      version: "v1.4",
      scale: scale,
    }),
  },

  // Ultimate SD Upscale - Most detailed but slowest
  "ultimate": {
    id: "ultimate",
    model: "fewjative/ultimate-sd-upscale:5c0ad6fafa1e0425d84ded702410a16d8dc1cc89b13d2e1e5ed571298b1093c7",
    name: "Ultimate SD Upscaler",
    description: "Maximum detail enhancement using Stable Diffusion. Slowest but highest quality.",
    maxScale: 4,
    credits: 4,
    preservesPixelArt: false,
    getInput: (imageUrl: string, scale: number) => ({
      image: imageUrl,
      upscale: scale,
      prompt: "masterpiece, best quality, highly detailed, sharp focus",
      negative_prompt: "blurry, low quality, artifacts, jpeg compression",
      denoise: 0.3,
      steps: 20,
    }),
  },
};

const DEFAULT_UPSCALE_MODEL = "real-esrgan";

// ===========================================
// UPSCALE FUNCTION
// ===========================================

async function runUpscale(
  modelId: string,
  imageUrl: string,
  scale: number
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const config = UPSCALE_MODELS[modelId] || UPSCALE_MODELS[DEFAULT_UPSCALE_MODEL];

  try {
    console.log(`[Upscale] Starting ${config.name}...`);
    console.log(`[Upscale] Model: ${config.model}`);
    console.log(`[Upscale] Scale: ${scale}x`);
    console.log(`[Upscale] Input URL: ${imageUrl}`);

    const input = config.getInput(imageUrl, scale);
    console.log(`[Upscale] Input params:`, JSON.stringify(input, null, 2));

    // Run the model
    const output = await replicate.run(config.model as `${string}/${string}:${string}`, {
      input,
    });

    console.log(`[Upscale] Raw output type:`, typeof output);

    let upscaledUrl: string | null = null;

    if (typeof output === "string") {
      upscaledUrl = output;
    } else if (Array.isArray(output) && output.length > 0) {
      upscaledUrl = String(output[0]);
    } else if (output && typeof output === "object") {
      // Handle ReadableStream
      if (output instanceof ReadableStream) {
        const reader = output.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const base64 = Buffer.from(combined).toString("base64");
        upscaledUrl = `data:image/png;base64,${base64}`;
      } else if ("url" in output) {
        upscaledUrl = String((output as { url: string }).url);
      }
    }

    if (upscaledUrl) {
      console.log(`[Upscale] Success! Output URL (first 100 chars): ${upscaledUrl.substring(0, 100)}`);
      return { success: true, imageUrl: upscaledUrl };
    }

    console.error(`[Upscale] No valid URL in output:`, output);
    return { success: false, error: "No output received from upscaler" };
  } catch (error) {
    console.error(`[Upscale] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during upscaling",
    };
  }
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function POST(request: Request) {
  const startTime = Date.now();
  let creditsDeducted = false;
  let userId: string | null = null;
  let creditCost = 0;

  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    userId = user.id;

    // Check user plan - only FORGE, INFINITE, LIFETIME can use Upscale
    const { credits, plan, role } = await getUserCredits(user.id);
    const hasPremiumAccess = ALLOWED_PLANS.includes(plan) || role === "OWNER" || role === "ADMIN";

    if (!hasPremiumAccess) {
      return NextResponse.json(
        { error: "Image upscaling is available for Forge, Infinite, and Lifetime plans. Upgrade to unlock this feature!" },
        { status: 403 }
      );
    }

    // Parse request
    const body = await request.json();
    const {
      imageUrl,
      scale = 2,
      modelType = DEFAULT_UPSCALE_MODEL,
      originalGeneration,
    } = body;

    // Validation
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 }
      );
    }

    if (scale < 2 || scale > 4) {
      return NextResponse.json(
        { error: "Scale must be between 2 and 4." },
        { status: 400 }
      );
    }

    // Get model config
    const modelConfig = UPSCALE_MODELS[modelType] || UPSCALE_MODELS[DEFAULT_UPSCALE_MODEL];
    creditCost = modelConfig.credits;

    if (scale > modelConfig.maxScale) {
      return NextResponse.json(
        { error: `${modelConfig.name} supports max ${modelConfig.maxScale}x upscaling.` },
        { status: 400 }
      );
    }

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, creditCost);
    if (!creditResult.success) {
      const errorMsg = creditResult.error === "INSUFFICIENT_CREDITS"
        ? `Not enough credits. Need ${creditCost}, you have ${credits}.`
        : "Failed to process credits. Please try again.";
      return NextResponse.json(
        { error: errorMsg, noCredits: creditResult.error === "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }
    creditsDeducted = true;

    console.log("===========================================");
    console.log("IMAGE UPSCALING");
    console.log("===========================================");
    console.log("User:", user.id);
    console.log("Model:", modelConfig.name);
    console.log("Scale:", `${scale}x`);
    console.log("Input URL:", imageUrl);

    // Run upscaling
    const result = await runUpscale(modelType, imageUrl, scale);

    if (!result.success || !result.imageUrl) {
      console.error("[Upscale] Failed:", result.error);
      // Refund credits on failure
      if (creditsDeducted && userId) {
        await refundCredits(userId, creditCost);
        creditsDeducted = false;
      }
      return NextResponse.json(
        { error: result.error || "Upscaling failed. Credit refunded." },
        { status: 500 }
      );
    }

    console.log("[Upscale] Uploading to storage...");

    // Upload to permanent storage
    const fileName = `upscaled-${scale}x-${Date.now()}`;
    const uploadResult = await uploadImageToStorage(result.imageUrl, user.id, fileName);

    const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : result.imageUrl;

    // Save to database
    const saveResult = await saveGeneration({
      userId: user.id,
      prompt: `[Upscaled ${scale}x] ${originalGeneration?.prompt || "Image"}`,
      fullPrompt: `Upscaled ${scale}x using ${modelConfig.name}`,
      categoryId: originalGeneration?.categoryId || "TOOLS",
      subcategoryId: originalGeneration?.subcategoryId || "UPSCALED",
      styleId: originalGeneration?.styleId || "UPSCALED",
      imageUrl: finalUrl,
      seed: originalGeneration?.seed,
    });

    if (!saveResult.success) {
      console.error("Failed to save upscaled image:", saveResult.error);
    }

    // Credits already deducted at the beginning

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("UPSCALING COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Scale: ${scale}x`);
    console.log("Output URL:", finalUrl.substring(0, 100));
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      scale: scale,
      modelInfo: {
        name: modelConfig.name,
        creditsUsed: creditCost,
        duration: `${duration}s`,
      },
      savedToGallery: saveResult.success,
      message: `Image upscaled ${scale}x and saved to gallery!`,
    });
  } catch (error) {
    console.error("[Upscale] Unexpected error:", error);
    // Refund credits on unexpected error
    if (creditsDeducted && userId) {
      await refundCredits(userId, creditCost);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Upscaling failed. Credit refunded." },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - Available upscaling models
// ===========================================

export async function GET() {
  const models = Object.entries(UPSCALE_MODELS).map(([id, config]) => ({
    id,
    name: config.name,
    description: config.description,
    maxScale: config.maxScale,
    credits: config.credits,
    preservesPixelArt: config.preservesPixelArt,
  }));

  return NextResponse.json({
    models,
    defaultModel: DEFAULT_UPSCALE_MODEL,
    scales: [2, 3, 4],
    tips: [
      "🎮 Use Pixel Art Upscaler for retro game sprites - preserves sharp edges",
      "🎨 Use Real-ESRGAN Anime for cartoon/anime art styles",
      "👤 Use GFPGAN for character portraits and faces",
      "✨ Use Clarity for AI-enhanced details and sharpness",
      "💎 Use Ultimate SD for maximum quality (slowest)",
      "⚡ 2x upscaling is fastest and uses fewer credits",
    ],
  });
}
