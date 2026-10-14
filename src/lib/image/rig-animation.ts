// =============================================================================
// SpriteLab — rigged idle animation (no AI redraw)
// =============================================================================
// Redrawing every frame with an image model makes an idle "boil": height,
// colours and details shift a little from frame to frame. A real idle is the
// SAME drawing gently deformed — what Spine / Skeleton2D rigs do. Here the
// original sprite is warped smoothly per frame:
//   breathe — feet planted; the torso stretches up and down, the head follows
//             a beat later, the chest widens slightly, the top sways a touch
//   float   — the whole sprite bobs, with a slight sway
// Colours and size never change and the loop is seamless at any frame rate.
// Pixel art is warped on its native pixel grid (nearest sampling), so it
// stays crisp and moves in whole art pixels like hand-made pixel animation.
// =============================================================================

import sharp from "sharp";
import { keySpriteBackground } from "./sprite-postprocess";
import { encodeGif, type AnimationResult, type Raw } from "./animation";

export type RigKind = "breathe" | "float";

export interface RigOptions {
  kind: RigKind;
  pixel: boolean;
  /** Frames in the loop (default 24 — one breath at 12 fps = 2 s). */
  frames?: number;
  /** Output frame height (default 256). */
  frameSize?: number;
}

export async function makeRigAnimation(sprite: Buffer, opts: RigOptions): Promise<AnimationResult> {
  const n = opts.frames ?? 24;
  const frameSize = opts.frameSize ?? 256;
  let src = await loadSprite(sprite);
  let factor = 1;
  if (opts.pixel) {
    factor = nativeFactor(src);
    if (factor > 1) src = downsample(src, factor);
  }
  const b = bounds(src);
  if (!b) throw new Error("Sprite is empty");
  const bodyH = b.y1 - b.y0 + 1, bodyW = b.x1 - b.x0 + 1;

  // Motion amplitudes (in source pixels). Pixel art moves at least 1 art pixel.
  // Kept small: a big stretch reads as the body being pulled up, not breathing
  const breath = Math.max(opts.pixel ? 1 : 0, bodyH * 0.011);
  const bob = Math.max(opts.pixel ? 2 : 0, bodyH * 0.045);
  const sway = bodyW * 0.01;

  // Canvas with room for the motion: above the head and to the sides
  const padTop = Math.ceil((opts.kind === "float" ? bob : breath * 1.5) + 2);
  const padX = Math.ceil(sway * 2 + 2 + bodyW * 0.03);
  const padBottom = opts.kind === "float" ? Math.ceil(bob + 1) : 1;
  const W = bodyW + padX * 2, H = bodyH + padTop + padBottom;
  // Where the body sits on the canvas (feet on the bottom row for breathe)
  const ox = padX - b.x0, oy = padTop - b.y0;
  const feetY = padTop + bodyH - 1;
  const cx = padX + bodyW / 2;

  const frames: Raw[] = [];
  for (let f = 0; f < n; f++) {
    const ph = (2 * Math.PI * f) / n;
    const s = Math.sin(ph);
    const lag = Math.sin(ph - 0.7);
    const sw = Math.sin(ph + 0.9);
    const out: Raw = { data: Buffer.alloc(W * H * 4), width: W, height: H };
    for (let y = 0; y < H; y++) {
      // u: 0 at the feet, 1 at the top of the head
      const u = Math.min(1, Math.max(0, (feetY - y) / bodyH));
      let dy: number, widen: number;
      if (opts.kind === "float") {
        dy = bob * s;
        widen = 0;
      } else {
        // Legs stay put; the torso stretches; the head rides on top, a beat late
        dy = breath * s * smoothstep(0.22, 0.62, u) + breath * 0.35 * lag * smoothstep(0.7, 0.92, u);
        widen = 0.012 * s * bump(u, 0.58, 0.2);
      }
      const shear = sway * sw * u * u;
      for (let x = 0; x < W; x++) {
        // Inverse mapping: which source pixel lands here
        const sx = cx + (x - cx - shear) / (1 + widen) - ox;
        const sy = y + dy - oy;
        const i = (y * W + x) * 4;
        if (opts.pixel) samplePixel(src, sx, sy, out.data, i);
        else sampleBilinear(src, sx, sy, out.data, i);
      }
    }
    frames.push(out);
  }

  // Scale to the output height: whole-number scale for pixel art
  let outW: number, outH: number;
  if (opts.pixel) {
    const k = Math.max(1, Math.round((frameSize * Math.max(1, factor)) / Math.max(H * factor, 1)));
    outW = W * k; outH = H * k;
  } else {
    outH = frameSize;
    outW = Math.max(1, Math.round((W * frameSize) / H));
  }
  const pngs = await Promise.all(frames.map((f) =>
    sharp(f.data, { raw: { width: f.width, height: f.height, channels: 4 } })
      .resize(outW, outH, { kernel: opts.pixel ? "nearest" : "lanczos3", fit: "fill" })
      .png()
      .toBuffer()
  ));
  const sheetPng = await sharp({ create: { width: outW * n, height: outH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(pngs.map((input, i) => ({ input, left: i * outW, top: 0 })))
    .png({ compressionLevel: 9 })
    .toBuffer();
  return { sheetPng, gif: await encodeGif(pngs, 12), frameCount: n, frameWidth: outW, frameHeight: outH, frames: pngs };
}

// ---------------------------------------------------------------------------

const MAX_SIDE = 1024;

export async function loadSprite(buf: Buffer): Promise<Raw> {
  // Generated sprites are 1024px; cap anything bigger so a large upload can't
  // blow up memory (every frame below is a full-size RGBA copy)
  const { data, info } = await sharp(buf)
    .resize(MAX_SIDE, MAX_SIDE, { fit: "inside", withoutEnlargement: true, kernel: "nearest" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw: Raw = { data, width: info.width, height: info.height };
  // Sprites are stored transparent; older ones may sit on white
  let opaqueBorder = 0, border = 0;
  for (let x = 0; x < raw.width; x++) for (const y of [0, raw.height - 1]) { border++; if (data[(y * raw.width + x) * 4 + 3] > 200) opaqueBorder++; }
  if (opaqueBorder > border * 0.5) keySpriteBackground(raw, { tolerance: 32, fringePasses: 1 });
  return raw;
}

/** Size of one art pixel in an upscaled pixel-art image (1 when not exact). */
export function nativeFactor(raw: Raw): number {
  for (const f of [16, 12, 10, 8, 6, 5, 4, 3, 2]) {
    if (raw.width % f || raw.height % f) continue;
    let same = 0, total = 0;
    for (let y = 0; y < raw.height; y += 3) {
      for (let x = 0; x < raw.width; x += 3) {
        const bx = x - (x % f) + Math.floor(f / 2), by = y - (y % f) + Math.floor(f / 2);
        const a = (y * raw.width + x) * 4, c = (by * raw.width + bx) * 4;
        total++;
        if (Math.abs(raw.data[a] - raw.data[c]) + Math.abs(raw.data[a + 1] - raw.data[c + 1]) + Math.abs(raw.data[a + 2] - raw.data[c + 2]) + Math.abs(raw.data[a + 3] - raw.data[c + 3]) < 12) same++;
      }
    }
    if (same / total > 0.985) return f;
  }
  return 1;
}

export function downsample(raw: Raw, f: number): Raw {
  const w = raw.width / f, h = raw.height / f;
  const out: Raw = { data: Buffer.alloc(w * h * 4), width: w, height: h };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((y * f + Math.floor(f / 2)) * raw.width + x * f + Math.floor(f / 2)) * 4;
      raw.data.copy(out.data, (y * w + x) * 4, s, s + 4);
    }
  }
  return out;
}

export function bounds(raw: Raw) {
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++) {
    for (let x = 0; x < raw.width; x++) {
      if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) {
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

export function samplePixel(src: Raw, x: number, y: number, out: Buffer, i: number) {
  const sx = Math.round(x - 0.5), sy = Math.round(y - 0.5);
  if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) return;
  src.data.copy(out, i, (sy * src.width + sx) * 4, (sy * src.width + sx) * 4 + 4);
}

/** Bilinear on premultiplied colour so transparent edges don't darken. */
export function sampleBilinear(src: Raw, x: number, y: number, out: Buffer, i: number) {
  const fx = x - 0.5, fy = y - 0.5;
  const x0 = Math.floor(fx), y0 = Math.floor(fy);
  const tx = fx - x0, ty = fy - y0;
  let r = 0, g = 0, b = 0, a = 0;
  for (let k = 0; k < 4; k++) {
    const px = x0 + (k & 1), py = y0 + (k >> 1);
    if (px < 0 || py < 0 || px >= src.width || py >= src.height) continue;
    const w = (k & 1 ? tx : 1 - tx) * (k >> 1 ? ty : 1 - ty);
    const j = (py * src.width + px) * 4;
    const al = src.data[j + 3] / 255;
    r += src.data[j] * al * w; g += src.data[j + 1] * al * w; b += src.data[j + 2] * al * w; a += al * w;
  }
  if (a <= 0.004) return;
  out[i] = Math.round(r / a); out[i + 1] = Math.round(g / a); out[i + 2] = Math.round(b / a);
  out[i + 3] = Math.round(a * 255);
}

function smoothstep(e0: number, e1: number, x: number) {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

function bump(x: number, center: number, width: number) {
  const d = (x - center) / width;
  return Math.exp(-d * d * 2);
}
