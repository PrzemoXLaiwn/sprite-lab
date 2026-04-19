/**
 * Runware client adapter for the module-2 pipeline.
 *
 * Pipeline code imports from here — never from ../runware.ts directly.
 * This file is the single boundary where the pipeline's typed contract
 * (see ./types.ts) meets the Runware SDK's shape.
 *
 * ─── Delegation path: direct SDK access ───────────────────────────────────
 *
 * This wrapper calls `getRunwareClient().imageInference(...)` and
 * `getRunwareClient().removeBackground(...)` directly — it does NOT route
 * through the high-level `generateImage()` / `removeBackground()` helpers
 * in ../runware.ts.
 *
 * Reasons (each a non-starter for pipeline use):
 *   - Existing helpers return `{ success, images, error }` discriminated
 *     shapes; the pipeline wants typed PipelineError instances thrown.
 *   - `generateImage()` silently truncates prompts >100 words / >2900 chars.
 *     The composed prompt at step 4 must be final.
 *   - Tier gating in `generateImage()` belongs at step 1 (validation).
 *   - Timeout + network-error special-casing in `removeBackground()` doesn't
 *     compose cleanly with the pipeline's typed error wrapping.
 *
 * Things this wrapper DOES reuse from ../runware.ts:
 *   - `getRunwareClient()` — the connection singleton (no duplicate conn logic).
 *   - `RUNWARE_MODELS` — single source of truth for model hashes.
 */

import {
  getRunwareClient,
  RUNWARE_MODELS,
  type RunwareModelId,
} from "../runware";
import {
  RunwareError,
  BackgroundRemovalError,
} from "../pipeline/errors";
import { logger } from "../logger";
import type {
  ImageInferenceRequest,
  ImageInferenceResult,
  BackgroundRemovalRequest,
  BackgroundRemovalResult,
  IPAdapterReference,
} from "./types";

/**
 * BiRefNet General — the default high-quality BG-removal model on Runware.
 * Hash from https://runware.ai/docs/models/birefnet-general (AIR identifier).
 * If Runware changes their catalog, update here — it's the only reference
 * to a BG-removal model hash in the codebase.
 */
const BG_REMOVAL_MODEL = "runware:112@5";

/** Type narrowing for SDK errors that carry a Runware taskUUID. */
function extractSdkTaskUUID(err: unknown): string | undefined {
  if (err && typeof err === "object" && "taskUUID" in err) {
    const t = (err as { taskUUID: unknown }).taskUUID;
    if (typeof t === "string" && t.length > 0) return t;
  }
  return undefined;
}

// ─── inferImage (step 4) ──────────────────────────────────────────────────

async function inferImage(
  req: ImageInferenceRequest
): Promise<ImageInferenceResult> {
  const modelAIR = RUNWARE_MODELS[req.model as RunwareModelId];
  // `req.model` is already typed as ModelId = "flux-schnell" | "flux-dev",
  // both of which are keys of RUNWARE_MODELS — so modelAIR is never undefined
  // at runtime. The cast narrows from ModelId to RunwareModelId (same keys,
  // ModelId is the pipeline-facing subset without "flux-pro").

  const client = await getRunwareClient();

  const sdkRequest = {
    positivePrompt: req.prompt,
    negativePrompt: req.negativePrompt,
    model:          modelAIR,
    width:          req.width,
    height:         req.height,
    steps:          req.steps,
    CFGScale:       req.cfgScale,
    seed:           req.seed,
    numberResults:  req.numberResults,
    outputType:     "URL" as const,
    outputFormat:   "PNG" as const,
    lora:
      req.lora && req.lora.length > 0
        ? req.lora.map((l) => ({ model: l.id, weight: l.weight }))
        : undefined,
  };

  const t0 = Date.now();
  let sdkResult: Awaited<ReturnType<typeof client.imageInference>>;
  try {
    sdkResult = await client.imageInference(sdkRequest);
  } catch (cause) {
    const sdkTaskUUID = extractSdkTaskUUID(cause);
    throw new RunwareError("imageInference SDK call failed", {
      cause,
      context: {
        modelId: req.model,
        modelAIR,
        ...(sdkTaskUUID ? { taskUUID: sdkTaskUUID } : {}),
      },
    });
  }
  const durationMs = Date.now() - t0;

  if (!sdkResult || sdkResult.length === 0) {
    throw new RunwareError("imageInference returned empty result", {
      context: { modelId: req.model, modelAIR },
    });
  }

  // Validate every image has the three required fields the pipeline
  // guarantees downstream (step 5 needs url; step 12 needs taskUUID + seed).
  const images: ImageInferenceResult["images"] = [];
  for (let i = 0; i < sdkResult.length; i++) {
    const img = sdkResult[i];
    const missing: string[] = [];
    if (!img.taskUUID) missing.push("taskUUID");
    if (!img.imageURL) missing.push("imageURL");
    if (typeof img.seed !== "number") missing.push("seed");
    if (missing.length > 0) {
      throw new RunwareError(
        `imageInference image[${i}] missing required fields: ${missing.join(", ")}`,
        {
          context: {
            modelId: req.model,
            modelAIR,
            imageIndex: i,
            missingFields: missing,
            taskUUID: img.taskUUID,
          },
        }
      );
    }
    images.push({
      // Non-null assertions are safe here — each was validated above.
      url:      img.imageURL!,
      seed:     img.seed,
      taskUUID: img.taskUUID,
    });
  }

  logger.debug("runware.inferImage ok", {
    taskUUID: images[0].taskUUID,
    durationMs,
    model:    req.model,
    count:    images.length,
  });

  return { images };
}

// ─── removeBackground (step 5) ────────────────────────────────────────────

async function removeBackground(
  req: BackgroundRemovalRequest
): Promise<BackgroundRemovalResult> {
  const client = await getRunwareClient();

  const sdkRequest = {
    model:        BG_REMOVAL_MODEL,
    inputImage:   req.imageInput,
    outputType:   "URL" as const,
    outputFormat: req.outputFormat,
  };

  const t0 = Date.now();
  let sdkResult: Awaited<ReturnType<typeof client.removeBackground>>;
  try {
    sdkResult = await client.removeBackground(sdkRequest);
  } catch (cause) {
    const sdkTaskUUID = extractSdkTaskUUID(cause);
    throw new BackgroundRemovalError("removeBackground SDK call failed", {
      cause,
      context: {
        model: BG_REMOVAL_MODEL,
        ...(sdkTaskUUID ? { taskUUID: sdkTaskUUID } : {}),
      },
    });
  }
  const durationMs = Date.now() - t0;

  const missing: string[] = [];
  if (!sdkResult.taskUUID) missing.push("taskUUID");
  if (!sdkResult.imageURL) missing.push("imageURL");
  if (missing.length > 0) {
    throw new BackgroundRemovalError(
      `removeBackground response missing required fields: ${missing.join(", ")}`,
      {
        context: {
          model: BG_REMOVAL_MODEL,
          missingFields: missing,
          taskUUID: sdkResult.taskUUID,
        },
      }
    );
  }

  logger.debug("runware.removeBackground ok", {
    taskUUID: sdkResult.taskUUID,
    durationMs,
  });

  return {
    url:      sdkResult.imageURL!,
    taskUUID: sdkResult.taskUUID,
  };
}

// ─── inferImageWithIPAdapter (stub — module 4) ────────────────────────────

/**
 * Placeholder for IP-Adapter-conditioned inference. Not implemented in
 * module 2 — character sheets / animation packs / tile packs land in
 * module 4 and wire this method. Called in module 2 = programmer error,
 * so it throws a plain Error (NOT a PipelineError subclass) to distinguish
 * from pipeline runtime failures.
 */
async function inferImageWithIPAdapter(
  req: ImageInferenceRequest,
  adapter: IPAdapterReference
): Promise<ImageInferenceResult> {
  throw new Error(
    `IP-Adapter inference not implemented until module 4 ` +
      `(called with model=${req.model}, seed=${req.seed}, adapter.weight=${adapter.weight})`
  );
}

// ─── Public surface ───────────────────────────────────────────────────────

export const runware = {
  inferImage,
  removeBackground,
  inferImageWithIPAdapter,
} as const;
