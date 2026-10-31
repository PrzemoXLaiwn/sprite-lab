// =============================================================================
// ST Packs — seamless loop and frame-rate resampling
// =============================================================================
// A generated clip rarely ends where it started. We measure the seam (the
// last→first difference against a normal consecutive step), crossfade the
// tail into the head in premultiplied space, and fall back to a ping-pong
// (forward then backward) when the cut is too hard for a crossfade. Frame
// differences are mean absolute differences over premultiplied RGBA so
// transparent pixels with garbage colour don't count.
//
// All functions are pure and return new frames.
// =============================================================================

import type { Frame } from "./types";

export type LoopMethod = "crossfade" | "pingpong";

export interface SeamStats {
  /** Mean |last − first| ×1000. */
  seam: number;
  /** Median consecutive difference ×1000. */
  consMed: number;
  /** Largest consecutive difference ×1000. */
  consMax: number;
}

export interface SeamlessLoopOptions {
  /** Crossfade length in frames (clamped to floor((n−1)/2)). */
  k: number;
  /** Allow the ping-pong fallback (not for one-way motions such as a laugh). */
  allowPingPong: boolean;
  /** Mean |last − first| (0–1) below which the closing frame is a repeat of the first and is dropped. */
  duplicateThreshold: number;
}

export interface SeamlessLoopResult {
  frames: Frame[];
  method: LoopMethod;
  /** seam / consMed before and after the fix (Infinity when consMed is 0 and the seam is not). */
  seamBefore: number;
  seamAfter: number;
}

/** Seam-to-step ratio above which the loop still pops after a crossfade. */
const SEAM_POP_RATIO = 2;

function cloneFrame(frame: Frame): Frame {
  return { data: Buffer.from(frame.data), width: frame.width, height: frame.height };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Mean absolute difference over premultiplied RGBA, 0–1. Frames must share a size. */
export function meanAbsDiff(a: Frame, b: Frame): number {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`meanAbsDiff: size mismatch ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const da = a.data;
  const db = b.data;
  const count = a.width * a.height;
  if (count === 0) return 0;
  let sum = 0;
  for (let o = 0; o < count * 4; o += 4) {
    const aa = da[o + 3] / 255;
    const ab = db[o + 3] / 255;
    sum += Math.abs(da[o] * aa - db[o] * ab);
    sum += Math.abs(da[o + 1] * aa - db[o + 1] * ab);
    sum += Math.abs(da[o + 2] * aa - db[o + 2] * ab);
    sum += Math.abs(da[o + 3] - db[o + 3]);
  }
  return sum / (count * 4 * 255);
}

/** The model often repeats the first frame at the end; drop it when it's a near-duplicate. */
export function dropDuplicateClosingFrame(frames: Frame[], threshold: number): Frame[] {
  if (frames.length >= 3 && meanAbsDiff(frames[frames.length - 1], frames[0]) < threshold) {
    return frames.slice(0, -1).map(cloneFrame);
  }
  return frames.map(cloneFrame);
}

/**
 * Crossfade the last k frames into the first k (premultiplied blend, weight
 * ramping from mostly-tail to mostly-head) and drop the tail. Length n − k.
 */
export function crossfadeLoop(frames: Frame[], k: number): Frame[] {
  const n = frames.length;
  const kk = Math.max(0, Math.min(Math.floor(k), Math.floor((n - 1) / 2)));
  if (kk === 0) return frames.map(cloneFrame);
  const out: Frame[] = [];
  for (let i = 0; i < kk; i++) {
    const w = (i + 1) / (kk + 1);
    out.push(blendPremultiplied(frames[n - kk + i], frames[i], w));
  }
  for (let i = kk; i < n - kk; i++) out.push(cloneFrame(frames[i]));
  return out;
}

/** (1 − w)·a + w·b in premultiplied space, returned straight. */
function blendPremultiplied(a: Frame, b: Frame, w: number): Frame {
  if (a.width !== b.width || a.height !== b.height) {
    throw new Error(`crossfadeLoop: size mismatch ${a.width}×${a.height} vs ${b.width}×${b.height}`);
  }
  const wa = 1 - w;
  const da = a.data;
  const db = b.data;
  const out = Buffer.alloc(da.length);
  for (let o = 0; o < da.length; o += 4) {
    const aa = da[o + 3] * wa;
    const ab = db[o + 3] * w;
    const alpha = aa + ab;
    if (alpha <= 0) continue;
    out[o] = Math.round((da[o] * aa + db[o] * ab) / alpha);
    out[o + 1] = Math.round((da[o + 1] * aa + db[o + 1] * ab) / alpha);
    out[o + 2] = Math.round((da[o + 2] * aa + db[o + 2] * ab) / alpha);
    out[o + 3] = Math.round(alpha);
  }
  return { data: out, width: a.width, height: a.height };
}

/** frames + reversed interior (n−2 … 1): the turn-around frames are not repeated. */
export function pingPong(frames: Frame[]): Frame[] {
  const out = frames.map(cloneFrame);
  for (let i = frames.length - 2; i >= 1; i--) out.push(cloneFrame(frames[i]));
  return out;
}

/** Nearest-time frame pick; output count = max(1, round(n·to/from)). */
export function resampleFps(frames: Frame[], fromFps: number, toFps: number): Frame[] {
  const n = frames.length;
  if (n === 0) return [];
  if (!(fromFps > 0) || !(toFps > 0)) return frames.map(cloneFrame);
  const count = Math.max(1, Math.round((n * toFps) / fromFps));
  const out: Frame[] = [];
  for (let j = 0; j < count; j++) {
    const src = Math.min(n - 1, Math.max(0, Math.round((j * fromFps) / toFps)));
    out.push(cloneFrame(frames[src]));
  }
  return out;
}

/** Seam and consecutive-step statistics (all ×1000). */
export function seamRatio(frames: Frame[]): SeamStats {
  const n = frames.length;
  if (n === 0) return { seam: 0, consMed: 0, consMax: 0 };
  const seam = meanAbsDiff(frames[n - 1], frames[0]) * 1000;
  const steps: number[] = [];
  for (let i = 0; i < n - 1; i++) steps.push(meanAbsDiff(frames[i], frames[i + 1]) * 1000);
  return { seam, consMed: median(steps), consMax: steps.length ? Math.max(...steps) : 0 };
}

function seamToStep(stats: SeamStats): number {
  if (stats.consMed > 0) return stats.seam / stats.consMed;
  return stats.seam > 0 ? Infinity : 0;
}

/**
 * Drop a duplicated closing frame, crossfade the seam, and when it still pops
 * (ratio > 2) and the motion allows it, ping-pong the clip instead.
 */
export function makeSeamlessLoop(frames: Frame[], opts: SeamlessLoopOptions): SeamlessLoopResult {
  const base = dropDuplicateClosingFrame(frames, opts.duplicateThreshold);
  const seamBefore = seamToStep(seamRatio(base));
  const faded = crossfadeLoop(base, opts.k);
  const seamAfter = seamToStep(seamRatio(faded));
  if (seamAfter > SEAM_POP_RATIO && opts.allowPingPong) {
    const pp = pingPong(base);
    return { frames: pp, method: "pingpong", seamBefore, seamAfter: seamToStep(seamRatio(pp)) };
  }
  return { frames: faded, method: "crossfade", seamBefore, seamAfter };
}
