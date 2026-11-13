// Fixed-set pipeline benchmark for sprite / animation quality.
// Synthetic stand-ins for the prompt set (no provider calls): each fixture is
// what the image model typically hands back — a subject on white, a pale rim,
// and, for sheets, frames that are not on the same pixel.
//
//   npx tsx scripts/quality-benchmark.ts docs/quality-benchmark/before
//
// Writes <out>/metrics.json plus <id>-input.png and <id>-output.png.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { assembleAnimation, extractFrames } from "../src/lib/image/animation";
import { assessMatte, type RgbaImage } from "../src/lib/image/matte-qa";
import { postprocessSprite, postprocessTile } from "../src/lib/image/sprite-postprocess";

type RGB = [number, number, number];

const PROMPTS = [
  { id: "character-knight", kind: "sheet" as const, prompt: "side-view knight in a blue cloak, pixel art, walk cycle" },
  { id: "character-slime", kind: "sprite" as const, prompt: "a small green slime creature, pixel art, front view" },
  { id: "item-potion", kind: "sprite" as const, prompt: "a red health potion in a glass bottle, pixel art item" },
  { id: "item-sword", kind: "sprite" as const, prompt: "a steel longsword, pixel art, diagonal" },
  { id: "tile-stone", kind: "tile" as const, prompt: "seamless grey stone dungeon floor tile, pixel art" },
  { id: "tile-water", kind: "tile" as const, prompt: "seamless blue water tile, pixel art" },
  { id: "effect-fireball", kind: "sprite" as const, prompt: "a round fireball spell effect, pixel art" },
  { id: "effect-slash", kind: "sheet" as const, prompt: "a four-frame sword slash effect, pixel art" },
];

function blank(w: number, h: number, c: RGB = [255, 255, 255]): Buffer {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = c[0]; data[i * 4 + 1] = c[1]; data[i * 4 + 2] = c[2]; data[i * 4 + 3] = 255;
  }
  return data;
}

function paint(data: Buffer, w: number, x: number, y: number, c: RGB, a = 255) {
  if (x < 0 || y < 0) return;
  const i = (y * w + x) * 4;
  if (i < 0 || i + 3 >= data.length) return;
  data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = a;
}

/**
 * Dark body plus a 3px rim of rgb(228). That grey is outside the flood-fill
 * tolerance (32) and inside the fringe tolerance (64), so two fringe passes
 * peel two pixels and leave a 1px light edge — the halo on animation sheets,
 * which never ran the single-sprite matte repair.
 */
function body(data: Buffer, w: number, x0: number, y0: number, x1: number, y1: number, fill: RGB) {
  const rim: RGB = [228, 228, 228];
  for (let y = y0 - 3; y < y1 + 3; y++) {
    for (let x = x0 - 3; x < x1 + 3; x++) {
      const inside = x >= x0 && x < x1 && y >= y0 && y < y1;
      paint(data, w, x, y, inside ? fill : rim);
    }
  }
}

function sheetKnight(): Buffer {
  const w = 512, h = 256;
  const data = blank(w, h);
  const fills: RGB[] = [[32, 48, 120], [32, 48, 120], [36, 52, 124], [32, 48, 120]];
  for (let i = 0; i < 4; i++) {
    const ox = i * 128 + 28 + (i % 2) * 4; // 0 or 4px sideways drift
    const feet = i % 2 === 0 ? 0 : 10;
    body(data, w, ox, 40, ox + 48, 200, fills[i]);
    // feet step left / right under the cloak
    body(data, w, ox + feet, 190, ox + feet + 16, 210, [20, 24, 40]);
  }
  return data;
}

function sheetSlash(): Buffer {
  const w = 512, h = 256;
  const data = blank(w, h);
  for (let i = 0; i < 4; i++) {
    const ox = i * 128 + 36;
    const lean = i * 6;
    body(data, w, ox + lean, 30 + i * 4, ox + 20 + lean, 210, [220, 170, 40]);
  }
  return data;
}

function spriteOf(fill: RGB, w = 256, h = 256): Buffer {
  const data = blank(w, h);
  body(data, w, 70, 40, 180, 210, fill);
  return data;
}

function tileOf(a: RGB, b: RGB): Buffer {
  const n = 256;
  const data = blank(n, n, a);
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (((x >> 4) + (y >> 4)) % 2 === 0) paint(data, n, x, y, b);
  }
  return data;
}

async function png(data: Buffer, w: number, h: number): Promise<Buffer> {
  return sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
}

async function rawOf(buf: Buffer): Promise<RgbaImage> {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

function centroid(raw: RgbaImage): { x: number; y: number; boxDx: number; boxDy: number } | null {
  let sx = 0, sy = 0, n = 0;
  let x0 = raw.width, y0 = raw.height, x1 = -1, y1 = -1;
  for (let y = 0; y < raw.height; y++) for (let x = 0; x < raw.width; x++) {
    if (raw.data[(y * raw.width + x) * 4 + 3] < 128) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    // Upper body only — feet are supposed to step.
    if (y > raw.height * 0.55) continue;
    sx += x; sy += y; n++;
  }
  if (!n) return null;
  return { x: sx / n, y: sy / n, boxDx: ((x0 + x1) / 2) - raw.width / 2, boxDy: ((y0 + y1) / 2) - raw.height / 2 };
}

function semiAlphaRatio(raw: RgbaImage): number {
  let semi = 0, seen = 0;
  for (let i = 3; i < raw.data.length; i += 4) {
    const a = raw.data[i];
    if (a === 0) continue;
    seen++;
    if (a < 255) semi++;
  }
  return seen ? semi / seen : 0;
}

/** Pad with transparency so a tight crop's border counts as an edge. */
async function paddedMatte(frame: { data: Buffer; width: number; height: number }) {
  const pad = 2;
  const w = frame.width + pad * 2;
  const h = frame.height + pad * 2;
  const data = Buffer.alloc(w * h * 4);
  for (let y = 0; y < frame.height; y++) {
    frame.data.copy(data, ((y + pad) * w + pad) * 4, y * frame.width * 4, (y + 1) * frame.width * 4);
  }
  return assessMatte({ data, width: w, height: h });
}

async function metricsFor(output: Buffer, frames?: Buffer[]) {
  const raw = await rawOf(output);
  const matte = assessMatte(raw);
  const c = centroid(raw);
  let jitterPx: number | null = null;
  let bboxDriftPx: number | null = null;
  if (frames && frames.length > 1) {
    const cs = (await Promise.all(frames.map(rawOf))).map(centroid).filter((v): v is NonNullable<ReturnType<typeof centroid>> => !!v);
    const xs = cs.map((p) => p.x);
    jitterPx = Math.max(...xs) - Math.min(...xs);
    const boxes = cs.map((p) => p.boxDx);
    bboxDriftPx = Math.max(...boxes) - Math.min(...boxes);
  }
  return {
    halo: matte.halo,
    lightEdgeRatio: round(matte.lightEdgeRatio),
    bboxOffsetPx: c ? round(Math.hypot(c.boxDx, c.boxDy)) : null,
    jitterPx: jitterPx === null ? null : round(jitterPx),
    bboxDriftPx: bboxDriftPx === null ? null : round(bboxDriftPx),
    semiAlpha: round(semiAlphaRatio(raw)),
    width: raw.width,
    height: raw.height,
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

async function main() {
  const out = process.argv[2] ?? "docs/quality-benchmark/out";
  await mkdir(out, { recursive: true });
  const rows: unknown[] = [];

  for (const spec of PROMPTS) {
    if (spec.kind === "sheet") {
      const src = spec.id === "character-knight" ? sheetKnight() : sheetSlash();
      const input = await png(src, 512, 256);
      const frames = await extractFrames(input, 4, 1);
      // Painted assembly keeps a light rim visible. Pixel assembly quantises it
      // away, so the halo number is the painted one and the pixel number is the grid.
      const painted = await assembleAnimation(frames, { pixel: false, frameSize: 128, anchor: "ground" });
      const pixel = await assembleAnimation(frames, { pixel: true, frameSize: 128, anchor: "ground" });
      await writeFile(path.join(out, `${spec.id}-input.png`), input);
      await writeFile(path.join(out, `${spec.id}-extracted.png`), await sharp(frames[0].data, {
        raw: { width: frames[0].width, height: frames[0].height, channels: 4 },
      }).resize(frames[0].width * 2, frames[0].height * 2, { kernel: "nearest" }).png().toBuffer());
      await writeFile(path.join(out, `${spec.id}-output.png`), painted.sheetPng);
      await writeFile(path.join(out, `${spec.id}-pixel.png`), pixel.sheetPng);
      const extracted = await paddedMatte(frames[0]);
      const m = await metricsFor(painted.frames[0], painted.frames);
      const pm = await metricsFor(pixel.frames[0], pixel.frames);
      rows.push({
        ...spec,
        frames: painted.frameCount,
        frameWidth: painted.frameWidth,
        frameHeight: painted.frameHeight,
        ...m,
        extractedHalo: extracted.halo,
        extractedLightEdgeRatio: round(extracted.lightEdgeRatio),
        pixelHalo: pm.halo,
        pixelLightEdgeRatio: pm.lightEdgeRatio,
        pixelJitterPx: pm.jitterPx,
        pixelFrame: [pixel.frameWidth, pixel.frameHeight],
      });
      continue;
    }
    if (spec.kind === "tile") {
      const src = spec.id === "tile-water"
        ? tileOf([20, 80, 160], [40, 120, 190])
        : tileOf([90, 90, 96], [70, 70, 76]);
      const input = await png(src, 256, 256);
      const tile = await postprocessTile(input, { pixelGrid: 32, paletteSize: 8, outputSize: 256 });
      await writeFile(path.join(out, `${spec.id}-input.png`), input);
      await writeFile(path.join(out, `${spec.id}-output.png`), tile.png);
      const raw = await rawOf(tile.png);
      const transparent = [...raw.data].filter((_, i) => i % 4 === 3 && raw.data[i] < 255).length;
      rows.push({ ...spec, width: raw.width, height: raw.height, transparentPixels: transparent, square: raw.width === raw.height });
      continue;
    }
    const fill: RGB = spec.id === "item-potion" ? [180, 32, 48]
      : spec.id === "item-sword" ? [180, 186, 196]
      : spec.id === "effect-fireball" ? [220, 90, 20]
      : [40, 160, 70];
    const src = spriteOf(fill);
    const input = await png(src, 256, 256);
    const sprite = await postprocessSprite(input, { pixelGrid: 64, paletteSize: 16, outputSize: 256 });
    await writeFile(path.join(out, `${spec.id}-input.png`), input);
    await writeFile(path.join(out, `${spec.id}-output.png`), sprite.png);
    rows.push({ ...spec, backgroundRemoved: sprite.backgroundRemoved, colors: sprite.colors, ...(await metricsFor(sprite.png)) });
  }

  await writeFile(path.join(out, "metrics.json"), JSON.stringify(rows, null, 2));
  console.log(`wrote ${rows.length} cases to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
