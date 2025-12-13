import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getUserCredits, deductCredit, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ===========================================
// VARIATION GENERATION
// ===========================================

interface VariationOptions {
  imageUrl: string;
  prompt?: string;
  numVariations: number;
  similarity: "low" | "medium" | "high";
  seed?: number;
}

/**
 * Generate variations of an existing image
 * Uses img2img with varying strength based on similarity
 */
async function generateVariations(
  options: VariationOptions
): Promise<{ success: boolean; imageUrls?: string[]; error?: string }> {
  try {
    console.log("[Variations] Starting generation...");
    console.log("[Variations] Num variations:", options.numVariations);
    console.log("[Variations] Similarity:", options.similarity);

    // Map similarity to strength (lower strength = more similar to original)
    const strengthMap = {
      high: 0.3, // Very similar
      medium: 0.5, // Balanced
      low: 0.7, // More different
    };

    const strength = strengthMap[options.similarity];

    // Use SDXL img2img for variations
    const prediction = await replicate.predictions.create({
      version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      input: {
        image: options.imageUrl,
        prompt: options.prompt || "game asset, high quality, detailed",
        negative_prompt: "blurry, low quality, distorted, watermark, text",
        num_outputs: options.numVariations,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        strength: strength,
        seed: options.seed,
      },
    });

    // Wait for completion
    let result = await replicate.predictions.get(prediction.id);
    let waitTime = 0;
    const maxWait = 180; // 3 minutes for multiple images

    while (
      (result.status === "starting" || result.status === "processing") &&
      waitTime < maxWait
    ) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      result = await replicate.predictions.get(prediction.id);
      waitTime += 2;

      if (waitTime % 15 === 0) {
        console.log(`[Variations] Processing... ${waitTime}s`);
      }
    }

    if (result.status === "succeeded" && result.output) {
      let imageUrls: string[] = [];

      if (Array.isArray(result.output)) {
        imageUrls = result.output.filter((url): url is string => typeof url === "string");
      } else if (typeof result.output === "string") {
        imageUrls = [result.output];
      }

      if (imageUrls.length > 0) {
        console.log(`[Variations] Success! Generated ${imageUrls.length} variations`);
        return { success: true, imageUrls };
      }
    }

    if (result.status === "failed") {
      console.error(`[Variations] Failed:`, result.error);
      return { success: false, error: String(result.error || "Variation generation failed") };
    }

    if (waitTime >= maxWait) {
      return { success: false, error: "Timeout - generation took too long" };
    }

    return { success: false, error: "No output received" };
  } catch (error) {
    console.error(`[Variations] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const {
      imageUrl,
      prompt,
      numVariations = 2,
      similarity = "medium",
      seed,
      originalGeneration,
    } = body;

    // Validation
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required." },
        { status: 400 }
      );
    }

    if (numVariations < 1 || numVariations > 4) {
      return NextResponse.json(
        { error: "Number of variations must be between 1 and 4." },
        { status: 400 }
      );
    }

    if (!["low", "medium", "high"].includes(similarity)) {
      return NextResponse.json(
        { error: "Similarity must be 'low', 'medium', or 'high'." },
        { status: 400 }
      );
    }

    // Calculate credits needed (1 credit per variation)
    const creditsNeeded = numVariations;

    // Check credits
    const { credits } = await getUserCredits(user.id);
    if (credits < creditsNeeded) {
      return NextResponse.json(
        {
          error: `Not enough credits. Need ${creditsNeeded}, you have ${credits}.`,
          noCredits: true,
        },
        { status: 402 }
      );
    }

    console.log("===========================================");
    console.log("VARIATION GENERATION");
    console.log("===========================================");
    console.log("User:", user.id);
    console.log("Num Variations:", numVariations);
    console.log("Similarity:", similarity);
    console.log("Prompt:", prompt || "default");
    console.log("Input URL:", imageUrl);

    // Generate variations
    const result = await generateVariations({
      imageUrl,
      prompt: prompt || originalGeneration?.prompt,
      numVariations,
      similarity,
      seed,
    });

    if (!result.success || !result.imageUrls || result.imageUrls.length === 0) {
      console.error("[Variations] Failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Variation generation failed." },
        { status: 500 }
      );
    }

    console.log("[Variations] Uploading to storage...");

    // Upload all variations to permanent storage
    const uploadedUrls: string[] = [];
    const savedGenerations: string[] = [];

    for (let i = 0; i < result.imageUrls.length; i++) {
      const varUrl = result.imageUrls[i];
      const fileName = `variation-${i + 1}-${Date.now()}`;
      const uploadResult = await uploadImageToStorage(varUrl, user.id, fileName);

      const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : varUrl;
      uploadedUrls.push(finalUrl);

      // Save each variation to database
      const saveResult = await saveGeneration({
        userId: user.id,
        prompt: `[Variation ${i + 1}/${numVariations}] ${originalGeneration?.prompt || prompt || "Image variation"}`,
        fullPrompt: `Variation with ${similarity} similarity`,
        categoryId: originalGeneration?.categoryId || "VARIATIONS",
        subcategoryId: originalGeneration?.subcategoryId || "GENERATED",
        styleId: originalGeneration?.styleId || "VARIATION",
        imageUrl: finalUrl,
        seed: seed,
      });

      if (saveResult.success && saveResult.generation?.id) {
        savedGenerations.push(saveResult.generation.id);
      }
    }

    // Deduct credits
    await deductCredit(user.id, creditsNeeded);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("VARIATIONS COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Generated: ${uploadedUrls.length} variations`);
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrls: uploadedUrls,
      numGenerated: uploadedUrls.length,
      generationIds: savedGenerations,
      similarity: similarity,
      creditsUsed: creditsNeeded,
      duration: `${duration}s`,
      message: `Generated ${uploadedUrls.length} variations and saved to gallery!`,
    });
  } catch (error) {
    console.error("[Variations] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Variation generation failed" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - Variation info
// ===========================================

export async function GET() {
  return NextResponse.json({
    maxVariations: 4,
    similarityLevels: [
      {
        id: "high",
        label: "High Similarity",
        description: "Very similar to original, minor changes",
        strength: 0.3,
      },
      {
        id: "medium",
        label: "Medium Similarity",
        description: "Balanced - keeps main features, varies details",
        strength: 0.5,
      },
      {
        id: "low",
        label: "Low Similarity",
        description: "More different, creative variations",
        strength: 0.7,
      },
    ],
    creditsPerVariation: 1,
    tips: [
      "🎨 High similarity: Perfect for color/style tweaks",
      "⚖️ Medium similarity: Best for exploring alternatives",
      "🎲 Low similarity: Great for creative exploration",
      "🔢 Generate 2-4 variations to get more options",
      "💡 Add a prompt to guide the variations",
      "🎯 Use same seed family for consistent results",
    ],
  });
}
