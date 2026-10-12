import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, checkAndDeductCredits, refundCredits } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { removeBackground } from "@/lib/runware";
import { persistImage } from "@/lib/storage";
import { safeFetchImage, safeFetchErrorResponse } from "@/lib/safe-fetch";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import { removeBackgroundSchema } from "@/lib/validations";

// Runware bg removal is capped at 20s (BG_REMOVAL_TIMEOUT in runware.ts);
// re-hosting adds up to ~30s.
export const maxDuration = 90;

// Cost: 1 credit for background removal
const REMOVE_BG_COST = 1;
const MAX_INPUT_IMAGE_MB = 10;

// Plans that have access to Remove BG (Free is excluded, but now it's auto for all generations)
// PRO = Pro plan, UNLIMITED = Studio plan, STARTER = Starter plan, LIFETIME = any lifetime deal
const ALLOWED_PLANS = ["STARTER", "PRO", "UNLIMITED", "LIFETIME"];

export async function POST(request: Request) {
  let creditsDeducted = false;
  let chargedUserId: string | null = null;

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

    const { blocked: rateLimitBlocked } = await rateLimitUserGeneration(user.id);
    if (rateLimitBlocked) return rateLimitBlocked;

    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
    }
    const parsed = validateBody(removeBackgroundSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { imageUrl, originalPrompt, categoryId, subcategoryId, styleId } = parsed.data;

    // Host allowlist / size check before charging (Runware fetches this URL).
    try {
      await safeFetchImage(imageUrl, { maxBytes: MAX_INPUT_IMAGE_MB * 1024 * 1024 });
    } catch (fetchError) {
      console.warn("[RemoveBG] Input image rejected:", fetchError instanceof Error ? fetchError.message : fetchError);
      const { error, status } = safeFetchErrorResponse(fetchError, MAX_INPUT_IMAGE_MB);
      return NextResponse.json({ error }, { status });
    }

    console.log("[RemoveBG] Removing background (Runware)");

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, REMOVE_BG_COST);
    if (!creditResult.success) {
      const insufficient = creditResult.error === "Not enough credits";
      if (!insufficient) console.error("[RemoveBG] Credit deduction failed:", creditResult.error);
      const errorMsg = insufficient
        ? `Not enough credits. Background removal costs ${REMOVE_BG_COST} credit.`
        : "Failed to process credits. Please try again.";
      return NextResponse.json(
        { error: errorMsg, noCredits: insufficient },
        { status: insufficient ? 402 : 500 }
      );
    }
    creditsDeducted = true;
    chargedUserId = user.id;

    // Use Runware for background removal
    const result = await removeBackground(imageUrl);

    if (!result.success || !result.imageUrl) {
      console.error("Background removal failed:", result.error);
      // Refund credit on failure
      creditsDeducted = false;
      await refundCredits(user.id, REMOVE_BG_COST);
      return NextResponse.json(
        { error: "Background removal failed. Credit refunded." },
        { status: 500 }
      );
    }
    // Provider delivered — no refund past this point.
    creditsDeducted = false;

    // Runware output URLs are temporary — re-host before saving to gallery.
    const persistedUrl = await persistImage(result.imageUrl, user.id, `nobg-${Date.now()}`);
    if (!persistedUrl) {
      console.error("[RemoveBG] Re-host failed — saving TEMPORARY provider URL (will expire)");
    }
    const outputUrl = persistedUrl ?? result.imageUrl;

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
    if (creditsDeducted && chargedUserId) {
      creditsDeducted = false;
      await refundCredits(chargedUserId, REMOVE_BG_COST);
    }
    return NextResponse.json(
      { error: "Background removal failed. Please try again." },
      { status: 500 }
    );
  }
}
