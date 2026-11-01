// =============================================================================
// ST Packs — matte (background removal) for video frames
// =============================================================================
// The video model draws the character on a light background that is often a
// soft gradient with shadows, not a flat colour. A single border median cannot
// describe that field: the colour key leaves a patch opaque, and treating
// every unreached patch as foreground (the hole fill) glues that patch to the
// character as a ragged blob.
//
// The background is a smooth plane fitted to the border (inliers only, so a
// waist-up body along the bottom edge does not tilt it). A 4-connected flood
// grows from border pixels that lie on the plane, stepping only through small
// colour changes that also stay near the plane. That follows a gradient and a
// soft shadow, and stops at the character's edge — so skin, face and light
// clothing are not entered just because they resemble the backdrop. Enclosed
// pixels the flood never reaches stay opaque (the flat-key hole case), except
// a narrow backdrop pocket between a limb and the torso. That pocket is chosen
// once on frame 0 — a white shirt is the same colour as a light ground, so a
// per-frame colour test eats it and flickers. Other
// connected components are kept only when they are large and unlike the
// backdrop; the largest one is the character. Partial alpha survives only in
// a thin band on that outer edge, for anti-aliasing and the defringe.
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

/** Square (Chebyshev) binary dilation. Separable, one sliding window per axis. */
function dilate(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    let sum = 0;
    const ramp = Math.min(width - 1, radius);
    for (let x = 0; x <= ramp; x++) sum += src[row + x];
    for (let x = 0; x < width; x++) {
      tmp[row + x] = sum > 0 ? 1 : 0;
      const remove = x - radius;
      if (remove >= 0) sum -= src[row + remove];
      const add = x + radius + 1;
      if (add < width) sum += src[row + add];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    const ramp = Math.min(height - 1, radius);
    for (let y = 0; y <= ramp; y++) sum += tmp[y * width + x];
    for (let y = 0; y < height; y++) {
      out[y * width + x] = sum > 0 ? 1 : 0;
      const remove = y - radius;
      if (remove >= 0) sum -= tmp[remove * width + x];
      const add = y + radius + 1;
      if (add < height) sum += tmp[add * width + x];
    }
  }
  return out;
}

/** Separable binary erosion (Chebyshev). Inverse of `dilate`. */
function erodeBin(src: Uint8Array, width: number, height: number, radius: number): Uint8Array {
  if (radius <= 0) return src;
  const tmp = new Uint8Array(src.length);
  const out = new Uint8Array(src.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(width - 1, x + radius);
      let m = 1;
      for (let xx = x0; xx <= x1; xx++) {
        if (!src[row + xx]) {
          m = 0;
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
      let m = 1;
      for (let yy = y0; yy <= y1 && m; yy++) {
        if (!tmp[yy * width + x]) m = 0;
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
  const min9 = (o: number, up: number, dn: number) => {
    let m = src[o];
    const a = src[o - 1]; if (a < m) m = a;
    const b = src[o + 1]; if (b < m) m = b;
    const c = src[up]; if (c < m) m = c;
    const d = src[up - 1]; if (d < m) m = d;
    const e = src[up + 1]; if (e < m) m = e;
    const f = src[dn]; if (f < m) m = f;
    const g = src[dn - 1]; if (g < m) m = g;
    const h = src[dn + 1]; if (h < m) m = h;
    return m;
  };
  if (width >= 3 && height >= 3) {
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const up = row - width;
      const dn = row + width;
      for (let x = 1; x < width - 1; x++) {
        const c = src[row + x];
        if ((c === 0 || c === 255) && src[up + x] === c && src[dn + x] === c && src[row + x - 1] === c && src[row + x + 1] === c) {
          out[row + x] = c;
          continue;
        }
        out[row + x] = min9(row + x, up + x, dn + x);
      }
    }
  }
  const edgeMin = (x: number, y: number) => {
    const y0 = Math.max(0, y - 1);
    const y1 = Math.min(height - 1, y + 1);
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
    return m;
  };
  for (let x = 0; x < width; x++) {
    out[x] = edgeMin(x, 0);
    if (height > 1) out[(height - 1) * width + x] = edgeMin(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    out[y * width] = edgeMin(0, y);
    if (width > 1) out[y * width + width - 1] = edgeMin(width - 1, y);
  }
  return out;
}

/** 3×3 gaussian (1 2 1 / 2 4 2 / 1 2 1, σ≈0.6) on alpha; borders renormalise over the in-bounds taps. */
function blurAlpha(src: Uint8Array, width: number, height: number): Uint8Array {
  const out = new Uint8Array(src.length);
  if (width >= 3 && height >= 3) {
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      const up = row - width;
      const dn = row + width;
      for (let x = 1; x < width - 1; x++) {
        const c = src[row + x];
        if ((c === 0 || c === 255) && src[up + x] === c && src[dn + x] === c && src[row + x - 1] === c && src[row + x + 1] === c) {
          out[row + x] = c;
          continue;
        }
        const sum =
          src[up + x - 1] + 2 * src[up + x] + src[up + x + 1] +
          2 * src[row + x - 1] + 4 * src[row + x] + 2 * src[row + x + 1] +
          src[dn + x - 1] + 2 * src[dn + x] + src[dn + x + 1];
        out[row + x] = (sum + 8) >> 4;
      }
    }
  }
  const taps = [1, 2, 1];
  const edge = (x: number, y: number) => {
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
    return Math.round(sum / wsum);
  };
  for (let x = 0; x < width; x++) {
    out[x] = edge(x, 0);
    if (height > 1) out[(height - 1) * width + x] = edge(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    out[y * width] = edge(0, y);
    if (width > 1) out[y * width + width - 1] = edge(width - 1, y);
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

/** Euclidean RGB distance. */
function rgbDist(r0: number, g0: number, b0: number, r1: number, g1: number, b1: number): number {
  const dr = r0 - r1, dg = g0 - g1, db = b0 - b1;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** Smoothstep key factor against a colour distance. 0 = background, 1 = solid. */
function keyFactor(dist: number, hard: number, soft: number): number {
  if (dist <= hard) return 0;
  const range = soft - hard;
  if (dist >= soft || range <= 0) return 1;
  const t = (dist - hard) / range;
  return t * t * (3 - 2 * t);
}

type Plane = { a: number; b: number; c: number };

/** Solve M x = rhs for a 3×3 row-major matrix. Null when the fit is degenerate. */
function solve3(m: number[], rhs: number[]): [number, number, number] | null {
  const a = m.slice();
  const b = rhs.slice();
  for (let col = 0; col < 3; col++) {
    let piv = col;
    for (let row = col + 1; row < 3; row++) {
      if (Math.abs(a[row * 3 + col]) > Math.abs(a[piv * 3 + col])) piv = row;
    }
    if (Math.abs(a[piv * 3 + col]) < 1e-8) return null;
    if (piv !== col) {
      for (let k = col; k < 3; k++) {
        const tmp = a[col * 3 + k];
        a[col * 3 + k] = a[piv * 3 + k];
        a[piv * 3 + k] = tmp;
      }
      const tb = b[col];
      b[col] = b[piv];
      b[piv] = tb;
    }
    const div = a[col * 3 + col];
    for (let row = col + 1; row < 3; row++) {
      const f = a[row * 3 + col] / div;
      if (f === 0) continue;
      for (let k = col; k < 3; k++) a[row * 3 + k] -= f * a[col * 3 + k];
      b[row] -= f * b[col];
    }
  }
  const x: [number, number, number] = [0, 0, 0];
  for (let row = 2; row >= 0; row--) {
    let s = b[row];
    for (let k = row + 1; k < 3; k++) s -= a[row * 3 + k] * x[k];
    const diag = a[row * 3 + row];
    if (Math.abs(diag) < 1e-8) return null;
    x[row] = s / diag;
  }
  return x;
}

function fitPlane(xs: number[], ys: number[], vs: number[]): Plane | null {
  const n = xs.length;
  if (n < 3) return null;
  let sx = 0, sy = 0, sx2 = 0, sy2 = 0, sxy = 0, sv = 0, sxv = 0, syv = 0;
  for (let i = 0; i < n; i++) {
    const x = xs[i], y = ys[i], v = vs[i];
    sx += x; sy += y; sx2 += x * x; sy2 += y * y; sxy += x * y;
    sv += v; sxv += x * v; syv += y * v;
  }
  const sol = solve3(
    [n, sx, sy, sx, sx2, sxy, sy, sxy, sy2],
    [sv, sxv, syv],
  );
  if (!sol || !sol.every(Number.isFinite)) return null;
  return { a: sol[0], b: sol[1], c: sol[2] };
}

type Backdrop = {
  median: Rgb;
  plane: [Plane, Plane, Plane];
  invW: number;
  invH: number;
};

/**
 * Border pixels within this distance of the median may vote in the first fit.
 * Wide enough to include a studio gradient, tight enough to drop a coloured
 * body sitting on the bottom edge.
 */
const PLANE_INLIER = 110;
/** Residual above this is dropped before the second fit (the body, a logo). */
const PLANE_REFIT = 36;
/** A border pixel this close to the plane is a flood seed. */
const SEED_DIST = 28;
/** Largest per-step jump the flood may take (stops at the character edge). */
const STEP_DIST = 18;
/** A smooth step is still rejected once it has wandered this far from the plane. */
const LOOSE_DIST = 48;
/** A non-main component whose RMS plane distance is below this is leftover backdrop. */
const ISLAND_DIST = 40;
/** Non-main components smaller than this are specks and are dropped. */
const SPECK_PX = 64;
const SEED2 = SEED_DIST * SEED_DIST;
const STEP2 = STEP_DIST * STEP_DIST;
const LOOSE2 = LOOSE_DIST * LOOSE_DIST;
const ISLAND2 = ISLAND_DIST * ISLAND_DIST;
/**
 * Enclosed pixels this close to the backdrop plane are the same colour as the
 * ground (a gap between an arm and the coat), not a white shirt. A shirt is
 * either farther from the plane or the largest such region and is kept.
 */
const HOLE_DIST = 14;
const HOLE2 = HOLE_DIST * HOLE_DIST;
/**
 * How far a dark limb is allowed to bridge when looking for an armpit gap.
 * A shirt panel is wider than this and stays opaque.
 */
const GAP_BRIDGE = 12;
/** Enclosed near-backdrop region bigger than this share of the silhouette is clothing. */
const GAP_MAX_FRAC = 0.08;
/** Pixels inside this fraction of the silhouette width, around its middle, are the torso. */
const GAP_CENTRAL_WIDTH = 0.42;
/** A region with at least this share of its pixels in that column is clothing, not a side gap. */
const GAP_CENTRAL_SHARE = 0.3;
/** Share of a region that must sit in the bridged concavity before it can be cleared. */
const GAP_BRIDGE_SHARE = 0.8;
/** Tracked gap pixels are cleared only while they still read as backdrop, so a shifted coat is not punched. */
const GAP_APPLY = 28;
const GAP_APPLY2 = GAP_APPLY * GAP_APPLY;
/** Centroid shift beyond this is a bad measurement, not idle motion. */
const GAP_SHIFT_MAX = 32;

interface GapPlan {
  /** Pixels cleared on the reference frame. Later frames reuse it, shifted. */
  mask: Uint8Array;
  refX: number;
  refY: number;
}

function foregroundCentroid(dist2: Float32Array, reached: Uint8Array, width: number, height: number): { x: number; y: number; n: number } {
  const n = width * height;
  let solidN = 0;
  let sx = 0;
  let sy = 0;
  let anyN = 0;
  let ax = 0;
  let ay = 0;
  for (let i = 0; i < n; i++) {
    if (reached[i]) continue;
    const x = i % width;
    const y = (i / width) | 0;
    anyN++;
    ax += x;
    ay += y;
    if (dist2[i] > HOLE2) {
      solidN++;
      sx += x;
      sy += y;
    }
  }
  if (solidN >= 16) return { x: sx / solidN, y: sy / solidN, n: solidN };
  if (anyN > 0) return { x: ax / anyN, y: ay / anyN, n: anyN };
  return { x: width / 2, y: height / 2, n: 0 };
}

/**
 * Enclosed regions that are the backdrop trapped in a concave limb–torso gap.
 * Decided on one frame. A white shirt is the same colour as a light backdrop,
 * so colour alone cannot tell them apart: a region is cleared only when it is
 * small, off the torso column, thin enough for the limb bridge to close, and
 * actually sitting in that concavity. Anything central or large stays opaque.
 */
function buildGapMask(dist2: Float32Array, reached: Uint8Array, width: number, height: number): Uint8Array {
  const n = width * height;
  const mask = new Uint8Array(n);
  const solid = new Uint8Array(n);
  let silCount = 0;
  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let i = 0; i < n; i++) {
    if (reached[i]) continue;
    silCount++;
    const x = i % width;
    const y = (i / width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    if (dist2[i] > HOLE2) solid[i] = 1;
  }
  if (silCount < 32 || maxX < minX) return mask;
  const silW = maxX - minX + 1;
  const mid = (minX + maxX) / 2;
  const halfBand = (silW * GAP_CENTRAL_WIDTH) / 2;
  const band0 = mid - halfBand;
  const band1 = mid + halfBand;
  const maxArea = Math.max(24, Math.floor(silCount * GAP_MAX_FRAC));
  const thickCap = Math.max(GAP_BRIDGE * 2, Math.round(silW * 0.1));
  const closed = erodeBin(dilate(solid, width, height, GAP_BRIDGE), width, height, GAP_BRIDGE);
  const seen = new Uint8Array(n);
  const queue = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (reached[s] || seen[s] || dist2[s] > HOLE2) continue;
    const pixels: number[] = [];
    let qh = 0;
    let qt = 0;
    seen[s] = 1;
    queue[qt++] = s;
    let inBand = 0;
    let bridged = 0;
    let cminX = width;
    let cmaxX = -1;
    let cminY = height;
    let cmaxY = -1;
    while (qh < qt) {
      const i = queue[qh++];
      pixels.push(i);
      const x = i % width;
      const y = (i / width) | 0;
      if (x < cminX) cminX = x;
      if (x > cmaxX) cmaxX = x;
      if (y < cminY) cminY = y;
      if (y > cmaxY) cmaxY = y;
      if (x >= band0 && x <= band1) inBand++;
      if (closed[i] && !solid[i]) bridged++;
      const take = (j: number) => {
        if (reached[j] || seen[j] || dist2[j] > HOLE2) return;
        seen[j] = 1;
        queue[qt++] = j;
      };
      if (x > 0) take(i - 1);
      if (x + 1 < width) take(i + 1);
      if (i >= width) take(i - width);
      if (i + width < n) take(i + width);
    }
    const size = pixels.length;
    if (size > maxArea) continue;
    if (inBand / size >= GAP_CENTRAL_SHARE) continue;
    if (bridged / size < GAP_BRIDGE_SHARE) continue;
    const thick = Math.min(cmaxX - cminX + 1, cmaxY - cminY + 1);
    if (thick > thickCap) continue;
    for (let k = 0; k < size; k++) mask[pixels[k]] = 1;
  }
  return mask;
}

function stampGaps(
  reached: Uint8Array,
  dist2: Float32Array,
  mask: Uint8Array,
  width: number,
  height: number,
  dx: number,
  dy: number,
): void {
  for (let y = 0; y < height; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= height) continue;
    const row = y * width;
    const srow = sy * width;
    for (let x = 0; x < width; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= width) continue;
      const i = row + x;
      if (mask[srow + sx] && dist2[i] <= GAP_APPLY2) reached[i] = 1;
    }
  }
}

function constantPlane(median: Rgb): [Plane, Plane, Plane] {
  return [
    { a: median[0], b: 0, c: 0 },
    { a: median[1], b: 0, c: 0 },
    { a: median[2], b: 0, c: 0 },
  ];
}

/** Per-channel plane of the backdrop, in normalised x/y, robust to the subject touching the border. */
function fitBackdrop(frame: Frame, median: Rgb): Backdrop {
  const { width, height, data } = frame;
  const invW = 1 / Math.max(1, width - 1);
  const invH = 1 / Math.max(1, height - 1);
  const b = Math.max(1, Math.min(BORDER_PX, width, height));
  const xs: number[] = [];
  const ys: number[] = [];
  const rs: number[] = [];
  const gs: number[] = [];
  const bs: number[] = [];
  const push = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    const r = data[o], g = data[o + 1], bl = data[o + 2];
    if (rgbDist(r, g, bl, median[0], median[1], median[2]) > PLANE_INLIER) return;
    xs.push(x * invW);
    ys.push(y * invH);
    rs.push(r);
    gs.push(g);
    bs.push(bl);
  };
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
  let plane = fitChannels(xs, ys, rs, gs, bs) ?? constantPlane(median);
  const keep: number[] = [];
  for (let i = 0; i < xs.length; i++) {
    const pr = plane[0].a + plane[0].b * xs[i] + plane[0].c * ys[i];
    const pg = plane[1].a + plane[1].b * xs[i] + plane[1].c * ys[i];
    const pb = plane[2].a + plane[2].b * xs[i] + plane[2].c * ys[i];
    if (rgbDist(rs[i], gs[i], bs[i], pr, pg, pb) <= PLANE_REFIT) keep.push(i);
  }
  if (keep.length >= 20 && keep.length < xs.length) {
    const x2 = keep.map((i) => xs[i]);
    const y2 = keep.map((i) => ys[i]);
    plane = fitChannels(x2, y2, keep.map((i) => rs[i]), keep.map((i) => gs[i]), keep.map((i) => bs[i])) ?? plane;
  }
  return { median, plane, invW, invH };
}

function fitChannels(xs: number[], ys: number[], rs: number[], gs: number[], bs: number[]): [Plane, Plane, Plane] | null {
  const r = fitPlane(xs, ys, rs);
  const g = fitPlane(xs, ys, gs);
  const b = fitPlane(xs, ys, bs);
  if (!r || !g || !b) return null;
  return [r, g, b];
}

/** Squared distance from every pixel to the backdrop plane. One tight pass, no sqrt. */
function planeDist2(frame: Frame, bg: Backdrop): Float32Array {
  const { data, width, height } = frame;
  const out = new Float32Array(width * height);
  const p0 = bg.plane[0], p1 = bg.plane[1], p2 = bg.plane[2];
  const br = p0.b * bg.invW, bgc = p1.b * bg.invW, bb = p2.b * bg.invW;
  for (let y = 0; y < height; y++) {
    const yn = y * bg.invH;
    const ar = p0.a + p0.c * yn;
    const ag = p1.a + p1.c * yn;
    const ab = p2.a + p2.c * yn;
    const row = y * width;
    let o = row * 4;
    for (let x = 0; x < width; x++, o += 4) {
      const dr = data[o] - (ar + br * x);
      const dg = data[o + 1] - (ag + bgc * x);
      const db = data[o + 2] - (ab + bb * x);
      out[row + x] = dr * dr + dg * dg + db * db;
    }
  }
  return out;
}

/**
 * Euclidean match to the backdrop colour. A white shirt or a light coat is
 * not background just because a neighbour is a little closer to the ground.
 * The prompt asks for a flat light grey; the border median is that colour
 * as the model painted it.
 */
const BG_MATCH = 26;
const BG_MATCH2 = BG_MATCH * BG_MATCH;
/** Deep interior of frame 0. A later flood may not punch inside it. */
const INTERIOR_ERODE = 4;
const INTERIOR_SHIFT_MAX = 24;
/** A frame whose opaque area differs from the median by more than this is re-matted from a neighbour. */
const COVERAGE_MAX_FRAC = 0.03;

function matchesBackdrop(data: Buffer, i: number, bg: Rgb, max2 = BG_MATCH2): boolean {
  const o = i * 4;
  const dr = data[o] - bg[0];
  const dg = data[o + 1] - bg[1];
  const db = data[o + 2] - bg[2];
  return dr * dr + dg * dg + db * db <= max2;
}

function distToBackdrop(data: Buffer, i: number, bg: Rgb): number {
  const o = i * 4;
  const dr = data[o] - bg[0];
  const dg = data[o + 1] - bg[1];
  const db = data[o + 2] - bg[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

/** 4-connected flood from the frame border, only through pixels of the backdrop colour. */
function floodBackdrop(frame: Frame, bg: Rgb, max2 = BG_MATCH2): Uint8Array {
  const { data, width, height } = frame;
  const n = width * height;
  const reached = new Uint8Array(n);
  if (n === 0) return reached;
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const push = (i: number) => {
    if (reached[i] || !matchesBackdrop(data, i, bg, max2)) return;
    reached[i] = 1;
    queue[qt++] = i;
  };
  for (let x = 0; x < width; x++) {
    push(x);
    if (height > 1) push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    push(y * width);
    if (width > 1) push(y * width + width - 1);
  }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    if (x > 0) push(i - 1);
    if (x + 1 < width) push(i + 1);
    if (i >= width) push(i - width);
    if (i + width < n) push(i + width);
  }
  return reached;
}

/**
 * Flood on a half-resolution grid, then accept a full-resolution pixel only
 * when that pixel itself is the backdrop colour. The coarse mask is grown by
 * one cell so the silhouette edge is decided at full resolution.
 */
function floodBackdropFast(frame: Frame, bg: Rgb, max2 = BG_MATCH2): Uint8Array {
  const { data, width, height } = frame;
  const scale = width >= 160 && height >= 160 ? 2 : 1;
  if (scale === 1) return floodBackdrop(frame, bg, max2);
  const sw = Math.ceil(width / scale);
  const sh = Math.ceil(height / scale);
  const smallData = Buffer.alloc(sw * sh * 4);
  for (let y = 0; y < sh; y++) {
    const sy = Math.min(height - 1, y * scale);
    for (let x = 0; x < sw; x++) {
      const sx = Math.min(width - 1, x * scale);
      const so = (sy * width + sx) * 4;
      const o = (y * sw + x) * 4;
      smallData[o] = data[so];
      smallData[o + 1] = data[so + 1];
      smallData[o + 2] = data[so + 2];
      smallData[o + 3] = 255;
    }
  }
  const coarse = dilate(floodBackdrop({ data: smallData, width: sw, height: sh }, bg, max2), sw, sh, 1);
  const reached = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(sh - 1, (y / scale) | 0);
    const srow = sy * sw;
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const sx = Math.min(sw - 1, (x / scale) | 0);
      if (!coarse[srow + sx]) continue;
      const i = row + x;
      if (matchesBackdrop(data, i, bg, max2)) reached[i] = 1;
    }
  }
  return reached;
}

function invertMask(src: Uint8Array): Uint8Array {
  const out = new Uint8Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = src[i] ? 0 : 1;
  return out;
}

function maskCentroid(mask: Uint8Array, width: number): { x: number; y: number; n: number } {
  let n = 0;
  let sx = 0;
  let sy = 0;
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    n++;
    sx += i % width;
    sy += (i / width) | 0;
  }
  return n ? { x: sx / n, y: sy / n, n } : { x: 0, y: 0, n: 0 };
}

/** Clear `reached` where the reference interior sits, shifted with the body. */
function protectInterior(reached: Uint8Array, interior: Uint8Array, width: number, height: number, dx: number, dy: number): void {
  for (let y = 0; y < height; y++) {
    const sy = y - dy;
    if (sy < 0 || sy >= height) continue;
    const row = y * width;
    const srow = sy * width;
    for (let x = 0; x < width; x++) {
      const sx = x - dx;
      if (sx < 0 || sx >= width) continue;
      if (interior[srow + sx]) reached[row + x] = 0;
    }
  }
}

function neighbourDiffers(reached: Uint8Array, i: number, x: number, width: number, height: number): boolean {
  const v = reached[i];
  if (x > 0 && reached[i - 1] !== v) return true;
  if (x + 1 < width && reached[i + 1] !== v) return true;
  if (i >= width && reached[i - width] !== v) return true;
  if (i + width < width * height && reached[i + width] !== v) return true;
  return false;
}

function writeFloodAlpha(frame: Frame, reached: Uint8Array, bg: Rgb, hard: number, soft: number): void {
  const { data, width, height } = frame;
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      const i = row + x;
      const o = i * 4 + 3;
      if (!neighbourDiffers(reached, i, x, width, height)) data[o] = reached[i] ? 0 : 255;
      else data[o] = Math.round(255 * keyFactor(distToBackdrop(data, i, bg), hard, soft));
    }
  }
}

/**
 * Transparent pixels the border cannot reach are inside the character.
 * Their colour is still in the RGB channels; put the alpha back.
 */
/**
 * A punched garment pixel still holds its colour and sits against an opaque
 * neighbour of that colour. Fill it. Cleared backdrop is near-black and is left
 * alone. Not used on a fresh key: there the transparent pixels are still the
 * grey ground and would grow a halo.
 */
export function healPunchedGarment(frame: Frame, passes = 8): void {
  const { data, width, height } = frame;
  const dirs = [1, -1, width, -width];
  for (let pass = 0; pass < passes; pass++) {
    const grow: number[] = [];
    for (let y = 1; y < height - 1; y++) {
      const row = y * width;
      for (let x = 1; x < width - 1; x++) {
        const i = row + x;
        const o = i * 4;
        if (data[o + 3] >= 128) continue;
        if (data[o] + data[o + 1] + data[o + 2] < 48) continue;
        for (const d of dirs) {
          const n = (i + d) * 4;
          if (data[n + 3] < 200) continue;
          const dr = data[o] - data[n];
          const dg = data[o + 1] - data[n + 1];
          const db = data[o + 2] - data[n + 2];
          if (dr * dr + dg * dg + db * db <= 45 * 45) {
            grow.push(o);
            break;
          }
        }
      }
    }
    for (const o of grow) data[o + 3] = 255;
    if (grow.length === 0) break;
  }
}

export function sealInteriorHoles(frames: Frame[]): void {
  for (const frame of frames) {
    const { data, width, height } = frame;
    const n = width * height;
    if (n === 0) continue;
    const open = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 128) open[i] = 1;
    const seen = new Uint8Array(n);
    const queue = new Int32Array(n);
    let qh = 0;
    let qt = 0;
    const push = (i: number) => {
      if (!open[i] || seen[i]) return;
      seen[i] = 1;
      queue[qt++] = i;
    };
    for (let x = 0; x < width; x++) {
      push(x);
      if (height > 1) push((height - 1) * width + x);
    }
    for (let y = 1; y < height - 1; y++) {
      push(y * width);
      if (width > 1) push(y * width + width - 1);
    }
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % width;
      if (x > 0) push(i - 1);
      if (x + 1 < width) push(i + 1);
      if (i >= width) push(i - width);
      if (i + width < n) push(i + width);
    }
    for (let i = 0; i < n; i++) if (open[i] && !seen[i]) data[i * 4 + 3] = 255;
  }
}

function opaqueCount(frame: Frame): number {
  const data = frame.data;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 127) n++;
  return n;
}

function cornersFailed(frame: Frame): boolean {
  const { data, width, height } = frame;
  const s = Math.min(8, width, height);
  if (s === 0) return false;
  let bad = 0;
  let tot = 0;
  const sample = (x0: number, y0: number) => {
    for (let y = y0; y < y0 + s; y++) {
      for (let x = x0; x < x0 + s; x++) {
        tot++;
        if (data[(y * width + x) * 4 + 3] > 32) bad++;
      }
    }
  };
  sample(0, 0);
  sample(width - s, 0);
  sample(0, height - s);
  sample(width - s, height - s);
  return tot > 0 && bad / tot > 0.5;
}

/**
 * A frame that kept a slab of backdrop (or lost a slab of the character)
 * takes its alpha from the nearest frame that matches the median coverage.
 * RGB stays. Returns how many frames were replaced.
 */
export function conformAlphaCoverage(frames: Frame[], maxFrac = COVERAGE_MAX_FRAC): number {
  const n = frames.length;
  if (n < 3) return 0;
  const area = frames[0].width * frames[0].height;
  if (area === 0) return 0;
  const counts = frames.map(opaqueCount);
  const med = medianOf(counts);
  const good: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!cornersFailed(frames[i]) && Math.abs(counts[i] - med) / area <= maxFrac) good.push(i);
  }
  if (good.length === 0) return 0;
  let replaced = 0;
  for (let i = 0; i < n; i++) {
    const deviant = cornersFailed(frames[i]) || Math.abs(counts[i] - med) / area > maxFrac;
    if (!deviant) continue;
    let donor = good[0];
    let best = Math.abs(good[0] - i);
    for (const g of good) {
      const d = Math.abs(g - i);
      if (d < best) { best = d; donor = g; }
    }
    const src = frames[donor].data;
    const dst = frames[i].data;
    for (let o = 3; o < dst.length; o += 4) dst[o] = src[o];
    replaced++;
  }
  return replaced;
}

/**
 * Top edge and the upper part of the sides. A waist-up figure is cut off
 * along the bottom, and that edge is the coat, not the ground.
 */
export function estimateBackdropOpen(frame: Frame, border = BORDER_PX): Rgb {
  const { width, height, data } = frame;
  if (width === 0 || height === 0) return [0, 0, 0];
  const b = Math.max(1, Math.min(Math.floor(border), width, Math.floor(height / 2)));
  const r: number[] = [];
  const g: number[] = [];
  const bl: number[] = [];
  const push = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    r.push(data[o]);
    g.push(data[o + 1]);
    bl.push(data[o + 2]);
  };
  const sideBottom = Math.max(b + 1, Math.floor(height * 0.72));
  for (let y = 0; y < b; y++) for (let x = 0; x < width; x++) push(x, y);
  for (let y = b; y < sideBottom; y++) {
    for (let x = 0; x < b; x++) push(x, y);
    for (let x = Math.max(b, width - b); x < width; x++) push(x, y);
  }
  if (r.length === 0) return estimateBackground(frame, border);
  return [medianOf(r), medianOf(g), medianOf(bl)];
}

const FLOOD_TOLERANCES = [26, 36, 48, 64];

function floodStats(reached: Uint8Array, width: number, height: number): { clearedFrac: number; opaqueFrac: number; corners: boolean } {
  const n = width * height;
  if (n === 0) return { clearedFrac: 0, opaqueFrac: 1, corners: false };
  let cleared = 0;
  for (let i = 0; i < n; i++) if (reached[i]) cleared++;
  const on = (x: number, y: number) => reached[y * width + x] === 1;
  return {
    clearedFrac: cleared / n,
    opaqueFrac: 1 - cleared / n,
    corners: on(0, 0) && on(width - 1, 0) && on(0, height - 1) && on(width - 1, height - 1),
  };
}

function floodOk(stats: { clearedFrac: number; opaqueFrac: number; corners: boolean }): boolean {
  return stats.clearedFrac >= 0.10 && stats.opaqueFrac <= 0.65 && stats.corners;
}

/** The older plane flood. Only when a flat colour match cannot clear the ground. */
function floodLoosePlane(frame: Frame): Uint8Array {
  const { data, width, height } = frame;
  const n = width * height;
  const dist2 = planeDist2(frame, fitBackdrop(frame, estimateBackdropOpen(frame)));
  const reached = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0;
  let qt = 0;
  const push = (i: number) => { reached[i] = 1; queue[qt++] = i; };
  for (let x = 0; x < width; x++) {
    if (dist2[x] <= SEED2) push(x);
    if (height > 1 && dist2[(height - 1) * width + x] <= SEED2) push((height - 1) * width + x);
  }
  for (let y = 1; y < height - 1; y++) {
    if (dist2[y * width] <= SEED2) push(y * width);
    if (width > 1 && dist2[y * width + width - 1] <= SEED2) push(y * width + width - 1);
  }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const o = i * 4;
    const step = (j: number) => {
      if (reached[j] || dist2[j] > LOOSE2) return;
      const o2 = j * 4;
      const dr = data[o2] - data[o];
      const dg = data[o2 + 1] - data[o + 1];
      const db = data[o2 + 2] - data[o + 2];
      if (dr * dr + dg * dg + db * db <= STEP2) push(j);
    };
    if (x > 0) step(i - 1);
    if (x + 1 < width) step(i + 1);
    if (i >= width) step(i - width);
    if (i + width < n) step(i + width);
  }
  return reached;
}

function chooseReached(frame: Frame, bg: Rgb, max2: number | null): { reached: Uint8Array; max2: number } {
  if (max2 != null) {
    const reached = floodBackdropFast(frame, bg, max2);
    if (floodOk(floodStats(reached, frame.width, frame.height))) return { reached, max2 };
  }
  let last = floodBackdropFast(frame, bg, FLOOD_TOLERANCES[0] * FLOOD_TOLERANCES[0]);
  let used = FLOOD_TOLERANCES[0] * FLOOD_TOLERANCES[0];
  for (const tol of FLOOD_TOLERANCES) {
    const reached = floodBackdropFast(frame, bg, tol * tol);
    last = reached;
    used = tol * tol;
    if (floodOk(floodStats(reached, frame.width, frame.height))) return { reached, max2: used };
  }
  const loose = floodLoosePlane(frame);
  if (floodOk(floodStats(loose, frame.width, frame.height))) return { reached: loose, max2: used };
  return { reached: last, max2: used };
}

/**
 * Backdrop mask from a border flood through the backdrop colour only.
 * Anything the flood cannot reach stays opaque, including a white shirt
 * and a light coat. Mutates alpha.
 */
function paintBackdropAlpha(frame: Frame, opts: { hard?: number; soft?: number }, bg: Rgb, reached: Uint8Array): void {
  const { width, height } = frame;
  if (width * height === 0) return;
  const hard = opts.hard ?? DEFAULT_HARD;
  const soft = opts.soft ?? DEFAULT_SOFT;
  writeFloodAlpha(frame, reached, bg, hard, soft);
}

/**
 * One frame's key alpha for a flat or gently graded backdrop. Does not defringe
 * and does not read neighbouring frames. The returned buffer is new.
 */
export function matteAlpha(frame: Frame, opts: { hard?: number; soft?: number } = {}): Frame {
  const out = cloneFrame(frame);
  const bg = estimateBackdropOpen(out);
  paintBackdropAlpha(out, opts, bg, chooseReached(out, bg, null).reached);
  return out;
}

/**
 * Key mode. Each frame floods from its own border through the backdrop colour
 * only. Frame 0's deep interior is protected on later frames, so a crack cannot
 * eat a white shirt. A frame whose coverage jumps is given a neighbour's alpha.
 */
export function matteFrames(frames: Frame[], opts: { hard?: number; soft?: number; interiorShiftMax?: number; coverageMaxFrac?: number } = {}): { frames: Frame[]; background: Rgb } {
  if (frames.length === 0) return { frames: [], background: [0, 0, 0] };
  const out: Frame[] = new Array(frames.length);
  const backgrounds: Rgb[] = new Array(frames.length);
  let interior: Uint8Array | null = null;
  let ref = { x: 0, y: 0, n: 0 };
  let max2: number | null = null;
  for (let i = 0; i < frames.length; i++) {
    const frame = cloneFrame(frames[i]);
    const bg = estimateBackdropOpen(frame);
    backgrounds[i] = bg;
    const chosen = chooseReached(frame, bg, i === 0 ? null : max2);
    if (i === 0) max2 = chosen.max2;
    const reached = chosen.reached;
    const solid = invertMask(reached);
    if (i === 0) {
      interior = erodeBin(solid, frame.width, frame.height, INTERIOR_ERODE);
      ref = maskCentroid(solid, frame.width);
    } else if (interior && ref.n > 0) {
      const c = maskCentroid(solid, frame.width);
      const dx = Math.round(c.x - ref.x);
      const dy = Math.round(c.y - ref.y);
      const shiftMax = opts.interiorShiftMax ?? INTERIOR_SHIFT_MAX;
      if (c.n > 0 && Math.abs(dx) <= shiftMax && Math.abs(dy) <= shiftMax) {
        protectInterior(reached, interior, frame.width, frame.height, dx, dy);
      }
    }
    paintBackdropAlpha(frame, opts, bg, reached);
    out[i] = frame;
  }
  applyTemporalMedianInPlace(out);
  for (let i = 0; i < out.length; i++) defringeOwned(out[i], backgrounds[i]);
  sealInteriorHoles(out);
  conformAlphaCoverage(out, opts.coverageMaxFrac ?? COVERAGE_MAX_FRAC);
  return { frames: out, background: backgrounds[0] };
}

/** Frames that already carry alpha from an external matte: temporal median, then defringe. */
export function postMatte(frames: Frame[], bg: Rgb): Frame[] {
  const out = temporalMedianAlpha(frames);
  for (const frame of out) defringeOwned(frame, bg);
  return out;
}
