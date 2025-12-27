import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, checkAndDeductCredits, refundCredits } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { removeBackground } from "@/lib/runware";

// Cost: 1 credit for background removal
const REMOVE_BG_COST = 1;

// Plans that have access to Remove BG (Free is excluded, but now it's auto for all generations)
// PRO = Pro plan, UNLIMITED = Studio plan, STARTER = Starter plan, LIFETIME = any lifetime deal
const ALLOWED_PLANS = ["STARTER", "PRO", "UNLIMITED", "LIFETIME"];

export async function POST(request: Request) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Check user credits and plan
    const { credits, plan, role } = await getUserCredits(user.id);

    // Starter, Pro, Studio, and Lifetime plans can use Remove BG (admins/owners always have access)
    const hasPremiumAccess = ALLOWED_PLANS.includes(plan) || role === "OWNER" || role === "ADMIN";

    if (!hasPremiumAccess) {
      return NextResponse.json(
        { error: "Background removal is available for Starter, Pro, Studio, and Lifetime plans. Upgrade to unlock this feature!" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrl, originalPrompt, categoryId, subcategoryId, styleId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    console.log("===========================================");
    console.log("REMOVING BACKGROUND (Runware)");
    console.log("===========================================");
    console.log("Input image URL:", imageUrl);

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, REMOVE_BG_COST);
    if (!creditResult.success) {
      const errorMsg = creditResult.error === "INSUFFICIENT_CREDITS"
        ? `Not enough credits. Background removal costs ${REMOVE_BG_COST} credit.`
        : "Failed to process credits. Please try again.";
      return NextResponse.json(
        { error: errorMsg, noCredits: creditResult.error === "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    console.log(`Atomically deducted ${REMOVE_BG_COST} credit for background removal`);

    // Use Runware for background removal
    const result = await removeBackground(imageUrl);

    if (!result.success || !result.imageUrl) {
      console.error("Background removal failed:", result.error);
      // Refund credit on failure
      await refundCredits(user.id, REMOVE_BG_COST);
      return NextResponse.json(
        { error: result.error || "Background removal failed. Credit refunded." },
        { status: 500 }
      );
    }

    const outputUrl = result.imageUrl;
    console.log("Output URL (first 100 chars):", outputUrl.substring(0, 100));

    // Auto-save to user's gallery as a new generation
    let savedGenerationId: string | null = null;
    try {
      const generation = await prisma.generation.create({
        data: {
          userId: user.id,
          prompt: originalPrompt ? `[No BG] ${originalPrompt}` : "[No BG] Background removed",
          fullPrompt: originalPrompt || "Background removal",
          categoryId: categoryId || "TOOLS",
          subcategoryId: subcategoryId || "REMOVE_BG",
          styleId: styleId || "TRANSPARENT",
          imageUrl: outputUrl,
        },
      });
      savedGenerationId = generation.id;
      console.log("Auto-saved to gallery:", generation.id);
    } catch (saveError) {
      console.error("Failed to auto-save to gallery:", saveError);
      // Don't fail the request if save fails
    }

    console.log("===========================================");
    console.log("BACKGROUND REMOVAL SUCCESS! (Runware)");
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      savedToGallery: !!savedGenerationId,
      generationId: savedGenerationId,
      creditCost: REMOVE_BG_COST,
    });

  } catch (error) {
    console.error("Background removal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Background removal failed" },
      { status: 500 }
    );
  }
}
