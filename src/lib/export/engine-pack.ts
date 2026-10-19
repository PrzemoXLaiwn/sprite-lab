import { fetchImage } from "@/lib/cors-image";
// =============================================================================
// Engine pack — sprite sheets → files a game engine imports directly (browser)
// =============================================================================
// One ZIP per character:
//   godot/<name>.tres          SpriteFrames with every animation (fps + loop) —
//                              drop the folder into res:// and assign it to an
//                              AnimatedSprite2D
//   godot/sheets/<anim>.png    the sheets the .tres points at
//   unity/<anim>/<anim>_N.png  single frames (drag a folder onto the scene →
//                              Unity builds the animation clip)
//   gamemaker/<anim>_stripN.png  strips GameMaker auto-splits on import
//   hitboxes.json              per-frame hurtbox (body) + hitbox (what reaches
//                              out: weapon, fist, breath) in frame pixels
//   README.txt
// =============================================================================

export interface PackAnimation {
  /** Short id used for file and animation names, e.g. "walk", "attack". */
  name: string;
  sheetUrl: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
  fps: number;
  loop: boolean;
  /** Frames per row for grid sheets (4-direction walk: 4×4). */
  sheetCols?: number;
}

interface Box { x: number; y: number; w: number; h: number }
interface FrameBoxes { hurtbox: Box | null; hitbox: Box | null }

const DIR_ROWS = ["down", "right", "up", "left"];

const safe = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "anim";

async function loadImage(url: string): Promise<ImageBitmap> {
  const blob = await (await fetchImage(url)).blob();
  return createImageBitmap(blob);
}

function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

const toBlob = (c: HTMLCanvasElement) => new Promise<Blob>((r, j) => c.toBlob((b) => (b ? r(b) : j(new Error("encode failed"))), "image/png"));

/**
 * Hurtbox = the body: columns/rows that hold a solid share of the sprite
 * (thin swords and fire trails don't count). Hitbox = opaque pixels that
 * stick out of the body beyond the animation's first (rest) pose — the
 * strike. Null when nothing reaches out.
 */
function restMask(data: Uint8ClampedArray, w: number, h: number, grow = 4): Uint8Array {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] <= 127) continue;
    for (let dy = -grow; dy <= grow; dy++) for (let dx = -grow; dx <= grow; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) m[ny * w + nx] = 1;
    }
  }
  return m;
}
function boxes(data: Uint8ClampedArray, w: number, h: number, rest?: Uint8Array): FrameBoxes {
  const col = new Array(w).fill(0), row = new Array(h).fill(0);
  let total = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (data[(y * w + x) * 4 + 3] > 127) { col[x]++; row[y]++; total++; }
  if (!total) return { hurtbox: null, hitbox: null };
  const cMax = Math.max(...col), rMax = Math.max(...row);
  const span = (arr: number[], min: number) => { let a = -1, b = -1; arr.forEach((v, i) => { if (v >= min) { if (a < 0) a = i; b = i; } }); return [a, b]; };
  const [x0, x1] = span(col, cMax * 0.18), [y0, y1] = span(row, rMax * 0.12);
  const hurt: Box = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  let hx0 = w, hy0 = h, hx1 = -1, hy1 = -1, out = 0;
  const pad = 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (data[(y * w + x) * 4 + 3] <= 127) continue;
    if (x >= x0 - pad && x <= x1 + pad && y >= y0 - pad && y <= y1 + pad) continue;
    // Held items already sticking out in the rest pose (shield, sword at the side) aren't a strike
    if (rest?.[y * w + x]) continue;
    out++; if (x < hx0) hx0 = x; if (x > hx1) hx1 = x; if (y < hy0) hy0 = y; if (y > hy1) hy1 = y;
  }
  const hit = out > total * 0.02 ? { x: hx0, y: hy0, w: hx1 - hx0 + 1, h: hy1 - hy0 + 1 } : null;
  return { hurtbox: hurt, hitbox: hit };
}

/** Splits grid sheets into one animation per row (4-direction walks). */
function expand(anims: PackAnimation[]): (PackAnimation & { row?: number })[] {
  const out: (PackAnimation & { row?: number })[] = [];
  for (const a of anims) {
    const cols = a.sheetCols && a.sheetCols < a.frameCount ? a.sheetCols : 0;
    if (!cols) { out.push(a); continue; }
    const rows = Math.ceil(a.frameCount / cols);
    for (let r = 0; r < rows; r++) {
      out.push({ ...a, name: `${a.name}_${DIR_ROWS[r] ?? `row${r + 1}`}`, frameCount: Math.min(cols, a.frameCount - r * cols), row: r, sheetCols: cols });
    }
  }
  return out;
}

export async function buildEnginePack(character: string, animations: PackAnimation[]): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const char = safe(character) || "character";
  const root = zip.folder(`spritelab_${char}`)!;
  const list = expand(animations);
  const used = new Set<string>();
  const hitboxes: Record<string, { fps: number; loop: boolean; frameWidth: number; frameHeight: number; frames: FrameBoxes[] }> = {};
  const tresAnims: string[] = [];
  const subRes: string[] = [];
  const extRes: string[] = [];
  let sub = 0;
  const sheets = new Map<string, ImageBitmap>();

  for (const [ai, a] of list.entries()) {
    let name = safe(a.name);
    while (used.has(name)) name = `${name}_2`;
    used.add(name);
    let bmp = sheets.get(a.sheetUrl);
    if (!bmp) { bmp = await loadImage(a.sheetUrl); sheets.set(a.sheetUrl, bmp); }
    const fw = a.frameWidth, fh = a.frameHeight;
    const cols = a.sheetCols ?? a.frameCount;
    const rowOffset = "row" in a && typeof a.row === "number" ? a.row * cols : 0;

    // Horizontal strip of this animation (also the Godot sheet)
    const strip = canvas(fw * a.frameCount, fh);
    const frameBoxes: FrameBoxes[] = [];
    let rest: Uint8Array | undefined;
    for (let i = 0; i < a.frameCount; i++) {
      const idx = rowOffset + i;
      const sx = (idx % cols) * fw, sy = Math.floor(idx / cols) * fh;
      const one = canvas(fw, fh);
      one.ctx.drawImage(bmp, sx, sy, fw, fh, 0, 0, fw, fh);
      strip.ctx.drawImage(one.c, i * fw, 0);
      const px = one.ctx.getImageData(0, 0, fw, fh).data;
      if (i === 0) rest = restMask(px, fw, fh);
      frameBoxes.push(boxes(px, fw, fh, rest));
      root.file(`unity/${name}/${name}_${String(i).padStart(2, "0")}.png`, await toBlob(one.c));
    }
    const stripBlob = await toBlob(strip.c);
    root.file(`godot/sheets/${name}.png`, stripBlob);
    root.file(`gamemaker/${name}_strip${a.frameCount}.png`, stripBlob);
    hitboxes[name] = { fps: a.fps, loop: a.loop, frameWidth: fw, frameHeight: fh, frames: frameBoxes };

    // Godot 4 SpriteFrames
    const ext = `${ai + 1}_${name}`;
    extRes.push(`[ext_resource type="Texture2D" path="res://spritelab_${char}/godot/sheets/${name}.png" id="${ext}"]`);
    const frames: string[] = [];
    for (let i = 0; i < a.frameCount; i++) {
      const id = `AtlasTexture_${sub++}`;
      subRes.push(`[sub_resource type="AtlasTexture" id="${id}"]\natlas = ExtResource("${ext}")\nregion = Rect2(${i * fw}, 0, ${fw}, ${fh})`);
      frames.push(`{\n"duration": 1.0,\n"texture": SubResource("${id}")\n}`);
    }
    tresAnims.push(`{\n"frames": [${frames.join(", ")}],\n"loop": ${a.loop},\n"name": &"${name}",\n"speed": ${a.fps.toFixed(1)}\n}`);
  }

  const tres = [
    `[gd_resource type="SpriteFrames" load_steps=${extRes.length + subRes.length + 1} format=3]`,
    "",
    ...extRes,
    "",
    ...subRes.flatMap((s) => [s, ""]),
    "[resource]",
    `animations = [${tresAnims.join(", ")}]`,
    "",
  ].join("\n");
  root.file(`godot/${char}.tres`, tres);
  root.file("hitboxes.json", JSON.stringify({ character: char, note: "Boxes in pixels of each frame (x, y from top-left). hurtbox = body, hitbox = what reaches out (null when nothing does). Auto-detected — tweak in your engine.", animations: hitboxes }, null, 2));
  root.file("README.txt", [
    `SpriteLab engine pack — ${character}`,
    "",
    "GODOT 4",
    `  1. Copy the folder "spritelab_${char}" into your project root (res://).`,
    "  2. Add an AnimatedSprite2D, set Sprite Frames → Load → godot/" + char + ".tres.",
    "  3. Pick an animation and press play. Pixel art: Project Settings → Rendering → Textures → Default Texture Filter = Nearest.",
    "",
    "UNITY",
    "  Select all PNGs in unity/<animation>/ and drag them onto the Scene — Unity creates the animation clip.",
    "  Pixel art: Filter Mode = Point, Compression = None.",
    "",
    "GAMEMAKER",
    "  Import gamemaker/<animation>_stripN.png — GameMaker splits it into N frames automatically.",
    "",
    "HITBOXES",
    "  hitboxes.json lists a hurtbox (body) and hitbox (strike) per frame, in frame pixels.",
    "",
    "Made with sprite-lab.com",
  ].join("\n"));

  return zip.generateAsync({ type: "blob" });
}

export function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(href), 4000);
}
