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
import { ELEMENT_DEFS, ZONES, zoneFor, type Element } from "@/lib/dungeon/config";
import { blessingView } from "@/lib/dungeon/blessings";
import type { FloorLog, EnemyUnit } from "@/lib/dungeon/simulate";
import type { PartyMember } from "@/lib/dungeon/store";
import { CROWN, ENEMY_ART, artSize, paletteFor } from "./enemy-art";
import { buildTimeline, stepAt, type Step } from "./replay";
import { play, type Sfx } from "./sfx";
import {
  SLAB, TOWER_W, WALL, ceilingY, drawChest, drawOuterWalls, drawRoom, drawSky, floorY, h2, px, roomHeight, stairPath,
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

const HERO = 26;
const IMPACT_MS = 140;

// ── positions (logical, relative to the tower's left edge) ───────────────────
function heroSpot(i: number): { x: number; dy: number } {
  return { x: 76 - i * 18, dy: i % 2 === 1 ? -5 : 0 };
}
function enemyScale(e: EnemyUnit): number {
  return e.boss ? 3 : 2;
}
function enemySpot(i: number, e: EnemyUnit): { x: number; dy: number } {
  if (e.boss) return { x: 116, dy: 0 };
  return { x: 94 + i * 15, dy: i % 2 === 1 ? -5 : 0 };
}
const zoneId = (floor: number): ZoneId => zoneFor(Math.max(1, floor)).id;
const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));

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
  const sizeRef = useRef({ s: 3, vw: 200, vh: 150 });
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const flashRef = useRef(new Map<string, HTMLCanvasElement>());
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

  // The player's real sprites (heroes + weapons)
  useEffect(() => {
    const redraw = () => drawRef.current();
    for (const m of members) {
      for (const sp of [m.hero, m.weapon]) {
        if (!sp || imagesRef.current.has(sp.id)) continue;
        const img = new Image();
        img.decoding = "async";
        img.onload = redraw;
        img.src = sp.imageUrl;
        imagesRef.current.set(sp.id, img);
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
      const s = Math.max(1, Math.min(Math.floor(cw / (TOWER_W + 12)), Math.floor(ch / 124)));
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      sizeRef.current = { s, vw: Math.ceil(cw / s), vh: Math.ceil(ch / s) };
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

    const silhouette = (key: string, img: HTMLImageElement, size: number, smooth: boolean) => {
      const k = `${key}@${size}`;
      const hit = flashRef.current.get(k);
      if (hit) return hit;
      const c = document.createElement("canvas");
      c.width = size; c.height = size;
      const g = c.getContext("2d");
      if (g) {
        g.imageSmoothingEnabled = smooth;
        g.drawImage(img, 0, 0, size, size);
        g.globalCompositeOperation = "source-in";
        g.fillStyle = "#FFFFFF";
        g.fillRect(0, 0, size, size);
      }
      flashRef.current.set(k, c);
      return c;
    };

    const drawHero = (m: PartyMember, x: number, groundY: number, hp: number, opts: { flip?: boolean; flash?: boolean; alpha?: number; swing?: number; bob?: number }) => {
      const { s } = sizeRef.current;
      const left = Math.round(x - HERO / 2), top = Math.round(groundY - HERO - (opts.bob ?? 0));
      px(ctx, s, left + 4, groundY - 1, HERO - 8, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = opts.alpha ?? 1;
      ctx.save();
      if (opts.flip) {
        ctx.translate((left * 2 + HERO) * s, 0);
        ctx.scale(-1, 1);
      }
      const img = image(m.hero.id);
      const size = HERO * s;
      if (img) {
        ctx.imageSmoothingEnabled = !m.hero.pixel;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, left * s, top * s, size, size);
        if (opts.flash) ctx.drawImage(silhouette(m.hero.id, img, size, !m.hero.pixel), left * s, top * s);
      } else {
        px(ctx, s, left + 6, top + 6, HERO - 12, HERO - 6, "#2A3460");
      }
      const wimg = image(m.weapon?.id);
      if (wimg && m.weapon) {
        ctx.save();
        ctx.translate(Math.round(left + HERO / 2 + 7) * s, Math.round(top + 13) * s);
        ctx.rotate(-0.7 + (opts.swing ?? 0));
        ctx.imageSmoothingEnabled = !m.weapon.pixel;
        ctx.drawImage(wimg, -7 * s, -12 * s, 14 * s, 14 * s);
        ctx.restore();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      if (hp > 0) {
        const bw = 18, bx = Math.round(x - bw / 2), by = top - 4;
        px(ctx, s, bx - 1, by - 1, bw + 2, 4, "#0B1022");
        px(ctx, s, bx, by, bw, 2, "#2A3460");
        const fill = Math.ceil((Math.max(0, hp) / m.stats.hp) * bw);
        if (fill > 0) px(ctx, s, bx, by, fill, 2, "#00E436");
        if (m.armor) px(ctx, s, bx + bw + 2, by - 1, 3, 3, "#29ADFF");
        if (m.trinket) px(ctx, s, bx + bw + (m.armor ? 6 : 2), by - 1, 3, 3, "#00E436");
      }
    };

    const drawEnemy = (e: EnemyUnit, x: number, groundY: number, hp: number, flash: boolean, alpha: number) => {
      const { s } = sizeRef.current;
      const art = ENEMY_ART[e.kind];
      const pal = paletteFor(art, e.element);
      const p = enemyScale(e);
      const { w, h } = artSize(art);
      const left = Math.round(x - (w * p) / 2), top = Math.round(groundY - h * p);
      px(ctx, s, left + 2, groundY - 1, w * p - 4, 2, "rgba(0,0,0,0.35)");
      ctx.globalAlpha = alpha;
      art.rows.forEach((row, ry) => {
        for (let rx = 0; rx < row.length; rx++) {
          const c = row[rx];
          if (c !== ".") px(ctx, s, left + rx * p, top + ry * p, p, p, flash ? "#FFFFFF" : pal[c] ?? "#FF00FF");
        }
      });
      if (e.boss) {
        CROWN.rows.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] !== ".") px(ctx, s, x - 7 + rx * 2, top - 9 + ry * 2, 2, 2, flash ? "#FFFFFF" : CROWN.palette[row[rx]]);
        });
      }
      ctx.globalAlpha = 1;
      if (hp > 0) {
        const bw = e.boss ? 30 : 16, bx = Math.round(x - bw / 2), by = top - (e.boss ? 13 : 5);
        px(ctx, s, bx - 1, by - 1, bw + 2, 4, "#0B1022");
        px(ctx, s, bx, by, bw, 2, "#2A3460");
        const fill = Math.ceil((hp / e.hp) * bw);
        if (fill > 0) px(ctx, s, bx, by, fill, 2, "#FF004D");
        if (e.element !== "neutral") px(ctx, s, bx + bw + 2, by - 1, 3, 3, ELEMENT_DEFS[e.element].color);
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
      }
      // Never show more than a strip of ground below the tower (the start button sits there)
      const camTop = Math.min(Math.round(cy - vh / 2), SLAB + 30 - vh);
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
          const fx = x0 + WALL + 4 + k * 40, fy = ceilingY(f) - camTop + SLAB + 4;
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
          const bob = moving && !rm ? (Math.floor(e / 110) % 2) : 0;
          const hp = hpNow[i] ?? 0;
          drawHero(members[i], p.x, Math.round(p.y), hp, { flip: p.dx < 0 && moving, alpha: hp > 0 ? 1 : 0.3, bob });
        });
      } else {
        order.forEach((i) => {
          const spot = heroSpot(i);
          const hp = hpNow[i] ?? 0;
          const before = st ? st.partyHp[i] ?? 0 : hp;
          const isActor = a && a.side === "party" && a.actor === i && a.kind === "hit";
          const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e < IMPACT_MS ? e / (IMPACT_MS * 2) : 0.5 + Math.max(0, e - IMPACT_MS - (a!.crit || a!.ko ? 150 : 0)) / 300)) * 7) : 0;
          const hit = a && a.side === "enemy" && a.target === i && e >= IMPACT_MS && e < IMPACT_MS + 90;
          const fallingNow = a && a.side === "enemy" && a.target === i && a.ko;
          const alpha = before <= 0 && !fallingNow && !(a?.kind === "revive" && a.target === i) ? 0.3 : 1;
          const swing = isActor ? Math.sin(Math.PI * Math.min(1, e / 300)) * 1.1 : 0;
          drawHero(members[i], x0 + spot.x + lunge, ground + spot.dy, hp, { flash: Boolean(hit) && !rm, alpha, swing });
          if (fallingNow && e >= IMPACT_MS) burst(idx * 31 + i, x0 + spot.x, ground + spot.dy - 10, e - IMPACT_MS, "#C8CCE8", 10, 1.2, 420);
        });
      }

      // ── Enemies ───────────────────────────────────────────────────────────
      if (st && st.kind !== "climb" && st.kind !== "clear" && st.kind !== "chest" && st.kind !== "record") {
        const appear = st.kind === "intro" ? ease(t / 0.8) : 1;
        st.enemies.forEach((en, i) => {
          const before = st.enemyHp[i];
          const fallingNow = a?.side === "party" && a.kind === "hit" && ((a.target === i && a.ko) || a.extra?.some((x) => x.target === i && x.ko));
          if (before <= 0 && !fallingNow) return;
          if (st.kind === "end" && enemyHpNow[i] <= 0) return;
          const spot = enemySpot(i, en);
          const isActor = a?.side === "enemy" && a.actor === i;
          const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e / (IMPACT_MS * 2))) * 7) : 0;
          const slide = Math.round((1 - appear) * 30);
          const struck = a?.side === "party" && a.kind === "hit" && (a.target === i || a.extra?.some((x) => x.target === i));
          const flash = Boolean(struck) && e >= IMPACT_MS && e < IMPACT_MS + 90 && !rm;
          const fade = fallingNow && e >= IMPACT_MS + 60 ? Math.max(0, Math.round((1 - (e - IMPACT_MS - 60) / 240) * 4) / 4) : 1;
          drawEnemy(en, x0 + spot.x - lunge + slide, ground + spot.dy, enemyHpNow[i] ?? 0, flash, (st.kind === "intro" ? Math.round(appear * 4) / 4 : 1) * fade);
          if (fallingNow && e >= IMPACT_MS) {
            const big = en.boss;
            burst(idx * 17 + i, x0 + spot.x, ground + spot.dy - (big ? 18 : 8), e - IMPACT_MS, big ? "#FFA300" : "#C8CCE8", big ? 26 : 10, big ? 2.4 : 1.2, big ? 700 : 420);
            if (big) burst(idx * 19 + i, x0 + spot.x, ground - 18, e - IMPACT_MS - 80, "#FFF1E8", 18, 1.8, 600);
          }
        });
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
            const h = artSize(ENEMY_ART[en.kind]).h * enemyScale(en);
            show(x0 + spot.x, ground + spot.dy - h - 6, tg.amount, a.crit, tg.matchup, a.element, false, n);
          });
        } else if (a.kind === "hit") {
          const spot = heroSpot(a.target);
          show(x0 + spot.x, ground + spot.dy - HERO - 8, a.amount, a.crit, a.matchup, a.element, true, 0);
        } else {
          const spot = heroSpot(a.target);
          text(a.kind === "revive" ? "Back up!" : `+${a.amount}`, x0 + spot.x, ground + spot.dy - HERO - 8 - rise, a.kind === "revive" ? "#FFE36B" : "#00E436", 8, true);
          burst(idx * 7, x0 + spot.x, ground + spot.dy - 10, k, a.kind === "revive" ? "#FFE36B" : "#00E436", 8, 0.8, 400);
        }
      }

      // ── Banners and moments ───────────────────────────────────────────────
      const cx = vw / 2;
      const BY = 50; // banners sit below the HUD plates
      if (st?.kind === "gate") {
        const boss = st.enemies.find((en) => en.boss);
        text(`Floor ${st.floor}`, cx, BY, "#FFF1E8", 9, true);
        if (boss) text(boss.name, cx, BY + 15, "#FFA300", 13, true);
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
      } else if (st?.kind === "clear") {
        text(`Floor ${st.floor} cleared`, cx, BY, "#00E436", 8, true);
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
      } else if (st && (st.kind === "fall" || st.kind === "end") && st.partyHp.every((h) => h <= 0)) {
        text(`Your party fell on floor ${st.floor}`, cx, BY, "#FFF1E8", 9, true);
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
      if (st.kind === "record") return "record";
      if (st.kind === "gate") return "boss";
      if (st.kind === "chest") return "chest";
      if (st.kind === "fall") return st.partyHp.every((h) => h <= 0) ? "fall" : null;
      if (st.kind === "act" && a?.kind === "hit") return a.ko ? "ko" : a.crit ? "crit" : a.matchup === "weak" ? "weak" : "hit";
      return null;
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
        if (idx === lastStep + 1) { const sfx = sfxFor(st); if (sfx) play(sfx); }
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
      return;
    }
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

