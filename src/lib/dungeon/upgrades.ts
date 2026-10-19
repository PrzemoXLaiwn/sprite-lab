// =============================================================================
// Sprite Dungeon — "next upgrades": what the player can do in SpriteLab now
// =============================================================================
// Pure. Every suggestion is built from the party's real stats and the same
// rules the battle uses (config.ts, detect.ts), and every cost comes from the
// pricing config the tools charge from. Nothing here changes a stat: it only
// says what an existing action would do.
// =============================================================================

import {
  ANIMATION_DECAY, ARMOR_DEF, ARMOR_HP, GEAR_LABEL, GEAR_MAKE_CATEGORY, GEAR_SLOTS, HD_MULTIPLIER, HERO_MAKE_CATEGORY,
  MAX_COUNTED_ANIMATIONS, SKILL_POWER, TRINKET_HEAL, WEAPON_ATK, animationMultiplier, animationStep, type GearSlot,
} from "./config";
import type { DungeonSprite, PartyMember } from "./store";

/** Credit prices of the actions a suggestion leads to (passed in from the pricing config). */
export interface UpgradeCosts {
  /** A standard sprite. */
  sprite: number;
  /** A sprite in HD. */
  hdSprite: number;
  /** The cheapest animation (breathing idle). */
  animationMin: number;
  /** The most a single animation costs without smooth mode. */
  animationMax: number;
  /** The cheapest animation that can be an attack (the breathing idle can't). */
  attackMin: number;
}

export type UpgradeKind = "equip" | "animate" | "make-gear" | "attack-skill" | "hd-hero";

export interface Upgrade {
  /** Stable key, also sent to analytics (never a prompt). */
  id: string;
  kind: UpgradeKind;
  heroIndex: number;
  heroName: string;
  /** What the hero has now. */
  now: string;
  /** What the action does, from the game's own numbers. */
  effect: string;
  /** Button label. */
  action: string;
  /** "Free", "1 credit", "3–12 credits". */
  cost: string;
  /** A SpriteLab tool, or null when the page opens its own gear picker. */
  href: string | null;
  picker?: { index: number; slot: GearSlot };
}

const credits = (a: number, b = a) => (a === b ? `${a} credit${a === 1 ? "" : "s"}` : `${a}–${b} credits`);
const short = (n: string) => (n.length > 24 ? `${n.slice(0, 23)}…` : n);
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** What a fresh one-star item of this slot adds (the numbers itemBonus uses). */
export const NEW_GEAR_EFFECT: Record<GearSlot, string> = {
  weapon: `+${WEAPON_ATK} ATK at one star, more for blades (crit) and staves (splash)`,
  armor: `+${ARMOR_HP} HP and +${ARMOR_DEF} DEF at one star`,
  trinket: `a potion or food heals the weakest ally ${TRINKET_HEAL} HP a turn at one star`,
};

/**
 * Up to `max` upgrades, best first: free gear the player already owns, then
 * the first animation of an unanimated hero, then gear to make, then an
 * attack animation (skill), then HD for the next hero. One per hero and kind.
 */
export function partyUpgrades(members: PartyMember[], roster: DungeonSprite[], costs: UpgradeCosts, max = 3): Upgrade[] {
  const used = new Set<string>();
  for (const m of members) for (const s of GEAR_SLOTS) if (m[s]) used.add(m[s]!.id);
  const spare = (slot: GearSlot) => roster
    .filter((s) => s.slot === slot && !used.has(s.id))
    .sort((a, b) => b.power - a.power)[0];

  const equip: Upgrade[] = [], firstAnim: Upgrade[] = [], make: Upgrade[] = [], skill: Upgrade[] = [], moreAnim: Upgrade[] = [];
  const takenSpare = new Set<string>();

  members.forEach((m, i) => {
    const name = short(m.hero.name);
    for (const slot of GEAR_SLOTS) {
      if (m[slot]) continue;
      const item = spare(slot);
      if (item && !takenSpare.has(item.id)) {
        takenSpare.add(item.id);
        equip.push({
          id: `equip:${slot}:${i}`, kind: "equip", heroIndex: i, heroName: name,
          now: `${name} has no ${GEAR_LABEL[slot].toLowerCase()}`,
          effect: `Equip your ${short(item.name)}: ${item.bonus?.text ?? NEW_GEAR_EFFECT[slot]}`,
          action: `Equip ${GEAR_LABEL[slot].toLowerCase()}`, cost: "Free", href: null, picker: { index: i, slot },
        });
      } else if (!item) {
        make.push({
          id: `make:${slot}:${i}`, kind: "make-gear", heroIndex: i, heroName: name,
          now: `${name} has no ${GEAR_LABEL[slot].toLowerCase()}`,
          effect: `Make one and equip it: ${NEW_GEAR_EFFECT[slot]}`,
          action: `Make ${slot === "armor" ? "armor" : `a ${GEAR_LABEL[slot].toLowerCase()}`}`,
          cost: credits(costs.sprite), href: `/generate?categoryId=${GEAR_MAKE_CATEGORY[slot]}`,
        });
      }
    }

    const n = m.stats.why.work.animations;
    if (n < MAX_COUNTED_ANIMATIONS) {
      const gain = animationStep(n + 1) / animationMultiplier(n);
      (n === 0 ? firstAnim : moreAnim).push({
        id: `animate:${i}`, kind: "animate", heroIndex: i, heroName: name,
        now: n === 0 ? `${name} isn't animated yet` : `${name} has ${n} animation${n === 1 ? "" : "s"}`,
        effect: n === 0
          ? `Its first animation adds +${pct(gain)} to its HP, attack and defence`
          : `One more animation adds +${pct(gain)} to its base stats (each next one adds ${pct(ANIMATION_DECAY)} of the last)`,
        action: "Animate", cost: credits(costs.animationMin, costs.animationMax),
        href: `/animate?id=${encodeURIComponent(m.hero.id)}`,
      });
    }
    if (!(m.skills ?? []).length) {
      skill.push({
        id: `skill:${i}`, kind: "attack-skill", heroIndex: i, heroName: name,
        now: `${name} has no attack skill`,
        effect: `An attack animation becomes its skill; one that scores Rare or better adds +${pct(SKILL_POWER.rare)} to +${pct(SKILL_POWER.legendary)} offence`,
        action: "Animate an attack", cost: credits(costs.attackMin, costs.animationMax),
        href: `/animate?id=${encodeURIComponent(m.hero.id)}`,
      });
    }
  });

  // A hero's first animation (+30%) beats gear to make; a further animation
  // adds less, so it comes last
  const ranked = [...equip, ...firstAnim, ...make, ...skill, ...moreAnim];

  // One suggestion per hero and kind of action (an attack skill is an animation too)
  const seen = new Set<string>();
  const unique = ranked.filter((u) => {
    const key = `${u.heroIndex}:${u.kind === "attack-skill" ? "animate" : u.kind}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // Variety first: the best of each kind, then the rest; shown in rank order
  const kinds = new Set<UpgradeKind>();
  const picked = unique.filter((u) => !kinds.has(u.kind) && kinds.add(u.kind));
  for (const u of unique) if (picked.length < max && !picked.includes(u)) picked.push(u);
  const out = picked.slice(0, max).sort((a, b) => unique.indexOf(a) - unique.indexOf(b));
  if (out.length >= max) return out;
  if (out.length < max && members.length > 0 && !members.every((m) => m.hero.hd)) {
    out.push({
      id: "hd-hero", kind: "hd-hero", heroIndex: -1, heroName: "",
      now: "Your heroes aren't HD", effect: `A hero made in HD gets ×${HD_MULTIPLIER} to everything`,
      action: "Make an HD hero", cost: credits(costs.hdSprite), href: `/generate?categoryId=${HERO_MAKE_CATEGORY}`,
    });
  }
  return out;
}
