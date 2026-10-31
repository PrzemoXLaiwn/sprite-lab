"use client";

// =============================================================================
// Arena stage — the party fights each floor on a painted battlefield
// =============================================================================
// Left: the player's own sprites, playing their real animations (idle, walk,
// attack and skill sheets made in SpriteLab; a sprite without a sheet stands
// still — no fake motion). Right: enemies whose sprites and idle / attack
// sheets were made with SpriteLab's own pipeline. The stage only replays the
// floors the server sent (replay.ts); it never decides an outcome. Juice
// (shake, flashes, sparks) is display only and toned down for reduced motion.
// =============================================================================

import { useCallback, useEffect, useRef } from "react";
import { chestName } from "@/lib/dungeon/simulate";
import { ELEMENT_DEFS, TIER_COLOR, TIER_LABEL, zoneFor, type Element } from "@/lib/dungeon/config";
import type { AnimRef } from "@/lib/dungeon/anims";
import { blessingView } from "@/lib/dungeon/blessings";
import type { FloorLog, EnemyUnit } from "@/lib/dungeon/simulate";
import type { PartyMember } from "@/lib/dungeon/store";
import { CROWN, ENEMY_ART, artSize, paletteFor } from "./enemy-art";
import { buildTimeline, stepAt, type Step } from "./replay";
import { animationSheetGeometry, type SheetGeometry } from "@/lib/workspace/history";
import { play, type Sfx } from "./sfx";
import { drawChest, h2, px } from "./tower-art";
import { SHEET_FOOT_MARGIN, ZONE_AMBIENCE, ZONE_BACKGROUND, enemyLook, type EnemySheet, type ZoneId } from "./arena-assets";

export interface StageProgress {
  floor: number;
  zone: string;
  hp: number;
  maxHp: number;
  combo: number;
  line: string;
  done: boolean;
}

interface Props {
  members: PartyMember[];
  /** Floors to replay; null = stand on `restFloor`. */
  floors: FloorLog[] | null;
  restFloor: number;
  restHp: number[] | null;
  /** Enemies waiting on the next floor, shown while standing (the week's real line-up). */
  previewEnemies: EnemyUnit[];
  bestBefore: number | null;
  speed: number;
  paused: boolean;
  skipToken: number;
  reducedMotion: boolean;
  onProgress?: (p: StageProgress) => void;
  onDone?: () => void;
}

type Mode = "idle" | "attack" | "walk" | "hurt" | "defeat" | "static";
const IMPACT_MS = 140;
/** Logical viewport at least this big; the scale is a whole number of device pixels. */
const MIN_W = 220;
const MIN_H = 150;

const zoneIdOf = (floor: number): ZoneId => zoneFor(Math.max(1, floor)).id;
const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));

/** A party hit that knocks out a boss (its main target or one hit by the same attack). */
function bossFalls(st: Step): boolean {
  const a = st.action;
  if (!a || a.side !== "party" || a.kind !== "hit") return false;
  return Boolean((a.ko && st.enemies[a.target]?.boss) || a.extra?.some((x) => x.ko && st.enemies[x.target]?.boss));
}

export function ArenaStage({ members, floors, restFloor, restHp, previewEnemies, bestBefore, speed, paused, skipToken, reducedMotion, onProgress, onDone }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fontRef = useRef<HTMLSpanElement>(null);
  const sizeRef = useRef({ s: 4, vw: MIN_W, vh: MIN_H, hero: 40, phone: false });
  const imagesRef = useRef(new Map<string, HTMLImageElement>());
  const geoRef = useRef(new Map<string, SheetGeometry>());
  const speedRef = useRef(paused ? 0 : speed);
  const clockRef = useRef(0);
  const drawRef = useRef<() => void>(() => {});
  const cbRef = useRef({ onProgress, onDone });
  const propsRef = useRef({ reducedMotion, restFloor, restHp, bestBefore, previewEnemies });

  useEffect(() => { speedRef.current = paused ? 0 : speed; }, [speed, paused]);
  useEffect(() => { cbRef.current = { onProgress, onDone }; }, [onProgress, onDone]);
  useEffect(() => {
    propsRef.current = { reducedMotion, restFloor, restHp, bestBefore, previewEnemies };
    drawRef.current();
  }, [reducedMotion, restFloor, restHp, bestBefore, previewEnemies]);

  /** Loads an image once; redraws when it arrives. */
  const load = useCallback((key: string, url: string, onload?: (img: HTMLImageElement) => void) => {
    if (imagesRef.current.has(key)) return;
    const img = new Image();
    img.decoding = "async";
    img.onload = () => { onload?.(img); drawRef.current(); };
    img.src = url;
    imagesRef.current.set(key, img);
  }, []);

  // The heroes' sprites and their animation sheets
  useEffect(() => {
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
    drawRef.current();
  }, [members, load]);

  // Whole-number scale; hero height follows the viewport (bigger on wide screens)
  useEffect(() => {
    const wrap = wrapRef.current, canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.max(1, Math.round(wrap.clientWidth * dpr)), ch = Math.max(1, Math.round(wrap.clientHeight * dpr));
      canvas.width = cw;
      canvas.height = ch;
      canvas.style.width = `${wrap.clientWidth}px`;
      canvas.style.height = `${wrap.clientHeight}px`;
      const s = Math.max(1, Math.min(Math.floor(cw / MIN_W), Math.floor(ch / MIN_H)));
      const vw = Math.ceil(cw / s), vh = Math.ceil(ch / s);
      // Phones (narrow container): bigger fighters standing closer together
      const phone = wrap.clientWidth < 520;
      sizeRef.current = { s, vw, vh, phone, hero: Math.round(clamp(Math.min(vh * 0.37, vw * (phone ? 0.26 : 0.2)), 26, 96)) };
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

    const image = (key: string | undefined) => {
      const img = key ? imagesRef.current.get(key) : undefined;
      return img?.complete && img.naturalWidth > 0 ? img : null;
    };

    // ── layout (logical units) ──────────────────────────────────────────────
    // Phones keep the feet clear of the start button
    const groundY = () => Math.round(sizeRef.current.vh * (sizeRef.current.phone ? 0.78 : 0.86));
    const heroSpot = (i: number) => {
      const { vw, hero: H, phone } = sizeRef.current;
      const front = vw * (phone ? 0.44 : 0.36);
      const gap = phone ? H * 0.42 : Math.min(H * 0.66, Math.max(H * 0.42, (front - H * 0.45) / 3));
      return { x: Math.round(front - i * gap), dy: i % 2 === 1 ? -Math.round(H * 0.1) : 0 };
    };
    const enemySpot = (i: number, e: EnemyUnit, n: number) => {
      const { vw, hero: H, phone } = sizeRef.current;
      if (e.boss) return { x: Math.round(vw * (phone ? 0.76 : 0.74)), dy: 0 };
      const first = vw * (phone ? 0.66 : 0.6);
      const gap = n > 1 ? Math.min(H * 0.7, (vw * 0.95 - H * 0.35 - first) / (n - 1)) : 0;
      return { x: Math.round(first + i * gap), dy: i % 2 === 1 ? -Math.round(H * 0.1) : 0 };
    };
    const enemyHeight = (e: EnemyUnit) => Math.round(sizeRef.current.hero * enemyLook(e.kind, e.boss).scale);

    // ── drawing helpers ─────────────────────────────────────────────────────
    const text = (str: string, x: number, y: number, color: string, size: number, display = false) => {
      const s = sizeRef.current.s;
      ctx.font = `700 ${Math.round(size * s)}px ${display ? displayFont : bodyFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.lineJoin = "round";
      ctx.lineWidth = Math.max(2, Math.round(s * 1.4));
      ctx.strokeStyle = "#0B1022";
      ctx.strokeText(str, Math.round(x * s), Math.round(y * s));
      ctx.fillStyle = color;
      ctx.fillText(str, Math.round(x * s), Math.round(y * s));
    };
    const shadow = (x: number, y: number, w: number, color = "rgba(0,0,0,0.45)") => {
      const s = sizeRef.current.s;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x * s, y * s, (w / 2) * s, Math.max(1.5, w * 0.12) * s, 0, 0, Math.PI * 2);
      ctx.fill();
    };
    const fill = (color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };

    // Hit / revive feedback: a brief colour tint over the sprite, never a solid fill
    const scratch = document.createElement("canvas");
    const tinted = (img: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, w: number, h: number, smooth: boolean, tint: string) => {
      scratch.width = Math.max(1, Math.round(w));
      scratch.height = Math.max(1, Math.round(h));
      const g = scratch.getContext("2d");
      if (!g) return scratch;
      g.imageSmoothingEnabled = smooth;
      g.drawImage(img, sx, sy, sw, sh, 0, 0, scratch.width, scratch.height);
      g.globalCompositeOperation = "source-atop";
      g.fillStyle = tint;
      g.fillRect(0, 0, scratch.width, scratch.height);
      g.globalCompositeOperation = "source-over";
      return scratch;
    };

    const bar = (x: number, y: number, w: number, h: number, ratio: number, color: string, tag?: string) => {
      const s = sizeRef.current.s;
      px(ctx, s, x - 1, y - 1, w + 2, h + 2, "#0B1022");
      px(ctx, s, x, y, w, h, "#2A3460");
      const f = Math.ceil(clamp(ratio, 0, 1) * w);
      if (f > 0) px(ctx, s, x, y, f, h, color);
      if (tag) px(ctx, s, x + w + 2, y - 1, 3, h + 2, tag);
    };

    /** The painted zone behind everything: cover the canvas, keep the floor at the bottom. */
    const background = (zone: ZoneId, alpha = 1) => {
      const key = `bg:${zone}`;
      load(key, ZONE_BACKGROUND[zone]);
      const img = image(key);
      ctx.globalAlpha = alpha;
      if (img) {
        const k = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const w = img.naturalWidth * k, h = img.naturalHeight * k;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, (canvas.width - w) / 2, canvas.height - h, w, h);
      } else {
        fill("#0B1022");
      }
      ctx.globalAlpha = 1;
    };

    /** Darker edges and a dim band under the HUD so the fighters and numbers read. */
    const atmosphere = () => {
      const g = ctx.createRadialGradient(canvas.width / 2, canvas.height * 0.62, canvas.height * 0.25, canvas.width / 2, canvas.height * 0.62, Math.max(canvas.width, canvas.height) * 0.75);
      g.addColorStop(0, "rgba(11,16,34,0)");
      g.addColorStop(1, "rgba(11,16,34,0.6)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const top = ctx.createLinearGradient(0, 0, 0, canvas.height * 0.22);
      top.addColorStop(0, "rgba(11,16,34,0.55)");
      top.addColorStop(1, "rgba(11,16,34,0)");
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, canvas.width, canvas.height * 0.22);
    };

    /** Drifting motes in the zone's colour: embers in the forge, sparkles in the crystal cave. */
    const ambience = (zone: ZoneId, rm: boolean) => {
      const { s, vw, vh } = sizeRef.current;
      const a = ZONE_AMBIENCE[zone];
      const now = rm ? 0 : performance.now() / 1000;
      for (let i = 0; i < a.count; i++) {
        const x = (h2(i, 7) * vw + Math.sin(now * 0.6 + i) * 4 + vw) % vw;
        const y = ((h2(i, 13) * vh + now * a.drift * 6 * (0.6 + h2(i, 3))) % vh + vh) % vh;
        const tw = rm ? 0.6 : 0.35 + 0.65 * Math.abs(Math.sin(now * 1.7 + i * 1.3));
        ctx.globalAlpha = Math.round(tw * 4) / 4 * 0.8;
        px(ctx, s, x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1, a.color);
      }
      ctx.globalAlpha = 1;
    };

    /**
     * A hero from its own animation sheet when it has one for `mode` (frames at a fixed
     * height, bottom-aligned: the feet stay put and the size never changes), else its
     * still sprite. No fake motion: without a sheet the sprite simply doesn't animate.
     */
    const drawHero = (m: PartyMember, x: number, ground: number, hp: number, o: { mode: Mode; e?: number; dur?: number; tint?: string | null; alpha?: number; anim?: AnimRef }) => {
      const { s, hero: H } = sizeRef.current;
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
        // 4-direction walk sets: the row facing right (toward the enemies)
        const row = ref.walkSet ? 1 : 0;
        src = { img: sheet, sx: (fi % geo.cols) * geo.frameWidth, sy: row * geo.frameHeight, sw: geo.frameWidth, sh: geo.frameHeight };
      } else {
        const img = image(m.hero.id);
        if (img) src = { img, sx: 0, sy: 0, sw: img.naturalWidth, sh: img.naturalHeight };
      }
      const h = H, w = src ? Math.max(8, Math.round((H * src.sw) / src.sh)) : H;
      const left = Math.round(x - w / 2), top = Math.round(ground - h);
      shadow(x, ground, H * 0.62);
      ctx.globalAlpha = o.alpha ?? 1;
      if (src) {
        const smooth = !m.hero.pixel;
        ctx.imageSmoothingEnabled = smooth;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(src.img, src.sx, src.sy, src.sw, src.sh, left * s, top * s, w * s, h * s);
        if (o.tint) ctx.drawImage(tinted(src.img, src.sx, src.sy, src.sw, src.sh, w * s, h * s, smooth, o.tint), left * s, top * s);
      } else {
        px(ctx, s, left + w * 0.25, top + h * 0.25, w * 0.5, h * 0.75, "#2A3460");
      }
      ctx.globalAlpha = 1;
      if (hp > 0) {
        const bw = Math.round(H * 0.5), bx = Math.round(x - bw / 2), by = top + Math.round(h * 0.06) - 5;
        const el = m.stats.attackElement;
        bar(bx, by, bw, 2, hp / m.stats.hp, hp / m.stats.hp < 0.3 ? "#FFA300" : "#00E436", el !== "neutral" ? ELEMENT_DEFS[el].color : undefined);
      }
      return top;
    };

    /** The enemy's SpriteLab-made sheet (flipped to face the party), falling back to the old pixel art while it loads. */
    const drawEnemy = (en: EnemyUnit, x: number, ground: number, hp: number, o: { mode: "idle" | "attack"; e?: number; dur?: number; flash?: boolean; alpha?: number; bob?: number }) => {
      const { s, hero: H } = sizeRef.current;
      const lookDef = enemyLook(en.kind, en.boss);
      const sh: EnemySheet = o.mode === "attack" ? lookDef.attack : lookDef.idle;
      load(`enemy:${sh.url}`, sh.url);
      // Both sheets of an enemy load together, so attacks never pop in late
      load(`enemy:${lookDef.idle.url}`, lookDef.idle.url);
      load(`enemy:${lookDef.attack.url}`, lookDef.attack.url);
      const img = image(`enemy:${sh.url}`);
      const h = enemyHeight(en);
      const lift = Math.round(lookDef.lift * H) + (o.bob ?? 0);
      const feet = ground - lift + Math.round(h * SHEET_FOOT_MARGIN);
      const color = ELEMENT_DEFS[en.element].color;
      if (en.element !== "neutral") shadow(x, ground, h * (en.boss ? 0.9 : 0.75), `${color}40`);
      shadow(x, ground, h * (en.boss ? 0.7 : 0.55));
      let top: number;
      ctx.globalAlpha = o.alpha ?? 1;
      if (img) {
        const w = Math.round((h * sh.frameWidth) / sh.frameHeight);
        const fi = o.mode === "attack"
          ? Math.min(sh.frameCount - 1, Math.floor(((o.e ?? 0) / (o.dur || 1)) * sh.frameCount))
          : Math.floor((performance.now() * 6) / 1000 + x) % sh.frameCount;
        const left = Math.round(x - w / 2);
        top = feet - h;
        ctx.save();
        ctx.translate((left * 2 + w) * s, 0);
        ctx.scale(-1, 1);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, fi * sh.frameWidth, 0, sh.frameWidth, sh.frameHeight, left * s, top * s, w * s, h * s);
        if (o.flash) ctx.drawImage(tinted(img, fi * sh.frameWidth, 0, sh.frameWidth, sh.frameHeight, w * s, h * s, false, "rgba(255,255,255,0.55)"), left * s, top * s);
        ctx.restore();
      } else {
        const art = ENEMY_ART[en.kind];
        const pal = paletteFor(art, en.element);
        const { w: aw, h: ah } = artSize(art);
        const p = Math.max(1, Math.round(h / ah));
        const left = Math.round(x - (aw * p) / 2);
        top = feet - ah * p;
        art.rows.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] !== ".") px(ctx, s, left + rx * p, top + ry * p, p, p, pal[row[rx]] ?? "#FF00FF");
        });
        if (en.boss) CROWN.rows.forEach((row, ry) => {
          for (let rx = 0; rx < row.length; rx++) if (row[rx] !== ".") px(ctx, s, x - 7 + rx * 2, top - 9 + ry * 2, 2, 2, CROWN.palette[row[rx]]);
        });
      }
      ctx.globalAlpha = 1;
      if (hp > 0) {
        const bw = en.boss ? Math.round(H * 1.1) : Math.round(H * 0.5), bh = en.boss ? 3 : 2;
        const by = top - (en.boss ? 6 : 4);
        bar(Math.round(x - bw / 2), by, bw, bh, hp / en.hp, hp / en.hp < 0.3 ? "#FF5A3C" : "#FF004D", en.element !== "neutral" ? color : undefined);
        if (en.boss) text(en.name, x, by - 3, "#FFA300", 7, true);
      }
      return top;
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
        const x = cx + Math.cos(ang) * v * k * 14;
        const y = cy + Math.sin(ang) * v * k * 14 + k * k * 10;
        px(ctx, s, x, y, i % 3 === 0 ? 2 : 1, i % 3 === 0 ? 2 : 1, color);
      }
      ctx.globalAlpha = 1;
    };
    const actorMark = (x: number, y: number) => {
      const { s } = sizeRef.current;
      px(ctx, s, x - 2, y - 4, 5, 1, "#FFA300");
      px(ctx, s, x - 1, y - 3, 3, 1, "#FFA300");
      px(ctx, s, x, y - 2, 1, 1, "#FFA300");
    };

    const scene = (st: Step | null, t: number, steps: Step[] | null, idx: number) => {
      const { s, vw, vh, hero: H } = sizeRef.current;
      const { reducedMotion: rm, restFloor: rf, restHp: rh, previewEnemies: preview } = propsRef.current;
      const e = st ? t * st.ms : 0;
      const floor = st ? st.floor : rf;
      const a = st?.action ?? null;
      const ground = groundY();
      const cx = vw / 2;
      const BY = Math.round(vh * 0.3);

      // Camera shake (display only)
      let shake = 0;
      if (!rm && st) {
        if (st.kind === "act" && a && a.kind === "hit" && (a.crit || (a.ko && st.enemies[a.target]?.boss)) && e >= IMPACT_MS && e < IMPACT_MS + 160) {
          shake = [3, -3, 2, -2, 1, -1][Math.floor((e - IMPACT_MS) / 27) % 6] * (a.ko && st.enemies[a.target]?.boss ? 2 : 1);
        }
        if (st.kind === "act" && a?.skill?.rule === "legendary" && e >= IMPACT_MS && e < IMPACT_MS + 240) shake = [3, -3, 2, -2, 1, -1][Math.floor((e - IMPACT_MS) / 40) % 6];
        if (st.kind === "act" && a?.side === "enemy" && a.kind === "hit" && st.enemies[a.actor]?.boss && e >= IMPACT_MS && e < IMPACT_MS + 180) shake = [2, -2, 2, -1, 1, -1][Math.floor((e - IMPACT_MS) / 30) % 6];
        if (st.kind === "intro" && st.boss && t > 0.75 && t < 0.95) shake = [2, -2, 1, -1][Math.floor(e / 40) % 4];
        if (st.kind === "gate" && t > 0.15 && t < 0.6) shake = [1, -1][Math.floor(e / 50) % 2];
      }
      ctx.setTransform(1, 0, 0, 1, shake * s, 0);
      ctx.clearRect(-shake * s, 0, canvas.width, canvas.height);

      // ── Battlefield ───────────────────────────────────────────────────────
      // Climbing between floors: the party walks out, the next hall fades in
      const climbing = st?.kind === "climb";
      const zoneNow = zoneIdOf(floor);
      if (climbing && t < 0.4) background(zoneIdOf(Math.max(1, floor - 1)));
      else background(zoneNow);
      atmosphere();
      ambience(climbing && t < 0.4 ? zoneIdOf(Math.max(1, floor - 1)) : zoneNow, rm);

      const hpNow = st ? (st.kind === "act" && a && e >= IMPACT_MS && steps && steps[idx + 1] ? steps[idx + 1].partyHp : st.partyHp) : rh ?? members.map((m) => m.stats.hp);
      const enemyHpNow = st ? (st.kind === "act" && a && e >= IMPACT_MS && steps && steps[idx + 1] && steps[idx + 1].floorIndex === st.floorIndex ? steps[idx + 1].enemyHp : st.enemyHp) : [];

      // ── Enemies (behind the numbers, beside the party) ───────────────────
      const showEnemies = st ? !["climb", "revive", "clear", "chest", "record"].includes(st.kind) : preview.length > 0;
      if (showEnemies) {
        const list = st ? st.enemies : preview;
        const appear = st?.kind === "intro" ? ease(t / 0.8) : 1;
        list.forEach((en, i) => {
          const before = st ? st.enemyHp[i] : en.hp;
          const fallingNow = a?.side === "party" && a.kind === "hit" && ((a.target === i && a.ko) || a.extra?.some((x) => x.target === i && x.ko));
          if (before <= 0 && !fallingNow) return;
          if (st?.kind === "end" && enemyHpNow[i] <= 0) return;
          const spot = enemySpot(i, en, list.length);
          const isActor = a?.side === "enemy" && a.kind === "hit" && a.actor === i;
          const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e / (IMPACT_MS * 2))) * H * (en.boss ? 0.35 : 0.22)) : 0;
          const slide = Math.round((1 - appear) * vw * 0.3);
          const struck = a?.side === "party" && a.kind === "hit" && (a.target === i || a.extra?.some((x) => x.target === i));
          const flash = Boolean(struck) && e >= IMPACT_MS && e < IMPACT_MS + 90 && !rm;
          const fade = fallingNow && e >= IMPACT_MS + 60 ? Math.max(0, Math.round((1 - (e - IMPACT_MS - 60) / 260) * 4) / 4) : 1;
          const bob = en.boss && !isActor && !rm ? Math.round(Math.sin(performance.now() / 260) + 1) : 0;
          const x = spot.x - lunge + slide;
          const g = ground + spot.dy;
          const top = drawEnemy(en, x, g, st ? enemyHpNow[i] ?? 0 : en.hp, {
            mode: isActor ? "attack" : "idle", e, dur: st ? st.ms * 0.9 : 1, flash,
            alpha: (st?.kind === "intro" ? Math.round(appear * 4) / 4 : 1) * fade, bob,
          });
          if (isActor && st?.kind === "act") actorMark(x, top - (en.boss ? 16 : 8));
          const stunnedNow = (a?.stun?.includes(i) && e >= IMPACT_MS + 420) || (a?.kind === "stunned" && a.actor === i);
          if (stunnedNow) {
            const sy = top - (en.boss ? 20 : 10);
            text("Stunned", x, sy - Math.round(Math.min(1, e / 600) * 6), "#FFE36B", 7, true);
          }
          if (fallingNow && e >= IMPACT_MS) {
            const big = en.boss;
            burst(idx * 17 + i, x, g - enemyHeight(en) / 2, e - IMPACT_MS, big ? "#FFA300" : "#C8CCE8", big ? 30 : 12, big ? 2.6 : 1.3, big ? 700 : 420);
            if (big) burst(idx * 19 + i, x, g - 10, e - IMPACT_MS - 80, "#FFF1E8", 20, 2, 600);
          }
        });
      }

      // ── Party ─────────────────────────────────────────────────────────────
      const order = [...members.keys()].sort((p, q) => heroSpot(p).dy - heroSpot(q).dy);
      order.forEach((i) => {
        const spot = heroSpot(i);
        const m = members[i];
        let x = spot.x;
        let mode: Mode = "idle";
        let me = e, dur: number | undefined;
        if (climbing) {
          // Out to the right, then in from the left on the next floor
          const out = t < 0.4, u = out ? ease(t / 0.4) : ease((t - 0.45) / 0.45);
          x = out ? spot.x + Math.round(u * vw * 0.75) : spot.x - Math.round((1 - u) * vw * 0.45);
          mode = m.anims?.walk ? "walk" : "static";
        }
        const reviving = (a?.kind === "revive" && a.target === i) || (st?.kind === "revive" && st.event?.target === i);
        const upAt = st?.kind === "revive" ? 300 : IMPACT_MS;
        const revived = reviving && e >= upAt;
        const hp = st?.kind === "revive" && st.event?.target === i ? (revived ? st.event.amount : 0) : hpNow[i] ?? 0;
        const before = st ? st.partyHp[i] ?? 0 : hp;
        const isActor = Boolean(a && a.side === "party" && a.actor === i && a.kind === "hit");
        const skillAnim = isActor && a?.skill && a.skill.rule !== "basic" ? m.skills?.find((k) => k.id === a.skill!.animId)?.anim : undefined;
        const hasAttack = Boolean(skillAnim ?? m.anims?.attack);
        const reach = Math.round(H * (hasAttack ? 0.18 : 0.3));
        const lunge = isActor ? Math.round(Math.sin(Math.PI * Math.min(1, e < IMPACT_MS ? e / (IMPACT_MS * 2) : 0.5 + Math.max(0, e - IMPACT_MS - (a!.crit || a!.ko ? 150 : 0)) / 300)) * reach) : 0;
        const struck = Boolean(a && a.side === "enemy" && a.kind === "hit" && a.target === i && e >= IMPACT_MS);
        const fallingNow = Boolean(a && a.side === "enemy" && a.target === i && a.ko);
        const down = before <= 0 && !fallingNow && !revived;
        if (!climbing) {
          if (down) { mode = m.anims?.defeat ? "defeat" : "static"; me = 1e9; }
          else if (fallingNow && e >= IMPACT_MS) { mode = m.anims?.defeat ? "defeat" : "static"; me = e - IMPACT_MS; dur = 450; }
          else if (isActor) { mode = hasAttack ? "attack" : "idle"; dur = st!.ms * 0.9; }
          else if (struck && e < IMPACT_MS + 320 && m.anims?.hurt) { mode = "hurt"; me = e - IMPACT_MS; dur = 320; }
        }
        const alpha = down ? (m.anims?.defeat ? 0.75 : 0.35) : fallingNow && e >= IMPACT_MS && !m.anims?.defeat ? Math.max(0.35, Math.round((1 - (e - IMPACT_MS) / 400) * 4) / 4) : 1;
        const tint = !rm && struck && e < IMPACT_MS + 110 ? "rgba(255,72,72,0.45)" : revived && e < upAt + 200 ? "rgba(255,227,107,0.5)" : null;
        const top = drawHero(m, x + lunge, ground + spot.dy, climbing ? (hpNow[i] ?? 0) : hp, { mode, e: me, dur, alpha, tint, anim: mode === "attack" ? skillAnim : undefined });
        if (st?.kind === "act" && a && a.side === "party" && a.actor === i) actorMark(x + lunge, top - 8);
        if (revived) burst(idx * 37 + i, x, ground + spot.dy - H / 2, e - upAt, "#FFE36B", 20, 1.8, 700);
        if (fallingNow && e >= IMPACT_MS) burst(idx * 31 + i, x, ground + spot.dy - H / 3, e - IMPACT_MS, "#C8CCE8", 12, 1.2, 420);
      });

      // ── Strike effects: a bolt from casters and healers, a slash for melee, claws on heroes ──
      if (st?.kind === "act" && a?.kind === "hit") {
        const elColor = a.element === "neutral" ? "#FFF1E8" : ELEMENT_DEFS[a.element].color;
        if (a.side === "party") {
          const en = st.enemies[a.target];
          if (en) {
            const me = heroSpot(a.actor), to = enemySpot(a.target, en, st.enemies.length);
            const tx = to.x, ty = ground + to.dy - Math.round(enemyHeight(en) / 2) - Math.round(enemyLook(en.kind, en.boss).lift * H);
            const cls = members[a.actor]?.stats.classId;
            const ranged = cls === "caster" || cls === "healer";
            if (ranged && e < IMPACT_MS) {
              const u = e / IMPACT_MS;
              const fx = me.x + H * 0.25, fy = ground + me.dy - H * 0.6;
              const bx = Math.round(fx + (tx - fx) * u), by = Math.round(fy + (ty - fy) * u - Math.sin(Math.PI * u) * H * 0.2);
              ctx.globalAlpha = 0.45;
              px(ctx, s, bx - 7, by, 5, 2, elColor);
              ctx.globalAlpha = 1;
              px(ctx, s, bx - 2, by - 2, 4, 4, elColor);
              px(ctx, s, bx - 1, by - 1, 2, 2, "#FFF1E8");
            }
            if (!ranged && e >= IMPACT_MS && e < IMPACT_MS + 150) {
              const f = Math.floor((e - IMPACT_MS) / 50);
              const len = Math.round(H * (en.boss ? 0.45 : 0.3));
              for (let k = 0; k < len; k++) {
                const sx = tx - Math.floor(len / 2) + k + f, sy = ty - Math.floor(len / 2) + k - f;
                px(ctx, s, sx, sy, 1, 1, k === Math.floor(len / 2) ? "#FFF1E8" : elColor);
                if (f === 1) px(ctx, s, sx + 1, sy, 1, 1, elColor);
              }
            }
          }
        } else if (e >= IMPACT_MS && e < IMPACT_MS + 170) {
          const me = heroSpot(a.target);
          const hx = me.x, hy = ground + me.dy - Math.round(H / 2);
          const claw = st.enemies[a.actor]?.boss ? "#FF5A3C" : "#FF8A8A";
          const n = Math.round(H * 0.18);
          for (let c = -1; c <= 1; c++) for (let k = 0; k < n; k++) px(ctx, s, hx + c * 3 + k - n / 2, hy + k - n / 2, 1, 1, claw);
        }
      }

      // ── Numbers ───────────────────────────────────────────────────────────
      if (st?.kind === "act" && a && e >= IMPACT_MS) {
        const k = e - IMPACT_MS;
        const rise = Math.round(Math.min(1, k / 500) * 14);
        const show = (x: number, y: number, amount: number, crit: boolean, matchup: string, el: Element, enemySide: boolean, n: number) => {
          const elColor = ELEMENT_DEFS[el].color;
          const color = matchup === "weak" ? elColor : crit ? "#FFE36B" : enemySide ? "#FF8A8A" : "#FFF1E8";
          text(`-${amount}${crit ? "!" : ""}`, x, y - rise, color, crit ? 14 : matchup === "weak" ? 11 : 9, true);
          if (crit) text("CRITICAL!", x, y - rise + 8, "#FFA300", 6, true);
          if (matchup === "weak") text("WEAK!", x, y - rise - (crit ? 14 : 11), elColor, 6, true);
          if (matchup === "resist") text("resist", x, y - rise - 9, "#A7ADD4", 5);
          burst(idx * 13 + n, x, y + 6, k, crit ? "#FFE36B" : elColor, crit ? 14 : 7, crit ? 1.7 : 1, 320);
        };
        if (a.kind === "hit" && a.side === "party") {
          const targets = [{ target: a.target, amount: a.amount, matchup: a.matchup }, ...(a.extra ?? [])];
          targets.forEach((tg, n) => {
            const en = st.enemies[tg.target];
            if (!en) return;
            const spot = enemySpot(tg.target, en, st.enemies.length);
            const top = ground + spot.dy - enemyHeight(en) - Math.round(enemyLook(en.kind, en.boss).lift * H) - (en.boss ? 12 : 6);
            show(spot.x, top - 4, tg.amount, a.crit, tg.matchup, a.element, false, n);
            if (n === 0) {
              const tags: [string, string][] = [];
              if (a.ambush) tags.push(["Ambush!", "#FFA300"]);
              if (a.execute) tags.push(["Execute!", "#FF5A3C"]);
              if (a.double) tags.push(["Twin strike!", "#B35CFF"]);
              tags.forEach(([label, col], j) => text(label, spot.x, top - 22 - j * 8 - rise, col, 6, true));
            }
          });
          if (a.lastStand) {
            const me = heroSpot(a.actor);
            text("Last stand!", me.x, ground + me.dy + 9, "#FF5A3C", 6, true);
          }
          if (a.leech) {
            const me = heroSpot(a.actor);
            text(`+${a.leech}`, me.x, ground + me.dy - H - 6 - rise, "#00E436", 8, true);
          }
        } else if (a.kind === "hit") {
          const spot = heroSpot(a.target);
          show(spot.x, ground + spot.dy - H - 6, a.amount, a.crit, a.matchup, a.element, true, 0);
          if (a.taunt) text("Taunt!", spot.x, ground + spot.dy - H - 20 - rise, "#29ADFF", 6, true);
          if (a.ward) text("Ward", spot.x, ground + spot.dy + 9, ELEMENT_DEFS[a.element].color, 6, true);
          if (a.rally) text("Vengeance!", cx, BY + 16, "#FF5A3C", 10, true);
        } else if (a.kind === "revive") {
          const spot = heroSpot(a.target);
          text("REVIVED!", spot.x, ground + spot.dy - H - 8 - rise, "#FFE36B", 10, true);
          text(`+${a.amount} HP`, spot.x, ground + spot.dy - H + 3 - rise, "#00E436", 7, true);
        } else if (a.kind === "heal") {
          const spot = heroSpot(a.target);
          text(`+${a.amount}`, spot.x, ground + spot.dy - H - 6 - rise, "#00E436", 9, true);
          burst(idx * 7, spot.x, ground + spot.dy - H / 2, k, "#00E436", 10, 0.9, 400);
        }
      }

      // ── Banners and moments ───────────────────────────────────────────────
      if (climbing) {
        // The hall goes dark between floors
        const dark = t < 0.4 ? ease((t - 0.2) / 0.2) : 1 - ease((t - 0.45) / 0.25);
        if (dark > 0) fill(`rgba(11,16,34,${Math.round(dark * 4) / 4 * 0.9})`);
        if (t > 0.3) {
          text(`Floor ${floor}`, cx, BY, "#FFF1E8", 14, true);
          text(zoneFor(Math.max(1, floor)).name, cx, BY + 11, "#C8CCE8", 7);
        }
      } else if (st?.kind === "gate") {
        const boss = st.enemies.find((en) => en.boss);
        fill(`rgba(11,16,34,${rm ? 0.4 : (Math.round(Math.min(1, t * 2.5) * 4) / 4) * 0.5})`);
        text(`Floor ${st.floor}`, cx, BY - 8, "#C8CCE8", 7, true);
        if (boss) {
          text("BOSS", cx, BY + 4, "#FF004D", 9, true);
          text(boss.name, cx, BY + 22, "#FFA300", 18, true);
          text(zoneFor(st.floor).name, cx, BY + 33, "#C8CCE8", 7);
        }
      } else if (st?.kind === "record") {
        if (!rm && t < 0.25) fill(`rgba(255,241,232,${(Math.round((0.25 - t) * 8 * 4) / 4) * 0.5})`);
        text("New record", cx, BY + 6, "#FFA300", 18, true);
        text(`Past your best floor ${st.floor - 1}`, cx, BY + 18, "#FFF1E8", 8);
        burst(idx, cx, BY, e, "#FFA300", 34, 3, 1100);
      } else if (st?.kind === "revive" && st.event) {
        const spot = heroSpot(st.event.target);
        text("Phoenix feather", cx, BY, "#FFE36B", 10, true);
        if (e >= 300) {
          const r = Math.round(Math.min(1, (e - 300) / 500) * 12);
          text("REVIVED!", spot.x, ground + spot.dy - H - 8 - r, "#FFE36B", 10, true);
          text(`+${st.event.amount} HP`, spot.x, ground + spot.dy - H + 3 - r, "#00E436", 7, true);
        }
      } else if (st?.kind === "clear") {
        text(`Floor ${st.floor} cleared`, cx, BY, "#00E436", 10, true);
        st.restHeal?.forEach((h, i) => {
          if (h <= 0) return;
          const spot = heroSpot(i);
          text(`+${h}`, spot.x, ground + spot.dy - H - 6 - Math.round(t * 12), "#00E436", 8, true);
        });
      } else if (st?.kind === "chest" && st.chest) {
        const chestX = Math.round(vw * 0.62), drop = Math.round((1 - ease(t / 0.35)) * 50);
        const bounce = t > 0.35 && t < 0.45 ? 2 : 0;
        drawChest(ctx, s, chestX, ground - drop - bounce, ease((t - 0.45) / 0.15));
        if (t > 0.6) {
          const b = blessingView(st.chest);
          text(chestName(st.chest), chestX + 7, ground - 30 - Math.round((t - 0.6) * 20), "#FFE36B", 9, true);
          if (b) text(b.text, chestX + 7, ground - 19 - Math.round((t - 0.6) * 20), "#FFF1E8", 6);
          burst(idx * 3, chestX + 7, ground - 12, e - 900, "#FFE36B", 16, 1.5, 600);
        }
      }
      // Skill banner in the tier colour; Legendary adds a screen-wide flash
      if (st?.kind === "act" && a?.skill && a.skill.rule !== "basic") {
        const col = TIER_COLOR[a.skill.tier];
        const yy = BY - 6 + (e < 120 ? Math.round((1 - e / 120) * -6) : 0);
        text(TIER_LABEL[a.skill.tier], cx, yy, col, 8, true);
        text(a.skill.name, cx, yy + 14, "#FFF1E8", 12, true);
        if (a.skill.rule === "legendary" && !rm && e >= IMPACT_MS && e < IMPACT_MS + 110) fill("rgba(255,163,0,0.22)");
      }
      // A boss falls: gold flash, then the banner over the slow-motion knock-out
      if (st?.kind === "act" && bossFalls(st) && e >= IMPACT_MS) {
        const k = e - IMPACT_MS;
        if (!rm && k < 90) fill("rgba(255,163,0,0.25)");
        if (k >= 160) {
          const pop = rm ? 0 : Math.round(Math.max(0, 1 - (k - 160) / 160) * 6);
          text("BOSS DEFEATED", cx, BY + 4 - pop, "#FFA300", 18, true);
          const boss = st.enemies.find((en) => en.boss);
          if (boss) text(boss.name, cx, BY + 16 - pop, "#FFF1E8", 8, true);
        }
      }
      const revFlashAt = st?.kind === "revive" ? 300 : st?.action?.kind === "revive" ? IMPACT_MS : -1;
      if (!rm && revFlashAt >= 0 && e >= revFlashAt && e < revFlashAt + 80) fill("rgba(255,227,107,0.18)");
      if (st && (st.kind === "fall" || st.kind === "end") && st.partyHp.every((h) => h <= 0)) {
        fill(`rgba(11,16,34,${(Math.round(Math.min(1, st.kind === "end" ? 1 : t) * 4) / 4) * 0.5})`);
        text(`Your party fell on floor ${st.floor}`, cx, BY, "#FFF1E8", 11, true);
      }
      if (!rm && st?.kind === "act" && a?.crit && e >= IMPACT_MS && e < IMPACT_MS + 50) fill("rgba(255,241,232,0.12)");
      // Standing: what waits on the next floor
      if (!st && preview.length) {
        const boss = preview.find((en) => en.boss);
        text(boss ? `Floor ${rf + 1}: ${boss.name}` : `Floor ${rf + 1}`, vw * 0.78, Math.round(vh * 0.2), boss ? "#FFA300" : "#C8CCE8", 7, true);
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    };

    const describe = (st: Step): string => {
      const names = [...new Set(st.enemies.map((en) => en.name))].join(", ");
      const a = st.action;
      if (st.kind === "climb") return `Climbing to floor ${st.floor}`;
      if (st.kind === "revive" && st.event) return `Phoenix feather: ${members[st.event.target]?.hero.name ?? "a hero"} gets back up`;
      if (st.kind === "gate") return `Boss: ${st.enemies.find((en) => en.boss)?.name ?? st.enemies[0]?.name ?? ""}`;
      if (st.kind === "clear") return `Floor ${st.floor} cleared`;
      if (st.kind === "chest" && st.chest) return `Boss chest: ${chestName(st.chest)}`;
      if (st.kind === "record") return "New record";
      if (st.kind === "fall" || st.kind === "end") return st.partyHp.every((h) => h <= 0) ? `Your party fell on floor ${st.floor}` : `Floor ${st.floor} cleared`;
      if (st.kind === "act" && a) {
        const hero = (i: number) => members[i]?.hero.name ?? "A hero";
        const foe = (i: number) => st.enemies[i]?.name ?? "an enemy";
        if (a.kind === "revive") return `${hero(a.target)} gets back up`;
        if (a.kind === "heal") return `${hero(a.actor)} heals ${hero(a.target)} for ${a.amount}`;
        if (a.kind === "stunned") return `${foe(a.actor)} is stunned`;
        if (a.side === "party") {
          const how = a.skill && a.skill.rule !== "basic" ? ` uses ${a.skill.name}!` : "";
          return `${hero(a.actor)}${how} → ${foe(a.target)} takes ${a.amount} damage${a.crit ? " (critical!)" : a.matchup === "weak" ? " (weak)" : ""}`;
        }
        return `${foe(a.actor)} hits ${hero(a.target)} for ${a.amount}${a.ko ? ", knocked out" : ""}`;
      }
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
    // Replays run every frame; standing still redraws ~15×/s for idle sheets and motes
    let raf = 0;
    let prev = performance.now();
    let lastIdle = 0;
    const tick = (now: number) => {
      const dt = Math.min(100, now - prev);
      prev = now;
      if (timeline && !finished) {
        clockRef.current += dt * speedRef.current;
        draw();
      } else if (now - lastIdle > 66) {
        lastIdle = now;
        draw();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [floors, members, load]);

  useEffect(() => {
    if (skipToken === 0) return;
    clockRef.current = Number.MAX_SAFE_INTEGER;
    drawRef.current();
  }, [skipToken]);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <span ref={fontRef} className="font-display pointer-events-none absolute opacity-0" aria-hidden>.</span>
      <canvas ref={canvasRef} role="img" aria-label="The arena: your party fighting this floor's enemies" style={{ display: "block" }} />
    </div>
  );
}
