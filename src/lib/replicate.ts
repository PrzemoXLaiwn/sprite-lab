import Replicate from "replicate";
import {
  getCategoryById,
  getStyleById,
} from "./categories";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ===========================================
// INTERFACES
// ===========================================
export interface GenerateAssetParams {
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed?: number;
  modelId?: string;
  aspectRatio?: string;
  resolution?: number;
  quality?: "draft" | "standard" | "high";
  numOutputs?: number;
}

export interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  imageUrls?: string[];
  error?: string;
  fullPrompt?: string;
  seed?: number;
  modelUsed?: string;
}

// ===========================================
// 2D MODEL CONFIGURATIONS
// ===========================================

export interface Model2DConfig {
  id: string;
  version: string;
  name: string;
  description: string;
  speed: "fast" | "medium" | "slow";
  quality: "good" | "high" | "best";
  supportsAspectRatio: boolean;
  supportsBatch: boolean;
  maxResolution: number;
  getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => Record<string, unknown>;
}

export const MODEL_2D_CONFIGS: Record<string, Model2DConfig> = {
  // FLUX-dev - Current default (BEST QUALITY)
  "flux-dev": {
    id: "flux-dev",
    version: "black-forest-labs/flux-dev",
    name: "FLUX Dev",
    description: "Best quality, most detailed. Excellent for all game assets.",
    speed: "medium",
    quality: "best",
    supportsAspectRatio: true,
    supportsBatch: true,
    maxResolution: 1440,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      seed: params.seed,
      guidance: 3.5,
      num_outputs: params.numOutputs || 1,
      aspect_ratio: params.aspectRatio || "1:1",
      output_format: "png",
      output_quality: params.quality === "high" ? 100 : params.quality === "standard" ? 90 : 80,
      num_inference_steps: params.quality === "high" ? 28 : params.quality === "standard" ? 20 : 15,
    }),
  },

  // FLUX-schnell - Fast version (NEW)
  "flux-schnell": {
    id: "flux-schnell",
    version: "black-forest-labs/flux-schnell",
    name: "FLUX Schnell",
    description: "Ultra-fast FLUX. Great for rapid iteration and testing.",
    speed: "fast",
    quality: "high",
    supportsAspectRatio: true,
    supportsBatch: true,
    maxResolution: 1440,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      seed: params.seed,
      num_outputs: params.numOutputs || 1,
      aspect_ratio: params.aspectRatio || "1:1",
      output_format: "png",
      output_quality: 90,
      num_inference_steps: 4, // Very fast
    }),
  },

  // SDXL - Stable Diffusion XL (NEW - ALTERNATIVE)
  "sdxl": {
    id: "sdxl",
    version: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    name: "SDXL",
    description: "Stable Diffusion XL. Great alternative with different style.",
    speed: "medium",
    quality: "high",
    supportsAspectRatio: true,
    supportsBatch: true,
    maxResolution: 1024,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      seed: params.seed,
      width: params.resolution || 1024,
      height: params.resolution || 1024,
      num_outputs: params.numOutputs || 1,
      guidance_scale: 7.5,
      num_inference_steps: params.quality === "high" ? 50 : params.quality === "standard" ? 35 : 25,
      scheduler: "K_EULER",
    }),
  },

  // Playground v2.5 (NEW - ARTISTIC)
  "playground-v2.5": {
    id: "playground-v2.5",
    version: "playgroundai/playground-v2.5-1024px-aesthetic:a45f82a1382bed5c7aeb861dac7c7d191b0fdf74d8d57c4a0e6ed7d4d0bf7d24",
    name: "Playground v2.5",
    description: "Artistic and aesthetic. Great for stylized game art.",
    speed: "medium",
    quality: "high",
    supportsAspectRatio: false,
    supportsBatch: true,
    maxResolution: 1024,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      seed: params.seed,
      width: params.resolution || 1024,
      height: params.resolution || 1024,
      num_outputs: params.numOutputs || 1,
      guidance_scale: 3,
      num_inference_steps: params.quality === "high" ? 50 : 30,
    }),
  },

  // Stable Diffusion 3 (NEW - LATEST)
  "sd3": {
    id: "sd3",
    version: "stability-ai/stable-diffusion-3",
    name: "Stable Diffusion 3",
    description: "Latest SD model. Excellent text understanding and quality.",
    speed: "slow",
    quality: "best",
    supportsAspectRatio: true,
    supportsBatch: false,
    maxResolution: 1024,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      seed: params.seed,
      aspect_ratio: params.aspectRatio || "1:1",
      output_format: "png",
      num_inference_steps: params.quality === "high" ? 50 : params.quality === "standard" ? 35 : 28,
    }),
  },

  // SDXL Lightning (NEW - ULTRA FAST)
  "sdxl-lightning": {
    id: "sdxl-lightning",
    version: "bytedance/sdxl-lightning-4step:5f24084160c9089501c1b3545d9be3c27883ae2239b6f412990e82d4a6210f8f",
    name: "SDXL Lightning",
    description: "Ultra-fast SDXL. 4-step generation for rapid prototyping.",
    speed: "fast",
    quality: "good",
    supportsAspectRatio: false,
    supportsBatch: true,
    maxResolution: 1024,
    getInput: (params: GenerateAssetParams, fullPrompt: string, negativePrompt: string) => ({
      prompt: fullPrompt,
      negative_prompt: negativePrompt,
      seed: params.seed,
      width: params.resolution || 1024,
      height: params.resolution || 1024,
      num_outputs: params.numOutputs || 1,
      num_inference_steps: 4,
    }),
  },
};

// Default model
export const DEFAULT_2D_MODEL = "flux-dev";

// ===========================================
// ASPECT RATIO CONFIGURATIONS
// ===========================================

export const ASPECT_RATIOS = {
  "1:1": { label: "Square (1:1)", width: 1024, height: 1024, emoji: "⬛" },
  "16:9": { label: "Landscape (16:9)", width: 1344, height: 768, emoji: "🖼️" },
  "9:16": { label: "Portrait (9:16)", width: 768, height: 1344, emoji: "📱" },
  "4:3": { label: "Classic (4:3)", width: 1152, height: 896, emoji: "🖥️" },
  "3:4": { label: "Portrait (3:4)", width: 896, height: 1152, emoji: "📄" },
  "21:9": { label: "Ultrawide (21:9)", width: 1536, height: 640, emoji: "🎬" },
};

// ===========================================
// RESOLUTION PRESETS
// ===========================================

export const RESOLUTION_PRESETS = {
  512: { label: "Draft (512px)", description: "Fast, for testing" },
  1024: { label: "Standard (1024px)", description: "Balanced quality/speed" },
  1440: { label: "High (1440px)", description: "Best quality, slower" },
};

// ===========================================
// UNIVERSAL QUALITY RULES
// ===========================================
const QUALITY_POSITIVE = [
  "high quality",
  "sharp details", 
  "professional game asset",
  "clean design",
  "vibrant colors"
].join(", ");

const QUALITY_NEGATIVE = [
  // Text - NAJWAŻNIEJSZE
  "text", "words", "letters", "numbers", "labels", "watermark", 
  "signature", "writing", "font", "typography", "inscriptions",
  // Quality issues
  "blurry", "low quality", "ugly", "deformed", "distorted", 
  "amateur", "bad anatomy", "disfigured", "poorly drawn",
  // Composition issues
  "cropped", "cut off", "partial", "incomplete", "out of frame",
  // Unwanted additions
  "border", "frame", "margin", "duplicate", "clone", "multiple"
].join(", ");

// ===========================================
// SMART MATERIAL ENHANCERS
// ===========================================
const materialEnhancers: { pattern: RegExp; add: string }[] = [
  // Metals
  { pattern: /\bgold(en)?\b/i, add: "shiny gold metal, luxurious golden shine" },
  { pattern: /\bsilver\b/i, add: "polished silver metal, reflective silver shine" },
  { pattern: /\biron\b/i, add: "sturdy iron metal, forged dark metal" },
  { pattern: /\bsteel\b/i, add: "polished steel, strong metallic" },
  { pattern: /\bbronze\b/i, add: "bronze metal, copper-gold color" },
  { pattern: /\bcopper\b/i, add: "copper metal, warm orange-brown metallic" },
  
  // Natural materials
  { pattern: /\bwood(en)?\b/i, add: "natural wood grain, carved wood texture" },
  { pattern: /\bstone\b/i, add: "solid stone, rock texture" },
  { pattern: /\bleather\b/i, add: "leather material, stitched leather texture" },
  { pattern: /\bbone\b/i, add: "bone material, ivory white, skeletal" },
  
  // Precious materials
  { pattern: /\bcrystal\b/i, add: "crystal material, transparent, faceted, refractive light" },
  { pattern: /\bglass\b/i, add: "glass material, transparent, clear, reflective" },
  { pattern: /\bdiamond\b/i, add: "diamond gem, brilliant cut, sparkling, clear" },
  { pattern: /\bruby\b/i, add: "ruby gem, deep red, faceted, precious" },
  { pattern: /\bemerald\b/i, add: "emerald gem, rich green, faceted, precious" },
  { pattern: /\bsapphire\b/i, add: "sapphire gem, deep blue, faceted, precious" },
  { pattern: /\bamethyst\b/i, add: "amethyst gem, purple, faceted, precious" },
];

// ===========================================
// SMART EFFECT ENHANCERS
// ===========================================
const effectEnhancers: { pattern: RegExp; add: string }[] = [
  // Magic effects
  { pattern: /\bmagic(al)?\b/i, add: "magical glowing aura, mystical energy" },
  { pattern: /\benchanted\b/i, add: "enchanted glow, magical sparkles" },
  { pattern: /\bglowing\b/i, add: "soft glowing light effect, luminous" },
  { pattern: /\bcursed\b/i, add: "dark ominous aura, corrupted appearance" },
  { pattern: /\bholy\b/i, add: "divine golden light, sacred glow" },
  { pattern: /\bblessed\b/i, add: "holy light aura, pure radiance" },
  
  // Elemental effects
  { pattern: /\bfire\b|\bflame\b|\bburning\b/i, add: "fire effects, orange flames, burning embers" },
  { pattern: /\bice\b|\bfrost\b|\bfrozen\b/i, add: "ice crystals, frost effect, cold blue glow" },
  { pattern: /\blightning\b|\belectric\b|\bthunder\b/i, add: "electric sparks, lightning energy, crackling" },
  { pattern: /\bpoison\b|\btoxic\b|\bvenom\b/i, add: "toxic green glow, poison dripping, venomous" },
  { pattern: /\bshadow\b|\bdark\b/i, add: "dark shadow energy, darkness emanating" },
  { pattern: /\blight\b|\bradiant\b/i, add: "bright light rays, radiant glow" },
  { pattern: /\bwater\b|\baqua\b/i, add: "water droplets, aqua blue, flowing" },
  { pattern: /\bearth\b|\bstone\b|\brock\b/i, add: "earthen texture, rocky, solid" },
  { pattern: /\bwind\b|\bair\b/i, add: "wind swirls, air currents, flowing" },
  
  // Quality tiers
  { pattern: /\bepic\b/i, add: "epic quality, legendary appearance, ornate masterwork" },
  { pattern: /\blegendary\b/i, add: "legendary item, supreme quality, mythical" },
  { pattern: /\brare\b/i, add: "rare quality, unique design, special" },
  { pattern: /\bancient\b/i, add: "ancient artifact, weathered, old, historical" },
  { pattern: /\brushing\b|\brusted\b/i, add: "worn, battle-damaged, rusty, aged" },
  { pattern: /\bnew\b|\bshiny\b/i, add: "brand new, pristine condition, polished" },
];

// ===========================================
// BUILD FULL PROMPT
// ===========================================
export function buildFullPrompt(params: GenerateAssetParams): {
  prompt: string;
  negative: string;
} {
  const category = getCategoryById(params.categoryId);
  const style = getStyleById(params.styleId);

  // Fallbacks
  const categoryRules = category?.globalPromptRules || "game asset, centered, white background";
  const categoryNegative = category?.globalNegativePrompt || "";
  const stylePrompt = style?.prompt || "pixel art, game style";

  // Start building prompt - USER PROMPT IS KING!
  const promptParts: string[] = [];

  // 1. USER'S DESCRIPTION FIRST AND MOST PROMINENT
  // Repeat it to give it more weight
  promptParts.push(params.prompt);
  promptParts.push(`a ${params.prompt}`);

  // 2. Style (important for look)
  promptParts.push(stylePrompt);

  // 3. Apply smart material enhancers ONLY if detected in user prompt
  for (const { pattern, add } of materialEnhancers) {
    if (pattern.test(params.prompt)) {
      promptParts.push(add);
    }
  }

  // 4. Apply smart effect enhancers ONLY if detected in user prompt
  for (const { pattern, add } of effectEnhancers) {
    if (pattern.test(params.prompt)) {
      promptParts.push(add);
    }
  }

  // 5. Category rules (less prominent - at the end)
  promptParts.push(categoryRules);

  // 6. Universal quality boost
  promptParts.push(QUALITY_POSITIVE);

  // 7. No text instructions
  promptParts.push("no text, no words, no letters, no watermark");

  // Build negative prompt
  const negativeParts: string[] = [
    QUALITY_NEGATIVE,
    categoryNegative,
    // Add "NOT" versions of common confusions
    "multiple items", "group", "collection", "set"
  ];

  return {
    prompt: promptParts.join(", "),
    negative: negativeParts.filter(Boolean).join(", ")
  };
}

// ===========================================
// GENERATE RANDOM SEED
// ===========================================
export function generateSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

// ===========================================
// RETRY UTILITY
// ===========================================
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on certain errors
      if (
        lastError.message.includes("402") ||
        lastError.message.includes("401") ||
        lastError.message.includes("Invalid API")
      ) {
        throw lastError;
      }
      
      // If this was the last attempt, throw
      if (attempt === maxRetries - 1) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError || new Error("Max retries exceeded");
}

// ===========================================
// MAIN GENERATE FUNCTION (ENHANCED)
// ===========================================
export async function generateAsset(
  params: GenerateAssetParams
): Promise<GenerationResult> {
  try {
    const { prompt: fullPrompt, negative: negativePrompt } = buildFullPrompt(params);
    const seed = params.seed ?? generateSeed();
    
    // Get model configuration
    const modelId = params.modelId || DEFAULT_2D_MODEL;
    const modelConfig = MODEL_2D_CONFIGS[modelId] || MODEL_2D_CONFIGS[DEFAULT_2D_MODEL];
    
    // Validate batch generation
    const numOutputs = params.numOutputs || 1;
    if (numOutputs > 1 && !modelConfig.supportsBatch) {
      console.warn(`Model ${modelConfig.name} doesn't support batch generation. Generating single image.`);
      params.numOutputs = 1;
    }
    
    // Validate aspect ratio
    if (params.aspectRatio && !modelConfig.supportsAspectRatio) {
      console.warn(`Model ${modelConfig.name} doesn't support aspect ratio. Using resolution instead.`);
      const ratio = ASPECT_RATIOS[params.aspectRatio as keyof typeof ASPECT_RATIOS];
      if (ratio) {
        params.resolution = ratio.width;
      }
    }
    
    // Logging for debugging
    console.log("===========================================");
    console.log("GENERATING ASSET (2D)");
    console.log("===========================================");
    console.log("User prompt:", params.prompt);
    console.log("Category:", params.categoryId);
    console.log("Subcategory:", params.subcategoryId);
    console.log("Style:", params.styleId);
    console.log("Model:", modelConfig.name);
    console.log("Aspect Ratio:", params.aspectRatio || "1:1");
    console.log("Resolution:", params.resolution || "default");
    console.log("Quality:", params.quality || "standard");
    console.log("Num Outputs:", numOutputs);
    console.log("Seed:", seed);
    console.log("-------------------------------------------");
    console.log("Full prompt:", fullPrompt);
    console.log("Negative prompt:", negativePrompt);
    console.log("-------------------------------------------");
    
    // Get model input
    const modelInput = modelConfig.getInput(params, fullPrompt, negativePrompt);
    
    // Create prediction with selected model (with retry)
    const prediction = await retryWithBackoff(async () => {
      return await replicate.predictions.create({
        model: modelConfig.version,
        input: modelInput,
      });
    });

    // Wait for completion with timeout and retry
    let result = await retryWithBackoff(async () => {
      return await replicate.predictions.get(prediction.id);
    });
    
    let waitTime = 0;
    const maxWait = 120; // 2 minutes max
    
    while (
      (result.status === "starting" || result.status === "processing") && 
      waitTime < maxWait
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Retry getting prediction status
      result = await retryWithBackoff(async () => {
        return await replicate.predictions.get(prediction.id);
      });
      
      waitTime++;
      
      // Log progress every 10 seconds
      if (waitTime % 10 === 0) {
        console.log(`Waiting... ${waitTime}s (Status: ${result.status})`);
      }
    }

    // Check final status
    if (result.status === "failed") {
      console.error("Generation failed:", result.error);
      const errorMsg = typeof result.error === "string" 
        ? result.error 
        : JSON.stringify(result.error) || "Generation failed";
      return { 
        success: false, 
        error: errorMsg, 
        fullPrompt, 
        seed 
      };
    }

    if (waitTime >= maxWait) {
      console.error("Generation timed out");
      return { 
        success: false, 
        error: "Generation timed out. Please try again.", 
        fullPrompt, 
        seed 
      };
    }

    // Extract image URL(s)
    let imageUrls: string[] = [];
    
    if (result.output) {
      if (Array.isArray(result.output)) {
        // Multiple outputs or single output in array
        imageUrls = result.output.filter((url): url is string => typeof url === "string");
      } else if (typeof result.output === "string") {
        imageUrls = [result.output];
      }
    }

    if (imageUrls.length === 0) {
      console.error("No image URL in result:", result);
      return { 
        success: false, 
        error: "No image was generated", 
        fullPrompt, 
        seed,
        modelUsed: modelConfig.name,
      };
    }

    console.log("===========================================");
    console.log("SUCCESS!");
    console.log("Model:", modelConfig.name);
    console.log("Images generated:", imageUrls.length);
    console.log("Image URLs:", imageUrls);
    console.log("Seed:", seed);
    console.log("===========================================");
    
    return { 
      success: true, 
      imageUrl: imageUrls[0], // Primary image
      imageUrls: imageUrls, // All images for batch
      fullPrompt, 
      seed,
      modelUsed: modelConfig.name,
    };
    
  } catch (error) {
    console.error("===========================================");
    console.error("GENERATION ERROR");
    console.error(error);
    console.error("===========================================");
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Handle specific error types
    if (errorMessage.includes("402") || errorMessage.includes("Payment Required")) {
      return { 
        success: false, 
        error: "Insufficient credits. Please add credits at replicate.com/account/billing" 
      };
    }
    
    if (errorMessage.includes("429") || errorMessage.includes("Too Many Requests")) {
      return { 
        success: false, 
        error: "Rate limited. Please wait a moment and try again." 
      };
    }
    
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized")) {
      return { 
        success: false, 
        error: "Invalid API key. Please check your Replicate API token." 
      };
    }
    
    return { 
      success: false, 
      error: errorMessage 
    };
  }
}

// ===========================================
// LEGACY EXPORT (for backwards compatibility)
// ===========================================
export const generateAssetFlux = generateAsset;

// Re-export categories for convenience
export { ALL_CATEGORIES, STYLES } from "./categories";