import { Runware } from "@runware/sdk-js";

// ===========================================
// RUNWARE API CLIENT
// ===========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // FLUX-optimized defaults: guidance 2-4, steps 20-28
    // Note: Runware API does not support negativePrompt parameter
    const result = await runware.imageInference({
      positivePrompt: safePrompt,
      model: modelAIR,
      width: options.width || 1024,
      height: options.height || 1024,
      seed: options.seed,
      steps: options.steps || 25,           // FLUX optimal: 20-28
      CFGScale: options.guidance || 3.5,    // FLUX optimal: 2-4 (NOT 7!)
      numberResults: options.numberOfImages || 1,
      outputType: "URL",
      outputFormat: "PNG",
    });

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
// UPSCALING
// ===========================================

export async function upscaleImage(
  imageUrl: string,
  upscaleFactor: number = 2
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] 🔍 Upscaling image ${upscaleFactor}x`);

    const result = await runware.upscale({
      inputImage: imageUrl,
      upscaleFactor: upscaleFactor as 2 | 4,
      outputType: "URL",
      outputFormat: "PNG",
    });

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
  imageUrl: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] ✂️ Removing background...`);

    // Add timeout to prevent hanging on network issues
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Background removal timed out")), BG_REMOVAL_TIMEOUT);
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let result;
    try {
      result = await Promise.race([
        (runware as any).removeBackground({
          inputImage: imageUrl,
          outputType: "URL",
          outputFormat: "PNG",
        }),
        timeoutPromise
      ]);
    } catch (innerError) {
      // Check for network errors - return gracefully instead of throwing
      const errorMsg = innerError instanceof Error ? innerError.message : String(innerError);
      if (errorMsg.includes("timeout") || errorMsg.includes("ENOTFOUND") ||
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

    const result = await runware.enhancePrompt({
      prompt,
      promptMaxLength: maxLength,
      promptVersions: 1,
    });

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
