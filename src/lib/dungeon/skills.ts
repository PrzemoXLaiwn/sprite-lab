// =============================================================================
// Sprite Dungeon — skills: a hero's attack animations, scored and slotted (pure)
// =============================================================================
// Score = how spectacular an attack animation is, measured on its sheet:
// frames, motion, reach and new effect colours (weights in config.ts). The
// score gives a tier; tiers decide which slot an animation may sit in and what
// it does in battle. Everything here is deterministic and unit-tested; the
// server-side pixel loading lives in skill-analyse.ts.
// =============================================================================

import {
  SCORE_AREA_FULL, SCORE_MOTION_FULL, SCORE_WEIGHTS, SKILL_SLOTS, SKILL_WORDS, SLOT_MIN_TIER, TIERS, TIER_MIN,
  type SkillSlot, type Tier,
} from "./config";

/** RGBA pixels (4 bytes per pixel, row-major). */
export interface Raster {
  w: number;
  h: number;
  data: Uint8Array | Uint8ClampedArray | Buffer;
}

export interface SkillMetrics {
  frames: number;
  framesPts: number;
  /** Mean share of the subject that changes between consecutive frames (0–1). */
  motion: number;
  motionPts: number;
  /** Combined outline of the frames vs the sprite's own (1 = same size). */
  reach: number;
  reachPts: number;
  /** Distinct quantised colours not in the sprite. */
  newColours: number;
  /** Share of the frames' opaque area painted in those colours (0–1). */
  coverage: number;
  effectsPts: number;
}

export interface SkillScore {
  score: number;
  tier: Tier;
  metrics: SkillMetrics;
}

const ALPHA = 32;

export function isSkillLabel(label: string): boolean {
  const l = ` ${label.toLowerCase().replace(/[^a-z]+/g, " ").trim()} `;
  return SKILL_WORDS.some((w) => l.includes(` ${w} `));
}

export function tierFor(score: number): Tier {
  let t: Tier = "common";
  for (const tier of TIERS) if (score >= TIER_MIN[tier]) t = tier;
  return t;
}

const tierRank = (t: Tier) => TIERS.indexOf(t);

export function slotAccepts(slot: SkillSlot, tier: Tier): boolean {
  return tierRank(tier) >= tierRank(SLOT_MIN_TIER[slot]);
}

function bbox(r: Raster): { x0: number; y0: number; x1: number; y1: number; count: number } | null {
  let x0 = r.w, y0 = r.h, x1 = -1, y1 = -1, count = 0;
  for (let y = 0; y < r.h; y++) {
    for (let x = 0; x < r.w; x++) {
      if (r.data[(y * r.w + x) * 4 + 3] < ALPHA) continue;
      count++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, count };
}

const bin = (d: Raster["data"], i: number) => ((d[i] >> 5) << 6) | ((d[i + 1] >> 5) << 3) | (d[i + 2] >> 5);

/** Score an attack animation from its frames (and the sprite it was made from, when available). */
export function scoreSkill(input: { frames: Raster[]; source: Raster | null; frameCount: number }): SkillScore {
  const { frames } = input;
  const W = SCORE_WEIGHTS;

  // Frames
  const framesPts = Math.max(0, Math.min(W.frames, Math.round(((input.frameCount - 2) * W.frames) / 7)));

  // Motion: changed pixels between consecutive frames / their combined subject
  let motionSum = 0, pairs = 0;
  for (let i = 0; i + 1 < frames.length; i++) {
    const a = frames[i], b = frames[i + 1];
    if (a.w !== b.w || a.h !== b.h) continue;
    let changed = 0, union = 0;
    for (let p = 0; p < a.w * a.h * 4; p += 4) {
      const oa = a.data[p + 3] >= ALPHA, ob = b.data[p + 3] >= ALPHA;
      if (!oa && !ob) continue;
      union++;
      if (oa !== ob) changed++;
      else if (Math.abs(a.data[p] - b.data[p]) + Math.abs(a.data[p + 1] - b.data[p + 1]) + Math.abs(a.data[p + 2] - b.data[p + 2]) > 60) changed++;
    }
    if (union) { motionSum += changed / union; pairs++; }
  }
  const motion = pairs ? motionSum / pairs : 0;
  const motionPts = Math.min(W.motion, Math.round((motion / SCORE_MOTION_FULL) * W.motion));

  // Reach: union of the frames' outlines vs the sprite's own outline (as shares of each canvas)
  const boxes = frames.map(bbox).filter((b): b is NonNullable<ReturnType<typeof bbox>> => b !== null);
  let reach = 1;
  if (boxes.length) {
    const fw = frames[0].w, fh = frames[0].h;
    const uw = (Math.max(...boxes.map((b) => b.x1)) - Math.min(...boxes.map((b) => b.x0)) + 1) / fw;
    const uh = (Math.max(...boxes.map((b) => b.y1)) - Math.min(...boxes.map((b) => b.y0)) + 1) / fh;
    const base = input.source ? bbox(input.source) : boxes[0];
    const bw = base ? (base.x1 - base.x0 + 1) / (input.source ? input.source.w : fw) : uw;
    const bh = base ? (base.y1 - base.y0 + 1) / (input.source ? input.source.h : fh) : uh;
    reach = Math.max(uw / Math.max(bw, 1e-3), uh / Math.max(bh, 1e-3));
  }
  reach = Math.round(reach * 100) / 100;
  const reachPts = Math.max(0, Math.min(W.reach, Math.round((reach - 1) * W.reach)));

  // Effects: quantised colours that the sprite doesn't have, and the area they cover
  const palette = new Set<number>();
  const paletteRef = input.source ?? frames[0];
  if (paletteRef) {
    const counts = new Map<number, number>();
    let total = 0;
    for (let p = 0; p < paletteRef.w * paletteRef.h * 4; p += 4) {
      if (paletteRef.data[p + 3] < ALPHA) continue;
      total++;
      const k = bin(paletteRef.data, p);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    for (const [k, c] of counts) if (c >= Math.max(1, total * 0.002)) palette.add(k);
  }
  const fresh = new Map<number, number>();
  let opaque = 0, freshPixels = 0;
  for (const f of input.source ? frames : frames.slice(1)) {
    for (let p = 0; p < f.w * f.h * 4; p += 4) {
      if (f.data[p + 3] < ALPHA) continue;
      opaque++;
      const k = bin(f.data, p);
      if (palette.has(k)) continue;
      freshPixels++;
      fresh.set(k, (fresh.get(k) ?? 0) + 1);
    }
  }
  const minCount = Math.max(4, opaque * 0.001);
  const newColours = [...fresh.values()].filter((c) => c >= minCount).length;
  const coverage = opaque ? freshPixels / opaque : 0;
  const effectsPts = Math.min(W.effectColours, Math.round(newColours * 1.5)) + Math.min(W.effectArea, Math.round((coverage / SCORE_AREA_FULL) * W.effectArea));

  const score = Math.max(0, Math.min(100, framesPts + motionPts + reachPts + effectsPts));
  return {
    score,
    tier: tierFor(score),
    metrics: {
      frames: input.frameCount, framesPts, motion: Math.round(motion * 1000) / 1000, motionPts, reach, reachPts,
      newColours, coverage: Math.round(coverage * 1000) / 1000, effectsPts,
    },
  };
}

/** Score used while an animation hasn't been analysed yet, or analysis failed. */
export const NEUTRAL_SCORE: SkillScore = {
  score: 20, tier: "common",
  metrics: { frames: 0, framesPts: 0, motion: 0, motionPts: 0, reach: 1, reachPts: 0, newColours: 0, coverage: 0, effectsPts: 0 },
};

export interface SkillOption {
  /** Animation generation id. */
  id: string;
  score: number;
  tier: Tier;
}

export type SkillChoice = Partial<Record<SkillSlot, string>>;

/**
 * Auto-assignment: best animations first, each into the highest free slot its
 * tier qualifies for (Legendary needs Epic+, Special needs Rare+, Basic takes any).
 */
export function autoAssignSkills(options: SkillOption[]): SkillChoice {
  const out: SkillChoice = {};
  const sorted = [...options].sort((a, b) => b.score - a.score || (a.id < b.id ? -1 : 1));
  for (const o of sorted) {
    for (const slot of ["legendary", "special", "basic"] as SkillSlot[]) {
      if (!out[slot] && slotAccepts(slot, o.tier)) { out[slot] = o.id; break; }
    }
  }
  return out;
}

/**
 * Keeps a player's choice only where it's valid: the hero's own attack
 * animations, a tier the slot accepts, each animation in one slot.
 * Slots the player left empty are filled automatically.
 */
export function resolveSkills(choice: SkillChoice | undefined, options: SkillOption[]): SkillChoice {
  if (!choice) return autoAssignSkills(options);
  const byId = new Map(options.map((o) => [o.id, o]));
  const out: SkillChoice = {};
  const used = new Set<string>();
  for (const slot of SKILL_SLOTS) {
    const id = choice[slot];
    const o = id ? byId.get(id) : undefined;
    if (!o || used.has(o.id) || !slotAccepts(slot, o.tier)) continue;
    out[slot] = o.id;
    used.add(o.id);
  }
  // Fill the rest with the best unused options
  const rest = autoAssignSkills(options.filter((o) => !used.has(o.id)));
  for (const slot of SKILL_SLOTS) if (!out[slot] && rest[slot] && !Object.values(out).includes(rest[slot])) out[slot] = rest[slot];
  return out;
}

/** "ground slam" → "Ground Slam". */
export function skillName(label: string): string {
  // A custom animation is the user's own move: name it like one
  if (label.trim().toLowerCase() === "custom") return "Signature Move";
  return label.replace(/[^a-zA-Z0-9 -]+/g, " ").trim().split(/\s+/).map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ") || "Attack";
}
