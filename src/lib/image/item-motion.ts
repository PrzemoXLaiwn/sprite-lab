// =============================================================================
// SpriteLab — rigid item motions (weapons, tools, gems): no AI redraw
// =============================================================================
// An image model asked to "swing" a sword redraws the same sword in the same
// place and paints a white arc next to it. A sword is a rigid object: a swing
// is the SAME drawing rotated around the grip. Here the original sprite is
// moved procedurally, so colours, size and detail never change:
//   swing  — wind-up, fast slash, settle back; rotates around the grip
//   thrust — pulls back, stabs forward along the blade, returns
//   spin   — full turn around the centre
//   shine  — a light band sweeps along the item
//   pulse  — a soft outline glow breathes in and out (power up, gem glow)
// The blade axis comes from the shape itself (principal axis of the opaque
// pixels); the grip is the lower end (generated weapons point up / diagonal).
// Pixel art is moved on its native grid with nearest sampling, so every
// frame stays on whole art pixels and is scaled up by a whole number.
// =============================================================================

import sharp from "sharp";
import { encodeGif, type AnimationResult, type Raw } from "./animation";
import { bounds, downsample, loadSprite, nativeFactor, sampleBilinear, samplePixel } from "./rig-animation";

import type { ItemMotionKind } from "@/config/animations";

export type ItemMotion = ItemMotionKind;

export interface ItemMotionOptions {
  kind: ItemMotion;
  pixel: boolean;
  /** Output frame height (default 256). */
  frameSize?: number;
}

interface Axis { cx: number; cy: number; dx: number; dy: number; tMin: number; tMax: number }

/** Principal axis of the opaque pixels; (dx, dy) points from the grip to the tip. */
export function itemAxis(src: Raw): Axis | null {
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (src.data[(y * src.width + x) * 4 + 3] >= 128) { n++; sx += x; sy += y; }
  }
  if (n < 4) return null;
  const cx = sx / n, cy = sy / n;
  let xx = 0, yy = 0, xy = 0;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (src.data[(y * src.width + x) * 4 + 3] < 128) continue;
    const ux = x - cx, uy = y - cy;
    xx += ux * ux; yy += uy * uy; xy += ux * uy;
  }
  const angle = 0.5 * Math.atan2(2 * xy, xx - yy);
  let dx = Math.cos(angle), dy = Math.sin(angle);
  let tMin = Infinity, tMax = -Infinity;
  for (let y = 0; y < src.height; y++) for (let x = 0; x < src.width; x++) {
    if (src.data[(y * src.width + x) * 4 + 3] < 128) continue;
    const t = (x - cx) * dx + (y - cy) * dy;
    if (t < tMin) tMin = t;
    if (t > tMax) tMax = t;
  }
  // Point from the grip (lower end on screen; left end when level) to the tip
  const gripIsMax = Math.abs(dy) > 0.2 ? dy > 0 : dx < 0;
  if (gripIsMax) { dx = -dx; dy = -dy; [tMin, tMax] = [-tMax, -tMin]; }
  return { cx, cy, dx, dy, tMin, tMax };
}

export async function makeItemMotion(sprite: Buffer, opts: ItemMotionOptions): Promise<AnimationResult> {
  const frameSize = opts.frameSize ?? 256;
  let src = await loadSprite(sprite);
  let factor = 1;
  if (opts.pixel) {
    factor = nativeFactor(src);
    if (factor > 1) src = downsample(src, factor);
  }
  const b = bounds(src);
  const axis = itemAxis(src);
  if (!b || !axis) throw new Error("Sprite is empty");
  const sample = opts.pixel ? samplePixel : sampleBilinear;
  const len = axis.tMax - axis.tMin;

  // Pivot: the grip for swing / thrust, the centre otherwise
  const gripT = axis.tMin + len * 0.12;
  const pivot = opts.kind === "swing" || opts.kind === "thrust"
    ? { x: axis.cx + axis.dx * gripT, y: axis.cy + axis.dy * gripT }
    : { x: (b.x0 + b.x1 + 1) / 2, y: (b.y0 + b.y1 + 1) / 2 };

  // Square canvas centred on the pivot, big enough for every pose
  let reach = 0;
  for (let y = b.y0; y <= b.y1; y++) for (let x = b.x0; x <= b.x1; x++) {
    if (src.data[(y * src.width + x) * 4 + 3] >= 128) reach = Math.max(reach, Math.hypot(x + 0.5 - pivot.x, y + 0.5 - pivot.y));
  }
  const extra = opts.kind === "thrust" ? len * 0.4 : opts.kind === "pulse" ? 3 : 0;
  const S = Math.ceil((reach + extra) * 2 + 4);
  const c = S / 2;

  let n: number, fps: number;
  let angles: number[] = [], shifts: number[] = [];
  switch (opts.kind) {
    case "swing": // degrees, clockwise on screen: wind-up, slash, follow-through, settle
      n = 10; fps = 12;
      angles = [0, -14, -26, -30, 18, 70, 96, 84, 46, 16];
      break;
    case "thrust": // along the blade, in lengths: pull back, stab, hold, return
      n = 8; fps = 12;
      shifts = [0, -0.1, -0.16, 0.18, 0.38, 0.38, 0.2, 0.06].map((v) => v * len);
      break;
    case "spin":
      n = opts.pixel ? 8 : 12; fps = 12;
      angles = Array.from({ length: n }, (_, i) => (360 * i) / n);
      break;
    case "shine":
      n = 12; fps = 12;
      break;
    default: // pulse
      n = 8; fps = 8;
  }
  if (!angles.length) angles = new Array(n).fill(0);
  if (!shifts.length) shifts = new Array(n).fill(0);

  const glowColor = brightestColor(src);
  const frames: Raw[] = [];
  for (let f = 0; f < n; f++) {
    const a = (angles[f] * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
    const tx = axis.dx * shifts[f], ty = axis.dy * shifts[f];
    const out: Raw = { data: Buffer.alloc(S * S * 4), width: S, height: S };
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      // Inverse map: un-shift, un-rotate around the pivot, back to source space
      const px = x + 0.5 - c - tx, py = y + 0.5 - c - ty;
      const sx = pivot.x + px * cos + py * sin;
      const sy = pivot.y - px * sin + py * cos;
      sample(src, sx, sy, out.data, (y * S + x) * 4);
    }
    if (opts.kind === "shine") applyShine(out, f, n, axis, pivot, c);
    if (opts.kind === "pulse") applyGlow(out, glowColor, [0, 0.35, 0.7, 1, 1, 0.7, 0.35, 0][f] ?? 0, opts.pixel);
    frames.push(out);
  }

  // Whole-number scale for pixel art
  let outS: number;
  if (opts.pixel) outS = S * Math.max(1, Math.round((frameSize * Math.max(1, factor)) / Math.max(S * factor, 1)));
  else outS = Math.max(frameSize, Math.min(512, Math.round(S * (factor || 1))));
  const pngs = await Promise.all(frames.map((fr) =>
    sharp(fr.data, { raw: { width: S, height: S, channels: 4 } })
      .resize(outS, outS, { kernel: opts.pixel ? "nearest" : "lanczos3", fit: "fill" })
      .png()
      .toBuffer()
  ));
  const sheetPng = await sharp({ create: { width: outS * n, height: outS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pngs.map((input, i) => ({ input, left: i * outS, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { sheetPng, gif: await encodeGif(pngs, fps), frameCount: n, frameWidth: outS, frameHeight: outS, frames: pngs, fps };
}

/** A diagonal band of light travels from the grip to the tip, then rests. */
function applyShine(out: Raw, f: number, n: number, axis: Axis, pivot: { x: number; y: number }, c: number) {
  const sweep = 8; // frames of travel; the rest is a pause before the loop
  if (f >= sweep) return;
  const len = axis.tMax - axis.tMin;
  // Starts past the grip so the glint runs along the blade, not the handle
  const centre = axis.tMin + len * 0.25 + ((f + 0.5) / sweep) * len * 0.9;
  const half = Math.max(2, len * 0.06);
  for (let y = 0; y < out.height; y++) for (let x = 0; x < out.width; x++) {
    const i = (y * out.width + x) * 4;
    if (out.data[i + 3] < 128) continue;
    // Source-space projection (the item doesn't move in shine)
    const sx = pivot.x + (x + 0.5 - c), sy = pivot.y + (y + 0.5 - c);
    const t = (sx - axis.cx) * axis.dx + (sy - axis.cy) * axis.dy;
    // Slight slant so the band reads as a glint, not a stripe
    const d = Math.abs(t - centre + ((sx - axis.cx) * -axis.dy + (sy - axis.cy) * axis.dx) * 0.35);
    if (d > half) continue;
    // Light catches bright surfaces (steel, crystal), not the dark grip
    const lum = (0.299 * out.data[i] + 0.587 * out.data[i + 1] + 0.114 * out.data[i + 2]) / 255;
    if (lum < 0.3) continue;
    // Hard white core (reads on already-bright steel) with a softer edge
    const k = d < half * 0.4 ? 0.92 : 0.55 * (1 - d / half);
    for (let ch = 0; ch < 3; ch++) out.data[i + ch] = Math.round(out.data[i + ch] + (255 - out.data[i + ch]) * k);
  }
}

/** Outline glow around the silhouette (1–2 art pixels), strength 0..1. */
function applyGlow(out: Raw, color: [number, number, number], strength: number, pixel: boolean) {
  if (strength <= 0) return;
  const { width: W, height: H, data } = out;
  const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && data[(y * W + x) * 4 + 3] >= 128;
  const rings = pixel ? (strength > 0.6 ? 2 : 1) : 3;
  const add: { i: number; a: number }[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (opaque(x, y)) continue;
    let dist = Infinity;
    for (let r = 1; r <= rings && dist === Infinity; r++) {
      for (let oy = -r; oy <= r && dist === Infinity; oy++) for (let ox = -r; ox <= r; ox++) {
        if (Math.max(Math.abs(ox), Math.abs(oy)) === r && opaque(x + ox, y + oy)) { dist = r; break; }
      }
    }
    if (dist === Infinity) continue;
    const a = strength * (pixel ? (dist === 1 ? 0.9 : 0.5) : 0.75 / dist);
    add.push({ i: (y * W + x) * 4, a });
  }
  for (const { i, a } of add) {
    data[i] = color[0]; data[i + 1] = color[1]; data[i + 2] = color[2];
    data[i + 3] = Math.round(255 * (pixel ? (a >= 0.5 ? 1 : 0.55) : a));
  }
}

/** The sprite's most saturated bright colour (the gem, the runes) for its glow. */
function brightestColor(src: Raw): [number, number, number] {
  let best: [number, number, number] = [255, 236, 39], score = -1;
  for (let i = 0; i < src.data.length; i += 16) {
    if (src.data[i + 3] < 200) continue;
    const r = src.data[i], g = src.data[i + 1], b = src.data[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const s = (max - min) * max;
    if (s > score) { score = s; best = [r, g, b]; }
  }
  // Lift it so the glow reads on dark and light backgrounds
  return best.map((v) => Math.round(v + (255 - v) * 0.35)) as [number, number, number];
}
