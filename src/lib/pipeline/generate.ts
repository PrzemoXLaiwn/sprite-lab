/**
 * Pipeline orchestrator — the 13-step generation flow.
 *
 * Consumes every unit built in module 2:
 *   file #3  pipeline/errors.ts        — typed failure classes + toLogContext
 *   file #5  runware/client.ts         — FLUX inference + BG removal SDK boundary
 *   file #6  image/pixelate.ts         — NN downsample + display upscale
 *   file #7  image/quantize.ts         — derived / forced palette
 *   file #8  image/bg-remove.ts        — BG removal → Buffer
 *   file #9  image/tileability.ts      — edge-diff check (tile category only)
 *   file #10 r2/keys.ts                — key string builders
 *   file #11 prompts/compose.ts        — translate → enhance → compose positive/negative
 *   file #12 config/styles/…           — 3 filled style configs + STYLE_IDS
 *   file #13 config/categories/…       — 9 filled category configs
 *   file #14 credits/reserve.ts        — reserve + refundReservedCredits
 *   plus the existing src/lib/runware.ts (singleton), src/lib/r2.ts
 *   (uploadBufferToR2), src/lib/db/credits.ts.
 *
 * Step sequence (spec):
 *   1  validation              — throws ValidationError, no API calls
 *   2  prompt composition      — composePrompt()
 *   3  credit reservation      — reserveCredits()  [← AFTER this, refund on recoverable error]
 *   4  raw generation          — runware.inferImage()
 *   5  background removal      — conditional on style.bgRemoval && category.needsBgRemoval
 *   6  pixelate                — pixelate() with style.defaultSize
 *   7  palette quantization    — quantizeDerived | quantizeForced | skip (none) | throw (user)
 *   8  tileability check       — conditional on category.needsTileabilityCheck
 *   9  normal map              — SKIPPED in module 2 (see module 9)
 *   10 display upscale         — upscaleForDisplay() to 1024²
 *   11 R2 uploads              — two uploads (imageKey + displayKey)
 *   12 persistence             — prisma.asset.create
 *   13 response assembly       — construct GenerateResult
 */

import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { childLogger } from "../logger";
import {
  ValidationError,
  StorageError,
  PersistenceError,
  ImageProcessingError,
  isPipelineError,
  toLogContext,
} from "./errors";

import { composePrompt, type TransformationTrail } from "../prompts/compose";
import { reserveCredits, refundReservedCredits } from "../credits/reserve";
import { runware } from "../runware/client";
import { removeBackgroundToBuffer } from "../image/bg-remove";
import { pixelate, upscaleForDisplay } from "../image/pixelate";
import { quantizeDerived, quantizeForced } from "../image/quantize";
import { checkTileability } from "../image/tileability";
import { buildAssetKey, buildDisplayKey } from "../r2/keys";
import { uploadBufferToR2 } from "../r2";

import {
  CATEGORY_IDS,
  getCategoryConfig,
  pivotForCategory,
  type CategoryId,
} from "../../config/categories/category-configs";
import {
  STYLE_IDS,
  getStyleConfig,
  type StyleId,
} from "../../config/styles/style-configs";

// ─── Public I/O types ─────────────────────────────────────────────────────

export interface GenerateRequest {
  /** UUID generated upstream (API route). Threads through every log line. */
  requestId: string;
  /** Authenticated user. */
  userId: string;
  /** Target project — orchestrator assumes caller already resolved Inbox. */
  projectId: string;
  /** User's raw prompt text. */
  rawInput: string;
  /** Validated CategoryId (validation re-runs here defensively). */
  categoryId: string;
  /** Validated StyleId. */
  styleId: string;
  /** Pro-tier enhance toggle. Default false. */
  enhance?: boolean;
  /** Resolved cost. Deducted in step 3, refunded on step-4+ recoverable failure. */
  creditsToDeduct: number;
}

export interface GenerateResult {
  assetId: string;
  imageKey: string;
  displayKey: string;
  /** Hex strings. Empty array when style.palette.kind === "none". */
  palette: string[];
  /** Seed passed to FLUX — exposed for regen UX. */
  seed: number;
  /** Only populated when the category triggers tileability validation. */
  tileable?: boolean;
  /** Compose-step breadcrumbs: rawInput / translated / enhanced / composed / language. */
  trail: TransformationTrail;
  /** Total pipeline wall time. */
  durationMs: number;
}

// ─── Type guards (narrow string → typed union) ────────────────────────────

function isKnownCategoryId(id: string): id is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(id);
}

function isKnownStyleId(id: string): id is StyleId {
  return (STYLE_IDS as readonly string[]).includes(id);
}

// ─── Step 1: validation ───────────────────────────────────────────────────

function assertNonEmptyString(value: unknown, field: string): void {
  if (typeof value !== "string" || value.length === 0) {
    throw new ValidationError(`${field} must be a non-empty string`, {
      context: { field },
    });
  }
}

function assertValidRequest(req: GenerateRequest): void {
  assertNonEmptyString(req.requestId, "requestId");
  assertNonEmptyString(req.userId, "userId");
  assertNonEmptyString(req.projectId, "projectId");
  assertNonEmptyString(req.rawInput, "rawInput");
  assertNonEmptyString(req.categoryId, "categoryId");
  assertNonEmptyString(req.styleId, "styleId");

  if (
    typeof req.creditsToDeduct !== "number" ||
    !Number.isInteger(req.creditsToDeduct) ||
    req.creditsToDeduct <= 0
  ) {
    throw new ValidationError(
      "creditsToDeduct must be a positive integer",
      { context: { creditsToDeduct: req.creditsToDeduct } }
    );
  }

  if (!isKnownCategoryId(req.categoryId)) {
    throw new ValidationError(`unknown categoryId: ${req.categoryId}`, {
      context: { categoryId: req.categoryId },
    });
  }
  if (!isKnownStyleId(req.styleId)) {
    throw new ValidationError(`unknown styleId: ${req.styleId}`, {
      context: { styleId: req.styleId },
    });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/** Model-specific sampler defaults (spec: Schnell 4 / 1.0, Dev 20 / 3.5). */
function modelDefaults(model: "flux-schnell" | "flux-dev"): {
  steps: number;
  cfgScale: number;
} {
  switch (model) {
    case "flux-schnell":
      return { steps: 4, cfgScale: 1.0 };
    case "flux-dev":
      return { steps: 20, cfgScale: 3.5 };
  }
}

const FETCH_TIMEOUT_MS = 30_000;
const URL_LOG_TRUNCATE = 80;

/**
 * Fetch a Runware image URL directly into a Buffer. Used by step 5 when
 * BG removal is skipped (tile / environment_prop / HD style). Mirrors the
 * fetch-and-verify pattern from bg-remove.ts but wraps failures as
 * ImageProcessingError (the failure mode is "couldn't load the image for
 * downstream processing", not "BG removal broke").
 */
async function fetchImageUrlAsBuffer(url: string): Promise<Buffer> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  const truncated = url.slice(0, URL_LOG_TRUNCATE);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      throw new ImageProcessingError(
        `fetch returned ${response.status}${response.statusText ? " " + response.statusText : ""}`,
        {
          context: { url: truncated, status: response.status },
        }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (buffer.length === 0) {
      throw new ImageProcessingError("fetch returned empty body", {
        context: { url: truncated },
      });
    }

    return buffer;
  } catch (cause) {
    if (cause instanceof ImageProcessingError) throw cause;
    if (cause instanceof Error && cause.name === "AbortError") {
      throw new ImageProcessingError(
        `fetch timeout after ${FETCH_TIMEOUT_MS}ms`,
        {
          context: { url: truncated, timeoutMs: FETCH_TIMEOUT_MS },
        }
      );
    }
    throw new ImageProcessingError("fetch failed", {
      cause,
      context: { url: truncated },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

// ─── Main: runPipeline ────────────────────────────────────────────────────

export async function runPipeline(
  request: GenerateRequest
): Promise<GenerateResult> {
  const t0 = Date.now();
  const {
    requestId,
    userId,
    projectId,
    rawInput,
    categoryId,
    styleId,
    enhance = false,
    creditsToDeduct,
  } = request;

  const log = childLogger({
    requestId,
    userId,
    projectId,
    component: "pipeline",
  });

  log.debug("pipeline start", {
    rawInputPreview: rawInput.slice(0, 80),
    categoryId,
    styleId,
    enhance,
    creditsToDeduct,
  });

  // ─── STEP 1: validation (pre-credit-deduction) ─────────────────────────
  const s1 = Date.now();
  assertValidRequest(request);
  // Post-validation: both IDs are known. Load configs (throws handled below).
  const categoryCfg = getCategoryConfig(request.categoryId as CategoryId);
  const styleCfg = getStyleConfig(request.styleId as StyleId);
  log.debug("step 1 done", {
    step: 1,
    name: "validation",
    durationMs: Date.now() - s1,
  });

  // ─── STEP 2: prompt composition (pre-credit-deduction) ─────────────────
  const s2 = Date.now();
  const composed = await composePrompt({
    rawInput,
    categoryId,
    styleId,
    enhance,
  });
  log.debug("step 2 done", {
    step: 2,
    name: "prompt_composition",
    durationMs: Date.now() - s2,
    translated: !!composed.trail.translated,
    enhanced: !!composed.trail.enhanced,
  });

  // ─── STEP 3: credit reservation ─────────────────────────────────────────
  // Success here = deduction committed. Any step 4+ recoverable failure
  // triggers refund in the catch below.
  const s3 = Date.now();
  const reservation = await reserveCredits({ userId, amount: creditsToDeduct });
  log.debug("step 3 done", {
    step: 3,
    name: "credit_reservation",
    durationMs: Date.now() - s3,
    balanceAfter: reservation.balanceAfter,
  });

  // ─── STEPS 4–12: refund-on-recoverable block ───────────────────────────
  try {
    // ─── STEP 4: raw generation ──────────────────────────────────────────
    const s4 = Date.now();
    const seed = Math.floor(Math.random() * 1e9);
    const { steps, cfgScale } = modelDefaults(styleCfg.model);
    const inferResult = await runware.inferImage({
      prompt: composed.prompt,
      negativePrompt: composed.negativePrompt,
      width: styleCfg.defaultSize.width,
      height: styleCfg.defaultSize.height,
      model: styleCfg.model,
      steps,
      cfgScale,
      seed,
      numberResults: 1,
      lora: styleCfg.lora
        ? [{ id: styleCfg.lora.id, weight: styleCfg.lora.weight }]
        : undefined,
    });
    const firstImage = inferResult.images[0];
    log.debug("step 4 done", {
      step: 4,
      name: "raw_generation",
      durationMs: Date.now() - s4,
      taskUUID: firstImage.taskUUID,
      model: styleCfg.model,
    });

    // ─── STEP 5: background removal (conditional) ────────────────────────
    // Skip for tile (full edge-to-edge coverage needed) and
    // environment_prop (natural grounding); always skip when style says so.
    // On skip we still need a Buffer for step 6 → direct URL fetch.
    const s5 = Date.now();
    const shouldBgRemove = styleCfg.bgRemoval && categoryCfg.needsBgRemoval;
    let postBgBuffer: Buffer;
    if (shouldBgRemove) {
      const r = await removeBackgroundToBuffer(firstImage.url);
      postBgBuffer = r.buffer;
    } else {
      postBgBuffer = await fetchImageUrlAsBuffer(firstImage.url);
    }
    log.debug("step 5 done", {
      step: 5,
      name: "background_removal",
      durationMs: Date.now() - s5,
      skipped: !shouldBgRemove,
    });

    // ─── STEP 6: pixelate (NN downsample to style's default pixel size) ──
    const s6 = Date.now();
    const pixelatedBuffer = await pixelate(
      postBgBuffer,
      styleCfg.defaultSize.width
    );
    log.debug("step 6 done", {
      step: 6,
      name: "pixelate",
      durationMs: Date.now() - s6,
      targetSize: styleCfg.defaultSize.width,
    });

    // ─── STEP 7: palette quantization (branch on palette.kind) ───────────
    const s7 = Date.now();
    let quantizedBuffer: Buffer;
    let paletteForReturn: string[];
    let paletteForDb: string[] | null;
    let paletteSource: string | null;

    const paletteSpec = styleCfg.palette;
    switch (paletteSpec.kind) {
      case "derived": {
        const r = await quantizeDerived(pixelatedBuffer, paletteSpec.targetColors);
        quantizedBuffer = r.buffer;
        paletteForReturn = r.palette;
        paletteForDb = r.palette;
        paletteSource = "derived";
        break;
      }
      case "forced": {
        const fixedPalette = paletteSpec.colors as readonly string[];
        quantizedBuffer = await quantizeForced(
          pixelatedBuffer,
          fixedPalette as string[]
        );
        paletteForReturn = fixedPalette as string[];
        paletteForDb = fixedPalette as string[];
        paletteSource = "forced";
        break;
      }
      case "user":
        throw new ImageProcessingError(
          "user-supplied palette is not supported in module 2",
          { context: { styleId, kind: "user" } }
        );
      case "none":
        quantizedBuffer = pixelatedBuffer;
        paletteForReturn = [];
        paletteForDb = null;
        paletteSource = null;
        break;
    }
    log.debug("step 7 done", {
      step: 7,
      name: "quantize",
      durationMs: Date.now() - s7,
      paletteSource,
      colorCount: paletteForReturn.length,
    });

    // ─── STEP 8: tileability check (tile category only) ──────────────────
    const s8 = Date.now();
    let tileable: boolean | undefined;
    if (categoryCfg.needsTileabilityCheck) {
      const r = await checkTileability(quantizedBuffer);
      tileable = r.tileable;
      if (!tileable) {
        log.warn("tileability below threshold (module-2 policy: persist + continue, no retry)", {
          leftRightMismatchPct: r.leftRightMismatchPct,
          topBottomMismatchPct: r.topBottomMismatchPct,
        });
      }
      log.debug("step 8 done", {
        step: 8,
        name: "tileability",
        durationMs: Date.now() - s8,
        tileable,
      });
    } else {
      log.debug("step 8 skipped (non-tile category)", { step: 8 });
    }

    // ─── STEP 9: normal map — SKIPPED in module 2 (see module 9) ─────────

    // ─── STEP 10: display upscale (NN → 1024²) ──────────────────────────
    const s10 = Date.now();
    const displayBuffer = await upscaleForDisplay(quantizedBuffer, 1024);
    log.debug("step 10 done", {
      step: 10,
      name: "display_upscale",
      durationMs: Date.now() - s10,
    });

    // ─── STEP 11: R2 uploads (canonical + display) ───────────────────────
    const s11 = Date.now();
    const assetId = randomUUID();
    const imageKey = buildAssetKey({ userId, projectId, assetId });
    const displayKey = buildDisplayKey({ userId, projectId, assetId });

    // Parallel upload — two independent objects, no ordering dependency.
    // If either fails, throw StorageError. No pre-emptive cleanup of the
    // succeeded upload: orphan-cleanup cron (future) handles it per
    // PersistenceError JSDoc.
    const [imageUpload, displayUpload] = await Promise.all([
      uploadBufferToR2(quantizedBuffer, imageKey, "image/png"),
      uploadBufferToR2(displayBuffer, displayKey, "image/png"),
    ]);

    if (!imageUpload.success || !displayUpload.success) {
      const failures: string[] = [];
      if (!imageUpload.success) failures.push(`image: ${imageUpload.error ?? "unknown"}`);
      if (!displayUpload.success) failures.push(`display: ${displayUpload.error ?? "unknown"}`);
      throw new StorageError(`R2 upload failed — ${failures.join("; ")}`, {
        context: {
          imageKey,
          displayKey,
          imageError: imageUpload.error,
          displayError: displayUpload.error,
          imageUploadOk: imageUpload.success,
          displayUploadOk: displayUpload.success,
        },
      });
    }
    log.debug("step 11 done", {
      step: 11,
      name: "storage",
      durationMs: Date.now() - s11,
      imageKey,
      displayKey,
    });

    // ─── STEP 12: persistence ───────────────────────────────────────────
    const s12 = Date.now();
    const pivot = pivotForCategory(request.categoryId as CategoryId);

    let asset;
    try {
      asset = await prisma.asset.create({
        data: {
          id: assetId,
          userId,
          projectId,
          folderId: null,

          categoryId,
          subcategoryId: null,
          styleId,

          rawPrompt: composed.trail.rawInput,
          translatedPrompt: composed.trail.translated ?? null,
          enhancedPrompt: composed.trail.enhanced ?? null,
          composedPrompt: composed.prompt,
          negativePrompt:
            composed.negativePrompt.length > 0 ? composed.negativePrompt : null,

          model: styleCfg.model,
          qualityTier: "standard",
          seed,
          loraId: styleCfg.lora?.id != null ? String(styleCfg.lora.id) : null,
          loraWeight: styleCfg.lora?.weight ?? null,

          width: styleCfg.defaultSize.width,
          height: styleCfg.defaultSize.height,
          imageKey,
          displayKey,
          normalMapKey: null,
          legacyImageUrl: null,
          transparentBg: true,

          // Nullable Json column — Prisma.DbNull stores SQL NULL (distinct
          // from Prisma.JsonNull which stores the JSON-null value).
          palette: paletteForDb !== null
            ? (paletteForDb as Prisma.InputJsonValue)
            : Prisma.DbNull,
          paletteSource,

          pivotX: pivot.x,
          pivotY: pivot.y,

          tileable: tileable ?? null,

          hasNormalMap: false,

          sourceAssetId: null,
          setId: null,
          setKind: null,
          setRole: null,

          creditsUsed: creditsToDeduct,
          isPublic: false,
          likes: 0,

          legacy: false,
          legacyGenerationId: null,
        },
      });
    } catch (cause) {
      // R2 objects are uploaded; the row is not. PersistenceError.context
      // MUST include the R2 keys so orphan-cleanup can reclaim them later.
      throw new PersistenceError("prisma.asset.create failed", {
        cause,
        context: {
          imageKey,
          displayKey,
          assetId,
        },
      });
    }

    // Log-only taskUUID correlation (decision: no DB column in module 2;
    // FOLLOWUP tracks the schema-migration upgrade path).
    log.info("step 12 done", {
      step: 12,
      name: "persistence",
      durationMs: Date.now() - s12,
      assetId: asset.id,
      taskUUID: firstImage.taskUUID,
    });

    // ─── STEP 13: response assembly ─────────────────────────────────────
    const durationMs = Date.now() - t0;
    log.info("pipeline done", {
      assetId: asset.id,
      durationMs,
      model: styleCfg.model,
      paletteSource,
      tileable,
    });

    return {
      assetId: asset.id,
      imageKey,
      displayKey,
      palette: paletteForReturn,
      seed,
      tileable,
      trail: composed.trail,
      durationMs,
    };
  } catch (err) {
    // Refund only when the error is a recoverable pipeline error (credits
    // were already deducted at step 3). Unknown errors propagate without
    // a refund attempt — they may or may not have involved a commit; the
    // InsufficientCreditsError / CreditDeductionError split handles the
    // credit-state-uncertain case already at step 3.
    if (isPipelineError(err) && err.recoverable) {
      await refundReservedCredits({
        userId,
        amount: creditsToDeduct,
        reason: `pipeline_failure_${err.step}`,
      });
    }

    // Structured error log, then rethrow untouched for the API route.
    if (isPipelineError(err)) {
      log.error("pipeline failed", toLogContext(err));
    } else {
      log.error("pipeline failed (non-pipeline error)", { err });
    }
    throw err;
  }
}
