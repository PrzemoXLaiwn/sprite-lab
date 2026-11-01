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
// pixels the flood never reaches stay opaque (the flat-key hole case). Other
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
 * Backdrop mask, then the character as the largest foreground component
 * (plus any other component that is too unlike the backdrop to be a shadow).
 * Mutates alpha. Scratch is a few byte-planes for this frame only.
 */
function paintBackdropAlpha(frame: Frame, opts: { hard?: number; soft?: number }): void {
  const { data, width, height } = frame;
  const n = width * height;
  if (n === 0) return;
  const hard = opts.hard ?? DEFAULT_HARD;
  const soft = opts.soft ?? DEFAULT_SOFT;
  const dist2 = planeDist2(frame, fitBackdrop(frame, estimateBackground(frame)));
  const reached = new Uint8Array(n);
  const queue = new Int32Array(n);
  let qh = 0, qt = 0;
  const push = (i: number) => {
    reached[i] = 1;
    queue[qt++] = i;
  };
  for (let x = 0; x < width; x++) {
    if (dist2[x] <= SEED2) push(x);
    if (height > 1) {
      const bot = (height - 1) * width + x;
      if (dist2[bot] <= SEED2) push(bot);
    }
  }
  for (let y = 1; y < height - 1; y++) {
    const left = y * width;
    if (dist2[left] <= SEED2) push(left);
    if (width > 1) {
      const right = left + width - 1;
      if (dist2[right] <= SEED2) push(right);
    }
  }
  while (qh < qt) {
    const i = queue[qh++];
    const x = i % width;
    const o = i * 4;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    if (x > 0) {
      const j = i - 1;
      if (!reached[j] && dist2[j] <= LOOSE2) {
        const o2 = j * 4;
        const dr = data[o2] - r, dg = data[o2 + 1] - g, db = data[o2 + 2] - b;
        if (dr * dr + dg * dg + db * db <= STEP2) push(j);
      }
    }
    if (x + 1 < width) {
      const j = i + 1;
      if (!reached[j] && dist2[j] <= LOOSE2) {
        const o2 = j * 4;
        const dr = data[o2] - r, dg = data[o2 + 1] - g, db = data[o2 + 2] - b;
        if (dr * dr + dg * dg + db * db <= STEP2) push(j);
      }
    }
    if (i >= width) {
      const j = i - width;
      if (!reached[j] && dist2[j] <= LOOSE2) {
        const o2 = j * 4;
        const dr = data[o2] - r, dg = data[o2 + 1] - g, db = data[o2 + 2] - b;
        if (dr * dr + dg * dg + db * db <= STEP2) push(j);
      }
    }
    if (i + width < n) {
      const j = i + width;
      if (!reached[j] && dist2[j] <= LOOSE2) {
        const o2 = j * 4;
        const dr = data[o2] - r, dg = data[o2 + 1] - g, db = data[o2 + 2] - b;
        if (dr * dr + dg * dg + db * db <= STEP2) push(j);
      }
    }
  }

  // Enclosed backdrop: the same plane colour trapped between an arm and the
  // torso. The border flood cannot reach it. A white shirt is a larger region
  // or sits in the middle, so it stays; small side gaps are cleared.
  const holeMax = Math.max(48, Math.floor(n * 0.04));
  const seenHole = new Uint8Array(n);
  const holes: { size: number; sumX: number; pixels: number[] }[] = [];
  for (let s = 0; s < n; s++) {
    if (reached[s] || seenHole[s] || dist2[s] > HOLE2) continue;
    const pixels: number[] = [];
    let sumX = 0;
    qh = 0;
    qt = 0;
    seenHole[s] = 1;
    queue[qt++] = s;
    while (qh < qt) {
      const i = queue[qh++];
      pixels.push(i);
      sumX += i % width;
      const x = i % width;
      const take = (j: number) => {
        if (reached[j] || seenHole[j] || dist2[j] > HOLE2) return;
        seenHole[j] = 1;
        queue[qt++] = j;
      };
      if (x > 0) take(i - 1);
      if (x + 1 < width) take(i + 1);
      if (i >= width) take(i - width);
      if (i + width < n) take(i + width);
    }
    holes.push({ size: pixels.length, sumX, pixels });
  }
  let largestHole = 0;
  for (const h of holes) if (h.size > largestHole) largestHole = h.size;
  const mid = width / 2;
  const lateral = width * 0.15;
  for (const h of holes) {
    if (h.size > holeMax) continue;
    const cx = h.sumX / h.size;
    const side = Math.abs(cx - mid) > lateral;
    const smallerThanShirt = h.size < largestHole;
    if (side || smallerThanShirt) for (const i of h.pixels) reached[i] = 1;
  }

  // Foreground components among pixels the flood did not claim.
  const visited = new Uint8Array(n);
  const comps: { seed: number; size: number; sum: number; keep: boolean }[] = [];
  for (let s = 0; s < n; s++) {
    if (reached[s] || visited[s]) continue;
    let size = 0, sum = 0;
    qh = 0;
    qt = 0;
    visited[s] = 1;
    queue[qt++] = s;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % width;
      size++;
      sum += dist2[i];
      if (x > 0 && !reached[i - 1] && !visited[i - 1]) { visited[i - 1] = 1; queue[qt++] = i - 1; }
      if (x + 1 < width && !reached[i + 1] && !visited[i + 1]) { visited[i + 1] = 1; queue[qt++] = i + 1; }
      if (i >= width && !reached[i - width] && !visited[i - width]) { visited[i - width] = 1; queue[qt++] = i - width; }
      if (i + width < n && !reached[i + width] && !visited[i + width]) { visited[i + width] = 1; queue[qt++] = i + width; }
    }
    comps.push({ seed: s, size, sum, keep: false });
  }
  let main = 0;
  for (let k = 1; k < comps.length; k++) if (comps[k].size > comps[main].size) main = k;
  for (let k = 0; k < comps.length; k++) {
    const mean2 = comps[k].sum / comps[k].size;
    comps[k].keep = k === main || (comps[k].size >= SPECK_PX && mean2 >= ISLAND2);
  }
  const foreground = new Uint8Array(n);
  for (let k = 0; k < comps.length; k++) {
    if (!comps[k].keep) continue;
    qh = 0;
    qt = 0;
    foreground[comps[k].seed] = 1;
    queue[qt++] = comps[k].seed;
    while (qh < qt) {
      const i = queue[qh++];
      const x = i % width;
      if (x > 0 && !reached[i - 1] && !foreground[i - 1]) { foreground[i - 1] = 1; queue[qt++] = i - 1; }
      if (x + 1 < width && !reached[i + 1] && !foreground[i + 1]) { foreground[i + 1] = 1; queue[qt++] = i + 1; }
      if (i >= width && !reached[i - width] && !foreground[i - width]) { foreground[i - width] = 1; queue[qt++] = i - width; }
      if (i + width < n && !reached[i + width] && !foreground[i + width]) { foreground[i + width] = 1; queue[qt++] = i + width; }
    }
  }

  // Reuse the visited plane as the backdrop mask (every non-foreground pixel).
  for (let i = 0; i < n; i++) visited[i] = foreground[i] ? 0 : 1;
  const nearBg = dilate(visited, width, height, EDGE_BAND);
  const nearFg = dilate(foreground, width, height, EDGE_BAND);
  for (let i = 0; i < n; i++) {
    const o = i * 4 + 3;
    if (foreground[i] && !nearBg[i]) data[o] = 255;
    else if (!foreground[i] && !nearFg[i]) data[o] = 0;
    else data[o] = Math.round(data[o] * keyFactor(Math.sqrt(dist2[i]), hard, soft));
  }
}

/**
 * One frame's key alpha for a flat or gently graded backdrop. Does not defringe
 * and does not read neighbouring frames. The returned buffer is new.
 */
export function matteAlpha(frame: Frame, opts: { hard?: number; soft?: number } = {}): Frame {
  const out = cloneFrame(frame);
  paintBackdropAlpha(out, opts);
  return out;
}

/**
 * Key mode. Each frame grows its own backdrop from the border plane, the
 * character component is kept (enclosed holes included), then the alpha is
 * median-smoothed across neighbours and defringed. One owned buffer per frame
 * — the flood scratch is dropped before the next frame, and the median keeps
 * only alpha planes.
 */
export function matteFrames(frames: Frame[], opts: { hard?: number; soft?: number } = {}): { frames: Frame[]; background: Rgb } {
  if (frames.length === 0) return { frames: [], background: [0, 0, 0] };
  const out: Frame[] = new Array(frames.length);
  const backgrounds: Rgb[] = new Array(frames.length);
  for (let i = 0; i < frames.length; i++) {
    backgrounds[i] = estimateBackground(frames[i]);
    out[i] = matteAlpha(frames[i], opts);
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
