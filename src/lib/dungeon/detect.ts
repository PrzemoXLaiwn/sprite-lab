// =============================================================================
// Sprite Dungeon — what a sprite IS: class, element, weapon kind, stars (pure)
// =============================================================================
// Every rule reads a fact the player can see: words in the prompt, the
// category, and the work done on the sprite (HD, animations). See config.ts.
// =============================================================================

import {
  BLADE_KEYWORDS, CLASSES, CLASS_FALLBACK, CLASS_ORDER, ELEMENT_COLOURS, ELEMENT_CREATURES, ELEMENT_DEFS, ELEMENT_ORDER, FIGURE_CATEGORIES, GEAR_CATEGORY,
  HEAL_TRINKET_KEYWORDS, HD_MULTIPLIER, MAX_COUNTED_ANIMATIONS, MAX_STARS, STAFF_KEYWORDS, animationMultiplier, animationStep, type ClassId, type Element, type SpriteSlot,
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

export type ElementRule = "word" | "colour" | "creature" | "none";

export interface ElementSource {
  element: Element;
  /** The prompt word or phrase that decided it (null when nothing matched). */
  word: string | null;
  rule: ElementRule;
}

/** " red dragon breathing fire " — lower-case words, single spaces, padded for phrase search. */
function phraseText(prompt: string): string {
  return ` ${prompt.toLowerCase().split(/[^a-z]+/).filter(Boolean).join(" ")} `;
}

/** Earliest match of any key (whole words or phrases, plural "s" allowed); ties go to the longer key. */
function earliest<T>(text: string, table: [string, T][]): { key: string; value: T } | null {
  let best: { key: string; value: T; at: number } | null = null;
  for (const [key, value] of table) {
    for (const form of [key, `${key}s`]) {
      const at = text.indexOf(` ${form} `);
      if (at >= 0 && (!best || at < best.at || (at === best.at && key.length > best.key.length))) best = { key, value, at };
    }
  }
  return best ? { key: best.key, value: best.value } : null;
}

const ELEMENT_WORD_TABLE: [string, Element][] = ELEMENT_ORDER.flatMap((e) => ELEMENT_DEFS[e].keywords.map((k): [string, Element] => [k, e]));

/**
 * Element of a prompt, and which rule decided it:
 * element words → colour words → creature defaults → Neutral (tables in config.ts).
 */
export function elementMatch(prompt: string): ElementSource {
  const text = phraseText(prompt);
  const word = earliest(text, ELEMENT_WORD_TABLE);
  if (word) return { element: word.value, word: word.key, rule: "word" };
  const colour = earliest(text, Object.entries(ELEMENT_COLOURS));
  if (colour) return { element: colour.value, word: colour.key, rule: "colour" };
  const creature = earliest(text, Object.entries(ELEMENT_CREATURES));
  if (creature) return { element: creature.value, word: creature.key, rule: "creature" };
  return { element: "neutral", word: null, rule: "none" };
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
}

/** Items: ★ plain, +★ HD, +★ animated (max 3). */
export function starsFor(f: Pick<SpriteFacts, "hd" | "animations" | "rotated">): StarBreakdown {
  const animated = f.animations > 0 || f.rotated;
  const stars = Math.min(MAX_STARS, 1 + (f.hd ? 1 : 0) + (animated ? 1 : 0));
  return { stars, hd: f.hd, animated };
}

export interface HeroWork {
  /** ★ plain + HD + one per different animation (counted up to the cap). */
  stars: number;
  hd: boolean;
  /** Different animations made from the sprite. */
  animations: number;
  /** What each counted animation added, in order (+0.30, +0.24, …). */
  steps: number[];
  hdMultiplier: number;
  animationMultiplier: number;
  multiplier: number;
}

/** Heroes: HD ×1.3, and every different animation adds power with diminishing returns (config.ts). */
export function heroWork(f: Pick<SpriteFacts, "hd" | "animations" | "rotated">): HeroWork {
  const animations = Math.max(f.animations, f.rotated ? 1 : 0);
  const counted = Math.min(animations, MAX_COUNTED_ANIMATIONS);
  const steps = Array.from({ length: counted }, (_, i) => Math.round(animationStep(i + 1) * 1000) / 1000);
  const hdMultiplier = f.hd ? HD_MULTIPLIER : 1;
  const am = animationMultiplier(animations);
  return {
    stars: 1 + (f.hd ? 1 : 0) + counted, hd: f.hd, animations, steps, hdMultiplier, animationMultiplier: am,
    multiplier: Math.round(hdMultiplier * am * 1000) / 1000,
  };
}
