// =============================================================================
// SPRITELAB — CANONICAL GENERATION SERVICE
// =============================================================================
// This is the future orchestration layer for all 2D generation flows.
//
// CURRENT STATUS: Phase 3A — service created, not yet wired to any route.
//   Existing routes continue to use their own logic until Phase 3B migration.
//
// ARCHITECTURE:
//   Public API:    generateAssets()  generateGuestAsset()  getModelForUser()
//   Core pipeline: generateSingle2D() (shared by all 2D flows)
//   Helpers:       uploadGeneratedAsset()  saveGeneratedAssets()  refundCreditsSafely()
//
// 3D NOTE:
//   3D generation uses Replicate (not Runware) and produces a different output
//   format (GLB/mesh). It is not modelled here — the existing generate-3d
//   route handles it. A typed stub is included so callers can dispatch cleanly.
//
// CREDIT SAFETY CONTRACT:
//   A. Failure BEFORE deduction     → no action needed
//   B. Failure AFTER deduction,     → refund via refundCreditsSafely()
//      BEFORE provider success
//   C. Failure AFTER provider       → image exists; attempt DB save anyway.
//      success, BEFORE DB save        If save fails, log for manual recovery.
//                                     Do NOT refund — asset was generated and
//                                     consumed real provider cost.
//   D. Failure AFTER DB save,       → safe to return an error. The record
//      BEFORE response                exists; the user will see it in gallery.
//                                     Do NOT refund.
//
// This means: refund only on case B. All other failures are logged but credits
// are not returned, preventing double-spend on provider costs.
// =============================================================================

import {
  generateImage,
  removeBackground,
  DEFAULT_MODEL,
  TIER_MODELS,
  type GenerateImageOptions,
  type GeneratedImage,
  type RunwareModelId,
  type UserTier,
} from "@/lib/runware";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { uploadImageToStorage } from "@/lib/storage";
import { checkAndDeductCredits, refundCredits } from "@/lib/db/credits";
import { saveGeneration, type SaveGenerationParams } from "@/lib/db/generations";
import { getUserTier } from "@/lib/db/users";
import {
  buildUltimatePrompt,
  buildEnhancedPrompt,
} from "@/config";
import { enhancePromptWithLearnedFixes } from "@/lib/analytics/prompt-enhancer";

// =============================================================================
// SECTION 1 — TYPES
// =============================================================================

// ---------------------------------------------------------------------------
// Generation mode
// ---------------------------------------------------------------------------

export type GenerationMode =
  | "single"
  | "pack"
  | "batch"
  | "spritesheet"
  | "tile"
  | "3d"; // Dispatches to existing generate-3d route — not handled here

// ---------------------------------------------------------------------------
// Style mix options (optional, pro feature)
// ---------------------------------------------------------------------------

export interface StyleMixOptions {
  style2Id: string;
  style1Weight: number; // 0–100
}

// ---------------------------------------------------------------------------
// Quality preset
// ---------------------------------------------------------------------------

export type QualityPreset = "draft" | "normal" | "hd";

const QUALITY_SETTINGS: Record<QualityPreset, { steps: number; guidance: number }> = {
  draft:  { steps: 15, guidance: 2.5 },
  normal: { steps: 25, guidance: 3.0 },
  hd:     { steps: 35, guidance: 3.5 },
};

// ---------------------------------------------------------------------------
// Authenticated generation request
// ---------------------------------------------------------------------------

export interface GenerationRequest {
  /** Authenticated user ID from Supabase session */
  userId: string;
  mode: GenerationMode;
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;

  // Optional overrides
  seed?: number;
  qualityPreset?: QualityPreset;
  modelId?: RunwareModelId;

  // Style mixing (pro feature)
  enableStyleMix?: boolean;
  styleMix?: StyleMixOptions;
  colorPaletteId?: string;

  // Pack / batch specifics
  /** For pack/batch: list of prompts. If absent, uses prompt for all items. */
  prompts?: string[];
  /** For pack: number of assets. Defaults to 6. */
  packSize?: number;

  // Spritesheet specifics
  /** Number of frames in a spritesheet row (e.g. 4 = 4-frame walk cycle) */
  sheetColumns?: number;
  sheetRows?: number;

  // Tile specifics
  /** Whether the tile should seamlessly tile */
  seamless?: boolean;
}

// ---------------------------------------------------------------------------
// Guest generation request — separate type, no userId
// ---------------------------------------------------------------------------

export interface GuestGenerationRequest {
  /** IP address used as identifier for rate limiting. Required for guests. */
  ipAddress: string;
  prompt: string;
  style: "pixel" | "cartoon";
}

// ---------------------------------------------------------------------------
// Individual generated asset
// ---------------------------------------------------------------------------

export interface GeneratedAsset {
  /** Final persisted URL (R2, Supabase, or temporary Runware URL as last resort) */
  imageUrl: string;
  /** Random seed used — expose so user can reproduce */
  seed: number;
  /** Runware model ID that generated this image */
  model: string;
  /** Approximate provider cost in USD */
  providerCost: number;
  /** Prompt that was actually sent to the provider */
  finalPrompt: string;
  /** Prompt enhancements applied (for debugging / UI display) */
  appliedOptimizations: string[];
  /** Non-blocking warnings from prompt enhancer */
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Generation result
// ---------------------------------------------------------------------------

export interface GenerationResult {
  success: true;
  assets: GeneratedAsset[];
  creditsUsed: number;
  /** Milliseconds from call start to return */
  durationMs: number;
}

// ---------------------------------------------------------------------------
// Typed generation error
// ---------------------------------------------------------------------------

/**
 * Internal error codes.
 * "expected" codes map to user-friendly messages.
 * "unexpected" / "provider_error" trigger generic messages in the route.
 */
export type GenerationErrorCode =
  | "UNAUTHENTICATED"
  | "INSUFFICIENT_CREDITS"
  | "INVALID_CATEGORY"
  | "INVALID_SUBCATEGORY"
  | "INVALID_STYLE"
  | "PROVIDER_ERROR"
  | "PROVIDER_TIMEOUT"
  | "UPLOAD_ERROR"
  | "SAVE_ERROR"
  | "UNEXPECTED_ERROR";

export class GenerationError extends Error {
  /** Internal machine-readable code */
  readonly code: GenerationErrorCode;
  /** Message safe to surface to the end user */
  readonly userMessage: string;
  /** Whether the error is an expected product-level failure (vs a bug) */
  readonly isExpected: boolean;
  /** Original cause for server-side logging */
  readonly cause?: unknown;

  constructor(opts: {
    code: GenerationErrorCode;
    userMessage: string;
    isExpected?: boolean;
    cause?: unknown;
    message?: string;
  }) {
    super(opts.message ?? opts.userMessage);
    this.name = "GenerationError";
    this.code = opts.code;
    this.userMessage = opts.userMessage;
    this.isExpected = opts.isExpected ?? false;
    this.cause = opts.cause;
  }
}

// =============================================================================
// SECTION 2 — PUBLIC API
// =============================================================================

// ---------------------------------------------------------------------------
// getModelForUser
// ---------------------------------------------------------------------------

/**
 * Returns the Runware model ID that should be used for a given user.
 * Respects the tier hierarchy: free → schnell, starter → dev, pro/lifetime → pro.
 * Pass an optional override to use a specific model (validated against allowed tier).
 */
export async function getModelForUser(
  userId: string,
  requestedModelId?: RunwareModelId
): Promise<RunwareModelId> {
  const tier = await getUserTier(userId);
  return resolveModel(tier, requestedModelId);
}

// ---------------------------------------------------------------------------
// buildEnhancedPromptForGeneration (public helper, thin wrapper)
// ---------------------------------------------------------------------------

/**
 * Builds the final prompt for a 2D generation, applying style config +
 * learned optimizations. Returns all values needed by the provider.
 */
export async function buildPromptForGeneration(
  prompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  options?: {
    enableStyleMix?: boolean;
    styleMix?: StyleMixOptions;
    colorPaletteId?: string;
  }
): Promise<{
  finalPrompt: string;
  negativePrompt: string;
  guidance: number;
  steps: number;
  appliedOptimizations: string[];
  warnings: string[];
}> {
  const hasPremiumFeatures =
    options?.enableStyleMix || options?.colorPaletteId;

  // Build base prompt via config
  const {
    prompt: builtPrompt,
    negativePrompt: builtNegative,
    guidance: styleGuidance,
    steps: styleSteps,
  } = hasPremiumFeatures
    ? buildEnhancedPrompt(prompt, categoryId, subcategoryId, styleId, {
        enableStyleMix: options?.enableStyleMix,
        style2Id: options?.styleMix?.style2Id,
        style1Weight: options?.styleMix?.style1Weight ?? 70,
        colorPaletteId: options?.colorPaletteId,
      })
    : buildUltimatePrompt(prompt, categoryId, subcategoryId, styleId);

  // Apply learned optimizations from analytics layer
  const { enhancedPrompt, enhancedNegative, appliedFixes, warnings } =
    await enhancePromptWithLearnedFixes(
      builtPrompt,
      builtNegative,
      categoryId,
      subcategoryId,
      styleId
    );

  return {
    finalPrompt: enhancedPrompt,
    negativePrompt: enhancedNegative,
    guidance: styleGuidance,
    steps: styleSteps,
    appliedOptimizations: appliedFixes,
    warnings,
  };
}

// ---------------------------------------------------------------------------
// generateAssets — authenticated
// ---------------------------------------------------------------------------

/**
 * Main entry point for all authenticated generation flows.
 * Dispatches to the correct internal pipeline based on `request.mode`.
 *
 * Throws GenerationError for expected failures (credits, invalid input).
 * Throws GenerationError with code UNEXPECTED_ERROR for bugs — route should
 * catch and return 500.
 */
export async function generateAssets(
  request: GenerationRequest
): Promise<GenerationResult> {
  const startMs = Date.now();

  log("generation:start", {
    userId: request.userId,
    mode: request.mode,
    categoryId: request.categoryId,
    subcategoryId: request.subcategoryId,
    styleId: request.styleId,
  });

  // 3D is not handled by this service
  if (request.mode === "3d") {
    throw new GenerationError({
      code: "UNEXPECTED_ERROR",
      userMessage: "3D generation must use the dedicated 3D endpoint.",
      isExpected: true,
    });
  }

  switch (request.mode) {
    case "single":
      return generateSinglePipeline(request, startMs);

    case "pack":
    case "batch":
      return generateMultiPipeline(request, startMs);

    case "spritesheet":
      return generateSpritesheetPipeline(request, startMs);

    case "tile":
      return generateTilePipeline(request, startMs);

    default: {
      // TypeScript exhaustiveness guard
      const exhaustive: never = request.mode;
      throw new GenerationError({
        code: "UNEXPECTED_ERROR",
        userMessage: "Unknown generation mode.",
        isExpected: false,
        message: `Unhandled mode: ${exhaustive}`,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// generateGuestAsset
// ---------------------------------------------------------------------------

/**
 * Guest generation (no auth, no credits, no DB save).
 * Returns a single asset with a temporary URL — no persistence.
 *
 * Throws GenerationError on provider failure.
 */
export async function generateGuestAsset(
  request: GuestGenerationRequest
): Promise<Omit<GenerationResult, "creditsUsed"> & { creditsUsed: 0 }> {
  const startMs = Date.now();

  log("generation:start", {
    mode: "guest",
    ipAddress: request.ipAddress, // IP is not a secret — safe to log
    style: request.style,
  });

  const GUEST_STYLE_PROMPTS: Record<GuestGenerationRequest["style"], {
    prompt: string;
    negative: string;
  }> = {
    pixel: {
      prompt: "pixel art style, 16-bit, retro game sprite, clean edges, limited color palette",
      negative: "blurry, realistic, 3D render, photograph, noisy, gradient, anti-aliased",
    },
    cartoon: {
      prompt: "cartoon style, bold outlines, vibrant colors, game asset, clean design",
      negative: "realistic, photograph, blurry, noisy, complex background",
    },
  };

  const styleConfig = GUEST_STYLE_PROMPTS[request.style];
  const finalPrompt = `${styleConfig.prompt}, ${request.prompt.trim()}, game sprite, single object, centered, transparent background, high quality`;

  log("generation:prompt", {
    mode: "guest",
    finalPromptPreview: finalPrompt.substring(0, 100),
  });

  // Guest always uses free tier model
  const modelId = DEFAULT_MODEL["free"];

  log("generation:model", { mode: "guest", modelId });

  const result = await generateImage(
    {
      prompt: finalPrompt,
      negativePrompt: styleConfig.negative,
      model: modelId,
      seed: Math.floor(Math.random() * 2147483647),
      steps: 25,
      guidance: 3.0,
      width: 1024,
      height: 1024,
    },
    "free"
  );

  if (!result.success || !result.images?.length) {
    log("generation:error", { mode: "guest", error: result.error });
    throw new GenerationError({
      code: "PROVIDER_ERROR",
      userMessage: "Generation failed. Please try again.",
      isExpected: false,
      cause: result.error,
    });
  }

  const img = result.images[0];

  log("generation:result", {
    mode: "guest",
    seed: img.seed,
    model: img.model,
    durationMs: Date.now() - startMs,
  });

  return {
    success: true,
    assets: [
      {
        imageUrl: img.imageURL,
        seed: img.seed,
        model: img.model,
        providerCost: img.cost,
        finalPrompt,
        appliedOptimizations: [],
        warnings: [],
      },
    ],
    creditsUsed: 0,
    durationMs: Date.now() - startMs,
  };
}

// =============================================================================
// SECTION 3 — INTERNAL PIPELINES
// =============================================================================

// ---------------------------------------------------------------------------
// Single asset pipeline
// ---------------------------------------------------------------------------

async function generateSinglePipeline(
  request: GenerationRequest,
  startMs: number
): Promise<GenerationResult> {
  const creditsRequired = 1;

  // ── Credit deduction (case A boundary) ────────────────────────────────────
  const creditResult = await checkAndDeductCredits(request.userId, creditsRequired);
  if (!creditResult.success) {
    throw new GenerationError({
      code: "INSUFFICIENT_CREDITS",
      userMessage: `Not enough credits. You need ${creditsRequired} credit.`,
      isExpected: true,
    });
  }
  // ── CREDITS DEDUCTED — failures from here require refund (case B) ─────────

  let asset: GeneratedAsset;
  try {
    asset = await generateSingle2D(request);
  } catch (err) {
    // Case B: provider failed after deduction — refund
    await refundCreditsSafely(request.userId, creditsRequired, "single:provider_error");
    throw err; // Re-throw — already a GenerationError
  }
  // ── PROVIDER SUCCESS — case C boundary ────────────────────────────────────
  // From here: do NOT refund even if subsequent steps fail.

  // Case C: save to DB. If this fails, log for manual recovery.
  // The image was generated and provider was paid — no refund issued.
  await saveGeneratedAssets(request.userId, request, [asset]);

  // Case D: safe to return. DB record exists.
  log("generation:result", {
    mode: "single",
    userId: request.userId,
    seed: asset.seed,
    model: asset.model,
    durationMs: Date.now() - startMs,
  });

  return {
    success: true,
    assets: [asset],
    creditsUsed: creditsRequired,
    durationMs: Date.now() - startMs,
  };
}

// ---------------------------------------------------------------------------
// Pack / batch pipeline (multiple assets, one deduction)
// ---------------------------------------------------------------------------

async function generateMultiPipeline(
  request: GenerationRequest,
  startMs: number
): Promise<GenerationResult> {
  const count = request.mode === "pack"
    ? (request.packSize ?? 6)
    : (request.prompts?.length ?? 1);

  const creditsRequired = count; // 1 credit per asset

  // ── Credit deduction ───────────────────────────────────────────────────────
  const creditResult = await checkAndDeductCredits(request.userId, creditsRequired);
  if (!creditResult.success) {
    throw new GenerationError({
      code: "INSUFFICIENT_CREDITS",
      userMessage: `Not enough credits. You need ${creditsRequired} credits.`,
      isExpected: true,
    });
  }
  // ── CREDITS DEDUCTED ──────────────────────────────────────────────────────

  // Build per-asset prompt list
  const prompts: string[] =
    request.prompts && request.prompts.length === count
      ? request.prompts
      : Array.from({ length: count }, (_, i) =>
          `${request.prompt} (variation ${i + 1})`
        );

  // Generate assets sequentially — avoids overwhelming the Runware WS connection
  // and gives the user incremental progress in the queue flow.
  const assets: GeneratedAsset[] = [];
  let successCount = 0;

  for (let i = 0; i < count; i++) {
    try {
      const asset = await generateSingle2D({ ...request, prompt: prompts[i] });
      assets.push(asset);
      successCount++;
    } catch (err) {
      // Partial failure: refund only the credits for items NOT yet generated.
      // Items already generated consumed real provider cost.
      const remaining = count - successCount;
      if (remaining > 0) {
        await refundCreditsSafely(
          request.userId,
          remaining,
          `multi:partial_failure:${i}/${count}`
        );
      }
      log("generation:error", {
        mode: request.mode,
        userId: request.userId,
        item: i,
        total: count,
        error: err instanceof Error ? err.message : String(err),
      });
      throw new GenerationError({
        code: "PROVIDER_ERROR",
        userMessage: `Generation partially failed (${successCount}/${count} completed). ${remaining} credits refunded.`,
        isExpected: false,
        cause: err,
      });
    }
  }
  // ── ALL PROVIDERS SUCCEEDED ───────────────────────────────────────────────

  await saveGeneratedAssets(request.userId, request, assets);

  log("generation:result", {
    mode: request.mode,
    userId: request.userId,
    count: assets.length,
    durationMs: Date.now() - startMs,
  });

  return {
    success: true,
    assets,
    creditsUsed: creditsRequired,
    durationMs: Date.now() - startMs,
  };
}

// ---------------------------------------------------------------------------
// Spritesheet pipeline
// ---------------------------------------------------------------------------

async function generateSpritesheetPipeline(
  request: GenerationRequest,
  startMs: number
): Promise<GenerationResult> {
  // Spritesheet = pack of N frames at the same prompt, assembled by the client.
  // Cost: 1 credit per frame.
  const cols = request.sheetColumns ?? 4;
  const rows = request.sheetRows ?? 1;
  const frameCount = cols * rows;

  // Build per-frame prompts with animation direction hints
  const FRAME_HINTS = ["idle", "step left", "mid-stride", "step right"];
  const framePrompts = Array.from({ length: frameCount }, (_, i) => {
    const hint = FRAME_HINTS[i % FRAME_HINTS.length];
    return `${request.prompt}, ${hint} frame`;
  });

  return generateMultiPipeline(
    {
      ...request,
      mode: "batch", // reuse multi pipeline
      prompts: framePrompts,
      packSize: frameCount,
    },
    startMs
  );
}

// ---------------------------------------------------------------------------
// Tile pipeline
// ---------------------------------------------------------------------------

async function generateTilePipeline(
  request: GenerationRequest,
  startMs: number
): Promise<GenerationResult> {
  // Tile generation appends seamless tiling prompt terms.
  // Seamless tiling requires a specific prompt structure.
  const tilePromptSuffix = request.seamless
    ? ", seamless tile pattern, tileable texture, no borders, repeating pattern"
    : ", flat tile, simple pattern";

  return generateSinglePipeline(
    {
      ...request,
      mode: "single", // single asset
      prompt: `${request.prompt}${tilePromptSuffix}`,
    },
    startMs
  );
}

// =============================================================================
// SECTION 4 — CORE 2D GENERATOR
// =============================================================================

/**
 * Generates a single 2D image through the full pipeline:
 * prompt build → enhancement → Runware → bg removal → upload.
 *
 * Does NOT handle credits. Callers must deduct/refund.
 * Throws GenerationError on any failure.
 */
async function generateSingle2D(request: GenerationRequest): Promise<GeneratedAsset> {
  // ── 1. Resolve model ───────────────────────────────────────────────────────
  const tier = await getUserTier(request.userId);
  const modelId = resolveModel(tier, request.modelId);

  log("generation:model", {
    userId: request.userId,
    tier,
    modelId,
    requestedModel: request.modelId ?? null,
  });

  // ── 2. Build prompt ────────────────────────────────────────────────────────
  const {
    finalPrompt,
    negativePrompt,
    guidance: styleGuidance,
    steps: styleSteps,
    appliedOptimizations,
    warnings,
  } = await buildPromptForGeneration(
    request.prompt,
    request.categoryId,
    request.subcategoryId,
    request.styleId,
    {
      enableStyleMix: request.enableStyleMix,
      styleMix: request.styleMix,
      colorPaletteId: request.colorPaletteId,
    }
  );

  const quality = QUALITY_SETTINGS[request.qualityPreset ?? "normal"];

  log("generation:prompt", {
    userId: request.userId,
    promptPreview: finalPrompt.substring(0, 120),
    optimizations: appliedOptimizations.length,
  });

  // ── 3. Generate via Runware ────────────────────────────────────────────────
  const generationOptions: GenerateImageOptions = {
    prompt: finalPrompt,
    negativePrompt,
    model: modelId,
    seed: request.seed,
    steps: quality.steps || styleSteps,
    guidance: quality.guidance || styleGuidance,
    width: 1024,
    height: 1024,
  };

  const result = await generateImage(generationOptions, tier);

  if (!result.success || !result.images?.length) {
    throw new GenerationError({
      code: "PROVIDER_ERROR",
      userMessage: "Generation failed. Please try again.",
      isExpected: false,
      cause: result.error,
    });
  }

  const generatedImage: GeneratedImage = result.images[0];

  // ── 4. Remove background ───────────────────────────────────────────────────
  let imageUrlForUpload = generatedImage.imageURL;
  try {
    const bgResult = await removeBackground(generatedImage.imageURL);
    if (bgResult.success && bgResult.imageUrl) {
      imageUrlForUpload = bgResult.imageUrl;
    } else {
      // Non-fatal: log and continue with original
      log("generation:error", {
        stage: "bg_removal",
        userId: request.userId,
        error: bgResult.error,
      });
    }
  } catch (bgErr) {
    // Non-fatal: log and continue with original
    log("generation:error", {
      stage: "bg_removal",
      userId: request.userId,
      error: bgErr instanceof Error ? bgErr.message : String(bgErr),
    });
  }

  // ── 5. Upload to storage ───────────────────────────────────────────────────
  const finalUrl = await uploadGeneratedAsset(
    imageUrlForUpload,
    request.userId,
    request.categoryId,
    request.subcategoryId,
    request.styleId,
    generatedImage.seed
  );

  return {
    imageUrl: finalUrl,
    seed: generatedImage.seed,
    model: generatedImage.model,
    providerCost: generatedImage.cost,
    finalPrompt,
    appliedOptimizations,
    warnings,
  };
}

// =============================================================================
// SECTION 5 — INTERNAL HELPERS
// =============================================================================

// ---------------------------------------------------------------------------
// resolveModel — internal
// ---------------------------------------------------------------------------

function resolveModel(
  tier: UserTier,
  requested?: RunwareModelId
): RunwareModelId {
  if (!requested) return DEFAULT_MODEL[tier];

  const allowed = TIER_MODELS[tier];
  if (allowed.includes(requested)) return requested;

  // Requested model is above tier — fall back to tier default
  return DEFAULT_MODEL[tier];
}

// ---------------------------------------------------------------------------
// uploadGeneratedAsset — internal
// ---------------------------------------------------------------------------

/**
 * Uploads a generated image to the best available storage provider.
 * Order: R2 (primary, zero-egress) → Supabase Storage (fallback) → original URL.
 *
 * Never throws — falls back through providers and logs failures.
 * Returns the best available URL.
 */
async function uploadGeneratedAsset(
  imageUrl: string,
  userId: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  seed: number
): Promise<string> {
  if (isR2Configured()) {
    const r2Result = await uploadToR2(imageUrl, userId);
    if (r2Result.success && r2Result.url) {
      return r2Result.url;
    }
    log("generation:error", {
      stage: "upload_r2",
      userId,
      error: r2Result.error,
    });
  }

  // R2 unavailable or failed → try Supabase
  const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${seed}`;
  const supabaseResult = await uploadImageToStorage(imageUrl, userId, fileName);
  if (supabaseResult.success && supabaseResult.url) {
    return supabaseResult.url;
  }

  log("generation:error", {
    stage: "upload_supabase",
    userId,
    error: supabaseResult.error,
  });

  // Both failed — return the temporary Runware URL as last resort.
  // This URL expires; the generation record will have a broken image link
  // eventually. Logged for manual recovery.
  log("generation:error", {
    stage: "upload_all_failed",
    userId,
    message: "Both R2 and Supabase upload failed. Using temporary provider URL.",
  });

  return imageUrl;
}

// ---------------------------------------------------------------------------
// saveGeneratedAssets — internal
// ---------------------------------------------------------------------------

/**
 * Saves one or more generated assets to the database.
 *
 * Failure here is case C / D: provider already succeeded and was paid.
 * We do NOT refund on save failure. Instead, we log the failure so that
 * a background recovery job can re-create the records from the uploaded URLs.
 *
 * This function never throws — it absorbs DB errors.
 */
async function saveGeneratedAssets(
  userId: string,
  request: GenerationRequest,
  assets: GeneratedAsset[]
): Promise<void> {
  for (const asset of assets) {
    const params: SaveGenerationParams = {
      userId,
      prompt: request.prompt,
      fullPrompt: asset.finalPrompt,
      categoryId: request.categoryId,
      subcategoryId: request.subcategoryId,
      styleId: request.styleId,
      imageUrl: asset.imageUrl,
      seed: asset.seed,
      replicateCost: asset.providerCost,
    };

    const saveResult = await saveGeneration(params);
    if (!saveResult.success) {
      // Case C failure: image was generated but record not saved.
      // Log for manual recovery — do NOT throw or refund.
      log("generation:error", {
        stage: "db_save",
        userId,
        seed: asset.seed,
        imageUrl: asset.imageUrl.substring(0, 80),
        error: saveResult.error,
        recoveryNote: "Image generated successfully. DB record missing — manual save needed.",
      });
    }
  }
}

// ---------------------------------------------------------------------------
// refundCreditsSafely — internal
// ---------------------------------------------------------------------------

/**
 * Issues a credit refund and logs the outcome.
 * Absorbs errors — a failed refund is logged but does not crash the request.
 * Never throws.
 *
 * Context is a short string for log tracing, e.g. "single:provider_error".
 */
async function refundCreditsSafely(
  userId: string,
  amount: number,
  context: string
): Promise<void> {
  try {
    const refundResult = await refundCredits(userId, amount);
    if (refundResult.success) {
      log("generation:error", {
        stage: "refund_issued",
        context,
        userId,
        amount,
        newBalance: refundResult.credits,
      });
    } else {
      log("generation:error", {
        stage: "refund_failed",
        context,
        userId,
        amount,
        warning: "Refund call returned success: false — manual credit restore needed.",
      });
    }
  } catch (err) {
    log("generation:error", {
      stage: "refund_exception",
      context,
      userId,
      amount,
      error: err instanceof Error ? err.message : String(err),
      warning: "Refund threw an exception — manual credit restore needed.",
    });
  }
}

// =============================================================================
// SECTION 6 — LOGGING
// =============================================================================

type LogStage =
  | "generation:start"
  | "generation:prompt"
  | "generation:model"
  | "generation:result"
  | "generation:error";

/**
 * Structured log helper. All log lines from the generation service share
 * a consistent "[Generation]" prefix for easy filtering in production logs.
 *
 * Safety rules:
 * - Never log auth tokens, raw env vars, or user PII beyond userId/IP.
 * - imageUrl is truncated to 80 chars to avoid flooding logs with long CDN URLs.
 * - provider model IDs and prompt previews are safe to log.
 */
function log(stage: LogStage, data: Record<string, unknown>): void {
  console.log(`[Generation] ${stage}`, sanitizeLogData(data));
}

function sanitizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "imageUrl" && typeof v === "string") {
      sanitized[k] = v.substring(0, 80) + (v.length > 80 ? "..." : "");
    } else {
      sanitized[k] = v;
    }
  }
  return sanitized;
}
