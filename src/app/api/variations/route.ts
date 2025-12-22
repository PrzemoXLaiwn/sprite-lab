import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getUserCredits, deductCredit, saveGeneration } from "@/lib/database";
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

    // Use SDXL img2img for variations (version hash required for predictions.create)
    const prediction = await replicate.predictions.create({
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        image: options.imageUrl,
        prompt: options.prompt || "game asset, high quality, detailed",
        negative_prompt: "blurry, low quality, distorted, watermark, text",
        num_outputs: options.numVariations,
        num_inference_steps: 30,
        guidance_scale: 7.5,
        prompt_strength: strength,
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
        // Handle both string URLs and FileOutput objects from Replicate SDK 1.0+
        imageUrls = result.output.map((item): string | null => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const obj = item as any;
            // Try .url() method first (FileOutput)
            if (typeof obj.url === "function") {
              try {
                const urlResult = obj.url();
                return typeof urlResult === "string" ? urlResult : urlResult.toString();
              } catch { /* ignore */ }
            }
            // Try String() conversion
            try {
              const str = String(obj);
              if (str.startsWith("http")) return str;
            } catch { /* ignore */ }
            // Try .url property
            if (typeof obj.url === "string") return obj.url;
          }
          return null;
        }).filter((url): url is string => url !== null && url.startsWith("http"));
      } else if (typeof result.output === "string") {
        imageUrls = [result.output];
      } else if (result.output && typeof result.output === "object") {
        // Single FileOutput object
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const obj = result.output as any;
        if (typeof obj.url === "function") {
          try {
            const url = obj.url();
            imageUrls = [typeof url === "string" ? url : url.toString()];
          } catch { /* ignore */ }
        } else {
          const str = String(obj);
          if (str.startsWith("http")) imageUrls = [str];
        }
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

// ====================================// MAIN API HANDLER
// ====================================
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
