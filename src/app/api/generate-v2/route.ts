import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildPrompt } from "@/lib/generate";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration, getUserTier } from "@/lib/database";
import { uploadToR2, isR2Configured } from "@/lib/r2";
import { uploadImageToStorage } from "@/lib/storage";
import { generateImage, removeBackground } from "@/lib/runware";

// ===========================================
// GENERATE V2 - SIMPLIFIED API
// ===========================================

const CREDITS_PER_GENERATION = 1;

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate assets." },
        { status: 401 }
      );
    }

    // 2. Parse Request
    const body = await request.json();
    const { prompt, categoryId, styleId, seed } = body;

    // 3. Validate
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for your asset." },
        { status: 400 }
      );
    }

    if (!categoryId || !styleId) {
      return NextResponse.json(
        { error: "Please select a category and style." },
        { status: 400 }
      );
    }

    // 4. Build prompt
    let builtPrompt;
    try {
      builtPrompt = buildPrompt({
        categoryId,
        styleId,
        userPrompt: prompt.trim(),
      });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Invalid parameters" },
        { status: 400 }
      );
    }

    // 5. Check credits
    await getOrCreateUser(user.id, user.email!);
    const userTier = await getUserTier(user.id);
    const creditResult = await checkAndDeductCredits(user.id, CREDITS_PER_GENERATION);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: "Not enough credits.", noCredits: true },
        { status: 402 }
      );
    }

    // 6. Generate seed
    const usedSeed = seed && !isNaN(Number(seed))
      ? Number(seed)
      : Math.floor(Math.random() * 2147483647);

    // 7. Determine size based on style
    // For pixel art, use smaller sizes to get actual visible pixels
    const isPixelArt = styleId.startsWith("pixel");
    let width = builtPrompt.category.defaultSize.width;
    let height = builtPrompt.category.defaultSize.height;

    if (isPixelArt) {
      // Pixel art works better with smaller output sizes
      // This forces the AI to create actual pixel-style graphics
      width = 256;
      height = 256;
    }

    // 8. Generate image
    console.log(`[Generate V2] 🎨 Generating: ${builtPrompt.prompt.substring(0, 80)}...`);
    console.log(`[Generate V2] Size: ${width}x${height}, Style: ${styleId}`);

    const result = await generateImage(
      {
        prompt: builtPrompt.prompt,
        seed: usedSeed,
        width,
        height,
        steps: isPixelArt ? 30 : 25, // More steps for pixel art detail
        guidance: isPixelArt ? 4.0 : 3.5, // Higher guidance for pixel art
      },
      userTier
    );

    if (!result.success || !result.images || result.images.length === 0) {
      console.log("[Generate V2] ⚠️ Generation failed, refunding credits...");
      await refundCredits(user.id, CREDITS_PER_GENERATION);
      return NextResponse.json(
        { error: result.error || "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const generatedImage = result.images[0];

    // 9. Remove background (skip for pixel art to preserve crisp edges)
    console.log("[Generate V2] 🔪 Removing background...");
    let finalImageUrl = generatedImage.imageURL;

    try {
      const bgResult = await removeBackground(generatedImage.imageURL);
      if (bgResult.success && bgResult.imageUrl) {
        finalImageUrl = bgResult.imageUrl;
        console.log("[Generate V2] ✅ Background removed");
      }
    } catch (bgError) {
      console.log("[Generate V2] ⚠️ Background removal failed, using original");
    }

    // 9. Upload to storage
    console.log("[Generate V2] 📤 Uploading to storage...");
    let storedUrl = finalImageUrl;
    let storageUsed = "temporary";

    if (isR2Configured()) {
      const r2Result = await uploadToR2(finalImageUrl, user.id);
      if (r2Result.success && r2Result.url) {
        storedUrl = r2Result.url;
        storageUsed = "R2";
      }
    } else {
      const fileName = `asset-${categoryId}-${styleId}-${usedSeed}`;
      const supabaseResult = await uploadImageToStorage(finalImageUrl, user.id, fileName);
      if (supabaseResult.success && supabaseResult.url) {
        storedUrl = supabaseResult.url;
        storageUsed = "Supabase";
      }
    }

    // 10. Save to database
    await saveGeneration({
      userId: user.id,
      prompt: prompt.trim(),
      fullPrompt: builtPrompt.prompt,
      categoryId,
      subcategoryId: categoryId, // Use category as subcategory for simplicity
      styleId,
      imageUrl: storedUrl,
      seed: generatedImage.seed,
      replicateCost: generatedImage.cost,
    });

    // 11. Return success
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[Generate V2] ✅ Done in ${duration}s - ${storageUsed}`);

    return NextResponse.json({
      success: true,
      imageUrl: storedUrl,
      seed: generatedImage.seed,
      prompt: prompt.trim(),
      category: builtPrompt.category.name,
      style: builtPrompt.style.name,
      duration: `${duration}s`,
      creditsUsed: CREDITS_PER_GENERATION,
    });

  } catch (error) {
    console.error("[Generate V2] ❌ Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong." },
      { status: 500 }
    );
  }
}
