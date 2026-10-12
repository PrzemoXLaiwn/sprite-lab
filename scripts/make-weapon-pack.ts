// Builds the free "SpriteLab Weapon Pack" for itch.io using the site's own
// pipeline: a project in the owner's account, HD generations (credits are
// charged like any generation), auto-sort into folders, a few animations,
// then a ZIP laid out like the project pack export + cover + previews.
//   npx tsx scripts/make-weapon-pack.ts
// Output: Desktop\SpriteLab-Free-Weapon-Pack\ and ...\SpriteLab-Free-Weapon-Pack.zip

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import sharp from "sharp";
import JSZip from "jszip";
import { PrismaClient } from "@prisma/client";
import { generateAssets } from "../src/lib/services/generation";
import type { FolderLite } from "../src/lib/projects/auto-folder";
import { makeAnimation } from "../src/lib/services/animation-service";
import { uploadGenerationBufferToR2 } from "../src/lib/r2";
import { saveGeneration } from "../src/lib/db/generations";

const prisma = new PrismaClient();
const OWNER_ID = "470efe30-2701-4bb1-81ea-057c0d843928";
const STYLE = "PIXEL_ART_32";
const PACK = "SpriteLab Free Weapon Pack";
const OUT = join(homedir(), "Desktop", "SpriteLab-Free-Weapon-Pack");
const STATE = join(OUT, ".state.json"); // resume without regenerating

const WEAPONS: { sub: string; name: string; prompt: string }[] = [
  { sub: "SWORDS", name: "Iron Longsword", prompt: "iron longsword with a leather-wrapped grip and simple crossguard" },
  { sub: "SWORDS", name: "Flame Blade", prompt: "flaming longsword with a glowing orange blade wreathed in fire and a dark iron hilt" },
  { sub: "SWORDS", name: "Frost Sword", prompt: "frost sword with a pale blue crystal blade covered in ice and a silver hilt" },
  { sub: "SWORDS", name: "Knight Broadsword", prompt: "royal knight broadsword with a golden crossguard and a red gem in the pommel" },
  { sub: "SWORDS", name: "Rusty Dagger", prompt: "rusty iron dagger with a chipped blade and a wooden handle" },
  { sub: "SWORDS", name: "Shadow Katana", prompt: "black katana with a dark purple glowing edge and a wrapped handle" },
  { sub: "AXES", name: "Battle Axe", prompt: "double-headed steel battle axe with a long wooden haft" },
  { sub: "AXES", name: "War Hammer", prompt: "heavy dwarven war hammer with a square iron head and runes" },
  { sub: "AXES", name: "Spiked Mace", prompt: "spiked iron morningstar mace with a leather grip" },
  { sub: "POLEARMS", name: "Steel Spear", prompt: "steel spear with a leaf-shaped tip and a long wooden shaft" },
  { sub: "POLEARMS", name: "Golden Trident", prompt: "golden sea trident with three sharp prongs and a coral-blue shaft" },
  { sub: "SWORDS", name: "Steel Scimitar", prompt: "curved steel scimitar with a golden crossguard and a wrapped grip" },
  { sub: "BOWS", name: "Crossbow", prompt: "wooden and iron crossbow loaded with a bolt" },
  { sub: "STAFFS", name: "Fire Staff", prompt: "wooden wizard staff topped with a glowing red fire orb" },
  { sub: "STAFFS", name: "Ice Staff", prompt: "crystal ice staff with a floating pale blue shard at the top" },
  { sub: "STAFFS", name: "Nature Wand", prompt: "short wooden magic wand with green leaves and a glowing green gem" },
  { sub: "THROWING", name: "Throwing Knives", prompt: "set of three steel throwing knives with red handles" },
  { sub: "THROWING", name: "Shuriken", prompt: "four-pointed steel ninja shuriken star" },
];

const ANIMATIONS: { name: string; label: string; motion: string; anchor: "center" | "cell" | "air"; loop: boolean; frames: 4 | 6 }[] = [
  { name: "Flame Blade", label: "Flame Flicker", motion: "Flame Flicker: the fire along the blade flickers and licks upward, embers rise and fade; the sword itself stays still", anchor: "center", loop: true, frames: 6 },
  { name: "Battle Axe", label: "Swing", motion: "Swing: the axe rotates through a wide chopping arc from raised, to mid-swing with a motion trail, to struck down, to follow-through", anchor: "center", loop: false, frames: 6 },
  { name: "Fire Staff", label: "Power Up", motion: "Power Up: the fire orb glows brighter each frame, flames swirl around it and sparks rise, then it pulses", anchor: "center", loop: true, frames: 6 },
  { name: "Shuriken", label: "Spin", motion: "Spin: the shuriken spins a full 360 degrees in equal steps with a faint motion blur trail", anchor: "center", loop: true, frames: 4 },
];

type State = {
  projectId?: string;
  sprites: Record<string, { generationId: string; imageUrl: string; folder: string }>;
  animations: Record<string, { sheetUrl: string; gifUrl: string | null; frameWidth: number; frameHeight: number; frameCount: number }>;
};

function load(): State {
  if (existsSync(STATE)) return JSON.parse(readFileSync(STATE, "utf8"));
  return { sprites: {}, animations: {} };
}
function save(s: State) { writeFileSync(STATE, JSON.stringify(s, null, 2)); }
const slug = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const fetchBuf = async (u: string) => Buffer.from(await (await fetch(u)).arrayBuffer());

/** Largest integer factor the image was nearest-upscaled by (1 if none). */
async function nativeFactor(png: Buffer): Promise<{ factor: number; w: number; h: number }> {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let f = 16; f >= 2; f--) {
    if (info.width % f || info.height % f) continue;
    let ok = true;
    for (let y = 0; y < info.height && ok; y += 1) {
      const by = y - (y % f);
      for (let x = 0; x < info.width; x++) {
        const bx = x - (x % f);
        const i = (y * info.width + x) * 4, j = (by * info.width + bx) * 4;
        if (data[i] !== data[j] || data[i + 1] !== data[j + 1] || data[i + 2] !== data[j + 2] || data[i + 3] !== data[j + 3]) { ok = false; break; }
      }
    }
    if (ok) return { factor: f, w: info.width / f, h: info.height / f };
  }
  return { factor: 1, w: info.width, h: info.height };
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const state = load();

  // 1. Project in the owner's account
  if (!state.projectId) {
    const p = await prisma.project.create({
      data: { userId: OWNER_ID, name: PACK, gameType: "Any 2D game", artStyle: "Pixel HD", perspective: "Side view", notes: "Free asset pack for itch.io" },
    });
    state.projectId = p.id;
    save(state);
  }
  const projectId = state.projectId!;
  console.log("Project:", projectId);

  // 2. Generate (4 at a time), resumable
  const todo = WEAPONS.filter((w) => !state.sprites[w.name]);
  let cursor = 0;
  const worker = async () => {
    while (cursor < todo.length) {
      const w = todo[cursor++];
      try {
        const r = await generateAssets({
          userId: OWNER_ID, mode: "single", prompt: w.prompt, categoryId: "WEAPONS", subcategoryId: w.sub,
          styleId: STYLE, qualityPreset: process.env.PACK_QUALITY === "hd" ? "hd" : "normal", projectId,
        });
        const a = r.assets[0];
        state.sprites[w.name] = { generationId: a.generationId!, imageUrl: a.imageUrl, folder: "" };
        save(state);
        console.log("  generated", w.name);
      } catch (e) {
        console.log("  FAILED", w.name, e instanceof Error ? e.message : e);
      }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));

  // 3. Auto-sort into folders (same logic as the project "Auto-sort")
  const folders: FolderLite[] = await prisma.projectFolder.findMany({
    where: { projectId },
    select: { id: true, name: true, category: true, subcategory: true, description: true, suggestedAssets: true, sortOrder: true },
  });
  for (const w of WEAPONS) {
    const s = state.sprites[w.name];
    if (!s) continue;
    // One folder per weapon type reads best in a pack
    const name = { SWORDS: "Swords & Daggers", AXES: "Axes & Hammers", POLEARMS: "Polearms", BOWS: "Bows", STAFFS: "Staffs & Wands", THROWING: "Throwing" }[w.sub]!;
    let folder = folders.find((f) => f.name === name);
    if (!folder) {
      folder = await prisma.projectFolder.create({
        data: { projectId, name, category: "WEAPONS", subcategory: w.sub, description: "Created automatically when sorting sprites", sortOrder: folders.length + 1 },
        select: { id: true, name: true, category: true, subcategory: true, description: true, suggestedAssets: true, sortOrder: true },
      });
      folders.push(folder);
    }
    await prisma.generation.update({ where: { id: s.generationId }, data: { projectId, folderId: folder.id } });
    s.folder = name;
  }
  save(state);

  // 4. Animations (need Runware; set SKIP_ANIMATIONS=1 to leave them out)
  for (const a of process.env.SKIP_ANIMATIONS ? [] : ANIMATIONS) {
    if (state.animations[a.name] || !state.sprites[a.name]) continue;
    try {
      const src = await fetchBuf(state.sprites[a.name].imageUrl);
      const reference = await sharp(src).resize(512, 512, { fit: "contain", background: "#ffffff", kernel: "nearest" }).flatten({ background: "#ffffff" }).png().toBuffer();
      const r = await makeAnimation({ reference, prompt: WEAPONS.find((w) => w.name === a.name)!.prompt, categoryId: "WEAPONS", motion: a.motion, frames: a.frames, smooth: true, pixel: true, anchor: a.anchor, loop: a.loop });
      const [sheet, gif] = await Promise.all([
        uploadGenerationBufferToR2(r.anim.sheetPng, OWNER_ID, "png"),
        uploadGenerationBufferToR2(r.anim.gif, OWNER_ID, "gif"),
      ]);
      await saveGeneration({
        userId: OWNER_ID, prompt: `[Animation: ${a.label.toLowerCase()}, ${r.anim.frameCount}f] ${a.name}`, fullPrompt: r.prompt,
        categoryId: "WEAPONS", subcategoryId: "ANIMATION", styleId: STYLE, imageUrl: sheet.url!, replicateCost: r.cost, projectId,
      });
      state.animations[a.name] = { sheetUrl: sheet.url!, gifUrl: gif.url ?? null, frameWidth: r.anim.frameWidth, frameHeight: r.anim.frameHeight, frameCount: r.anim.frameCount };
      save(state);
      console.log("  animated", a.name, r.anim.frameCount, "frames");
    } catch (e) {
      console.log("  ANIMATION FAILED", a.name, e instanceof Error ? e.message : e);
    }
  }

  // 5. Pack
  const zip = new JSZip();
  const root = zip.folder("SpriteLab-Free-Weapon-Pack")!;
  const thumbs: { name: string; png: Buffer }[] = [];
  for (const w of WEAPONS) {
    const s = state.sprites[w.name];
    if (!s) continue;
    const png = await fetchBuf(s.imageUrl);
    const file = `${slug(w.name)}.png`;
    root.file(`${s.folder}/${file}`, png);
    const n = await nativeFactor(png);
    if (n.factor > 1) {
      root.file(`${s.folder}/native/${file}`, await sharp(png).resize(n.w, n.h, { kernel: "nearest" }).png().toBuffer());
    }
    thumbs.push({ name: w.name, png });
  }
  for (const a of ANIMATIONS) {
    const s = state.animations[a.name];
    if (!s) continue;
    const base = `Animations/${slug(a.name)}-${slug(a.label)}`;
    const sheet = await fetchBuf(s.sheetUrl);
    root.file(`${base}-sheet.png`, sheet);
    if (s.gifUrl) root.file(`${base}.gif`, await fetchBuf(s.gifUrl));
    for (let i = 0; i < s.frameCount; i++) {
      root.file(`${base}-frames/frame-${String(i + 1).padStart(2, "0")}.png`,
        await sharp(sheet).extract({ left: i * s.frameWidth, top: 0, width: s.frameWidth, height: s.frameHeight }).png().toBuffer());
    }
  }

  // Previews: a contact sheet and an itch.io cover (630×500)
  const cell = 160, cols = 6, rows = Math.ceil(thumbs.length / cols);
  const tiles = await Promise.all(thumbs.map((t) => sharp(t.png).resize(cell - 16, cell - 16, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: "nearest" }).png().toBuffer()));
  const preview = await sharp({ create: { width: cols * cell, height: rows * cell, channels: 4, background: "#14171f" } })
    .composite(tiles.map((input, i) => ({ input, left: (i % cols) * cell + 8, top: Math.floor(i / cols) * cell + 8 })))
    .png().toBuffer();
  const coverItems = await Promise.all(tiles.slice(0, 12).map((t) => sharp(t).resize(96, 96, { kernel: "nearest" }).png().toBuffer()));
  const cover = await sharp({ create: { width: 630, height: 500, channels: 4, background: "#0B0D12" } })
    .composite([
      ...coverItems.map((input, i) => ({ input, left: 27 + (i % 6) * 98, top: 170 + Math.floor(i / 6) * 110 })),
      { input: Buffer.from(`<svg width="630" height="150" xmlns="http://www.w3.org/2000/svg"><text x="315" y="70" font-family="Arial, sans-serif" font-size="44" font-weight="700" fill="#ffffff" text-anchor="middle">Free Weapon Pack</text><text x="315" y="112" font-family="Arial, sans-serif" font-size="22" fill="#FF8A3D" text-anchor="middle">${thumbs.length} pixel-art weapons · transparent PNG</text></svg>`), left: 0, top: 10 },
      { input: Buffer.from(`<svg width="630" height="40" xmlns="http://www.w3.org/2000/svg"><text x="315" y="26" font-family="Arial, sans-serif" font-size="16" fill="#8B93A5" text-anchor="middle">made with SpriteLab · sprite-lab.com</text></svg>`), left: 0, top: 450 },
    ])
    .png().toBuffer();
  const coverFixed = cover;
  root.file("preview.png", preview);
  root.file("cover-630x500.png", coverFixed);

  const date = new Date().toISOString().slice(0, 10);
  root.file("README.txt", [
    PACK, "=".repeat(PACK.length), "",
    `Version 1.0 · ${date}`,
    `${thumbs.length} pixel-art weapon sprites (transparent PNG)${Object.keys(state.animations).length ? ` + ${Object.keys(state.animations).length} animations (sprite sheet, frames, GIF)` : ""}.`,
    "",
    "Folders:",
    ...[...new Set(WEAPONS.map((w) => state.sprites[w.name]?.folder).filter(Boolean))].map((f) => `  - ${f}/  (1024 px PNG; native/ = true art-pixel size)`),
    ...(Object.keys(state.animations).length ? ["  - Animations/  (horizontal sprite sheets of equal-size frames, separate frames and GIF previews)"] : []),
    "",
    "Use in Unity: Texture Type Sprite (2D and UI), Filter Mode Point, Compression None.",
    "  Sprite sheets: Sprite Mode Multiple, Sprite Editor > Slice > Grid By Cell Size.",
    "Use in Godot 4: Default Texture Filter = Nearest; sheets in AnimatedSprite2D >",
    "  SpriteFrames > Add frames from sprite sheet (Horizontal = frame count, Vertical = 1).",
    "",
    "These sprites were generated with AI using SpriteLab (https://www.sprite-lab.com),",
    "the AI game asset generator for indie developers, and cleaned up for game use.",
    "",
    "License: see LICENSE.txt",
    "",
  ].join("\r\n"));
  root.file("LICENSE.txt", [
    "SpriteLab Free Weapon Pack — License", "",
    "You may use these assets in personal and commercial games and projects, and",
    "modify them as you like. No attribution is required, but a credit to",
    "\"SpriteLab (sprite-lab.com)\" is appreciated.", "",
    "You may not resell or redistribute the assets as a standalone asset pack, and",
    "you may not present them as hand-made artwork (they are AI-generated).", "",
  ].join("\r\n"));

  const buf = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE", compressionOptions: { level: 6 } });
  writeFileSync(join(OUT, "SpriteLab-Free-Weapon-Pack.zip"), buf);
  writeFileSync(join(OUT, "preview.png"), preview);
  writeFileSync(join(OUT, "cover-630x500.png"), coverFixed);
  for (const a of ANIMATIONS) {
    const s = state.animations[a.name];
    if (s?.gifUrl) writeFileSync(join(OUT, `${slug(a.name)}-${slug(a.label)}.gif`), await fetchBuf(s.gifUrl));
  }
  console.log(`\nPack: ${join(OUT, "SpriteLab-Free-Weapon-Pack.zip")} (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
