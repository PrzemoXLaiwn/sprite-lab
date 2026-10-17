import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits } from "@/lib/database";
import { prisma } from "@/lib/prisma";
import { removeBackground } from "@/lib/runware";
import { persistImage } from "@/lib/storage";
import { safeFetchImage, safeFetchErrorResponse } from "@/lib/safe-fetch";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import { removeBackgroundSchema } from "@/lib/validations";
import { REMOVE_BG_CREDITS } from "@/config/tool-prices";
import { budgetPlan, requestIp, startOperation, type OpHandle } from "@/lib/billing/operations";

// Runware bg removal is capped at 20s (BG_REMOVAL_TIMEOUT in runware.ts);
// re-hosting adds up to ~30s.
export const maxDuration = 90;

// Cost: 1 credit for background removal
const REMOVE_BG_COST = REMOVE_BG_CREDITS;
const MAX_INPUT_IMAGE_MB = 10;

// Plans that have access to Remove BG (Free is excluded, but now it's auto for all generations)
// PRO = Pro plan, UNLIMITED = Studio plan, STARTER = Starter plan, LIFETIME = any lifetime deal
const ALLOWED_PLANS = ["STARTER", "PRO", "UNLIMITED", "LIFETIME"];

export async function POST(request: Request) {
  // Paid operation; null once the result is stored (no refund from then on)
  let pendingOp: OpHandle | null = null;

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

    // Check user plan
    const { plan, role } = await getUserCredits(user.id);

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

    // Charge + guards in one operation; every failure below refunds it once
    const account = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true, totalSpent: true, stripeCustomerId: true } });
    const started = await startOperation({
      userId: user.id, feature: "remove_bg", credits: REMOVE_BG_COST, plan: budgetPlan(account), ip: requestIp(request),
      input: { imageUrl },
    });
    if (!started.ok) {
      const body = started.status === 402
        ? { ...started.body, error: `Not enough credits. Background removal costs ${REMOVE_BG_COST} credit.` }
        : started.body;
      return NextResponse.json(body, { status: started.status });
    }
    const op = started.op;
    pendingOp = op;

    const result = await op.run(() => removeBackground(imageUrl));
    if (!result.success || !result.imageUrl) {
      console.error("Background removal failed:", result.error);
      pendingOp = null;
      await op.fail("PROVIDER_ERROR");
      return NextResponse.json(
        { error: "Background removal failed. Credit refunded." },
        { status: 500 }
      );
    }

    // Runware output URLs are temporary: the result only counts as delivered
    // once it is stored on our side.
    const outputUrl = await persistImage(result.imageUrl, user.id, `nobg-${Date.now()}`);
    if (!outputUrl) {
      console.error("[RemoveBG] Re-host failed — refunding");
      pendingOp = null;
      await op.fail("STORE_FAILED");
      return NextResponse.json(
        { error: "Couldn't save the result. Credit refunded — please try again." },
        { status: 500 }
      );
    }
    pendingOp = null; // delivered (stored) — no refund from here on

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
    } catch (saveError) {
      // The stored image is still returned to the user
      console.error("Failed to auto-save to gallery:", saveError);
    }
    await op.succeed(savedGenerationId);

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      savedToGallery: !!savedGenerationId,
      generationId: savedGenerationId,
      creditCost: REMOVE_BG_COST,
    });

  } catch (error) {
    console.error("Background removal error:", error);
    if (pendingOp) {
      const op = pendingOp;
      pendingOp = null;
      await op.fail("UNEXPECTED");
    }
    return NextResponse.json(
      { error: "Background removal failed. Please try again." },
      { status: 500 }
    );
  }
}
