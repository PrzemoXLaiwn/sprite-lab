// =============================================================================
// Sprite Dungeon — hero stats with a "why this power?" breakdown (pure)
// =============================================================================
// hero stats = class base × (HD ×1.3) × animation multiplier (each animation adds, diminishing)
//            + each item's slot bonus × that item's star multiplier
// power also counts the hero's skills (its scored attack animations).
// Attack element = the weapon's element if it has one, else the hero's.
// =============================================================================

import {
  ARMOR_DEF, ARMOR_HP, BLADE_CRIT, CLASSES, PARTY_SIZE, STAFF_CASTER_BONUS, STAFF_SPLASH, TRINKET_HEAL, TRINKET_SMALL_HEAL,
  SKILL_POWER, WEAPON_ATK, starMultiplier, type ClassId, type Element, type GearSlot, type SkillSlot, type Tier,
} from "./config";
import {
  classMatch, elementFor, elementMatch, heroWork, starsFor, type ElementSource, type HeroWork, trinketKind, weaponKind, type SpriteFacts, type TrinketKind, type WeaponKind,
} from "./detect";

export type { SpriteFacts } from "./detect";
export { slotFor } from "./detect";

export interface MemberFacts {
  hero: SpriteFacts;
  weapon?: SpriteFacts | null;
  armor?: SpriteFacts | null;
  trinket?: SpriteFacts | null;
  /** The hero's skills by slot (its attack animations, already scored and validated). */
  skills?: SkillInput[];
}

export interface SkillInput {
  slot: SkillSlot;
  tier: Tier;
  name: string;
  /** Animation generation id (played when the skill fires). */
  animId: string;
}

/** A skill as the battle uses it: when it fires and what it does (SKILL_RULES). */
export interface SkillStat extends SkillInput {
  /** "basic" = every turn; otherwise the rule by tier (a Legendary in the Special slot acts as Epic). */
  rule: "basic" | "rare" | "epic" | "legendary";
}

export function skillRule(slot: SkillSlot, tier: Tier): SkillStat["rule"] {
  if (slot === "basic") return "basic";
  if (slot === "legendary") return tier === "legendary" ? "legendary" : "epic";
  return tier === "common" ? "basic" : tier === "rare" ? "rare" : "epic";
}

/** What one equipped item adds. */
export interface ItemBonus {
  slot: GearSlot;
  stars: number;
  element: Element;
  kind: WeaponKind | TrinketKind | "armor";
  hp: number;
  atk: number;
  def: number;
  crit: number;
  heal: number;
  /** Staff on a non-caster: other enemies take this share of the hit. */
  splash: number;
  /** Staff on a caster: added to the all-hit share. */
  allHit: number;
  /** Element trinket: the wearer takes ×0.6 from this element. */
  ward: Element | null;
  /** One line for the card ("+12 ATK, +8% crit"). */
  text: string;
}

export interface PowerBreakdown {
  classId: ClassId;
  /** Prompt word that set the class (null = default for the category). */
  classWord: string | null;
  /** Which rule set the hero's own element, and from which prompt word. */
  elementSource: ElementSource;
  classLabel: string;
  role: string;
  base: { hp: number; atk: number; def: number };
  /** HD and animations: what each added. */
  work: HeroWork;
  /** Offence bonus from skills (SKILL_POWER), summed. */
  skillBonus: number;
  gear: ItemBonus[];
  element: Element;
  attackElement: Element;
}

export interface UnitStats {
  id: string;
  classId: ClassId;
  element: Element;
  attackElement: Element;
  stars: number;
  hp: number;
  atk: number;
  def: number;
  crit: number;
  heal: number;
  taunt: number;
  /** Hits every enemy at this share (Casters). 0 = single target. */
  allHit: number;
  /** Other enemies also take this share of a single-target hit (staves). */
  splash: number;
  ward: Element | null;
  power: number;
  gear: Partial<Record<GearSlot, string>>;
  skills: SkillStat[];
  why: PowerBreakdown;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** What `item` adds in `slot` for a hero of class `heroClass`. */
export function itemBonus(item: SpriteFacts, slot: GearSlot, heroClass: ClassId | null = null): ItemBonus {
  const s = starsFor(item);
  const m = starMultiplier(s.stars);
  const element = elementFor(item.prompt);
  const b: ItemBonus = { slot, stars: s.stars, element, kind: "armor", hp: 0, atk: 0, def: 0, crit: 0, heal: 0, splash: 0, allHit: 0, ward: null, text: "" };
  const parts: string[] = [];
  if (slot === "weapon") {
    const kind = weaponKind(item.prompt);
    b.kind = kind;
    b.atk = Math.round(WEAPON_ATK * m);
    parts.push(`+${b.atk} ATK`);
    if (kind === "blade") { b.crit = round3(BLADE_CRIT * m); parts.push(`+${pct(b.crit)} crit`); }
    if (kind === "staff") {
      if (heroClass === "caster") { b.allHit = round3(STAFF_CASTER_BONUS * m); parts.push(`+${pct(b.allHit)} all-hit`); }
      else { b.splash = round3(STAFF_SPLASH * m); parts.push(`splashes ${pct(b.splash)}`); }
    }
    if (element !== "neutral") parts.push(`${cap(element)} attacks`);
  } else if (slot === "armor") {
    b.hp = Math.round(ARMOR_HP * m);
    b.def = Math.round(ARMOR_DEF * m);
    parts.push(`+${b.hp} HP`, `+${b.def} DEF`);
  } else {
    const kind = trinketKind(item.prompt);
    b.kind = kind;
    if (kind === "ward") { b.ward = element; parts.push(`${cap(element)} ward`); }
    else { b.heal = Math.round((kind === "heal" ? TRINKET_HEAL : TRINKET_SMALL_HEAL) * m); parts.push(`heals ${b.heal}/turn`); }
  }
  b.text = parts.join(", ");
  return b;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;
const cap = (e: string) => e[0].toUpperCase() + e.slice(1);

/**
 * Power: one comparable number.
 * offence = ATK × (1 + crit × 0.75) × (all-hit ? all-hit × 2 : 1 + splash) × (1 + skill bonus)
 * power   = HP / 4 + offence × 3 + DEF × 0.8 + heal × 3
 */
export function powerOf(s: { hp: number; atk: number; def: number; crit: number; heal: number; allHit: number; splash: number }, skillBonus = 0): number {
  const offence = s.atk * (1 + s.crit * 0.75) * (s.allHit > 0 ? s.allHit * 2 : 1 + s.splash) * (1 + skillBonus);
  return Math.round(s.hp / 4 + offence * 3 + s.def * 0.8 + s.heal * 3);
}

export function deriveMember(m: MemberFacts): UnitStats {
  const cm = classMatch(m.hero.prompt, m.hero.categoryId);
  const classId = cm?.id ?? "striker";
  const em = elementMatch(m.hero.prompt);
  const c = CLASSES[classId];
  const work = heroWork(m.hero);
  const mul = work.multiplier;
  const element = em.element;
  const s = {
    hp: Math.round(c.hp * mul), atk: Math.round(c.atk * mul), def: Math.round(c.def * mul),
    crit: c.crit, heal: Math.round(c.heal * mul), allHit: c.allHit, splash: 0,
  };
  const gear: Partial<Record<GearSlot, string>> = {};
  const bonuses: ItemBonus[] = [];
  let ward: Element | null = null;
  let attackElement = element;
  for (const slot of ["weapon", "armor", "trinket"] as GearSlot[]) {
    const item = m[slot];
    if (!item) continue;
    const b = itemBonus(item, slot, classId);
    bonuses.push(b);
    gear[slot] = item.id;
    s.hp += b.hp; s.atk += b.atk; s.def += b.def; s.heal += b.heal;
    s.crit = round3(s.crit + b.crit);
    s.splash = round3(s.splash + b.splash);
    if (s.allHit > 0) s.allHit = round3(s.allHit + b.allHit);
    if (b.ward) ward = b.ward;
    if (slot === "weapon" && b.element !== "neutral") attackElement = b.element;
  }
  const skills: SkillStat[] = (m.skills ?? []).map((k) => ({ ...k, rule: skillRule(k.slot, k.tier) }));
  const skillBonus = round3(skills.reduce((a, k) => a + (k.rule === "basic" ? 0 : SKILL_POWER[k.rule === "rare" ? "rare" : k.rule === "epic" ? "epic" : "legendary"]), 0));
  return {
    id: m.hero.id, classId, element, attackElement, stars: work.stars,
    ...s, taunt: c.taunt, ward, power: powerOf(s, skillBonus), gear, skills,
    why: {
      classId, classWord: cm?.word ?? null, elementSource: em, classLabel: c.label, role: c.role, base: { hp: c.hp, atk: c.atk, def: c.def },
      work, skillBonus, gear: bonuses, element, attackElement,
    },
  };
}

/** A bare hero (no gear) — the roster's per-hero number. */
export function deriveUnit(f: SpriteFacts): UnitStats {
  return deriveMember({ hero: f });
}

export function deriveParty(members: MemberFacts[]): UnitStats[] {
  return members.slice(0, PARTY_SIZE).map(deriveMember);
}
