import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Cost for inpainting
const CREDITS_REQUIRED = 2;

// ===========================================
// INPAINTING MODELS
// ===========================================

type ModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

async function runSDXLInpaint(
  imageBase64: string,
  maskBase64: string,
  prompt: string,
  negativePrompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    console.log("[SDXL Inpaint] Starting...");

    const output = await replicate.run(
      "stability-ai/stable-diffusion-inpainting:95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3" as ModelIdentifier,
      {
        input: {
          image: `data:image/png;base64,${imageBase64}`,
          mask: `data:image/png;base64,${maskBase64}`,
          prompt: prompt,
          negative_prompt: negativePrompt,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
          num_outputs: 1,
        },
      }
    );

    const imageUrl = extractUrl(output);
    if (imageUrl) {
      console.log("[SDXL Inpaint] Success!");
      return { success: true, imageUrl };
    }

    return { success: false, error: "No output URL" };
  } catch (error) {
    console.error("[SDXL Inpaint] Error:", error);
    return { success: false, error: String(error) };
  }
}

async function runFluxInpaint(
  imageBase64: string,
  maskBase64: string,
  prompt: string
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  try {
    console.log("[FLUX Fill] Starting...");

    // Create prediction with timeout handling - use black-forest-labs/flux-fill-pro
    // For official models, we use the model parameter (not version)
    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-fill-pro",
      input: {
        image: `data:image/png;base64,${imageBase64}`,
        mask: `data:image/png;base64,${maskBase64}`,
        prompt: prompt,
        steps: 25,
        guidance: 30,
        output_format: "png",
      },
    });

    // Wait for completion with timeout
    let result = await replicate.predictions.get(prediction.id);
    let waitTime = 0;
    const maxWait = 90; // 90 seconds max

    while (
      (result.status === "starting" || result.status === "processing") &&
      waitTime < maxWait
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await replicate.predictions.get(prediction.id);
      waitTime += 2;

      if (waitTime % 10 === 0) {
        console.log(`[FLUX Fill] Processing... ${waitTime}s`);
      }
    }

    if (waitTime >= maxWait) {
      console.log("[FLUX Fill] Timeout");
      return { success: false, error: "Timeout - taking too long" };
    }

    if (result.status === "failed") {
      console.error("[FLUX Fill] Failed:", result.error);
      return { success: false, error: String(result.error || "FLUX Fill failed") };
    }

    if (result.status === "succeeded" && result.output) {
      const imageUrl = extractUrl(result.output);
      if (imageUrl) {
        console.log("[FLUX Fill] Success!");
        return { success: true, imageUrl };
      }
    }

    return { success: false, error: "No output URL" };
  } catch (error) {
    console.error("[FLUX Fill] Error:", error);
    return { success: false, error: String(error) };
  }
}

function extractUrl(output: unknown): string | null {
  // Helper to extract URL from a FileOutput-like object
  const extractFromFileOutput = (obj: unknown): string | null => {
    if (!obj || typeof obj !== "object") return null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileOutput = obj as any;

    // Method 1: FileOutput.url() method (Replicate SDK 1.0+)
    if (typeof fileOutput.url === "function") {
      try {
        const urlResult = fileOutput.url();
        if (urlResult) {
          const urlStr = typeof urlResult === "string" ? urlResult : urlResult.toString();
          if (urlStr.startsWith("http")) return urlStr;
        }
      } catch { /* ignore */ }
    }

    // Method 2: String() for FileOutput (it stringifies to the URL)
    try {
      const str = String(fileOutput);
      if (str.startsWith("http")) return str;
    } catch { /* ignore */ }

    // Method 3: Direct string properties
    if (typeof fileOutput.url === "string" && fileOutput.url.startsWith("http")) return fileOutput.url;
    if (typeof fileOutput.uri === "string" && fileOutput.uri.startsWith("http")) return fileOutput.uri;
    if (typeof fileOutput.href === "string" && fileOutput.href.startsWith("http")) return fileOutput.href;

    return null;
  };

  // Handle array output (most common case)
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    const url = extractFromFileOutput(first);
    if (url) return url;
  }

  // Handle direct string output
  if (typeof output === "string" && output.startsWith("http")) return output;

  // Handle single FileOutput object
  return extractFromFileOutput(output);
}

// ===========================================
// MAIN HANDLER
// ===========================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const { imageBase64, maskBase64, prompt, originalData } = body;

    // Validation
    if (!imageBase64 || !maskBase64) {
      return NextResponse.json(
        { error: "Image and mask are required" },
        { status: 400 }
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please describe what you want in the selected area" },
        { status: 400 }
      );
    }

    // Check and deduct credits
    const creditResult = await checkAndDeductCredits(user.id, CREDITS_REQUIRED);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Not enough credits. You need ${CREDITS_REQUIRED} credits.`, noCredits: true },
        { status: 402 }
      );
    }

    // Build prompt
    const trimmedPrompt = prompt.trim();
    const isPixelArt = originalData?.styleId?.includes("PIXEL");
    const isRemoval = trimmedPrompt.toLowerCase().includes("remove") ||
                      trimmedPrompt.toLowerCase().includes("empty") ||
                      trimmedPrompt.toLowerCase().includes("transparent");

    let finalPrompt = trimmedPrompt;
    let negativePrompt = "blurry, low quality, distorted, watermark, text";

    if (isPixelArt) {
      finalPrompt += ", pixel art style, visible pixels, retro game sprite";
      negativePrompt += ", smooth, anti-aliased, photorealistic";
    }

    if (isRemoval) {
      finalPrompt = "empty space, transparent background, nothing, clear area";
      negativePrompt += ", object, item, thing, content";
    }

    // Add context from original generation
    if (originalData?.categoryId && !isRemoval) {
      finalPrompt += `, game ${originalData.categoryId.toLowerCase()} asset`;
    }

    finalPrompt += ", high quality, detailed, seamless blend with surrounding area";

    console.log("===========================================");
    console.log("INPAINTING REQUEST");
    console.log("===========================================");
    console.log("User prompt:", trimmedPrompt);
    console.log("Final prompt:", finalPrompt);
    console.log("Style:", originalData?.styleId || "unknown");
    console.log("Is pixel art:", isPixelArt);
    console.log("Is removal:", isRemoval);

    // Try FLUX first (better quality), fallback to SDXL
    let result = await runFluxInpaint(imageBase64, maskBase64, finalPrompt);

    if (!result.success) {
      console.log("FLUX failed, trying SDXL fallback...");
      result = await runSDXLInpaint(imageBase64, maskBase64, finalPrompt, negativePrompt);
    }

    if (!result.success || !result.imageUrl) {
      // Refund credits
      await refundCredits(user.id, CREDITS_REQUIRED);

      return NextResponse.json(
        { error: result.error || "Inpainting failed. Please try again." },
        { status: 500 }
      );
    }

    // Upload to storage
    console.log("Uploading to storage...");
    const fileName = `inpaint-${Date.now()}`;
    const uploadResult = await uploadImageToStorage(result.imageUrl, user.id, fileName);
    const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : result.imageUrl;

    // Save to database
    await saveGeneration({
      userId: user.id,
      prompt: `[Inpaint] ${trimmedPrompt}`,
      fullPrompt: finalPrompt,
      categoryId: originalData?.categoryId || "EDITED",
      subcategoryId: originalData?.subcategoryId || "INPAINT",
      styleId: originalData?.styleId || "PIXEL_ART",
      imageUrl: finalUrl,
      seed: undefined,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("INPAINTING COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Credits used: ${CREDITS_REQUIRED}`);
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      duration: `${duration}s`,
      creditsUsed: CREDITS_REQUIRED,
    });
  } catch (error) {
    console.error("Inpaint error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Inpainting failed" },
      { status: 500 }
    );
  }
}
