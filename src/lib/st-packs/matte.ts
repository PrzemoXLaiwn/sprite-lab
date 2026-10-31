// =============================================================================
// ST Packs — matte (background removal) for video frames
// =============================================================================
// The video model draws the character on a flat, solid background. We key that
// colour out (colour-difference key with a soft ramp), remove one-frame mask
// flicker with a temporal median of the alpha channel, then un-mix the
// background from the semi-transparent edge pixels so the fringe keeps the
// subject's colour instead of a grey/background-tinted halo.
//
// All functions are pure: they return new frames and never touch their inputs.
// Frames are straight (non-premultiplied) RGBA, 4 bytes per pixel.
// =============================================================================

import type { Frame } from "./types";

export type Rgb = [number, number, number];

const DEFAULT_HARD = 18;
const DEFAULT_SOFT = 60;
/** Edge pixels below this alpha (0–1) carry too little subject colour to un-mix reliably. */
const UNMIX_MIN_ALPHA = 0.05;
/** Alpha below this (0–255) after the blur is noise and becomes fully transparent. */
const ALPHA_FLOOR = 8;

function cloneFrame(frame: Frame): Frame {
  return { data: Buffer.from(frame.data), width: frame.width, height: frame.height };
}

function medianOf(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function median3(a: number, b: number, c: number): number {
  if (a > b) [a, b] = [b, a];
  if (b > c) [b, c] = [c, b];
  if (a > b) [a, b] = [b, a];
  return b;
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

/** Per-channel median colour of the four `patch`×`patch` corner patches. */
export function estimateBackground(frame: Frame, patch = 24): Rgb {
  const { width, height, data } = frame;
  const ps = Math.max(1, Math.min(Math.floor(patch), width, height));
  const xs = [0, Math.max(0, width - ps)];
  const ys = [0, Math.max(0, height - ps)];
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  for (const y0 of ys) {
    for (const x0 of xs) {
      for (let y = y0; y < y0 + ps; y++) {
        for (let x = x0; x < x0 + ps; x++) {
          const o = (y * width + x) * 4;
          r.push(data[o]);
          g.push(data[o + 1]);
          b.push(data[o + 2]);
        }
      }
    }
  }
  return [medianOf(r), medianOf(g), medianOf(b)];
}

/**
 * Colour-difference key. Pixels within `hard` of the background colour become
 * transparent, pixels further than `soft` keep their alpha, smoothstep between.
 * RGB is left untouched (defringe un-mixes it later).
 */
export function keyFrame(frame: Frame, bg: Rgb, opts: { hard?: number; soft?: number } = {}): Frame {
  const hard = opts.hard ?? DEFAULT_HARD;
  const soft = opts.soft ?? DEFAULT_SOFT;
  const out = cloneFrame(frame);
  const { data } = out;
  const [br, bgG, bb] = bg;
  const range = soft - hard;
  for (let o = 0; o < data.length; o += 4) {
    const dr = data[o] - br;
    const dg = data[o + 1] - bgG;
    const db = data[o + 2] - bb;
    const d = Math.sqrt(dr * dr + dg * dg + db * db);
    let factor: number;
    if (d <= hard) factor = 0;
    else if (d >= soft || range <= 0) factor = 1;
    else {
      const t = (d - hard) / range;
      factor = t * t * (3 - 2 * t);
    }
    data[o + 3] = Math.round(data[o + 3] * factor);
  }
  return out;
}

/** Alpha of frame i := median of alpha(i−1, i, i+1), wrapping circularly. Removes one-frame flicker. */
export function temporalMedianAlpha(frames: Frame[]): Frame[] {
  const n = frames.length;
  if (n < 3) return frames.map(cloneFrame);
  return frames.map((frame, i) => {
    const prev = frames[(i - 1 + n) % n].data;
    const next = frames[(i + 1) % n].data;
    const out = cloneFrame(frame);
    const { data } = out;
    for (let o = 3; o < data.length; o += 4) {
      data[o] = median3(prev[o], frame.data[o], next[o]);
    }
    return out;
  });
}

/** 3×3 min filter on alpha; out-of-bounds neighbours are ignored. */
function erodeAlpha(data: Buffer, width: number, height: number): Uint8Array {
  const src = new Uint8Array(width * height);
  for (let i = 0; i < src.length; i++) src[i] = data[i * 4 + 3];
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - 1);
      const x1 = Math.min(width - 1, x + 1);
      let m = 255;
      for (let yy = y0; yy <= y1; yy++) {
        const row = yy * width;
        for (let xx = x0; xx <= x1; xx++) {
          const v = src[row + xx];
          if (v < m) m = v;
        }
      }
      out[y * width + x] = m;
    }
  }
  return out;
}

/** 3×3 gaussian (1 2 1 / 2 4 2 / 1 2 1, σ≈0.6) on alpha; borders renormalise over the in-bounds taps. */
function blurAlpha(src: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(src.length);
  const taps = [1, 2, 1];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let wsum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= width) continue;
          const w = taps[dy + 1] * taps[dx + 1];
          sum += w * src[yy * width + xx];
          wsum += w;
        }
      }
      out[y * width + x] = Math.round(sum / wsum);
    }
  }
  return out;
}

/**
 * Edge clean-up: un-mix the background colour from semi-transparent pixels
 * (I = a·C + (1−a)·B ⇒ C = (I − (1−a)·B) / a), erode the alpha by one pixel,
 * soften it with a small gaussian and zero the near-transparent remainder.
 */
export function defringe(frames: Frame[], bg: Rgb): Frame[] {
  const [br, bgG, bb] = bg;
  return frames.map((frame) => {
    const out = cloneFrame(frame);
    const { data, width, height } = out;
    for (let o = 0; o < data.length; o += 4) {
      const a = data[o + 3] / 255;
      if (a <= UNMIX_MIN_ALPHA || a >= 1) continue;
      const k = 1 - a;
      data[o] = Math.round(clampByte((data[o] - k * br) / a));
      data[o + 1] = Math.round(clampByte((data[o + 1] - k * bgG) / a));
      data[o + 2] = Math.round(clampByte((data[o + 2] - k * bb) / a));
    }
    const eroded = erodeAlpha(data, width, height);
    const blurred = blurAlpha(eroded, width, height);
    for (let i = 0; i < blurred.length; i++) {
      const v = blurred[i];
      data[i * 4 + 3] = v < ALPHA_FLOOR ? 0 : v;
    }
    return out;
  });
}

/** Key mode: background from frame 0, colour key every frame, temporal median, defringe. */
export function matteFrames(frames: Frame[], opts: { hard?: number; soft?: number } = {}): { frames: Frame[]; background: Rgb } {
  if (frames.length === 0) return { frames: [], background: [0, 0, 0] };
  const background = estimateBackground(frames[0]);
  const keyed = frames.map((f) => keyFrame(f, background, opts));
  return { frames: defringe(temporalMedianAlpha(keyed), background), background };
}

/** Frames that already carry alpha from an external matte: temporal median, then defringe. */
export function postMatte(frames: Frame[], bg: Rgb): Frame[] {
  return defringe(temporalMedianAlpha(frames), bg);
}
