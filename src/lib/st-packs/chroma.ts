// Chroma key for ST Packs. Light grey and white collide with shirts and coats,
// and a pocket of that colour enclosed by an arm stays opaque. The edit puts
// the character on a flat key colour far from its own palette. Every pixel
// close to that colour is removed, including pixels the border cannot reach.
import type { Frame } from "./types";

export type Rgb = [number, number, number];

export const CHROMA_GREEN: Rgb = [0, 255, 0];
export const CHROMA_MAGENTA: Rgb = [255, 0, 255];

/** Fully transparent inside this distance, opaque outside SOFT. */
const HARD = 48;
const SOFT = 105;

function dist(r: number, g: number, b: number, key: Rgb): number {
  const dr = r - key[0];
  const dg = g - key[1];
  const db = b - key[2];
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function chromaHex(key: Rgb): string {
  return `#${key.map((c) => c.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

export function parseChromaHex(value: unknown): Rgb | null {
  if (typeof value !== "string") return null;
  const m = /^#?([0-9a-f]{6})$/i.exec(value.trim());
  if (!m) return null;
  const n = m[1];
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

/** Green unless the character itself is green, then magenta. Border pixels are the backdrop and are ignored. */
export async function chromaKeyForStill(png: Buffer): Promise<string> {
  const sharp = (await import("sharp")).default;
  const { data, info } = await sharp(png).rotate().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return chromaHex(pickChromaKey({ data, width: info.width ?? 0, height: info.height ?? 0 }));
}

export function pickChromaKey(frame: Frame): Rgb {
  const { width, height, data } = frame;
  const inset = Math.max(2, Math.floor(Math.min(width, height) * 0.08));
  let seen = 0;
  let green = 0;
  for (let y = inset; y < height - inset; y++) {
    for (let x = inset; x < width - inset; x++) {
      const o = (y * width + x) * 4;
      if (data[o + 3] < 16) continue;
      seen++;
      const r = data[o];
      const g = data[o + 1];
      const b = data[o + 2];
      if (g > 150 && g > r + 40 && g > b + 40) green++;
    }
  }
  if (seen > 0 && green / seen > 0.06) return CHROMA_MAGENTA;
  return CHROMA_GREEN;
}

function despill(data: Buffer, o: number, key: Rgb): void {
  const greenKey = key[1] > key[0] && key[1] > key[2];
  if (greenKey) {
    const cap = Math.max(data[o], data[o + 2]);
    if (data[o + 1] > cap) data[o + 1] = cap;
    return;
  }
  const spill = Math.min(data[o], data[o + 2]) - data[o + 1];
  if (spill > 0) {
    data[o] = Math.max(0, data[o] - spill);
    data[o + 2] = Math.max(0, data[o + 2] - spill);
  }
}

/** Median colour of opaque corner pixels, when they share the key's hue. Vidu darkens #00FF00 toward the frame edge. */
export function cornerKey(frame: Frame, nominal: Rgb): Rgb | null {
  const { width, height, data } = frame;
  const cp = Math.min(16, width >> 2, height >> 2);
  if (cp < 2) return null;
  const samples: Array<[number, number, number]> = [];
  const origins: Array<[number, number]> = [[0, 0], [width - cp, 0], [0, height - cp], [width - cp, height - cp]];
  for (const [x0, y0] of origins) {
    for (let y = y0; y < y0 + cp; y++) {
      for (let x = x0; x < x0 + cp; x++) {
        const o = (y * width + x) * 4;
        if (data[o + 3] < 128) continue;
        samples.push([data[o], data[o + 1], data[o + 2]]);
      }
    }
  }
  if (samples.length < 24) return null;
  const channel = (i: 0 | 1 | 2) => {
    const vals = samples.map((s) => s[i]).sort((a, b) => a - b);
    return vals[vals.length >> 1];
  };
  const med: Rgb = [channel(0), channel(1), channel(2)];
  const greenish = (c: Rgb) => c[1] > c[0] + 12 && c[1] > c[2] + 12;
  const magentaish = (c: Rgb) => c[0] > c[1] + 12 && c[2] > c[1] + 12;
  const nominalGreen = nominal[1] > nominal[0] && nominal[1] > nominal[2];
  if (nominalGreen ? !greenish(med) : !magentaish(med)) return null;
  return med;
}

function closest(r: number, g: number, b: number, keys: Rgb[]): { d: number; key: Rgb } {
  let d = Infinity;
  let key = keys[0];
  for (const k of keys) {
    const next = dist(r, g, b, k);
    if (next < d) { d = next; key = k; }
  }
  return { d, key };
}

function keyOne(frame: Frame, keys: Rgb[]): Frame {
  const data = Buffer.from(frame.data);
  for (let o = 0; o < data.length; o += 4) {
    const { d, key } = closest(data[o], data[o + 1], data[o + 2], keys);
    if (d <= HARD) {
      data[o + 3] = 0;
      continue;
    }
    data[o + 3] = d >= SOFT ? 255 : Math.round((255 * (d - HARD)) / (SOFT - HARD));
    if (d < SOFT + 24) despill(data, o, key);
  }
  return { data, width: frame.width, height: frame.height };
}

function interiorMask(frame: Frame, key: Rgb): Uint8Array {
  const { width, height, data } = frame;
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < mask.length; i++) {
    const o = i * 4;
    if (data[o + 3] < 250) continue;
    if (dist(data[o], data[o + 1], data[o + 2], key) <= SOFT) continue;
    mask[i] = 1;
  }
  // One-pixel erode so the fringe is not frozen from frame 0.
  const out = new Uint8Array(mask.length);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (mask[i] && mask[i - 1] && mask[i + 1] && mask[i - width] && mask[i + width]) out[i] = 1;
    }
  }
  return out;
}

/**
 * Remove the key colour in every pixel, enclosed pockets included.
 * Frame 0 can restore a later pixel only when that pixel is not close to the key.
 */
/** Opaque plate: transparent pixels become the key colour so a video model has a flat ground to keep. */
export function compositeOverKey(frame: Frame, key: Rgb): Frame {
  const data = Buffer.from(frame.data);
  for (let o = 0; o < data.length; o += 4) {
    const a = data[o + 3] / 255;
    data[o] = Math.round(data[o] * a + key[0] * (1 - a));
    data[o + 1] = Math.round(data[o + 1] * a + key[1] * (1 - a));
    data[o + 2] = Math.round(data[o + 2] * a + key[2] * (1 - a));
    data[o + 3] = 255;
  }
  return { data, width: frame.width, height: frame.height };
}

export function keyChromaFrames(frames: Frame[], key: Rgb): Frame[] {
  const keysByFrame = frames.map((f) => {
    const sampled = cornerKey(f, key);
    return sampled ? [key, sampled] : [key];
  });
  const out = frames.map((f, i) => keyOne(f, keysByFrame[i]));
  if (out.length < 2) return out;
  const interior = interiorMask(out[0], key);
  const width = out[0].width;
  const height = out[0].height;
  const ref = centroid(interior, width);
  for (let f = 1; f < out.length; f++) {
    const solid = interiorMask(out[f], key);
    const c = centroid(solid, width);
    const dx = ref.n && c.n ? Math.round(c.x - ref.x) : 0;
    const dy = ref.n && c.n ? Math.round(c.y - ref.y) : 0;
    const data = out[f].data;
    for (let y = 0; y < height; y++) {
      const sy = y - dy;
      if (sy < 0 || sy >= height) continue;
      for (let x = 0; x < width; x++) {
        const sx = x - dx;
        if (sx < 0 || sx >= width) continue;
        if (!interior[sy * width + sx]) continue;
        const o = (y * width + x) * 4;
        if (closest(data[o], data[o + 1], data[o + 2], keysByFrame[f]).d <= SOFT) continue;
        data[o + 3] = 255;
      }
    }
  }
  return out;
}

function centroid(mask: Uint8Array, width: number): { x: number; y: number; n: number } {
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
