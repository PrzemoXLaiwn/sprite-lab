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
  buildWalkRowPrompt,
  type RotationOption,
  gridFor,
  type MotionAnchor,
} from "@/config/animations";
import { walkRowFrozen, walkRowScore } from "@/lib/image/walk-check";
import { canSpend } from "@/lib/billing/ledger";
import { PRICE } from "@/lib/billing/features";

/** List price of one image pass at this sheet size — for the per-operation cost cap. */
const passPrice = (size: number) => (size > 1024 ? PRICE.grid2048 : PRICE.grid1024);

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
    // A redraw only happens within the operation's cost cap
    if (attempt > 0 && !canSpend(passPrice(option.size))) break;
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
  if (!canSpend(passPrice(layout.size))) {
    console.warn("[Animate] Smoothing skipped: operation cost cap reached");
    return { anim: keyAnim, plan, prompt, cost, smoothed: false };
  }
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
    if (attempt > 0 && !canSpend(passPrice(r.size))) break;
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
  if (r.kind === "walk") {
    const fixed = await fixFrozenWalkRows(views, r.cols, { pixel: input.pixel, subject: input.prompt });
    views = fixed.views;
    cost += fixed.cost;
    views = [...views, ...views.slice(r.cols, r.cols * 2).map(mirror)];
  }
  // Every view stands on the same ground line, centred (no body alignment —
  // a side view and a front view don't overlap)
  const anim = await assembleAnimation(views, { pixel: input.pixel, frameSize: 256, fps: r.kind === "walk" ? 6 : 2, anchor: "ground", alignBodies: false });
  // Walk sets: the classic RPG layout — one row per direction
  if (r.kind === "walk") anim.sheetPng = await gridSheet(anim.frames, r.cols, anim.frameWidth, anim.frameHeight);
  return { anim, prompt, cost };
}

const WALK_VIEWS = ["front", "side", "back"] as const;

/**
 * The model sometimes draws one row of a walk set as the same pose four times
 * (the character slides instead of stepping). Such rows are redrawn on their
 * own, from one of their frames, with every pose spelled out — in parallel,
 * one small (1024) pass each. A redraw is only used when it walks better.
 */
async function fixFrozenWalkRows(views: Frame[], cols: number, opts: { pixel: boolean; subject: string }): Promise<{ views: Frame[]; cost: number }> {
  const rows = WALK_VIEWS.map((view, r) => ({ view, r, frames: views.slice(r * cols, r * cols + cols) }));
  const allFrozen = rows.filter((row) => walkRowFrozen(row.frames, row.view));
  if (!allFrozen.length) return { views, cost: 0 };
  // Side rows first (a frozen side walk is the most visible); stop at the cost cap
  allFrozen.sort((a, b) => Number(b.view === "side") - Number(a.view === "side"));
  const frozen = allFrozen.filter((_, i) => canSpend(PRICE.grid1024 * (i + 1)));
  if (!frozen.length) return { views, cost: 0 };
  console.warn(`[Walk] Frozen rows: ${frozen.map((f) => f.view).join(", ")} — redrawing`);
  const out = [...views];
  let cost = 0;
  await Promise.all(frozen.map(async (row) => {
    try {
      const reference = await frameOnWhite(row.frames[0]);
      const grid = await generateAnimationGrid({ prompt: buildWalkRowPrompt({ pixel: opts.pixel, subject: opts.subject, view: row.view }), reference, size: 1024 });
      cost += grid.cost;
      const found = (await extractFrames(grid.image, 2, 2)).slice(0, cols);
      if (!framesLookRight(found, cols)) return;
      // The redraw comes from a smaller sheet: bring it to the row's size so
      // the figure doesn't shrink when the rows share one canvas
      const k = median(row.frames.map((f) => f.height)) / median(found.map((f) => f.height));
      const redrawn = await Promise.all(found.map((f) => scaleFrame(f, k, opts.pixel)));
      if (walkRowScore(redrawn) <= walkRowScore(row.frames)) return;
      out.splice(row.r * cols, cols, ...redrawn);
    } catch (err) {
      // Keep the original row — a stiff walk beats a failed request
      console.warn(`[Walk] Redraw of the ${row.view} row failed:`, err instanceof Error ? err.message : err);
    }
  }));
  return { views: out, cost };
}

const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

async function scaleFrame(f: Frame, k: number, pixel: boolean): Promise<Frame> {
  if (Math.abs(k - 1) < 0.02) return f;
  const width = Math.max(1, Math.round(f.width * k)), height = Math.max(1, Math.round(f.height * k));
  const data = await sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
    .resize(width, height, { kernel: pixel ? "nearest" : "lanczos3", fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer();
  return { data, width, height };
}

/** A cut-out frame centred on white, 512px — the reference for a row redraw. */
async function frameOnWhite(f: Frame): Promise<Buffer> {
  const side = Math.round(Math.max(f.width, f.height) * 1.25);
  return sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
    .extend({
      left: Math.floor((side - f.width) / 2), right: Math.ceil((side - f.width) / 2),
      top: Math.floor((side - f.height) / 2), bottom: Math.ceil((side - f.height) / 2),
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    })
    .flatten({ background: "#ffffff" })
    .resize(512, 512, { kernel: "nearest" })
    .png()
    .toBuffer();
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
