// =============================================================================
// Sprite Dungeon — what a sprite IS: class, element, weapon kind, stars (pure)
// =============================================================================
// Every rule reads a fact the player can see: words in the prompt, the
// category, and the work done on the sprite (HD, animations). See config.ts.
// =============================================================================

import {
  BLADE_KEYWORDS, CLASSES, CLASS_FALLBACK, CLASS_ORDER, ELEMENT_DEFS, ELEMENT_ORDER, FIGURE_CATEGORIES, GEAR_CATEGORY,
  HEAL_TRINKET_KEYWORDS, MAX_STARS, MULTI_ANIMATION_COUNT, STAFF_KEYWORDS, type ClassId, type Element, type SpriteSlot,
} from "./config";

/** Facts the server reads from the database for one sprite. */
export interface SpriteFacts {
  id: string;
  categoryId: string;
  styleId: string;
  prompt: string;
  hd: boolean;
  /** Number of different animations made from it (by animation label). */
  animations: number;
  /** A 4-direction walk or a rotation set was made from it. */
  rotated: boolean;
}

/** Lower-cased words of a prompt (letters only). */
export function words(prompt: string): Set<string> {
  const out = new Set<string>();
  for (const w of prompt.toLowerCase().split(/[^a-z]+/)) {
    if (!w) continue;
    out.add(w);
    if (w.length > 3 && w.endsWith("s")) out.add(w.slice(0, -1)); // "knights" → "knight"
  }
  return out;
}

const hasAny = (ws: Set<string>, list: string[]) => list.some((k) => ws.has(k));

export function slotFor(categoryId: string): SpriteSlot {
  if (FIGURE_CATEGORIES.includes(categoryId)) return "hero";
  return GEAR_CATEGORY[categoryId] ?? "trinket";
}

/** Class and the prompt word that decided it (null word = fallback by category). */
export function classMatch(prompt: string, categoryId: string): { id: ClassId; word: string | null } | null {
  if (!FIGURE_CATEGORIES.includes(categoryId)) return null;
  const ws = words(prompt);
  for (const id of CLASS_ORDER) {
    const word = CLASSES[id].keywords.find((k) => ws.has(k));
    if (word) return { id, word };
  }
  return { id: CLASS_FALLBACK[categoryId] ?? "striker", word: null };
}

/** Class from prompt keywords (priority order), else by category. Non-figures have none. */
export function classFor(prompt: string, categoryId: string): ClassId | null {
  return classMatch(prompt, categoryId)?.id ?? null;
}

/** Element and the prompt word that decided it. */
export function elementMatch(prompt: string): { element: Element; word: string | null } {
  const ws = words(prompt);
  for (const e of ELEMENT_ORDER) {
    const word = ELEMENT_DEFS[e].keywords.find((k) => ws.has(k));
    if (word) return { element: e, word };
  }
  return { element: "neutral", word: null };
}

export function elementFor(prompt: string): Element {
  return elementMatch(prompt).element;
}

export type WeaponKind = "blade" | "staff" | "plain";
export function weaponKind(prompt: string): WeaponKind {
  const ws = words(prompt);
  if (hasAny(ws, STAFF_KEYWORDS)) return "staff";
  if (hasAny(ws, BLADE_KEYWORDS)) return "blade";
  return "plain";
}

export type TrinketKind = "heal" | "ward" | "small-heal";
export function trinketKind(prompt: string): TrinketKind {
  if (hasAny(words(prompt), HEAL_TRINKET_KEYWORDS)) return "heal";
  return elementFor(prompt) === "neutral" ? "small-heal" : "ward";
}

export interface StarBreakdown {
  stars: number;
  hd: boolean;
  animated: boolean;
  /** ≥3 different animations or a walk / rotation set. */
  showcase: boolean;
}

/** ★ plain, +★ HD, +★ animated, +★ three different animations or a walk / rotation set. */
export function starsFor(f: Pick<SpriteFacts, "hd" | "animations" | "rotated">): StarBreakdown {
  const animated = f.animations > 0 || f.rotated;
  const showcase = f.animations >= MULTI_ANIMATION_COUNT || f.rotated;
  const stars = Math.min(MAX_STARS, 1 + (f.hd ? 1 : 0) + (animated ? 1 : 0) + (showcase ? 1 : 0));
  return { stars, hd: f.hd, animated, showcase };
}
