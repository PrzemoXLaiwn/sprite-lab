// =============================================================================
// Sprite Dungeon — every number of the game in one place
// =============================================================================
// Your own generated sprites are your party. Stats come from data the user
// can't fake (the generation id, whether an animation was made from the
// sprite, whether it was an HD render), so the only way to a stronger party is
// to make more / better sprites — never to click more.
// =============================================================================

export type Role = "hero" | "beast" | "blade" | "guard" | "charm";

export interface RoleDef {
  label: string;
  blurb: string;
  hp: number;
  atk: number;
  def: number;
  /** HP restored to the weakest ally per turn (0 = never heals). */
  heal: number;
}

/** Base stats before the roll and multipliers. */
export const ROLES: Record<Role, RoleDef> = {
  hero: { label: "Hero", blurb: "Balanced fighter", hp: 100, atk: 14, def: 4, heal: 0 },
  beast: { label: "Beast", blurb: "Lots of HP", hp: 150, atk: 11, def: 3, heal: 0 },
  blade: { label: "Blade", blurb: "Hits hardest", hp: 80, atk: 20, def: 2, heal: 0 },
  guard: { label: "Guard", blurb: "Draws attacks, high defence", hp: 120, atk: 8, def: 8, heal: 0 },
  charm: { label: "Charm", blurb: "Heals the party", hp: 75, atk: 6, def: 2, heal: 12 },
};

/** Generation category → role. Anything not listed is a Charm. */
export const CATEGORY_ROLE: Record<string, Role> = {
  CHARACTERS: "hero",
  CREATURES: "beast",
  WEAPONS: "blade",
  ARMOR: "guard",
};

export const PARTY_SIZE = 4;
export const RUNS_PER_DAY = 5;

/** Stable per-sprite roll from a hash of its generation id: ×0.90 … ×1.10. */
export const ROLL_MIN = 0.9;
export const ROLL_MAX = 1.1;
/** At least one animation was made from this sprite: +40% HP, attack and healing. */
export const ANIMATED_BONUS = 0.4;
/** Rendered with the HD model (operations.feature = 'sprite_hd'): +15%. */
export const HD_BONUS = 0.15;
/** Each extra distinct art style in the party: +5% HP/attack for everyone, up to +15%. */
export const STYLE_SYNERGY_STEP = 0.05;
export const STYLE_SYNERGY_MAX = 0.15;

// ── Combat ──────────────────────────────────────────────────────────────────
export const CRIT_CHANCE = 0.1;
export const CRIT_MULTIPLIER = 1.5;
/** Damage = attack × random(0.85 … 1.15) (× crit) − defence, at least 1. */
export const DAMAGE_SPREAD = 0.15;
/** A Charm heals instead of attacking when an ally is below this share of max HP. */
export const HEAL_THRESHOLD = 0.7;
/** Survivors recover this share of max HP between floors. KOs stay down. */
export const REST_HEAL = 0.25;
/** A floor that lasts this many rounds ends the run (the party is worn down). */
export const MAX_ROUNDS_PER_FLOOR = 40;
export const MAX_FLOOR = 99;

// ── Enemies ────────────────────────────────────────────────────────────────
export type EnemyKind = "slime" | "bat" | "goblin" | "skeleton" | "mimic";

export interface EnemyDef {
  name: string;
  bossName: string;
  hp: number;
  atk: number;
  def: number;
  /** First floor this enemy can appear on. */
  from: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  slime: { name: "Slime", bossName: "Slime King", hp: 30, atk: 6, def: 0, from: 1 },
  bat: { name: "Bat", bossName: "Bat Matriarch", hp: 22, atk: 8, def: 0, from: 1 },
  goblin: { name: "Goblin", bossName: "Goblin Chief", hp: 36, atk: 9, def: 1, from: 3 },
  skeleton: { name: "Skeleton", bossName: "Skeleton Lord", hp: 44, atk: 10, def: 2, from: 6 },
  mimic: { name: "Mimic", bossName: "Elder Mimic", hp: 56, atk: 12, def: 3, from: 9 },
};
export const ENEMY_ORDER: EnemyKind[] = ["slime", "bat", "goblin", "skeleton", "mimic"];

/** Per floor above 1: enemy HP +15%, attack +10%, defence +1 every 4 floors. */
export const ENEMY_HP_PER_FLOOR = 0.15;
export const ENEMY_ATK_PER_FLOOR = 0.1;
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
