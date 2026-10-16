// =============================================================================
// Sprite Dungeon — member stats, derived on the server from facts about sprites
// =============================================================================
// A member = a figure sprite (CHARACTERS → Hero, CREATURES → Beast) plus up to
// three gear sprites. The member's base comes from its own sprite (role ×
// roll × animated × HD × party synergy); each item adds its slot bonus scaled
// by the item's own roll × animated × HD.
// =============================================================================

import {
  ANIMATED_BONUS, FIGURE_ROLE, GEAR_BONUS, GEAR_CATEGORY, GEAR_SLOTS, HD_BONUS, PARTY_SIZE, ROLES, ROLL_MAX, ROLL_MIN,
  STYLE_SYNERGY_MAX, STYLE_SYNERGY_STEP, type GearSlot, type Role, type SpriteSlot,
} from "./config";
import { hashUnit } from "./rng";

/** What the server knows about one of the user's sprites. */
export interface SpriteFacts {
  id: string;
  categoryId: string;
  styleId: string;
  /** At least one animation was generated from this sprite. */
  animated: boolean;
  /** Rendered with the HD model. */
  hd: boolean;
}

export interface MemberFacts {
  hero: SpriteFacts;
  weapon?: SpriteFacts | null;
  armor?: SpriteFacts | null;
  trinket?: SpriteFacts | null;
}

export interface StatBlock {
  hp: number;
  atk: number;
  def: number;
  /** HP restored to the weakest hurt ally at the start of the member's turn. */
  heal: number;
  /** Extra crit chance (0.05 = +5 percentage points). */
  crit: number;
}

export interface UnitStats extends StatBlock {
  id: string;
  role: Role;
  /** One display number so players can compare at a glance. */
  power: number;
  animated: boolean;
  hd: boolean;
  gear: Partial<Record<GearSlot, string>>;
}

export function slotFor(categoryId: string): SpriteSlot {
  if (FIGURE_ROLE[categoryId]) return "hero";
  return GEAR_CATEGORY[categoryId] ?? "trinket";
}

export function roleFor(categoryId: string): Role | null {
  return FIGURE_ROLE[categoryId] ?? null;
}

/** Stable roll from the generation id, in [ROLL_MIN, ROLL_MAX]. */
export function baseRoll(generationId: string): number {
  return ROLL_MIN + hashUnit(`roll:${generationId}`) * (ROLL_MAX - ROLL_MIN);
}

/** roll × animated × HD of one sprite. */
export function spriteMultiplier(f: SpriteFacts): number {
  return baseRoll(f.id) * (f.animated ? 1 + ANIMATED_BONUS : 1) * (f.hd ? 1 + HD_BONUS : 1);
}

/** Synergy for the whole party: +5% per extra distinct style among the heroes, capped. */
export function styleSynergy(styleIds: string[]): number {
  const distinct = new Set(styleIds.filter(Boolean)).size;
  return Math.min(STYLE_SYNERGY_MAX, Math.max(0, distinct - 1) * STYLE_SYNERGY_STEP);
}

export function powerOf(s: StatBlock): number {
  return Math.round(s.hp / 2 + s.atk * 3 + s.def * 4 + s.heal * 3 + s.crit * 100);
}

/** What one item adds when equipped in `slot`. */
export function gearBonus(item: SpriteFacts, slot: GearSlot): StatBlock {
  const b = GEAR_BONUS[slot];
  const m = spriteMultiplier(item);
  return {
    hp: Math.round(b.hp * m),
    atk: Math.round(b.atk * m),
    def: Math.round(b.def * m),
    heal: Math.round(b.heal * m),
    crit: Math.round(b.crit * m * 1000) / 1000,
  };
}

/** Stats of one member with its gear. `synergy` is the party bonus (0 when shown alone). */
export function deriveMember(m: MemberFacts, synergy = 0): UnitStats {
  const role = roleFor(m.hero.categoryId) ?? "hero";
  const base = ROLES[role];
  const mult = spriteMultiplier(m.hero) * (1 + synergy);
  const s: StatBlock = {
    hp: Math.round(base.hp * mult),
    atk: Math.round(base.atk * mult),
    def: Math.round(base.def * baseRoll(m.hero.id)),
    heal: 0,
    crit: 0,
  };
  const gear: Partial<Record<GearSlot, string>> = {};
  for (const slot of GEAR_SLOTS) {
    const item = m[slot];
    if (!item) continue;
    const b = gearBonus(item, slot);
    s.hp += b.hp; s.atk += b.atk; s.def += b.def; s.heal += b.heal;
    s.crit = Math.round((s.crit + b.crit) * 1000) / 1000;
    gear[slot] = item.id;
  }
  return { id: m.hero.id, role, ...s, power: powerOf(s), animated: m.hero.animated, hd: m.hero.hd, gear };
}

/** A bare member (no gear, no synergy) — the roster's per-hero number. */
export function deriveUnit(f: SpriteFacts): UnitStats {
  return deriveMember({ hero: f });
}

/** Stats of a whole party (max 4), synergy included. Members are assumed validated. */
export function deriveParty(members: MemberFacts[]): UnitStats[] {
  const list = members.slice(0, PARTY_SIZE);
  const synergy = styleSynergy(list.map((m) => m.hero.styleId));
  return list.map((m) => deriveMember(m, synergy));
}
