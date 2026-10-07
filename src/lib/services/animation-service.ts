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
} from "@/lib/image/animation";
import {
  animationFrameOption,
  buildAnimationPrompt,
  buildInbetweenPrompt,
  buildTileAnimationPrompt,
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
}

export interface MakeAnimationOutput {
  anim: AnimationResult;
  plan: AnimationPlan;
  prompt: string;
  cost: number;
  /** False when smooth was requested but the in-between pass didn't line up. */
  smoothed: boolean;
}

export async function makeAnimation(input: MakeAnimationInput): Promise<MakeAnimationOutput> {
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

  const keyGrid = await generateAnimationGrid({ prompt, reference: input.reference, size: option.size });
  const keys = await extractFrames(keyGrid.image, option.cols, option.rows);
  let cost = keyGrid.cost;
  const baseFps = option.frames >= 9 ? 12 : option.frames >= 6 ? 10 : 8;

  if (!input.smooth) {
    const anim = await assembleAnimation(keys, { pixel: input.pixel, frameSize: 256, fps: baseFps, anchor });
    return { anim, plan, prompt, cost, smoothed: false };
  }

  // Smooth: show the assembled key poses to the model, get the in-betweens
  const keyAnim = await assembleAnimation(keys, { pixel: input.pixel, frameSize: 256, fps: baseFps, anchor });
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
    const betweens = await extractFrames(betweenGrid.image, layout.cols, layout.rows);
    if (betweens.length !== keys.length) throw new Error(`in-between count ${betweens.length} ≠ ${keys.length}`);
    const all = await interleave(keys, betweens);
    const anim = await assembleAnimation(all, { pixel: input.pixel, frameSize: 256, fps: baseFps * 2, anchor });
    return { anim, plan, prompt, cost, smoothed: true };
  } catch (err) {
    console.warn("[Animate] Smoothing skipped:", err instanceof Error ? err.message : err);
    return { anim: keyAnim, plan, prompt, cost, smoothed: false };
  }
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
