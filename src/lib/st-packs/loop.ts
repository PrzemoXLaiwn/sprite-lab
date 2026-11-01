// =============================================================================
// ST Packs — seamless loop and frame-rate resampling
// =============================================================================
// A generated clip rarely ends where it started. Vidu is asked to pin the
// last frame to the same still as the first, but a clip can still wander and
// only pass the start pose in the middle — or land on it for a single frame
// after a jump. We keep the longest prefix whose last frame already matches
// the first (that is the loop point). A prefix that still pops is crossfaded
// in premultiplied space, then ping-ponged when the label allows it. Frame
// differences are mean absolute differences over premultiplied RGBA so
// transparent pixels with garbage colour don't count.
//
// All functions are pure and return new frames.
// =============================================================================

import { ST_QA } from "@/config/st-packs";
import type { Frame } from "./types";

export type LoopMethod = "trim" | "crossfade" | "pingpong";

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
  /** A last-step snap at least this many times the median, and above popAbs, is reversed. Defaults are the subtle QA bars. */
  popRatio?: number;
  popAbs?: number;
}

export interface SeamlessLoopResult {
  frames: Frame[];
  method: LoopMethod;
  /** seam / consMed before and after the fix (Infinity when consMed is 0 and the seam is not). */
  seamBefore: number;
  seamAfter: number;
}

/** Same bars as QA: a loop that still misses either one is not closed yet. */
const SEAM_POP_RATIO = ST_QA.seamRatio;
const SEAM_ABS_MAX = ST_QA.seamAbs;

function cloneFrame(frame: Frame): Frame {
  return { data: Buffer.from(frame.data), width: frame.width, height: frame.height };
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Same difference as `meanAbsDiff`, sampling every 4th pixel on large frames.
 * Used to search for a loop point. The chosen cut is confirmed at full resolution.
 */
function meanAbsDiffFast(a: Frame, b: Frame): number {
  if (a.width !== b.width || a.height !== b.height || a.width * a.height <= 160 * 160) return meanAbsDiff(a, b);
  const stride = 4;
  const da = a.data;
  const db = b.data;
  let sum = 0;
  let count = 0;
  for (let y = 0; y < a.height; y += stride) {
    const row = y * a.width * 4;
    const rowEnd = row + a.width * 4;
    for (let o = row; o < rowEnd; o += stride * 4) {
      const aa = da[o + 3] / 255;
      const ab = db[o + 3] / 255;
      sum += Math.abs(da[o] * aa - db[o] * ab);
      sum += Math.abs(da[o + 1] * aa - db[o + 1] * ab);
      sum += Math.abs(da[o + 2] * aa - db[o + 2] * ab);
      sum += Math.abs(da[o + 3] - db[o + 3]);
      count++;
    }
  }
  return count === 0 ? 0 : sum / (count * 4 * 255);
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

/** Seam statistics on a stride, for the search. Small frames stay exact. */
function seamRatioFast(frames: Frame[]): SeamStats {
  const n = frames.length;
  if (n === 0) return { seam: 0, consMed: 0, consMax: 0 };
  const seam = meanAbsDiffFast(frames[n - 1], frames[0]) * 1000;
  const steps: number[] = [];
  for (let i = 0; i < n - 1; i++) steps.push(meanAbsDiffFast(frames[i], frames[i + 1]) * 1000);
  return { seam, consMed: median(steps), consMax: steps.length ? Math.max(...steps) : 0 };
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

/** The last step is a cut onto a pinned frame, not part of the idle. */
function terminalPop(frames: Frame[], ratio: number, abs: number): boolean {
  if (frames.length < 4) return false;
  const steps: number[] = [];
  for (let i = 0; i < frames.length - 1; i++) steps.push(meanAbsDiffFast(frames[i], frames[i + 1]) * 1000);
  const last = steps[steps.length - 1];
  const med = median(steps.slice(0, -1));
  return med > 0 && last > ratio * med && last > abs;
}

function seamToStep(stats: SeamStats): number {
  if (stats.consMed > 0) return stats.seam / stats.consMed;
  return stats.seam > 0 ? Infinity : 0;
}

function closes(stats: SeamStats): boolean {
  return seamToStep(stats) <= SEAM_POP_RATIO && stats.seam <= SEAM_ABS_MAX;
}

/**
 * Longest prefix (at least `minKeep` frames) whose last frame already matches
 * the first closely enough to pass the seam bars. Null when the clip never
 * returns to the start pose.
 */
function bestClosedEnd(frames: Frame[], minKeep: number): number | null {
  const n = frames.length;
  if (n < minKeep || n < 2) return null;
  const steps: number[] = [];
  for (let i = 0; i < n - 1; i++) steps.push(meanAbsDiffFast(frames[i], frames[i + 1]) * 1000);
  let best: number | null = null;
  for (let end = Math.max(minKeep - 1, 1); end < n; end++) {
    const seam = meanAbsDiffFast(frames[end], frames[0]) * 1000;
    if (seam > SEAM_ABS_MAX) continue;
    const med = median(steps.slice(0, end));
    const ratio = med > 0 ? seam / med : seam > 0 ? Infinity : 0;
    if (ratio <= SEAM_POP_RATIO) best = end;
  }
  return best;
}

/**
 * A pinned end frame is often a copy of frame 0 after the pose has already
 * jumped. Drop that hold only when the frame before it still closes the loop.
 * Dropping it otherwise opens the seam the pin just shut (the joy pop).
 */
function withoutFrozenClose(frames: Frame[], threshold: number): Frame[] {
  const cloned = frames.map(cloneFrame);
  if (cloned.length < 4) return cloned;
  const last = cloned.length - 1;
  if (meanAbsDiff(cloned[last], cloned[0]) >= threshold) return cloned;
  const opened = cloned.slice(0, last);
  if (closes(seamRatio(opened))) return opened;
  return cloned;
}

/**
 * Cut to the latest frame that already matches the start. When nothing
 * returns, crossfade the seam, and when that still pops and the motion
 * allows it, ping-pong the clip instead.
 */
export function makeSeamlessLoop(frames: Frame[], opts: SeamlessLoopOptions): SeamlessLoopResult {
  const seamBefore = seamToStep(seamRatioFast(frames));
  const minKeep = Math.max(8, Math.round(frames.length * 0.45));
  const finish = (picked: Frame[], method: LoopMethod): SeamlessLoopResult => {
    const eased = easeOntoFirst(picked, opts.k);
    return { frames: eased, method, seamBefore, seamAfter: seamToStep(seamRatio(eased)) };
  };
  const closedEnd = bestClosedEnd(frames, minKeep);
  if (closedEnd !== null) {
    const cut = withoutFrozenClose(frames.slice(0, closedEnd + 1), opts.duplicateThreshold);
    const stats = seamRatio(cut);
    if (closes(stats)) {
      // A single-frame snap onto the pinned still closes the seam and leaves a
      // pop. Reverse the motion before that snap; the join is then one normal step.
      // Expressive raises the pop bar so a fast gesture is not reversed. The
      // ease below still removes a hard cut the loose bar would have kept.
      if (opts.allowPingPong && terminalPop(cut, opts.popRatio ?? ST_QA.consSpikeRatio, opts.popAbs ?? ST_QA.consSpikeAbs)) {
        const body = cut.slice(0, -1);
        const pp = pingPong(body);
        const ppStats = seamRatio(pp);
        if (closes(ppStats)) return finish(pp, "pingpong");
      }
      return finish(cut, "trim");
    }
  }
  const base = dropDuplicateClosingFrame(frames, opts.duplicateThreshold);
  const faded = crossfadeLoop(base, opts.k);
  const fadedStats = seamRatio(faded);
  if (!closes(fadedStats) && opts.allowPingPong) {
    const pp = pingPong(base);
    return finish(pp, "pingpong");
  }
  return finish(faded, "crossfade");
}

/**
 * The delivered loop has to start and end on the same pixels. A crossfade used
 * to leave the last frame mid-pose, and a pinned still used to sit one hard
 * cut after the gesture. Ease the tail onto frame 0 and copy that frame onto
 * the end, so the join itself is exact. A snap in the last second is where
 * the ease starts, which drops the cut instead of playing it.
 */
export function easeOntoFirst(frames: Frame[], k: number): Frame[] {
  const n = frames.length;
  if (n < 2) return frames.map(cloneFrame);
  const steps: number[] = [];
  for (let i = 0; i < n - 1; i++) steps.push(meanAbsDiffFast(frames[i], frames[i + 1]) * 1000);
  const med = median(steps.slice(0, -1)) || median(steps) || 0;
  const window = Math.min(n - 2, Math.max(k, 16));
  let keep = n - 1;
  for (let i = n - 2; i >= n - 1 - window && i >= 1; i--) {
    if (med > 0 && steps[i] > ST_QA.consSpikeRatio * med && steps[i] > ST_QA.consSpikeAbs) {
      keep = i;
      break;
    }
  }
  const head = frames.slice(0, keep + 1);
  const kk = Math.max(1, Math.min(Math.max(k, 8), head.length - 1));
  const out: Frame[] = [];
  for (let i = 0; i < head.length - kk; i++) out.push(cloneFrame(head[i]));
  for (let i = 0; i < kk - 1; i++) {
    const src = head[head.length - kk + i];
    const w = (i + 1) / kk;
    out.push(blendPremultiplied(src, frames[0], w));
  }
  out.push(cloneFrame(frames[0]));
  return out;
}
