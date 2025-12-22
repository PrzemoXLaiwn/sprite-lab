import { Runware } from "@runware/sdk-js";

// ===========================================
// RUNWARE API CLIENT
// ===========================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let runwareInstance: InstanceType<typeof Runware> | null = null;

export async function getRunwareClient(): Promise<InstanceType<typeof Runware>> {
  if (!runwareInstance) {
    const apiKey = process.env.RUNWARE_API_KEY;
    if (!apiKey) {
      throw new Error("RUNWARE_API_KEY is not set");
    }
    runwareInstance = new Runware({ apiKey });
  }
  return runwareInstance;
}

// ===========================================
// MODEL CONFIGURATION BY TIER
// ===========================================

export type UserTier = "free" | "starter" | "pro" | "lifetime";

// Model AIR identifiers from Runware
// Format: "provider:model_id@version" or direct model name
// See: https://runware.ai/docs/en/image-inference/text-to-image
export const RUNWARE_MODELS = {
  // Tier 3 - Free/Budget (fast, cheap)
  "flux-schnell": "runware:100@1", // FLUX.1 [schnell] - ultra fast 4-step

  // Tier 2 - Starter (balance quality/speed)
  "flux-dev": "runware:101@1", // FLUX.1 [dev] - high quality

  // Tier 1 - Pro/Premium (best quality) - using FLUX Dev for now
  // Note: FLUX.2 Pro, Midjourney, Ideogram require checking availability
  "flux-dev-pro": "runware:101@1", // FLUX.1 [dev] - best available
} as const;

export type RunwareModelId = keyof typeof RUNWARE_MODELS;

// Model selection by user tier
export const TIER_MODELS: Record<UserTier, RunwareModelId[]> = {
  free: ["flux-schnell"],
  starter: ["flux-dev", "flux-schnell"],
  pro: ["flux-dev-pro", "flux-dev", "flux-schnell"],
  lifetime: ["flux-dev-pro", "flux-dev", "flux-schnell"],
};

// Default model per tier
export const DEFAULT_MODEL: Record<UserTier, RunwareModelId> = {
  free: "flux-schnell",
  starter: "flux-dev",
  pro: "flux-dev-pro",
  lifetime: "flux-dev-pro",
};

// Model costs (approximate USD per image)
export const MODEL_COSTS: Record<RunwareModelId, number> = {
  "flux-schnell": 0.003,  // ~$0.003 per image (4 steps)
  "flux-dev": 0.01,       // ~$0.01 per image
  "flux-dev-pro": 0.01,   // ~$0.01 per image
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

    console.log(`[Runware] 🚀 Generating with ${modelId} (AIR: ${modelAIR})`);
    console.log(`[Runware] Prompt: ${options.prompt.substring(0, 100)}...`);

    const result = await runware.imageInference({
      positivePrompt: options.prompt,
      negativePrompt: options.negativePrompt || "blurry, low quality, distorted, watermark, text, signature",
      model: modelAIR,
      width: options.width || 1024,
      height: options.height || 1024,
      seed: options.seed,
      steps: options.steps || 25,
      CFGScale: options.guidance || 7,
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
    console.error("[Runware] ❌ Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Generation failed",
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

export async function removeBackground(
  imageUrl: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    const runware = await getRunwareClient();

    console.log(`[Runware] ✂️ Removing background`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (runware as any).removeBackground({
      inputImage: imageUrl,
      outputType: "URL",
      outputFormat: "PNG",
    });

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
