/**
 * Sprite quality benchmark — compares image models + post-processing on a
 * fixed set of prompts and writes a contact sheet per subject.
 *
 *   npx tsx --env-file=.env.local scripts/sprite-bench.ts <outDir> [modelAIR ...]
 *
 * Calls Runware directly (costs a few cents per image). Touches no database.
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { buildUltimatePrompt } from "../src/config/prompts/prompt-builder";
import { pixelateImage } from "../src/lib/image/pixelate";
import { postprocessSprite } from "../src/lib/image/sprite-postprocess";
import { buildSpritePrompt } from "../src/config/prompts/sprite-prompt";

const OUT = process.argv[2] || "bench-out";
const MODELS = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ["runware:400@2", "google:4@3", "bytedance:seedream@5.0-lite", "openai:1@2"];

const SUBJECTS = [
  { key: "knight", prompt: "a knight with a sword and shield", category: "CHARACTERS", sub: "HEROES" },
  { key: "sword", prompt: "a flaming fire sword", category: "WEAPONS", sub: "SWORDS" },
  { key: "slime", prompt: "a green slime monster", category: "CREATURES", sub: "MONSTERS" },
  { key: "potion", prompt: "a red health potion bottle", category: "CONSUMABLES", sub: "POTIONS" },
];

async function runware(task: Record<string, unknown>) {
  const res = await fetch("https://api.runware.ai/v1", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.RUNWARE_API_KEY}` },
    body: JSON.stringify([{ taskType: "imageInference", taskUUID: randomUUID(), outputType: "URL", outputFormat: "PNG", includeCost: true, numberResults: 1, ...task }]),
  });
  const json = await res.json();
  if (json.errors?.length) throw new Error(JSON.stringify(json.errors[0]).slice(0, 300));
  const item = json.data[0];
  const img = Buffer.from(await (await fetch(item.imageURL)).arrayBuffer());
  return { img, cost: item.cost as number | undefined };
}

async function label(text: string, w: number) {
  const svg = `<svg width="${w}" height="40" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#111"/><text x="8" y="27" font-family="Arial" font-size="20" fill="#fff">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function onChecker(png: Buffer, size: number) {
  const tile = 16;
  let rects = "";
  for (let y = 0; y < size / tile; y++) for (let x = 0; x < size / tile; x++) if ((x + y) % 2) rects += `<rect x="${x * tile}" y="${y * tile}" width="${tile}" height="${tile}" fill="#cfcfcf"/>`;
  const bg = await sharp(Buffer.from(`<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#fff"/>${rects}</svg>`)).png().toBuffer();
  const fg = await sharp(png).resize(size, size, { fit: "contain", kernel: "nearest", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  return sharp(bg).composite([{ input: fg }]).png().toBuffer();
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const CELL = 320;
  let totalCost = 0;

  for (const s of SUBJECTS) {
    const cells: { title: string; img: Buffer }[] = [];

    // Baseline: what production did (FLUX.1 schnell + old prompt + nearest pixelate)
    try {
      const old = buildUltimatePrompt(s.prompt, s.category, s.sub, "PIXEL_ART_16");
      const { img, cost } = await runware({ model: "runware:100@1", positivePrompt: old.prompt.slice(0, 2900), negativePrompt: old.negativePrompt?.slice(0, 1900), width: 1024, height: 1024, steps: 4 });
      totalCost += cost ?? 0;
      writeFileSync(join(OUT, `${s.key}_baseline_raw.png`), img);
      const px = await pixelateImage(img, { gridSize: 96 as never, outputSize: 1024 });
      cells.push({ title: "OLD raw (schnell)", img: await onChecker(img, CELL) });
      cells.push({ title: "OLD pipeline", img: await onChecker(px, CELL) });
    } catch (e) {
      console.log(`[${s.key}] baseline failed:`, (e as Error).message);
    }

    for (const model of MODELS) {
      try {
        const prompt = buildSpritePrompt({ subject: s.prompt, styleId: "PIXEL_ART_16", categoryId: s.category });
        const { img, cost } = await runware({ model, positivePrompt: prompt, width: 1024, height: 1024 });
        totalCost += cost ?? 0;
        const safe = model.replace(/[:@/]/g, "_");
        writeFileSync(join(OUT, `${s.key}_${safe}_raw.png`), img);
        const out = await postprocessSprite(img, { pixelGrid: 64, paletteSize: 24 });
        writeFileSync(join(OUT, `${s.key}_${safe}_sprite.png`), out.png);
        if (out.nativePng) writeFileSync(join(OUT, `${s.key}_${safe}_native.png`), out.nativePng);
        console.log(`[${s.key}] ${model}: cost=$${cost ?? "?"} bg=${out.backgroundRemoved} colors=${out.colors}`);
        cells.push({ title: `${model} raw`, img: await onChecker(img, CELL) });
        cells.push({ title: `${model} NEW`, img: await onChecker(out.png, CELL) });
      } catch (e) {
        console.log(`[${s.key}] ${model} failed:`, (e as Error).message);
      }
    }

    // Contact sheet: 2 columns per model (raw | processed), wrapped 4 per row
    const perRow = 4;
    const rows = Math.ceil(cells.length / perRow);
    const composites: sharp.OverlayOptions[] = [];
    for (let i = 0; i < cells.length; i++) {
      const x = (i % perRow) * CELL;
      const y = Math.floor(i / perRow) * (CELL + 40);
      composites.push({ input: await label(cells[i].title, CELL), left: x, top: y });
      composites.push({ input: cells[i].img, left: x, top: y + 40 });
    }
    await sharp({ create: { width: perRow * CELL, height: rows * (CELL + 40), channels: 4, background: "#222" } })
      .composite(composites)
      .png()
      .toFile(join(OUT, `sheet_${s.key}.png`));
  }
  console.log(`Total provider cost: $${totalCost.toFixed(4)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
