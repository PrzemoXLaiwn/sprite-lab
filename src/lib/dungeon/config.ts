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

// ── Work put into a sprite ─────────────────────────────────────────────────
/**
 * ITEMS: ★ plain, +★ HD, +★ animated (max 3); each star above the first ×1.3.
 * HEROES: ★ plain, +★ HD, +★ per different animation made from it (max 6 count).
 *   hero multiplier = (HD ? ×1.3 : ×1) × animation multiplier
 *   animation multiplier: the 1st animation adds +30%, each next one adds 80% of
 *   the previous step (+24%, +19.2%, +15.4%, +12.3%, +9.8%), up to 6 animations:
 *   1 → ×1.30, 2 → ×1.54, 3 → ×1.73, 4 → ×1.89, 5 → ×2.01, 6 → ×2.11.
 *   Every distinct motion label counts once (idle, walk, attack, cast…); a
 *   4-direction walk or a rotation set counts as one.
 */
export const MAX_STARS = 3;
export const STAR_STEP = 1.3;
export const HD_MULTIPLIER = 1.3;
export const ANIMATION_FIRST_BONUS = 0.3;
export const ANIMATION_DECAY = 0.8;
export const MAX_COUNTED_ANIMATIONS = 6;

export function starMultiplier(stars: number): number {
  return Math.round(STAR_STEP ** (Math.max(1, Math.min(MAX_STARS, stars)) - 1) * 1000) / 1000;
}

/** What the k-th animation adds (k = 1, 2, …): 0.30, 0.24, 0.192, … and 0 past the cap. */
export function animationStep(k: number): number {
  return k < 1 || k > MAX_COUNTED_ANIMATIONS ? 0 : ANIMATION_FIRST_BONUS * ANIMATION_DECAY ** (k - 1);
}

export function animationMultiplier(count: number): number {
  let m = 1;
  for (let k = 1; k <= Math.min(count, MAX_COUNTED_ANIMATIONS); k++) m += animationStep(k);
  return Math.round(m * 1000) / 1000;
}

// ── Skills: the hero's attack animations ───────────────────────────────────
export type SkillSlot = "basic" | "special" | "legendary";
export type Tier = "common" | "rare" | "epic" | "legendary";
export const SKILL_SLOTS: SkillSlot[] = ["basic", "special", "legendary"];
export const TIERS: Tier[] = ["common", "rare", "epic", "legendary"];
/** Spectacle score thresholds (0–100). */
export const TIER_MIN: Record<Tier, number> = { common: 0, rare: 35, epic: 60, legendary: 80 };
export const TIER_LABEL: Record<Tier, string> = { common: "Common", rare: "Rare", epic: "Epic", legendary: "Legendary" };
export const TIER_COLOR: Record<Tier, string> = { common: "#A7ADD4", rare: "#29ADFF", epic: "#B35CFF", legendary: "#FFA300" };
/** Lowest tier a slot accepts: the Legendary slot needs Epic or better, Special needs Rare or better. */
export const SLOT_MIN_TIER: Record<SkillSlot, Tier> = { basic: "common", special: "rare", legendary: "epic" };
export const SLOT_LABEL: Record<SkillSlot, string> = { basic: "Basic", special: "Special", legendary: "Legendary" };
/** Animation labels that count as attacks (skills). Idle, walk, hurt… don't. */
export const SKILL_WORDS = ["attack", "slash", "strike", "cast", "spell", "shoot", "shot", "breath", "breathe", "slam", "punch", "bite", "kick",
  "combo", "special", "roar", "smash", "stab", "thrust", "claw", "magic", "swing", "throw", "blast", "beam", "fire", "charge", "stomp",
  // Custom animations are user-described actions; a calm one simply scores low
  "custom"];

/**
 * Spectacle score, measured on the animation sheet (no AI): four capped parts summing to 0–100.
 *  frames  (max 20): (frames − 2) × 20 / 7 → 4 frames 6, 6 frames 11, 9+ frames 20
 *  motion  (max 25): mean share of the subject that changes between consecutive frames; 30% change = full points
 *  reach   (max 25): how far the frames' combined outline reaches past the sprite's own (×2 the size = full points)
 *  effects (max 30): new colours not in the sprite (1.5 points each, max 15) + area they cover (20% of the frame = 15)
 */
export const SCORE_WEIGHTS = { frames: 20, motion: 25, reach: 25, effectColours: 15, effectArea: 15 };
export const SCORE_MOTION_FULL = 0.3;
export const SCORE_AREA_FULL = 0.2;

/** In battle (a hero's turn = a round): which skill fires. */
export const SKILL_RULES = {
  /** Rare (Special slot): every 3rd turn, ×1.5 on one enemy. */
  rare: { every: 3, mult: 1.5, all: false },
  /** Epic (Special or Legendary slot): every 4th turn, ×1.6 on every enemy. */
  epic: { every: 4, mult: 1.6, all: true },
  /** Legendary (Legendary slot): once per floor on the hero's 2nd turn, ×2.5 on every enemy, stuns them for a turn. */
  legendary: { atTurn: 2, mult: 2.5, all: true, stun: 1 },
} as const;
/** Power bonus a skill adds (expected extra damage): Rare +12%, Epic +25%, Legendary +40% offence. */
export const SKILL_POWER: Record<Tier, number> = { common: 0, rare: 0.12, epic: 0.25, legendary: 0.4 };
/** At most this many new skill analyses per page load (the rest show "analysing" until the next load). */
export const SKILL_ANALYSES_PER_LOAD = 3;

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
  fire: { label: "Fire", adjective: "Ember", color: "#FF6B2B", keywords: ["fire", "flame", "flames", "flaming", "burning", "ember", "embers", "lava", "magma", "inferno", "blaze", "blazing", "molten", "volcanic", "fiery", "breathing fire", "fire breathing", "dragon breath", "pyro"], weakTo: ["ice"], resists: ["fire", "nature"] },
  ice: { label: "Ice", adjective: "Frost", color: "#7FDBFF", keywords: ["ice", "frost", "frosty", "frozen", "snow", "snowy", "glacier", "glacial", "arctic", "blizzard", "cryo"], weakTo: ["fire", "lightning"], resists: ["ice"] },
  poison: { label: "Poison", adjective: "Venom", color: "#B35CFF", keywords: ["poison", "poisonous", "toxic", "venom", "venomous", "plague", "blight", "sludge", "rotting"], weakTo: ["holy", "fire"], resists: ["poison", "nature"] },
  holy: { label: "Holy", adjective: "Radiant", color: "#FFE36B", keywords: ["holy", "divine", "light", "radiant", "angel", "angelic", "celestial", "blessed", "sacred", "seraph"], weakTo: ["shadow"], resists: ["holy"] },
  shadow: { label: "Shadow", adjective: "Shade", color: "#8A6BFF", keywords: ["shadow", "shadows", "dark", "darkness", "void", "necro", "necromantic", "cursed", "demon", "demonic", "undead", "vampire", "abyss", "abyssal"], weakTo: ["holy", "fire"], resists: ["shadow", "poison"] },
  nature: { label: "Nature", adjective: "Moss", color: "#3BD16F", keywords: ["nature", "forest", "leaf", "leaves", "leafy", "vine", "vines", "druid", "druidic", "thorn", "thorns", "moss", "mossy", "flower", "flowers"], weakTo: ["fire", "poison"], resists: ["nature", "lightning"] },
  lightning: { label: "Lightning", adjective: "Storm", color: "#29ADFF", keywords: ["lightning", "thunder", "storm", "stormy", "electric", "electrified", "spark", "sparks", "shock", "tesla"], weakTo: ["nature"], resists: ["lightning"] },
  neutral: { label: "Neutral", adjective: "", color: "#C8CCE8", keywords: [], weakTo: [], resists: [] },
};
/**
 * How an element is read from a prompt (heroes and items), first rule that matches wins:
 *   1. element words (ELEMENT_DEFS keywords; the word that comes FIRST in the prompt wins)
 *   2. colour words (ELEMENT_COLOURS; first colour in the prompt wins)
 *   3. creature defaults (ELEMENT_CREATURES: a dragon is Fire unless the prompt says otherwise)
 *   4. otherwise Neutral
 */
export const ELEMENT_ORDER: Element[] = ["fire", "ice", "lightning", "poison", "holy", "shadow", "nature"];

export const ELEMENT_COLOURS: Record<string, Element> = {
  red: "fire", crimson: "fire", scarlet: "fire", orange: "fire",
  blue: "ice", cyan: "ice", icy: "ice", azure: "ice",
  green: "nature", emerald: "nature",
  purple: "shadow", violet: "shadow", black: "shadow",
  gold: "holy", golden: "holy", white: "holy", silver: "holy",
  yellow: "lightning",
  lime: "poison", acid: "poison",
};

export const ELEMENT_CREATURES: Record<string, Element> = {
  dragon: "fire", wyvern: "fire", phoenix: "fire", salamander: "fire",
  ghost: "shadow", wraith: "shadow", specter: "shadow", spectre: "shadow", skeleton: "shadow", zombie: "shadow", lich: "shadow",
  angel: "holy", unicorn: "holy",
  treant: "nature", ent: "nature", dryad: "nature", fairy: "nature",
  slime: "poison", ooze: "poison",
  yeti: "ice",
};
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
