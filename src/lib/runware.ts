import { canSpend, recordProviderCall } from "@/lib/billing/ledger";
import { PRICE } from "@/lib/billing/features";
import { canStartOptionalPass, MAX_PASS_MS, passTimeoutMs } from "@/lib/services/animation-budget";
import { Runware } from "@runware/sdk-js";
import { cloudflareAiConfigured, generateWithCloudflare } from "./cloudflare-ai";

// ===========================================
// RUNWARE API CLIENT
// ===========================================

let runwareInstance: InstanceType<typeof Runware> | null = null;
let isConnected = false;

export async function getRunwareClient(): Promise<InstanceType<typeof Runware>> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) {
    console.error("[Runware] RUNWARE_API_KEY environment variable is not set!");
    throw new Error("Image generation service is temporarily unavailable. Please try again later.");
  }

  // Create new instance if needed
  if (!runwareInstance) {
    console.log("[Runware] Creating new client instance...");
    runwareInstance = new Runware({ apiKey });
    isConnected = false;
  }

  // Ensure connection is established
  if (!isConnected) {
    try {
      console.log("[Runware] Ensuring connection...");
      await runwareInstance.ensureConnection();
      isConnected = true;
      console.log("[Runware] ✅ Connected successfully");
    } catch (connError) {
      console.error("[Runware] ❌ Connection failed:", connError);
      // Reset instance to try fresh on next attempt
      runwareInstance = null;
      isConnected = false;
      throw new Error(`Failed to connect to Runware: ${connError instanceof Error ? connError.message : String(connError)}`);
    }
  }

  return runwareInstance;
}

// ===========================================
// TIMEOUTS
// ===========================================
// Provider calls must finish well before the calling route's maxDuration so
// the route still has time to refund credits on failure.
export const RUNWARE_INFERENCE_TIMEOUT_MS = 75_000;
export const RUNWARE_UPSCALE_TIMEOUT_MS = 90_000;

export function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

// Reset connection (useful for error recovery)
export function resetRunwareConnection(): void {
  if (runwareInstance) {
    try {
      runwareInstance.disconnect();
    } catch {
      // Ignore disconnect errors
    }
  }
  runwareInstance = null;
  isConnected = false;
  console.log("[Runware] Connection reset");
}

// ===========================================
// MODEL CONFIGURATION BY TIER
// ===========================================

export type UserTier = "free" | "starter" | "pro" | "lifetime";

// Model AIR identifiers from Runware
// Format: "provider:model_id@version" or direct model name
// See: https://runware.ai/docs/en/image-inference/text-to-image
//
// 🎮 MODEL QUALITY RANKING:
// FLUX Pro    → 🥇 Best (details, lighting, textures)
// FLUX Dev    → 🥈 Very good (90-95% of Pro quality)
// FLUX Schnell → 🥉 Good (simpler, smoother, less detail)
//
// For pixel art/detailed styles → Use Dev (every pixel matters!)
// For cartoon/vector → Schnell OK (simpler styles)
export const RUNWARE_MODELS = {
  // Tier 3 - Free/Budget (fast, cheap, 4 steps)
  "flux-schnell": "runware:100@1", // FLUX.1 [schnell] - 2-3 sec, simple styles OK

  // Tier 2 - Starter (quality, 20-28 steps)
  "flux-dev": "runware:101@1", // FLUX.1 [dev] - 8-15 sec, great for pixel art

  // Tier 1 - Pro/Lifetime (BEST quality!)
  // BFL AIR IDs: bfl:2@1 = FLUX.1.1 Pro, bfl:2@2 = FLUX.1.1 Pro Ultra
  // bfl:6@1 = FLUX.2 [flex], bfl:7@1 = FLUX.2 [max]
  "flux-pro": "bfl:2@1", // FLUX.1.1 Pro - najlepsza jakość, detale, tekstury
} as const;

export type RunwareModelId = keyof typeof RUNWARE_MODELS;

// Model selection by user tier
export const TIER_MODELS: Record<UserTier, RunwareModelId[]> = {
  free: ["flux-schnell"],
  starter: ["flux-dev", "flux-schnell"],
  pro: ["flux-pro", "flux-dev", "flux-schnell"],
  lifetime: ["flux-pro", "flux-dev", "flux-schnell"],
};

// Default model per tier
export const DEFAULT_MODEL: Record<UserTier, RunwareModelId> = {
  free: "flux-schnell",
  starter: "flux-dev",
  pro: "flux-pro",      // 🔥 FLUX.1.1 Pro - najlepsza jakość!
  lifetime: "flux-pro", // 🔥 FLUX.1.1 Pro - najlepsza jakość!
};

// Model costs (approximate USD per image)
export const MODEL_COSTS: Record<RunwareModelId, number> = {
  "flux-schnell": 0.003,  // ~$0.003 per image (4 steps)
  "flux-dev": 0.01,       // ~$0.01 per image
  "flux-pro": 0.03,       // ~$0.03 per image (premium quality)
};

// ===========================================
// IMAGE GENERATION
// ===========================================

export interface GenerateImageOptions {
  prompt: string;
  negativePrompt?: string;
  model?: RunwareModelId;
  width?: number;
  height?: number;
  seed?: number;
  steps?: number;
  guidance?: number;
  numberOfImages?: number;
  /**
   * Optional LoRA stack to apply at inference. Each entry has an AIR
   * identifier (Runware Asset ID) and a weight 0-2.
   *
   * Examples of AIR formats Runware accepts:
   *   - Civitai: "civitai:12345@67890"  (model id @ version id)
   *   - Runware-hosted user LoRA: "runware:USER_ID/lora-name@v1"
   *
   * Used by SpriteLab to (a) apply public Civitai LoRAs that match a
   * given style picker entry, and (b) apply our own custom-trained
   * LoRAs once they exist (see docs/CUSTOM_MODEL.md).
   */
  loras?: Array<{ model: string; weight: number }>;
}

export interface GeneratedImage {
  imageURL: string;
  seed: number;
  model: string;
  cost: number;
}

export async function generateImage(
  options: GenerateImageOptions,
  userTier: UserTier = "free"
): Promise<{ success: boolean; images?: GeneratedImage[]; error?: string }> {
  try {
    const runware = await getRunwareClient();

    // Select model based on tier
    let modelId = options.model || DEFAULT_MODEL[userTier];

    // Verify user has access to this model
    const allowedModels = TIER_MODELS[userTier];
    if (!allowedModels.includes(modelId)) {
      console.log(`[Runware] Model ${modelId} not allowed for tier ${userTier}, using default`);
      modelId = DEFAULT_MODEL[userTier];
    }

    const modelAIR = RUNWARE_MODELS[modelId];
    const cost = MODEL_COSTS[modelId];

    // 🔥 FLUX OPTIMIZATION: Limit by WORDS (optimal: 50-80, max: 100)
    const MAX_PROMPT_WORDS = 100;

    let safePrompt = options.prompt;
    const promptWords = safePrompt.split(/\s+/);

    if (promptWords.length > MAX_PROMPT_WORDS) {
      console.log(`[Runware] ⚠️ PROMPT TOO LONG (${promptWords.length} words), limiting to ${MAX_PROMPT_WORDS}`);
      safePrompt = promptWords.slice(0, MAX_PROMPT_WORDS).join(" ");
    }

    // Final character check (Runware hard limit: 3000)
    if (safePrompt.length > 2900) {
      console.log(`[Runware] ⚠️ Still too many chars (${safePrompt.length}), hard truncating`);
      safePrompt = safePrompt.substring(0, 2900);
      const lastSpace = safePrompt.lastIndexOf(" ");
      if (lastSpace > 2700) safePrompt = safePrompt.substring(0, lastSpace);
    }

    const finalWordCount = safePrompt.split(/\s+/).length;
    console.log(`[Runware] 🚀 Generating with ${modelId} (AIR: ${modelAIR})`);
    console.log(`[Runware] Prompt: ${finalWordCount} words, ${safePrompt.length} chars`);
    console.log(`[Runware] Preview: ${safePrompt.substring(0, 80)}...`);

    // Runware SDK and FLUX both support negativePrompt — earlier code dropped
    // it because of a stale comment claiming the API did not. Without it the
    // style-specific negatives ("no anti-aliasing", "no 3/4 angle") and view
    // negatives are computed all the way through the pipeline and thrown
    // away. Passing it through is the single biggest leverage on FLUX
    // following the user's intent.
    let safeNegative = options.negativePrompt;
    if (safeNegative && safeNegative.length > 1900) {
      const trimmed = safeNegative.substring(0, 1900);
      const lastSpace = trimmed.lastIndexOf(" ");
      safeNegative = lastSpace > 1700 ? trimmed.substring(0, lastSpace) : trimmed;
    }

    // Sanitize LoRA stack — drop entries without a model id and clamp
    // weights into the safe 0-2 range. Without this a typo in a style
    // config could send `weight: NaN` and Runware would 400 the call.
    const safeLoras = (options.loras ?? [])
      .filter((l) => typeof l.model === "string" && l.model.length > 0)
      .map((l) => ({
        model: l.model,
        weight: Math.max(0, Math.min(2, Number.isFinite(l.weight) ? l.weight : 1)),
      }));

    if (safeLoras.length > 0) {
      console.log(`[Runware] 🎨 Applying ${safeLoras.length} LoRA(s):`, safeLoras.map((l) => `${l.model}@${l.weight}`).join(", "));
    }

    // FLUX-optimized defaults: guidance 2-4, steps 20-28
    const taskUUID = crypto.randomUUID();
    const started = Date.now();
    const listPrice = cost * (options.numberOfImages || 1);
    const result = await withTimeout(runware.imageInference({
      positivePrompt: safePrompt,
      negativePrompt: safeNegative || undefined,
      model: modelAIR,
      width: options.width || 1024,
      height: options.height || 1024,
      seed: options.seed,
      steps: options.steps || 25,           // FLUX optimal: 20-28
      CFGScale: options.guidance || 3.5,    // FLUX optimal: 2-4 (NOT 7!)
      numberResults: options.numberOfImages || 1,
      outputType: "URL",
      outputFormat: "PNG",
      lora: safeLoras.length > 0 ? safeLoras : undefined,
      includeCost: true,
      customTaskUUID: taskUUID,
    }), RUNWARE_INFERENCE_TIMEOUT_MS, "Runware imageInference").catch((err: unknown) => {
      logRunware({ task: "image", model: modelAIR, size: options.width || 1024, started, taskUUID, listPrice, err: sdkError(err) });
      throw err;
    });
    logRunware({ task: "image", model: modelAIR, size: options.width || 1024, started, taskUUID, listPrice, reported: reportedCost(result) });

    if (!result || result.length === 0) {
      return { success: false, error: "No images generated" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images: GeneratedImage[] = result.map((img: any) => ({
      imageURL: img.imageURL || img.imageUrl || String(img),
      seed: img.seed || options.seed || 0,
      model: modelId,
      cost,
    }));

    console.log(`[Runware] ✅ Generated ${images.length} image(s)`);

    return { success: true, images };
  } catch (error) {
    // Reset connection on error for fresh retry next time
    resetRunwareConnection();

    let errorMessage: string;

    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'object' && error !== null) {
      // Handle Runware API error objects - try multiple common fields
      const errObj = error as Record<string, unknown>;

      // Try to extract meaningful error message
      if (typeof errObj.message === 'string') {
        errorMessage = errObj.message;
      } else if (typeof errObj.error === 'string') {
        errorMessage = errObj.error;
      } else if (typeof errObj.errorMessage === 'string') {
        errorMessage = errObj.errorMessage;
      } else if (errObj.errors && Array.isArray(errObj.errors)) {
        errorMessage = errObj.errors.map((e: unknown) =>
          typeof e === 'string' ? e : JSON.stringify(e)
        ).join(', ');
      } else if (errObj.data && typeof errObj.data === 'object') {
        // Some APIs nest error in data field
        const dataObj = errObj.data as Record<string, unknown>;
        errorMessage = (dataObj.message as string) || (dataObj.error as string) || JSON.stringify(errObj.data);
      } else {
        // Last resort - stringify the whole object
        try {
          errorMessage = JSON.stringify(error, null, 0);
        } catch {
          errorMessage = "Unknown error object";
        }
      }
    } else {
      errorMessage = String(error);
    }

    console.error("[Runware] ❌ Error details:", {
      type: typeof error,
      isError: error instanceof Error,
      message: errorMessage,
      raw: error,
    });

    return {
      success: false,
      error: `Runware: ${errorMessage}`,
    };
  }
}

// ===========================================
// SPRITE GENERATION (instruction-following models)
// ===========================================
// The sprite pipeline uses newer models that follow plain instructions
// (see src/config/prompts/sprite-prompt.ts). They don't accept the FLUX.1
// knobs (steps / CFG / negative prompt / LoRA), so they go through the REST
// API with only the parameters every model supports.

export const SPRITE_MODELS = {
  // FLUX.2 [klein] 9B — ~$0.0008/image, good adherence, fast
  standard: { air: "runware:400@2", label: "FLUX.2 klein", approxCostUsd: 0.0008 },
  // GPT Image 1 Mini — ~$0.036/image, cleanest pixel art, best adherence
  hd: { air: "openai:1@2", label: "GPT Image Mini", approxCostUsd: 0.036 },
} as const;

export type SpriteModelKey = keyof typeof SPRITE_MODELS;

export interface SpriteImageResult {
  image: Buffer;
  seed: number;
  model: string;
  cost: number;
}

export async function generateSpriteImage(opts: {
  prompt: string;
  model: SpriteModelKey;
  seed?: number;
}): Promise<SpriteImageResult> {
  try {
    return await generateSpriteImageRunware(opts);
  } catch (err) {
    // Runware down or out of prepaid balance → free Cloudflare fallback so
    // users still get their sprite (post-processing is identical).
    if (!cloudflareAiConfigured()) throw err;
    console.warn("[Sprite] Runware failed, using Cloudflare Workers AI:", err instanceof Error ? err.message : err);
    const seed = opts.seed ?? Math.floor(Math.random() * 2_147_483_647);
    const cf = await generateWithCloudflare({ prompt: opts.prompt, hd: opts.model === "hd", seed });
    return { image: cf.image, seed, model: cf.model, cost: 0 };
  }
}

async function generateSpriteImageRunware(opts: {
  prompt: string;
  model: SpriteModelKey;
  seed?: number;
}): Promise<SpriteImageResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) throw new Error("RUNWARE_API_KEY is not set");
  const spec = SPRITE_MODELS[opts.model];

  const taskUUID = crypto.randomUUID();
  const started = Date.now();
  let reported: number | null = null;
  const task: Record<string, unknown> = {
    taskType: "imageInference",
    taskUUID,
    model: spec.air,
    positivePrompt: opts.prompt.slice(0, 2900),
    width: 1024,
    height: 1024,
    numberResults: 1,
    outputType: "URL",
    outputFormat: "PNG",
    includeCost: true,
  };
  // Only FLUX-family checkpoints on Runware accept a seed
  if (opts.model === "standard" && Number.isSafeInteger(opts.seed) && opts.seed! >= 1) task.seed = opts.seed;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RUNWARE_INFERENCE_TIMEOUT_MS);
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify([task]),
      signal: controller.signal,
    });
    // A gateway error page (HTML) must surface as a provider error, not a SyntaxError
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{ imageURL: string; seed?: number; cost?: number }>;
      errors?: Array<{ code?: string; message?: string }>;
    };
    if (json.errors?.length || !json.data?.[0]?.imageURL) {
      const e = json.errors?.[0];
      throw new Error(`Runware ${e?.code ?? res.status}: ${e?.message ?? "no image returned"}`);
    }
    const item = json.data[0];
    reported = typeof item.cost === "number" ? item.cost : null;
    const imgRes = await fetch(item.imageURL, { signal: controller.signal });
    if (!imgRes.ok) throw new Error(`Runware image download failed (${imgRes.status})`);
    const image = Buffer.from(await imgRes.arrayBuffer());
    logRunware({ task: opts.model === "hd" ? "sprite_hd" : "sprite", model: spec.air, size: 1024, started, taskUUID, listPrice: spec.approxCostUsd, reported });
    return {
      image,
      seed: item.seed ?? opts.seed ?? 0,
      model: spec.air,
      cost: reported ?? spec.approxCostUsd,
    };
  } catch (err) {
    logRunware({ task: opts.model === "hd" ? "sprite_hd" : "sprite", model: spec.air, size: 1024, started, taskUUID, listPrice: spec.approxCostUsd, reported, err });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ===========================================
// ANIMATION FRAMES (reference-image edit model)
// ===========================================
// Nano Banana 2 keeps a character's design consistent across poses when given
// the sprite as a reference — tested to produce clean 2×2 frame grids.
export const ANIMATION_MODEL = { air: "google:4@3", approxCostUsd: 0.07 } as const;

/** List price of one Nano Banana pass by size (as seen in Runware responses). */
const gridPrice = (size?: number) => ((size ?? 1024) > 1024 ? PRICE.grid2048 : PRICE.grid1024);

/**
 * Ledger row for one Runware call. Explicit API errors are recorded with no
 * estimated cost (no image came back); timeouts / dropped connections keep
 * the full list price because the task may have run anyway. Reconciliation
 * against Runware's usage counter shows whether that assumption holds.
 */
function logRunware(o: { task: string; model: string; size?: number | string; started: number; taskUUID: string; listPrice: number; reported?: number | null; err?: unknown }) {
  const msg = o.err instanceof Error ? o.err.message : o.err ? String(o.err) : undefined;
  const timeout = !!msg && /abort|timeout|timed out|ECONNRESET|fetch failed|socket/i.test(msg);
  const moderated = !!msg && /invalidProviderContent|moderation|flagged/i.test(msg);
  const providerError = !!msg && /^Runware /.test(msg) && !/download failed/.test(msg);
  recordProviderCall({
    provider: "runware",
    model: o.model,
    task: o.task,
    size: o.size ? String(o.size) : undefined,
    outcome: !msg ? "ok" : timeout ? "timeout" : moderated ? "moderated" : "error",
    costUsd: o.reported ?? null,
    estCostUsd: msg && providerError && !timeout ? 0 : o.listPrice,
    latencyMs: Date.now() - o.started,
    providerTaskId: o.taskUUID,
    error: msg,
  });
}

/**
 * Runware SDK rejections are plain objects, not Errors: give them the
 * "Runware <code>: <message>" shape logRunware treats as an explicit API error.
 */
function sdkError(err: unknown): unknown {
  if (err instanceof Error || !err || typeof err !== "object") return err;
  const e = err as { errors?: Array<{ code?: string; message?: string }>; error?: unknown; code?: string; message?: string };
  const nested = typeof e.error === "object" && e.error ? (e.error as { code?: string; message?: string }) : undefined;
  const first = e.errors?.[0] ?? nested;
  const code = first?.code ?? e.code ?? "error";
  let message = first?.message ?? e.message ?? (typeof e.error === "string" ? e.error : undefined);
  if (!message) {
    try { message = JSON.stringify(err).slice(0, 300); } catch { message = "unknown error"; }
  }
  return new Error(`Runware ${code}: ${message}`);
}

/** Sum of the cost fields Runware returns with includeCost (null when none). */
function reportedCost(result: unknown): number | null {
  const items = (Array.isArray(result) ? result : [result]) as Array<{ cost?: unknown } | null | undefined>;
  const costs = items.map((i) => i?.cost).filter((c): c is number => typeof c === "number" && Number.isFinite(c));
  return costs.length ? costs.reduce((a, c) => a + c, 0) : null;
}

type AnimationGridOpts = {
  prompt: string;
  /** PNG of the source sprite on a white background */
  reference: Buffer;
  /** Square canvas side - the model only accepts 1024 or 2048 for square output. */
  size?: 1024 | 2048;
  /**
   * Epoch ms by which the call (and a moderation retry) must be done — see
   * animation-budget.ts. Without it a call may take up to MAX_PASS_MS.
   */
  deadline?: number;
};

/**
 * Google's moderation sometimes rejects harmless game art (a "slime monster",
 * "acid spit"). One retry framed explicitly as cartoon game art usually passes.
 */
export async function generateAnimationGrid(opts: AnimationGridOpts): Promise<{ image: Buffer; cost: number }> {
  try {
    return await generateAnimationGridOnce(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!/invalidProviderContent|moderation|flagged/i.test(msg)) throw err;
    if (!canSpend(gridPrice(opts.size))) throw err;
    // A retry that can't finish before the route limit would only get the function killed
    if (opts.deadline !== undefined && !canStartOptionalPass(opts.deadline, opts.size ?? 1024)) throw err;
    console.warn("[Runware] Animation grid flagged by provider moderation - retrying as cartoon game art");
    return generateAnimationGridOnce({
      ...opts,
      prompt: `Harmless, family-friendly cartoon video game sprite sheet for an indie game, no gore, no realistic violence.\n${opts.prompt}`,
    });
  }
}

async function generateAnimationGridOnce(opts: AnimationGridOpts): Promise<{ image: Buffer; cost: number }> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) throw new Error("RUNWARE_API_KEY is not set");
  const controller = new AbortController();
  // 2K sheets take noticeably longer than single sprites; never past the request's deadline
  const timeoutMs = opts.deadline !== undefined ? passTimeoutMs(opts.deadline) : MAX_PASS_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const taskUUID = crypto.randomUUID();
  const started = Date.now();
  let reported: number | null = null;
  try {
    const res = await fetch("https://api.runware.ai/v1", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify([{
        taskType: "imageInference",
        taskUUID,
        model: ANIMATION_MODEL.air,
        positivePrompt: opts.prompt.slice(0, 2900),
        referenceImages: [`data:image/png;base64,${opts.reference.toString("base64")}`],
        width: opts.size ?? 1024,
        height: opts.size ?? 1024,
        numberResults: 1,
        outputType: "URL",
        outputFormat: "PNG",
        includeCost: true,
      }]),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as {
      data?: Array<{ imageURL: string; cost?: number }>;
      errors?: Array<{ code?: string; message?: string }>;
    };
    if (json.errors?.length || !json.data?.[0]?.imageURL) {
      const e = json.errors?.[0];
      throw new Error(`Runware ${e?.code ?? res.status}: ${e?.message ?? "no image returned"}`);
    }
    reported = typeof json.data[0].cost === "number" ? json.data[0].cost : null;
    const imgRes = await fetch(json.data[0].imageURL, { signal: controller.signal });
    if (!imgRes.ok) throw new Error(`Runware image download failed (${imgRes.status})`);
    const image = Buffer.from(await imgRes.arrayBuffer());
    logRunware({ task: "grid", model: ANIMATION_MODEL.air, size: opts.size ?? 1024, started, taskUUID, listPrice: gridPrice(opts.size), reported });
    return { image, cost: reported ?? gridPrice(opts.size) };
  } catch (err) {
    logRunware({ task: "grid", model: ANIMATION_MODEL.air, size: opts.size ?? 1024, started, taskUUID, listPrice: gridPrice(opts.size), reported, err });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// ===========================================
// UPSCALING
// ===========================================

export async function upscaleImage(
  imageUrl: string,
  upscaleFactor: number = 2
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] 🔍 Upscaling image ${upscaleFactor}x`);

    const taskUUID = crypto.randomUUID();
    const started = Date.now();
    const log = { task: "upscale", model: "runware-upscale", size: `${upscaleFactor}x`, started, taskUUID, listPrice: PRICE.upscale };
    const result = await withTimeout(runware.upscale({
      inputImage: imageUrl,
      upscaleFactor: upscaleFactor as 2 | 4,
      outputType: "URL",
      outputFormat: "PNG",
      includeCost: true,
      customTaskUUID: taskUUID,
    }), RUNWARE_UPSCALE_TIMEOUT_MS, "Runware upscale").catch((err: unknown) => {
      logRunware({ ...log, err: sdkError(err) });
      throw err;
    });
    logRunware({ ...log, reported: reportedCost(result) });

    // Handle result - can be single object or array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultAny = result as any;
    let upscaledUrl: string | null = null;

    if (Array.isArray(resultAny) && resultAny.length > 0) {
      upscaledUrl = resultAny[0].imageURL || resultAny[0].imageUrl || String(resultAny[0]);
    } else if (resultAny && typeof resultAny === "object") {
      upscaledUrl = resultAny.imageURL || resultAny.imageUrl || String(resultAny);
    }

    if (!upscaledUrl || !upscaledUrl.startsWith("http")) {
      return { success: false, error: "Upscale failed - no valid output URL" };
    }

    console.log(`[Runware] ✅ Upscaled successfully`);
    return { success: true, imageUrl: upscaledUrl };
  } catch (error) {
    console.error("[Runware] ❌ Upscale error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upscale failed",
    };
  }
}

// ===========================================
// BACKGROUND REMOVAL
// ===========================================

// Timeout for background removal (20 seconds - reduced for faster fallback)
const BG_REMOVAL_TIMEOUT = 20000;

export async function removeBackground(
  imageUrl: string,
  opts: { timeoutMs?: number } = {}
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] ✂️ Removing background...`);

    // Timeout so a hung socket can't stall the caller (timer is cleared on settle)
    const taskUUID = crypto.randomUUID();
    const started = Date.now();
    const log = { task: "remove_bg", model: "runware-remove-bg", started, taskUUID, listPrice: PRICE.removeBg };
    let result;
    try {
      result = await withTimeout(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (runware as any).removeBackground({
          inputImage: imageUrl,
          outputType: "URL",
          outputFormat: "PNG",
          includeCost: true,
          customTaskUUID: taskUUID,
        }) as Promise<unknown>,
        opts.timeoutMs ?? BG_REMOVAL_TIMEOUT,
        "Runware background removal"
      );
      logRunware({ ...log, reported: reportedCost(result) });
    } catch (innerError) {
      logRunware({ ...log, err: sdkError(innerError) });
      // Check for network errors - return gracefully instead of throwing
      const errorMsg = innerError instanceof Error ? innerError.message : String(innerError);
      if (errorMsg.includes("timeout") || errorMsg.includes("timed out") || errorMsg.includes("ENOTFOUND") ||
          errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ERR_NAME_NOT_RESOLVED") ||
          errorMsg.includes("fetch failed") || errorMsg.includes("network")) {
        console.log(`[Runware] ⚠️ Background removal network issue: ${errorMsg}`);
        return { success: false, error: `Network issue: ${errorMsg}` };
      }
      throw innerError;
    }

    // Handle result - can be single object or array
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultAny = result as any;
    let resultUrl: string | null = null;

    if (Array.isArray(resultAny) && resultAny.length > 0) {
      resultUrl = resultAny[0].imageURL || resultAny[0].imageUrl || String(resultAny[0]);
    } else if (resultAny && typeof resultAny === "object") {
      resultUrl = resultAny.imageURL || resultAny.imageUrl || String(resultAny);
    }

    if (!resultUrl || !resultUrl.startsWith("http")) {
      return { success: false, error: "Background removal failed - no valid output URL" };
    }

    console.log(`[Runware] ✅ Background removed successfully`);
    return { success: true, imageUrl: resultUrl };
  } catch (error) {
    console.error("[Runware] ❌ Background removal error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Background removal failed",
    };
  }
}


// ===========================================
// PROMPT ENHANCEMENT
// ===========================================

export async function enhancePrompt(
  prompt: string,
  maxLength: number = 300
): Promise<{ success: boolean; enhancedPrompt?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] ✨ Enhancing prompt`);

    const result = await withTimeout(runware.enhancePrompt({
      prompt,
      promptMaxLength: maxLength,
      promptVersions: 1,
    }), 20_000, "Runware enhancePrompt");

    if (!result || result.length === 0) {
      return { success: false, error: "Prompt enhancement failed" };
    }

    console.log(`[Runware] ✅ Prompt enhanced`);

    return { success: true, enhancedPrompt: result[0].text };
  } catch (error) {
    console.error("[Runware] ❌ Prompt enhancement error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Enhancement failed",
    };
  }
}

// ===========================================
// ST PACKS (admin-only beta) — expression edits, base stills, idle videos
// ===========================================
// Raw HTTP like the animation grid. Every call is logged to the ledger with
// an st_* task name; nobody is charged credits for these (the job row keeps
// the running cost instead).

type RunwareTaskError = { code?: string; message?: string; taskUUID?: string };
const RUNWARE_API = "https://api.runware.ai/v1";

function runwareKey(): string {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) throw new Error("RUNWARE_API_KEY is not set");
  return apiKey;
}

async function runwarePost(tasks: unknown[], signal?: AbortSignal): Promise<{ data?: Array<Record<string, unknown>>; errors?: RunwareTaskError[] }> {
  const res = await fetch(RUNWARE_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${runwareKey()}` },
    body: JSON.stringify(tasks),
    signal,
  });
  return (await res.json().catch(() => ({}))) as { data?: Array<Record<string, unknown>>; errors?: RunwareTaskError[] };
}

// Only the provider's content block — not a parameter list that happens to mention "safety"
const isModerationMessage = (msg: string) => /invalidProviderContent|moderat|flagged|nsfw/i.test(msg);

export interface StImageOpts {
  prompt: string;
  /** PNG; present for an expression edit, absent for a base still. */
  reference?: Buffer;
  width: number;
  height: number;
  task: "st_expression" | "st_base";
  /** List price for the ledger / caps. */
  listPrice: number;
  timeoutMs?: number;
  /** The same request framed as harmless art, tried once after a moderation block. */
  moderationRetryPrefix?: string;
}

async function stImageOnce(opts: StImageOpts): Promise<{ image: Buffer; cost: number }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 120_000);
  const taskUUID = crypto.randomUUID();
  const started = Date.now();
  let reported: number | null = null;
  const log = { task: opts.task, model: ANIMATION_MODEL.air, size: `${opts.width}x${opts.height}`, started, taskUUID, listPrice: opts.listPrice };
  try {
    const json = await runwarePost([{
      taskType: "imageInference",
      taskUUID,
      model: ANIMATION_MODEL.air,
      positivePrompt: opts.prompt.slice(0, 2900),
      ...(opts.reference ? { referenceImages: [`data:image/png;base64,${opts.reference.toString("base64")}`] } : {}),
      width: opts.width,
      height: opts.height,
      numberResults: 1,
      outputType: "URL",
      outputFormat: "PNG",
      includeCost: true,
    }], controller.signal);
    const first = json.data?.[0] as { imageURL?: string; cost?: number } | undefined;
    if (json.errors?.length || !first?.imageURL) {
      const e = json.errors?.[0];
      throw new Error(`Runware ${e?.code ?? "error"}: ${e?.message ?? "no image returned"}`);
    }
    reported = typeof first.cost === "number" ? first.cost : null;
    const imgRes = await fetch(first.imageURL, { signal: controller.signal });
    if (!imgRes.ok) throw new Error(`Runware image download failed (${imgRes.status})`);
    const image = Buffer.from(await imgRes.arrayBuffer());
    logRunware({ ...log, reported });
    return { image, cost: reported ?? opts.listPrice };
  } catch (err) {
    logRunware({ ...log, reported, err });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** Thrown when the provider moderation rejected the request (after the one retry). */
export class ProviderModerationError extends Error {
  constructor(message = "Blocked by provider moderation") {
    super(message);
    this.name = "ProviderModerationError";
  }
}

/** One Nano Banana still: an expression edit of `reference`, or a base when there is none. */
export async function generateStImage(opts: StImageOpts): Promise<{ image: Buffer; cost: number }> {
  try {
    return await stImageOnce(opts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!isModerationMessage(msg)) throw err;
    if (!opts.moderationRetryPrefix || !canSpend(opts.listPrice)) throw new ProviderModerationError();
    console.warn(`[Runware] ${opts.task} flagged by provider moderation - retrying as harmless character art`);
    try {
      return await stImageOnce({ ...opts, prompt: `${opts.moderationRetryPrefix}${opts.prompt}`, moderationRetryPrefix: undefined });
    } catch (again) {
      const m = again instanceof Error ? again.message : String(again);
      throw isModerationMessage(m) ? new ProviderModerationError() : again;
    }
  }
}

export interface StVideoSubmit {
  taskUUID: string;
  model: string;
  prompt: string;
  /** PNG still used as the first AND last frame, so the clip closes on itself. */
  still: Buffer;
  width: number;
  height: number;
  seconds: number;
  fps: number;
}

/**
 * Queue an idle clip (async delivery). The caller stores `taskUUID` before
 * calling, so a crash never submits the same clip twice. The ledger row is
 * written when the poll returns the result (that is when the cost is known).
 */
export async function submitStVideo(opts: StVideoSubmit): Promise<void> {
  const still = `data:image/png;base64,${opts.still.toString("base64")}`;
  const json = await runwarePost([{
    taskType: "videoInference",
    taskUUID: opts.taskUUID,
    model: opts.model,
    positivePrompt: opts.prompt.slice(0, 2900),
    width: opts.width,
    height: opts.height,
    duration: opts.seconds,
    fps: opts.fps,
    inputs: { frameImages: [{ image: still, frame: "first" }, { image: still, frame: "last" }] },
    outputFormat: "MP4",
    outputQuality: 95,
    deliveryMethod: "async",
    includeCost: true,
    numberResults: 1,
  }], AbortSignal.timeout(60_000));
  if (json.errors?.length) {
    const e = json.errors[0];
    const msg = `Runware ${e.code ?? "error"}: ${e.message ?? "video submit failed"}`;
    recordProviderCall({ provider: "runware", model: opts.model, task: "st_video", size: `${opts.width}x${opts.height}x${opts.seconds}s`, outcome: isModerationMessage(msg) ? "moderated" : "error", costUsd: null, estCostUsd: 0, latencyMs: 0, providerTaskId: opts.taskUUID, error: msg });
    throw isModerationMessage(msg) ? new ProviderModerationError() : new Error(msg);
  }
}

export type StVideoPoll =
  | { status: "processing"; progress?: number }
  | { status: "success"; videoURL: string; cost: number | null }
  | { status: "error"; message: string; moderated: boolean };

/** One getResponse poll; logs the ledger row once the task has finished either way. */
export async function pollStVideo(opts: { taskUUID: string; model: string; size: string; listPrice: number; startedAt: number }): Promise<StVideoPoll> {
  const json = await runwarePost([{ taskType: "getResponse", taskUUID: opts.taskUUID }], AbortSignal.timeout(30_000));
  const row = json.data?.find((d) => d.taskUUID === opts.taskUUID) ?? json.data?.[0];
  const err = json.errors?.find((e) => e.taskUUID === opts.taskUUID) ?? json.errors?.[0];
  if (err) {
    const message = `Runware ${err.code ?? "error"}: ${err.message ?? "video failed"}`;
    const moderated = isModerationMessage(message);
    recordProviderCall({ provider: "runware", model: opts.model, task: "st_video", size: opts.size, outcome: moderated ? "moderated" : "error", costUsd: null, estCostUsd: 0, latencyMs: Date.now() - opts.startedAt, providerTaskId: opts.taskUUID, error: message });
    return { status: "error", message, moderated };
  }
  const status = row?.status as string | undefined;
  const videoURL = row?.videoURL as string | undefined;
  if ((status === "success" || (!status && videoURL)) && videoURL) {
    const cost = typeof row?.cost === "number" ? (row.cost as number) : null;
    recordProviderCall({ provider: "runware", model: opts.model, task: "st_video", size: opts.size, outcome: "ok", costUsd: cost, estCostUsd: opts.listPrice, latencyMs: Date.now() - opts.startedAt, providerTaskId: opts.taskUUID });
    return { status: "success", videoURL, cost };
  }
  return { status: "processing", progress: typeof row?.progress === "number" ? (row.progress as number) : undefined };
}

/** Background removal of an in-memory PNG (ST Packs matte mode "runware"); null when it fails. */
export async function removeBackgroundBuffer(png: Buffer, timeoutMs = 20_000): Promise<Buffer | null> {
  const result = await removeBackground(`data:image/png;base64,${png.toString("base64")}`);
  if (!result.success || !result.imageUrl) return null;
  const res = await fetch(result.imageUrl, { signal: AbortSignal.timeout(timeoutMs) });
  return res.ok ? Buffer.from(await res.arrayBuffer()) : null;
}
