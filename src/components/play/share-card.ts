// =============================================================================
// Sprite Dungeon — the 9:16 run card (PNG) for TikTok, Shorts and Reels
// =============================================================================
// Drawn in the browser from the run's real report and the player's own
// sprites; nothing on it is invented. Layout keeps the important parts in the
// upper and middle area: the platforms cover the right edge and the bottom
// ~20% with their own buttons and captions.
// =============================================================================

import { fetchImage } from "@/lib/cors-image";
import type { PartyMember } from "@/lib/dungeon/store";
import type { RunReport } from "@/lib/dungeon/summary";

export const CARD_W = 1080;
export const CARD_H = 1920;

const INK = "#FFF1E8", MUTED = "#A7ADD4", ORANGE = "#FFA300", PAGE = "#131A31", CARD = "#19223F", RAISED = "#212B4E";

async function loadSprite(url: string): Promise<ImageBitmap | null> {
  try {
    const res = await fetchImage(url);
    if (!res.ok) return null;
    return await createImageBitmap(await res.blob());
  } catch {
    return null;
  }
}

/** The page's own font families (next/font names are hashed), read from rendered elements. */
function fontOf(className: string, fallback: string): string {
  try {
    const el = document.createElement("span");
    el.className = className;
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    document.body.appendChild(el);
    const f = getComputedStyle(el).fontFamily;
    el.remove();
    return f || fallback;
  } catch {
    return fallback;
  }
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(`${t}…`).width > max) t = t.slice(0, -1);
  return `${t.trimEnd()}…`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function checker(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, cell = 24) {
  ctx.save();
  roundRect(ctx, x, y, w, h, 20);
  ctx.clip();
  for (let yy = 0; yy < h; yy += cell) for (let xx = 0; xx < w; xx += cell) {
    ctx.fillStyle = ((xx + yy) / cell) % 2 === 0 ? "#1E2849" : "#192140";
    ctx.fillRect(x + xx, y + yy, cell, cell);
  }
  ctx.restore();
}

export async function renderRunCard(report: RunReport, members: PartyMember[]): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available");
  await document.fonts?.ready;
  const display = fontOf("font-display", "sans-serif");
  const body = fontOf("font-sans", "sans-serif");

  ctx.fillStyle = PAGE;
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const M = 72; // side margin
  // Brand
  ctx.fillStyle = INK;
  ctx.font = `600 44px ${display}`;
  ctx.fillText("SpriteLab", M, 132);
  ctx.fillStyle = MUTED;
  ctx.font = `400 34px ${body}`;
  ctx.fillText("Sprite Dungeon", M, 182);

  // The result
  ctx.fillStyle = MUTED;
  ctx.font = `400 40px ${body}`;
  ctx.fillText("My party reached", M, 300);
  ctx.fillStyle = INK;
  ctx.font = `600 220px ${display}`;
  ctx.fillText(`Floor ${report.floor}`, M - 6, 500);

  let y = 560;
  const chips: { text: string; fill: string; ink: string }[] = [];
  if (report.newBest) chips.push({ text: "New best", fill: ORANGE, ink: PAGE });
  if (report.rankAfter) chips.push({ text: `#${report.rankAfter} this week of ${report.players}`, fill: RAISED, ink: INK });
  let x = M;
  ctx.font = `600 38px ${display}`;
  for (const c of chips) {
    const w = ctx.measureText(c.text).width + 48;
    ctx.fillStyle = c.fill;
    roundRect(ctx, x, y, w, 68, 12);
    ctx.fill();
    ctx.fillStyle = c.ink;
    ctx.fillText(c.text, x + 24, y + 47);
    x += w + 16;
  }
  if (chips.length) y += 110;

  // The party: the player's own sprites, in one row, as big as they fit
  const heroes = members.slice(0, 4);
  const n = Math.max(1, heroes.length);
  const gap = 24;
  const tile = Math.floor((CARD_W - M * 2 - (n - 1) * gap) / n);
  const tileH = n === 1 ? 440 : 400;
  const bitmaps = await Promise.all(heroes.map((m) => loadSprite(m.hero.imageUrl)));
  heroes.forEach((m, i) => {
    const tx = M + i * (tile + gap);
    checker(ctx, tx, y, tile, tileH);
    const bmp = bitmaps[i];
    if (bmp) {
      const s = Math.min((tile - 32) / bmp.width, (tileH - 32) / bmp.height);
      const w = bmp.width * s, h = bmp.height * s;
      // Pixel art: nearest-neighbour when enlarged; smooth only when shrinking
      ctx.imageSmoothingEnabled = !m.hero.pixel || s < 1;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bmp, tx + (tile - w) / 2, y + (tileH - h) / 2, w, h);
    }
    if (report.mvp === i) {
      ctx.strokeStyle = ORANGE;
      ctx.lineWidth = 6;
      roundRect(ctx, tx + 3, y + 3, tile - 6, tileH - 6, 18);
      ctx.stroke();
    }
    ctx.fillStyle = report.mvp === i ? ORANGE : INK;
    ctx.font = `600 ${n >= 4 ? 28 : 32}px ${body}`;
    ctx.fillText(fit(ctx, `${report.mvp === i ? "MVP " : ""}${m.hero.name}`, tile), tx, y + tileH + 46);
  });
  y += tileH + 90;

  // What happened (real numbers only)
  const lines: string[] = [];
  if (members[report.mvp]) lines.push(`MVP dealt ${report.mvpDamage.toLocaleString("en")} damage`);
  lines.push(`Stopped by ${report.stoppedBy}`);
  for (const l of report.nearMiss.slice(0, 1)) lines.push(l);
  ctx.fillStyle = CARD;
  const boxH = 40 + lines.length * 58;
  roundRect(ctx, M, y, CARD_W - M * 2, boxH, 20);
  ctx.fill();
  ctx.font = `400 38px ${body}`;
  lines.forEach((l, k) => {
    ctx.fillStyle = k === 0 ? INK : MUTED;
    ctx.fillText(fit(ctx, l, CARD_W - M * 2 - 56), M + 28, y + 64 + k * 58);
  });

  // Footer right under the story, above the platforms' bottom overlay (lowest 20%)
  const fy = Math.min(y + boxH + 90, CARD_H * 0.8 - 80);
  ctx.fillStyle = INK;
  ctx.font = `600 44px ${display}`;
  ctx.fillText("Heroes made from my own sprites", M, fy);
  ctx.fillStyle = ORANGE;
  ctx.font = `600 40px ${body}`;
  ctx.fillText("sprite-lab.com/play", M, fy + 62);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image"))), "image/png"));
}
