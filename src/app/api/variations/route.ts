import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { persistImage } from "@/lib/storage";
import { safeFetchImage, safeFetchErrorResponse } from "@/lib/safe-fetch";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import { variationsSchema } from "@/lib/validations";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Vercel Pro max. Generation loop gets GENERATION_BUDGET_MS in total; the
// rest is for input validation, re-hosting, DB writes and refunds.
export const maxDuration = 300;
const GENERATION_BUDGET_MS = 200_000;
const MAX_INPUT_IMAGE_MB = 5;

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
  // Declared outside try so a mid-loop exception still returns the
  // variations that DID succeed (the caller refunds only the missing ones).
  const collectedUrls: string[] = [];
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

    // Generate variations one at a time for better quality.
    // A single overall deadline keeps the whole loop inside maxDuration so
    // partial-failure refunds always run.
    const deadline = Date.now() + GENERATION_BUDGET_MS;
    for (let i = 0; i < options.numVariations; i++) {
      if (Date.now() >= deadline) {
        console.warn(`[Variations] Time budget exhausted before variation ${i + 1}`);
        break;
      }
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
        waitTime < maxWait &&
        Date.now() < deadline
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
      } else if (result.status === "starting" || result.status === "processing") {
        // Timed out — cancel so we don't pay for output we'll never deliver.
        console.warn(`[Variations] Variation ${i + 1} timed out, cancelling`);
        try { await replicate.predictions.cancel(prediction.id); } catch { /* ignore */ }
      }
    }

    if (collectedUrls.length > 0) {
      console.log(`[Variations] Success! Generated ${collectedUrls.length} variations`);
      return { success: true, imageUrls: collectedUrls };
    }

    return { success: false, error: "No variations were generated" };
  } catch (error) {
    console.error(`[Variations] Error:`, error);
    if (collectedUrls.length > 0) {
      return { success: true, imageUrls: collectedUrls };
    }
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

    const { blocked: rateLimitBlocked } = await rateLimitUserGeneration(user.id);
    if (rateLimitBlocked) return rateLimitBlocked;

    // Parse + validate request
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = validateBody(variationsSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { imageUrl, prompt, numVariations, originalGeneration } = parsed.data;
    let { similarity } = parsed.data;
    const seed = parsed.data.seed ?? undefined;

    // Image size validation to prevent CUDA memory errors (SSRF-safe,
    // size capped while streaming; also enforces the host allowlist for the
    // URL we hand to Replicate).
    try {
      const { buffer } = await safeFetchImage(imageUrl, { maxBytes: MAX_INPUT_IMAGE_MB * 1024 * 1024 });
      console.log(`[Variations] Image size: ${(buffer.byteLength / (1024 * 1024)).toFixed(2)}MB`);
    } catch (fetchError) {
      console.warn("[Variations] Input image rejected:", fetchError instanceof Error ? fetchError.message : fetchError);
      const { error, status } = safeFetchErrorResponse(fetchError, MAX_INPUT_IMAGE_MB);
      return NextResponse.json(
        { error, imageTooLarge: status === 413 || undefined },
        { status }
      );
    }

    // Calculate credits needed (1 credit per variation)
    creditsNeeded = numVariations;

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, creditsNeeded);
    if (!creditResult.success) {
      if (creditResult.error !== "Not enough credits") {
        console.error("[Variations] Credit deduction failed:", creditResult.error);
        return NextResponse.json(
          { error: "Failed to process credits. Please try again." },
          { status: 500 }
        );
      }
      return NextResponse.json(
        {
          error: `Not enough credits. You need ${creditsNeeded} credits for ${numVariations} variations.`,
          noCredits: true,
        },
        { status: 402 }
      );
    }
    creditsDeducted = true;

    console.log("[Variations] Variation generation", {
      user: user.id,
      numVariations,
      similarity,
      promptPreview: (prompt || "default").substring(0, 80),
    });

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
        creditsDeducted = false;
        await refundCredits(userId, creditsNeeded);
      }
      return NextResponse.json(
        { error: "Variation generation failed. Credits refunded." },
        { status: 500 }
      );
    }

    // Partial success: charge only for the variations actually delivered.
    const generatedCount = result.imageUrls.length;
    const failedCount = creditsNeeded - generatedCount;
    // Provider delivered — no further full refunds past this point.
    creditsDeducted = false;
    if (failedCount > 0 && userId) {
      console.warn(`[Variations] ${failedCount}/${creditsNeeded} variations failed, refunding ${failedCount} credit(s)`);
      creditsNeeded = generatedCount;
      await refundCredits(userId, failedCount);
    }

    console.log("[Variations] Uploading to storage...");

    // Re-host all variations in parallel (provider URLs are temporary)
    const persisted = await Promise.all(
      result.imageUrls.map((varUrl, i) =>
        persistImage(varUrl, user.id, `variation-${i + 1}-${Date.now()}`)
      )
    );

    const uploadedUrls: string[] = [];
    const savedGenerations: string[] = [];

    for (let i = 0; i < result.imageUrls.length; i++) {
      const varUrl = result.imageUrls[i];
      if (!persisted[i]) {
        console.error(`[Variations] Re-host failed for variation ${i + 1} — saving TEMPORARY provider URL (will expire)`);
      }
      const finalUrl = persisted[i] ?? varUrl;
      uploadedUrls.push(finalUrl);

      // Save each variation to database
      const saveResult = await saveGeneration({
        userId: user.id,
        prompt: `[Variation ${i + 1}/${generatedCount}] ${originalGeneration?.prompt || prompt || "Image variation"}`,
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
    // Refund credits on unexpected error (only before the provider delivered)
    if (creditsDeducted && userId) {
      creditsDeducted = false;
      await refundCredits(userId, creditsNeeded);
    }
    return NextResponse.json(
      { error: "Variation generation failed. Please try again." },
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
