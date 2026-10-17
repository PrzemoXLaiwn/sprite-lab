// =============================================================================
// Sprite Dungeon — which of a hero's real animations to play in battle (pure)
// =============================================================================
// Animations are generations with subcategory 'ANIMATION' and
// source_generation_id = the hero. Their prompt starts with
// "[Animation: <label>, <n>f]"; the label decides the role below. The newest
// sheet per role wins. Rotation sets ("4 directions") are views, not motion,
// and are skipped; a 4-direction walk set is used for climbing.
// =============================================================================

import { parseAnimationPrompt } from "@/lib/workspace/history";

export type AnimRole = "idle" | "attack" | "walk" | "hurt" | "defeat";

export interface AnimRef {
  /** Animation generation id (when known). */
  id?: string;
  url: string;
  label: string;
  frameCount: number;
  /** 4-row walk set (rows: front, right, back, left). */
  walkSet: boolean;
  fps: number;
}

export type HeroAnims = Partial<Record<AnimRole, AnimRef>>;

/** Label words per role (whole words, case-insensitive). Order = role priority. */
export const ANIM_ROLE_WORDS: [AnimRole, string[]][] = [
  ["walk", ["walk", "run", "move", "march", "fly", "hop", "slither", "crawl", "4-direction walk"]],
  ["attack", ["attack", "slash", "strike", "cast", "shoot", "punch", "slam", "bite", "breath", "breathe fire", "swing", "stab", "thrust", "claw", "special", "roar", "spell", "magic", "smash", "kick", "fire", "shot", "throw", "custom"]],
  ["hurt", ["hurt", "hit", "flinch", "damage", "stagger"]],
  ["defeat", ["death", "defeat", "die", "dying", "faint", "ko"]],
  ["idle", ["idle", "breathe", "breathing", "stand", "standing", "loop", "bob", "float", "hover"]],
];

export function roleOf(label: string): AnimRole | null {
  const l = ` ${label.toLowerCase().replace(/[^a-z0-9-]+/g, " ").trim()} `;
  if (/^ (4|8) directions $/.test(l)) return null;
  for (const [role, words] of ANIM_ROLE_WORDS) if (words.some((w) => l.includes(` ${w} `))) return role;
  return null;
}

function fpsFor(role: AnimRole, frameCount: number, walkSet: boolean): number {
  if (walkSet) return 8;
  if (role === "idle") return Math.min(8, Math.max(4, frameCount));
  if (role === "walk") return 10;
  return frameCount >= 9 ? 14 : 12;
}

export interface AnimRow {
  id?: string;
  source_generation_id: string;
  prompt: string;
  image_url: string;
}

/** Rows newest first → per hero, the newest sheet for each role. */
export function pickAnimations(rows: AnimRow[]): Record<string, HeroAnims> {
  const out: Record<string, HeroAnims> = {};
  for (const r of rows) {
    const p = parseAnimationPrompt(r.prompt);
    if (!p || (p.directions && !p.walkSet)) continue;
    const role = p.walkSet ? "walk" : roleOf(p.label);
    if (!role) continue;
    const hero = (out[r.source_generation_id] ??= {});
    if (hero[role]) continue;
    hero[role] = { id: r.id, url: r.image_url, label: p.label, frameCount: p.frameCount, walkSet: p.walkSet, fps: fpsFor(role, p.frameCount, p.walkSet) };
  }
  return out;
}
