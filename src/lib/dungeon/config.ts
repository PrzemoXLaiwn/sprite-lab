// =============================================================================
// Sprite Dungeon — every number of the game in one place
// =============================================================================
// Your own generated sprites are your party: characters and creatures are the
// heroes, weapons / armor / other items are their gear. Stats come from data
// the user can't fake (the generation id, whether an animation was made from
// the sprite, whether it was an HD render), so the only way to a stronger
// party is to make more / better sprites — never to click more.
// =============================================================================

// ── Party ────────────────────────────────────────────────────────────────────
export type Role = "hero" | "beast";
export type GearSlot = "weapon" | "armor" | "trinket";
/** Where a sprite can go: a party member (figure) or one of the gear slots. */
export type SpriteSlot = "hero" | GearSlot;

export interface RoleDef {
  label: string;
  hp: number;
  atk: number;
  def: number;
}

/** Base stats of a bare member before its roll and multipliers. */
export const ROLES: Record<Role, RoleDef> = {
  hero: { label: "Hero", hp: 100, atk: 14, def: 3 },
  beast: { label: "Beast", hp: 140, atk: 11, def: 2 },
};

/** Only figures can be party members. */
export const FIGURE_ROLE: Record<string, Role> = { CHARACTERS: "hero", CREATURES: "beast" };
/** Gear slot of an item category. Any other non-figure category is a trinket. */
export const GEAR_CATEGORY: Record<string, GearSlot> = { WEAPONS: "weapon", ARMOR: "armor" };
export const GEAR_SLOTS: GearSlot[] = ["weapon", "armor", "trinket"];
export const GEAR_LABEL: Record<GearSlot, string> = { weapon: "Weapon", armor: "Armor", trinket: "Trinket" };
/** Category the "make one" links open for an empty gear slot / for a new hero. */
export const GEAR_MAKE_CATEGORY: Record<GearSlot, string> = { weapon: "WEAPONS", armor: "ARMOR", trinket: "CONSUMABLES" };
export const HERO_MAKE_CATEGORY = "CHARACTERS";

/**
 * What one item adds at ×1.0 (before its own roll / animated / HD multipliers).
 * Weapon → attack + a little crit chance. Armor → defence + HP.
 * Trinket → heals the weakest hurt ally this much at the start of the wearer's turn.
 */
export const GEAR_BONUS: Record<GearSlot, { hp: number; atk: number; def: number; heal: number; crit: number }> = {
  weapon: { hp: 0, atk: 6, def: 0, heal: 0, crit: 0.04 },
  armor: { hp: 25, atk: 0, def: 2, heal: 0, crit: 0 },
  trinket: { hp: 0, atk: 0, def: 0, heal: 5, crit: 0 },
};

export const PARTY_SIZE = 4;
export const RUNS_PER_DAY = 5;

/** Stable per-sprite roll from a hash of its generation id: ×0.90 … ×1.10 (heroes and items alike). */
export const ROLL_MIN = 0.9;
export const ROLL_MAX = 1.1;
/** At least one animation was made from this sprite: +40% (hero stats, or the item's bonus). */
export const ANIMATED_BONUS = 0.4;
/** Rendered with the HD model (operations.feature = 'sprite_hd'): +15%. */
export const HD_BONUS = 0.15;
/** Each extra distinct art style among the heroes: +5% HP/attack for everyone, up to +15%. */
export const STYLE_SYNERGY_STEP = 0.05;
export const STYLE_SYNERGY_MAX = 0.15;

// ── Combat ──────────────────────────────────────────────────────────────────
export const CRIT_CHANCE = 0.08;
export const CRIT_MULTIPLIER = 1.5;
/** Damage = attack × random(0.85 … 1.15) (× crit) − defence, at least 1. */
export const DAMAGE_SPREAD = 0.15;
/** A trinket heals an ally only when it is below this share of max HP. */
export const HEAL_THRESHOLD = 0.75;
/** Survivors recover this share of max HP between floors. KOs stay down. */
export const REST_HEAL = 0.25;
/** A floor that lasts this many rounds ends the run (the party is worn down). */
export const MAX_ROUNDS_PER_FLOOR = 40;
export const MAX_FLOOR = 99;

// ── Enemies ────────────────────────────────────────────────────────────────
export type EnemyKind = "rat" | "slime" | "bat" | "goblin" | "skeleton" | "ghost" | "imp" | "mimic";

/** Base stats on floor 1. */
export const ENEMY_STATS: Record<EnemyKind, { hp: number; atk: number; def: number }> = {
  rat: { hp: 20, atk: 7, def: 0 },
  slime: { hp: 30, atk: 6, def: 0 },
  bat: { hp: 22, atk: 8, def: 0 },
  goblin: { hp: 36, atk: 9, def: 1 },
  skeleton: { hp: 42, atk: 10, def: 2 },
  ghost: { hp: 32, atk: 12, def: 1 },
  imp: { hp: 40, atk: 12, def: 2 },
  mimic: { hp: 54, atk: 12, def: 3 },
};

export interface ThemeDef {
  id: string;
  name: string;
  /** First floor of the theme. */
  from: number;
  /** Enemy kinds and their names in this theme. */
  enemies: { kind: EnemyKind; name: string }[];
  boss: { kind: EnemyKind; name: string };
  /** Canvas tints: wall overlay, floor overlay, accent. */
  wall: string;
  floor: string;
  accent: string;
}

/** A new theme every 5 floors; the 5th floor of each is its boss. */
export const THEMES: ThemeDef[] = [
  {
    id: "sewers", name: "Sewers", from: 1,
    enemies: [{ kind: "rat", name: "Sewer Rat" }, { kind: "slime", name: "Slime" }, { kind: "bat", name: "Bat" }],
    boss: { kind: "slime", name: "Slime King" },
    wall: "rgba(14,38,34,0.72)", floor: "rgba(10,40,30,0.35)", accent: "#00E436",
  },
  {
    id: "crypt", name: "Crypt", from: 6,
    enemies: [{ kind: "skeleton", name: "Skeleton" }, { kind: "ghost", name: "Ghost" }, { kind: "bat", name: "Crypt Bat" }],
    boss: { kind: "skeleton", name: "Bone Lord" },
    wall: "rgba(26,22,48,0.74)", floor: "rgba(30,24,60,0.4)", accent: "#C8CCE8",
  },
  {
    id: "cave", name: "Cave", from: 11,
    enemies: [{ kind: "goblin", name: "Goblin" }, { kind: "bat", name: "Cave Bat" }, { kind: "slime", name: "Cave Slime" }],
    boss: { kind: "goblin", name: "Goblin Chief" },
    wall: "rgba(40,30,18,0.72)", floor: "rgba(50,36,18,0.38)", accent: "#FFC857",
  },
  {
    id: "forge", name: "Forge", from: 16,
    enemies: [{ kind: "imp", name: "Fire Imp" }, { kind: "mimic", name: "Mimic" }, { kind: "goblin", name: "Forge Goblin" }],
    boss: { kind: "mimic", name: "Furnace Mimic" },
    wall: "rgba(60,18,10,0.7)", floor: "rgba(70,24,8,0.38)", accent: "#FFA300",
  },
  {
    id: "abyss", name: "Abyss", from: 21,
    enemies: [{ kind: "ghost", name: "Wraith" }, { kind: "imp", name: "Abyss Imp" }, { kind: "mimic", name: "Void Mimic" }],
    boss: { kind: "imp", name: "Abyss Lord" },
    wall: "rgba(8,6,20,0.8)", floor: "rgba(20,8,40,0.45)", accent: "#29ADFF",
  },
];

export function themeFor(floor: number): ThemeDef {
  let t = THEMES[0];
  for (const th of THEMES) if (floor >= th.from) t = th;
  return t;
}

/** Per floor above 1: enemy HP +17%, attack +11%, defence +1 every 4 floors. */
export const ENEMY_HP_PER_FLOOR = 0.17;
export const ENEMY_ATK_PER_FLOOR = 0.11;
export const ENEMY_DEF_EVERY = 4;
/** Every 5th floor is a single boss. */
export const BOSS_EVERY = 5;
export const BOSS_HP = 3.5;
export const BOSS_ATK = 1.4;
export const BOSS_DEF = 2;
/** Enemies per normal floor: 1 + floor/3, at most 4. */
export const MAX_ENEMIES = 4;

// ── Weekly prizes ──────────────────────────────────────────────────────────
/** Credits for ranks 1, 2, 3. Total must stay within PRIZE_BUDGET_PER_WEEK (tested). */
export const PRIZE_CREDITS: readonly number[] = [30, 20, 10];
export const PRIZE_BUDGET_PER_WEEK = 60;
/** Top N get a badge for the week. */
export const BADGE_RANKS = 10;
/** Credit prizes need this many paid generations (SUCCEEDED / PARTIAL operations) in the same week. */
export const PRIZE_MIN_PAID_GENERATIONS = 5;
export const LEADERBOARD_SIZE = 25;

export function badgeFor(rank: number): string {
  return rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "top10";
}
