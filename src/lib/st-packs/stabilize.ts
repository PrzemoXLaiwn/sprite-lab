// =============================================================================
// ST Packs — drift stabiliser
// =============================================================================
// Video models let the character slide sideways by a few pixels over a clip.
// On a looping sprite that reads as a wobble. We track the alpha-weighted
// centroid of a lower torso band (which barely moves on a talking/breathing
// character), smooth the per-frame correction with a circular moving average
// and translate every frame back with sub-pixel bilinear resampling.
//
// All functions are pure and return new frames. Straight RGBA in, straight
// RGBA out; resampling happens in premultiplied space so edges don't darken.
// =============================================================================

import type { Frame } from "./types";

export interface Centroid {
  x: number;
  y: number;
  mass: number;
}

export interface StabilizeOptions {
  /** Row band as fractions of the height, e.g. [0.8, 0.97] for the lower torso. */
  band: [number, number];
  /** Moving-average window in frames (odd numbers centre on the frame). */
  window: number;
  /** Corrections above this (px, either axis) are refused: the clip is flagged and left as is. */
  maxShiftPx: number;
}

export interface StabilizeResult {
  frames: Frame[];
  shiftsX: number[];
  shiftsY: number[];
  maxShift: number;
  flagged: boolean;
  /** Range of the band centroid x over the output frames. */
  residualRangePx: number;
}

/** Vertical shifts smaller than this are bobbing (breathing), not drift; leave them alone. */
const MIN_Y_SHIFT = 0.5;

function cloneFrame(frame: Frame): Frame {
  return { data: Buffer.from(frame.data), width: frame.width, height: frame.height };
}

/** Alpha-weighted centroid of rows floor(band[0]·h) .. floor(band[1]·h) (exclusive), pixel centres at +0.5. */
export function bandCentroid(frame: Frame, band: [number, number]): Centroid | null {
  const { width, height, data } = frame;
  const y0 = Math.max(0, Math.min(height, Math.floor(band[0] * height)));
  const y1 = Math.max(0, Math.min(height, Math.floor(band[1] * height)));
  let mass = 0;
  let sx = 0;
  let sy = 0;
  for (let y = y0; y < y1; y++) {
    let rowMass = 0;
    let rowX = 0;
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const a = data[row + x * 4 + 3];
      if (a === 0) continue;
      rowMass += a;
      rowX += a * (x + 0.5);
    }
    mass += rowMass;
    sx += rowX;
    sy += rowMass * (y + 0.5);
  }
  if (mass === 0) return null;
  return { x: sx / mass, y: sy / mass, mass };
}

/**
 * Translate by (dx, dy) pixels (positive = right/down) with bilinear sampling
 * in premultiplied space. Content sampled from outside the frame is transparent.
 */
export function translateFrame(frame: Frame, dx: number, dy: number): Frame {
  const { width, height, data } = frame;
  const out = Buffer.alloc(data.length);
  const acc = [0, 0, 0, 0];
  for (let y = 0; y < height; y++) {
    const sy = y - dy;
    const y0 = Math.floor(sy);
    const fy = sy - y0;
    for (let x = 0; x < width; x++) {
      const sx = x - dx;
      const x0 = Math.floor(sx);
      const fx = sx - x0;
      acc[0] = acc[1] = acc[2] = acc[3] = 0;
      for (let j = 0; j < 2; j++) {
        const yy = y0 + j;
        if (yy < 0 || yy >= height) continue;
        const wy = j === 0 ? 1 - fy : fy;
        if (wy === 0) continue;
        for (let i = 0; i < 2; i++) {
          const xx = x0 + i;
          if (xx < 0 || xx >= width) continue;
          const w = wy * (i === 0 ? 1 - fx : fx);
          if (w === 0) continue;
          const o = (yy * width + xx) * 4;
          const a = data[o + 3];
          if (a === 0) continue;
          const wa = w * a;
          acc[0] += wa * data[o];
          acc[1] += wa * data[o + 1];
          acc[2] += wa * data[o + 2];
          acc[3] += wa;
        }
      }
      const o = (y * width + x) * 4;
      const a = acc[3];
      if (a > 0) {
        out[o] = Math.round(acc[0] / a);
        out[o + 1] = Math.round(acc[1] / a);
        out[o + 2] = Math.round(acc[2] / a);
        out[o + 3] = Math.round(a);
      }
    }
  }
  return { data: out, width, height };
}

/** Circular moving average over `window` neighbours (window 5 → i−2..i+2, wrapping). */
function circularMovingAverage(series: number[], window: number): number[] {
  const n = series.length;
  const half = Math.floor(Math.max(1, window) / 2);
  if (n === 0 || half === 0) return series.slice();
  return series.map((_, i) => {
    let sum = 0;
    for (let j = -half; j <= half; j++) sum += series[(((i + j) % n) + n) % n];
    return sum / (2 * half + 1);
  });
}

function rangeOf(values: number[]): number {
  if (values.length === 0) return 0;
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return max - min;
}

/** Range of the band centroid x across frames (frames without alpha in the band are skipped). */
export function centroidRangeX(frames: Frame[], band: [number, number]): number {
  const xs: number[] = [];
  for (const f of frames) {
    const c = bandCentroid(f, band);
    if (c) xs.push(c.x);
  }
  return rangeOf(xs);
}

/**
 * Register every frame's band centroid to frame 0's. X is always corrected;
 * Y only where the smoothed correction exceeds half a pixel (bobbing is
 * animation, not drift). When any correction, raw or smoothed, exceeds
 * `maxShiftPx` the clip is flagged and returned unchanged.
 */
export function stabilizeFrames(frames: Frame[], opts: StabilizeOptions): StabilizeResult {
  const n = frames.length;
  if (n === 0) {
    return { frames: [], shiftsX: [], shiftsY: [], maxShift: 0, flagged: false, residualRangePx: 0 };
  }
  const centroids = frames.map((f) => bandCentroid(f, opts.band));
  const ref = centroids[0];
  const rawX = centroids.map((c) => (ref && c ? ref.x - c.x : 0));
  const rawY = centroids.map((c) => (ref && c ? ref.y - c.y : 0));
  const smoothX = circularMovingAverage(rawX, opts.window);
  const smoothY = circularMovingAverage(rawY, opts.window).map((v) => (Math.abs(v) > MIN_Y_SHIFT ? v : 0));

  let maxShift = 0;
  for (let i = 0; i < n; i++) {
    maxShift = Math.max(maxShift, Math.abs(rawX[i]), Math.abs(rawY[i]), Math.abs(smoothX[i]), Math.abs(smoothY[i]));
  }
  if (maxShift > opts.maxShiftPx) {
    const copies = frames.map(cloneFrame);
    return {
      frames: copies,
      shiftsX: smoothX,
      shiftsY: smoothY,
      maxShift,
      flagged: true,
      residualRangePx: centroidRangeX(copies, opts.band),
    };
  }

  const out = frames.map((f, i) => (smoothX[i] === 0 && smoothY[i] === 0 ? cloneFrame(f) : translateFrame(f, smoothX[i], smoothY[i])));
  return {
    frames: out,
    shiftsX: smoothX,
    shiftsY: smoothY,
    maxShift,
    flagged: false,
    residualRangePx: centroidRangeX(out, opts.band),
  };
}
