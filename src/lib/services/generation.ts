// =============================================================================
// SPRITELAB — CANONICAL GENERATION SERVICE
// =============================================================================
// This is the future orchestration layer for all 2D generation flows.
//
// CURRENT STATUS: Phase 3A — service created, not yet wired to any route.
//   Existing routes continue to use their own logic until Phase 3B migration.
//
// ARCHITECTURE:
//   Public API:    generateAssets()  generateGuestAsset()
//   Core pipeline: generateSingle2D() (shared by all 2D flows)
//   Helpers:       saveGeneratedAssets()  (charging/refunds: src/lib/billing/operations.ts)
//
// 3D NOTE:
//   3D generation uses Replicate (not Runware) and produces a different output
//   format (GLB/mesh). It is not modelled here — the existing generate-3d
//   route handles it. A typed stub is included so callers can dispatch cleanly.
//
// CREDIT SAFETY CONTRACT:
//   A. Failure BEFORE deduction     → no action needed
//   B. Failure AFTER deduction,     → op.fail() refunds what is still due (once)
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
  removeBackground,
  generateSpriteImage,
  SPRITE_MODELS,
  type SpriteModelKey,
  generateAnimationGrid,
} from "@/lib/runware";
import { isDailyAllowanceError, dailyAllowanceMessage } from "@/lib/cloudflare-ai";
import { uploadGenerationBufferToR2 } from "@/lib/r2";
import { startOperation, type OpHandle } from "@/lib/billing/operations";
import { saveGeneration, type SaveGenerationParams } from "@/lib/db/generations";
import { COLOR_PALETTES } from "@/config/features/premium-features";
import { postprocessSprite, postprocessTile } from "@/lib/image/sprite-postprocess";
import { buildSpritePrompt, isPixelStyle, isTileCategory, normalizeStyleId } from "@/config/prompts/sprite-prompt";

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

// Credit cost per preset. Draft + Normal = 1 credit (FLUX.2 klein, ~$0.001).
// HD runs on GPT Image Mini (~$0.036/image ≈ the price of 1 credit in the
// cheapest pack), so it costs 3 credits to keep a margin. Surfacing the cost
// in the UI is the caller's job (see CREDIT_COSTS export below).
export const CREDIT_COSTS: Record<QualityPreset, number> = {
  draft: 1,
  normal: 1,
  hd: 3,
};

/** Matching a reference sprite's style runs on the image-edit model (~$0.07). */
export const STYLE_MATCH_CREDITS = 4;

export function creditsForPreset(preset?: QualityPreset): number {
  return CREDIT_COSTS[preset ?? "normal"] ?? CREDIT_COSTS.normal;
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
  /**
   * Pose override for character / creature subcategories. Defaults to
   * "auto" (A-pose for game rigging) when unset. Inanimate categories
   * (weapons, items, environment) ignore this field.
   */
  pose?: "auto" | "a-pose" | "t-pose" | "dynamic";
  /**
   * Style reference: another sprite (PNG on white). The new sprite is drawn
   * in exactly its art style by the image-edit model — a whole game in one look.
   */
  styleReference?: Buffer;
  /** Pixel canvas of the reference (e.g. 64) so the new sprite gets the same pixel size. */
  styleReferenceGrid?: number;
  /** For the free-tier spend guard. */
  plan?: string | null;
  /** For the per-network failure guard. */
  ip?: string | null;

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
  /** DB id of the saved Generation row (set after save; used for project accept). */
  generationId?: string;
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
  | "CAPACITY_EXHAUSTED"
  | "RATE_LIMITED"
  | "SERVICE_PAUSED"
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

  // Same sprite pipeline as signed-in users (standard model) so the demo
  // shows exactly the quality people get after signing up.
  const styleId = request.style === "pixel" ? "PIXEL_ART_16" : "CARTOON_WESTERN";
  const finalPrompt = buildSpritePrompt({ subject: request.prompt, styleId });

  let generated: Awaited<ReturnType<typeof generateSpriteImage>>;
  try {
    generated = await generateSpriteImage({
      prompt: finalPrompt,
      model: "standard",
      seed: Math.floor(Math.random() * 2147483647),
    });
  } catch (err) {
    log("generation:error", { mode: "guest", error: err instanceof Error ? err.message : String(err) });
    const exhausted = isDailyAllowanceError(err);
    throw new GenerationError({
      code: exhausted ? "CAPACITY_EXHAUSTED" : "PROVIDER_ERROR",
      userMessage: exhausted ? dailyAllowanceMessage() : "Generation failed. Please try again.",
      isExpected: false,
      cause: err,
    });
  }

  let png = generated.image;
  try {
    png = (await postprocessSprite(generated.image, {
      pixelGrid: request.style === "pixel" ? 128 : undefined,
      paletteSize: 32,
    })).png;
  } catch (err) {
    log("generation:error", { mode: "guest", stage: "postprocess", error: err instanceof Error ? err.message : String(err) });
  }

  // Persist so the URL outlives the provider's temporary link; fall back to
  // an inline data URL if storage is unavailable.
  const upload = await uploadGenerationBufferToR2(png, "guest");
  const imageUrl = upload.success && upload.url ? upload.url : `data:image/png;base64,${png.toString("base64")}`;

  log("generation:result", {
    mode: "guest",
    seed: generated.seed,
    model: generated.model,
    durationMs: Date.now() - startMs,
  });

  return {
    success: true,
    assets: [
      {
        imageUrl,
        seed: generated.seed,
        model: generated.model,
        providerCost: generated.cost,
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
  const creditsRequired = request.styleReference ? STYLE_MATCH_CREDITS : creditsForPreset(request.qualityPreset);

  // ── Charge as a paid operation (case A boundary) ──────────────────────────
  // Guards (rate, failures, daily budget) run first; nothing is charged when they refuse.
  const feature = request.styleReference ? "style_match" : request.qualityPreset === "hd" ? "sprite_hd" : "sprite";
  const started = await startOperation({
    userId: request.userId, feature, credits: creditsRequired, plan: request.plan ?? null, ip: request.ip ?? null,
    input: { prompt: request.prompt, categoryId: request.categoryId, subcategoryId: request.subcategoryId, styleId: request.styleId, preset: request.qualityPreset, styleMatch: !!request.styleReference },
  });
  if (!started.ok) {
    const code: GenerationErrorCode = started.status === 402 ? "INSUFFICIENT_CREDITS" : started.status === 429 ? "RATE_LIMITED" : started.status === 503 ? "SERVICE_PAUSED" : "UNEXPECTED_ERROR";
    throw new GenerationError({
      code,
      userMessage: started.status === 402 ? `Not enough credits. You need ${creditsRequired} credit${creditsRequired === 1 ? "" : "s"}.` : started.body.error,
      isExpected: started.status !== 500,
      message: `Operation refused: ${started.code}`,
    });
  }
  const op: OpHandle = started.op;
  // ── CREDITS DEDUCTED — failures from here require refund (case B) ─────────

  let asset: GeneratedAsset;
  let creditsUsed = creditsRequired;
  try {
    const out = await op.run(() => generateSingle2D(request));
    asset = out.asset;
    // Style match or HD fell back to the standard model: charge only for
    // what was delivered and give the difference back (idempotent per operation).
    if (out.creditsUsed < creditsRequired) {
      await op.refund(creditsRequired - out.creditsUsed, "single:downgrade");
      creditsUsed = out.creditsUsed;
    }
  } catch (err) {
    // Case B: provider failed after deduction — refund what's still due, once
    await op.fail(err instanceof GenerationError ? err.code : "PROVIDER_ERROR");
    throw err; // Re-throw — already a GenerationError
  }
  // ── PROVIDER SUCCESS — case C boundary ────────────────────────────────────
  // From here: do NOT refund even if subsequent steps fail.

  // Case C: save to DB. If this fails, log for manual recovery.
  // The image was generated and provider was paid — no refund issued.
  await saveGeneratedAssets(request.userId, request, [asset]);
  if (creditsUsed < creditsRequired) await op.partial(null, "downgraded");
  else await op.succeed(null);

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
    creditsUsed,
    durationMs: Date.now() - startMs,
  };
}


// =============================================================================
// SECTION 4 — CORE 2D GENERATOR
// =============================================================================

/**
 * Generates a single 2D sprite:
 *   short instruction prompt → instruction-following model (flat background)
 *   → deterministic post-processing (transparency, crop, pixel grid, palette)
 *   → upload.
 *
 * The model only has to draw the subject; every hard spec the user expects
 * (transparent PNG, centred single object, real pixel grid, limited palette)
 * is enforced in code by postprocessSprite(), so it holds on every run.
 *
 * Does NOT handle credits. Callers must deduct/refund.
 * Throws GenerationError on any failure.
 */
async function generateSingle2D(request: GenerationRequest): Promise<{ asset: GeneratedAsset; creditsUsed: number }> {
  const warnings: string[] = [];
  const styleId = normalizeStyleId(request.styleId);

  // ── 1. Model: HD preset → GPT Image Mini, otherwise FLUX.2 klein ──────────
  const modelKey: SpriteModelKey = request.qualityPreset === "hd" ? "hd" : "standard";

  // ── 2. Prompt ──────────────────────────────────────────────────────────────
  const view = request.view && request.view !== "DEFAULT" ? request.view : undefined;
  const palette = request.colorPaletteId
    ? COLOR_PALETTES.find((p) => p.id === request.colorPaletteId)
    : undefined;
  const finalPrompt = buildSpritePrompt({
    subject: request.prompt,
    styleId,
    categoryId: request.categoryId,
    view,
    colorHint: palette?.promptModifier,
    pose: request.pose,
  });

  log("generation:model", { userId: request.userId, modelKey, styleId });
  if (process.env.DEBUG_PROMPTS === "1") {
    console.debug("[Generation] Prompt:", finalPrompt.slice(0, 300));
  }

  // ── 3. Generate ────────────────────────────────────────────────────────────
  // The route has maxDuration 300 s. Each provider call can take up to ~165 s
  // (Runware 75 s timeout + Cloudflare fallback 90 s), so a second call is
  // only started while it can still finish in time — otherwise the function
  // would be killed before the caller refunds the credits.
  const startedAt = Date.now();
  const RETRY_BUDGET_MS = 100_000;
  const providerError = (cause: unknown) => {
    const exhausted = isDailyAllowanceError(cause);
    return new GenerationError({
      code: exhausted ? "CAPACITY_EXHAUSTED" : "PROVIDER_ERROR",
      userMessage: exhausted ? dailyAllowanceMessage() : "Generation failed. Please try again.",
      isExpected: exhausted,
      cause,
    });
  };
  let generated: Awaited<ReturnType<typeof generateSpriteImage>> | undefined;
  let styleMatched = false;
  if (request.styleReference) {
    try {
      const styled = await generateAnimationGrid({
        prompt: [
          finalPrompt,
          "Match the art style of the reference image exactly: the same rendering technique, pixel size, outline colour and thickness, colour palette, shading and lighting, and the same proportions / level of detail, so both sprites look like they come from one game.",
          "Draw a completely NEW subject as described above — do not copy the reference's subject, pose or design. Same scale as the reference.",
        ].join("\n"),
        reference: request.styleReference,
        size: 1024,
      });
      generated = { image: styled.image, seed: request.seed ?? 0, model: "style-match", cost: styled.cost };
      styleMatched = true;
    } catch (err) {
      log("generation:error", { stage: "style-match", userId: request.userId, error: err instanceof Error ? err.message : String(err) });
      if (Date.now() - startedAt > RETRY_BUDGET_MS) throw providerError(err);
      warnings.push("Couldn't match the reference style this time — this sprite uses your selected style and the extra credits were refunded.");
    }
  }
  if (!generated) try {
    generated = await generateSpriteImage({ prompt: finalPrompt, model: modelKey, seed: request.seed });
  } catch (err) {
    // One retry on the standard model — a transient provider error shouldn't
    // cost the user a refund round-trip.
    log("generation:error", {
      stage: "provider",
      userId: request.userId,
      modelKey,
      error: err instanceof Error ? err.message : String(err),
    });
    if (isDailyAllowanceError(err) || Date.now() - startedAt > RETRY_BUDGET_MS) throw providerError(err);
    try {
      generated = await generateSpriteImage({ prompt: finalPrompt, model: "standard", seed: request.seed });
    } catch (retryErr) {
      throw providerError(retryErr);
    }
  }

  // What was actually delivered decides the price. HD counts only when the
  // HD model itself drew it (not the standard retry or the free fallback).
  const deliveredHd = modelKey === "hd" && generated.model === SPRITE_MODELS.hd.air;
  if (modelKey === "hd" && !deliveredHd && !styleMatched) {
    warnings.push(`HD model was busy — this sprite was made with the standard model and costs ${CREDIT_COSTS.normal} credit.`);
  }
  const creditsUsed = styleMatched ? STYLE_MATCH_CREDITS : deliveredHd ? CREDIT_COSTS.hd : CREDIT_COSTS.normal;

  // ── 4. Post-process ────────────────────────────────────────────────────────
  // Pixel styles: canvas of up to 128 art pixels. The model's own pixel size
  // is kept when detected; forcing a smaller grid (we tried 64) merged faces
  // and fine detail into blobs.
  const pixelGrid = isPixelStyle(styleId) ? (request.styleReferenceGrid && request.styleReferenceGrid >= 24 ? request.styleReferenceGrid : 128) : undefined;
  const paletteSize = 32;
  let png: Buffer;
  if (isTileCategory(request.categoryId)) {
    try {
      png = (await postprocessTile(generated.image, { pixelGrid, paletteSize })).png;
    } catch (err) {
      log("generation:error", { stage: "postprocess-tile", userId: request.userId, error: err instanceof Error ? err.message : String(err) });
      png = generated.image;
    }
  } else try {
    const processed = await postprocessSprite(generated.image, { pixelGrid, paletteSize });
    png = processed.png;
    if (!processed.backgroundRemoved) {
      // Model drew a scene despite the instruction — fall back to the AI
      // background remover, then re-run the deterministic steps on its alpha.
      const bg = await removeBackgroundFromBuffer(generated.image);
      if (bg) {
        png = (await postprocessSprite(bg, { pixelGrid, paletteSize, trustInputAlpha: true })).png;
      } else {
        warnings.push("We couldn't separate the background on this one — try generating again.");
      }
    }
  } catch (err) {
    log("generation:error", {
      stage: "postprocess",
      userId: request.userId,
      error: err instanceof Error ? err.message : String(err),
    });
    png = generated.image;
    warnings.push("Post-processing failed for this sprite — showing the raw image.");
  }

  // ── 5. Upload ──────────────────────────────────────────────────────────────
  const upload = await uploadGenerationBufferToR2(png, request.userId);
  if (!upload.success || !upload.url) {
    throw new GenerationError({
      code: "UPLOAD_ERROR",
      userMessage: "Couldn't save your sprite. Please try again.",
      isExpected: false,
      cause: upload.error,
    });
  }

  return {
    asset: {
      imageUrl: upload.url,
      seed: generated.seed,
      model: generated.model,
      providerCost: generated.cost,
      finalPrompt,
      appliedOptimizations: [],
      warnings,
      resolvedView: view ?? "DEFAULT",
    },
    creditsUsed,
  };
}

/** AI background removal for a buffer (fallback path). Returns PNG or null. */
async function removeBackgroundFromBuffer(image: Buffer): Promise<Buffer | null> {
  try {
    const dataUri = `data:image/png;base64,${image.toString("base64")}`;
    const result = await removeBackground(dataUri);
    if (!result.success || !result.imageUrl) return null;
    const res = await fetch(result.imageUrl, { signal: AbortSignal.timeout(30_000) });
    return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
  } catch {
    return null;
  }
}

// =============================================================================
// SECTION 5 — INTERNAL HELPERS
// =============================================================================

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

    let saveResult: Awaited<ReturnType<typeof saveGeneration>>;
    try {
      saveResult = await saveGeneration(params);
    } catch (err) {
      saveResult = { success: false, error: err instanceof Error ? err.message : String(err) } as Awaited<ReturnType<typeof saveGeneration>>;
    }
    if (saveResult.success && "generation" in saveResult && saveResult.generation) {
      asset.generationId = saveResult.generation.id;
    }
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
