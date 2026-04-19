/**
 * Pipeline-shape types for Runware operations.
 *
 * Decoupled from the SDK's internal types (@runware/sdk-js v1.2.2) so the
 * module-2 pipeline has a stable, minimal surface:
 *   - Pipeline code programs against these types, not the SDK's 20+ optional
 *     fields.
 *   - SDK version bumps can't silently break pipeline type-checks — only
 *     the wrapper in ./client.ts (file #5) needs to adapt.
 *   - Naming follows JS camelCase (cfgScale vs SDK's CFGScale).
 *   - Runware model hashes stay out of pipeline code — friendly names
 *     (flux-schnell / flux-dev) are mapped at the wrapper boundary.
 *
 * ─── Normalisation choice: URL output everywhere ──────────────────────────
 *
 * The SDK returns image results in one of three shapes (URL /
 * base64 / dataURI) depending on `outputType`. The pipeline types commit
 * to URL output for both inference (step 4) and background removal (step 5).
 * The wrapper always requests `outputType: "URL"`.
 *
 * Reasons:
 *   - Smaller payloads over the Runware WebSocket (a 1024² PNG is ~1.5 MB
 *     as base64 per roundtrip; a URL is ~100 bytes).
 *   - Downstream steps (sharp in step 6) already need the pixels in memory;
 *     fetch-from-URL and base64-decode have equivalent cost from there.
 *   - Matches Runware dashboard/docs default behaviour.
 *
 * If a response lacks the expected URL, the wrapper throws RunwareError
 * or BackgroundRemovalError — the pipeline types guarantee URL presence,
 * so pipeline code never has to branch on delivery method.
 */

// ─── Step 4: raw generation ───────────────────────────────────────────────

/**
 * Friendly pipeline-level model names. The wrapper translates these to the
 * Runware model hashes declared in src/lib/runware.ts::RUNWARE_MODELS.
 */
export type ModelId = "flux-schnell" | "flux-dev";

/**
 * Single LoRA binding.
 *
 * `id` accepts both string (Civitai hash or Runware string id) and number
 * (some Runware-internal numeric ids) to match the SDK's ILora.model field.
 * Module 3 will populate these per-style after the LoRA test matrix.
 */
export interface LoRABinding {
  id: string | number;
  /** Typical range 0..2; style config decides the per-style value. */
  weight: number;
}

/**
 * Step 4 input: raw generation request. Consumed after prompt composition
 * (step 2) — `prompt` and `negativePrompt` are final, no further translate
 * or enhance below this layer.
 */
export interface ImageInferenceRequest {
  /** Composed positive prompt (post translate → enhance → category → style merge). */
  prompt: string;
  /** Composed negative prompt. Empty string if style has no negatives. */
  negativePrompt: string;
  /**
   * Raw FLUX output dimensions (pre-pixelation). MVP always passes 1024×1024;
   * kept as fields so non-square variants don't require a type change later.
   */
  width: number;
  height: number;
  model: ModelId;
  /** Sampler steps. Schnell default 4, Dev default 20. */
  steps: number;
  /** Classifier-free guidance scale. Schnell default 1.0, Dev default 3.5. */
  cfgScale: number;
  /** Deterministic seed. The pipeline always provides one; never random-at-SDK. */
  seed: number;
  /**
   * Number of variants to produce in this single call. MVP sends 1 every
   * time; the field is here so 2/4-variant support can drop in without
   * a type change.
   */
  numberResults: number;
  /** LoRA list. Empty array or undefined → no LoRA. Module 3 populates per style. */
  lora?: LoRABinding[];
}

/**
 * Step 4 output: raw FLUX images + their Runware task UUIDs.
 *
 * Every field is required on every element. If the SDK response has an
 * image missing `imageURL`, `seed`, or `taskUUID`, the wrapper throws
 * RunwareError rather than surfacing a degraded value — step 5 and step 12
 * (persistence) both depend on all three being present.
 *
 * `taskUUID` is carried through persistence for audit / refund correlation.
 */
export interface ImageInferenceResult {
  images: Array<{
    url: string;
    seed: number;
    taskUUID: string;
  }>;
}

// ─── Step 5: background removal ───────────────────────────────────────────

/**
 * Step 5 input: BG removal over the FLUX output from step 4.
 *
 * `imageInput` is a URL — the `url` field from ImageInferenceResult.images[i].
 * Base64 is deliberately not accepted at this boundary:
 *   - Simpler pipeline contract (one transport form end-to-end).
 *   - Matches Runware's preferred transport for 1024² images (URL-by-reference
 *     avoids pushing a MB of base64 through the WebSocket).
 */
export interface BackgroundRemovalRequest {
  /** URL of the image whose background should be removed. */
  imageInput: string;
  /** Only PNG is supported in MVP — alpha channel required for transparency. */
  outputFormat: "PNG";
}

/**
 * Step 5 output: single-shape, URL-only result.
 *
 * The wrapper always requests `outputType: "URL"` (see normalisation note at
 * top of file). If Runware's response lacks a URL, the wrapper throws
 * BackgroundRemovalError — pipeline code never branches on delivery method.
 */
export interface BackgroundRemovalResult {
  /** URL of the PNG with transparent background. */
  url: string;
  /** Runware task UUID — carried for audit correlation and refund log context. */
  taskUUID: string;
}

// ─── Module 4 stub: IP-Adapter ────────────────────────────────────────────

/**
 * IP-Adapter anchor-conditioning reference.
 *
 * @module 4 — placeholder type; NOT consumed by the module-2 pipeline.
 *
 * Module 4 (character sheets / animation packs / tile packs) will use this
 * to condition non-anchor frames on an anchor image generated first, for
 * visual coherence across a set. The wrapper (file #5) will expose an
 * IP-Adapter entry point that throws `"not implemented in module 2"` if
 * called before module 4 lands.
 *
 * SDK's IipAdapter requires `{ model, weight, guideImage }` — the `model`
 * (IP-Adapter model hash) is injected by the wrapper at call time; pipeline
 * callers only think in `{ imageInput, weight }` terms.
 */
export interface IPAdapterReference {
  /** URL or base64 data URI of the anchor image to condition on. */
  imageInput: string;
  /** Conditioning strength in 0..1. Wrapper defaults to 1.0 if not provided. */
  weight: number;
}
