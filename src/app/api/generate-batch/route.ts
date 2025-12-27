import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  buildUltimatePrompt,
  buildEnhancedPrompt,
} from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration, getUserTier } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";
import { generateImage, removeBackground, type RunwareModelId } from "@/lib/runware";

// Timeout for API calls (3 minutes for batch)
const API_TIMEOUT = 180000;

// Max images per batch
const MAX_BATCH_SIZE = 4;

// ===========================================
// BATCH GENERATE API
// ===========================================
// Generates multiple variations of the same prompt
// Each variation uses a different random seed

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate sprites." },
        { status: 401 }
      );
    }

    // Parse Request
    const body = await request.json();
    const {
      prompt,
      categoryId,
      subcategoryId,
      styleId = "PIXEL_ART_16",
      batchSize = 2, // Number of variations to generate
      qualityPreset = "normal",
      // Premium features
      enableStyleMix = false,
      style2Id,
      style1Weight = 70,
      colorPaletteId,
      modelId,
    } = body;

    // Validate batch size
    const actualBatchSize = Math.min(Math.max(1, batchSize), MAX_BATCH_SIZE);

    // Quality preset settings
    const QUALITY_SETTINGS: Record<string, { steps: number; guidance: number }> = {
      draft: { steps: 15, guidance: 2.5 },
      normal: { steps: 25, guidance: 3.0 },
      hd: { steps: 35, guidance: 3.5 },
    };
    const qualityConfig = QUALITY_SETTINGS[qualityPreset] || QUALITY_SETTINGS.normal;

    // Validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for your sprite." },
        { status: 400 }
      );
    }

    if (prompt.trim().length > 500) {
      return NextResponse.json(
        { error: "Description too long. Maximum 500 characters." },
        { status: 400 }
      );
    }

    if (!categoryId || !subcategoryId) {
      return NextResponse.json(
        { error: "Please select a category and type." },
        { status: 400 }
      );
    }

    // Validate category exists
    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}` },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid type: ${subcategoryId}` },
        { status: 400 }
      );
    }

    // Validate style exists
    if (!STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}` },
        { status: 400 }
      );
    }

    // Credits Check - 1 credit per image
    const CREDITS_REQUIRED = actualBatchSize;
    await getOrCreateUser(user.id, user.email!);

    // Get user tier for model selection
    const userTier = await getUserTier(user.id);
    console.log(`[Batch API] 👤 User tier: ${userTier}, batch size: ${actualBatchSize}`);

    // Atomically check and deduct credits BEFORE generation
    const creditResult = await checkAndDeductCredits(user.id, CREDITS_REQUIRED);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Not enough credits. You need ${CREDITS_REQUIRED} credits for ${actualBatchSize} images.`, noCredits: true },
        { status: 402 }
      );
    }

    // Build Prompt (with Premium Features if enabled)
    const hasPremiumFeatures = enableStyleMix || colorPaletteId;

    const { prompt: builtPrompt, negativePrompt: builtNegative, guidance: styleGuidance, steps: styleSteps } = hasPremiumFeatures
      ? buildEnhancedPrompt(
          prompt.trim(),
          categoryId,
          subcategoryId,
          styleId,
          {
            enableStyleMix,
            style2Id,
            style1Weight,
            colorPaletteId,
          }
        )
      : buildUltimatePrompt(
          prompt.trim(),
          categoryId,
          subcategoryId,
          styleId
        );

    // Use quality preset settings
    const steps = qualityConfig.steps || styleSteps;
    const guidance = qualityConfig.guidance || styleGuidance;

    console.log(`[Batch API] 🎚️ Quality: ${qualityPreset} (steps: ${steps}, guidance: ${guidance})`);
    console.log(`[Batch API] 📝 Generating ${actualBatchSize} variations...`);

    // Generate multiple images with different seeds
    let result: { success: boolean; images?: Array<{ imageURL: string; seed: number; model: string; cost: number }>; error?: string };

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Generation timed out")), API_TIMEOUT);
      });

      result = await Promise.race([
        generateImage(
          {
            prompt: builtPrompt,
            negativePrompt: builtNegative,
            model: modelId as RunwareModelId | undefined,
            steps,
            guidance,
            width: 1024,
            height: 1024,
            numberOfImages: actualBatchSize, // Generate multiple images
          },
          userTier
        ),
        timeoutPromise
      ]);
    } catch (error) {
      // Refund credits on timeout or error
      console.log("[Batch API] ⚠️ Generation failed, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      return NextResponse.json(
        { error: errorMessage },
        { status: 500 }
      );
    }

    if (!result.success || !result.images || result.images.length === 0) {
      console.log("[Batch API] ⚠️ Generation returned no images, refunding credits...");
      await refundCredits(user.id, CREDITS_REQUIRED);

      return NextResponse.json(
        { error: result.error || "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    // Process each generated image
    const processedImages: Array<{
      imageUrl: string;
      seed: number;
      model: string;
    }> = [];

    // Refund credits for any missing images
    const actualImagesGenerated = result.images.length;
    if (actualImagesGenerated < actualBatchSize) {
      const refundAmount = actualBatchSize - actualImagesGenerated;
      console.log(`[Batch API] ⚠️ Only ${actualImagesGenerated}/${actualBatchSize} images generated, refunding ${refundAmount} credits`);
      await refundCredits(user.id, refundAmount);
    }

    // Process each image (remove background, upload, save)
    for (let i = 0; i < result.images.length; i++) {
      const generatedImage = result.images[i];
      console.log(`[Batch API] 🔪 Processing image ${i + 1}/${result.images.length}...`);

      // Remove background (with graceful fallback)
      let imageUrlForUpload = generatedImage.imageURL;
      try {
        const bgRemovalResult = await removeBackground(generatedImage.imageURL);
        if (bgRemovalResult.success && bgRemovalResult.imageUrl) {
          imageUrlForUpload = bgRemovalResult.imageUrl;
          console.log(`[Batch API] ✅ Background removed for image ${i + 1}`);
        } else {
          console.log(`[Batch API] ⚠️ Background removal returned no result for image ${i + 1}, using original`);
        }
      } catch (bgError) {
        console.log(`[Batch API] ⚠️ Background removal failed for image ${i + 1}:`, bgError instanceof Error ? bgError.message : "Unknown error");
        // Continue with original image - don't fail the whole request
      }

      // Upload to storage
      const fileName = `sprite-batch-${categoryId}-${subcategoryId}-${styleId}-${generatedImage.seed}`;
      const uploadResult = await uploadImageToStorage(imageUrlForUpload, user.id, fileName);
      const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : imageUrlForUpload;

      // Save to database
      await saveGeneration({
        userId: user.id,
        prompt: prompt.trim(),
        fullPrompt: builtPrompt,
        categoryId,
        subcategoryId,
        styleId,
        imageUrl: finalUrl,
        seed: generatedImage.seed,
        replicateCost: generatedImage.cost,
      });

      processedImages.push({
        imageUrl: finalUrl,
        seed: generatedImage.seed,
        model: generatedImage.model,
      });
    }

    // Final Stats
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    const styleConfig = STYLES_2D_FULL[styleId];

    console.log("\n" + "═".repeat(70));
    console.log("🎉 BATCH GENERATION COMPLETE!");
    console.log("═".repeat(70));
    console.log("⏱️  Duration:", duration + "s");
    console.log("📦 Images:", processedImages.length);
    console.log("🎨 Style:", styleConfig.name);
    console.log("═".repeat(70) + "\n");

    // Return Success Response
    return NextResponse.json({
      success: true,
      images: processedImages,
      batchSize: processedImages.length,
      prompt: prompt.trim(),
      fullPrompt: builtPrompt,
      style: {
        id: styleId,
        name: styleConfig.name,
      },
      category: {
        id: category.id,
        name: category.name,
      },
      subcategory: {
        id: subcategory.id,
        name: subcategory.name,
      },
      creditsUsed: processedImages.length,
      duration: `${duration}s`,
    });

  } catch (error) {
    console.error("[Batch API] ❌ Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
