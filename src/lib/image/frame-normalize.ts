// =============================================================================
// Optional frame normalisation — OFF unless SPRITELAB_FRAME_NORMALIZE=1
// =============================================================================
// Deterministic cleanup applied inside postprocessSprite() and
// assembleAnimation() only when the flag is on. With the flag unset the
// callers do not touch pixels, so production output stays as it is.
//
// What the flag adds, after the existing keying / alignment / palette pass:
//   1. Alpha cleanup — drop isolated specks and a light grey halo sitting on
//      a darker silhouette. White cloth (neighbours as light as the pixel)
//      is left alone. Faint partial-alpha dust (alpha < 48) on an edge goes.
//   2. Content-height lock — scale each frame's opaque sprite toward the
//      median height, at most ±12%, keeping the foot line (ground / air) or
//      the cell centre. A real crouch is not flattened; model scale drift is.
//   3. Shared palette merge (pixel only) — snap near-duplicate shades onto
//      one colour so a sheet does not flicker between frames.
// =============================================================================

import sharp from "sharp";

export const FRAME_NORMALIZE_FLAG = "SPRITELAB_FRAME_NORMALIZE";

/** Max movement toward the median content height. Keeps pose changes. */
export const HEIGHT_LOCK_MAX_SCALE = 1.12;
export const HEIGHT_LOCK_MIN_SCALE = 1 / HEIGHT_LOCK_MAX_SCALE;

/**
 * Weighted RGB distance used by the animation quantiser
 * (2·dR² + 4·dG² + 3·dB²). Shades closer than this collapse into one.
 * ~21 levels on red, ~15 on green — tighter than a deliberate 3-tone ramp.
 */
export const PALETTE_MERGE_DISTANCE = 900;

export interface Rgba {
  data: Buffer;
  width: number;
  height: number;
}

export type NormalizeAnchor = "ground" | "air" | "cell" | "center";

export function frameNormalizeEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env[FRAME_NORMALIZE_FLAG] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const sat = (r: number, g: number, b: number) => Math.max(r, g, b) - Math.min(r, g, b);

function hasDarkerWithin(raw: Rgba, x: number, y: number, maxLuma: number, radius: number): boolean {
  const { width, height, data } = raw;
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
      const j = (ny * width + nx) * 4;
      if (data[j + 3] < 128) continue;
      if (luma(data[j], data[j + 1], data[j + 2]) <= maxLuma) return true;
    }
  }
  return false;
}

/**
 * Remove halo / speck / faint-edge pixels in place. Returns how many pixels
 * were cleared. Up to three passes so a 2px rim does not leave a 1px rim.
 */
export function cleanupAlpha(raw: Rgba): number {
  let total = 0;
  for (let pass = 0; pass < 3; pass++) {
    const n = cleanupAlphaOnce(raw);
    total += n;
    if (n === 0) break;
  }
  return total;
}

function cleanupAlphaOnce(raw: Rgba): number {
  const { width, height, data } = raw;
  const kill = new Uint8Array(width * height);
  const at = (x: number, y: number) => (y * width + x) * 4;
  const steps: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      const a = data[i + 3];
      if (a === 0) continue;
      const neighbors: number[] = [];
      let touchesClear = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = at(nx, ny);
        if (data[j + 3] < 16) touchesClear = true;
        else neighbors.push(j);
      }
      if (a < 16 || neighbors.length === 0) {
        kill[y * width + x] = 1;
        continue;
      }
      if (!touchesClear) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = luma(r, g, b);
      const faint = a < 48;
      // A grey rim on a darker body, including a 2px rim whose immediate
      // neighbours are the same grey. White cloth stays: its nearby pixels
      // are just as light, so nothing darker sits within 3px.
      const halo = L >= 160 && sat(r, g, b) <= 32 && hasDarkerWithin(raw, x, y, L - 35, 3);
      if (faint || halo) kill[y * width + x] = 1;
    }
  }
  let removed = 0;
  for (let p = 0; p < width * height; p++) {
    if (!kill[p]) continue;
    data[p * 4 + 3] = 0;
    removed++;
  }
  return removed;
}

/** Opaque pixels that the cleanup rule would treat as a light halo. */
export function lightHaloCount(raw: Rgba): number {
  const { width, height, data } = raw;
  let n = 0;
  const at = (x: number, y: number) => (y * width + x) * 4;
  const steps: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = at(x, y);
      if (data[i + 3] < 16) continue;
      let touches = x === 0 || y === 0 || x === width - 1 || y === height - 1;
      let opaqueNeighbor = false;
      for (const [dx, dy] of steps) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = at(nx, ny);
        if (data[j + 3] < 16) touches = true;
        else opaqueNeighbor = true;
      }
      if (!touches || !opaqueNeighbor) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const L = luma(r, g, b);
      if (L >= 160 && sat(r, g, b) <= 32 && hasDarkerWithin(raw, x, y, L - 35, 3)) n++;
    }
  }
  return n;
}

export function isolatedOpaqueCount(raw: Rgba): number {
  const { width, height, data } = raw;
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (data[p * 4 + 3] < 16) continue;
      let neighbors = 0;
      if (x > 0 && data[(p - 1) * 4 + 3] >= 16) neighbors++;
      if (x < width - 1 && data[(p + 1) * 4 + 3] >= 16) neighbors++;
      if (y > 0 && data[(p - width) * 4 + 3] >= 16) neighbors++;
      if (y < height - 1 && data[(p + width) * 4 + 3] >= 16) neighbors++;
      if (neighbors === 0) n++;
    }
  }
  return n;
}

export function opaqueBounds(raw: Rgba): { x0: number; y0: number; x1: number; y1: number } | null {
  const { width, height, data } = raw;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function contentHeights(frames: Rgba[]): number[] {
  return frames.map((f) => {
    const b = opaqueBounds(f);
    return b ? b.y1 - b.y0 + 1 : 0;
  });
}

export function populationStd(values: number[]): number {
  const xs = values.filter((v) => v > 0);
  if (xs.length === 0) return 0;
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const v = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
  return Math.sqrt(v);
}

/** Spread of the foot line (bottom of the opaque box), in pixels. */
export function baselineSpread(frames: Rgba[]): number {
  const bottoms = frames.map((f) => opaqueBounds(f)?.y1).filter((y): y is number => y !== undefined);
  if (bottoms.length < 2) return 0;
  return Math.max(...bottoms) - Math.min(...bottoms);
}

export function uniqueColorCount(frames: Rgba[]): number {
  const set = new Set<number>();
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < 128) continue;
      set.add((f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2]);
    }
  }
  return set.size;
}

export function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
  return 2 * dr * dr + 4 * dg * dg + 3 * db * db;
}

/**
 * Collapse near-duplicate opaque colours across every frame onto the more
 * frequent colour. Pixel sheets only — painted frames keep their gradients.
 */
export function mergeNearColors(frames: Rgba[], maxColors = 32, minDistance = PALETTE_MERGE_DISTANCE): void {
  const counts = new Map<number, number>();
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < 128) continue;
      const key = (f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2];
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const kept: [number, number, number][] = [];
  for (const [key] of ranked) {
    const rgb: [number, number, number] = [(key >> 16) & 255, (key >> 8) & 255, key & 255];
    if (kept.some((k) => colorDistance(k, rgb) < minDistance)) continue;
    kept.push(rgb);
    if (kept.length >= maxColors) break;
  }
  if (kept.length === 0) return;
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < 128) {
        f.data[i + 3] = 0;
        continue;
      }
      const rgb: [number, number, number] = [f.data[i], f.data[i + 1], f.data[i + 2]];
      let best = kept[0];
      let bestD = Infinity;
      for (const k of kept) {
        const d = colorDistance(k, rgb);
        if (d < bestD) {
          bestD = d;
          best = k;
        }
      }
      f.data[i] = best[0];
      f.data[i + 1] = best[1];
      f.data[i + 2] = best[2];
      f.data[i + 3] = 255;
    }
  }
}

/**
 * Height lock + halo cleanup on frames that already share one canvas
 * (the buffers assembleAnimation() has just aligned). Mutates in place.
 */
export async function applyPreAlignNormalize(frames: Rgba[], opts: { pixel: boolean; anchor: NormalizeAnchor }): Promise<void> {
  for (const f of frames) cleanupAlpha(f);
  if (frames.length < 2) return;
  const w = frames[0].width, h = frames[0].height;
  if (frames.some((f) => f.width !== w || f.height !== h)) return;
  await lockContentHeight(frames, opts);
  if (opts.anchor === "center") centerContent(frames);
}

async function lockContentHeight(frames: Rgba[], opts: { pixel: boolean; anchor: NormalizeAnchor }): Promise<void> {
  const boxes = frames.map(opaqueBounds);
  const heights = boxes.map((b) => (b ? b.y1 - b.y0 + 1 : 0)).filter((n) => n > 0).sort((a, b) => a - b);
  if (heights.length < 2) return;
  const target = heights[Math.floor(heights.length / 2)];
  for (let i = 0; i < frames.length; i++) {
    const b = boxes[i];
    if (!b) continue;
    const bh = b.y1 - b.y0 + 1;
    const bw = b.x1 - b.x0 + 1;
    if (bh < 4 || bw < 2) continue;
    let scale = target / bh;
    scale = Math.min(HEIGHT_LOCK_MAX_SCALE, Math.max(HEIGHT_LOCK_MIN_SCALE, scale));
    if (Math.abs(scale - 1) < 0.03) continue;
    let nw = Math.max(1, Math.round(bw * scale));
    let nh = Math.max(1, Math.round(bh * scale));
    const maxW = frames[i].width - 2, maxH = frames[i].height - 2;
    if (nw > maxW || nh > maxH) {
      const fit = Math.min(maxW / nw, maxH / nh);
      nw = Math.max(1, Math.round(nw * fit));
      nh = Math.max(1, Math.round(nh * fit));
    }
    const cropped = crop(frames[i], b.x0, b.y0, bw, bh);
    const resized = await resizeRaw(cropped, nw, nh, opts.pixel);
    frames[i].data.fill(0);
    const cx = (b.x0 + b.x1) / 2;
    let left = Math.round(cx - nw / 2);
    let top: number;
    if (opts.anchor === "center") {
      top = Math.round((b.y0 + b.y1) / 2 - nh / 2);
    } else if (opts.anchor === "cell") {
      top = Math.round((b.y0 + b.y1) / 2 - nh / 2);
    } else {
      // ground / air: feet stay on the same line
      top = b.y1 + 1 - nh;
    }
    left = Math.max(0, Math.min(frames[i].width - nw, left));
    top = Math.max(0, Math.min(frames[i].height - nh, top));
    blit(resized, frames[i], left, top);
    cleanupAlpha(frames[i]);
  }
}

function centerContent(frames: Rgba[]): void {
  for (const f of frames) {
    const b = opaqueBounds(f);
    if (!b) continue;
    const bw = b.x1 - b.x0 + 1, bh = b.y1 - b.y0 + 1;
    const left = Math.round((f.width - bw) / 2);
    const top = Math.round((f.height - bh) / 2);
    if (left === b.x0 && top === b.y0) continue;
    const cropped = crop(f, b.x0, b.y0, bw, bh);
    f.data.fill(0);
    blit(cropped, f, left, top);
  }
}

/** Second pass on the encoded frames: halo left by resampling, then palette. */
export async function finishNormalizedPngs(pngs: Buffer[], opts: { pixel: boolean }): Promise<Buffer[]> {
  const raws: Rgba[] = [];
  for (const png of pngs) {
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    raws.push({ data, width: info.width, height: info.height });
  }
  for (const r of raws) cleanupAlpha(r);
  if (opts.pixel) mergeNearColors(raws);
  const out: Buffer[] = [];
  for (const r of raws) {
    out.push(await sharp(r.data, { raw: { width: r.width, height: r.height, channels: 4 } }).png({ compressionLevel: 9 }).toBuffer());
  }
  return out;
}

export async function decodePng(png: Buffer): Promise<Rgba> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function crop(src: Rgba, x: number, y: number, w: number, h: number): Rgba {
  const out: Rgba = { data: Buffer.alloc(w * h * 4), width: w, height: h };
  for (let row = 0; row < h; row++) {
    src.data.copy(out.data, row * w * 4, ((y + row) * src.width + x) * 4, ((y + row) * src.width + x) * 4 + w * 4);
  }
  return out;
}

function blit(src: Rgba, dst: Rgba, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    const dy = y + oy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox;
      if (dx < 0 || dx >= dst.width) continue;
      const s = (y * src.width + x) * 4;
      if (src.data[s + 3] === 0) continue;
      src.data.copy(dst.data, (dy * dst.width + dx) * 4, s, s + 4);
    }
  }
}

async function resizeRaw(src: Rgba, w: number, h: number, pixel: boolean): Promise<Rgba> {
  const { data, info } = await sharp(src.data, { raw: { width: src.width, height: src.height, channels: 4 } })
    .resize(w, h, { kernel: pixel ? "nearest" : "lanczos3", fit: "fill" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
