// =============================================================================
// Animation pipeline — plan → key frames → (optional) in-betweens → assemble
// =============================================================================
// Shared by /api/animate and the test scripts.
//   1. Claude plans a pose per key frame for this sprite's anatomy
//   2. the image model draws the key frames in a grid
//   3. smooth mode: the key frames go back to the model, which draws the pose
//      halfway between each neighbouring pair → twice the frames
//   4. everything is assembled on one anchor, pixel grid and palette
// Tiles (water, lava…) skip the planner and background removal: every grid
// cell is one full seamless frame.
// =============================================================================

import sharp from "sharp";
import { planAnimation, type AnimationPlan } from "@/lib/animation-planner";
import { generateAnimationGrid } from "@/lib/runware";
import {
  assembleAnimation,
  assembleTileAnimation,
  extractFrames,
  extractTileFrames,
  interleave,
  referenceGrid,
  type AnimationResult,
  type Frame,
} from "@/lib/image/animation";
import {
  animationFrameOption,
  buildAnimationPrompt,
  buildInbetweenPrompt,
  buildTileAnimationPrompt,
  buildRotationPrompt,
  buildWalkSetPrompt,
  type RotationOption,
  gridFor,
  type MotionAnchor,
} from "@/config/animations";

export interface MakeAnimationInput {
  /** The sprite on white, 512px. */
  reference: Buffer;
  prompt: string;
  categoryId: string | null;
  motion: string;
  frames: number;
  smooth: boolean;
  pixel: boolean;
  anchor: MotionAnchor;
  /** One-shot motions (attack, hurt…) ease back instead of looping. */
  loop: boolean;
  /** Seamless tile: full-square frames, no background removal. */
  tile?: boolean;
  /** Debug: receives each raw grid the model returned (scripts only). */
  onGrid?: (stage: "keys" | "betweens" | "tile", image: Buffer) => void;
}

export interface MakeAnimationOutput {
  anim: AnimationResult;
  plan: AnimationPlan;
  prompt: string;
  cost: number;
  /** False when smooth was requested but the in-between pass didn't line up. */
  smoothed: boolean;
}

/**
 * The /api/animate route has maxDuration 300 s and one image call can take up
 * to 150 s. A further call (redraw, in-betweens) only starts while it can
 * still finish — otherwise the function is killed before credits are refunded.
 */
const REDRAW_BUDGET_MS = 90_000;
const SMOOTH_BUDGET_MS = 120_000;

export async function makeAnimation(input: MakeAnimationInput): Promise<MakeAnimationOutput> {
  const startedAt = Date.now();
  const option = animationFrameOption(input.frames);
  if (input.tile) return makeTileAnimation(input);

  const plan = await planAnimation({
    image: input.reference,
    prompt: input.prompt,
    categoryId: input.categoryId,
    motion: input.motion,
    frameCount: option.frames,
  });
  const prompt = buildAnimationPrompt({
    motion: input.motion,
    pixel: input.pixel,
    subject: plan.subject || input.prompt,
    cols: option.cols,
    rows: option.rows,
    frames: plan.frames,
    consistency: plan.consistency,
  });
  // Things that hover never stand on a baseline: keep their bob
  let anchor = input.anchor;
  if (anchor === "ground" && (plan.bodyType === "floating" || plan.bodyType === "winged" || plan.bodyType === "aquatic" || plan.bodyType === "effect")) anchor = "air";
  if (anchor === "ground" && (plan.bodyType === "object" || plan.bodyType === "ui")) anchor = "center";

  // Key poses. The model sometimes breaks the layout (merged or missing
  // poses, a drawn grid) — check the frames and redraw once before giving up.
  let cost = 0;
  let keys: Frame[] = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && keys.length >= 2 && Date.now() - startedAt > REDRAW_BUDGET_MS) break;
    let found: Frame[];
    try {
      const keyGrid = await generateAnimationGrid({ prompt, reference: input.reference, size: option.size });
      cost += keyGrid.cost;
      input.onGrid?.("keys", keyGrid.image);
      found = await extractFrames(keyGrid.image, option.cols, option.rows);
    } catch (err) {
      // A failed redraw must not throw away usable frames from the first try
      if (attempt === 0 || keys.length < 2) throw err;
      console.warn("[Animate] Redraw failed, keeping the first attempt:", err instanceof Error ? err.message : err);
      break;
    }
    if (frameScore(found, option.frames) > frameScore(keys, option.frames)) keys = found;
    if (framesLookRight(keys, option.frames)) break;
    console.warn(`[Animate] Key frames look wrong (${found.length}/${option.frames}) — attempt ${attempt + 1}`);
  }
  const baseFps = option.frames >= 9 ? 12 : option.frames >= 6 ? 10 : 8;

  if (!input.smooth) {
    const anim = await assembleAnimation(keys, { pixel: input.pixel, frameSize: 256, fps: baseFps, anchor });
    return { anim, plan, prompt, cost, smoothed: false };
  }

  // Smooth: show the assembled key poses to the model, get the in-betweens
  const keyAnim = await assembleAnimation(keys, { pixel: input.pixel, frameSize: 256, fps: baseFps, anchor });
  if (Date.now() - startedAt > SMOOTH_BUDGET_MS) {
    console.warn("[Animate] Smoothing skipped: out of time");
    return { anim: keyAnim, plan, prompt, cost, smoothed: false };
  }
  const layout = gridFor(keyAnim.frames.length);
  try {
    const sheet = await referenceGrid(keyAnim.frames, layout.cols, layout.rows, 1024);
    const betweenGrid = await generateAnimationGrid({
      prompt: buildInbetweenPrompt({
        count: keyAnim.frames.length,
        cols: layout.cols,
        rows: layout.rows,
        pixel: input.pixel,
        subject: plan.subject || input.prompt,
        loop: input.loop,
      }),
      reference: sheet,
      size: layout.size,
    });
    cost += betweenGrid.cost;
    input.onGrid?.("betweens", betweenGrid.image);
    const betweens = await extractFrames(betweenGrid.image, layout.cols, layout.rows);
    if (!framesLookRight(betweens, keys.length)) throw new Error(`in-betweens don't line up (${betweens.length}/${keys.length})`);
    const all = await interleave(keys, betweens);
    const anim = await assembleAnimation(all, { pixel: input.pixel, frameSize: 256, fps: baseFps * 2, anchor });
    return { anim, plan, prompt, cost, smoothed: true };
  } catch (err) {
    console.warn("[Animate] Smoothing skipped:", err instanceof Error ? err.message : err);
    return { anim: keyAnim, plan, prompt, cost, smoothed: false };
  }
}

/**
 * Directional views (4 or 8) of the sprite in one pass. No planner: the
 * directions are the plan. Views share one ground line and scale.
 */
export async function makeRotation(input: { reference: Buffer; prompt: string; pixel: boolean; rotation: RotationOption; onGrid?: MakeAnimationInput["onGrid"] }): Promise<{ anim: AnimationResult; prompt: string; cost: number }> {
  const r = input.rotation;
  const prompt = r.kind === "walk"
    ? buildWalkSetPrompt({ pixel: input.pixel, subject: input.prompt })
    : buildRotationPrompt({ directions: r.directions, cols: r.cols, rows: r.rows, pixel: input.pixel, subject: input.prompt });
  // Walk sets: the model draws front, right and back; left is the mirrored right row
  const expected = r.kind === "walk" ? r.cols * r.rows : r.frames;
  let cost = 0;
  let views: Frame[] = [];
  const startedAt = Date.now();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0 && views.length >= expected && Date.now() - startedAt > REDRAW_BUDGET_MS) break;
    let found: Frame[];
    try {
      const grid = await generateAnimationGrid({ prompt, reference: input.reference, size: r.size });
      cost += grid.cost;
      input.onGrid?.("keys", grid.image);
      found = (await extractFrames(grid.image, r.cols, r.rows)).slice(0, expected);
    } catch (err) {
      // Keep a complete first attempt rather than failing the whole request
      if (attempt === 0 || views.length < expected) throw err;
      console.warn("[Rotate] Redraw failed, keeping the first attempt:", err instanceof Error ? err.message : err);
      break;
    }
    if (frameScore(found, expected) > frameScore(views, expected)) views = found;
    if (framesLookRight(views, expected)) break;
    console.warn(`[Rotate] Views look wrong (${found.length}/${expected}) — attempt ${attempt + 1}`);
  }
  if (views.length < expected) throw new Error(`only ${views.length} of ${expected} views found`);
  if (r.kind === "walk") views = [...views, ...views.slice(r.cols, r.cols * 2).map(mirror)];
  // Every view stands on the same ground line, centred (no body alignment —
  // a side view and a front view don't overlap)
  const anim = await assembleAnimation(views, { pixel: input.pixel, frameSize: 256, fps: r.kind === "walk" ? 6 : 2, anchor: "ground", alignBodies: false });
  // Walk sets: the classic RPG layout — one row per direction
  if (r.kind === "walk") anim.sheetPng = await gridSheet(anim.frames, r.cols, anim.frameWidth, anim.frameHeight);
  return { anim, prompt, cost };
}

/** Horizontal mirror of a cut-out frame (left-facing row from the right-facing one). */
function mirror(f: Frame): Frame {
  const out = Buffer.alloc(f.data.length);
  for (let y = 0; y < f.height; y++) {
    for (let x = 0; x < f.width; x++) {
      f.data.copy(out, (y * f.width + (f.width - 1 - x)) * 4, (y * f.width + x) * 4, (y * f.width + x) * 4 + 4);
    }
  }
  return { data: out, width: f.width, height: f.height };
}

async function gridSheet(frames: Buffer[], cols: number, w: number, h: number): Promise<Buffer> {
  const rows = Math.ceil(frames.length / cols);
  return sharp({ create: { width: w * cols, height: h * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((input, i) => ({ input, left: (i % cols) * w, top: Math.floor(i / cols) * h })))
    .png({ compressionLevel: 9 })
    .toBuffer();
}

async function makeTileAnimation(input: MakeAnimationInput): Promise<MakeAnimationOutput> {
  // Tiles don't need a pose planner or in-betweens — the motion is a texture
  // loop (a smooth request is refunded by the caller via smoothed: false)
  const option = animationFrameOption(input.frames);
  const prompt = buildTileAnimationPrompt({
    motion: input.motion,
    pixel: input.pixel,
    subject: input.prompt,
    cols: option.cols,
    rows: option.rows,
  });
  const grid = await generateAnimationGrid({ prompt, reference: input.reference, size: option.size });
  const frames = await extractTileFrames(grid.image, option.cols, option.rows);
  const anim = await assembleTileAnimation(frames, { pixel: input.pixel, frameSize: 256, fps: option.frames >= 6 ? 10 : 8 });
  const plan: AnimationPlan = { bodyType: "tile", subject: input.prompt, consistency: "", frames: [], planned: false };
  return { anim, plan, prompt, cost: grid.cost, smoothed: false };
}

/**
 * A usable set of poses: the expected number, and no broken piece among them
 * (a half body or a sliver from a bad cut is much narrower or shorter than
 * the rest). Crouches and wing-folds stay well above these limits.
 */
function framesLookRight(frames: Frame[], expected: number): boolean {
  if (frames.length !== expected) return false;
  const med = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
  const mh = med(frames.map((f) => f.height)), mw = med(frames.map((f) => f.width));
  return frames.every((f) => f.height >= mh * 0.5 && f.width >= mw * 0.35);
}

/** For picking the better of two attempts. */
function frameScore(frames: Frame[], expected: number): number {
  if (frames.length === 0) return -1;
  return (framesLookRight(frames, expected) ? 100 : 0) - Math.abs(frames.length - expected);
}
