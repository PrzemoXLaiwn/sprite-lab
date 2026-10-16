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
}

export interface BlessingDef {
  id: string;
  name: string;
  text: string;
  /** Icon key for the card (the page maps it to an icon). */
  icon: string;
  element?: Element;
  apply(m: RunMods): void;
}

export function baseMods(): RunMods {
  return {
    atkMul: 1, defMul: 1, critAdd: 0, bossCritMul: CRIT_MULTIPLIER, weakMul: WEAK_MULTIPLIER, healAfterFloor: 0,
    lifesteal: 0, revives: 0, firstRoundMul: 1, taunt: null, elementMul: {},
  };
}

const GENERIC: BlessingDef[] = [
  { id: "whetstone", name: "Whetstone", text: "+15% attack for the whole party", icon: "sword", apply: (m) => { m.atkMul *= 1.15; } },
  { id: "bulwark", name: "Bulwark", text: "+25% defence for the whole party", icon: "shield", apply: (m) => { m.defMul *= 1.25; } },
  { id: "second-wind", name: "Second wind", text: "Standing heroes heal 20% of max HP after each floor", icon: "heart", apply: (m) => { m.healAfterFloor += 0.2; } },
  { id: "giant-slayer", name: "Giant slayer", text: "Crits on bosses deal ×3.5 instead of ×1.75", icon: "crown", apply: (m) => { m.bossCritMul = CRIT_MULTIPLIER * 2; } },
  { id: "iron-wall", name: "Iron wall", text: "Your Guardian draws 90% of enemy attacks instead of 60%", icon: "castle", apply: (m) => { m.taunt = 0.9; } },
  { id: "keen-eye", name: "Keen eye", text: "+12% crit chance for everyone", icon: "eye", apply: (m) => { m.critAdd += 0.12; } },
  { id: "exploit", name: "Exploit", text: "Weakness hits deal ×2 instead of ×1.5", icon: "target", apply: (m) => { m.weakMul = 2; } },
  { id: "leech", name: "Leech", text: "Each hit heals the attacker for 10% of the damage dealt", icon: "droplet", apply: (m) => { m.lifesteal += 0.1; } },
  { id: "phoenix", name: "Phoenix feather", text: "A fallen hero gets back up at 50% HP: right away if one is down, otherwise the next to fall", icon: "feather", apply: (m) => { m.revives += 1; } },
  { id: "ambush", name: "Ambush", text: "Your heroes deal +50% damage in the first round of each fight", icon: "zap", apply: (m) => { m.firstRoundMul *= 1.5; } },
];

function elementBlessing(e: Element): BlessingDef {
  return {
    id: `oath-${e}`, name: `${ELEMENT_DEFS[e].label} oath`, text: `${ELEMENT_DEFS[e].label} attacks deal +30% damage`, icon: "flame", element: e,
    apply: (m) => { m.elementMul[e] = (m.elementMul[e] ?? 1) * 1.3; },
  };
}

/** Boss chests: a small automatic buff, run-only. */
export const CHEST_BUFFS: BlessingDef[] = [
  { id: "chest-might", name: "Giant's tonic", text: "+10% attack for the whole party", icon: "sword", apply: (m) => { m.atkMul *= 1.1; } },
  { id: "chest-guard", name: "Iron charm", text: "+10% defence for the whole party", icon: "shield", apply: (m) => { m.defMul *= 1.1; } },
  { id: "chest-luck", name: "Lucky coin", text: "+5% crit chance for everyone", icon: "eye", apply: (m) => { m.critAdd += 0.05; } },
  { id: "chest-mend", name: "Mending moss", text: "Standing heroes heal 10% of max HP after each floor", icon: "heart", apply: (m) => { m.healAfterFloor += 0.1; } },
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
 * Three distinct offers, seeded by run seed + floor. Only blessings that can do
 * something for this party: element oaths for elements it attacks with, Iron
 * wall only with a Guardian.
 */
export function offerFor(seed: number, floor: number, chosen: string[], partyElements: Element[], hasGuardian = true): string[] {
  const pool = [
    ...GENERIC.map((b) => b.id).filter((id) => id !== "iron-wall" || hasGuardian),
    ...[...new Set(partyElements)].filter((e) => e !== "neutral").map((e) => `oath-${e}`),
  ].filter((id) => !chosen.includes(id));
  const rng = makeRng(hash32(`offer:${seed}:${floor}`));
  const out: string[] = [];
  while (out.length < BLESSING_OFFERS && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function chestFor(seed: number, floor: number): string {
  return CHEST_BUFFS[hash32(`chest:${seed}:${floor}`) % CHEST_BUFFS.length].id;
}

/** What the page needs to draw a card. */
export function blessingView(id: string): { id: string; name: string; text: string; icon: string; element: Element | null } | null {
  const b = blessingById(id);
  return b ? { id: b.id, name: b.name, text: b.text, icon: b.icon, element: b.element ?? null } : null;
}
