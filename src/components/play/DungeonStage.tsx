"use client";

// =============================================================================
// Sprite Dungeon stage — draws the replay of a server run log on a canvas
// =============================================================================
// Logical stage of 200×112 pixels, scaled by a whole number so everything sits
// on whole pixels. Positions and motion are rounded to logical pixels; pixel
// styles are drawn nearest-neighbour. The stage never decides anything: it
// only shows the steps built from the log (see replay.ts).
// =============================================================================

import { useEffect, useRef } from "react";
import type { DungeonSprite } from "@/lib/dungeon/store";
import type { EnemyUnit, RunLog } from "@/lib/dungeon/simulate";
import { CROWN, ENEMY_ART, artSize, type PixelArt } from "./enemy-art";
import { buildTimeline, stepAt, type Step } from "./replay";

export const STAGE_W = 200;
export const STAGE_H = 112;
const SPRITE = 32;
const GROUND = 100;

export interface StageProgress {
  floor: number;
  hp: number;
  maxHp: number;
  line: string;
  done: boolean;
}

interface Props {
  party: DungeonSprite[];
  log: RunLog | null;
  speed: number;
  /** Bumping this number jumps to the end of the replay. */
  skipToken: number;
  onProgress?: (p: StageProgress) => void;
  onDone?: () => void;
}

// ── layout ──────────────────────────────────────────────────────────────────
/** Feet position of a party slot (slot 0 stands at the front). */
function partyPos(i: number): { x: number; y: number } {
  return { x: 80 - i * 20, y: GROUND - (i % 2 === 1 ? 7 : 0) };
}
function enemyScale(e: EnemyUnit): number {
  return e.boss ? 3 : 2;
}
function enemyPos(i: number, e: EnemyUnit): { x: number; y: number } {
  if (e.boss) return { x: 150, y: GROUND };
  return { x: 122 + i * 20, y: GROUND - (i % 2 === 1 ? 7 : 0) };
}

// ── drawing helpers (all coordinates in logical pixels) ─────────────────────
type Ctx = CanvasRenderingContext2D;

function rect(ctx: Ctx, s: number, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x) * s, Math.round(y) * s, Math.round(w) * s, Math.round(h) * s);
}

function drawArt(ctx: Ctx, s: number, art: PixelArt, x: number, y: number, px: number, tint: string | null) {
  art.rows.forEach((row, ry) => {
    for (let rx = 0; rx < row.length; rx++) {
      const c = row[rx];
      if (c === ".") continue;
      rect(ctx, s, x + rx * px, y + ry * px, px, px, tint ?? art.palette[c] ?? "#FF00FF");
    }
  });
}

function hpBar(ctx: Ctx, s: number, cx: number, y: number, w: number, hp: number, max: number, color: string) {
  const x = Math.round(cx - w / 2);
  rect(ctx, s, x - 1, y - 1, w + 2, 4, "#0B1022");
  rect(ctx, s, x, y, w, 2, "#2A3460");
  const fill = max > 0 ? Math.ceil((Math.max(0, hp) / max) * w) : 0;
  if (fill > 0) rect(ctx, s, x, y, fill, 2, color);
}

function text(ctx: Ctx, s: number, font: string, str: string, x: number, y: number, color: string, size = 7, align: CanvasTextAlign = "center") {
  ctx.font = `700 ${size * s}px ${font}`;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.lineWidth = Math.max(2, Math.round(s * 1.5));
  ctx.strokeStyle = "#0B1022";
  ctx.strokeText(str, Math.round(x) * s, Math.round(y) * s);
  ctx.fillStyle = color;
  ctx.fillText(str, Math.round(x) * s, Math.round(y) * s);
}

/** White silhouette of a sprite at the current scale (hit flash), cached. */
function silhouette(cache: Map<string, HTMLCanvasElement>, key: string, img: HTMLImageElement, size: number, smooth: boolean) {
  const k = `${key}@${size}`;
  const hit = cache.get(k);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const g = c.getContext("2d");
  if (!g) return c;
  g.imageSmoothingEnabled = smooth;
  g.drawImage(img, 0, 0, size, size);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#FFFFFF";
  g.fillRect(0, 0, size, size);
  cache.set(k, c);
  return c;
}

const PLAYER_HIT = "#FFF1E8";
const CRIT = "#FFA300";
const TAKEN = "#FF8A8A";
const HEAL = "#00E436";

export function DungeonStage({ party, log, speed, skipToken, onProgress, onDone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scaleRef = useRef(2);
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const flashRef = useRef(new Map<string, HTMLCanvasElement>());
  const tileRef = useRef<HTMLImageElement | null>(null);
  const speedRef = useRef(speed);
  const clockRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  const cbRef = useRef({ onProgress, onDone });

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { cbRef.current = { onProgress, onDone }; }, [onProgress, onDone]);

  // Images: the player's real sprites + the stone tile
  useEffect(() => {
    const redraw = () => drawRef.current();
    for (const p of party) {
      if (imagesRef.current.has(p.id)) continue;
      const img = new Image();
      img.decoding = "async";
      img.onload = redraw;
      img.src = p.imageUrl;
      imagesRef.current.set(p.id, img);
    }
    if (!tileRef.current) {
      const t = new Image();
      t.onload = redraw;
      t.src = "/showcase/tile-stone-wall.png";
      tileRef.current = t;
    }
    redraw();
  }, [party]);

  // Whole-number scale from the container width (and device pixel ratio)
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const avail = wrap.clientWidth;
      let s = Math.max(1, Math.floor((avail * dpr) / STAGE_W));
      // Exact device pixels when that fills most of the width; on narrow
      // low-density screens draw one step bigger and let CSS fit it.
      const exact = (STAGE_W * s) / dpr >= avail * 0.85;
      if (!exact) s += 1;
      scaleRef.current = s;
      canvas.width = STAGE_W * s;
      canvas.height = STAGE_H * s;
      const cssW = exact ? (STAGE_W * s) / dpr : avail;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${(cssW * STAGE_H) / STAGE_W}px`;
      flashRef.current.clear();
      drawRef.current();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    return () => ro.disconnect();
  }, []);

  // The replay loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const font = getComputedStyle(document.body).fontFamily || "sans-serif";
    const timeline = log ? buildTimeline(log) : null;
    const maxHp = party.reduce((a, p) => a + p.stats.hp, 0);
    clockRef.current = 0;
    let lastStep = -1;
    let finished = false;

    const drawSprite = (p: DungeonSprite, i: number, hp: number, off: number, flash: boolean, alpha: number) => {
      const s = scaleRef.current;
      const { x, y } = partyPos(i);
      const left = x - SPRITE / 2 + off, top = y - SPRITE;
      const img = imagesRef.current.get(p.id);
      rect(ctx, s, left + 4, y - 1, SPRITE - 8, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = alpha;
      if (img?.complete && img.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = !p.pixel;
        ctx.imageSmoothingQuality = "high";
        const size = SPRITE * s;
        ctx.drawImage(img, Math.round(left) * s, Math.round(top) * s, size, size);
        if (flash) ctx.drawImage(silhouette(flashRef.current, p.id, img, size, !p.pixel), Math.round(left) * s, Math.round(top) * s);
      } else {
        rect(ctx, s, left + 8, top + 8, SPRITE - 16, SPRITE - 8, "#2A3460");
      }
      ctx.globalAlpha = 1;
      if (hp > 0) hpBar(ctx, s, x + off, top - 3, 20, hp, p.stats.hp, "#00E436");
    };

    const drawEnemy = (e: EnemyUnit, i: number, hp: number, off: number, flash: boolean, alpha: number) => {
      const s = scaleRef.current;
      const art = ENEMY_ART[e.kind];
      const px = enemyScale(e);
      const { w, h } = artSize(art);
      const { x, y } = enemyPos(i, e);
      const left = x - Math.floor((w * px) / 2) + off, top = y - h * px;
      rect(ctx, s, left + 2, y - 1, w * px - 4, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = alpha;
      drawArt(ctx, s, art, left, top, px, flash ? "#FFFFFF" : null);
      if (e.boss) drawArt(ctx, s, CROWN, x - 7, top - 9, 2, flash ? "#FFFFFF" : null);
      ctx.globalAlpha = 1;
      if (hp > 0) hpBar(ctx, s, x + off, top - (e.boss ? 13 : 4), e.boss ? 30 : 16, hp, e.hp, "#FF004D");
    };

    const background = () => {
      const s = scaleRef.current;
      rect(ctx, s, 0, 0, STAGE_W, STAGE_H, "#131A31");
      const tile = tileRef.current;
      if (tile?.complete && tile.naturalWidth > 0) {
        ctx.imageSmoothingEnabled = false;
        const t = 48;
        for (let x = 0; x < STAGE_W; x += t) for (let y = -8; y < GROUND - 16; y += t) ctx.drawImage(tile, x * s, y * s, t * s, t * s);
        rect(ctx, s, 0, 0, STAGE_W, GROUND - 16, "rgba(19,26,49,0.72)");
        for (let x = 0; x < STAGE_W; x += 32) for (let y = GROUND - 16; y < STAGE_H; y += 32) ctx.drawImage(tile, x * s, y * s, 32 * s, 32 * s);
        rect(ctx, s, 0, GROUND - 16, STAGE_W, STAGE_H - GROUND + 16, "rgba(19,26,49,0.35)");
      } else {
        rect(ctx, s, 0, GROUND - 16, STAGE_W, STAGE_H - GROUND + 16, "#212B4E");
      }
      rect(ctx, s, 0, GROUND - 17, STAGE_W, 1, "#0B1022");
    };

    const drawIdle = () => {
      const s = scaleRef.current;
      background();
      // back row first so the front row overlaps it
      [...party.keys()].sort((a, b) => partyPos(a).y - partyPos(b).y).forEach((i) => drawSprite(party[i], i, party[i].stats.hp, 0, false, 1));
      if (party.length === 0) text(ctx, s, font, "Your party is empty", STAGE_W / 2, 52, "#C8CCE8", 8);
    };

    const drawStep = (st: Step, t: number, steps: Step[], idx: number) => {
      const s = scaleRef.current;
      background();
      const a = st.action;
      const impact = a !== null && t >= 0.45;
      // HP shown: before the action until impact, after it from impact on
      const partyHp = impact && idx + 1 < steps.length ? steps[idx + 1].partyHp : st.partyHp;
      const enemyHp = impact && idx + 1 < steps.length && steps[idx + 1].floorIndex === st.floorIndex ? steps[idx + 1].enemyHp : st.enemyHp;
      const lunge = a && a.kind === "hit" ? Math.round(Math.sin(Math.PI * Math.min(1, t / 0.7)) * 6) : 0;
      const showEnemies = st.kind !== "clear" && st.kind !== "end" ? true : false;
      const slideIn = st.kind === "intro" ? Math.round((1 - Math.min(1, t / 0.6)) * 60) : 0;

      // Enemies
      if (showEnemies || st.kind === "end") {
        st.enemies.forEach((e, i) => {
          const before = st.enemyHp[i];
          const fallingNow = a?.side === "party" && a.kind === "hit" && a.target === i && a.ko;
          if (before <= 0 && !fallingNow) return;
          if (st.kind === "end" && enemyHp[i] <= 0) return;
          const off = (a?.side === "enemy" && a.actor === i ? -lunge : 0) + slideIn;
          const flash = a?.side === "party" && a.kind === "hit" && a.target === i && t >= 0.45 && t < 0.65;
          const alpha = fallingNow && t >= 0.5 ? Math.max(0, Math.round((1 - (t - 0.5) * 2) * 4) / 4) : 1;
          drawEnemy(e, i, enemyHp[i], off, flash, alpha);
        });
      }

      // Party (back row first)
      [...party.keys()].sort((x, y) => partyPos(x).y - partyPos(y).y).forEach((i) => {
        const before = st.partyHp[i] ?? 0;
        const fallingNow = a?.side === "enemy" && a.target === i && a.ko;
        const down = before <= 0 && !fallingNow;
        const off = a?.side === "party" && a.actor === i ? lunge : 0;
        const flash = a?.side === "enemy" && a.target === i && t >= 0.45 && t < 0.65;
        const alpha = down ? 0.25 : fallingNow && t >= 0.5 ? Math.max(0.25, Math.round((1 - (t - 0.5) * 2) * 4) / 4) : 1;
        drawSprite(party[i], i, down ? 0 : partyHp[i] ?? 0, off, flash, alpha);
      });

      // Numbers
      if (a && impact) {
        const rise = Math.round((t - 0.45) * 22);
        let x: number, y: number;
        if (a.kind === "heal" || a.side === "enemy") {
          const p = partyPos(a.target);
          x = p.x; y = p.y - SPRITE - 4;
        } else {
          const e = st.enemies[a.target];
          const p = enemyPos(a.target, e);
          x = p.x; y = p.y - artSize(ENEMY_ART[e.kind]).h * enemyScale(e) - 4;
        }
        const color = a.kind === "heal" ? HEAL : a.side === "enemy" ? TAKEN : a.crit ? CRIT : PLAYER_HIT;
        const label = a.kind === "heal" ? `+${a.amount}` : a.crit ? `${a.amount}!` : `${a.amount}`;
        text(ctx, s, font, label, x, y - rise, color, a.crit ? 9 : 8);
      }

      // Banners
      if (st.kind === "intro") {
        const boss = st.enemies.find((e) => e.boss);
        text(ctx, s, font, `Floor ${st.floor}`, STAGE_W / 2, 18, "#FFF1E8", 10);
        if (boss) text(ctx, s, font, boss.name, STAGE_W / 2, 29, "#FFA300", 7);
      } else if (st.kind === "clear") {
        text(ctx, s, font, `Floor ${st.floor} cleared`, STAGE_W / 2, 22, "#00E436", 9);
      } else if (st.kind === "fall" || st.kind === "end") {
        text(ctx, s, font, `Your party fell on floor ${st.floor}`, STAGE_W / 2, 22, "#FFF1E8", 9);
      }
    };

    const describe = (st: Step): string => {
      const names = st.enemies.map((e) => e.name);
      const counts = new Map<string, number>();
      names.forEach((n) => counts.set(n, (counts.get(n) ?? 0) + 1));
      const list = [...counts].map(([n, c]) => (c > 1 ? `${c} × ${n}` : n)).join(", ");
      if (st.kind === "clear") return `Floor ${st.floor} cleared.`;
      if (st.kind === "fall" || st.kind === "end") return `Your party fell on floor ${st.floor}.`;
      return `Floor ${st.floor}: ${list}`;
    };

    const draw = () => {
      if (!timeline || timeline.steps.length === 0) { drawIdle(); return; }
      const { steps, total } = timeline;
      const tNow = Math.min(clockRef.current, total);
      const idx = stepAt(steps, tNow);
      const st = steps[idx];
      const t = st.ms > 0 ? Math.min(1, (tNow - st.start) / st.ms) : 1;
      drawStep(st, t, steps, idx);
      if (idx !== lastStep) {
        lastStep = idx;
        const hp = st.partyHp.reduce((x, y) => x + Math.max(0, y), 0);
        cbRef.current.onProgress?.({ floor: st.floor, hp, maxHp, line: describe(st), done: st.kind === "end" });
      }
      if (tNow >= total && !finished) {
        finished = true;
        cbRef.current.onDone?.();
      }
    };
    drawRef.current = draw;

    if (!timeline) { draw(); return; }
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev);
      prev = now;
      clockRef.current += dt * speedRef.current;
      draw();
      if (!finished) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [log, party]);

  // Skip to the end
  useEffect(() => {
    if (skipToken === 0) return;
    clockRef.current = Number.MAX_SAFE_INTEGER;
    drawRef.current();
  }, [skipToken]);

  return (
    <div ref={wrapRef} className="flex w-full justify-center overflow-hidden rounded-[10px] border border-white/[0.08] bg-[#0B1022]">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={log ? `Replay of your run: your party reached floor ${log.floor}.` : "Your party standing in the dungeon."}
        style={{ imageRendering: "pixelated", display: "block" }}
      />
    </div>
  );
}
