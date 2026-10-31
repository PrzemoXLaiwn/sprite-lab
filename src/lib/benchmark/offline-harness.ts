// Offline benchmark: production post-process vs the flag-gated normaliser,
// on synthetic images, through the real postprocessSprite / buildAnimation
// functions. Does not call a provider.

import sharp from "sharp";
import { buildAnimation } from "@/lib/image/animation";
import {
  baselineSpread,
  contentHeights,
  decodePng,
  FRAME_NORMALIZE_FLAG,
  isolatedOpaqueCount,
  lightHaloCount,
  populationStd,
  uniqueColorCount,
  type Rgba,
} from "@/lib/image/frame-normalize";
import { postprocessSprite } from "@/lib/image/sprite-postprocess";
import { diffPrompts, type PromptDiff } from "./prompt-variants";
import { syntheticAnimGridPng, syntheticSpritePng } from "./fixtures";

export interface ImageMetrics {
  variant: "production" | "frame-normalize";
  pipeline: "sprite" | "animation";
  width: number;
  height: number;
  frames: number;
  haloPixels: number;
  isolatedPixels: number;
  uniqueColors: number;
  heightStd: number;
  baselineSpread: number;
  greenPixels: number;
  sameCanvas: boolean;
}

export interface OfflineBenchmark {
  measuredAt: string;
  liveProviderCalls: 0;
  spendUsd: 0;
  note: string;
  prompts: PromptDiff[];
  rows: ImageMetrics[];
  contactSheet: Buffer;
}

async function withFlag<T>(on: boolean, fn: () => Promise<T>): Promise<T> {
  const prev = process.env[FRAME_NORMALIZE_FLAG];
  if (on) process.env[FRAME_NORMALIZE_FLAG] = "1";
  else delete process.env[FRAME_NORMALIZE_FLAG];
  try {
    return await fn();
  } finally {
    if (prev === undefined) delete process.env[FRAME_NORMALIZE_FLAG];
    else process.env[FRAME_NORMALIZE_FLAG] = prev;
  }
}

function greenPixels(raw: Rgba): number {
  let n = 0;
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3] < 128) continue;
    if (raw.data[i + 1] > 150 && raw.data[i] < 80 && raw.data[i + 2] < 80) n++;
  }
  return n;
}

async function metricsOf(variant: ImageMetrics["variant"], pipeline: ImageMetrics["pipeline"], pngs: Buffer[]): Promise<ImageMetrics> {
  const raws = await Promise.all(pngs.map(decodePng));
  const heights = contentHeights(raws);
  return {
    variant,
    pipeline,
    width: raws[0]?.width ?? 0,
    height: raws[0]?.height ?? 0,
    frames: raws.length,
    haloPixels: raws.reduce((a, r) => a + lightHaloCount(r), 0),
    isolatedPixels: raws.reduce((a, r) => a + isolatedOpaqueCount(r), 0),
    uniqueColors: uniqueColorCount(raws),
    heightStd: populationStd(heights),
    baselineSpread: baselineSpread(raws),
    greenPixels: raws.reduce((a, r) => a + greenPixels(r), 0),
    sameCanvas: raws.every((r) => r.width === raws[0].width && r.height === raws[0].height),
  };
}

async function spritePair(input: Buffer): Promise<{ production: Buffer; normalized: Buffer; rows: ImageMetrics[] }> {
  const production = await withFlag(false, () => postprocessSprite(input, { outputSize: 256 }));
  const normalized = await withFlag(true, () => postprocessSprite(input, { outputSize: 256 }));
  return {
    production: production.png,
    normalized: normalized.png,
    rows: [
      await metricsOf("production", "sprite", [production.png]),
      await metricsOf("frame-normalize", "sprite", [normalized.png]),
    ],
  };
}

async function animPair(grid: Buffer): Promise<{ production: Buffer[]; normalized: Buffer[]; rows: ImageMetrics[] }> {
  const run = () => buildAnimation(grid, { cols: 2, rows: 2, pixel: true, frameSize: 128, anchor: "ground" });
  const production = await withFlag(false, run);
  const normalized = await withFlag(true, run);
  return {
    production: production.frames,
    normalized: normalized.frames,
    rows: [
      await metricsOf("production", "animation", production.frames),
      await metricsOf("frame-normalize", "animation", normalized.frames),
    ],
  };
}

async function cell(png: Buffer, size: number): Promise<Buffer> {
  const tile = 16;
  let rects = "";
  for (let y = 0; y < size / tile; y++) {
    for (let x = 0; x < size / tile; x++) {
      if ((x + y) % 2) rects += `<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="#c8c8c8"/>`;
    }
  }
  const bg = await sharp(Buffer.from(
    `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ffffff"/>${rects}</svg>`,
  )).png().toBuffer();
  const fg = await sharp(png).resize(size, size, { fit: "contain", kernel: "nearest", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(bg).composite([{ input: fg }]).png().toBuffer();
}

async function label(text: string, w: number): Promise<Buffer> {
  const svg = `<svg width="${w}" height="28" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#131A31"/><text x="8" y="19" font-family="Arial" font-size="14" fill="#FFF1E8">${text}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function contactSheet(sprite: { production: Buffer; normalized: Buffer }, anim: { production: Buffer[]; normalized: Buffer[] }): Promise<Buffer> {
  const size = 160;
  const spriteRow = await Promise.all([sprite.production, sprite.normalized].map((p) => cell(p, size)));
  const animProd = await Promise.all(anim.production.map((p) => cell(p, size)));
  const animNorm = await Promise.all(anim.normalized.map((p) => cell(p, size)));
  const rowW = size * 4;
  const pieces: { img: Buffer; h: number }[] = [
    { img: await label("sprite production (flag off)", rowW), h: 28 },
    { img: await strip([spriteRow[0], spriteRow[0], spriteRow[0], spriteRow[0]], size), h: size },
    { img: await label("sprite frame-normalize (flag on)", rowW), h: 28 },
    { img: await strip([spriteRow[1], spriteRow[1], spriteRow[1], spriteRow[1]], size), h: size },
    { img: await label("animation 4 frames production (flag off)", rowW), h: 28 },
    { img: await strip(animProd, size), h: size },
    { img: await label("animation 4 frames frame-normalize (flag on)", rowW), h: 28 },
    { img: await strip(animNorm, size), h: size },
  ];
  const height = pieces.reduce((a, p) => a + p.h, 0);
  let top = 0;
  const composites = pieces.map((p) => {
    const entry = { input: p.img, top, left: 0 };
    top += p.h;
    return entry;
  });
  return sharp({
    create: { width: rowW, height, channels: 4, background: "#131A31" },
  }).composite(composites).png().toBuffer();
}

async function strip(frames: Buffer[], size: number): Promise<Buffer> {
  const padded = frames.slice(0, 4);
  while (padded.length < 4) padded.push(padded[padded.length - 1] ?? Buffer.alloc(0));
  return sharp({
    create: { width: size * 4, height: size, channels: 4, background: "#131A31" },
  }).composite(padded.map((input, i) => ({ input, left: i * size, top: 0 }))).png().toBuffer();
}

export async function runOfflineBenchmark(): Promise<OfflineBenchmark> {
  const spriteInput = await syntheticSpritePng();
  const grid = await syntheticAnimGridPng();
  const sprite = await spritePair(spriteInput);
  const anim = await animPair(grid);
  return {
    measuredAt: new Date().toISOString(),
    liveProviderCalls: 0,
    spendUsd: 0,
    note: "Synthetic fixtures through postprocessSprite and buildAnimation. No Runware, Cloudflare, Replicate or Claude calls.",
    prompts: diffPrompts({
      subject: "a knight with a sword",
      original: "a knight with a sword",
      styleId: "PIXEL_ART_16",
      categoryId: "CHARACTERS",
      pose: "auto",
    }),
    rows: [...sprite.rows, ...anim.rows],
    contactSheet: await contactSheet(sprite, anim),
  };
}
