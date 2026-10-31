// =============================================================================
// Sprite Dungeon arena — backgrounds and enemy animations (all made in SpriteLab)
// =============================================================================
// Zone backgrounds were generated with SpriteLab's image pipeline; every enemy
// sprite and its idle / attack sheet went through the same sprite and
// animation pipeline players use. Sheets are horizontal strips of equal frames
// (frame size below), facing right; the arena flips them to face the party.
// =============================================================================

import type { EnemyKind, ZoneDef } from "@/lib/dungeon/config";

export type ZoneId = ZoneDef["id"];

export const ZONE_BACKGROUND: Record<ZoneId, string> = {
  cells: "/dungeon/bg-cells.webp",
  crypt: "/dungeon/bg-crypt.webp",
  crystal: "/dungeon/bg-crystal.webp",
  forge: "/dungeon/bg-forge.webp",
  abyss: "/dungeon/bg-abyss.webp",
};

/** Ambient motes per zone: colour, how many, drift (negative = rising). */
export const ZONE_AMBIENCE: Record<ZoneId, { color: string; count: number; drift: number }> = {
  cells: { color: "#FFB35C", count: 10, drift: -0.6 },
  crypt: { color: "#7FFFD4", count: 16, drift: 0.25 },
  crystal: { color: "#7FDBFF", count: 22, drift: -0.3 },
  forge: { color: "#FF8A3D", count: 26, drift: -1.2 },
  abyss: { color: "#B35CFF", count: 22, drift: -0.4 },
};

export interface EnemySheet {
  url: string;
  frameCount: number;
  frameWidth: number;
  frameHeight: number;
}

export interface EnemyLook {
  idle: EnemySheet;
  attack: EnemySheet;
  /** Height relative to a hero. */
  scale: number;
  /** Hovering creatures float this far above the ground (× hero height). */
  lift: number;
}

const sheet = (key: string, frameWidth: number): EnemySheet => ({ url: `/dungeon/enemies/${key}.png`, frameCount: 4, frameWidth, frameHeight: 256 });
const look = (key: string, idleW: number, attackW: number, scale: number, lift = 0): EnemyLook =>
  ({ idle: sheet(`${key}-idle`, idleW), attack: sheet(`${key}-attack`, attackW), scale, lift });

/** Regular enemies by kind; bosses by the kind of their zone's boss. */
export const ENEMY_LOOK: Record<EnemyKind, EnemyLook> = {
  rat: look("rat", 310, 408, 0.6),
  slime: look("slime", 274, 314, 0.62),
  bat: look("bat", 274, 284, 0.66, 0.45),
  goblin: look("goblin", 256, 308, 0.92),
  skeleton: look("skeleton", 256, 304, 1),
  ghost: look("ghost", 256, 276, 0.9, 0.22),
  imp: look("imp", 256, 256, 0.82),
  mimic: look("mimic", 256, 258, 0.78),
};

export const BOSS_LOOK: Partial<Record<EnemyKind, EnemyLook>> = {
  slime: look("boss-slime", 256, 304, 1.5),
  skeleton: look("boss-skeleton", 256, 282, 1.6),
  mimic: look("boss-mimic", 376, 446, 1.35),
  imp: look("boss-imp", 256, 310, 1.6),
  ghost: look("boss-ghost", 258, 284, 1.6, 0.08),
};

export function enemyLook(kind: EnemyKind, boss: boolean): EnemyLook {
  return (boss ? BOSS_LOOK[kind] : undefined) ?? ENEMY_LOOK[kind];
}

/** Sheets keep a small transparent margin under the feet (share of the frame height). */
export const SHEET_FOOT_MARGIN = 0.05;
