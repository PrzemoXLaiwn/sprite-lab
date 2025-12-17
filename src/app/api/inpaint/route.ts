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

    const output = await replicate.run(
      "black-forest-labs/flux-fill-pro" as ModelIdentifier,
      {
        input: {
          image: `data:image/png;base64,${imageBase64}`,
          mask: `data:image/png;base64,${maskBase64}`,
          prompt: prompt,
          steps: 25,
          guidance: 30,
          output_format: "png",
        },
      }
    );

    const imageUrl = extractUrl(output);
    if (imageUrl) {
      console.log("[FLUX Fill] Success!");
      return { success: true, imageUrl };
    }

    return { success: false, error: "No output URL" };
  } catch (error) {
    console.error("[FLUX Fill] Error:", error);
    return { success: false, error: String(error) };
  }
}

function extractUrl(output: unknown): string | null {
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      if (typeof obj.url === "function") {
        try {
          return (obj.url as () => URL)().toString();
        } catch {
          /* ignore */
        }
      }
      if (typeof obj.url === "string") return obj.url;
      if (typeof obj.uri === "string") return obj.uri;
      if (typeof obj.href === "string") return obj.href;
    }
  }
  if (typeof output === "string") return output;
  if (output && typeof output === "object") {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
  }
  return null;
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
