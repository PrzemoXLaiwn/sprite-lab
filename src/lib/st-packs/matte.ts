// =============================================================================
// ST Packs — matte (background removal) for video frames
// =============================================================================
// The video model is asked for a flat background. It often is not flat: a
// studio still comes back as a soft gradient (lighter near the subject, with
// shadows). A single border colour then stops short of that gradient, and the
// hole fill below would turn the unreached patch into foreground — an opaque
// blob stuck to the character. After the flat key, a gradient walk continues
// through pixels whose colour keeps step with the background already found.
// A short lookahead refuses the walk when the surface ahead is a different
// object, so skin, hair and light clothing stay put.
//
// The key also hits interior pixels whose colour is close to the background —
// light skin, highlights, grey metal — and those must not become holes. A
// flood fill from the frame border, through the key's background, marks only
// the region that is actually connected to the edge. Everything else is the
// silhouette and is forced opaque. Partial alpha survives only in a thin band
// on that outer edge, for anti-aliasing and the defringe.
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
/**
 * Gradient walk. A studio backdrop moves a couple of levels per pixel; an
 * edge into the character is a jump. The anchor is an exponential average
 * (α = 1/2) of the colours already accepted, so a gentle slope stays within
 * ANCHOR of it and a surface we stepped onto by mistake runs away.
 * LOOK pixels ahead must still look like that anchor — otherwise the walk
 * is about to enter a different object and stops, a few pixels early. The
 * nibble then clears only that short remainder.
 */
const WALK_LOOK = 3;
const WALK_AHEAD2 = 14 * 14;
const WALK_STEP2 = 16 * 16;
const WALK_ANCHOR2 = 18 * 18;
const WALK_CHROMA = 14;
const WALK_CHROMA_SLACK = 8;
/**
 * A new flat surface (a grey sleeve, a white cuff) is level a few pixels
 * ahead and a jump away from the background a few pixels behind. A gradient
 * plateau fails the jump: the pixels behind were already the same colour.
 */
const WALK_FLAT2 = 8 * 8;
const WALK_JUMP2 = 8 * 8;
const NIBBLE_STEP2 = 5 * 5;
const NIBBLE_DEPTH = 4;
/**
 * Detached leftover: low chroma, and most of its outline matches the cleared
 * background. Wide enough that a hard-edged patch the walk refused (a few
 * dozen levels off the backdrop) still counts, and narrow enough that a
 * separated light object does not.
 */
const ISLAND_CHROMA = 12;
const ISLAND_DIST2 = 30 * 30;

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

function chromaOf(r: number, g: number, b: number): number {
  const max = r > g ? (r > b ? r : b) : g > b ? g : b;
  const min = r < g ? (r < b ? r : b) : g < b ? g : b;
  return max - min;
}

function dist2(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return dr * dr + dg * dg + db * db;
}

/**
 * Continue the flat key across a soft gradient.
 *
 * The walk runs on a half-resolution average, starting at the frame border
 * and never inside a hole the colour key punched. A neighbour joins when the
 * step is small, the colour stays close to a drifting anchor, and a few cells
 * further on is still the same surface. The anchor moves halfway toward each
 * accepted cell, so a long gentle slope (lighter near the subject, a soft
 * shadow) stays reachable. A flat garment is level ahead and a jump away from
 * the background behind, so the walk stops. High chroma relative to the
 * anchor — skin, hair, a coloured sweater — never joins. The mask is lifted
 * back to full resolution (a cell only clears pixels that still match its
 * anchor) and nibbled a few pixels to the real edge. Low-alpha pixels the
 * walk did not reach are put back to opaque: the grey sleeve the flat key
 * had punched out, and the enclosed white shirt.
 */
function extendGradientBackground(frame: Frame): void {
  const { data, width, height } = frame;
  const n = width * height;
  const hw = width >> 1;
  const hh = height >> 1;
  if (hw < 2 || hh < 2) return;
  const sn = hw * hh;
  const rgb = new Uint8Array(sn * 3);
  for (let y = 0; y < hh; y++) {
    const y0 = y * 2;
    for (let x = 0; x < hw; x++) {
      const x0 = x * 2;
      const o00 = (y0 * width + x0) * 4;
      const o10 = o00 + 4;
      const o01 = o00 + width * 4;
      const o11 = o01 + 4;
      const r = data[o00] + data[o10] + data[o01] + data[o11];
      const g = data[o00 + 1] + data[o10 + 1] + data[o01 + 1] + data[o11 + 1];
      const b = data[o00 + 2] + data[o10 + 2] + data[o01 + 2] + data[o11 + 2];
      const t = (y * hw + x) * 3;
      rgb[t] = (r + 2) >> 2;
      rgb[t + 1] = (g + 2) >> 2;
      rgb[t + 2] = (b + 2) >> 2;
    }
  }

  const bg = new Uint8Array(sn);
  const ar = new Uint8Array(sn);
  const ag = new Uint8Array(sn);
  const ab = new Uint8Array(sn);
  const q = new Int32Array(sn);
  let qn = 0;
  const seedAt = (i: number) => {
    if (bg[i]) return;
    const o = i * 3;
    bg[i] = 1;
    ar[i] = rgb[o];
    ag[i] = rgb[o + 1];
    ab[i] = rgb[o + 2];
    q[qn++] = i;
  };
  // A half-res border cell is a seed when the real frame border behind it was keyed out.
  const keyed = (x: number, y: number) => data[(y * width + x) * 4 + 3] <= BG_ALPHA;
  for (let x = 0; x < hw; x++) {
    if (keyed(x * 2, 0) || keyed(x * 2 + 1, 0)) seedAt(x);
    const by = height - 1;
    if (keyed(x * 2, by) || keyed(x * 2 + 1, by)) seedAt((hh - 1) * hw + x);
  }
  for (let y = 0; y < hh; y++) {
    if (keyed(0, y * 2) || keyed(0, Math.min(height - 1, y * 2 + 1))) seedAt(y * hw);
    const rx = width - 1;
    if (keyed(rx, y * 2) || keyed(rx, Math.min(height - 1, y * 2 + 1))) seedAt(y * hw + hw - 1);
  }
  if (qn === 0) return;

  const accept = (i: number, j: number, stepLimit: number, look: boolean): boolean => {
    if (bg[j]) return false;
    const o = j * 3;
    const r = rgb[o];
    const g = rgb[o + 1];
    const b = rgb[o + 2];
    const po = i * 3;
    if (dist2(r, g, b, rgb[po], rgb[po + 1], rgb[po + 2]) > stepLimit) return false;
    if (dist2(r, g, b, ar[i], ag[i], ab[i]) > (look ? WALK_ANCHOR2 : stepLimit)) return false;
    const lim = Math.max(WALK_CHROMA, chromaOf(ar[i], ag[i], ab[i]) + WALK_CHROMA_SLACK);
    if (chromaOf(r, g, b) > lim) return false;
    if (look) {
      const ix = i % hw;
      const iy = (i - ix) / hw;
      const jx = j % hw;
      const jy = (j - jx) / hw;
      const dx = jx - ix;
      const dy = jy - iy;
      const ax = jx + dx * WALK_LOOK;
      const ay = jy + dy * WALK_LOOK;
      if (ax >= 0 && ay >= 0 && ax < hw && ay < hh) {
        const ao = (ay * hw + ax) * 3;
        const rr = rgb[ao];
        const gg = rgb[ao + 1];
        const bb = rgb[ao + 2];
        if (dist2(rr, gg, bb, ar[i], ag[i], ab[i]) > WALK_AHEAD2) return false;
        if (chromaOf(rr, gg, bb) > lim) return false;
        const bx = jx - dx * WALK_LOOK;
        const by = jy - dy * WALK_LOOK;
        if (bx >= 0 && by >= 0 && bx < hw && by < hh) {
          const bo = (by * hw + bx) * 3;
          // Flat ahead, and a real step up from the background behind: a garment, not the plateau of the gradient.
          if (dist2(rr, gg, bb, r, g, b) <= WALK_FLAT2 && dist2(r, g, b, rgb[bo], rgb[bo + 1], rgb[bo + 2]) > WALK_JUMP2) return false;
        }
      }
    }
    bg[j] = 1;
    ar[j] = (ar[i] + r + 1) >> 1;
    ag[j] = (ag[i] + g + 1) >> 1;
    ab[j] = (ab[i] + b + 1) >> 1;
    return true;
  };

  let qh = 0;
  while (qh < qn) {
    const i = q[qh++];
    const x = i % hw;
    const y = (i - x) / hw;
    if (x > 0 && accept(i, i - 1, WALK_STEP2, true)) q[qn++] = i - 1;
    if (x + 1 < hw && accept(i, i + 1, WALK_STEP2, true)) q[qn++] = i + 1;
    if (y > 0 && accept(i, i - hw, WALK_STEP2, true)) q[qn++] = i - hw;
    if (y + 1 < hh && accept(i, i + hw, WALK_STEP2, true)) q[qn++] = i + hw;
  }

  const full = new Uint8Array(n);
  const far = new Uint8Array(n);
  const fag = new Uint8Array(n);
  const fab = new Uint8Array(n);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < hw; x++) {
      const s = y * hw + x;
      if (!bg[s]) continue;
      const sr = ar[s], sg = ag[s], sb = ab[s];
      const lim = Math.max(WALK_CHROMA, chromaOf(sr, sg, sb) + WALK_CHROMA_SLACK);
      for (let dy = 0; dy < 2; dy++) {
        for (let dx = 0; dx < 2; dx++) {
          const X = x * 2 + dx;
          const Y = y * 2 + dy;
          const p = Y * width + X;
          const o = p * 4;
          const r = data[o], g = data[o + 1], b = data[o + 2];
          if (dist2(r, g, b, sr, sg, sb) > WALK_ANCHOR2) continue;
          if (chromaOf(r, g, b) > lim) continue;
          full[p] = 1;
          far[p] = sr;
          fag[p] = sg;
          fab[p] = sb;
        }
      }
    }
  }

  // Half-res lookahead stops a few pixels early, and an odd last row is not in the grid.
  // Nibble only from the mask boundary, a few pixels, so this cannot cross into a garment.
  const depth = new Uint8Array(n);
  const fq = new Int32Array(n);
  let fn = 0;
  for (let i = 0; i < n; i++) {
    if (!full[i]) continue;
    const x = i % width;
    const y = (i - x) / width;
    if ((x > 0 && !full[i - 1]) || (x + 1 < width && !full[i + 1]) || (y > 0 && !full[i - width]) || (y + 1 < height && !full[i + width])) fq[fn++] = i;
  }
  const take = (i: number, j: number, next: number) => {
    if (full[j]) return;
    const o = j * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const po = i * 4;
    if (dist2(r, g, b, data[po], data[po + 1], data[po + 2]) > NIBBLE_STEP2) return;
    if (dist2(r, g, b, far[i], fag[i], fab[i]) > NIBBLE_STEP2) return;
    const lim = Math.max(WALK_CHROMA, chromaOf(far[i], fag[i], fab[i]) + WALK_CHROMA_SLACK);
    if (chromaOf(r, g, b) > lim) return;
    full[j] = 1;
    depth[j] = next;
    far[j] = (far[i] + r + 1) >> 1;
    fag[j] = (fag[i] + g + 1) >> 1;
    fab[j] = (fab[i] + b + 1) >> 1;
    fq[fn++] = j;
  };
  let fh = 0;
  while (fh < fn) {
    const i = fq[fh++];
    if (depth[i] >= NIBBLE_DEPTH) continue;
    const x = i % width;
    const y = (i - x) / width;
    const next = depth[i] + 1;
    if (x > 0) take(i, i - 1, next);
    if (x + 1 < width) take(i, i + 1, next);
    if (y > 0) take(i, i - width, next);
    if (y + 1 < height) take(i, i + width, next);
  }

  for (let i = 0; i < n; i++) {
    if (full[i]) data[i * 4 + 3] = 0;
    else if (data[i * 4 + 3] <= BG_ALPHA) data[i * 4 + 3] = 255;
  }
}

/**
 * Drop detached leftovers of the background.
 *
 * The character is one connected opaque mass (an enclosed white shirt is part
 * of it, not its own island). A patch the walk missed, sitting in already
 * cleared background and coloured like it, is a separate component. The
 * largest component is never dropped, so a pale character cannot be removed
 * by being the thing this function is unsure about.
 */
function dropBackgroundIslands(frame: Frame): void {
  const { data, width, height } = frame;
  const n = width * height;
  if (n === 0) return;
  const seen = new Uint8Array(n);
  const comp = new Int32Array(n);
  const stack = new Int32Array(n);
  const areas: number[] = [0];
  const chromaSum: number[] = [0];
  const boundary: number[] = [0];
  const matched: number[] = [0];
  let comps = 0;
  let bestArea = 0;
  let bestId = 0;
  for (let s = 0; s < n; s++) {
    if (seen[s] || data[s * 4 + 3] <= BG_ALPHA) continue;
    const id = ++comps;
    let sp = 0;
    stack[sp++] = s;
    seen[s] = 1;
    let area = 0;
    let csum = 0;
    let bound = 0;
    let match = 0;
    const touch = (j: number, r0: number, g0: number, b0: number) => {
      if (data[j * 4 + 3] <= BG_ALPHA) {
        bound++;
        const jo = j * 4;
        if (dist2(r0, g0, b0, data[jo], data[jo + 1], data[jo + 2]) <= ISLAND_DIST2) match++;
        return;
      }
      if (!seen[j]) {
        seen[j] = 1;
        stack[sp++] = j;
      }
    };
    while (sp > 0) {
      const i = stack[--sp];
      comp[i] = id;
      area++;
      const o = i * 4;
      const r0 = data[o];
      const g0 = data[o + 1];
      const b0 = data[o + 2];
      csum += chromaOf(r0, g0, b0);
      const x = i % width;
      const y = (i - x) / width;
      if (x > 0) touch(i - 1, r0, g0, b0);
      if (x + 1 < width) touch(i + 1, r0, g0, b0);
      if (y > 0) touch(i - width, r0, g0, b0);
      if (y + 1 < height) touch(i + width, r0, g0, b0);
    }
    areas.push(area);
    chromaSum.push(csum);
    boundary.push(bound);
    matched.push(match);
    if (area > bestArea) {
      bestArea = area;
      bestId = id;
    }
  }
  const drop = new Uint8Array(comps + 1);
  let any = false;
  for (let id = 1; id <= comps; id++) {
    if (id === bestId || boundary[id] === 0) continue;
    if (chromaSum[id] / areas[id] > ISLAND_CHROMA) continue;
    if (matched[id] * 2 < boundary[id]) continue;
    drop[id] = 1;
    any = true;
  }
  if (!any) return;
  for (let i = 0; i < n; i++) if (drop[comp[i]]) data[i * 4 + 3] = 0;
}

/**
 * Key one frame: flat colour key, gradient walk, hole fill, then drop detached
 * background islands. Does not defringe — matteFrames and the Runware fallback
 * both finish with the shared temporal median and defringe.
 */
export function matteKeyFrame(frame: Frame, opts: { hard?: number; soft?: number } = {}): { frame: Frame; background: Rgb } {
  const background = estimateBackground(frame);
  const keyed = keyFrame(frame, background, opts);
  extendGradientBackground(keyed);
  closeSilhouette(keyed);
  dropBackgroundIslands(keyed);
  return { frame: keyed, background };
}

/**
 * Key mode. Each frame is keyed from its own border median, the gradient past
 * that colour is walked, holes inside the silhouette are closed, then the
 * alpha is median-smoothed across neighbours and defringed. One owned buffer
 * per frame — no second RGBA copy of the clip.
 */
export function matteFrames(frames: Frame[], opts: { hard?: number; soft?: number } = {}): { frames: Frame[]; background: Rgb } {
  if (frames.length === 0) return { frames: [], background: [0, 0, 0] };
  const out: Frame[] = new Array(frames.length);
  const backgrounds: Rgb[] = new Array(frames.length);
  for (let i = 0; i < frames.length; i++) {
    const keyed = matteKeyFrame(frames[i], opts);
    backgrounds[i] = keyed.background;
    out[i] = keyed.frame;
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
