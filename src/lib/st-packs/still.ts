// =============================================================================
// ST Packs — stills before video, and the black corners Vidu adds
// =============================================================================
// Every still that goes to the video model (the neutral base included) goes
// through the same two steps:
//
//   backgroundToKey  Everything outside the character becomes the pure key
//                    colour. The model sometimes leaves a white or grey band,
//                    and an uploaded neutral keeps its own dark or purple
//                    backdrop. A flood from the border through the dominant
//                    border colours (several clusters, gradient steps, dark
//                    grounds) repaints all of it.
//   alignStill       Each edit crops and scales the character a little
//                    differently, so the sprite jumped between expressions in
//                    SillyTavern. The subject's head top, upper-body width and
//                    centre are matched to the reference still and the edit
//                    is resampled onto a canvas of exactly the reference size.
//
// borderKeyRatio is the QA gate before paying for a clip: the outer ring must
// be key colour, otherwise the edit is redone once.
//
// clearBorderBlack runs on the decoded video frames: Vidu paints near-black
// pixels into the top corners, and a green key never removes black.
// =============================================================================
import type { Rgb } from "./chroma";
import type { Frame } from "./types";

// ── helpers ──────────────────────────────────────────────────────────────────
function d2(r: number, g: number, b: number, c: Rgb): number {
  const dr = r - c[0];
  const dg = g - c[1];
  const db = b - c[2];
  return dr * dr + dg * dg + db * db;
}

/** A pixel this close to the key is key colour (same bar as the chroma key's opaque edge). */
const KEY_NEAR = 105;
/** Border clusters: colours within this distance share a cluster. */
const CLUSTER_RADIUS = 48;
/** A border colour is "dominant" when it covers this share of the sampled ring. */
const CLUSTER_MIN_SHARE = 0.1;
/** Sides are sampled down to this share of the height: below it the arms and torso reach the edges. */
const SIDE_SAMPLE_FRAC = 0.6;
/** Flood: a pixel joins when it is this close to a backdrop cluster... */
const MATCH_DIST = 56;
/** ...or this close to the neighbour it was reached from (gradients, vignettes) and still loosely like a cluster. */
const STEP_DIST = 14;
const LOOSE_DIST = 120;
/** One extra ring of anti-aliased pixels, if they are still close to the backdrop. */
const EDGE_DIST = 48;
/** Width of the ring the border colours are sampled from. */
const SAMPLE_RING = 6;

interface Cluster { sum: [number, number, number]; n: number; c: Rgb }

/**
 * Dominant colours of the top border and the upper part of the sides. In a
 * waist-up or bust shot the bottom edge and the lower sides are the
 * character (torso, arms), so sampling them would make skin a "backdrop".
 */
export function borderClusters(frame: Frame, key: Rgb): Rgb[] {
  const { width, height, data } = frame;
  const ring = Math.max(1, Math.min(SAMPLE_RING, width >> 3, height >> 3));
  const clusters: Cluster[] = [];
  let total = 0;
  const add = (x: number, y: number) => {
    const o = (y * width + x) * 4;
    if (data[o + 3] < 128) return;
    const r = data[o], g = data[o + 1], b = data[o + 2];
    if (d2(r, g, b, key) <= KEY_NEAR * KEY_NEAR) return; // already key
    total++;
    let best: Cluster | null = null;
    let bestD = CLUSTER_RADIUS * CLUSTER_RADIUS;
    for (const c of clusters) {
      const d = d2(r, g, b, c.c);
      if (d <= bestD) { bestD = d; best = c; }
    }
    if (!best) {
      clusters.push({ sum: [r, g, b], n: 1, c: [r, g, b] });
      return;
    }
    best.sum[0] += r; best.sum[1] += g; best.sum[2] += b; best.n++;
    best.c = [Math.round(best.sum[0] / best.n), Math.round(best.sum[1] / best.n), Math.round(best.sum[2] / best.n)];
  };
  for (let y = 0; y < ring; y++) for (let x = 0; x < width; x++) add(x, y);
  const sideEnd = Math.max(ring + 1, Math.floor(height * SIDE_SAMPLE_FRAC));
  for (let y = ring; y < sideEnd; y++) {
    for (let x = 0; x < ring; x++) add(x, y);
    for (let x = width - ring; x < width; x++) add(x, y);
  }
  if (total === 0) return [];
  return clusters.filter((c) => c.n / total >= CLUSTER_MIN_SHARE).map((c) => c.c);
}

function nearestD2(r: number, g: number, b: number, colours: Rgb[]): number {
  let best = Infinity;
  for (const c of colours) {
    const d = d2(r, g, b, c);
    if (d < best) best = d;
  }
  return best;
}

/**
 * Background mask: 1 for every pixel outside the character. Flooded from the
 * whole border through key-coloured pixels and the dominant border colours;
 * a gradient is followed step by step. Key-coloured pixels anywhere (a pocket
 * between arm and torso) count as background too.
 */
export function backgroundMask(frame: Frame, key: Rgb): Uint8Array {
  const { width, height, data } = frame;
  const n = width * height;
  const colours = borderClusters(frame, key);
  const keyNear2 = KEY_NEAR * KEY_NEAR;
  const match2 = MATCH_DIST * MATCH_DIST;
  const loose2 = LOOSE_DIST * LOOSE_DIST;
  const step2 = STEP_DIST * STEP_DIST;
  const isKey = (o: number) => data[o + 3] < 16 || d2(data[o], data[o + 1], data[o + 2], key) <= keyNear2;
  const isBackdrop = (o: number) => colours.length > 0 && nearestD2(data[o], data[o + 1], data[o + 2], colours) <= match2;

  const mask = new Uint8Array(n);
  const stack: number[] = [];
  const push = (i: number) => { mask[i] = 1; stack.push(i); };
  for (let x = 0; x < width; x++) {
    for (const y of [0, height - 1]) {
      const i = y * width + x;
      if (!mask[i] && (isKey(i * 4) || isBackdrop(i * 4))) push(i);
    }
  }
  for (let y = 0; y < height; y++) {
    for (const x of [0, width - 1]) {
      const i = y * width + x;
      if (!mask[i] && (isKey(i * 4) || isBackdrop(i * 4))) push(i);
    }
  }
  const tryStep = (from: number, to: number) => {
    if (mask[to]) return;
    const o = to * 4;
    if (isKey(o) || isBackdrop(o)) { push(to); return; }
    if (colours.length === 0) return;
    // Gradient: close to the pixel it was reached from and still loosely backdrop-like
    const p = from * 4;
    const dr = data[o] - data[p], dg = data[o + 1] - data[p + 1], db = data[o + 2] - data[p + 2];
    if (dr * dr + dg * dg + db * db > step2) return;
    if (nearestD2(data[o], data[o + 1], data[o + 2], colours) > loose2) return;
    push(to);
  };
  while (stack.length) {
    const i = stack.pop() as number;
    const x = i % width;
    if (x > 0) tryStep(i, i - 1);
    if (x + 1 < width) tryStep(i, i + 1);
    if (i >= width) tryStep(i, i - width);
    if (i + width < n) tryStep(i, i + width);
  }
  // Enclosed key-coloured pockets are background as well
  for (let i = 0; i < n; i++) if (!mask[i] && isKey(i * 4)) mask[i] = 1;
  // One ring of anti-aliased pixels between the backdrop and the character
  if (colours.length) {
    const edge2 = EDGE_DIST * EDGE_DIST;
    const grow: number[] = [];
    for (let i = 0; i < n; i++) {
      if (mask[i]) continue;
      const x = i % width;
      const touches = (x > 0 && mask[i - 1]) || (x + 1 < width && mask[i + 1]) || (i >= width && mask[i - width]) || (i + width < n && mask[i + width]);
      if (!touches) continue;
      const o = i * 4;
      if (nearestD2(data[o], data[o + 1], data[o + 2], colours) <= edge2) grow.push(i);
    }
    for (const i of grow) mask[i] = 1;
  }
  return mask;
}

/** Repaint everything outside the character with the pure key colour. Returns an opaque frame. */
export function backgroundToKey(frame: Frame, key: Rgb): Frame {
  const mask = backgroundMask(frame, key);
  const data = Buffer.from(frame.data);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    if (mask[i]) {
      data[o] = key[0]; data[o + 1] = key[1]; data[o + 2] = key[2];
    } else if (data[o + 3] < 255) {
      // Composite a partly transparent upload over the key
      const a = data[o + 3] / 255;
      data[o] = Math.round(data[o] * a + key[0] * (1 - a));
      data[o + 1] = Math.round(data[o + 1] * a + key[1] * (1 - a));
      data[o + 2] = Math.round(data[o + 2] * a + key[2] * (1 - a));
    }
    data[o + 3] = 255;
  }
  return { data, width: frame.width, height: frame.height };
}

/** Share of the outer `ring` px that is key colour (the QA gate before a clip is paid for). */
export function borderKeyRatio(frame: Frame, key: Rgb, ring = 8): number {
  const { width, height, data } = frame;
  const near2 = 48 * 48;
  let total = 0;
  let keyed = 0;
  for (let y = 0; y < height; y++) {
    const yEdge = y < ring || y >= height - ring;
    for (let x = 0; x < width; x++) {
      if (!yEdge && x >= ring && x < width - ring) continue;
      total++;
      const o = (y * width + x) * 4;
      if (data[o + 3] < 16 || d2(data[o], data[o + 1], data[o + 2], key) <= near2) keyed++;
    }
  }
  return total ? keyed / total : 1;
}

/**
 * Waist-up and bust shots are cut by the bottom edge, so the bottom ring is
 * mostly the character. The gate looks at the top and the two sides only.
 */
export function backdropRingRatio(frame: Frame, key: Rgb, ring = 8): number {
  const { width, height, data } = frame;
  const near2 = 48 * 48;
  let total = 0;
  let keyed = 0;
  const bottom = Math.floor(height * 0.75);
  for (let y = 0; y < bottom; y++) {
    const yEdge = y < ring;
    for (let x = 0; x < width; x++) {
      if (!yEdge && x >= ring && x < width - ring) continue;
      total++;
      const o = (y * width + x) * 4;
      if (data[o + 3] < 16 || d2(data[o], data[o + 1], data[o + 2], key) <= near2) keyed++;
    }
  }
  return total ? keyed / total : 1;
}

// ── framing ──────────────────────────────────────────────────────────────────
/** 1 where the still is not key colour. */
export function subjectMask(frame: Frame, key: Rgb): Uint8Array {
  const { data } = frame;
  const n = frame.width * frame.height;
  const mask = new Uint8Array(n);
  const near2 = KEY_NEAR * KEY_NEAR;
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] >= 128 && d2(data[o], data[o + 1], data[o + 2], key) > near2) mask[i] = 1;
  }
  return mask;
}

export interface Framing {
  /** First row with subject pixels (head top). */
  top: number;
  /** Median subject width over the head-and-shoulders band. */
  upperWidth: number;
  /** Centre of the subject over the same band. */
  centreX: number;
  left: number;
  right: number;
  bottom: number;
}

/** The band below the head top reported as upper-body width and centre (diagnostics and tests). */
const UPPER_BAND: [number, number] = [0.04, 0.26];
/** Rows with fewer subject pixels than this are noise (a stray speck above the head). */
const ROW_MIN_PX = 3;

export function measureFraming(mask: Uint8Array, width: number, height: number, scale = 1): Framing | null {
  let top = -1, bottom = -1, left = width, right = -1;
  for (let y = 0; y < height; y++) {
    let count = 0;
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      count++;
      if (x < left) left = x;
      if (x > right) right = x;
    }
    if (count >= ROW_MIN_PX) {
      if (top < 0) top = y;
      bottom = y;
    }
  }
  if (top < 0 || right < left) return null;
  // Band rows measured from the head top, in the reference's pixel scale
  const y0 = Math.min(height - 1, top + Math.round(UPPER_BAND[0] * height * scale));
  const y1 = Math.min(height, Math.max(y0 + 1, top + Math.round(UPPER_BAND[1] * height * scale)));
  const widths: number[] = [];
  let sx = 0, sn = 0;
  for (let y = y0; y < y1; y++) {
    let minX = -1, maxX = -1;
    for (let x = 0; x < width; x++) {
      if (!mask[y * width + x]) continue;
      if (minX < 0) minX = x;
      maxX = x;
      sx += x;
      sn++;
    }
    if (minX >= 0) widths.push(maxX - minX + 1);
  }
  if (!widths.length || !sn) return null;
  widths.sort((a, b) => a - b);
  return { top, upperWidth: widths[widths.length >> 1], centreX: sx / sn, left, right, bottom };
}

interface RowProfile { left: Int32Array; right: Int32Array }

function rowProfile(mask: Uint8Array, width: number, height: number): RowProfile {
  const left = new Int32Array(height).fill(-1);
  const right = new Int32Array(height).fill(-1);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (!mask[row + x]) continue;
      if (left[y] < 0) left[y] = x;
      right[y] = x;
    }
  }
  return { left, right };
}

/** Rows below the head top compared between the stills: head, shoulders and chest. */
const PROFILE_FRAC = 0.4;

/**
 * Scale and horizontal offset that make the edit's silhouette (row by row,
 * from the head top down) match the reference. A single width measure jumps
 * between the head and the shoulders when the crop changes, so the whole
 * width profile is matched instead: every candidate scale is scored by the
 * mean width difference over the rows both stills have.
 */
function fitProfile(ref: RowProfile, refTop: number, ed: RowProfile, edTop: number, refHeight: number): { scale: number; dx: number } | null {
  const rows = Math.min(Math.round(refHeight * PROFILE_FRAC), ref.left.length - refTop);
  if (rows < 8) return null;
  const edRows = ed.left.length;
  let best = { scale: 1, err: Infinity };
  const score = (scale: number) => {
    let err = 0, n = 0;
    for (let t = 0; t < rows; t++) {
      const yr = refTop + t;
      const ye = edTop + Math.round(t / scale);
      if (ye >= edRows) break;
      const wr = ref.left[yr] < 0 ? 0 : ref.right[yr] - ref.left[yr] + 1;
      const we = ed.left[ye] < 0 ? 0 : (ed.right[ye] - ed.left[ye] + 1) * scale;
      err += Math.abs(wr - we);
      n++;
    }
    return n >= rows * 0.5 ? err / n : Infinity;
  };
  for (let scale = SCALE_MIN; scale <= SCALE_MAX + 1e-9; scale += 0.01) {
    const err = score(scale);
    if (err < best.err) best = { scale, err };
  }
  for (let scale = best.scale - 0.01; scale <= best.scale + 0.01 + 1e-9; scale += 0.001) {
    const err = score(scale);
    if (err < best.err) best = { scale, err };
  }
  if (!Number.isFinite(best.err)) return null;
  // Horizontal offset: median of the row-centre differences
  const offsets: number[] = [];
  for (let t = 0; t < rows; t++) {
    const yr = refTop + t;
    const ye = edTop + Math.round(t / best.scale);
    if (ye >= edRows || ref.left[yr] < 0 || ed.left[ye] < 0) continue;
    const cr = (ref.left[yr] + ref.right[yr] + 1) / 2;
    const ce = (ed.left[ye] + ed.right[ye] + 1) / 2;
    offsets.push(cr - ce * best.scale);
  }
  if (!offsets.length) return null;
  offsets.sort((a, b) => a - b);
  return { scale: best.scale, dx: offsets[offsets.length >> 1] };
}

export interface AlignStillResult {
  frame: Frame;
  scale: number;
  dx: number;
  dy: number;
  /** True when the still was resampled. */
  moved: boolean;
  /** Could not be measured or the scale is implausible: the still is returned unchanged. */
  failed: boolean;
}

/** Below this the still is left alone (resampling costs a little sharpness). */
const ALIGN_EPS_PX = 1.5;
const SCALE_MIN = 0.6;
const SCALE_MAX = 1.7;

/**
 * Match the edit's head top, upper-body width and centre to the reference
 * and resample it onto a canvas of exactly the reference size. Both frames
 * must already have their background repainted as `key`.
 */
export function alignStill(reference: Frame, edit: Frame, key: Rgb): AlignStillResult {
  const unchanged = (failed: boolean): AlignStillResult => ({ frame: edit, scale: 1, dx: 0, dy: 0, moved: false, failed });
  const rm = subjectMask(reference, key);
  const ref = measureFraming(rm, reference.width, reference.height);
  if (!ref) return unchanged(true);
  const em = subjectMask(edit, key);
  const ed = measureFraming(em, edit.width, edit.height);
  if (!ed) return unchanged(true);
  const fit = fitProfile(rowProfile(rm, reference.width, reference.height), ref.top, rowProfile(em, edit.width, edit.height), ed.top, reference.height);
  if (!fit) return unchanged(true);
  const s = fit.scale;
  if (!(s >= SCALE_MIN && s <= SCALE_MAX)) return unchanged(true);

  // Edit pixel (xe, ye) lands at (s·xe + dx, s·ye + dy)
  const W = reference.width, H = reference.height;
  const dx = fit.dx;
  const dy = ref.top - ed.top * s;
  const sameSize = edit.width === W && edit.height === H;
  if (sameSize && Math.abs(s - 1) * Math.max(W, H) < ALIGN_EPS_PX && Math.abs(dx) < ALIGN_EPS_PX && Math.abs(dy) < ALIGN_EPS_PX) {
    return { frame: edit, scale: s, dx, dy, moved: false, failed: false };
  }
  const out = Buffer.alloc(W * H * 4);
  const src = edit.data;
  const ew = edit.width, eh = edit.height;
  for (let y = 0; y < H; y++) {
    const sy = (y + 0.5 - dy) / s - 0.5;
    for (let x = 0; x < W; x++) {
      const sx = (x + 0.5 - dx) / s - 0.5;
      const o = (y * W + x) * 4;
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const fx = sx - x0, fy = sy - y0;
      let r = 0, g = 0, b = 0, wsum = 0;
      for (let j = 0; j < 2; j++) {
        const yy = y0 + j;
        const wy = j ? fy : 1 - fy;
        for (let i = 0; i < 2; i++) {
          const xx = x0 + i;
          const w = (i ? fx : 1 - fx) * wy;
          if (w <= 0) continue;
          let pr: number, pg: number, pb: number;
          if (xx < 0 || yy < 0 || xx >= ew || yy >= eh) {
            pr = key[0]; pg = key[1]; pb = key[2]; // outside the edit is backdrop
          } else {
            const p = (yy * ew + xx) * 4;
            pr = src[p]; pg = src[p + 1]; pb = src[p + 2];
          }
          r += pr * w; g += pg * w; b += pb * w; wsum += w;
        }
      }
      out[o] = Math.round(r / wsum);
      out[o + 1] = Math.round(g / wsum);
      out[o + 2] = Math.round(b / wsum);
      out[o + 3] = 255;
    }
  }
  return { frame: { data: out, width: W, height: H }, scale: s, dx, dy, moved: true, failed: false };
}

// ── one call per still ───────────────────────────────────────────────────────
/** The outer ring (top and sides) must be at least this share key colour before a clip is paid for. */
export const STILL_RING_MIN = 0.97;

export interface PreparedStill {
  frame: Frame;
  /** Key share of the top and side ring after the repaint. */
  ringRatio: number;
  ok: boolean;
  align: { scale: number; dx: number; dy: number; moved: boolean; failed: boolean } | null;
}

/**
 * Background to key, then (for an edit) framing matched to the reference.
 * The reference is the neutral still after its own backgroundToKey.
 */
export function prepareStill(still: Frame, key: Rgb, reference?: Frame | null): PreparedStill {
  let frame = backgroundToKey(still, key);
  let align: PreparedStill["align"] = null;
  if (reference) {
    const a = alignStill(reference, frame, key);
    align = { scale: a.scale, dx: a.dx, dy: a.dy, moved: a.moved, failed: a.failed };
    frame = a.frame;
  }
  const ringRatio = backdropRingRatio(frame, key);
  return { frame, ringRatio, ok: ringRatio >= STILL_RING_MIN && !align?.failed, align };
}

// ── video frames: black corners ──────────────────────────────────────────────
/** Darker than this on every channel counts as Vidu's black fill. */
const BLACK_MAX = 40;
/** How far from an edge the black clean-up may reach. */
const BLACK_BAND = 24;
/** Corner wedge: x + y below this share of the shorter side (from each corner). */
const WEDGE_FRAC = 0.12;

/**
 * Near-black pixels connected to a corner, inside the border band or a corner
 * wedge, become transparent. Seeds are only taken in the wedges, so a dark
 * coat that reaches a side edge in the middle of the frame is left alone.
 */
export function clearBorderBlack(frame: Frame): number {
  const { width, height, data } = frame;
  const n = width * height;
  const wedge = Math.max(8, Math.round(Math.min(width, height) * WEDGE_FRAC));
  const inWedge = (x: number, y: number) => {
    const xl = x, xr = width - 1 - x, yt = y, yb = height - 1 - y;
    return xl + yt < wedge || xr + yt < wedge || xl + yb < wedge || xr + yb < wedge;
  };
  const inZone = (x: number, y: number) =>
    inWedge(x, y) || x < BLACK_BAND || y < BLACK_BAND || x >= width - BLACK_BAND || y >= height - BLACK_BAND;
  const isBlack = (o: number) => data[o + 3] > 0 && data[o] <= BLACK_MAX && data[o + 1] <= BLACK_MAX && data[o + 2] <= BLACK_MAX;
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  let cleared = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!inWedge(x, y)) continue;
      const i = y * width + x;
      // A seed must touch the frame edge or already-transparent backdrop
      const edge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      const nextToClear = (x > 0 && data[(i - 1) * 4 + 3] === 0) || (y > 0 && data[(i - width) * 4 + 3] === 0);
      if (seen[i] || !isBlack(i * 4) || !(edge || nextToClear)) continue;
      seen[i] = 1;
      stack.push(i);
      while (stack.length) {
        const p = stack.pop() as number;
        data[p * 4 + 3] = 0;
        cleared++;
        const px = p % width, py = (p / width) | 0;
        const visit = (q: number, qx: number, qy: number) => {
          if (seen[q] || !inZone(qx, qy) || !isBlack(q * 4)) return;
          seen[q] = 1;
          stack.push(q);
        };
        if (px > 0) visit(p - 1, px - 1, py);
        if (px + 1 < width) visit(p + 1, px + 1, py);
        if (py > 0) visit(p - width, px, py - 1);
        if (py + 1 < height) visit(p + width, px, py + 1);
      }
    }
  }
  return cleared;
}
