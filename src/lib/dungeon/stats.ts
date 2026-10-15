// =============================================================================
// Sprite Dungeon — unit stats, derived on the server from facts about the sprite
// =============================================================================

import {
  ANIMATED_BONUS, CATEGORY_ROLE, HD_BONUS, PARTY_SIZE, ROLES, ROLL_MAX, ROLL_MIN,
  STYLE_SYNERGY_MAX, STYLE_SYNERGY_STEP, type Role,
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

export interface UnitStats {
  id: string;
  role: Role;
  hp: number;
  atk: number;
  def: number;
  heal: number;
  /** One display number so players can compare sprites at a glance. */
  power: number;
  animated: boolean;
  hd: boolean;
}

export function roleFor(categoryId: string): Role {
  return CATEGORY_ROLE[categoryId] ?? "charm";
}

/** Stable roll from the generation id, in [ROLL_MIN, ROLL_MAX]. */
export function baseRoll(generationId: string): number {
  return ROLL_MIN + hashUnit(`roll:${generationId}`) * (ROLL_MAX - ROLL_MIN);
}

/** Synergy for the whole party: +5% per extra distinct style, capped. */
export function styleSynergy(styleIds: string[]): number {
  const distinct = new Set(styleIds.filter(Boolean)).size;
  return Math.min(STYLE_SYNERGY_MAX, Math.max(0, distinct - 1) * STYLE_SYNERGY_STEP);
}

export function powerOf(s: Pick<UnitStats, "hp" | "atk" | "def" | "heal">): number {
  return Math.round(s.hp / 2 + s.atk * 3 + s.def * 4 + s.heal * 3);
}

/** Stats of one sprite. `synergy` is the party bonus (0 when shown on its own). */
export function deriveUnit(f: SpriteFacts, synergy = 0): UnitStats {
  const role = roleFor(f.categoryId);
  const base = ROLES[role];
  const roll = baseRoll(f.id);
  const power = (f.animated ? 1 + ANIMATED_BONUS : 1) * (f.hd ? 1 + HD_BONUS : 1);
  const party = 1 + synergy;
  const hp = Math.round(base.hp * roll * power * party);
  const atk = Math.round(base.atk * roll * power * party);
  const def = Math.round(base.def * roll);
  const heal = Math.round(base.heal * roll * power);
  return { id: f.id, role, hp, atk, def, heal, power: powerOf({ hp, atk, def, heal }), animated: f.animated, hd: f.hd };
}

/** Stats of a whole party (max 4, duplicates dropped), synergy included. */
export function deriveParty(sprites: SpriteFacts[]): UnitStats[] {
  const seen = new Set<string>();
  const unique = sprites.filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true))).slice(0, PARTY_SIZE);
  const synergy = styleSynergy(unique.map((s) => s.styleId));
  return unique.map((s) => deriveUnit(s, synergy));
}
