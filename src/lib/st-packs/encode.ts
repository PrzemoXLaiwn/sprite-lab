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
  lossless: boolean;
  frames: number;
  fps: number;
}

/**
 * Animated WebP, loop forever, one delay per frame. One encode: HQ lossy
 * (quality 90, full alpha, effort 4) or lossless. The size cap is a QA flag,
 * not a second pass.
 */
export async function encodeAnimatedWebp(
  frames: Frame[],
  fps: number,
  opts: { quality?: number; alphaQuality?: number; effort?: number; lossless?: boolean } = {},
): Promise<WebpResult> {
  if (frames.length === 0) throw new Error("No frames to encode");
  const width = frames[0].width;
  const height = frames[0].height;
  for (const frame of frames) {
    if (frame.width !== width || frame.height !== height) throw new Error("Frames differ in size");
  }
  const lossless = opts.lossless === true;
  const quality = opts.quality ?? ST_PIPELINE.webpQuality;
  const alphaQuality = opts.alphaQuality ?? ST_PIPELINE.webpAlphaQuality;
  const effort = opts.effort ?? ST_PIPELINE.webpEffort;
  const delay = Array(frames.length).fill(Math.round(1000 / fps));
  // One raw buffer, not a PNG per frame. Two posts share this isolate, so
  // libvips does not also fan out across every core.
  const threads = sharp.concurrency();
  if (threads > 2) sharp.concurrency(2);
  let webp: Buffer;
  try {
    const joined = frames.length === 1 ? frames[0].data : Buffer.concat(frames.map((frame) => frame.data));
    webp = await sharp(joined, {
      raw: { width, height: height * frames.length, channels: 4, pageHeight: height },
    }).webp(lossless
      ? { lossless: true, effort, loop: 0, delay }
      : { quality, alphaQuality, effort, loop: 0, delay })
      .toBuffer();
  } finally {
    if (threads > 2) sharp.concurrency(threads);
  }
  return {
    webp, bytes: webp.length, frames: frames.length, fps, lossless,
    quality: lossless ? 100 : quality,
    alphaQuality: lossless ? 100 : alphaQuality,
  };
}

/** The one fallback when the HQ encode is over the cap: still sharp at 720 px, about a third smaller. */
export const WEBP_FALLBACK = { quality: 80, alphaQuality: 90 } as const;

/**
 * HQ encode; when it is over `maxBytes` (a 6 s expressive clip often is),
 * one more encode at WEBP_FALLBACK instead of shipping a flagged file. Only
 * the smaller result is kept, and lossless is never re-encoded.
 */
export async function encodeWithinCap(
  frames: Frame[], fps: number, maxBytes: number, opts: { lossless?: boolean } = {},
): Promise<WebpResult & { reencoded: boolean }> {
  const first = await encodeAnimatedWebp(frames, fps, { lossless: opts.lossless });
  if (first.lossless || first.bytes <= maxBytes) return { ...first, reencoded: false };
  const second = await encodeAnimatedWebp(frames, fps, WEBP_FALLBACK);
  return second.bytes < first.bytes ? { ...second, reencoded: true } : { ...first, reencoded: false };
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
