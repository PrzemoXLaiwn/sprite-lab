// =============================================================================
// ST Packs — matte (background removal) for video frames
// =============================================================================
// The video model draws the character on a flat, solid background. We key that
// colour out (colour-difference key with a soft ramp). The key also hits
// interior pixels whose colour is close to the background — light skin,
// highlights, grey metal — and those must not become holes. A flood fill from
// the frame border, through the key's background, marks only the region that
// is actually connected to the edge. Everything else is the silhouette and is
// forced opaque. Partial alpha survives only in a thin band on that outer
// edge, for anti-aliasing and the defringe.
//
// A temporal median of the silhouette alpha then removes one-frame flicker,
// and defringe un-mixes the background from the semi-transparent edge so the
// fringe keeps the subject's colour instead of a grey halo.
//
// Functions that return frames are pure: they return new frames and never
// touch their inputs. closeSilhouette rewrites alpha on a buffer the caller
// already owns (the keyed copy, never the source frame).
// Frames are straight (non-premultiplied) RGBA, 4 bytes per pixel.
//
// matteFrames keeps a single owned buffer per frame and rewrites it in place
// (the median only needs alpha planes), so post-processing does not grow a
// second full copy of the clip.
// =============================================================================

import type { Frame } from "./types";

export type Rgb = [number, number, number];

const DEFAULT_HARD = 18;
const DEFAULT_SOFT = 60;
/** Edge pixels below this alpha (0–1) carry too little subject colour to un-mix reliably. */
const UNMIX_MIN_ALPHA = 0.05;
/** Alpha below this (0–255) after the blur is noise and becomes fully transparent. */
const ALPHA_FLOOR = 8;
/**
 * Key alpha at or below this is background for the border flood (the reference
 * pipeline's 0.5 cutoff). Higher alpha blocks the flood, so it belongs to the
 * silhouette even when the key left it only partly opaque.
 */
const BG_ALPHA = 127;
/**
 * Partial alpha is kept only this many pixels (Chebyshev) from the outer
 * silhouette edge. Deeper foreground is opaque; background farther out is clear.
 * Wide enough that the 1 px defringe erode still has a soft edge to work on.
 */
const EDGE_BAND = 3;
/** Outer strip (px) whose per-channel median is the frame's background colour. */
const BORDER_PX = 8;

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

/**
 * Per-channel median of this frame's border strip. A subject covering less
 * than half the strip cannot move it, and a one-pixel encoding ring is a
 * minority of the default width. `border` is the strip thickness in pixels.
 */
export function estimateBackground(frame: Frame, border = BORDER_PX): Rgb {
  const { width, height, data } = frame;
  const b = Math.max(1, Math.min(Math.floor(border), width, height));
  const r: number[] = [];
  const g: number[] = [];
  const bl: number[] = [];
  const push = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    r.push(data[o]);
    g.push(data[o + 1]);
    bl.push(data[o + 2]);
  };
  if (width === 0 || height === 0) return [0, 0, 0];
  if (b * 2 >= height || b * 2 >= width) {
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) push(x, y);
  } else {
    for (let y = 0; y < b; y++) for (let x = 0; x < width; x++) push(x, y);
    for (let y = height - b; y < height; y++) for (let x = 0; x < width; x++) push(x, y);
    for (let y = b; y < height - b; y++) {
      for (let x = 0; x < b; x++) push(x, y);
      for (let x = width - b; x < width; x++) push(x, y);
    }
  }
  return [medianOf(r), medianOf(g), medianOf(bl)];
}

/**
 * Colour-difference key. Pixels within `hard` of the background colour become
 * transparent, pixels further than `soft` keep their alpha, smoothstep between.
 * RGB is left untouched (defringe un-mixes it later). Does not close holes —
 * that is closeSilhouette, so a caller can still see the raw key.
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

/** Square (Chebyshev) binary dilation. Separable, so it is one pass per axis. */
function dilate(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let m = 0;
      for (let xx = x0; xx <= x1; xx++) {
        if (src[row + xx]) {
          m = 1;
          break;
        }
      }
      tmp[row + x] = m;
    }
  }
  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(height - 1, y + radius);
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let m = 0;
      for (let yy = y0; yy <= y1; yy++) {
        if (tmp[yy * width + x]) {
          m = 1;
          break;
        }
      }
      out[row + x] = m;
    }
  }
  return out;
}

/**
 * Fill key holes inside the character.
 *
 * Flood-fills from the frame border through background-key pixels (alpha ≤ 127,
 * 4-connected). A diagonal nick in the outline does not let the flood in.
 * Pixels the flood cannot reach are foreground: deeper than the outer edge
 * band they become opaque, so an enclosed near-background patch (skin, a
 * highlight, grey metal) cannot punch a hole. Partial alpha is kept only in
 * that band. Background farther from the silhouette is cleared.
 *
 * Mutates `frame` alpha in place. RGB is untouched. Scratch is one frame and
 * is dropped on return — callers run this one frame at a time.
 */
export function closeSilhouette(frame: Frame): void {
  const { data, width, height } = frame;
  const n = width * height;
  if (n === 0) return;

  const reachable = new Uint8Array(n);
  const stack = new Int32Array(n);
  let sp = 0;
  const consider = (i: number) => {
    if (reachable[i] || data[i * 4 + 3] > BG_ALPHA) return;
    reachable[i] = 1;
    stack[sp++] = i;
  };
  for (let x = 0; x < width; x++) {
    consider(x);
    if (height > 1) consider((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    consider(y * width);
    if (width > 1) consider(y * width + width - 1);
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % width;
    const y = (i - x) / width;
    if (x > 0) consider(i - 1);
    if (x + 1 < width) consider(i + 1);
    if (y > 0) consider(i - width);
    if (y + 1 < height) consider(i + width);
  }

  const silhouette = new Uint8Array(n);
  for (let i = 0; i < n; i++) silhouette[i] = reachable[i] ? 0 : 1;
  const nearBg = dilate(reachable, width, height, EDGE_BAND);
  const nearFg = dilate(silhouette, width, height, EDGE_BAND);
  for (let i = 0; i < n; i++) {
    const o = i * 4 + 3;
    if (silhouette[i]) {
      if (!nearBg[i]) data[o] = 255;
    } else if (!nearFg[i]) {
      data[o] = 0;
    }
  }
}

function extractAlpha(frame: Frame): Uint8Array {
  const n = frame.width * frame.height;
  const plane = new Uint8Array(n);
  const { data } = frame;
  for (let i = 0; i < n; i++) plane[i] = data[i * 4 + 3];
  return plane;
}

/**
 * Alpha of frame i := median of alpha(i−1, i, i+1), wrapping circularly.
 * Reads a snapshot of every frame's alpha first, so it can write in place.
 * One byte per pixel, not a second RGBA copy of the clip.
 */
function applyTemporalMedianInPlace(frames: Frame[]): void {
  const n = frames.length;
  if (n < 3) return;
  const planes = frames.map(extractAlpha);
  for (let i = 0; i < n; i++) {
    const prev = planes[(i - 1 + n) % n];
    const cur = planes[i];
    const next = planes[(i + 1) % n];
    const data = frames[i].data;
    for (let p = 0; p < cur.length; p++) data[p * 4 + 3] = median3(prev[p], cur[p], next[p]);
  }
}

/** Alpha of frame i := median of alpha(i−1, i, i+1), wrapping circularly. Removes one-frame flicker. */
export function temporalMedianAlpha(frames: Frame[]): Frame[] {
  const out = frames.map(cloneFrame);
  applyTemporalMedianInPlace(out);
  return out;
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

/** Un-mix, erode and blur one frame's edge. Mutates `frame`. */
function defringeOwned(frame: Frame, bg: Rgb): void {
  const [br, bgG, bb] = bg;
  const { data, width, height } = frame;
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
}

/**
 * Edge clean-up: un-mix the background colour from semi-transparent pixels
 * (I = a·C + (1−a)·B ⇒ C = (I − (1−a)·B) / a), erode the alpha by one pixel,
 * soften it with a small gaussian and zero the near-transparent remainder.
 */
export function defringe(frames: Frame[], bg: Rgb): Frame[] {
  return frames.map((frame) => {
    const out = cloneFrame(frame);
    defringeOwned(out, bg);
    return out;
  });
}

/**
 * Key mode. Each frame is keyed from its own border median, holes inside the
 * silhouette are closed, then the alpha is median-smoothed across neighbours
 * and defringed. One owned buffer per frame — no second RGBA copy of the clip.
 */
export function matteFrames(frames: Frame[], opts: { hard?: number; soft?: number } = {}): { frames: Frame[]; background: Rgb } {
  if (frames.length === 0) return { frames: [], background: [0, 0, 0] };
  const out: Frame[] = new Array(frames.length);
  const backgrounds: Rgb[] = new Array(frames.length);
  for (let i = 0; i < frames.length; i++) {
    backgrounds[i] = estimateBackground(frames[i]);
    const keyed = keyFrame(frames[i], backgrounds[i], opts);
    closeSilhouette(keyed);
    out[i] = keyed;
  }
  applyTemporalMedianInPlace(out);
  for (let i = 0; i < out.length; i++) defringeOwned(out[i], backgrounds[i]);
  return { frames: out, background: backgrounds[0] };
}

/** Frames that already carry alpha from an external matte: temporal median, then defringe. */
export function postMatte(frames: Frame[], bg: Rgb): Frame[] {
  const out = temporalMedianAlpha(frames);
  for (const frame of out) defringeOwned(frame, bg);
  return out;
}
