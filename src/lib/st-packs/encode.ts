// =============================================================================
// ST Packs — encoders: animated WebP (the pack format), GIF fallback, stills
// and the shareable preview grid
// =============================================================================
import sharp from "sharp";
import { ST_PIPELINE } from "@/config/st-packs";
import { encodeGif } from "@/lib/image/animation";
import { framePng } from "./frames";
import type { Frame } from "./types";

export interface WebpResult {
  webp: Buffer;
  bytes: number;
  quality: number;
  alphaQuality: number;
  frames: number;
  fps: number;
}

export type WebpLadderStep = { quality: number; alphaQuality: number };

/**
 * Animated WebP, loop forever, one delay per frame. Walks the quality ladder
 * until the file fits `targetBytes`; the last rung is used even if it doesn't
 * (the QA step flags anything over the hard cap).
 */
export async function encodeAnimatedWebp(
  frames: Frame[],
  fps: number,
  opts: { ladder?: readonly WebpLadderStep[]; targetBytes?: number; effort?: number } = {},
): Promise<WebpResult> {
  if (frames.length === 0) throw new Error("No frames to encode");
  const ladder = opts.ladder ?? ST_PIPELINE.webpLadder;
  const target = opts.targetBytes ?? ST_PIPELINE.webpTargetBytes;
  const effort = opts.effort ?? ST_PIPELINE.webpEffort;
  const delay = Array(frames.length).fill(Math.round(1000 / fps));
  const pngs = await Promise.all(frames.map(framePng));
  let last: WebpResult | null = null;
  for (const step of ladder) {
    const webp = await sharp(pngs.length === 1 ? pngs[0] : pngs, pngs.length === 1 ? {} : { join: { animated: true } })
      .webp({ quality: step.quality, alphaQuality: step.alphaQuality, effort, loop: 0, delay })
      .toBuffer();
    last = { webp, bytes: webp.length, quality: step.quality, alphaQuality: step.alphaQuality, frames: frames.length, fps };
    if (webp.length <= target) break;
  }
  return last!;
}

/** Page count, loop and per-frame delay of an animated WebP (for tests and QA). */
export async function readAnimatedWebp(webp: Buffer): Promise<{ pages: number; loop: number; delay: number[]; width: number; height: number }> {
  const m = await sharp(webp, { animated: true }).metadata();
  return { pages: m.pages ?? 1, loop: m.loop ?? 0, delay: m.delay ?? [], width: m.width ?? 0, height: (m.pageHeight ?? m.height) ?? 0 };
}

export async function encodeGifFallback(frames: Frame[], fps: number): Promise<Buffer> {
  const pngs = await Promise.all(frames.map(framePng));
  return encodeGif(pngs, fps);
}

export async function stillPng(frame: Frame): Promise<Buffer> {
  return framePng(frame);
}

const GRID_BG = "#0f1220";

/**
 * 4×2 preview grid GIF of up to eight expressions, label under each tile,
 * length = the shortest loop. Tiles are scaled to `tileWidth` wide.
 */
export async function encodePreviewGrid(
  items: Array<{ label: string; frames: Frame[] }>,
  fps: number,
  tileWidth = 180,
): Promise<Buffer> {
  const picked = items.slice(0, 8).filter((i) => i.frames.length > 0);
  if (picked.length === 0) throw new Error("No expressions for the preview grid");
  const ratio = picked[0].frames[0].height / picked[0].frames[0].width;
  const tileH = Math.round(tileWidth * ratio);
  const labelH = 26;
  const cols = Math.min(4, picked.length);
  const rows = Math.ceil(picked.length / cols);
  const W = cols * tileWidth, H = rows * (tileH + labelH);
  const length = Math.min(...picked.map((i) => i.frames.length));
  const labelSvg = (text: string) => Buffer.from(
    `<svg width="${tileWidth}" height="${labelH}"><text x="${tileWidth / 2}" y="18" text-anchor="middle" font-family="sans-serif" font-size="13" fill="#C8CCE8">${text}</text></svg>`,
  );
  const pngs: Buffer[] = [];
  for (let f = 0; f < length; f++) {
    const layers: sharp.OverlayOptions[] = [];
    for (let i = 0; i < picked.length; i++) {
      const fr = picked[i].frames[f];
      const tile = await sharp(fr.data, { raw: { width: fr.width, height: fr.height, channels: 4 } })
        .resize(tileWidth, tileH, { kernel: "lanczos3" }).png().toBuffer();
      const left = (i % cols) * tileWidth, top = Math.floor(i / cols) * (tileH + labelH);
      layers.push({ input: tile, left, top });
      layers.push({ input: labelSvg(picked[i].label), left, top: top + tileH });
    }
    pngs.push(await sharp({ create: { width: W, height: H, channels: 4, background: GRID_BG } }).composite(layers).png().toBuffer());
  }
  return encodeGif(pngs, fps, GRID_BG);
}
