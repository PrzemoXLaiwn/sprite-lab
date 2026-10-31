// =============================================================================
// Direction-sheet QA — OFF unless SPRITELAB_ROTATION_QA=1
// =============================================================================
// makeRotation() rejects a finished sheet when framesLookRight is false, and
// the route then refunds. Two checks in that function were written for a walk
// cycle (every frame is the same view):
//
//   1. Width must be ≥ 35% of the median frame width. On a 4-direction sheet
//      the median is a front/back view, so a slim side profile (a knight, a
//      sword held out, a snake) falls under 35% and the whole sheet is thrown
//      away after the model was already paid.
//   2. An 8-direction sheet is a 3×3 with the last cell empty. extractFrames
//      sometimes keeps a speck in that cell. The caller then slice(0, 8)s,
//      which drops the last real view (south-west) and keeps the speck.
//
// With the flag on, side profiles may be as narrow as 18% of the median, and
// extra frames are dropped by area (smallest first) instead of by reading order.
// Sliced figures still fail. Walk cycles do not use this module.
// =============================================================================

import { isSlicedFrame, type Frame } from "./animation";

export const ROTATION_QA_FLAG = "SPRITELAB_ROTATION_QA";

/** What makeRotation enforces today. */
export const PRODUCTION_MIN_WIDTH_RATIO = 0.35;
export const PRODUCTION_MIN_HEIGHT_RATIO = 0.5;

/** Side profile vs front view. Still rejects a sliver from a bad cut. */
export const DIRECTION_MIN_WIDTH_RATIO = 0.18;
export const DIRECTION_MIN_HEIGHT_RATIO = 0.5;

export function rotationQaEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env[ROTATION_QA_FLAG] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)] ?? 0;
}

export function productionFramesLookRight(frames: Frame[], expected: number): boolean {
  return looksRight(frames, expected, PRODUCTION_MIN_WIDTH_RATIO, PRODUCTION_MIN_HEIGHT_RATIO);
}

export function directionViewsLookRight(frames: Frame[], expected: number): boolean {
  return looksRight(frames, expected, DIRECTION_MIN_WIDTH_RATIO, DIRECTION_MIN_HEIGHT_RATIO);
}

function looksRight(frames: Frame[], expected: number, minWidth: number, minHeight: number): boolean {
  if (frames.length !== expected) return false;
  const mh = median(frames.map((f) => f.height));
  const mw = median(frames.map((f) => f.width));
  return frames.every((f) => f.height >= mh * minHeight && f.width >= mw * minWidth && !isSlicedFrame(f));
}

/**
 * Keep `expected` views. When the sheet has extra pieces (the empty cell of
 * an 8-view 3×3), drop the smallest ones and keep reading order for the rest.
 */
export function chooseDirectionViews(frames: Frame[], expected: number): Frame[] {
  if (frames.length <= expected) return frames.slice(0, expected);
  const extra = frames.length - expected;
  const drop = new Set(
    frames
      .map((f, i) => ({ i, area: f.width * f.height }))
      .sort((a, b) => a.area - b.area || b.i - a.i)
      .slice(0, extra)
      .map((x) => x.i),
  );
  return frames.filter((_, i) => !drop.has(i));
}
