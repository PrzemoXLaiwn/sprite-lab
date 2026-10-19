"use client";

// =============================================================================
// Tower stage — a side cross-section of the tower; the party climbs it
// =============================================================================
// Everything is drawn on whole logical pixels at an integer scale. The camera
// follows the party up, room by room, in whole-pixel steps. The stage replays
// the floors the server sent (see replay.ts); it never decides an outcome.
// Juice (hit-stop, shake, sparks, flashes) is display only and is toned down
// when the player prefers reduced motion.
// =============================================================================

import { useEffect, useRef } from "react";
import { chestName } from "@/lib/dungeon/simulate";
import { ELEMENT_DEFS, TIER_COLOR, TIER_LABEL, ZONES, zoneFor, type Element } from "@/lib/dungeon/config";
import type { AnimRef } from "@/lib/dungeon/anims";
import { blessingView } from "@/lib/dungeon/blessings";
import type { FloorLog, EnemyUnit } from "@/lib/dungeon/simulate";
import type { PartyMember } from "@/lib/dungeon/store";
import { CROWN, ENEMY_ART, artSize, paletteFor } from "./enemy-art";
import { buildTimeline, stepAt, type Step } from "./replay";
import { animationSheetGeometry, type SheetGeometry } from "@/lib/workspace/history";
import { play, type Sfx } from "./sfx";
import {
  ROOM_H, SLAB, TOWER_W, WALL, ceilingY, drawChest, drawOuterWalls, drawRoom, drawSky, floorY, h2, px, roomHeight, stairPath,
  type ZoneId,
} from "./tower-art";

export interface StageProgress {
  floor: number;
  zone: string;
  hp: number;
  maxHp: number;
  combo: number;
  line: string;
  done: boolean;
}

export interface TowerFlag {
  floor: number;
  label: string;
  you: boolean;
}

interface Props {
  members: PartyMember[];
  /** Floors to replay; null = stand idle on `restFloor`. */
  floors: FloorLog[] | null;
  restFloor: number;
  restHp: number[] | null;
  bestBefore: number | null;
  flags: TowerFlag[];
  speed: number;
  skipToken: number;
  reducedMotion: boolean;
  onProgress?: (p: StageProgress) => void;
  onDone?: () => void;
}

/** Hero height in logical pixels; phones draw heroes bigger (the sprites carry their own transparent margin). */
const HERO = 30;
const HERO_PHONE = 40;
type Mode = "idle" | "attack" | "walk" | "hurt" | "defeat" | "static";
const IMPACT_MS = 140;

// ── positions (logical, relative to the tower's left edge) ───────────────────
function heroSpot(i: number): { x: number; dy: number } {
  return { x: 106 - i * 24, dy: i % 2 === 1 ? -6 : 0 };
}
function enemyScale(e: EnemyUnit): number {
  return e.boss ? 3 : 2;
}
function enemySpot(i: number, e: EnemyUnit): { x: number; dy: number } {
  if (e.boss) return { x: 176, dy: 0 };
  return { x: 142 + i * 19, dy: i % 2 === 1 ? -6 : 0 };
}
/** A party hit that knocks out a boss (its main target or one hit by the same attack). */
function bossFalls(st: Step): boolean {
  const a = st.action;
  if (!a || a.side !== "party" || a.kind !== "hit") return false;
  return Boolean((a.ko && st.enemies[a.target]?.boss) || a.extra?.some((x) => x.ko && st.enemies[x.target]?.boss));
}
const zoneId = (floor: number): ZoneId => zoneFor(Math.max(1, floor)).id;
const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
/** Hit tint for enemy pixels: halfway to white (a flash that keeps the shape readable). */
function lighten(hex: string): string {
  const n = parseInt(hex.slice(1, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.55);
  return `rgb(${mix((n >> 16) & 255)},${mix((n >> 8) & 255)},${mix(n & 255)})`;
}

/** Point along a polyline at progress u (0…1), by length. */
function along(points: [number, number][], u: number): { x: number; y: number; dx: number } {
  const lens = points.slice(1).map((p, i) => Math.hypot(p[0] - points[i][0], p[1] - points[i][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  let d = Math.max(0, Math.min(1, u)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const k = lens[i] ? Math.min(1, d / lens[i]) : 1;
      const [a, b] = [points[i], points[i + 1]];
      return { x: a[0] + (b[0] - a[0]) * k, y: a[1] + (b[1] - a[1]) * k, dx: b[0] - a[0] };
    }
    d -= lens[i];
  }
  const last = points[points.length - 1];
  return { x: last[0], y: last[1], dx: 0 };
}

export function TowerStage({ members, floors, restFloor, restHp, bestBefore, flags, speed, skipToken, reducedMotion, onProgress, onDone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef({ s: 3, vw: 200, vh: 150, hero: HERO });
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const geoRef = useRef(new Map<string, SheetGeometry>());
  const speedRef = useRef(speed);
  const clockRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  const cbRef = useRef({ onProgress, onDone });
  const propsRef = useRef({ flags, reducedMotion, restFloor, restHp, bestBefore });

  useEffect(() => { speedRef.current = speed; }, [speed]);
  useEffect(() => { cbRef.current = { onProgress, onDone }; }, [onProgress, onDone]);
  useEffect(() => {
    propsRef.current = { flags, reducedMotion, restFloor, restHp, bestBefore };
    drawRef.current();
  }, [flags, reducedMotion, restFloor, restHp, bestBefore]);

  // The heroes' sprites and their animation sheets (gear is not drawn on the stage)
  useEffect(() => {
    const redraw = () => drawRef.current();
    const load = (key: string, url: string, onload?: (img: HTMLImageElement) => void) => {
      if (imagesRef.current.has(key)) return;
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { onload?.(img); redraw(); };
      img.src = url;
      imagesRef.current.set(key, img);
    };
    for (const m of members) {
      load(m.hero.id, m.hero.imageUrl);
      for (const ref of [...Object.values(m.anims ?? {}), ...(m.skills ?? []).map((k) => k.anim)]) {
        if (!ref) continue;
        load(`anim:${ref.url}`, ref.url, (img) => {
          const geo = animationSheetGeometry({ frameCount: ref.frameCount, walkSet: ref.walkSet }, img.naturalWidth, img.naturalHeight);
          if (geo) geoRef.current.set(ref.url, geo);
        });
      }
    }
    redraw();
  }, [members]);

  // Integer scale: the tower fits the width and at least ~1.7 rooms fit the height
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.round(wrap.clientWidth * dpr)), ch = Math.max(1, Math.round(wrap.clientHeight * dpr));
      // Whole-number scale: the tower fits the width, a room and a half fits the height.
      // Below ×2 (narrow low-density screens) draw at ×2 on a larger canvas and let CSS fit it.
      // Phones: let the outer walls run off the edges so the heroes get a bigger whole-number scale
      const fitW = wrap.clientWidth < 520 ? TOWER_W - 10 : TOWER_W + 16;
      const natural = Math.min(Math.floor(cw / fitW), Math.floor(ch / (ROOM_H * 1.5)));
      const s = Math.max(2, natural);
      const k = natural >= 2 ? 1 : Math.max(1, (fitW * 2) / cw);
      const bw = Math.round(cw * k), bh = Math.round(ch * k);
      canvas.width = bw;
      canvas.height = bh;
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      sizeRef.current = { s, vw: Math.ceil(bw / s), vh: Math.ceil(bh / s), hero: wrap.clientWidth < 520 ? HERO_PHONE : HERO };
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
    const bodyFont = getComputedStyle(document.body).fontFamily || "sans-serif";
    const displayFont = (fontRef.current && getComputedStyle(fontRef.current).fontFamily) || bodyFont;
    const timeline = floors && floors.length ? buildTimeline(floors, { bestBefore: propsRef.current.bestBefore }) : null;
    const maxHp = members.reduce((a, m) => a + m.stats.hp, 0);
    clockRef.current = 0;
    let lastStep = -1;
    let finished = false;

    const text = (str: string, x: number, y: number, color: string, size: number, display = false) => {
      const s = sizeRef.current.s;
      ctx.font = `700 ${Math.round(size * s)}px ${display ? displayFont : bodyFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, Math.round(s * 1.6));
      ctx.strokeStyle = "#0B1022";
      ctx.strokeText(str, Math.round(x) * s, Math.round(y) * s);
      ctx.fillStyle = color;
      ctx.fillText(str, Math.round(x) * s, Math.round(y) * s);
    };

    const image = (id: string | undefined) => {
      const img = id ? imagesRef.current.get(id) : undefined;
      return img?.complete && img.naturalWidth > 0 ? img : null;
    };

    // Hit / revive feedback: a brief colour tint over the sprite, never a solid fill
    const scratch = document.createElement("canvas");
    const tinted = (img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, w: number, h: number, smooth: boolean, tint: string) => {
      scratch.width = w;
      scratch.height = h;
      const g = scratch.getContext("2d");
      if (!g) return scratch;
      g.imageSmoothingEnabled = smooth;
      g.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = tint;
      g.fillRect(0, 0, w, h);
      g.globalCompositeOperation = "source-over";
      return scratch;
    };

    /**
     * A hero from its own animation sheet when it has one for `mode` (frames at a fixed
     * height, bottom-aligned: the feet stay put and the size never changes), else its
     * still sprite. No fake motion: without a sheet the sprite simply doesn't animate.
     */
    const drawHero = (m: PartyMember, x: number, groundY: number, hp: number, o: { mode: Mode; e?: number; dur?: number; flip?: boolean; left?: boolean; tint?: string | null; alpha?: number; anim?: AnimRef }) => {
      const { s } = sizeRef.current;
      const ref = o.mode === "static" ? undefined : o.anim ?? m.anims?.[o.mode];
      const sheet = ref ? image(`anim:${ref.url}`) : null;
      const geo = ref ? geoRef.current.get(ref.url) : undefined;
      let src: { img: HTMLImageElement; sx: number; sy: number; sw: number; sh: number } | null = null;
      if (ref && sheet && geo) {
        const frames = ref.walkSet ? geo.cols : ref.frameCount;
        const e = o.e ?? 0;
        let fi: number;
        if (o.mode === "idle") fi = Math.floor((performance.now() * ref.fps) / 1000) % frames;
        else if (o.mode === "walk") fi = Math.floor((e * ref.fps) / 1000) % frames;
        else fi = Math.min(frames - 1, Math.floor((o.dur ? e / o.dur : (e * ref.fps) / 1000 / frames) * frames));
        const row = ref.walkSet ? (o.left ? 3 : 1) : 0;
        src = { img: sheet, sx: (fi % geo.cols) * geo.frameWidth, sy: row * geo.frameHeight, sw: geo.frameWidth, sh: geo.frameHeight };
      } else {
        const img = image(m.hero.id);
        if (img) src = { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
      }
      const H = sizeRef.current.hero;
      const h = H, w = src ? Math.max(8, Math.round((H * src.sw) / src.sh)) : H;
      const left = Math.round(x - w / 2), top = Math.round(groundY - h);
      px(ctx, s, x - 9, groundY - 1, 18, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = o.alpha ?? 1;
      ctx.save();
      if (o.flip && !ref?.walkSet) {
        ctx.translate((left * 2 + w) * s, 0);
        ctx.scale(-1, 1);
      }
      if (src) {
        const smooth = !m.hero.pixel;
        ctx.imageSmoothingEnabled = smooth;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, left * s, top * s, w * s, h * s);
        if (o.tint) ctx.drawImage(tinted(src.img, src.sx, src.sy, src.sw, src.sh, w * s, h * s, smooth, o.tint), left * s, top * s);
      } else {
        px(ctx, s, left + 8, top + 8, w - 16, h - 8, "#2A3460");
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (hp > 0) {
        const bw = 14, bx = Math.round(x - bw / 2), by = top - 4;
        px(ctx, s, bx - 1, by - 1, bw + 2, 4, "#0B1022");
        px(ctx, s, bx, by, bw, 2, "#2A3460");
        const fill = Math.ceil((Math.max(0, hp) / m.stats.hp) * bw);
        if (fill > 0) px(ctx, s, bx, by, fill, 2, "#00E436");
      }
      return top;
    };

    /** A small orange marker over whoever is acting: makes turns readable. */
    const actorMark = (x: number, y: number) => {
      const { s } = sizeRef.current;
      px(ctx, s, x - 2, y - 4, 5, 1, "#FFA300");
      px(ctx, s, x - 1, y - 3, 3, 1, "#FFA300");
      px(ctx, s, x, y - 2, 1, 1, "#FFA300");
    };
    /** Red corner ticks at a target's feet when a hit lands. */
    const targetMark = (x: number, y: number, half: number) => {
      const { s } = sizeRef.current;
      for (const dx of [-half, half - 3]) px(ctx, s, x + dx, y + 1, 3, 1, "#FF004D");
    };

    const drawEnemy = (e: EnemyUnit, x: number, groundY: number, hp: number, flash: boolean, alpha: number, bob = 0) => {
      const { s } = sizeRef.current;
      const art = ENEMY_ART[e.kind];
      const pal = paletteFor(art, e.element);
      const p = enemyScale(e);
      const { w, h } = artSize(art);
      const left = Math.round(x - (w * p) / 2), top = Math.round(groundY - h * p) - bob;
      px(ctx, s, left + 2, groundY - 1, w * p - 4, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = alpha;
      art.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          const c = row[rx];
          if (c !== ".") px(ctx, s, left + rx * p, top + ry * p, p, p, flash ? lighten(pal[c] ?? "#FF00FF") : pal[c] ?? "#FF00FF");
        }
      });
      if (e.boss) {
        CROWN.rows.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] !== ".") px(ctx, s, x - 7 + rx * 2, top - 9 + ry * 2, 2, 2, flash ? lighten(CROWN.palette[row[rx]]) : CROWN.palette[row[rx]]);
        });
      }
      ctx.globalAlpha = 1;
      if (hp > 0) {
        // Bosses get a long, thick bar with their name above it
        const bw = e.boss ? 40 : 12, bh = e.boss ? 3 : 2, bx = Math.round(x - bw / 2), by = top - (e.boss ? 13 : 5) + bob;
        px(ctx, s, bx - 1, by - 1, bw + 2, bh + 2, "#0B1022");
        px(ctx, s, bx, by, bw, bh, "#2A3460");
        const fill = Math.ceil((hp / e.hp) * bw);
        if (fill > 0) px(ctx, s, bx, by, fill, bh, hp / e.hp < 0.3 ? "#FF5A3C" : "#FF004D");
        if (e.element !== "neutral") px(ctx, s, bx + bw + 2, by - 1, 3, bh + 1, ELEMENT_DEFS[e.element].color);
        if (e.boss) text(e.name, x, by - 3, "#FFA300", 6, true);
      }
    };

    /** Sparks / poof: deterministic per step, whole pixels. */
    const burst = (seed: number, cx: number, cy: number, e: number, color: string, count: number, power: number, life = 380) => {
      if (e < 0 || e > life) return;
      const { s } = sizeRef.current;
      const k = e / life;
      ctx.globalAlpha = Math.max(0, Math.round((1 - k) * 4) / 4);
      for (let i = 0; i < count; i++) {
        const ang = h2(seed, i) * Math.PI * 2;
        const v = power * (0.5 + h2(i, seed + 1));
        const x = cx + Math.cos(ang) * v * k * 12;
        const y = cy + Math.sin(ang) * v * k * 12 + k * k * 10;
        px(ctx, s, x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, color);
      }
      ctx.globalAlpha = 1;
    };

    const camCenter = (f: number) => floorY(f) - roomHeight(f) / 2 - 4;

    const scene = (st: Step | null, t: number, steps: Step[] | null, idx: number) => {
      const { s, vw, vh } = sizeRef.current;
      const { flags: fl, reducedMotion: rm, restFloor: rf, restHp: rh } = propsRef.current;
      const e = st ? t * st.ms : 0;
      const floor = st ? st.floor : rf;
      const a = st?.action ?? null;

      // Camera (whole pixels), easing up during a climb
      let cy = camCenter(floor);
      if (st?.kind === "climb") cy = camCenter(floor - 1) + (camCenter(floor) - camCenter(floor - 1)) * ease((t - 0.2) / 0.65);
      let shake = 0;
      if (!rm && st) {
        if (st.kind === "act" && a && a.kind === "hit" && (a.crit || (a.ko && st.enemies[a.target]?.boss)) && e >= IMPACT_MS && e < IMPACT_MS + 160) {
          shake = [3, -3, 2, -2, 1, -1][Math.floor((e - IMPACT_MS) / 27) % 6] * (a.ko && st.enemies[a.target]?.boss ? 2 : 1);
        }
        if (st.kind === "gate" && t > 0.15 && t < 0.75) shake = [1, -1][Math.floor(e / 50) % 2];
        if (st.kind === "act" && a?.skill?.rule === "legendary" && e >= IMPACT_MS && e < IMPACT_MS + 240) shake = [3, -3, 2, -2, 1, -1][Math.floor((e - IMPACT_MS) / 40) % 6];
        // A boss's blow lands heavy
        if (st.kind === "act" && a?.side === "enemy" && a.kind === "hit" && st.enemies[a.actor]?.boss && e >= IMPACT_MS && e < IMPACT_MS + 180) {
          shake = [2, -2, 2, -1, 1, -1][Math.floor((e - IMPACT_MS) / 30) % 6];
        }
        // The boss lands as it enters
        if (st.kind === "intro" && st.boss && t > 0.75 && t < 0.95) shake = [2, -2, 1, -1][Math.floor(e / 40) % 4];
      }
      // Never show more than a strip of ground below the tower (the start button sits there)
      const camTop = Math.min(Math.round(cy - vh / 2), SLAB + 54 - vh);
      const x0 = Math.floor((vw - TOWER_W) / 2) + shake;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      drawSky(ctx, s, vw, vh, camTop);

      // Rooms in view (and the entrance hall at the bottom)
      const lowest = Math.max(0, floor - 3), highest = floor + 3;
      for (let f = lowest; f <= highest; f++) {
        const top = ceilingY(f) - camTop, bottom = floorY(f) - camTop + SLAB;
        if (bottom < 0 || top > vh) continue;
        const isBoss = f > 0 && f % 5 === 0;
        let gate = f < floor ? 1 : 0;
        if (f === floor && st) gate = st.kind === "gate" ? ease((t - 0.25) / 0.5) : st.kind === "climb" ? 0 : 1;
        if (f === floor && !st) gate = 1;
        drawRoom(ctx, s, zoneId(f), f, x0, camTop, isBoss, gate);
        // Zone sign on the first floor of each zone
        const z = ZONES.find((zz) => zz.from === f);
        if (z) text(z.name, x0 + TOWER_W - 34, ceilingY(f) - camTop + SLAB + 9, "rgba(255,241,232,0.55)", 6);
        // Flags: your best, this week's top 3
        fl.filter((g) => g.floor === f).forEach((g, k) => {
          // Labels run ~50 px wide: flags on one floor sit far enough apart not to overlap
          const fx = x0 + WALL + 4 + k * 56, fy = ceilingY(f) - camTop + SLAB + 4;
          px(ctx, s, fx, fy, 1, 16, "#C8CCE8");
          px(ctx, s, fx + 1, fy, 9, 6, g.you ? "#FFA300" : "#29ADFF");
          px(ctx, s, fx + 1, fy + 6, 5, 2, g.you ? "#FFA300" : "#29ADFF");
          ctx.textAlign = "left";
          ctx.font = `700 ${Math.round(5 * s)}px ${bodyFont}`;
          ctx.fillStyle = "#FFF1E8";
          ctx.fillText(g.label, (fx + 12) * s, (fy + 6) * s);
        });
      }
      drawOuterWalls(ctx, s, zoneId(floor), x0, -4, Math.min(vh + 4, -camTop + SLAB));
      // Ground and door below the entrance hall
      const groundY = 0 - camTop + SLAB;
      if (groundY < vh) {
        px(ctx, s, 0, groundY, vw, vh - groundY + 1, "#0B1022");
        px(ctx, s, x0 + 10, groundY - 20, 14, 20, "#2A1A12");
        px(ctx, s, x0 + 12, groundY - 18, 10, 18, "#3B2618");
      }

      // ── Party ─────────────────────────────────────────────────────────────
      const ground = floorY(floor) - camTop;
      const hpNow = st ? (st.kind === "act" && a && e >= IMPACT_MS && steps && steps[idx + 1] ? steps[idx + 1].partyHp : st.partyHp) : rh ?? members.map((m) => m.stats.hp);
      const enemyHpNow = st ? (st.kind === "act" && a && e >= IMPACT_MS && steps && steps[idx + 1] && steps[idx + 1].floorIndex === st.floorIndex ? steps[idx + 1].enemyHp : st.enemyHp) : [];

      const order = [...members.keys()].sort((p, q) => heroSpot(p).dy - heroSpot(q).dy);
      if (st?.kind === "climb") {
        const from = floor - 1;
        const sp = stairPath(from);
        const gFrom = floorY(from) - camTop, gTo = floorY(floor) - camTop;
        order.forEach((i) => {
          const spot = heroSpot(i);
          const pts: [number, number][] = [
            [x0 + spot.x, gFrom + spot.dy], [x0 + sp.x0, gFrom], [x0 + sp.x1, sp.y1 - camTop], [x0 + sp.x1, gTo], [x0 + spot.x, gTo + spot.dy],
          ];
          const u = ease((t - i * 0.04) / 0.86);
          const p = along(pts, u);
          const moving = u > 0 && u < 1;
          const hp = hpNow[i] ?? 0;
          const m = members[i];
          // Real walk sheet while moving; without one the still sprite just glides (no fake steps)
          const mode: Mode = hp <= 0 ? "static" : moving ? (m.anims?.walk ? "walk" : "static") : "idle";
          drawHero(m, p.x, Math.round(p.y), hp, { mode, e, flip: p.dx < 0 && moving, left: p.dx < 0, alpha: hp > 0 ? 1 : 0.3 });
        });
      } else {
        order.forEach((i) => {
          const spot = heroSpot(i);
          const m = members[i];
          // Revives: mid-fight (action) or as the floor starts (Phoenix feather picked while down)
          const reviving = (a?.kind === "revive" && a.target === i) || (st?.kind === "revive" && st.event?.target === i);
          const upAt = st?.kind === "revive" ? 300 : IMPACT_MS;
          const revived = reviving && e >= upAt;
          const hp = st?.kind === "revive" && st.event?.target === i ? (revived ? st.event.amount : 0) : hpNow[i] ?? 0;
          const before = st ? st.partyHp[i] ?? 0 : hp;
          const isActor = Boolean(a && a.side === "party" && a.actor === i && a.kind === "hit");
          const skillAnim = isActor && a?.skill && a.skill.rule !== "basic" ? m.skills?.find((k) => k.id === a.skill!.animId)?.anim : undefined;
          const hasAttack = Boolean(skillAnim ?? m.anims?.attack);
          // With a real attack animation the hero steps in a little; without one, a short lunge only
          const reach = hasAttack ? 4 : 7;
          const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e < IMPACT_MS ? e / (IMPACT_MS * 2) : 0.5 + Math.max(0, e - IMPACT_MS - (a!.crit || a!.ko ? 150 : 0)) / 300)) * reach) : 0;
          const struck = Boolean(a && a.side === "enemy" && a.kind === "hit" && a.target === i && e >= IMPACT_MS);
          const fallingNow = Boolean(a && a.side === "enemy" && a.target === i && a.ko);
          const down = before <= 0 && !fallingNow && !revived;
          let mode: Mode = "idle";
          let me = e, dur: number | undefined;
          if (down) { mode = m.anims?.defeat ? "defeat" : "static"; me = 1e9; }
          else if (fallingNow && e >= IMPACT_MS) { mode = m.anims?.defeat ? "defeat" : "static"; me = e - IMPACT_MS; dur = 450; }
          else if (isActor) { mode = hasAttack ? "attack" : "idle"; dur = st!.ms * 0.9; }
          else if (struck && e < IMPACT_MS + 320 && m.anims?.hurt) { mode = "hurt"; me = e - IMPACT_MS; dur = 320; }
          const alpha = down ? (m.anims?.defeat ? 0.75 : 0.3) : fallingNow && e >= IMPACT_MS && !m.anims?.defeat ? Math.max(0.3, Math.round((1 - (e - IMPACT_MS) / 400) * 4) / 4) : 1;
          const tint = !rm && struck && e < IMPACT_MS + 110 ? "rgba(255,72,72,0.45)" : revived && e < upAt + 200 ? "rgba(255,227,107,0.5)" : null;
          const top = drawHero(m, x0 + spot.x + lunge, ground + spot.dy, hp, { mode, e: me, dur, alpha, tint, anim: mode === "attack" ? skillAnim : undefined });
          if (st?.kind === "act" && a && a.side === "party" && a.actor === i) actorMark(x0 + spot.x + lunge, top - 6);
          if (struck && e < IMPACT_MS + 260) targetMark(x0 + spot.x, ground + spot.dy, 10);
          if (revived) burst(idx * 37 + i, x0 + spot.x, ground + spot.dy - 14, e - upAt, "#FFE36B", 18, 1.8, 700);
          if (fallingNow && e >= IMPACT_MS) burst(idx * 31 + i, x0 + spot.x, ground + spot.dy - 10, e - IMPACT_MS, "#C8CCE8", 10, 1.2, 420);
        });
      }

      // ── Enemies ───────────────────────────────────────────────────────────
      if (st && st.kind !== "climb" && st.kind !== "revive" && st.kind !== "clear" && st.kind !== "chest" && st.kind !== "record") {
        const appear = st.kind === "intro" ? ease(t / 0.8) : 1;
        st.enemies.forEach((en, i) => {
          const before = st.enemyHp[i];
          const fallingNow = a?.side === "party" && a.kind === "hit" && ((a.target === i && a.ko) || a.extra?.some((x) => x.target === i && x.ko));
          if (before <= 0 && !fallingNow) return;
          if (st.kind === "end" && enemyHpNow[i] <= 0) return;
          const spot = enemySpot(i, en);
          const isActor = a?.side === "enemy" && a.actor === i;
          const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e / (IMPACT_MS * 2))) * (en.boss ? 14 : 7)) : 0;
          // A boss breathes while it waits (whole pixels; off with reduced motion)
          const bob = en.boss && !isActor && !rm ? Math.round((Math.sin(performance.now() / 260) + 1)) : 0;
          const slide = Math.round((1 - appear) * 30);
          const struck = a?.side === "party" && a.kind === "hit" && (a.target === i || a.extra?.some((x) => x.target === i));
          const flash = Boolean(struck) && e >= IMPACT_MS && e < IMPACT_MS + 90 && !rm;
          const fade = fallingNow && e >= IMPACT_MS + 60 ? Math.max(0, Math.round((1 - (e - IMPACT_MS - 60) / 240) * 4) / 4) : 1;
          drawEnemy(en, x0 + spot.x - lunge + slide, ground + spot.dy, enemyHpNow[i] ?? 0, flash, (st.kind === "intro" ? Math.round(appear * 4) / 4 : 1) * fade, bob);
          const eh = artSize(ENEMY_ART[en.kind]).h * enemyScale(en);
          if (isActor && st.kind === "act") actorMark(x0 + spot.x - lunge, ground + spot.dy - eh - (en.boss ? 18 : 9));
          if (struck && e >= IMPACT_MS && e < IMPACT_MS + 260) targetMark(x0 + spot.x, ground + spot.dy, en.boss ? 18 : 10);
          // Stun: from a Legendary hit, or this enemy losing its turn
          const stunnedNow = (a?.stun?.includes(i) && e >= IMPACT_MS + 420) || (a?.kind === "stunned" && a.actor === i);
          if (stunnedNow) {
            const sy = ground + spot.dy - eh - (en.boss ? 22 : 12);
            text("Stunned", x0 + spot.x, sy - Math.round(Math.min(1, e / 600) * 6), "#FFE36B", 6, true);
            for (let k = 0; k < 3; k++) {
              const ang = (e / 180 + (k * Math.PI * 2) / 3);
              px(ctx, sizeRef.current.s, x0 + spot.x + Math.round(Math.cos(ang) * 7), sy + 6 + Math.round(Math.sin(ang) * 2), 1, 1, "#FFE36B");
            }
          }
          if (fallingNow && e >= IMPACT_MS) {
            const big = en.boss;
            burst(idx * 17 + i, x0 + spot.x, ground + spot.dy - (big ? 18 : 8), e - IMPACT_MS, big ? "#FFA300" : "#C8CCE8", big ? 26 : 10, big ? 2.4 : 1.2, big ? 700 : 420);
            if (big) burst(idx * 19 + i, x0 + spot.x, ground - 18, e - IMPACT_MS - 80, "#FFF1E8", 18, 1.8, 600);
          }
        });
      }

      // ── Strike effects: a bolt from casters and healers, a slash for melee, claws on heroes ──
      if (st?.kind === "act" && a?.kind === "hit") {
        const elColor = a.element === "neutral" ? "#FFF1E8" : ELEMENT_DEFS[a.element].color;
        if (a.side === "party") {
          const en = st.enemies[a.target];
          if (en) {
            const me = heroSpot(a.actor), to = enemySpot(a.target, en);
            const eh = artSize(ENEMY_ART[en.kind]).h * enemyScale(en);
            const tx = x0 + to.x, ty = ground + to.dy - Math.round(eh / 2);
            const cls = members[a.actor]?.stats.classId;
            const ranged = cls === "caster" || cls === "healer";
            if (ranged && e < IMPACT_MS) {
              const u = e / IMPACT_MS;
              const fx = x0 + me.x + 6, fy = ground + me.dy - Math.round(sizeRef.current.hero * 0.6);
              const bx = Math.round(fx + (tx - fx) * u), by = Math.round(fy + (ty - fy) * u - Math.sin(Math.PI * u) * 6);
              ctx.globalAlpha = 0.5;
              px(ctx, s, bx - 5, by, 3, 1, elColor);
              ctx.globalAlpha = 1;
              px(ctx, s, bx - 1, by - 1, 3, 3, elColor);
              px(ctx, s, bx, by, 1, 1, "#FFF1E8");
            }
            if (!ranged && e >= IMPACT_MS && e < IMPACT_MS + 150) {
              // Three frames of a diagonal cut across the target, whole pixels
              const f = Math.floor((e - IMPACT_MS) / 50);
              const len = en.boss ? 14 : 9;
              for (let k = 0; k < len; k++) {
                const sx = tx - Math.floor(len / 2) + k + f, sy = ty - Math.floor(len / 2) + k - f;
                px(ctx, s, sx, sy, 1, 1, k === Math.floor(len / 2) ? "#FFF1E8" : elColor);
                if (f === 1) px(ctx, s, sx + 1, sy, 1, 1, elColor);
              }
            }
          }
        } else if (e >= IMPACT_MS && e < IMPACT_MS + 170) {
          // Claw marks on the hero that was hit
          const me = heroSpot(a.target);
          const hx = x0 + me.x, hy = ground + me.dy - Math.round(sizeRef.current.hero / 2);
          const claw = st.enemies[a.actor]?.boss ? "#FF5A3C" : "#FF8A8A";
          for (let c = -1; c <= 1; c++) for (let k = 0; k < 6; k++) px(ctx, s, hx + c * 3 + k - 3, hy + k - 3, 1, 1, claw);
        }
      }

      // ── Action numbers and sparks ─────────────────────────────────────────
      if (st?.kind === "act" && a && e >= IMPACT_MS) {
        const k = e - IMPACT_MS;
        const rise = Math.round(Math.min(1, k / 500) * 14);
        const show = (x: number, y: number, amount: number, crit: boolean, matchup: string, el: Element, enemySide: boolean, n: number) => {
          const elColor = ELEMENT_DEFS[el].color;
          const color = matchup === "weak" ? elColor : crit ? "#FFE36B" : enemySide ? "#FF8A8A" : "#FFF1E8";
          text(`${amount}${crit ? "!" : ""}`, x, y - rise, color, crit ? 12 : matchup === "weak" ? 10 : 8, true);
          if (matchup === "weak") text("WEAK!", x, y - rise - (crit ? 12 : 10), elColor, 6);
          if (matchup === "resist") text("resist", x, y - rise - 8, "#A7ADD4", 5);
          burst(idx * 13 + n, x, y + 6, k, crit ? "#FFE36B" : elColor, crit ? 12 : 6, crit ? 1.6 : 1, 320);
        };
        if (a.kind === "hit" && a.side === "party") {
          const targets = [{ target: a.target, amount: a.amount, matchup: a.matchup }, ...(a.extra ?? [])];
          targets.forEach((tg, n) => {
            const en = st.enemies[tg.target];
            if (!en) return;
            const spot = enemySpot(tg.target, en);
            // Above a boss's name and bar, not on them
            const h = artSize(ENEMY_ART[en.kind]).h * enemyScale(en) + (en.boss ? 18 : 0);
            show(x0 + spot.x, ground + spot.dy - h - 6, tg.amount, a.crit, tg.matchup, a.element, false, n);
            if (n === 0) {
              // Run upgrades that touched this hit, one tag each, stacked above the number
              const tags: [string, string][] = [];
              if (a.ambush) tags.push(["Ambush!", "#FFA300"]);
              if (a.execute) tags.push(["Execute!", "#FF5A3C"]);
              if (a.double) tags.push(["Twin strike!", "#B35CFF"]);
              tags.forEach(([label, col], k) => text(label, x0 + spot.x, ground + spot.dy - h - 26 - k * 8 - rise, col, 6, true));
            }
          });
          if (a.lastStand) {
            const me = heroSpot(a.actor);
            text("Last stand!", x0 + me.x, ground + me.dy + 9, "#FF5A3C", 6, true);
          }
          // Leech: the attacker heals, in green
          if (a.leech) {
            const me = heroSpot(a.actor);
            text(`+${a.leech}`, x0 + me.x, ground + me.dy - sizeRef.current.hero - 8 - rise, "#00E436", 8, true);
          }
        } else if (a.kind === "hit") {
          const spot = heroSpot(a.target);
          show(x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 8, a.amount, a.crit, a.matchup, a.element, true, 0);
          if (a.taunt) text("Taunt!", x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 22 - rise, "#29ADFF", 6, true);
          if (a.rally) text("Vengeance!", vw / 2, 66, "#FF5A3C", 9, true);
          if (a.ward) text("Ward", x0 + spot.x, ground + spot.dy + 9, ELEMENT_DEFS[a.element].color, 6, true);
        } else if (a.kind === "revive") {
          const spot = heroSpot(a.target);
          text("REVIVED!", x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 10 - rise, "#FFE36B", 10, true);
          text(`+${a.amount} HP`, x0 + spot.x, ground + spot.dy - sizeRef.current.hero + 1 - rise, "#00E436", 7, true);
        } else {
          const spot = heroSpot(a.target);
          text(`+${a.amount}`, x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 8 - rise, "#00E436", 8, true);
          burst(idx * 7, x0 + spot.x, ground + spot.dy - 10, k, "#00E436", 8, 0.8, 400);
        }
      }

      // ── Banners and moments ───────────────────────────────────────────────
      const cx = vw / 2;
      const BY = 50; // banners sit below the HUD plates
      if (st?.kind === "gate") {
        // The boss hall: the tower dims, then the boss is named
        const boss = st.enemies.find((en) => en.boss);
        const dim = rm ? 0.4 : (Math.round(Math.min(1, t * 2.5) * 4) / 4) * 0.45;
        ctx.fillStyle = `rgba(11,16,34,${dim})`;
        ctx.fillRect(0, 0, vw * s, vh * s);
        text(`Floor ${st.floor}`, cx, BY - 4, "#C8CCE8", 7, true);
        if (boss) {
          text("BOSS", cx, BY + 8, "#FF004D", 8, true);
          text(boss.name, cx, BY + 24, "#FFA300", 15, true);
          text(zoneFor(st.floor).name, cx, BY + 35, "#C8CCE8", 6);
        }
      } else if (st?.kind === "climb" && t > 0.6) {
        text(`Floor ${st.floor}`, cx, BY, "#FFF1E8", 10, true);
      } else if (st?.kind === "record") {
        if (!rm && t < 0.25) {
          ctx.fillStyle = `rgba(255,241,232,${Math.round((0.25 - t) * 8 * 4) / 4 * 0.5})`;
          ctx.fillRect(0, 0, vw * s, vh * s);
        }
        text("New record", cx, vh / 2 - 6, "#FFA300", 16, true);
        text(`Past your best floor ${st.floor - 1}`, cx, vh / 2 + 8, "#FFF1E8", 7);
        burst(idx, cx, vh / 2 - 10, e, "#FFA300", 30, 3, 1100);
      } else if (st?.kind === "revive" && st.event) {
        const spot = heroSpot(st.event.target);
        text("Phoenix feather", cx, BY, "#FFE36B", 9, true);
        if (e >= 300) {
          const r = Math.round(Math.min(1, (e - 300) / 500) * 12);
          text("REVIVED!", x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 10 - r, "#FFE36B", 10, true);
          text(`+${st.event.amount} HP`, x0 + spot.x, ground + spot.dy - sizeRef.current.hero + 1 - r, "#00E436", 7, true);
        }
      } else if (st?.kind === "clear") {
        text(`Floor ${st.floor} cleared`, cx, BY, "#00E436", 8, true);
        // Rest + Second wind / Mending moss: what each standing hero got back
        st.restHeal?.forEach((h, i) => {
          if (h <= 0) return;
          const spot = heroSpot(i);
          text(`+${h}`, x0 + spot.x, ground + spot.dy - sizeRef.current.hero - 8 - Math.round(t * 12), "#00E436", 8, true);
        });
      } else if (st?.kind === "chest" && st.chest) {
        const chestX = x0 + 106, drop = Math.round((1 - ease(t / 0.35)) * 40);
        const bounce = t > 0.35 && t < 0.45 ? 2 : 0;
        drawChest(ctx, s, chestX, ground - drop - bounce, ease((t - 0.45) / 0.15));
        if (t > 0.6) {
          const b = blessingView(st.chest);
          text(chestName(st.chest), chestX + 7, ground - 26 - Math.round((t - 0.6) * 20), "#FFE36B", 8, true);
          if (b) text(b.text, chestX + 7, ground - 16 - Math.round((t - 0.6) * 20), "#FFF1E8", 6);
          burst(idx * 3, chestX + 7, ground - 12, e - 900, "#FFE36B", 14, 1.4, 600);
        }
      }
      // Skill banner in the tier colour; Legendary adds a screen-wide flash (shake is in the camera)
      if (st?.kind === "act" && a?.skill && a.skill.rule !== "basic") {
        const col = TIER_COLOR[a.skill.tier];
        const yy = BY - 4 + (e < 120 ? Math.round((1 - e / 120) * -6) : 0);
        text(TIER_LABEL[a.skill.tier], cx, yy, col, 7, true);
        text(a.skill.name, cx, yy + 13, "#FFF1E8", 11, true);
        if (a.skill.rule === "legendary" && !rm && e >= IMPACT_MS && e < IMPACT_MS + 110) {
          ctx.fillStyle = "rgba(255,163,0,0.22)";
          ctx.fillRect(0, 0, vw * s, vh * s);
        }
      }
      // A boss falls: gold flash, then the banner over the slow-motion knock-out
      if (st?.kind === "act" && bossFalls(st) && e >= IMPACT_MS) {
        const k = e - IMPACT_MS;
        if (!rm && k < 90) {
          ctx.fillStyle = "rgba(255,163,0,0.25)";
          ctx.fillRect(0, 0, vw * s, vh * s);
        }
        if (k >= 160) {
          const pop = rm ? 0 : Math.round(Math.max(0, 1 - (k - 160) / 160) * 6);
          text("BOSS DEFEATED", cx, vh / 2 - 10 - pop, "#FFA300", 15, true);
          const boss = st.enemies.find((en) => en.boss);
          if (boss) text(boss.name, cx, vh / 2 + 3 - pop, "#FFF1E8", 7, true);
        }
      }
      // Revive flash (gold, short)
      const revFlashAt = st?.kind === "revive" ? 300 : st?.action?.kind === "revive" ? IMPACT_MS : -1;
      if (!rm && revFlashAt >= 0 && e >= revFlashAt && e < revFlashAt + 80) {
        ctx.fillStyle = "rgba(255,227,107,0.18)";
        ctx.fillRect(0, 0, vw * s, vh * s);
      }
      // The end of the run: the tower dims behind the result
      if (st && (st.kind === "fall" || st.kind === "end") && st.partyHp.every((h) => h <= 0)) {
        ctx.fillStyle = `rgba(11,16,34,${(Math.round(Math.min(1, st.kind === "end" ? 1 : t) * 4) / 4) * 0.45})`;
        ctx.fillRect(0, 0, vw * s, vh * s);
        text(`Your party fell on floor ${st.floor}`, cx, BY, "#FFF1E8", 10, true);
      }
      // Crit flash (very short, skipped with reduced motion)
      if (!rm && st?.kind === "act" && a?.crit && e >= IMPACT_MS && e < IMPACT_MS + 50) {
        ctx.fillStyle = "rgba(255,241,232,0.12)";
        ctx.fillRect(0, 0, vw * s, vh * s);
      }
    };

    const describe = (st: Step): string => {
      const names = [...new Set(st.enemies.map((en) => en.name))].join(", ");
      if (st.kind === "climb") return `Climbing to floor ${st.floor}`;
      if (st.kind === "revive" && st.event) return `Phoenix feather: ${members[st.event.target]?.hero.name ?? "a hero"} gets back up`;
      if (st.kind === "act" && st.action?.kind === "revive") return `${members[st.action.target]?.hero.name ?? "A hero"} gets back up`;
      if (st.kind === "gate") return `Boss: ${st.enemies[0]?.name ?? ""}`;
      if (st.kind === "clear") return `Floor ${st.floor} cleared`;
      if (st.kind === "chest" && st.chest) return `Boss chest: ${chestName(st.chest)}`;
      if (st.kind === "record") return "New record";
      if (st.kind === "fall" || st.kind === "end") return st.partyHp.every((h) => h <= 0) ? `Your party fell on floor ${st.floor}` : `Floor ${st.floor} cleared`;
      return `Floor ${st.floor}: ${names}`;
    };

    const sfxFor = (st: Step): Sfx | null => {
      const a = st.action;
      if (st.kind === "climb") return "climb";
      if (st.kind === "revive" || a?.kind === "revive") return "revive";
      if (st.kind === "record") return "record";
      if (st.kind === "gate") return "boss";
      if (st.kind === "chest") return "chest";
      if (st.kind === "fall") return st.partyHp.every((h) => h <= 0) ? "fall" : null;
      if (st.kind !== "act" || !a) return null;
      if (a.kind === "heal") return "heal";
      if (a.kind === "stunned") return "stun";
      if (a.kind !== "hit") return null;
      if (a.side === "enemy") return a.rally ? "rally" : st.enemies[a.actor]?.boss ? "bossHit" : a.ko ? "ko" : "hit";
      if (bossFalls(st)) return "bossDown";
      if (a.skill && a.skill.rule !== "basic") return a.skill.rule === "legendary" ? "record" : "crit";
      if (a.execute) return "execute";
      if (a.double) return "double";
      return a.ko ? "ko" : a.crit ? "crit" : a.matchup === "weak" ? "weak" : "hit";
    };

    const draw = () => {
      if (!timeline) { scene(null, 0, null, 0); return; }
      const { steps, total } = timeline;
      const tNow = Math.min(clockRef.current, total);
      const idx = stepAt(steps, tNow);
      const st = steps[idx];
      const t = st.ms > 0 ? Math.min(1, (tNow - st.start) / st.ms) : 1;
      scene(st, t, steps, idx);
      if (idx !== lastStep) {
        if (idx === lastStep + 1) { const sfx = sfxFor(st); if (sfx) play(sfx, idx); }
        lastStep = idx;
        const hp = st.partyHp.reduce((x, y) => x + Math.max(0, y), 0);
        cbRef.current.onProgress?.({ floor: st.floor, zone: zoneFor(Math.max(1, st.floor)).name, hp, maxHp, combo: st.combo, line: describe(st), done: st.kind === "end" });
      }
      if (tNow >= total && !finished) {
        finished = true;
        cbRef.current.onDone?.();
      }
    };
    drawRef.current = draw;

    if (!timeline) {
      draw();
      const rf = propsRef.current.restFloor;
      const hp = (propsRef.current.restHp ?? members.map((m) => m.stats.hp)).reduce((x, y) => x + Math.max(0, y), 0);
      cbRef.current.onProgress?.({ floor: rf, zone: rf > 0 ? zoneFor(rf).name : "Entrance", hp, maxHp, combo: 0, line: "", done: true });
    }
    // Real idle animations keep playing while standing (redrawn ~15 times a second)
    const animated = members.some((m) => m.anims && Object.keys(m.anims).length > 0);
    if (!timeline && !animated) return;
    let raf = 0;
    let prev = performance.now();
    let lastIdle = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev);
      prev = now;
      if (timeline && !finished) {
        clockRef.current += dt * speedRef.current;
        draw();
      } else if (animated && now - lastIdle > 66) {
        lastIdle = now;
        draw();
      }
      if ((timeline && !finished) || animated) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [floors, members]);

  useEffect(() => {
    if (skipToken === 0) return;
    clockRef.current = Number.MAX_SAFE_INTEGER;
    drawRef.current();
  }, [skipToken]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <span ref={fontRef} className="font-display pointer-events-none absolute opacity-0" aria-hidden>.</span>
      <canvas ref={canvasRef} role="img" aria-label="The tower: your party climbing floor by floor" style={{ imageRendering: "pixelated", display: "block" }} />
    </div>
  );
}

