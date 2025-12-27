import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";
import { upscaleImage } from "@/lib/runware";

// Plans that have access to Upscale (Free and Starter are excluded)
// PRO = Pro plan, UNLIMITED = Studio plan, LIFETIME = any lifetime deal
const ALLOWED_PLANS = ["PRO", "UNLIMITED", "LIFETIME"];

// ===========================================
// UPSCALING CONFIGURATION
// ===========================================

interface UpscaleConfig {
  id: string;
  name: string;
  description: string;
  maxScale: number;
  credits: number;
  preservesPixelArt: boolean;
}

const UPSCALE_MODELS: Record<string, UpscaleConfig> = {
  // Runware AI Upscaler - Default
  "runware": {
    id: "runware",
    name: "Runware AI Upscaler",
    description: "Fast AI-powered upscaling with excellent quality. Recommended for most images.",
    maxScale: 4,
    credits: 1,
    preservesPixelArt: false,
  },

  // 2x - Quick upscale
  "runware-2x": {
    id: "runware-2x",
    name: "Quick 2x Upscale",
    description: "Fast 2x upscaling. Best for quick previews and smaller enlargements.",
    maxScale: 2,
    credits: 1,
    preservesPixelArt: true,
  },

  // 4x - High quality
  "runware-4x": {
    id: "runware-4x",
    name: "High Quality 4x",
    description: "Maximum 4x upscaling with AI enhancement. Best for final exports.",
    maxScale: 4,
    credits: 2,
    preservesPixelArt: false,
  },
};

const DEFAULT_UPSCALE_MODEL = "runware";

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

    // Check user plan - only Pro, Studio, and Lifetime can use Upscale
    const { credits, plan, role } = await getUserCredits(user.id);
    const hasPremiumAccess = ALLOWED_PLANS.includes(plan) || role === "OWNER" || role === "ADMIN";

    if (!hasPremiumAccess) {
      return NextResponse.json(
        { error: "Image upscaling is available for Pro, Studio, and Lifetime plans. Upgrade to unlock this feature!" },
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

    // Image size validation
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageSizeMB = imageBuffer.byteLength / (1024 * 1024);

      console.log(`[Upscale] Image size: ${imageSizeMB.toFixed(2)}MB`);

      if (imageSizeMB > 5) {
        return NextResponse.json(
          {
            error: "Image too large for upscaling (max 5MB). Please use a smaller image.",
            imageTooLarge: true
          },
          { status: 400 }
        );
      }
    } catch (sizeError) {
      console.warn("[Upscale] Could not validate image size:", sizeError);
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
    console.log("IMAGE UPSCALING (Runware)");
    console.log("===========================================");
    console.log("User:", user.id);
    console.log("Model:", modelConfig.name);
    console.log("Scale:", `${scale}x`);
    console.log("Input URL:", imageUrl);

    // Run upscaling with Runware
    const result = await upscaleImage(imageUrl, scale as 2 | 4);

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

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("UPSCALING COMPLETE! (Runware)");
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
    provider: "Runware",
    models,
    defaultModel: DEFAULT_UPSCALE_MODEL,
    scales: [2, 4],
    tips: [
      "🚀 Runware AI provides fast, high-quality upscaling",
      "⚡ 2x upscaling is fastest and uses fewer credits",
      "💎 4x upscaling provides maximum resolution",
      "🎮 Works great with pixel art and game assets",
    ],
  });
}
