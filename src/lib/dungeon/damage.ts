// =============================================================================
// Sprite Dungeon — the one damage formula (pure, unit-tested)
// =============================================================================
//   damage = ATK × 100 / (100 + DEF)      defence softens, never blocks
//          × element                      ×1.5 weakness, ×0.6 resisted, else ×1
//          × crit                         ×1.75 on a crit
//          × blessings                    run modifiers (e.g. +30% Fire)
//          × variance                     0.9 … 1.1, from the run's seeded rolls
//   rounded, at least 1.
// =============================================================================

import {
  CRIT_MULTIPLIER, DEF_SCALE, ELEMENT_DEFS, RESIST_MULTIPLIER, VARIANCE_MAX, VARIANCE_MIN, WEAK_MULTIPLIER, type Element,
} from "./config";

export type Matchup = "weak" | "resist" | "normal";

/** How an attack element fares against a defender element. Neutral attacks are always normal. */
export function matchup(attack: Element, defender: Element): Matchup {
  if (attack === "neutral") return "normal";
  const d = ELEMENT_DEFS[defender];
  if (d.weakTo.includes(attack)) return "weak";
  if (d.resists.includes(attack)) return "resist";
  return "normal";
}

export function elementMultiplier(attack: Element, defender: Element, weakMul = WEAK_MULTIPLIER): number {
  const m = matchup(attack, defender);
  return m === "weak" ? weakMul : m === "resist" ? RESIST_MULTIPLIER : 1;
}

export interface DamageInput {
  atk: number;
  def: number;
  attackElement: Element;
  defenderElement: Element;
  crit: boolean;
  /** Product of blessing / buff multipliers (1 = none). */
  modifier?: number;
  /** Seeded roll in [0, 1) → variance 0.9 … 1.1. */
  roll: number;
  /** Weakness multiplier (a blessing can raise it). */
  weakMul?: number;
  /** Crit multiplier (a blessing can raise it against bosses). */
  critMul?: number;
}

export function computeDamage(i: DamageInput): { amount: number; matchup: Matchup } {
  const m = matchup(i.attackElement, i.defenderElement);
  const variance = VARIANCE_MIN + i.roll * (VARIANCE_MAX - VARIANCE_MIN);
  const raw = i.atk * (DEF_SCALE / (DEF_SCALE + Math.max(0, i.def)))
    * elementMultiplier(i.attackElement, i.defenderElement, i.weakMul)
    * (i.crit ? i.critMul ?? CRIT_MULTIPLIER : 1)
    * (i.modifier ?? 1)
    * variance;
  return { amount: Math.max(1, Math.round(raw)), matchup: m };
}
