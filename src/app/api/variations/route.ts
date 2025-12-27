import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ====================================// VARIATION GENERATION
// ====================================
interface VariationOptions {
  imageUrl: string;
  prompt?: string;
  numVariations: number;
  similarity: "low" | "medium" | "high";
  seed?: number;
}

/**
 * Generate variations of an existing image
 * Uses FLUX 1.1 Pro for better prompt adherence and quality variations
 */
async function generateVariations(
  options: VariationOptions
): Promise<{ success: boolean; imageUrls?: string[]; error?: string }> {
  try {
    console.log("[Variations] Starting generation...");
    console.log("[Variations] Num variations:", options.numVariations);
    console.log("[Variations] Similarity:", options.similarity);
    console.log("[Variations] User prompt:", options.prompt);

    // Map similarity to strength (higher = more change from original)
    const strengthMap = {
      high: 0.35, // Very similar to original
      medium: 0.55, // Balanced
      low: 0.75, // More different/creative
    };

    const strength = strengthMap[options.similarity];
    const collectedUrls: string[] = [];

    // Generate variations one at a time for better quality
    for (let i = 0; i < options.numVariations; i++) {
      console.log(`[Variations] Generating variation ${i + 1}/${options.numVariations}...`);

      // Use FLUX 1.1 Pro with image input for img2img style variations
      // This model respects prompts much better than SDXL
      const prediction = await replicate.predictions.create({
        model: "black-forest-labs/flux-1.1-pro",
        input: {
          image: options.imageUrl,
          prompt: options.prompt || "game asset, high quality, detailed",
          prompt_strength: strength,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 95,
          seed: options.seed ? options.seed + i : undefined,
        },
      });

      // Wait for completion
      let result = await replicate.predictions.get(prediction.id);
      let waitTime = 0;
      const maxWait = 120; // 2 minutes per variation

      while (
        (result.status === "starting" || result.status === "processing") &&
        waitTime < maxWait
      ) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        result = await replicate.predictions.get(prediction.id);
        waitTime += 2;

        if (waitTime % 15 === 0) {
          console.log(`[Variations] Variation ${i + 1} processing... ${waitTime}s`);
        }
      }

      if (result.status === "succeeded" && result.output) {
        const url = extractImageUrl(result.output);
        if (url) {
          collectedUrls.push(url);
          console.log(`[Variations] Variation ${i + 1} complete!`);
        }
      } else if (result.status === "failed") {
        console.error(`[Variations] Variation ${i + 1} failed:`, result.error);
      }
    }

    if (collectedUrls.length > 0) {
      console.log(`[Variations] Success! Generated ${collectedUrls.length} variations`);
      return { success: true, imageUrls: collectedUrls };
    }

    return { success: false, error: "No variations were generated" };
  } catch (error) {
    console.error(`[Variations] Error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Helper to extract URL from Replicate output
function extractImageUrl(output: unknown): string | null {
  // Handle array output
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string" && first.startsWith("http")) return first;
    if (first && typeof first === "object") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const obj = first as any;
      if (typeof obj.url === "function") {
        try {
          const url = obj.url();
          if (typeof url === "string" && url.startsWith("http")) return url;
        } catch { /* ignore */ }
      }
      const str = String(obj);
      if (str.startsWith("http")) return str;
      if (typeof obj.url === "string") return obj.url;
    }
  }
  // Handle direct string
  if (typeof output === "string" && output.startsWith("http")) return output;
  // Handle single object
  if (output && typeof output === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const obj = output as any;
    if (typeof obj.url === "function") {
      try {
        const url = obj.url();
        if (typeof url === "string" && url.startsWith("http")) return url;
      } catch { /* ignore */ }
    }
    const str = String(obj);
    if (str.startsWith("http")) return str;
  }
  return null;
}

// ====================================// MAIN API HANDLER
// ====================================
export async function POST(request: Request) {
  const startTime = Date.now();
  let creditsDeducted = false;
  let userId: string | null = null;
  let creditsNeeded = 0;

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

    userId = user.id;

    // Parse request
    const body = await request.json();
    let {
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

    // Image size validation to prevent CUDA memory errors
    // SDXL img2img can handle max ~1024x1024 safely
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageSizeMB = imageBuffer.byteLength / (1024 * 1024);

      console.log(`[Variations] Image size: ${imageSizeMB.toFixed(2)}MB`);

      // If image is too large (>5MB or likely >1024x1024), warn user
      if (imageSizeMB > 5) {
        return NextResponse.json(
          {
            error: "Image too large for variations (max 5MB or 1024x1024 pixels). Please use a smaller image or upscale feature first.",
            imageTooLarge: true
          },
          { status: 400 }
        );
      }
    } catch (sizeError) {
      console.warn("[Variations] Could not validate image size:", sizeError);
      // Continue anyway - size check is not critical
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
    creditsNeeded = numVariations;

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, creditsNeeded);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Not enough credits. You need ${creditsNeeded} credits for ${numVariations} variations.`,
          noCredits: true,
        },
        { status: 402 }
      );
    }
    creditsDeducted = true;

    console.log("===========================================");
    console.log("VARIATION GENERATION");
    console.log("===========================================");
    console.log("User:", user.id);
    console.log("Num Variations:", numVariations);
    console.log("Similarity:", similarity);
    console.log("Prompt:", prompt || "default");
    console.log("Input URL:", imageUrl);

    // Build enhanced prompt for variations
    let enhancedPrompt = prompt || originalGeneration?.prompt || "game asset, high quality, detailed";
    
    // Detect specific part changes (roof, walls, etc.)
    const partKeywords = {
      roof: ['roof', 'dach', 'top'],
      walls: ['walls', 'wall', 'ściany', 'ściana'],
      door: ['door', 'drzwi'],
      window: ['window', 'okno'],
    };
    
    let specificPart = null;
    for (const [part, keywords] of Object.entries(partKeywords)) {
      if (keywords.some(kw => enhancedPrompt.toLowerCase().includes(kw))) {
        specificPart = part;
        break;
      }
    }
    
    // Detect color change requests
    const colorKeywords = ['yellow', 'gold', 'golden', 'blue', 'red', 'green', 'purple', 'pink', 'orange', 'white', 'black', 'silver', 'bronze', 'cyan', 'magenta', 'stone', 'wooden', 'wood', 'żółty', 'złoty', 'niebieski', 'czerwony', 'zielony', 'fioletowy', 'różowy', 'pomarańczowy', 'biały', 'czarny', 'srebrny', 'kamienny', 'drewniany'];
    const hasColorRequest = colorKeywords.some(color => enhancedPrompt.toLowerCase().includes(color));
    
    if (hasColorRequest || specificPart) {
      // For specific changes, use lower similarity to allow more variation
      if (similarity === "high") {
        similarity = "medium";
        console.log("Specific change detected - adjusting similarity from high to medium");
      }
      
      // Build more specific prompt
      if (specificPart && hasColorRequest) {
        // Extract the color/material from prompt
        const colorMatch = colorKeywords.find(color => enhancedPrompt.toLowerCase().includes(color));
        enhancedPrompt = `${enhancedPrompt}, ONLY change the ${specificPart} to ${colorMatch}, keep everything else exactly the same, focus on ${specificPart} modification`;
      } else if (hasColorRequest) {
        enhancedPrompt = `${enhancedPrompt}, emphasize the color change, vibrant colors, accurate color representation`;
      }
    }
    
    console.log("Enhanced prompt:", enhancedPrompt);
    console.log("Adjusted similarity:", similarity);

    // Generate variations
    const result = await generateVariations({
      imageUrl,
      prompt: enhancedPrompt,
      numVariations,
      similarity,
      seed,
    });

    if (!result.success || !result.imageUrls || result.imageUrls.length === 0) {
      console.error("[Variations] Failed:", result.error);
      // Refund credits on failure
      if (creditsDeducted && userId) {
        console.log("[Variations] Generation failed, refunding credits...");
        await refundCredits(userId, creditsNeeded);
        creditsDeducted = false;
      }
      return NextResponse.json(
        { error: result.error || "Variation generation failed. Credits refunded." },
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

    // Credits already deducted atomically at the beginning

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
    // Refund credits on unexpected error
    if (creditsDeducted && userId) {
      await refundCredits(userId, creditsNeeded);
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Variation generation failed. Credits refunded." },
      { status: 500 }
    );
  }
}

// ====================================// GET - Variation info
// ====================================
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
