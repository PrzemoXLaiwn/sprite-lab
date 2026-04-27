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
  STYLES_2D_FULL,
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
  | "3d"; // Dispatches to existing generate-3d route — not handled here

// ---------------------------------------------------------------------------
// Quality preset
// ---------------------------------------------------------------------------

export type QualityPreset = "draft" | "normal" | "hd";

const QUALITY_SETTINGS: Record<QualityPreset, { steps: number; guidance: number }> = {
  draft:  { steps: 15, guidance: 2.5 },
  normal: { steps: 28, guidance: 3.2 },
  hd:     { steps: 40, guidance: 3.8 },
};

// Credit cost per preset. Draft + Normal = 1 credit (entry-level). HD costs
// 2 credits because it uses ~40 steps vs ~25 for normal — provider cost is
// roughly proportional. Surfacing the cost in the UI is the caller's job
// (see CREDIT_COSTS export below).
export const CREDIT_COSTS: Record<QualityPreset, number> = {
  draft: 1,
  normal: 1,
  hd: 2,
};

export function creditsForPreset(preset?: QualityPreset): number {
  return CREDIT_COSTS[preset ?? "normal"];
}

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
  view?: string;
  projectId?: string;
  folderId?: string;

  // Optional overrides
  seed?: number;
  qualityPreset?: QualityPreset;

  /**
   * Optional palette ID. When set, the prompt builder injects a colour-
   * palette token (e.g. NEON_CYBER → "neon pink, electric cyan, purple
   * glow color palette"). When unset, the style decides.
   */
  colorPaletteId?: string;

  // The style-mix / model-override / pack-batch fields used to live here
  // but were never wired to a real UI surface. Removed to make the
  // contract honest — re-add per-feature when there's a flow asking for it.
  enableStyleMix?: never;
  styleMix?: never;
  modelId?: never;
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
  /**
   * Non-blocking warnings the UI should surface to the user.
   * Sources: bg-removal failure, model downgrade, prompt enhancer hints.
   */
  warnings: string[];
  /**
   * View that was actually applied after server-side resolution. May
   * differ from the user's selector when the prompt itself contained a
   * view keyword ("side view") that overrode the dropdown. Surfaced so
   * the UI can echo what really shipped.
   */
  resolvedView?: string;
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
    colorPaletteId?: string;
    view?: string;
    qualityPreset?: QualityPreset;
  }
): Promise<{
  finalPrompt: string;
  negativePrompt: string;
  guidance: number;
  steps: number;
  appliedOptimizations: string[];
  warnings: string[];
  resolvedView?: string;
}> {
  // Build base prompt — buildEnhancedPrompt only fires when a palette ID
  // is set (otherwise the cheaper buildUltimatePrompt is sufficient).
  const {
    prompt: builtPrompt,
    negativePrompt: builtNegative,
    guidance: styleGuidance,
    steps: styleSteps,
    resolvedView,
  } = options?.colorPaletteId
    ? buildEnhancedPrompt(prompt, categoryId, subcategoryId, styleId, {
        colorPaletteId: options.colorPaletteId,
        view: options.view,
        qualityPreset: options.qualityPreset,
      })
    : buildUltimatePrompt(prompt, categoryId, subcategoryId, styleId, options?.view, options?.qualityPreset);

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
    resolvedView,
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

    default: {
      // Pack / batch / spritesheet / tile pipelines were removed because
      // no UI route ever invoked them. Re-introduce as focused tools when
      // there's a real product surface for them.
      throw new GenerationError({
        code: "UNEXPECTED_ERROR",
        userMessage: "Unknown generation mode.",
        isExpected: false,
        message: `Unhandled mode: ${request.mode}`,
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
  // Credit cost scales with quality preset because HD uses ~3× the steps
  // (and therefore ~3× the provider cost). Without this, an HD generation
  // looked free to the user while costing us multiples per image.
  const creditsRequired = creditsForPreset(request.qualityPreset);

  // ── Credit deduction (case A boundary) ────────────────────────────────────
  const creditResult = await checkAndDeductCredits(request.userId, creditsRequired);
  if (!creditResult.success) {
    if (creditResult.error === "Not enough credits") {
      throw new GenerationError({
        code: "INSUFFICIENT_CREDITS",
        userMessage: `Not enough credits. You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"}.`,
        isExpected: true,
      });
    }
    throw new GenerationError({
      code: "UNEXPECTED_ERROR",
      userMessage: "Something went wrong. Please try again.",
      isExpected: false,
      message: `Credit deduction failed: ${creditResult.error}`,
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
  // Honour the style's intended model when the user's tier allows it.
  // Each entry in STYLES_2D_FULL declares whether it was tuned for
  // flux-schnell (fast & cheap) or flux-dev (better fidelity). If the
  // user's tier doesn't permit the intended model, downgrade and surface
  // a warning so the user knows the result will not match the style preview.
  const tier = await getUserTier(request.userId);
  const styleConfig = STYLES_2D_FULL[request.styleId];
  const intendedModel = styleConfig?.model as RunwareModelId | undefined;
  const allowed = TIER_MODELS[tier];
  const tierDefault = DEFAULT_MODEL[tier];

  let modelId: RunwareModelId;
  let modelDowngraded = false;
  if (intendedModel && allowed.includes(intendedModel)) {
    modelId = intendedModel;
  } else if (intendedModel && !allowed.includes(intendedModel)) {
    modelId = tierDefault;
    modelDowngraded = true;
  } else {
    modelId = tierDefault;
  }

  log("generation:model", {
    userId: request.userId,
    tier,
    modelId,
    intendedModel: intendedModel ?? null,
    downgraded: modelDowngraded,
  });

  // ── 2. Build prompt ────────────────────────────────────────────────────────
  const {
    finalPrompt,
    negativePrompt,
    guidance: styleGuidance,
    steps: styleSteps,
    appliedOptimizations,
    warnings,
    resolvedView,
  } = await buildPromptForGeneration(
    request.prompt,
    request.categoryId,
    request.subcategoryId,
    request.styleId,
    {
      colorPaletteId: request.colorPaletteId,
      view: request.view,
      qualityPreset: request.qualityPreset,
    }
  );

  // Surface a view-conflict warning when the prompt redirected the view
  // away from what the user picked in the selector. The UI shows a live
  // hint pre-submit (form's detectViewInText), but if the user ignored
  // it and clicked Generate anyway they should still know what happened.
  const requestedView = request.view ?? "DEFAULT";
  if (resolvedView && resolvedView !== requestedView && requestedView !== "DEFAULT") {
    warnings.push(
      `Your prompt referenced "${resolvedView.toLowerCase().replace("_", " ")}" — we used that instead of the "${requestedView.toLowerCase().replace("_", " ")}" you selected.`
    );
  }

  // Quality preset:
  //  - "normal" (default) honours the style's tuned steps + guidance from
  //    STYLES_2D_FULL — every style was hand-calibrated for these defaults.
  //  - "draft" forces the cheap-and-fast preset (icon-safe, low fidelity).
  //  - "hd" forces the high-step / high-guidance preset for max detail.
  // Earlier code always pulled QUALITY_SETTINGS[preset] which buried the
  // style's own steps under the medium-preset constants.
  const preset = request.qualityPreset ?? "normal";
  const quality =
    preset === "normal"
      ? { steps: styleSteps, guidance: styleGuidance }
      : QUALITY_SETTINGS[preset];

  log("generation:prompt", {
    userId: request.userId,
    promptPreview: finalPrompt.substring(0, 120),
    optimizations: appliedOptimizations.length,
  });

  // Full prompt debug — remove after debugging views/colors
  console.log("\n" + "═".repeat(80));
  console.log("🔍 FULL PROMPT SENT TO FLUX:");
  console.log("═".repeat(80));
  console.log("VIEW:", request.view || "DEFAULT");
  console.log("POSITIVE:", finalPrompt);
  console.log("─".repeat(80));
  console.log("NEGATIVE:", negativePrompt);
  console.log("WORDS:", finalPrompt.split(/\s+/).length, "positive /", negativePrompt.split(/\s+/).length, "negative");
  console.log("═".repeat(80) + "\n");

  // ── 3. Generate via Runware ────────────────────────────────────────────────
  const generationOptions: GenerateImageOptions = {
    prompt: finalPrompt,
    negativePrompt,
    model: modelId,
    seed: request.seed,
    steps: quality.steps,
    guidance: quality.guidance,
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
  // Non-fatal: if bg removal fails we still upload the original. Surface a
  // warning so the UI can flag the image as having a baked-in background
  // rather than the transparent PNG the user expects.
  let imageUrlForUpload = generatedImage.imageURL;
  let bgRemovalFailed = false;
  try {
    const bgResult = await removeBackground(generatedImage.imageURL);
    if (bgResult.success && bgResult.imageUrl) {
      imageUrlForUpload = bgResult.imageUrl;
    } else {
      bgRemovalFailed = true;
      log("generation:error", {
        stage: "bg_removal",
        userId: request.userId,
        error: bgResult.error,
      });
    }
  } catch (bgErr) {
    bgRemovalFailed = true;
    log("generation:error", {
      stage: "bg_removal",
      userId: request.userId,
      error: bgErr instanceof Error ? bgErr.message : String(bgErr),
    });
  }
  if (bgRemovalFailed) {
    warnings.push("Background removal was unavailable — your image keeps its original background. Try again to get a transparent PNG.");
  }
  if (modelDowngraded && intendedModel) {
    warnings.push(
      `This style is tuned for ${intendedModel}; your plan ran it on ${modelId}. Output may look softer than the preview — upgrade for full fidelity.`
    );
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
    resolvedView,
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
 * Order: R2 (primary, zero-egress) → Supabase Storage (fallback).
 *
 * Throws PROVIDER_ERROR if both providers fail. Persisting the ephemeral
 * Runware URL silently gives the user a broken asset hours later — better
 * to fail loudly here so the caller refunds the credit (case B) and the
 * user knows to retry.
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

  log("generation:error", {
    stage: "upload_all_failed",
    userId,
    message: "Both R2 and Supabase upload failed. Refusing to persist temp provider URL.",
  });

  throw new GenerationError({
    code: "PROVIDER_ERROR",
    userMessage:
      "We couldn't save your image right now. Your credit has been refunded — please try again in a moment.",
    isExpected: false,
    message: "Image hosting unavailable: both R2 and Supabase upload failed",
  });
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
      projectId: request.projectId,
      folderId: request.folderId,
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
