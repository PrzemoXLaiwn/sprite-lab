// =============================================================================
// Optional sprite quality pass — OFF unless SPRITE_QUALITY_POSTPROCESS=1
// =============================================================================
// Deterministic cleanup that runs AFTER the production post-process:
//   • matte fringe (white / magenta halos left on the silhouette)
//   • integer recentre on the same canvas, without resampling
//   • near-duplicate palette snap for pixel art (within one set of frames)
//   • small scale-drift correction + shared foot line and torso x for frames
//
// Crouches and jumps are left short: a frame is rescaled only when its
// opaque height is within 12% of the set's median. Nothing here calls a
// provider, changes credits, or runs when the flag is unset.
// =============================================================================

import sharp from "sharp";

export const QUALITY_POSTPROCESS_ENV = "SPRITE_QUALITY_POSTPROCESS";

/** True only when the env var is exactly "1". Default is off. */
export function qualityPostprocessEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env[QUALITY_POSTPROCESS_ENV] === "1";
}

export interface RawImage {
  data: Buffer;
  width: number;
  height: number;
}

type RGB = [number, number, number];

const WHITE: RGB = [255, 255, 255];
const MAGENTA: RGB = [255, 0, 255];
/** Squared distance. A light/magenta rim within this of the matte is fringe. */
const FRINGE_TOL2 = 48 * 48;
/** Near-duplicate colours (anti-alias speckles), not a shading step. */
const PALETTE_THRESHOLD = 12;
/** Rescale a frame only inside this band around the median height. */
const SCALE_BAND = 0.12;

export interface Bounds {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

function dist2(m: RGB, r: number, g: number, b: number): number {
  const dr = m[0] - r, dg = m[1] - g, db = m[2] - b;
  return dr * dr + dg * dg + db * db;
}

export function blank(width: number, height: number): RawImage {
  return { data: Buffer.alloc(width * height * 4), width, height };
}

export function copyRaw(src: RawImage): RawImage {
  return { data: Buffer.from(src.data), width: src.width, height: src.height };
}

export function opaqueBounds(raw: RawImage): Bounds | null {
  const { data, width, height } = raw;
  let x0 = width, y0 = height, x1 = -1, y1 = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 128) continue;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function blit(src: RawImage, dst: RawImage, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    const dy = y + oy;
    if (dy < 0 || dy >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = x + ox;
      if (dx < 0 || dx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      if (src.data[si + 3] === 0) continue;
      const di = (dy * dst.width + dx) * 4;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
}

function crop(src: RawImage, b: Bounds): RawImage {
  const w = b.x1 - b.x0 + 1;
  const h = b.y1 - b.y0 + 1;
  const out = blank(w, h);
  for (let y = 0; y < h; y++) {
    const si = ((y + b.y0) * src.width + b.x0) * 4;
    src.data.copy(out.data, y * w * 4, si, si + w * 4);
  }
  return out;
}

function scaleCrop(src: RawImage, b: Bounds, outW: number, outH: number): RawImage {
  const bw = b.x1 - b.x0 + 1;
  const bh = b.y1 - b.y0 + 1;
  const data = Buffer.alloc(outW * outH * 4);
  for (let y = 0; y < outH; y++) {
    const sy = b.y0 + Math.min(bh - 1, Math.floor(((y + 0.5) * bh) / outH));
    for (let x = 0; x < outW; x++) {
      const sx = b.x0 + Math.min(bw - 1, Math.floor(((x + 0.5) * bw) / outW));
      const si = (sy * src.width + sx) * 4;
      const di = (y * outW + x) * 4;
      data[di] = src.data[si];
      data[di + 1] = src.data[si + 1];
      data[di + 2] = src.data[si + 2];
      data[di + 3] = src.data[si + 3];
    }
  }
  return { data, width: outW, height: outH };
}

function touchesClear(data: Buffer, width: number, height: number, x: number, y: number): boolean {
  const p = y * width + x;
  if (data[p * 4 + 3] === 0) return false;
  return (
    x === 0 || data[(p - 1) * 4 + 3] === 0 ||
    x === width - 1 || data[(p + 1) * 4 + 3] === 0 ||
    y === 0 || data[(p - width) * 4 + 3] === 0 ||
    y === height - 1 || data[(p + width) * 4 + 3] === 0
  );
}

/**
 * Drop matte-coloured rims that sit on transparency and are closer to the
 * key colour than the sprite just inside them. A white ghost stays: its
 * interior is the same colour as its edge, so the margin test fails.
 */
export function cleanupAlpha(
  src: RawImage,
  opts: { passes?: number; lowAlpha?: number; hardAlpha?: boolean } = {},
): { image: RawImage; cleared: number } {
  const data = Buffer.from(src.data);
  const { width, height } = src;
  const low = opts.lowAlpha ?? 16;
  let cleared = 0;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0 && data[i] < low) {
      data[i] = 0;
      cleared++;
    }
  }

  // A matte rim is white/magenta pixels that touch the transparent outside
  // AND sit within a few pixels of a real (non-matte) body colour. A white
  // ghost has no non-matte body, so it is left alone. A white shirt behind
  // a dark outline is not connected to the outside, so it is left alone.
  const isMatte = (p: number) => {
    const i = p * 4;
    if (data[i + 3] === 0) return false;
    const d = Math.min(dist2(WHITE, data[i], data[i + 1], data[i + 2]), dist2(MAGENTA, data[i], data[i + 1], data[i + 2]));
    return d <= FRINGE_TOL2;
  };
  // 4 covers a 2px rim measured 4-connected around a corner.
  const shell = opts.passes ?? 4;
  const dist = new Int16Array(width * height).fill(-1);
  const queue: number[] = [];
  for (let p = 0; p < width * height; p++) {
    if (data[p * 4 + 3] === 0 || isMatte(p)) continue;
    dist[p] = 0;
    queue.push(p);
  }
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head];
    if (dist[p] >= shell) continue;
    const x = p % width;
    const y = (p - x) / width;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
    for (const n of next) {
      if (n < 0 || dist[n] >= 0 || !isMatte(n)) continue;
      dist[n] = dist[p] + 1;
      queue.push(n);
    }
  }
  const outside = new Uint8Array(width * height);
  const stack: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      if (!isMatte(p) || !touchesClear(data, width, height, x, y)) continue;
      outside[p] = 1;
      stack.push(p);
    }
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % width;
    const y = (p - x) / width;
    const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1];
    for (const n of next) {
      if (n < 0 || outside[n] || !isMatte(n)) continue;
      outside[n] = 1;
      stack.push(n);
    }
  }
  for (let p = 0; p < width * height; p++) {
    if (!outside[p] || dist[p] <= 0 || dist[p] > shell) continue;
    data[p * 4 + 3] = 0;
    cleared++;
  }

  if (opts.hardAlpha) {
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0 || data[i] === 255) continue;
      data[i] = data[i] < 128 ? 0 : 255;
    }
  }
  return { image: { data, width, height }, cleared };
}

/** Shift the subject onto the canvas centre by a whole number of pixels. No resample. Skips a shift that would clip. */
export function recenter(src: RawImage): RawImage {
  const b = opaqueBounds(src);
  if (!b) return copyRaw(src);
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const dx = Math.round((src.width - 1) / 2 - cx);
  const dy = Math.round((src.height - 1) / 2 - cy);
  if (dx === 0 && dy === 0) return copyRaw(src);
  if (b.x0 + dx < 0 || b.y0 + dy < 0 || b.x1 + dx >= src.width || b.y1 + dy >= src.height) return copyRaw(src);
  const out = blank(src.width, src.height);
  blit(src, out, dx, dy);
  return out;
}

function colorKey(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

/**
 * Snap opaque colours that sit within `threshold` of a more common colour
 * onto that colour. One palette for the whole frame set, so a walk cycle
 * cannot boil between (200,30,30) and (206,34,32). Shading steps farther
 * apart are kept. Alpha is unchanged.
 */
export function lockPalette(
  frames: RawImage[],
  opts: { threshold?: number; maxColors?: number } = {},
): RawImage[] {
  const threshold = opts.threshold ?? PALETTE_THRESHOLD;
  const maxColors = opts.maxColors ?? 32;
  const thr2 = threshold * threshold;
  const counts = new Map<number, number>();
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < 128) continue;
      const k = colorKey(f.data[i], f.data[i + 1], f.data[i + 2]);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0]);
  const kept: RGB[] = [];
  const map = new Map<number, RGB>();
  for (const [k] of sorted) {
    const c: RGB = [(k >> 16) & 255, (k >> 8) & 255, k & 255];
    let nearest: RGB | null = null;
    let best = Infinity;
    for (const p of kept) {
      const d = dist2(p, c[0], c[1], c[2]);
      if (d < best) {
        best = d;
        nearest = p;
      }
    }
    if (nearest && best <= thr2) map.set(k, nearest);
    else if (kept.length < maxColors) {
      kept.push(c);
      map.set(k, c);
    } else if (nearest) map.set(k, nearest);
  }
  return frames.map((f) => {
    const data = Buffer.from(f.data);
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] < 128) continue;
      const c = map.get(colorKey(data[i], data[i + 1], data[i + 2]));
      if (!c) continue;
      data[i] = c[0];
      data[i + 1] = c[1];
      data[i + 2] = c[2];
    }
    return { data, width: f.width, height: f.height };
  });
}

function torsoCenterX(img: RawImage): number {
  const cut = img.height * 0.7;
  let sum = 0;
  let n = 0;
  let all = 0;
  let allN = 0;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      if (img.data[(y * img.width + x) * 4 + 3] < 128) continue;
      all += x;
      allN++;
      if (y < cut) {
        sum += x;
        n++;
      }
    }
  }
  if (n > 0) return sum / n;
  return allN > 0 ? all / allN : img.width / 2;
}

/**
 * Put every frame on one canvas: feet on one baseline, upper-body centroid
 * on one x. Heights within 12% of the median are nearest-neighbour scaled
 * onto that median; a crouch or a jump stays at its own height.
 */
export function alignFrames(frames: RawImage[]): RawImage[] {
  if (frames.length === 0) return [];
  const bounds = frames.map(opaqueBounds);
  const heights = bounds.map((b) => (b ? b.y1 - b.y0 + 1 : 0)).filter((h) => h > 0);
  if (heights.length === 0) {
    const w = Math.max(...frames.map((f) => f.width), 1);
    const h = Math.max(...frames.map((f) => f.height), 1);
    return frames.map(() => blank(w, h));
  }
  const sorted = [...heights].sort((a, b) => a - b);
  const targetH = sorted[Math.floor(sorted.length / 2)];
  const crops = frames.map((f, i) => {
    const b = bounds[i];
    if (!b) return null;
    const bh = b.y1 - b.y0 + 1;
    const bw = b.x1 - b.x0 + 1;
    const ratio = bh / targetH;
    const doScale = ratio >= 1 - SCALE_BAND && ratio <= 1 + SCALE_BAND && bh !== targetH;
    const outH = doScale ? targetH : bh;
    const outW = doScale ? Math.max(1, Math.round((bw * targetH) / bh)) : bw;
    const img = doScale ? scaleCrop(f, b, outW, outH) : crop(f, b);
    return { img, torsoX: torsoCenterX(img) };
  });

  const pad = Math.max(1, Math.round(targetH * 0.08));
  let maxLeft = 1;
  let maxRight = 1;
  let maxH = 1;
  for (const c of crops) {
    if (!c) continue;
    maxLeft = Math.max(maxLeft, c.torsoX);
    maxRight = Math.max(maxRight, c.img.width - c.torsoX);
    maxH = Math.max(maxH, c.img.height);
  }
  const canvasW = Math.ceil(maxLeft + maxRight) + pad * 2;
  const canvasH = maxH + pad * 2;
  const anchorX = pad + maxLeft;
  const footY = canvasH - pad - 1;
  return crops.map((c) => {
    const out = blank(canvasW, canvasH);
    if (!c) return out;
    blit(c.img, out, Math.round(anchorX - c.torsoX), Math.round(footY - (c.img.height - 1)));
    return out;
  });
}

export async function decodeRgba(png: Buffer): Promise<RawImage> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

export async function encodeRgba(raw: RawImage): Promise<Buffer> {
  return sharp(raw.data, { raw: { width: raw.width, height: raw.height, channels: 4 } }).png().toBuffer();
}

export interface QualityPassOptions {
  /** Pixel art: hard alpha and near-duplicate palette snap. Painted styles only lose matte fringe and get recentred. */
  pixel?: boolean;
}

/** Still-sprite pass. Does not change canvas dimensions. */
export async function applyQualityPass(png: Buffer, opts: QualityPassOptions = {}): Promise<Buffer> {
  const raw = await decodeRgba(png);
  let image = cleanupAlpha(raw, { hardAlpha: !!opts.pixel }).image;
  if (opts.pixel) image = lockPalette([image], { threshold: PALETTE_THRESHOLD, maxColors: 32 })[0];
  image = recenter(image);
  return encodeRgba(image);
}

/**
 * Returns `png` unchanged when the flag is off (same reference, no decode).
 * Callers in the generation and guest paths use this so the default output
 * stays byte-for-byte the production post-process.
 */
export async function applyQualityPassIfEnabled(
  png: Buffer,
  opts: QualityPassOptions = {},
  env: Record<string, string | undefined> = process.env,
): Promise<Buffer> {
  if (!qualityPostprocessEnabled(env)) return png;
  return applyQualityPass(png, opts);
}

/**
 * Frame pass used at the end of animation assembly. Flag off: the input
 * frames and sizes are returned as-is (same array).
 */
export async function finalizeAnimationFrames(
  frames: Buffer[],
  opts: { pixel: boolean; frameWidth: number; frameHeight: number },
  env: Record<string, string | undefined> = process.env,
): Promise<{ frames: Buffer[]; frameWidth: number; frameHeight: number }> {
  if (!qualityPostprocessEnabled(env)) {
    return { frames, frameWidth: opts.frameWidth, frameHeight: opts.frameHeight };
  }
  if (frames.length === 0) return { frames, frameWidth: opts.frameWidth, frameHeight: opts.frameHeight };
  const raws = await Promise.all(frames.map((f) => decodeRgba(f)));
  const cleaned = raws.map((r) => cleanupAlpha(r, { hardAlpha: opts.pixel }).image);
  const aligned = alignFrames(cleaned);
  const locked = opts.pixel ? lockPalette(aligned, { threshold: PALETTE_THRESHOLD, maxColors: 32 }) : aligned;
  const pngs = await Promise.all(locked.map((r) => encodeRgba(r)));
  return {
    frames: pngs,
    frameWidth: locked[0]?.width ?? opts.frameWidth,
    frameHeight: locked[0]?.height ?? opts.frameHeight,
  };
}

export function uniqueOpaqueColors(frames: RawImage[]): number {
  const set = new Set<number>();
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      if (f.data[i + 3] < 128) continue;
      set.add(colorKey(f.data[i], f.data[i + 1], f.data[i + 2]));
    }
  }
  return set.size;
}

/** Opaque edge pixels whose colour is still close to white or magenta. */
export function lightFringeCount(raw: RawImage): number {
  const { data, width, height } = raw;
  let n = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      const i = p * 4;
      if (data[i + 3] < 128) continue;
      const edge =
        x === 0 || data[(p - 1) * 4 + 3] < 128 ||
        x === width - 1 || data[(p + 1) * 4 + 3] < 128 ||
        y === 0 || data[(p - width) * 4 + 3] < 128 ||
        y === height - 1 || data[(p + width) * 4 + 3] < 128;
      if (!edge) continue;
      const d = Math.min(dist2(WHITE, data[i], data[i + 1], data[i + 2]), dist2(MAGENTA, data[i], data[i + 1], data[i + 2]));
      if (d <= FRINGE_TOL2) n++;
    }
  }
  return n;
}

export function bboxHeight(raw: RawImage): number {
  const b = opaqueBounds(raw);
  return b ? b.y1 - b.y0 + 1 : 0;
}

export function footY(raw: RawImage): number {
  const b = opaqueBounds(raw);
  return b ? b.y1 : -1;
}

export function centerOffset(raw: RawImage): number {
  const b = opaqueBounds(raw);
  if (!b) return 0;
  const cx = (b.x0 + b.x1) / 2;
  const cy = (b.y0 + b.y1) / 2;
  const dx = cx - (raw.width - 1) / 2;
  const dy = cy - (raw.height - 1) / 2;
  return Math.hypot(dx, dy);
}
