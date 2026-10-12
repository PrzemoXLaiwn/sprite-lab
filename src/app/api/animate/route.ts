import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { startOperation, requestIp } from "@/lib/billing/operations";
import { animationFeature } from "@/lib/billing/features";
import { saveGeneration } from "@/lib/db/generations";
import { rateLimitUserGeneration } from "@/lib/rate-limit";
import { safeFetchImage } from "@/lib/safe-fetch";
import { uploadGenerationBufferToR2 } from "@/lib/r2";
import { makeAnimation, makeRotation } from "@/lib/services/animation-service";
import { makeRigAnimation } from "@/lib/image/rig-animation";
import { makeSkeletonAnimation, makeSkeletonIdle } from "@/lib/image/skeleton-rig";
import {
  animationAnchor,
  animationCredits,
  animationFrameOption,
  animationPresetsFor,
  MOTION_ANCHORS,
  DIRECTION_KEYS,
  rotationFor,
  supportsRotation,
  RIG_CREDITS,
  RIG_FRAMES,
  rigMotionFor,
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
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { plan: true } });
  const plan = account?.plan ?? "FREE";
  const ip = requestIp(request);
  const opInput = { generationId, action, customMotion, frames: option.frames, smooth };
  if (source.subcategoryId === "ANIMATION") {
    return NextResponse.json({ error: "Pick a single sprite, not an animation sheet." }, { status: 400 });
  }

  // Directional views (4 / 8 directions) — their own one-pass pipeline
  const rotation = rotationFor(action);
  if (rotation) {
    if (!supportsRotation(source.categoryId)) return NextResponse.json({ error: "Directions are available for characters and creatures." }, { status: 400 });
    const pixelR = (source.styleId ?? "").toUpperCase().includes("PIXEL");
    let referenceR: Buffer;
    try {
      const { buffer } = await safeFetchImage(source.imageUrl, { maxBytes: 10 * 1024 * 1024 });
      referenceR = await sharp(buffer)
        .resize(512, 512, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 }, kernel: pixelR ? "nearest" : "lanczos3" })
        .flatten({ background: "#ffffff" }).png().toBuffer();
    } catch {
      return NextResponse.json({ error: "Couldn't load this sprite." }, { status: 400 });
    }
    const started = await startOperation({ userId: user.id, feature: rotation.id as "rotate4" | "rotate8" | "walk4dir", credits: rotation.credits, plan, input: opInput, ip });
    if (!started.ok) return NextResponse.json(started.body, { status: started.status });
    const op = started.op;
    try {
      const { anim, prompt: rPrompt, cost } = await op.run(() => makeRotation({ reference: referenceR, prompt: source.prompt, pixel: pixelR, rotation }));
      const [sheet, gif] = await Promise.all([
        uploadGenerationBufferToR2(anim.sheetPng, user.id, "png"),
        uploadGenerationBufferToR2(anim.gif, user.id, "gif"),
      ]);
      if (!sheet.success || !sheet.url) throw new Error(`sheet upload failed: ${sheet.error}`);
      const saved = await saveGeneration({
        userId: user.id,
        prompt: `[Animation: ${rotation.kind === "walk" ? "4-direction walk" : `${rotation.directions} directions`}, ${anim.frameCount}f] ${source.prompt}`.slice(0, 1000),
        fullPrompt: rPrompt,
        categoryId: source.categoryId,
        subcategoryId: "ANIMATION",
        styleId: source.styleId,
        imageUrl: sheet.url,
        replicateCost: cost,
        projectId: source.projectId ?? undefined,
        folderId: source.folderId ?? undefined,
      });
      const savedId = saved.success && "generation" in saved && saved.generation ? saved.generation.id : undefined;
      await op.succeed(savedId);
      return NextResponse.json({
        success: true,
        sheetUrl: sheet.url,
        gifUrl: gif.success ? gif.url : null,
        frameCount: anim.frameCount,
        frameWidth: anim.frameWidth,
        frameHeight: anim.frameHeight,
        generationId: savedId,
      // Lets the client link the animation back to its sprite
      sourceGenerationId: source.id,
        smoothed: false,
        fps: rotation.kind === "walk" ? 6 : 2,
        directions: DIRECTION_KEYS[rotation.directions],
        // Walk sets come as a grid: one row per direction
        sheetCols: rotation.kind === "walk" ? rotation.cols : undefined,
        creditsUsed: rotation.credits,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Rotate] Failed:", msg);
      await op.fail(/insufficientCredits|insufficient credits|top-up/i.test(msg) ? "PROVIDER_BALANCE" : "ROTATION_FAILED");
      if (/insufficientCredits|insufficient credits|top-up/i.test(msg)) {
        return NextResponse.json({ error: "Directions are paused for a short while — your credits were refunded." }, { status: 503 });
      }
      return NextResponse.json({ error: "Couldn't draw the directions — your credits were refunded. Please try again." }, { status: 502 });
    }
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
  const isTile = (source.categoryId ?? "").toUpperCase() === "TILESETS";

  // Idle / breathing / hover: deform the original sprite instead of redrawing
  // every frame — no flicker in colour, size or detail
  const rig = !isTile && action !== "custom" ? rigMotionFor(action, typeof body?.label === "string" ? body.label : undefined) : null;
  // Pixel-art bipeds also walk as a whole-pixel cut-out from the original
  // sprite (no per-frame redraw); anything that can't be rigged uses the AI
  let pixelWalk: Awaited<ReturnType<typeof makeSkeletonAnimation>> = null;
  if (!rig && pixel && !isTile && action !== "custom" && /walk/i.test(`${action} ${typeof body?.label === "string" ? body.label : ""}`)) {
    try {
      const { buffer } = await safeFetchImage(source.imageUrl, { maxBytes: 10 * 1024 * 1024 });
      pixelWalk = await makeSkeletonAnimation(buffer, { pixel: true, motion: "walk" });
    } catch { /* fall through to the AI walk */ }
  }
  if (rig || pixelWalk) {
    const started = await startOperation({ userId: user.id, feature: "rig", credits: RIG_CREDITS, plan, input: opInput, ip });
    if (!started.ok) return NextResponse.json(started.body, { status: started.status });
    const op = started.op;
    try {
      const { buffer } = await safeFetchImage(source.imageUrl, { maxBytes: 10 * 1024 * 1024 });
      // Bipeds get a real skeleton (weight shift, arms, head, tail); anything the
      // rigger can't read falls back to gentle breathing / hovering
      const anim = await op.run(async () => pixelWalk
        ?? (rig === "breathe" ? await makeSkeletonIdle(buffer, { pixel, frames: RIG_FRAMES }) : null)
        ?? await makeRigAnimation(buffer, { kind: rig ?? "breathe", pixel, frames: RIG_FRAMES }));
      const [sheet, gif] = await Promise.all([
        uploadGenerationBufferToR2(anim.sheetPng, user.id, "png"),
        uploadGenerationBufferToR2(anim.gif, user.id, "gif"),
      ]);
      if (!sheet.success || !sheet.url) throw new Error(`sheet upload failed: ${sheet.error}`);
      const saved = await saveGeneration({
        userId: user.id,
        prompt: `[Animation: ${label}, ${anim.frameCount}f] ${source.prompt}`.slice(0, 1000),
        fullPrompt: `rig:${rig}`,
        categoryId: source.categoryId,
        subcategoryId: "ANIMATION",
        styleId: source.styleId,
        imageUrl: sheet.url,
        replicateCost: 0,
        projectId: source.projectId ?? undefined,
        folderId: source.folderId ?? undefined,
      });
      const savedId = saved.success && "generation" in saved && saved.generation ? saved.generation.id : undefined;
      await op.succeed(savedId);
      return NextResponse.json({
        success: true,
        sheetUrl: sheet.url,
        gifUrl: gif.success ? gif.url : null,
        frameCount: anim.frameCount,
        frameWidth: anim.frameWidth,
        frameHeight: anim.frameHeight,
        generationId: savedId,
        // Lets the client link the animation back to its sprite
        sourceGenerationId: source.id,
        smoothed: false,
        rigged: true,
        fps: anim.fps ?? 12,
        creditsUsed: RIG_CREDITS,
      });
    } catch (err) {
      console.error("[Animate] Rig failed:", err instanceof Error ? err.message : err);
      await op.fail("RIG_FAILED");
      return NextResponse.json({ error: "Animation failed — your credits were refunded. Please try again." }, { status: 502 });
    }
  }

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
  const started = await startOperation({ userId: user.id, feature: isTile ? "tile_anim" : animationFeature(option.frames, smooth), credits, plan, input: opInput, ip });
  if (!started.ok) return NextResponse.json(started.body, { status: started.status });
  const op = started.op;

  try {
    const { anim, plan: motionPlan, prompt, cost, smoothed } = await op.run(() => makeAnimation({
      reference,
      prompt: source.prompt,
      categoryId: source.categoryId,
      motion,
      frames: option.frames,
      smooth,
      pixel,
      anchor,
      loop,
      tile: isTile,
    }));
    // The in-between pass didn't line up — the user got key frames only
    // (idempotent: an operation never refunds more than it charged)
    if (smooth && !smoothed) await op.refund(credits - option.credits, "smooth_pass_unavailable");

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
    const savedId = saved.success && "generation" in saved && saved.generation ? saved.generation.id : undefined;
    if (smooth && !smoothed) await op.partial(savedId ?? null, "smooth_pass_unavailable");
    else await op.succeed(savedId);

    return NextResponse.json({
      success: true,
      sheetUrl: sheet.url,
      gifUrl: gif.success ? gif.url : null,
      frameCount: anim.frameCount,
      frameWidth: anim.frameWidth,
      frameHeight: anim.frameHeight,
      bodyType: motionPlan.bodyType,
      generationId: savedId,
        sourceGenerationId: source.id,
      smoothed,
      creditsUsed: smooth && !smoothed ? option.credits : credits,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[Animate] Failed:", msg);
    await op.fail(/insufficientCredits|insufficient credits|top-up/i.test(msg) ? "PROVIDER_BALANCE" : "ANIMATION_FAILED");
    // Provider balance ran out: say so plainly instead of "try again"
    if (/insufficientCredits|insufficient credits|top-up/i.test(msg)) {
      return NextResponse.json({ error: "Animations are paused for a short while — your credits were refunded. Sprites still work." }, { status: 503 });
    }
    return NextResponse.json({ error: "Animation failed — your credits were refunded. Please try again." }, { status: 502 });
  }
}
