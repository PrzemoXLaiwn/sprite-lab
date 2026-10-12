import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getCategoryById, getSubcategoryById } from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { rateLimit3DGeneration } from "@/lib/rate-limit";
import { validateBody } from "@/lib/validation/common";
import { generate3DStreamSchema } from "@/lib/validations";
import { assertSafeImageUrl } from "@/lib/safe-fetch";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Vercel Pro max. All Replicate calls share PIPELINE_BUDGET_MS (and are
// aborted if the client disconnects) so the refund path always runs.
export const maxDuration = 300;
const PIPELINE_BUDGET_MS = 240_000;
const CREDITS_REQUIRED = 4;

// ===========================================
// SSE Helper
// ===========================================
function createSSEStream(onCancel?: () => void) {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController<Uint8Array>;
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
    cancel() {
      // Client disconnected
      closed = true;
      onCancel?.();
    },
  });

  // Writes after the client went away must not throw — that would skip the
  // refund logic in the pipeline.
  const send = (event: string, data: unknown) => {
    if (closed) return;
    try {
      const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(message));
    } catch {
      closed = true;
    }
  };

  const close = () => {
    if (closed) return;
    closed = true;
    try {
      controller.close();
    } catch {
      // already closed
    }
  };

  return { stream, send, close };
}

// ===========================================
// HELPER: Extract URL from Replicate output
// ===========================================
function getUrlFromValue(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "url" in val) {
    const fileOut = val as { url?: () => URL };
    if (typeof fileOut.url === "function") {
      try {
        return fileOut.url().toString();
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

async function extractImageUrl(output: unknown): Promise<string | null> {
  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];
    if (typeof firstItem === "string") return firstItem;
    if (firstItem && typeof firstItem === "object") {
      if ("url" in firstItem && typeof (firstItem as { url: unknown }).url === "function") {
        try {
          return (firstItem as { url: () => URL }).url().toString();
        } catch {
          // continue
        }
      }
      const obj = firstItem as Record<string, unknown>;
      if (typeof obj.uri === "string") return obj.uri;
      if (typeof obj.href === "string") return obj.href;
    }
  }
  if (typeof output === "string") return output;
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.uri === "string") return obj.uri;
  }
  return null;
}

// ===========================================
// CATEGORY-SPECIFIC ENHANCEMENTS
// ===========================================
const CATEGORY_3D_ENHANCEMENTS: Record<string, string> = {
  WEAPONS: "game weapon, single isolated object, detailed surface, metallic material, clean design",
  ARMOR: "game armor piece, single isolated object, detailed surface, protective equipment",
  CONSUMABLES: "game item, single isolated object, consumable, potion bottle or food item",
  RESOURCES: "game resource, single isolated object, material, crafting component",
  QUEST_ITEMS: "game artifact, single isolated object, magical item, detailed",
  CHARACTERS: "game character figurine, T-pose or standing, full body, humanoid",
  CREATURES: "game creature, monster figurine, single isolated, detailed surface",
  ENVIRONMENT: "game prop, environment object, single isolated, detailed surface",
};

// ===========================================
// 3D STYLE CONFIGURATIONS
// ===========================================
const STYLE_3D_CONFIGS: Record<string, { promptPrefix: string; promptSuffix: string; negativePrompt: string }> = {
  REALISTIC: {
    promptPrefix: "professional photograph, real life,",
    promptSuffix: "photorealistic, DSLR photo, 8k uhd, sharp focus, natural lighting, realistic proportions, real animal, real object, stock photo quality",
    negativePrompt: "cartoon, anime, 3d render, cgi, illustration, painting, drawing, stylized, cute, chibi, toy, figurine, unrealistic",
  },
  STYLIZED: {
    promptPrefix: "stylized 3D render, clean game art style,",
    promptSuffix: "vibrant colors, smooth surfaces, game-ready asset, professional quality, Pixar style",
    negativePrompt: "photorealistic, photograph, blurry, low quality",
  },
  CARTOON: {
    promptPrefix: "cartoon style, bold colors, fun,",
    promptSuffix: "simple shapes, thick outlines, playful style, cel shaded, animated movie style",
    negativePrompt: "realistic, photograph, dark, scary",
  },
  ANIME: {
    promptPrefix: "anime style, japanese animation,",
    promptSuffix: "cel shaded, vibrant colors, clean lines, manga aesthetic, studio ghibli inspired",
    negativePrompt: "realistic, photograph, western cartoon, 3d render",
  },
  LOW_POLY: {
    promptPrefix: "low poly 3D render, geometric,",
    promptSuffix: "minimalist, flat shaded, angular shapes, modern indie game style, faceted",
    negativePrompt: "realistic, detailed, smooth, photograph",
  },
  HAND_PAINTED: {
    promptPrefix: "hand painted texture, painterly,",
    promptSuffix: "artistic brushstrokes, World of Warcraft style, stylized game art, oil painting texture",
    negativePrompt: "realistic, photograph, smooth, plastic",
  },
};

// ===========================================
// HELPER: Sleep
// ===========================================
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===========================================
// HELPER: Retry logic
// ===========================================
function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    "429", "rate limit", "throttled", "network", "Network is unreachable",
    "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "socket hang up",
    "Connection refused", "Failed to establish", "Max retries exceeded",
    "HTTPSConnectionPool", "NewConnectionError", "502", "503", "504",
    "Bad Gateway", "Service Unavailable", "Gateway Timeout",
  ];
  const lowerMessage = errorMessage.toLowerCase();
  return retryablePatterns.some(p => lowerMessage.includes(p.toLowerCase()));
}

async function runWithRetry<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 5000, signal?: AbortSignal): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (signal?.aborted) throw new Error("Pipeline aborted");
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (!signal?.aborted && isRetryableError(lastError.message || "")) {
        await sleep(baseDelay * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError || new Error("Max retries exceeded");
}

// ===========================================
// MAIN STREAMING HANDLER
// ===========================================
export async function POST(request: Request) {
  // Aborted when the client disconnects or the time budget runs out. Every
  // Replicate call receives this signal so an abandoned request stops
  // spending money and falls through to the refund path.
  const pipelineController = new AbortController();
  const budgetTimer = setTimeout(() => pipelineController.abort(), PIPELINE_BUDGET_MS);
  const onClientGone = () => pipelineController.abort();
  request.signal?.addEventListener("abort", onClientGone);
  const signal = pipelineController.signal;

  const { stream, send, close } = createSSEStream(onClientGone);

  // Set while credits are held and the provider has not delivered yet.
  // Cleared BEFORE refunding so a refund happens at most once.
  let chargedUserId: string | null = null;
  const refundIfCharged = async (reason: string) => {
    if (!chargedUserId) return;
    const uid = chargedUserId;
    chargedUserId = null;
    console.warn(`[3D Stream] Refunding ${CREDITS_REQUIRED} credits (${reason})`);
    await refundCredits(uid, CREDITS_REQUIRED);
  };
  const fail = async (message: string, reason: string) => {
    await refundIfCharged(reason);
    send("error", { message });
    close();
  };

  // Process in background
  (async () => {
    try {
      // Auth check
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        send("error", { message: "Please log in to generate 3D models." });
        close();
        return;
      }

      const { blocked } = await rateLimit3DGeneration(user.id);
      if (blocked) {
        send("error", { message: "Too many requests. Please wait before trying again." });
        close();
        return;
      }

      // Parse + validate request
      let rawBody: unknown;
      try {
        rawBody = await request.json();
      } catch {
        send("error", { message: "Invalid request body." });
        close();
        return;
      }
      const parsed = validateBody(generate3DStreamSchema, rawBody);
      if (!parsed.success) {
        send("error", { message: parsed.error });
        close();
        return;
      }
      const { categoryId, subcategoryId, modelId, qualityPreset, seed } = parsed.data;
      const prompt = parsed.data.prompt || "";
      const customImageUrl = parsed.data.customImageUrl || null;
      const styleId = Object.hasOwn(STYLE_3D_CONFIGS, parsed.data.styleId) ? parsed.data.styleId : "STYLIZED";

      // Custom images must come from our own storage (uploads go to Supabase
      // via /api/upload-image) — never an arbitrary URL.
      if (customImageUrl) {
        try {
          assertSafeImageUrl(customImageUrl);
        } catch {
          send("error", { message: "Please upload your image again and retry." });
          close();
          return;
        }
      }

      const category = getCategoryById(categoryId);
      const subcategory = getSubcategoryById(categoryId, subcategoryId);
      if (!category || !subcategory) {
        send("error", { message: "Invalid category or subcategory" });
        close();
        return;
      }

      // Credits: atomic deduct up-front. Parallel or aborted requests can no
      // longer get free generations; every failure path below refunds.
      await getOrCreateUser(user.id, user.email!);
      const creditResult = await checkAndDeductCredits(user.id, CREDITS_REQUIRED);
      if (!creditResult.success) {
        if (creditResult.error === "Not enough credits") {
          send("error", { message: `Not enough credits. Need ${CREDITS_REQUIRED}.`, noCredits: true });
        } else {
          console.error("[3D Stream] Credit deduction failed:", creditResult.error);
          send("error", { message: "Failed to process credits. Please try again." });
        }
        close();
        return;
      }
      chargedUserId = user.id;

      // Get style configuration
      const styleConfig = STYLE_3D_CONFIGS[styleId];

      // ========================================
      // STEP 1: Get or Generate reference image
      // ========================================
      const seedNum = seed !== undefined && seed !== null && seed !== "" ? Number(seed) : NaN;
      const usedSeed = Number.isInteger(seedNum) && seedNum >= 0 && seedNum <= 2147483647
        ? seedNum
        : Math.floor(Math.random() * 2147483647);
      let referenceImageUrl: string | null = null;

      if (customImageUrl) {
        // User provided their own image
        send("step", { step: 1, total: 3, title: "Using your image", description: "Processing uploaded image..." });
        referenceImageUrl = customImageUrl;
        send("reference", { imageUrl: referenceImageUrl, seed: usedSeed, isCustom: true });
        send("step", { step: 1, total: 3, title: "Image ready", description: "Your image is ready for 3D conversion!", completed: true });
      } else {
        // Generate reference image from prompt with selected style
        send("step", { step: 1, total: 3, title: "Generating reference image", description: `Creating ${styleId.toLowerCase().replace("_", " ")} style concept...` });

        const categoryEnhancement = CATEGORY_3D_ENHANCEMENTS[categoryId] || "single object";

        // Build prompt based on style - for REALISTIC, emphasize real photography
        const isRealistic = styleId === "REALISTIC";
        const enhancedPrompt = isRealistic
          ? `${styleConfig.promptPrefix} ${prompt}, single isolated subject, front view, centered, plain white background, ${styleConfig.promptSuffix}`
          : `${styleConfig.promptPrefix} ${prompt}, ${categoryEnhancement}, front view, centered composition, solid white background, ${styleConfig.promptSuffix}, high quality, clean edges, isolated object`;

        try {
          // For REALISTIC style, use SDXL directly (better with negative prompts)
          // For other styles, try FLUX first
          const imageOutput = await runWithRetry(async () => {
            if (isRealistic) {
              // SDXL is better for photorealistic with negative prompts
              return await replicate.run("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", {
                input: {
                  prompt: enhancedPrompt,
                  negative_prompt: styleConfig.negativePrompt + ", multiple objects, busy background, text, watermark, blurry",
                  seed: usedSeed,
                  width: 1024,
                  height: 1024,
                  num_outputs: 1,
                  guidance_scale: 7.5,
                  num_inference_steps: 30,
                },
                signal,
              });
            }
            // FLUX for stylized looks
            return await replicate.run("black-forest-labs/flux-dev", {
              input: {
                prompt: enhancedPrompt,
                seed: usedSeed,
                guidance: 3.5,
                num_outputs: 1,
                aspect_ratio: "1:1",
                output_format: "png",
                output_quality: 95,
                num_inference_steps: 28,
              },
              signal,
            });
          }, 3, 5000, signal);

          referenceImageUrl = await extractImageUrl(imageOutput);
        } catch (primaryError) {
          if (signal.aborted) throw primaryError;
          // Fallback to SDXL with style-specific negative prompt
          const sdxlOutput = await runWithRetry(async () => {
            return await replicate.run("stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b", {
              input: {
                prompt: enhancedPrompt,
                negative_prompt: styleConfig.negativePrompt + ", multiple objects, busy background, text, watermark, blurry",
                seed: usedSeed,
                width: 1024,
                height: 1024,
                num_outputs: 1,
                guidance_scale: 7.5,
                num_inference_steps: 30,
              },
              signal,
            });
          }, 3, 5000, signal);
          referenceImageUrl = await extractImageUrl(sdxlOutput);
        }

        if (!referenceImageUrl) {
          await fail("Failed to generate reference image. Credits refunded.", "no reference image");
          return;
        }

        // Send reference image to client!
        send("reference", { imageUrl: referenceImageUrl, seed: usedSeed, isCustom: false });
        send("step", { step: 1, total: 3, title: "Reference image ready", description: "2D concept created!", completed: true });
      }

      // ========================================
      // STEP 2: Convert to 3D
      // ========================================
      send("step", { step: 2, total: 3, title: "Building 3D geometry", description: "Converting image to 3D mesh..." });

      // Try multiple 3D models in case one fails
      let model3DOutput: unknown = null;
      let usedModel = "";

      // Try Rodin first (most reliable)
      try {
        console.log("[3D Gen] Trying Rodin Gen-2...");
        model3DOutput = await runWithRetry(async () => {
          return await replicate.run("hyper3d/rodin" as `${string}/${string}`, {
            input: {
              prompt: "3D model of the object in the image, game-ready asset",
              images: [referenceImageUrl],
              // Map quality preset: low = faster, medium = balanced, high = more detail
              quality: qualityPreset === "high" ? "high" : qualityPreset === "low" ? "low" : "medium",
              material: "PBR",
              geometry_file_format: "glb",
              mesh_mode: "Quad",
            },
            signal,
          });
        }, 2, 3000, signal);
        usedModel = "rodin";
      } catch (rodinError) {
        console.error("[3D Gen] Rodin failed:", rodinError);
        if (signal.aborted) throw rodinError;

        // Try Hunyuan3D as fallback
        try {
          console.log("[3D Gen] Trying Hunyuan3D-2...");
          send("step", { step: 2, total: 3, title: "Switching to backup engine", description: "Using alternative 3D generator..." });

          model3DOutput = await runWithRetry(async () => {
            return await replicate.run("tencent/hunyuan3d-2:b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb", {
              input: {
                image: referenceImageUrl,
                foreground_ratio: 0.9,
                remesh: "none",
              },
              signal,
            });
          }, 2, 3000, signal);
          usedModel = "hunyuan3d";
        } catch (hunyuanError) {
          console.error("[3D Gen] Hunyuan3D failed:", hunyuanError);
          await fail("All 3D generators failed. Credits refunded — please try again later.", "all 3D generators failed");
          return;
        }
      }

      console.log(`[3D Gen] Using model: ${usedModel}`);

      // Parse 3D output
      let modelUrl: string | null = null;

      console.log("[3D Gen] Raw output:", JSON.stringify(model3DOutput, null, 2));

      if (typeof model3DOutput === "string") {
        modelUrl = model3DOutput;
      } else {
        modelUrl = getUrlFromValue(model3DOutput) || null;
      }

      if (!modelUrl && model3DOutput && typeof model3DOutput === "object") {
        const out = model3DOutput as Record<string, unknown>;

        // Try common output keys
        modelUrl = getUrlFromValue(out.output) ||
          getUrlFromValue(out.geometry) ||
          getUrlFromValue(out.mesh) ||
          getUrlFromValue(out.glb) ||
          getUrlFromValue(out.model) ||
          getUrlFromValue(out.model_file) ||
          null;

        // Search all keys for .glb files
        if (!modelUrl) {
          for (const [key, value] of Object.entries(out)) {
            const url = getUrlFromValue(value);
            if (url) {
              console.log(`[3D Gen] Found URL in key "${key}":`, url);
              if (url.includes(".glb") || url.includes(".obj") || url.includes(".ply") || url.includes("replicate.delivery")) {
                modelUrl = url;
                break;
              }
            }
          }
        }

        // Check if output is iterable (array-like)
        if (!modelUrl && Symbol.iterator in out) {
          const arr = Array.from(out as unknown as Iterable<unknown>);
          if (arr.length > 0) {
            const firstUrl = getUrlFromValue(arr[0]);
            if (firstUrl) {
              modelUrl = firstUrl;
            }
          }
        }
      }

      if (!modelUrl) {
        await fail("3D model generation failed. Credits refunded.", "no output URL");
        return;
      }

      // Provider delivered — credits are now earned; no refund past here.
      // (Even if the client disconnected, the model is saved to their gallery.)
      chargedUserId = null;

      send("step", { step: 2, total: 3, title: "3D geometry complete", description: "Mesh created successfully!", completed: true });

      // ========================================
      // STEP 3: Finalize
      // ========================================
      send("step", { step: 3, total: 3, title: "Finalizing", description: "Preparing download..." });

      // Save to database (prompt is optional when an image was uploaded)
      const savedPrompt = prompt.trim() || "[Image to 3D]";
      await saveGeneration({
        userId: user.id,
        prompt: savedPrompt,
        fullPrompt: `[3D] ${savedPrompt}`,
        categoryId,
        subcategoryId,
        styleId: `3D_${modelId.toUpperCase()}`,
        imageUrl: modelUrl,
        seed: usedSeed,
      });

      send("step", { step: 3, total: 3, title: "Complete!", description: "Your 3D model is ready", completed: true });

      // Final result
      send("complete", {
        success: true,
        modelUrl,
        format: "glb",
        referenceImageUrl,
        seed: usedSeed,
        creditsUsed: CREDITS_REQUIRED,
      });

      close();
    } catch (error) {
      console.error("[3D Stream] Error:", error);
      await fail(
        signal.aborted
          ? "3D generation timed out or was cancelled. Credits refunded."
          : "Something went wrong. Please try again.",
        signal.aborted ? "aborted" : "unexpected error"
      );
    } finally {
      clearTimeout(budgetTimer);
      request.signal?.removeEventListener("abort", onClientGone);
    }
  })();

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
