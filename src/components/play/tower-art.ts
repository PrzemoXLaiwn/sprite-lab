// =============================================================================
// Tower art — procedural pixel tiles, rooms, props and stairs (no images)
// =============================================================================
// Coordinates are logical pixels; `px(ctx, s, …)` multiplies by the stage
// scale and rounds, so everything lands on whole pixels. Brick tiles are
// rendered once per zone and scale into an offscreen canvas and blitted.
// =============================================================================

import type { ZoneDef } from "@/lib/dungeon/config";

export type ZoneId = ZoneDef["id"];

export interface ZoneLook {
  wall: string;
  wallLight: string;
  wallDark: string;
  mortar: string;
  slab: string;
  slabTop: string;
  backdrop: string;
  /** Light colour of the zone's props (torch, candle, crystal, lava, stars). */
  glow: string;
}

export const ZONE_LOOK: Record<ZoneId, ZoneLook> = {
  cells: { wall: "#3A4163", wallLight: "#4A537B", wallDark: "#2F3555", mortar: "#232842", slab: "#2B3152", slabTop: "#5A6394", backdrop: "#1B2140", glow: "#FFA300" },
  crypt: { wall: "#3D3654", wallLight: "#4D4568", wallDark: "#322C46", mortar: "#221D36", slab: "#2E2842", slabTop: "#6A5F8C", backdrop: "#1B1730", glow: "#FFE36B" },
  crystal: { wall: "#22395A", wallLight: "#2D4A70", wallDark: "#1B2E4A", mortar: "#122236", slab: "#1C2F4C", slabTop: "#4E7BB0", backdrop: "#101C30", glow: "#7FDBFF" },
  forge: { wall: "#4B2C25", wallLight: "#5E382F", wallDark: "#3C231E", mortar: "#291512", slab: "#3A211C", slabTop: "#8A5040", backdrop: "#24120F", glow: "#FF6B2B" },
  abyss: { wall: "#1D1636", wallLight: "#271E48", wallDark: "#160F2B", mortar: "#0D0920", slab: "#1A1430", slabTop: "#4A3C80", backdrop: "#0A0718", glow: "#A693FF" },
};

/** Tower geometry (logical px). */
export const TOWER_W = 224;
export const WALL = 8;
export const SLAB = 6;
export const ROOM_H = 92;
export const BOSS_ROOM_H = 124;
export const STAIR_STEPS = 14;
export const STAIR_W = 5;

export function roomHeight(floor: number): number {
  return floor > 0 && floor % 5 === 0 ? BOSS_ROOM_H : ROOM_H;
}

/** Y of the top of room `floor`'s floor slab (room 0 = the entrance at y 0; floors go up = negative y). */
export function floorY(floor: number): number {
  if (floor <= 0) return 0;
  // Sum of the heights of rooms 0 … floor-1 (boss halls among them are taller)
  const bosses = Math.floor((floor - 1) / 5);
  return -((floor - bosses) * ROOM_H + bosses * BOSS_ROOM_H);
}

/** Room n's top (its ceiling = the next room's floor). */
export function ceilingY(floor: number): number {
  return floorY(floor) - roomHeight(floor);
}

/** Stairs in room n lead up to room n+1; they alternate sides so the climb zigzags. */
export function stairSide(floor: number): "left" | "right" {
  return floor % 2 === 0 ? "right" : "left";
}

/** Where the stairs of room n start (bottom step) and end (top, at the ceiling opening). */
export function stairPath(floor: number): { x0: number; y0: number; x1: number; y1: number } {
  const span = STAIR_STEPS * STAIR_W;
  const y0 = floorY(floor), y1 = ceilingY(floor) + SLAB;
  return stairSide(floor) === "right"
    ? { x0: TOWER_W - WALL - span - 4, y0, x1: TOWER_W - WALL - 6, y1 }
    : { x0: WALL + span + 4, y0, x1: WALL + 6, y1 };
}

type Ctx = CanvasRenderingContext2D;

export function px(ctx: Ctx, s: number, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * s, Math.round(y) * s, Math.round(w) * s, Math.round(h) * s);
}

/** Small deterministic hash for brick variation and props. */
export function h2(a: number, b: number): number {
  let x = (a * 374761393 + b * 668265263) | 0;
  x = (x ^ (x >>> 13)) * 1274126177;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}

const tileCache = new Map<string, HTMLCanvasElement>();
export const TILE = 32;

/** A 32×32 brick tile for the zone at scale `s` (cached). */
export function wallTile(zone: ZoneId, s: number): HTMLCanvasElement {
  const key = `${zone}@${s}`;
  const hit = tileCache.get(key);
  if (hit) return hit;
  const L = ZONE_LOOK[zone];
  const c = document.createElement("canvas");
  c.width = TILE * s;
  c.height = TILE * s;
  const g = c.getContext("2d")!;
  px(g, s, 0, 0, TILE, TILE, L.mortar);
  for (let row = 0; row < TILE / 4; row++) {
    const off = row % 2 === 0 ? 0 : 4;
    for (let col = -1; col < TILE / 8 + 1; col++) {
      const x = col * 8 + off, y = row * 4;
      const r = h2(col + 11, row + 7);
      const base = r < 0.18 ? L.wallDark : r > 0.85 ? L.wallLight : L.wall;
      px(g, s, x, y, 7, 3, base);
      px(g, s, x, y, 7, 1, r > 0.5 ? L.wallLight : base);
      if (zone === "crystal" && r > 0.93) px(g, s, x + 2, y + 1, 2, 1, "#7FDBFF");
      if (zone === "abyss" && r > 0.9) px(g, s, x + 3, y + 1, 1, 1, "#A693FF");
      if (zone === "cells" && r > 0.95) px(g, s, x + 1, y + 2, 2, 1, "#2D5A3A"); // moss
    }
  }
  tileCache.set(key, c);
  return c;
}

export function clearTileCache() {
  tileCache.clear();
}

/** Room back wall, floor slab, stairs and zone props. x0 = tower's left edge on screen (logical). */
export function drawRoom(ctx: Ctx, s: number, zone: ZoneId, floor: number, x0: number, camTop: number, boss: boolean, gateOpen: number) {
  const L = ZONE_LOOK[zone];
  const top = ceilingY(floor) - camTop, bottom = floorY(floor) - camTop;
  const h = bottom - top;
  // Back wall (tiles), slightly darker inside
  const tile = wallTile(zone, s);
  ctx.save();
  ctx.beginPath();
  ctx.rect(Math.round(x0 + WALL) * s, Math.round(top) * s, (TOWER_W - 2 * WALL) * s, Math.round(h) * s);
  ctx.clip();
  for (let tx = 0; tx < TOWER_W; tx += TILE) for (let ty = Math.floor(top / TILE) * TILE - TILE; ty < bottom; ty += TILE) {
    ctx.drawImage(tile, Math.round(x0 + tx) * s, Math.round(ty) * s);
  }
  ctx.fillStyle = "rgba(10,12,28,0.35)";
  ctx.fillRect(Math.round(x0) * s, Math.round(top) * s, TOWER_W * s, Math.round(h) * s);
  ctx.restore();

  drawProps(ctx, s, zone, floor, x0, top, bottom, boss);
  drawStairs(ctx, s, zone, floor, x0, camTop);
  if (boss) drawGate(ctx, s, zone, x0, top, bottom, gateOpen);

  // Floor slab of this room
  px(ctx, s, x0, bottom, TOWER_W, SLAB, L.slab);
  px(ctx, s, x0, bottom, TOWER_W, 1, L.slabTop);
  for (let x = 6; x < TOWER_W; x += 12) px(ctx, s, x0 + x + (floor % 2) * 6, bottom + 2, 1, SLAB - 2, L.mortar);
}

/** Outer tower walls along a vertical span. */
export function drawOuterWalls(ctx: Ctx, s: number, zone: ZoneId, x0: number, yTop: number, yBottom: number) {
  const L = ZONE_LOOK[zone];
  for (const x of [x0, x0 + TOWER_W - WALL]) {
    px(ctx, s, x, yTop, WALL, yBottom - yTop, L.wallDark);
    for (let y = Math.floor(yTop / 6) * 6; y < yBottom; y += 6) {
      px(ctx, s, x, y, WALL, 1, L.mortar);
      px(ctx, s, x + ((y / 6) % 2 === 0 ? 3 : 1), y + 1, 1, 5, L.mortar);
    }
    px(ctx, s, x === x0 ? x : x + WALL - 1, yTop, 1, yBottom - yTop, L.wallLight);
  }
}

function drawStairs(ctx: Ctx, s: number, zone: ZoneId, floor: number, x0: number, camTop: number) {
  const L = ZONE_LOOK[zone];
  const p = stairPath(floor);
  const dir = p.x1 > p.x0 ? 1 : -1;
  const rise = (p.y0 - p.y1) / STAIR_STEPS;
  for (let i = 0; i < STAIR_STEPS; i++) {
    const x = p.x0 + dir * i * STAIR_W + (dir < 0 ? -STAIR_W : 0);
    const y = p.y0 - (i + 1) * rise - camTop;
    px(ctx, s, x0 + x, y, STAIR_W, Math.ceil(rise) + 1, L.slab);
    px(ctx, s, x0 + x, y, STAIR_W, 1, L.slabTop);
  }
  // Opening in the ceiling above the top step
  const ox = dir > 0 ? p.x1 - 14 : p.x1 - 2;
  px(ctx, s, x0 + ox, ceilingY(floor) - camTop, 16, SLAB, "#0B1022");
}

function drawProps(ctx: Ctx, s: number, zone: ZoneId, floor: number, x0: number, top: number, bottom: number, boss: boolean) {
  const L = ZONE_LOOK[zone];
  const mid = x0 + TOWER_W / 2;
  if (zone === "cells") {
    // Barred window and a wall torch
    const wx = x0 + (floor % 2 ? 40 : 130);
    px(ctx, s, wx, top + 14, 16, 14, "#0E1228");
    for (let i = 0; i < 4; i++) px(ctx, s, wx + 2 + i * 4, top + 14, 1, 14, "#6A7299");
    torch(ctx, s, wx + 26, top + 22, L.glow);
    px(ctx, s, wx - 14, top + 6, 1, 18, "#6A7299"); // chain
    px(ctx, s, wx - 15, top + 24, 3, 2, "#6A7299");
  } else if (zone === "crypt") {
    for (const cx of [x0 + 24, x0 + TOWER_W - 30]) candle(ctx, s, cx, bottom - 1, L.glow);
    cobweb(ctx, s, x0 + WALL, top + SLAB, 1);
    cobweb(ctx, s, x0 + TOWER_W - WALL, top + SLAB, -1);
    px(ctx, s, mid - 8, top + 12, 16, 22, "#211C34"); // tomb niche
    px(ctx, s, mid - 6, top + 14, 12, 2, "#4D4568");
  } else if (zone === "crystal") {
    for (const [cx, hgt] of [[x0 + 18, 14], [x0 + 26, 9], [x0 + TOWER_W - 26, 16], [x0 + TOWER_W - 34, 10]] as [number, number][]) crystal(ctx, s, cx, bottom, hgt);
    glowDisc(ctx, s, x0 + 22, bottom - 8, 22, "rgba(127,219,255,0.10)");
    glowDisc(ctx, s, x0 + TOWER_W - 30, bottom - 8, 22, "rgba(127,219,255,0.10)");
  } else if (zone === "forge") {
    // Lava channel along the back and an anvil
    px(ctx, s, x0 + WALL, bottom - 4, TOWER_W - 2 * WALL, 3, "#FF6B2B");
    for (let x = WALL; x < TOWER_W - WALL; x += 9) px(ctx, s, x0 + x + (floor % 3), bottom - 4, 3, 1, "#FFD23F");
    glowDisc(ctx, s, mid, bottom - 4, 70, "rgba(255,107,43,0.10)");
    px(ctx, s, x0 + 22, bottom - 9, 12, 3, "#2A2F45");
    px(ctx, s, x0 + 25, bottom - 6, 6, 5, "#2A2F45");
  } else {
    // Void: stars on the wall
    for (let i = 0; i < 18; i++) {
      const sx = x0 + WALL + Math.floor(h2(floor, i) * (TOWER_W - 2 * WALL));
      const sy = top + SLAB + Math.floor(h2(i, floor + 3) * (bottom - top - SLAB - 8));
      px(ctx, s, sx, sy, 1, 1, i % 4 === 0 ? "#FFF1E8" : "#A693FF");
    }
  }
  if (boss) {
    // Banners either side of the hall
    for (const bx of [x0 + 40, x0 + TOWER_W - 48]) {
      px(ctx, s, bx, top + SLAB, 8, 26, "#7A1F2B");
      px(ctx, s, bx, top + SLAB + 26, 4, 3, "#7A1F2B");
      px(ctx, s, bx + 3, top + SLAB + 8, 2, 6, L.glow);
    }
  }
}

function torch(ctx: Ctx, s: number, x: number, y: number, glow: string) {
  glowDisc(ctx, s, x + 1, y - 3, 16, "rgba(255,163,0,0.10)");
  px(ctx, s, x, y, 2, 6, "#6B4A2B");
  px(ctx, s, x - 1, y - 3, 4, 3, glow);
  px(ctx, s, x, y - 5, 2, 2, "#FFE36B");
}

function candle(ctx: Ctx, s: number, x: number, y: number, glow: string) {
  glowDisc(ctx, s, x + 1, y - 10, 12, "rgba(255,227,107,0.10)");
  px(ctx, s, x, y - 6, 3, 6, "#E8E2D0");
  px(ctx, s, x + 1, y - 9, 1, 3, glow);
}

function crystal(ctx: Ctx, s: number, x: number, y: number, hgt: number) {
  for (let i = 0; i < hgt; i++) {
    const w = Math.max(1, Math.round((1 - i / hgt) * 5));
    px(ctx, s, x - Math.floor(w / 2), y - i, w, 1, i % 3 === 0 ? "#CFF4FF" : "#5EC8F2");
  }
}

function cobweb(ctx: Ctx, s: number, x: number, y: number, dir: 1 | -1) {
  ctx.globalAlpha = 0.45;
  for (let i = 0; i < 10; i++) {
    px(ctx, s, x + dir * i - (dir < 0 ? 1 : 0), y + i, 1, 1, "#C8CCE8");
    px(ctx, s, x + dir * i - (dir < 0 ? 1 : 0), y, 1, 1, "#C8CCE8");
    if (i % 3 === 0) px(ctx, s, x + (dir < 0 ? -i - 1 : 0), y + i, i, 1, "#C8CCE8");
  }
  ctx.globalAlpha = 1;
}

function glowDisc(ctx: Ctx, s: number, x: number, y: number, r: number, color: string) {
  // Stepped rings (whole pixels) instead of a soft gradient
  for (let k = 3; k >= 1; k--) {
    const rr = Math.round((r * k) / 3);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(Math.round(x) * s, Math.round(y) * s, rr * s, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Portcullis across the boss hall: open = 0 (down) … 1 (fully raised). */
function drawGate(ctx: Ctx, s: number, zone: ZoneId, x0: number, top: number, bottom: number, open: number) {
  if (open >= 1) return;
  const gx = x0 + 130, h = bottom - top - SLAB;
  const lift = Math.round(h * open);
  for (let i = 0; i < 5; i++) px(ctx, s, gx + i * 4, top + SLAB, 1, h - lift, "#6A7299");
  for (let y = top + SLAB + 6; y < bottom - lift; y += 8) px(ctx, s, gx - 1, y, 19, 1, "#6A7299");
}

/** Treasure chest: lid opens with `open` 0…1. */
export function drawChest(ctx: Ctx, s: number, x: number, y: number, open: number) {
  px(ctx, s, x, y - 8, 14, 8, "#8B5A2B");
  px(ctx, s, x, y - 8, 14, 1, "#B07A40");
  px(ctx, s, x + 6, y - 6, 2, 3, "#FFA300");
  const lidY = y - 8 - Math.round(open * 5);
  px(ctx, s, x - (open > 0.5 ? 1 : 0), lidY - 4, 14, 4, "#A0683A");
  px(ctx, s, x, lidY - 4, 14, 1, "#C8894E");
  if (open > 0.5) px(ctx, s, x + 2, y - 9, 10, 1, "#FFE36B");
}

/** Night sky outside the tower: flat bands with pixel stars and far hills (no gradients). */
export function drawSky(ctx: Ctx, s: number, vw: number, vh: number, camTop: number) {
  const bands = ["#0E1430", "#111838", "#131A31", "#161E3C"];
  const bandH = Math.ceil(vh / bands.length);
  bands.forEach((c, i) => px(ctx, s, 0, i * bandH, vw, bandH + 1, c));
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(h2(i, 5) * vw);
    const y = Math.floor(((h2(7, i) * 900 - camTop * 0.2) % vh + vh) % vh);
    px(ctx, s, x, y, 1, 1, i % 7 === 0 ? "#FFF1E8" : "#3A4672");
  }
  // Far hills, drifting slowly with the climb (parallax)
  const base = Math.round(vh - 18 + Math.min(200, -camTop * 0.05));
  for (let x = 0; x < vw; x += 2) {
    const hh = 6 + Math.floor(h2(Math.floor(x / 6), 2) * 10);
    px(ctx, s, x, base - hh, 2, hh + 40, "#0B1022");
  }
}
