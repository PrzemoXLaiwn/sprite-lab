import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, saveGeneration } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { budgetPlan, requestIp, startOperation, type OpHandle } from "@/lib/billing/operations";
import { persistImage } from "@/lib/storage";
import { upscaleImage } from "@/lib/runware";
import { safeFetchImage, safeFetchErrorResponse } from "@/lib/safe-fetch";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import { upscaleSchema } from "@/lib/validations";
import { uploadGenerationBufferToR2 } from "@/lib/r2";
import sharp from "sharp";
import { upscaleCredits } from "@/config/tool-prices";

// Runware upscale is capped at 90s (RUNWARE_UPSCALE_TIMEOUT_MS) so the
// refund path always has time to run.
export const maxDuration = 150;

const MAX_INPUT_IMAGE_MB = 5;
/** Longest side allowed for pixel-perfect output. */
const MAX_PIXEL_OUTPUT = 4096;

/** Credits by effective output scale (4x costs the runware-4x price). */
const creditsForScale = upscaleCredits;

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
  // Paid operation (AI upscale only); null once the result is stored
  let pendingOp: OpHandle | null = null;
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

    const { blocked: rateLimitBlocked } = await rateLimitUserGeneration(user.id);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Parse + validate request
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = validateBody(upscaleSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { imageUrl, scale, modelType, originalGeneration } = parsed.data;

    // Image validation (SSRF-safe, size capped while streaming)
    let sourceBuffer: Buffer;
    try {
      const { buffer } = await safeFetchImage(imageUrl, { maxBytes: MAX_INPUT_IMAGE_MB * 1024 * 1024 });
      sourceBuffer = buffer;
      console.log(`[Upscale] Image size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`);
    } catch (fetchError) {
      console.warn("[Upscale] Input image rejected:", fetchError instanceof Error ? fetchError.message : fetchError);
      const { error, status } = safeFetchErrorResponse(fetchError, MAX_INPUT_IMAGE_MB);
      return NextResponse.json(
        { error, imageTooLarge: status === 413 || undefined },
        { status }
      );
    }

    // ── Pixel-perfect: integer nearest-neighbour scaling. Free, any plan.
    // AI upscalers smear pixel art; duplicating pixels is the correct way to
    // enlarge it and costs us nothing.
    if (modelType === "pixel") {
      const meta = await sharp(sourceBuffer).metadata();
      const w = meta.width ?? 0;
      const h = meta.height ?? 0;
      if (!w || !h || w * scale > MAX_PIXEL_OUTPUT || h * scale > MAX_PIXEL_OUTPUT) {
        return NextResponse.json(
          { error: `Result would exceed ${MAX_PIXEL_OUTPUT}px. Try a smaller scale.` },
          { status: 400 }
        );
      }
      const png = await sharp(sourceBuffer)
        .resize(w * scale, h * scale, { kernel: "nearest" })
        .png({ compressionLevel: 9 })
        .toBuffer();
      const upload = await uploadGenerationBufferToR2(png, user.id);
      if (!upload.success || !upload.url) {
        return NextResponse.json({ error: "Couldn't save the upscaled sprite. Please try again." }, { status: 500 });
      }
      const saved = await saveGeneration({
        userId: user.id,
        prompt: `[Upscaled ${scale}x] ${originalGeneration?.prompt || "Image"}`,
        fullPrompt: `Pixel-perfect ${scale}x (nearest neighbour)`,
        categoryId: originalGeneration?.categoryId || "TOOLS",
        subcategoryId: originalGeneration?.subcategoryId || "UPSCALED",
        styleId: originalGeneration?.styleId || "PIXEL_ART_16",
        imageUrl: upload.url,
        seed: originalGeneration?.seed ?? undefined,
      });
      return NextResponse.json({
        success: true,
        imageUrl: upload.url,
        scale,
        modelInfo: { name: "Pixel-perfect", creditsUsed: 0, duration: `${((Date.now() - startTime) / 1000).toFixed(1)}s` },
        savedToGallery: saved.success,
      });
    }

    // ── AI upscale (Runware): paid plans only, 2× or 4×
    const { plan, role } = await getUserCredits(user.id);
    const hasPremiumAccess = ALLOWED_PLANS.includes(plan) || role === "OWNER" || role === "ADMIN";
    if (!hasPremiumAccess) {
      return NextResponse.json(
        { error: "AI upscaling is available on Pro, Studio and Lifetime plans. Pixel-perfect upscaling is free for everyone." },
        { status: 403 }
      );
    }
    if (scale === 3) {
      return NextResponse.json({ error: "AI upscaling supports 2× or 4×." }, { status: 400 });
    }

    // Get model config
    const modelConfig = UPSCALE_MODELS[modelType] || UPSCALE_MODELS[DEFAULT_UPSCALE_MODEL];

    if (scale > modelConfig.maxScale) {
      return NextResponse.json(
        { error: `${modelConfig.name} supports max ${modelConfig.maxScale}x upscaling.` },
        { status: 400 }
      );
    }

    // Price from the EFFECTIVE scale, not the model label — otherwise
    // modelType "runware" (1 credit) with scale 4 bypasses the 4x price.
    creditCost = Math.max(modelConfig.credits, creditsForScale(scale));

    // Charge + guards in one operation; every failure below refunds it once
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, totalSpent: true, stripeCustomerId: true } });
    const started = await startOperation({
      userId: user.id, feature: "upscale", credits: creditCost, plan: budgetPlan(account), ip: requestIp(request),
      input: { imageUrl, scale },
    });
    if (!started.ok) {
      const body = started.status === 402
        ? { ...started.body, error: `Not enough credits. ${scale}× AI upscaling costs ${creditCost} credit${creditCost > 1 ? "s" : ""}.` }
        : started.body;
      return NextResponse.json(body, { status: started.status });
    }
    const op = started.op;
    pendingOp = op;

    console.log("[Upscale] Runware upscaling", {
      user: user.id,
      model: modelConfig.name,
      scale: `${scale}x`,
      credits: creditCost,
    });

    // Run upscaling with Runware
    const result = await op.run(() => upscaleImage(imageUrl, scale));

    if (!result.success || !result.imageUrl) {
      console.error("[Upscale] Failed:", result.error);
      pendingOp = null;
      await op.fail("PROVIDER_ERROR");
      return NextResponse.json(
        { error: "Upscaling failed. Credit refunded." },
        { status: 500 }
      );
    }

    // Runware output URLs are temporary: delivered only once stored on our side
    const fileName = `upscaled-${scale}x-${Date.now()}`;
    const finalUrl = await persistImage(result.imageUrl, user.id, fileName);
    if (!finalUrl) {
      console.error("[Upscale] Re-host failed — refunding");
      pendingOp = null;
      await op.fail("STORE_FAILED");
      return NextResponse.json(
        { error: "Couldn't save the upscaled image. Credits refunded — please try again." },
        { status: 500 }
      );
    }
    pendingOp = null; // delivered (stored) — no refund from here on

    // Save to database
    const saveResult = await saveGeneration({
      userId: user.id,
      prompt: `[Upscaled ${scale}x] ${originalGeneration?.prompt || "Image"}`,
      fullPrompt: `Upscaled ${scale}x using ${modelConfig.name}`,
      categoryId: originalGeneration?.categoryId || "TOOLS",
      subcategoryId: originalGeneration?.subcategoryId || "UPSCALED",
      styleId: originalGeneration?.styleId || "UPSCALED",
      imageUrl: finalUrl,
      seed: originalGeneration?.seed ?? undefined,
    });

    if (!saveResult.success) {
      console.error("Failed to save upscaled image:", saveResult.error);
    }
    await op.succeed(saveResult.generation?.id ?? null);

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
    // Refund on an unexpected error (only before the result was stored)
    if (pendingOp) {
      const op = pendingOp;
      pendingOp = null;
      await op.fail("UNEXPECTED");
    }
    return NextResponse.json(
      { error: "Upscaling failed. Please try again." },
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
