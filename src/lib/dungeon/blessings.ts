// =============================================================================
// Sprite Dungeon — blessings (picked every 3 floors) and boss chest buffs
// =============================================================================
// Run-only effects: they never carry over to another run and never pay out.
// Offers are seeded by the server from the run seed + floor; the player only
// chooses one of the three.
// =============================================================================

import { BLESSING_OFFERS, CRIT_MULTIPLIER, ELEMENT_DEFS, WEAK_MULTIPLIER, type Element } from "./config";
import { hash32, makeRng } from "./rng";

export interface RunMods {
  atkMul: number;
  defMul: number;
  critAdd: number;
  /** Crit multiplier against bosses. */
  bossCritMul: number;
  weakMul: number;
  /** Share of max HP healed after each cleared floor (on top of the rest heal). */
  healAfterFloor: number;
  /** Share of damage dealt that heals the attacker. */
  lifesteal: number;
  /** Heroes that get back up once at 50% HP. */
  revives: number;
  /** Damage multiplier in the first round of each fight. */
  firstRoundMul: number;
  /** Guardian taunt chance override. */
  taunt: number | null;
  elementMul: Partial<Record<Element, number>>;
  /** Damage multiplier against enemies below EXECUTE_BELOW of their HP. */
  executeMul: number;
  /** Damage multiplier against bosses. */
  bossMul: number;
  /** Attack added per round of a fight after the first (capped at RAMP_CAP). */
  rampPerRound: number;
  /** Damage multiplier for a hero below LAST_STAND_BELOW of its HP. */
  lastStandMul: number;
  /** Chance a hero's attack strikes again at DOUBLE_SHARE damage. */
  doubleChance: number;
  /** Attack the others gain for the rest of the floor each time a hero falls. */
  rallyAdd: number;
  /** Multiplier on healing (Healers and healing trinkets). */
  healMul: number;
}

export type BlessingTier = "common" | "rare" | "epic";
/** How often a tier comes up in an offer, relative to the others. */
export const TIER_WEIGHT: Record<BlessingTier, number> = { common: 6, rare: 3, epic: 1 };
export const BLESSING_TIER_COLOR: Record<BlessingTier, string> = { common: "#A7ADD4", rare: "#29ADFF", epic: "#B35CFF" };
export const BLESSING_TIER_LABEL: Record<BlessingTier, string> = { common: "Common", rare: "Rare", epic: "Epic" };

export const EXECUTE_BELOW = 0.3;
export const LAST_STAND_BELOW = 0.35;
export const RAMP_CAP = 0.4;
export const DOUBLE_SHARE = 0.6;

export interface BlessingDef {
  id: string;
  name: string;
  text: string;
  /** Icon key for the card (the page maps it to an icon). */
  icon: string;
  element?: Element;
  tier: BlessingTier;
  apply(m: RunMods): void;
}

export function baseMods(): RunMods {
  return {
    atkMul: 1, defMul: 1, critAdd: 0, bossCritMul: CRIT_MULTIPLIER, weakMul: WEAK_MULTIPLIER, healAfterFloor: 0,
    lifesteal: 0, revives: 0, firstRoundMul: 1, taunt: null, elementMul: {},
    executeMul: 1, bossMul: 1, rampPerRound: 0, lastStandMul: 1, doubleChance: 0, rallyAdd: 0, healMul: 1,
  };
}

const GENERIC: BlessingDef[] = [
  { id: "whetstone", name: "Whetstone", text: "+15% attack for the whole party", icon: "sword", tier: "common", apply: (m) => { m.atkMul *= 1.15; } },
  { id: "bulwark", name: "Bulwark", text: "+25% defence for the whole party", icon: "shield", tier: "common", apply: (m) => { m.defMul *= 1.25; } },
  { id: "second-wind", name: "Second wind", text: "Standing heroes heal 20% of max HP after each floor", icon: "heart", tier: "common", apply: (m) => { m.healAfterFloor += 0.2; } },
  { id: "giant-slayer", name: "Giant slayer", text: "Crits on bosses deal ×3.5 instead of ×1.75", icon: "crown", tier: "rare", apply: (m) => { m.bossCritMul = CRIT_MULTIPLIER * 2; } },
  { id: "iron-wall", name: "Iron wall", text: "Your Guardian draws 90% of enemy attacks instead of 60%", icon: "castle", tier: "rare", apply: (m) => { m.taunt = 0.9; } },
  { id: "keen-eye", name: "Keen eye", text: "+12% crit chance for everyone", icon: "eye", tier: "common", apply: (m) => { m.critAdd += 0.12; } },
  { id: "exploit", name: "Exploit", text: "Weakness hits deal ×2 instead of ×1.5", icon: "target", tier: "rare", apply: (m) => { m.weakMul = 2; } },
  { id: "leech", name: "Leech", text: "Each hit heals the attacker for 10% of the damage dealt", icon: "droplet", tier: "rare", apply: (m) => { m.lifesteal += 0.1; } },
  { id: "phoenix", name: "Phoenix feather", text: "A fallen hero gets back up at 50% HP: right away if one is down, otherwise the next to fall", icon: "feather", tier: "epic", apply: (m) => { m.revives += 1; } },
  { id: "ambush", name: "Ambush", text: "Your heroes deal +50% damage in the first round of each fight", icon: "zap", tier: "common", apply: (m) => { m.firstRoundMul *= 1.5; } },
  { id: "executioner", name: "Executioner", text: "+50% damage to enemies below 30% HP", icon: "skull", tier: "rare", apply: (m) => { m.executeMul *= 1.5; } },
  { id: "kingslayer", name: "Kingslayer", text: "+35% damage to bosses", icon: "crown", tier: "common", apply: (m) => { m.bossMul *= 1.35; } },
  { id: "battle-rhythm", name: "Battle rhythm", text: "+8% attack for every round a fight goes on, up to +40%", icon: "drum", tier: "common", apply: (m) => { m.rampPerRound += 0.08; } },
  { id: "last-stand", name: "Last stand", text: "A hero below 35% HP deals +60% damage", icon: "flag", tier: "common", apply: (m) => { m.lastStandMul *= 1.6; } },
  { id: "twin-strike", name: "Twin strike", text: "Every attack has a 20% chance to strike again for 60% damage", icon: "swords", tier: "epic", apply: (m) => { m.doubleChance += 0.2; } },
  { id: "vengeance", name: "Vengeance", text: "When a hero falls, the others get +25% attack for the rest of the floor", icon: "flame", tier: "rare", apply: (m) => { m.rallyAdd += 0.25; } },
  { id: "blessed-hands", name: "Blessed hands", text: "All healing is 50% stronger", icon: "sparkles", tier: "common", apply: (m) => { m.healMul *= 1.5; } },
];

function elementBlessing(e: Element): BlessingDef {
  return {
    id: `oath-${e}`, name: `${ELEMENT_DEFS[e].label} oath`, text: `${ELEMENT_DEFS[e].label} attacks deal +30% damage`, icon: "flame", element: e, tier: "rare",
    apply: (m) => { m.elementMul[e] = (m.elementMul[e] ?? 1) * 1.3; },
  };
}

/** Boss chests: a small automatic buff, run-only. */
export const CHEST_BUFFS: BlessingDef[] = [
  { id: "chest-might", name: "Giant's tonic", text: "+10% attack for the whole party", icon: "sword", tier: "common", apply: (m) => { m.atkMul *= 1.1; } },
  { id: "chest-guard", name: "Iron charm", text: "+10% defence for the whole party", icon: "shield", tier: "common", apply: (m) => { m.defMul *= 1.1; } },
  { id: "chest-luck", name: "Lucky coin", text: "+5% crit chance for everyone", icon: "eye", tier: "common", apply: (m) => { m.critAdd += 0.05; } },
  { id: "chest-mend", name: "Mending moss", text: "Standing heroes heal 10% of max HP after each floor", icon: "heart", tier: "common", apply: (m) => { m.healAfterFloor += 0.1; } },
];

export function blessingById(id: string): BlessingDef | null {
  if (id.startsWith("oath-")) {
    const e = id.slice(5) as Element;
    return e in ELEMENT_DEFS && e !== "neutral" ? elementBlessing(e) : null;
  }
  return GENERIC.find((b) => b.id === id) ?? CHEST_BUFFS.find((b) => b.id === id) ?? null;
}

/** All modifiers of a run from its blessing + chest ids (unknown ids are ignored). */
export function modsFor(ids: string[]): RunMods {
  const m = baseMods();
  for (const id of ids) blessingById(id)?.apply(m);
  return m;
}

/**
 * Three distinct offers, seeded by run seed + floor, weighted by tier (Epic is
 * rare). Only blessings that can do something for this party: element oaths
 * for elements it attacks with, Iron wall only with a Guardian, Blessed hands
 * only when something in the party heals.
 */
export function offerFor(seed: number, floor: number, chosen: string[], partyElements: Element[], hasGuardian = true, hasHealing = true): string[] {
  const pool = [
    ...GENERIC.map((b) => b.id).filter((id) => (id !== "iron-wall" || hasGuardian) && (id !== "blessed-hands" || hasHealing)),
    ...[...new Set(partyElements)].filter((e) => e !== "neutral").map((e) => `oath-${e}`),
  ].filter((id) => !chosen.includes(id));
  const weight = (id: string) => TIER_WEIGHT[blessingById(id)?.tier ?? "common"];
  const rng = makeRng(hash32(`offer:${seed}:${floor}`));
  const out: string[] = [];
  while (out.length < BLESSING_OFFERS && pool.length) {
    let roll = rng() * pool.reduce((a, id) => a + weight(id), 0);
    let k = 0;
    while (k < pool.length - 1 && roll >= weight(pool[k])) { roll -= weight(pool[k]); k++; }
    out.push(pool.splice(k, 1)[0]);
  }
  return out;
}

export function chestFor(seed: number, floor: number): string {
  return CHEST_BUFFS[hash32(`chest:${seed}:${floor}`) % CHEST_BUFFS.length].id;
}

/** What the page needs to draw a card. */
export function blessingView(id: string): { id: string; name: string; text: string; icon: string; element: Element | null; tier: BlessingTier } | null {
  const b = blessingById(id);
  return b ? { id: b.id, name: b.name, text: b.text, icon: b.icon, element: b.element ?? null, tier: b.tier } : null;
}
