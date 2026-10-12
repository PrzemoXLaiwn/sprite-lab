// =============================================================================
// Move sets — a whole character's animations in one go (client-safe)
// =============================================================================
// Each move is an ordinary /api/animate request (same prices, saved to assets
// one by one), so a set is just a curated list run back to back. Idle uses the
// rig; "walk4dir" is the 4-direction RPG sheet; the rest are AI animations
// described explicitly so they read well as one set.
// =============================================================================

import { RIG_CREDITS, animationCredits, rotationFor } from "./animations";

export interface Move {
  /** File / animation name in the engine pack. */
  name: string;
  label: string;
  action: string;
  frames: 4 | 6 | 9;
  customMotion?: string;
}

export interface Moveset {
  id: "fighting" | "topdown" | "platformer";
  label: string;
  hint: string;
  moves: Move[];
}

const custom = (name: string, label: string, frames: 4 | 6 | 9, motion: string): Move => ({ name, label, action: "custom", frames, customMotion: motion });

export const MOVESETS: Moveset[] = [
  {
    id: "fighting",
    label: "Fighting game",
    hint: "side view · 9 moves",
    moves: [
      { name: "idle", label: "Idle", action: "idle", frames: 4 },
      custom("walk", "Walk", 6, "fighting-game walk forward in place: guard up, small alternating steps, facing the same way"),
      custom("jump", "Jump", 6, "jump straight up from a crouch, tuck in the air, land back in stance"),
      custom("light_attack", "Light attack", 6, "quick light strike with its weapon or fist straight forward, then back to stance, feet stay planted"),
      custom("heavy_attack", "Heavy attack", 6, "heavy attack: big wind-up, then a powerful swing forward with its weapon or fist, then recover, feet stay planted"),
      custom("block", "Block", 4, "raises its weapon or arms in a solid guard to block a hit, feet stay planted"),
      custom("hurt", "Hurt", 4, "gets hit: recoils backwards, then regains stance"),
      custom("knockout", "Knockout", 6, "knocked out: staggers, falls backwards and ends lying on the ground"),
      custom("victory", "Victory", 6, "victory pose: raises its weapon or fist in triumph, proud and confident"),
    ],
  },
  {
    id: "topdown",
    label: "Top-down RPG",
    hint: "4-direction walk · 5 moves",
    moves: [
      { name: "idle", label: "Idle", action: "idle", frames: 4 },
      { name: "walk", label: "Walk (4 directions)", action: "walk4dir", frames: 4 },
      custom("attack", "Attack", 6, "attacks forward with its weapon or fist, then back to stance, feet stay planted"),
      custom("hurt", "Hurt", 4, "gets hit: flinches backwards, then recovers"),
      custom("death", "Death", 6, "defeated: staggers and collapses to the ground"),
    ],
  },
  {
    id: "platformer",
    label: "Platformer",
    hint: "side view · 6 moves",
    moves: [
      { name: "idle", label: "Idle", action: "idle", frames: 4 },
      custom("run", "Run", 6, "run cycle in place, side view: leaning forward, long strides, arms pumping"),
      custom("jump", "Jump", 6, "platformer jump: crouch, take off, rise, peak with legs tucked, fall, land"),
      custom("attack", "Attack", 6, "quick attack forward with its weapon or fist, then back to stance"),
      custom("hurt", "Hurt", 4, "gets hit: knocked back a little, then recovers"),
      custom("death", "Death", 6, "defeated: falls down and stays on the ground"),
    ],
  },
];

export function moveCredits(m: Move): number {
  if (m.action === "idle") return RIG_CREDITS;
  const r = rotationFor(m.action);
  if (r) return r.credits;
  return animationCredits(m.frames, false);
}

export function movesetCredits(set: Moveset): number {
  return set.moves.reduce((sum, m) => sum + moveCredits(m), 0);
}
