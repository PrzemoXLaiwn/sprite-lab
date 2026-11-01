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

/** How far a drifted edge key reaches. Wider than this starts to catch navy cloth. */
const EXTRA_HARD = 36;
const EXTRA_SOFT = 64;
/** The joy clip's leftover green sits in the outer 8px. The suit is further in. */
const EXTRA_BORDER = 8;

function hueOf(nominal: Rgb, colour: Rgb, margin: number): boolean {
  const nominalGreen = nominal[1] > nominal[0] && nominal[1] > nominal[2];
  if (nominalGreen) return colour[1] > colour[0] + margin && colour[1] > colour[2] + margin;
  return colour[0] > colour[1] + margin && colour[2] > colour[1] + margin;
}

function sameHue(nominal: Rgb, colour: Rgb): boolean {
  return hueOf(nominal, colour, 12);
}

export type CornerKey = { colour: Rgb; global: boolean };

/**
 * Median of corner pixels the nominal key will leave opaque.
 * A plain median is the bright key itself, because most of the corner is still
 * #00FF00 and the darkened fringe is a thin line. Vidu pulls that line toward
 * the frame edge (about 10,80,8 on the joy clip). When that fringe is most of
 * the corner, the whole backdrop drifted and the extra key applies everywhere.
 */
export function cornerKey(frame: Frame, nominal: Rgb): CornerKey | null {
  const { width, height, data } = frame;
  const cp = Math.min(16, width >> 2, height >> 2);
  if (cp < 2) return null;
  const samples: Array<[number, number, number]> = [];
  let opaque = 0;
  const origins: Array<[number, number]> = [[0, 0], [width - cp, 0], [0, height - cp], [width - cp, height - cp]];
  for (const [x0, y0] of origins) {
    for (let y = y0; y < y0 + cp; y++) {
      for (let x = x0; x < x0 + cp; x++) {
        const o = (y * width + x) * 4;
        if (data[o + 3] < 128) continue;
        opaque++;
        if (dist(data[o], data[o + 1], data[o + 2], nominal) <= SOFT) continue;
        samples.push([data[o], data[o + 1], data[o + 2]]);
      }
    }
  }
  if (samples.length < 16) return null;
  const channel = (i: 0 | 1 | 2) => {
    const vals = samples.map((s) => s[i]).sort((a, b) => a - b);
    return vals[vals.length >> 1];
  };
  const med: Rgb = [channel(0), channel(1), channel(2)];
  if (!sameHue(nominal, med)) return null;
  if (dist(med[0], med[1], med[2], nominal) <= SOFT) return null;
  return { colour: med, global: opaque > 0 && samples.length / opaque > 0.5 };
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

function ramp(d: number, hard: number, soft: number): number {
  if (d <= hard) return 0;
  if (d >= soft) return 255;
  return Math.round((255 * (d - hard)) / (soft - hard));
}

function keyOne(frame: Frame, nominal: Rgb, extra: CornerKey | null): Frame {
  const data = Buffer.from(frame.data);
  const { width, height } = frame;
  for (let y = 0; y < height; y++) {
    const yEdge = y < EXTRA_BORDER || y >= height - EXTRA_BORDER;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const rgb: Rgb = [data[o], data[o + 1], data[o + 2]];
      const near = yEdge || x < EXTRA_BORDER || x >= width - EXTRA_BORDER;
      const speck = (x < 2 || x >= width - 2) && (y < 2 || y >= height - 2);
      let d = dist(rgb[0], rgb[1], rgb[2], nominal);
      let key = nominal;
      let hard = HARD;
      let soft = SOFT;
      if (extra?.global) {
        const d2 = dist(rgb[0], rgb[1], rgb[2], extra.colour);
        if (ramp(d2, EXTRA_HARD, EXTRA_SOFT) < ramp(d, HARD, SOFT)) {
          d = d2;
          key = extra.colour;
          hard = EXTRA_HARD;
          soft = EXTRA_SOFT;
        }
      } else if (extra && speck && d > HARD && Math.max(...rgb) - Math.min(...rgb) < 20 && (rgb[0] + 2 * rgb[1] + rgb[2]) / 4 < 72) {
        data[o + 3] = 0;
        continue;
      } else if (extra && near && d > HARD && hueOf(nominal, rgb, 4)) {
        // A thin edge the nominal ball missed, including the dull corner pixel
        // (about 31,37,28) that is green but not bright. Clearing only the
        // border keeps a dark suit, which is not green enough to match.
        data[o + 3] = 0;
        continue;
      }
      if (d <= hard) {
        data[o + 3] = 0;
        continue;
      }
      data[o + 3] = ramp(d, hard, soft);
      if (d < soft + 24) despill(data, o, key);
    }
  }
  return { data, width, height };
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

/**
 * Remove the key colour in every pixel, enclosed pockets included.
 * Frame 0 can restore a later pixel only when that pixel is not close to the key.
 */
export function keyChromaFrames(frames: Frame[], key: Rgb): Frame[] {
  const extras = frames.map((f) => cornerKey(f, key));
  const keysByFrame = extras.map((sampled) => (sampled ? [key, sampled.colour] : [key]));
  const out = frames.map((f, i) => keyOne(f, key, extras[i]));
  if (out.length < 2) {
    for (const frame of out) finishFrame(frame, key);
    return out;
  }
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
  for (const frame of out) finishFrame(frame, key);
  return out;
}

const BORDER_SPILL = 16;
const POCKET_MIN = 200;
const POCKET_GAP = 12;

function dist2(r: number, g: number, b: number, key: Rgb): number {
  const dr = r - key[0];
  const dg = g - key[1];
  const db = b - key[2];
  return dr * dr + dg * dg + db * db;
}

function spillPixel(rgb: Rgb, key: Rgb): boolean {
  const greenKey = key[1] > key[0] && key[1] > key[2];
  if (greenKey) return rgb[1] > Math.max(rgb[0], rgb[2]);
  return Math.min(rgb[0], rgb[2]) > rgb[1];
}

/**
 * After the colour key and the frame-0 restore. Vidu leaves a dark-green band
 * in the outer rows (the corner QA flag) and paints enclosed arm gaps the
 * old light-grey studio colour. The shirt is the large light region and stays.
 * A 1 px erode plus a second px on spill-coloured pixels takes off the fringe.
 */
function finishFrame(frame: Frame, key: Rgb): void {
  clearBorderSpill(frame, key);
  clearFlatPockets(frame);
  erodeEdge(frame, key);
}

function clearBorderSpill(frame: Frame, key: Rgb): void {
  const { width, height, data } = frame;
  const hard2 = HARD * HARD;
  const band = BORDER_SPILL;
  for (let y = 0; y < height; y++) {
    const yEdge = y < band || y >= height - band;
    for (let x = 0; x < width; x++) {
      if (!yEdge && x >= band && x < width - band) continue;
      const o = (y * width + x) * 4;
      if (data[o + 3] < 16) continue;
      const rgb: Rgb = [data[o], data[o + 1], data[o + 2]];
      if (!hueOf(key, rgb, 4)) continue;
      if (dist2(rgb[0], rgb[1], rgb[2], key) <= hard2) continue;
      data[o + 3] = 0;
    }
  }
}

interface LightComp {
  area: number;
  minx: number;
  miny: number;
  maxx: number;
  maxy: number;
  pixels: number[];
}

function bboxGap(a: LightComp, b: LightComp): number {
  const dx = Math.max(0, a.minx - b.maxx - 1, b.minx - a.maxx - 1);
  const dy = Math.max(0, a.miny - b.maxy - 1, b.miny - a.maxy - 1);
  return Math.max(dx, dy);
}

/** Flat light blobs that are not the shirt (and not touching it) become transparent. */
function clearFlatPockets(frame: Frame): void {
  const { width, height, data } = frame;
  const n = width * height;
  const cand = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const o = i * 4;
    if (data[o + 3] < 200) continue;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const mx = r > g ? (r > b ? r : b) : (g > b ? g : b);
    const mn = r < g ? (r < b ? r : b) : (g < b ? g : b);
    if (mn > 200 && mx - mn < 28) cand[i] = 1;
  }
  const seen = new Uint8Array(n);
  const comps: LightComp[] = [];
  const stack: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!cand[i] || seen[i]) continue;
    stack.push(i);
    seen[i] = 1;
    const comp: LightComp = { area: 0, minx: width, miny: height, maxx: 0, maxy: 0, pixels: [] };
    let touches = false;
    while (stack.length) {
      const p = stack.pop() as number;
      comp.pixels.push(p);
      comp.area++;
      const x = p % width;
      const y = (p / width) | 0;
      if (x < comp.minx) comp.minx = x;
      if (y < comp.miny) comp.miny = y;
      if (x > comp.maxx) comp.maxx = x;
      if (y > comp.maxy) comp.maxy = y;
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) touches = true;
      if (x > 0 && cand[p - 1] && !seen[p - 1]) { seen[p - 1] = 1; stack.push(p - 1); }
      if (x + 1 < width && cand[p + 1] && !seen[p + 1]) { seen[p + 1] = 1; stack.push(p + 1); }
      if (y > 0 && cand[p - width] && !seen[p - width]) { seen[p - width] = 1; stack.push(p - width); }
      if (y + 1 < height && cand[p + width] && !seen[p + width]) { seen[p + width] = 1; stack.push(p + width); }
    }
    if (!touches) comps.push(comp);
  }
  const cap = Math.min(4000, Math.floor(n * 0.08));
  const large = comps.filter((c) => c.area > cap);
  for (const c of comps) {
    if (c.area < POCKET_MIN || c.area > cap) continue;
    if (large.some((other) => bboxGap(c, other) <= POCKET_GAP)) continue;
    for (const p of c.pixels) data[p * 4 + 3] = 0;
  }
}

function neighborClear(src: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  if (x > 0 && src[y * width + x - 1] === 0) return true;
  if (x + 1 < width && src[y * width + x + 1] === 0) return true;
  if (y > 0 && src[(y - 1) * width + x] === 0) return true;
  if (y + 1 < height && src[(y + 1) * width + x] === 0) return true;
  return x === 0 || y === 0 || x === width - 1 || y === height - 1;
}

/** 1 px off every silhouette edge, then two more px where that edge is still the key colour. */
function erodeEdge(frame: Frame, key: Rgb): void {
  const { width, height, data } = frame;
  const n = width * height;
  const clearBoundary = (onlySpill: boolean) => {
    const src = new Uint8Array(n);
    for (let i = 0; i < n; i++) src[i] = data[i * 4 + 3] === 0 ? 0 : 1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (!src[i] || !neighborClear(src, width, height, x, y)) continue;
        const o = i * 4;
        if (onlySpill && !spillPixel([data[o], data[o + 1], data[o + 2]], key)) continue;
        if (onlySpill) despill(data, o, key);
        data[o + 3] = 0;
      }
    }
  };
  clearBoundary(false);
  clearBoundary(true);
  clearBoundary(true);
  despillRim(frame, key);
}

function neighborOn(src: Uint8Array, width: number, height: number, x: number, y: number): boolean {
  if (x > 0 && src[y * width + x - 1]) return true;
  if (x + 1 < width && src[y * width + x + 1]) return true;
  if (y > 0 && src[(y - 1) * width + x]) return true;
  if (y + 1 < height && src[(y + 1) * width + x]) return true;
  return false;
}

/** Clamp key-coloured spill on pixels within 2 px of transparency. */
function despillRim(frame: Frame, key: Rgb): void {
  const { width, height, data } = frame;
  const n = width * height;
  let mark = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (data[i * 4 + 3] < 16) mark[i] = 1;
  for (let pass = 0; pass < 2; pass++) {
    const next = new Uint8Array(mark);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        if (mark[i]) continue;
        if (neighborOn(mark, width, height, x, y)) next[i] = 1;
      }
    }
    mark = next;
  }
  for (let i = 0; i < n; i++) {
    if (!mark[i] || data[i * 4 + 3] < 16) continue;
    despill(data, i * 4, key);
  }
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
