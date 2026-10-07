import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndDeductCredits, refundCredits } from "@/lib/db/credits";
import { saveGeneration } from "@/lib/db/generations";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { safeFetchImage } from "@/lib/safe-fetch";
import { uploadGenerationBufferToR2 } from "@/lib/r2";
import { makeAnimation } from "@/lib/services/animation-service";
import {
  animationAnchor,
  animationCredits,
  animationFrameOption,
  animationPresetsFor,
  MOTION_ANCHORS,
  type MotionAnchor,
} from "@/config/animations";

/** Anchor implied by a free-text motion ("flying dog" keeps its height). */
function anchorFromText(text: string): MotionAnchor | null {
  if (/\b(fly|flies|flying|float|hover|levitat|jump|hop|bounce|leap|swim|soar|take ?off)\w*/i.test(text)) return "air";
  if (/\b(spin|rotat|twirl|glow|pulse|shine|sparkle)\w*/i.test(text)) return "center";
  if (/\b(dash|charge|lunge|knock ?back|shake|thrust|slide|recoil)\w*/i.test(text)) return "cell";
  return null;
}

/** Motions that cycle; the rest (attack, hurt, jump…) are one-shots. */
const LOOPING = new Set(["idle", "walk", "run", "fly", "float", "spin", "glow", "shake"]);

// Planner (≤45s) + key frames + in-betweens (≤150s each, ~20–40s typical) + processing, upload, refund
export const maxDuration = 300;

/**
 * POST /api/animate
 * { generationId, action, customMotion?, frames? } → animate one of the user's sprites.
 * action = preset id for the sprite's category, or "custom" with customMotion.
 * frames = 4 | 6 | 9 (credits scale with it); smooth = true adds AI in-betweens (2× frames, 2× credits).
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const { blocked } = await rateLimitUserGeneration(user.id);
  if (blocked) return blocked;

  const body = await request.json().catch(() => null);
  const generationId = typeof body?.generationId === "string" ? body.generationId.slice(0, 64) : null;
  const action = typeof body?.action === "string" ? body.action.slice(0, 32) : null;
  const customMotion = typeof body?.customMotion === "string" ? body.customMotion.trim().slice(0, 300) : "";
  const option = animationFrameOption(typeof body?.frames === "number" ? body.frames : null);
  const smooth = body?.smooth === true;
  if (!generationId || !action) {
    return NextResponse.json({ error: "Pick a sprite and an animation." }, { status: 400 });
  }

  const source = await prisma.generation.findFirst({
    where: { id: generationId, userId: user.id },
    select: { id: true, imageUrl: true, prompt: true, styleId: true, categoryId: true, subcategoryId: true, projectId: true, folderId: true },
  });
  if (!source) return NextResponse.json({ error: "Sprite not found." }, { status: 404 });
  if (source.subcategoryId === "ANIMATION") {
    return NextResponse.json({ error: "Pick a single sprite, not an animation sheet." }, { status: 400 });
  }

  let motion: string;
  let loop: boolean;
  let label = action;
  // How frames line up (feet on a baseline, keep jump height, keep thrust…)
  const requestedAnchor = MOTION_ANCHORS.includes(body?.anchor) ? (body.anchor as MotionAnchor) : null;
  let anchor: MotionAnchor = requestedAnchor ?? animationAnchor(source.categoryId);
  if (action === "custom") {
    if (customMotion.length < 3) {
      return NextResponse.json({ error: "Describe how it should move." }, { status: 400 });
    }
    motion = `Custom motion requested by the user: ${customMotion}`;
    loop = !/\b(attack|hit|strike|slash|jump|die|death|explode|crash|open|throw|shoot|cast)\w*/i.test(customMotion);
    if (!requestedAnchor) anchor = anchorFromText(customMotion) ?? anchor;
  } else if (action.startsWith("ai-")) {
    // A motion suggested for this sprite by /api/animate/suggest (sent back verbatim)
    if (customMotion.length < 8) return NextResponse.json({ error: "Pick an animation." }, { status: 400 });
    motion = `${typeof body?.label === "string" ? body.label.slice(0, 24) + ": " : ""}${customMotion}`;
    loop = body?.loop === true;
    label = (typeof body?.label === "string" ? body.label.slice(0, 24).toLowerCase() : action.slice(3)).replace(/[[\]]/g, "");
  } else {
    const preset = animationPresetsFor(source.categoryId).find((p) => p.id === action);
    if (!preset) return NextResponse.json({ error: "That animation isn't available for this sprite." }, { status: 400 });
    motion = preset.motion;
    loop = preset.loop ?? LOOPING.has(action);
    anchor = preset.anchor ?? anchor;
  }
  const pixel = (source.styleId ?? "").toUpperCase().includes("PIXEL");

  // Reference: the sprite flattened onto white (the model draws on white too)
  let reference: Buffer;
  try {
    const { buffer } = await safeFetchImage(source.imageUrl, { maxBytes: 10 * 1024 * 1024 });
    reference = await sharp(buffer)
      .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 }, kernel: pixel ? "nearest" : "lanczos3" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
  } catch {
    return NextResponse.json({ error: "Couldn't load this sprite." }, { status: 400 });
  }

  // Smooth motion = a second image pass drawing in-betweens → twice the frames, twice the credits
  const credits = animationCredits(option.frames, smooth);
  const charged = await checkAndDeductCredits(user.id, credits);
  if (!charged.success) {
    const insufficient = charged.error === "Not enough credits";
    return NextResponse.json(
      { error: insufficient ? `This animation costs ${credits} credits.` : "Couldn't process credits.", noCredits: insufficient || undefined },
      { status: insufficient ? 402 : 500 }
    );
  }

  try {
    const { anim, plan, prompt, cost, smoothed } = await makeAnimation({
      reference,
      prompt: source.prompt,
      categoryId: source.categoryId,
      motion,
      frames: option.frames,
      smooth,
      pixel,
      anchor,
      loop,
      tile: (source.categoryId ?? "").toUpperCase() === "TILESETS",
    });
    // The in-between pass didn't line up — the user got key frames only
    if (smooth && !smoothed) await refundCredits(user.id, credits - option.credits);

    const [sheet, gif] = await Promise.all([
      uploadGenerationBufferToR2(anim.sheetPng, user.id, "png"),
      uploadGenerationBufferToR2(anim.gif, user.id, "gif"),
    ]);
    if (!sheet.success || !sheet.url) throw new Error(`sheet upload failed: ${sheet.error}`);

    const saved = await saveGeneration({
      userId: user.id,
      prompt: `[Animation: ${label}, ${anim.frameCount}f] ${source.prompt}`.slice(0, 1000),
      fullPrompt: prompt,
      categoryId: source.categoryId,
      subcategoryId: "ANIMATION",
      styleId: source.styleId,
      imageUrl: sheet.url,
      replicateCost: cost,
      projectId: source.projectId ?? undefined,
      folderId: source.folderId ?? undefined,
    });

    return NextResponse.json({
      success: true,
      sheetUrl: sheet.url,
      gifUrl: gif.success ? gif.url : null,
      frameCount: anim.frameCount,
      frameWidth: anim.frameWidth,
      frameHeight: anim.frameHeight,
      bodyType: plan.bodyType,
      generationId: saved.success && "generation" in saved && saved.generation ? saved.generation.id : undefined,
      smoothed,
      creditsUsed: smooth && !smoothed ? option.credits : credits,
    });
  } catch (err) {
    console.error("[Animate] Failed:", err instanceof Error ? err.message : err);
    await refundCredits(user.id, credits);
    return NextResponse.json({ error: "Animation failed — your credits were refunded. Please try again." }, { status: 502 });
  }
}
