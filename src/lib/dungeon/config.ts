// =============================================================================
// Sprite Dungeon (the Tower) — every rule and number of the game in one place
// =============================================================================
// Nothing about a sprite's strength is random. It follows from facts the
// player can see and change:
//   class   ← keywords in the hero's prompt (fallback by category)
//   stars   ← work put into the sprite: HD, animated, several animations / walk / rotation
//   element ← keywords in the prompt (heroes and items)
//   gear    ← the weapon / armor / trinket sprites equipped on the hero
// Damage is one formula (damage.ts). The tower layout is the same for
// everyone in an ISO week; only combat rolls differ per run.
// =============================================================================

// ── Classes ────────────────────────────────────────────────────────────────
export type ClassId = "guardian" | "striker" | "caster" | "healer" | "beast" | "brute";

export interface ClassDef {
  label: string;
  /** One line the player reads on the card. */
  role: string;
  hp: number;
  atk: number;
  def: number;
  /** Crit chance 0..1. */
  crit: number;
  /** HP healed on the weakest hurt ally at the start of each turn. */
  heal: number;
  /** Chance an enemy attack goes to this hero instead of a random one. */
  taunt: number;
  /** Hits every enemy at this share of its damage (0 = single target). */
  allHit: number;
  /** Prompt keywords (whole words, plural "s" allowed). */
  keywords: string[];
}

/** Base stats at one star. Order = keyword priority (a "dwarf cleric" is a Healer). */
export const CLASSES: Record<ClassId, ClassDef> = {
  healer: {
    label: "Healer", role: "Heals the weakest ally every turn",
    hp: 100, atk: 9, def: 20, crit: 0.05, heal: 14, taunt: 0, allHit: 0,
    keywords: ["cleric", "priest", "priestess", "monk", "druid", "healer", "nun", "shaman", "saint", "medic", "angel", "oracle"],
  },
  caster: {
    label: "Caster", role: "Hits every enemy at 65% damage",
    hp: 80, atk: 17, def: 10, crit: 0.08, heal: 0, taunt: 0, allHit: 0.65,
    keywords: ["mage", "wizard", "witch", "warlock", "sorcerer", "sorceress", "necromancer", "magician", "enchanter", "enchantress", "alchemist", "summoner", "archmage", "spellcaster"],
  },
  striker: {
    label: "Striker", role: "25% crit chance, crits hit ×1.75",
    hp: 95, atk: 19, def: 15, crit: 0.25, heal: 0, taunt: 0, allHit: 0,
    keywords: ["rogue", "assassin", "archer", "ranger", "ninja", "thief", "hunter", "samurai", "bandit", "pirate", "scout", "duelist", "gunslinger", "musketeer", "bard"],
  },
  guardian: {
    label: "Guardian", role: "High HP and defence, draws 60% of attacks",
    hp: 150, atk: 12, def: 45, crit: 0.05, heal: 0, taunt: 0.6, allHit: 0,
    keywords: ["knight", "paladin", "warrior", "guard", "guardian", "soldier", "templar", "crusader", "defender", "sentinel", "legionnaire", "centurion", "armor", "armored", "armour", "armoured", "shield"],
  },
  brute: {
    label: "Brute", role: "Highest attack",
    hp: 130, atk: 23, def: 20, crit: 0.08, heal: 0, taunt: 0, allHit: 0,
    keywords: ["orc", "barbarian", "troll", "dwarf", "ogre", "berserker", "viking", "gladiator", "giant", "minotaur", "brawler", "goblin"],
  },
  beast: {
    label: "Beast", role: "Huge HP and solid attack",
    hp: 170, atk: 17, def: 20, crit: 0.08, heal: 0, taunt: 0, allHit: 0,
    keywords: ["dragon", "wolf", "bear", "lion", "tiger", "beast", "griffin", "hydra", "wyvern", "fox", "cat", "dog", "slime", "golem", "spider", "boar", "serpent", "snake"],
  },
};
export const CLASS_ORDER: ClassId[] = ["healer", "caster", "striker", "guardian", "brute", "beast"];
/** No keyword: characters fight as Strikers, creatures as Beasts. */
export const CLASS_FALLBACK: Record<string, ClassId> = { CHARACTERS: "striker", CREATURES: "beast" };

// ── Party and gear slots ───────────────────────────────────────────────────
export type GearSlot = "weapon" | "armor" | "trinket";
export type SpriteSlot = "hero" | GearSlot;
export const FIGURE_CATEGORIES = ["CHARACTERS", "CREATURES"];
/** Gear slot of an item category. Any other non-figure category is a trinket. */
export const GEAR_CATEGORY: Record<string, GearSlot> = { WEAPONS: "weapon", ARMOR: "armor" };
export const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "trinket"];
export const GEAR_LABEL: Record<GearSlot, string> = { weapon: "Weapon", armor: "Armor", trinket: "Trinket" };
export const GEAR_MAKE_CATEGORY: Record<GearSlot, string> = { weapon: "WEAPONS", armor: "ARMOR", trinket: "CONSUMABLES" };
export const HERO_MAKE_CATEGORY = "CHARACTERS";
export const PARTY_SIZE = 4;
export const RUNS_PER_DAY = 5;

// ── Stars: work put into a sprite ──────────────────────────────────────────
/** ★ plain, +★ HD, +★ animated, +★ three different animations or a walk / rotation set. */
export const MAX_STARS = 4;
/** Each star above the first multiplies everything the sprite gives by 1.3 (×1, ×1.3, ×1.69, ×2.2). */
export const STAR_STEP = 1.3;
export const MULTI_ANIMATION_COUNT = 3;

export function starMultiplier(stars: number): number {
  return Math.round(STAR_STEP ** (Math.max(1, Math.min(MAX_STARS, stars)) - 1) * 1000) / 1000;
}

// ── Gear at one star (× the item's star multiplier) ────────────────────────
export const WEAPON_ATK = 5;
/** Blades and bows: extra crit chance. */
export const BLADE_CRIT = 0.06;
export const BLADE_KEYWORDS = ["sword", "dagger", "blade", "katana", "saber", "sabre", "rapier", "bow", "crossbow", "spear", "lance", "scimitar", "knife", "claw", "scythe"];
/** Staves: the hit splashes every other enemy for this share (a Caster's all-hit gets +10%). */
export const STAFF_SPLASH = 0.25;
export const STAFF_CASTER_BONUS = 0.1;
export const STAFF_KEYWORDS = ["staff", "wand", "rod", "orb", "scepter", "sceptre", "tome", "grimoire", "spellbook", "totem"];
export const ARMOR_HP = 25;
export const ARMOR_DEF = 12;
/** Healing trinkets (potions, food, herbs): regen on the weakest hurt ally each turn. */
export const TRINKET_HEAL = 4;
export const HEAL_TRINKET_KEYWORDS = ["potion", "elixir", "herb", "flask", "heart", "apple", "bread", "food", "meat", "cheese", "tea", "salve", "bandage", "mushroom", "berry", "berries", "fruit", "honey"];
/** Element trinkets (no healing word): the wearer takes ×0.6 from that element. */
export const WARD_MULTIPLIER = 0.6;
/** Neutral trinkets without a healing word: a small regen. */
export const TRINKET_SMALL_HEAL = 3;

// ── Elements ───────────────────────────────────────────────────────────────
export type Element = "fire" | "ice" | "poison" | "holy" | "shadow" | "nature" | "lightning" | "neutral";
export const ELEMENTS: Element[] = ["fire", "ice", "poison", "holy", "shadow", "nature", "lightning", "neutral"];

export interface ElementDef {
  label: string;
  /** Enemy name prefix. */
  adjective: string;
  color: string;
  keywords: string[];
  /** This element takes ×1.5 from these. */
  weakTo: Element[];
  /** This element takes ×0.6 from these. */
  resists: Element[];
}

export const ELEMENT_DEFS: Record<Element, ElementDef> = {
  fire: { label: "Fire", adjective: "Ember", color: "#FF6B2B", keywords: ["fire", "flame", "flaming", "lava", "magma", "ember", "inferno", "burning", "blaze", "phoenix", "volcanic", "molten", "sun", "solar"], weakTo: ["ice"], resists: ["fire", "nature"] },
  ice: { label: "Ice", adjective: "Frost", color: "#7FDBFF", keywords: ["ice", "frost", "frozen", "snow", "glacier", "glacial", "winter", "crystal", "frostbite", "arctic", "icy"], weakTo: ["fire", "lightning"], resists: ["ice"] },
  poison: { label: "Poison", adjective: "Venom", color: "#B35CFF", keywords: ["poison", "venom", "venomous", "toxic", "acid", "plague", "rot", "rotten", "blight", "sludge"], weakTo: ["holy", "fire"], resists: ["poison", "nature"] },
  holy: { label: "Holy", adjective: "Radiant", color: "#FFE36B", keywords: ["holy", "divine", "light", "radiant", "angel", "angelic", "celestial", "blessed", "sacred", "golden"], weakTo: ["shadow"], resists: ["holy"] },
  shadow: { label: "Shadow", adjective: "Shade", color: "#8A6BFF", keywords: ["shadow", "dark", "void", "cursed", "demon", "demonic", "necro", "undead", "ghost", "vampire", "abyss", "night", "skull", "bone"], weakTo: ["holy", "fire"], resists: ["shadow", "poison"] },
  nature: { label: "Nature", adjective: "Moss", color: "#3BD16F", keywords: ["nature", "forest", "leaf", "leaves", "vine", "wood", "wooden", "earth", "stone", "druidic", "thorn", "flower", "tree", "moss"], weakTo: ["fire", "poison"], resists: ["nature", "lightning"] },
  lightning: { label: "Lightning", adjective: "Storm", color: "#29ADFF", keywords: ["lightning", "thunder", "storm", "electric", "spark", "shock", "tesla", "bolt"], weakTo: ["nature"], resists: ["lightning"] },
  neutral: { label: "Neutral", adjective: "", color: "#C8CCE8", keywords: [], weakTo: [], resists: [] },
};
/** Keyword priority when a prompt names several elements. */
export const ELEMENT_ORDER: Element[] = ["fire", "ice", "lightning", "poison", "holy", "shadow", "nature"];
export const WEAK_MULTIPLIER = 1.5;
export const RESIST_MULTIPLIER = 0.6;

// ── Combat ─────────────────────────────────────────────────────────────────
/** damage = ATK × 100 / (100 + DEF) × element × crit × blessings × variance. */
export const DEF_SCALE = 100;
export const CRIT_MULTIPLIER = 1.75;
export const VARIANCE_MIN = 0.9;
export const VARIANCE_MAX = 1.1;
/** Healing only goes to allies below this share of max HP. */
export const HEAL_THRESHOLD = 0.75;
/** Survivors recover this share of max HP when they climb to the next floor. */
export const REST_HEAL = 0.15;
/** Enemies crit rarely (×1.75). */
export const ENEMY_CRIT = 0.05;
export const MAX_ROUNDS_PER_FLOOR = 40;
export const MAX_FLOOR = 99;
/** A blessing choice after every 3rd cleared floor. */
export const BLESSING_EVERY = 3;
export const BLESSING_OFFERS = 3;

// ── The tower ──────────────────────────────────────────────────────────────
export type EnemyKind = "rat" | "slime" | "bat" | "goblin" | "skeleton" | "ghost" | "imp" | "mimic";

/** Base enemy stats on floor 1 (same DEF scale as heroes). */
export const ENEMY_STATS: Record<EnemyKind, { hp: number; atk: number; def: number; name: string }> = {
  rat: { hp: 26, atk: 9, def: 5, name: "Rat" },
  slime: { hp: 38, atk: 8, def: 0, name: "Slime" },
  bat: { hp: 24, atk: 11, def: 5, name: "Bat" },
  goblin: { hp: 42, atk: 12, def: 15, name: "Goblin" },
  skeleton: { hp: 46, atk: 12, def: 25, name: "Skeleton" },
  ghost: { hp: 34, atk: 15, def: 10, name: "Ghost" },
  imp: { hp: 40, atk: 15, def: 15, name: "Imp" },
  mimic: { hp: 60, atk: 14, def: 30, name: "Mimic" },
};

export interface ZoneDef {
  id: "cells" | "crypt" | "crystal" | "forge" | "abyss";
  name: string;
  from: number;
  enemies: EnemyKind[];
  boss: { kind: EnemyKind; name: string };
  /** The week picks one of these as the zone's element. */
  elements: Element[];
}

/** A new zone every 5 floors; the 5th floor of each is a boss hall. Abyss repeats upward. */
export const ZONES: ZoneDef[] = [
  { id: "cells", name: "Dungeon cells", from: 1, enemies: ["rat", "slime", "bat"], boss: { kind: "slime", name: "Slime King" }, elements: ["poison", "nature", "neutral"] },
  { id: "crypt", name: "Crypt", from: 6, enemies: ["skeleton", "ghost", "bat"], boss: { kind: "skeleton", name: "Bone Lord" }, elements: ["shadow", "poison"] },
  { id: "crystal", name: "Crystal cave", from: 11, enemies: ["goblin", "slime", "bat"], boss: { kind: "mimic", name: "Crystal Mimic" }, elements: ["ice", "lightning"] },
  { id: "forge", name: "Forge", from: 16, enemies: ["imp", "goblin", "mimic"], boss: { kind: "imp", name: "Furnace Lord" }, elements: ["fire", "lightning"] },
  { id: "abyss", name: "Abyss", from: 21, enemies: ["ghost", "imp", "skeleton"], boss: { kind: "ghost", name: "Void Warden" }, elements: ["shadow", "holy", "poison"] },
];

export function zoneFor(floor: number): ZoneDef {
  let z = ZONES[0];
  for (const zone of ZONES) if (floor >= zone.from) z = zone;
  return z;
}

/** Per floor above 1, compounding: enemy HP ×1.07, attack ×1.045; defence +3 per floor. */
export const ENEMY_HP_GROWTH = 1.07;
export const ENEMY_ATK_GROWTH = 1.045;
export const ENEMY_DEF_PER_FLOOR = 3;
/** Overall enemy strength on floor 1 (× the HP / attack above). */
export const ENEMY_BASE = 1.65;
export const BOSS_EVERY = 5;
export const BOSS_HP = 3.5;
export const BOSS_ATK = 1.35;
export const BOSS_DEF = 20;
/** Enemies per normal floor: 1 + floor/3, at most 4. */
export const MAX_ENEMIES = 4;

// ── Weekly prizes (unchanged) ──────────────────────────────────────────────
/** Credits for ranks 1, 2, 3. Total must stay within PRIZE_BUDGET_PER_WEEK (tested). */
export const PRIZE_CREDITS: readonly number[] = [30, 20, 10];
export const PRIZE_BUDGET_PER_WEEK = 60;
export const BADGE_RANKS = 10;
export const PRIZE_MIN_PAID_GENERATIONS = 5;
export const LEADERBOARD_SIZE = 25;
/** An unfinished run is auto-finished (first blessing each time) after this long. */
export const RUN_IDLE_MS = 10 * 60_000;

export function badgeFor(rank: number): string {
  return rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "top10";
}
