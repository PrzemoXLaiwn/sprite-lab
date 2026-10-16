// =============================================================================
// Sprite Dungeon replay — turns the server's run log into a timed list of steps
// =============================================================================
// Pure: no DOM, no randomness. Every step carries the HP of both sides BEFORE
// it plays, so the stage can jump to any moment (skip, speed change) without
// re-simulating anything. Outcomes come only from the log.
// =============================================================================

import type { BattleAction, EnemyUnit, RunLog } from "@/lib/dungeon/simulate";

export type StepKind = "intro" | "act" | "clear" | "fall" | "end";

export interface Step {
  kind: StepKind;
  /** Index into log.floors. */
  floorIndex: number;
  floor: number;
  enemies: EnemyUnit[];
  action: BattleAction | null;
  partyHp: number[];
  enemyHp: number[];
  start: number;
  ms: number;
}

export const STEP_MS: Record<StepKind, number> = { intro: 1000, act: 280, clear: 600, fall: 1400, end: 0 };

export function buildTimeline(log: RunLog): { steps: Step[]; total: number } {
  const steps: Step[] = [];
  let t = 0;
  const push = (s: Omit<Step, "start" | "ms">) => {
    const ms = STEP_MS[s.kind];
    steps.push({ ...s, start: t, ms });
    t += ms;
  };

  log.floors.forEach((f, floorIndex) => {
    const partyHp = [...f.partyHpStart];
    const enemyHp = f.enemies.map((e) => e.hp);
    const base = { floorIndex, floor: f.floor, enemies: f.enemies };
    push({ ...base, kind: "intro", action: null, partyHp: [...partyHp], enemyHp: [...enemyHp] });
    for (const a of f.actions) {
      push({ ...base, kind: "act", action: a, partyHp: [...partyHp], enemyHp: [...enemyHp] });
      applyAction(a, partyHp, enemyHp);
    }
    push({ ...base, kind: f.cleared ? "clear" : "fall", action: null, partyHp: [...partyHp], enemyHp: [...enemyHp] });
  });

  const last = steps.at(-1);
  if (last) push({ ...last, kind: "end", action: null });
  return { steps, total: t };
}

export function applyAction(a: BattleAction, partyHp: number[], enemyHp: number[]): void {
  if (a.kind === "heal") partyHp[a.target] += a.amount;
  else if (a.side === "party") enemyHp[a.target] = Math.max(0, enemyHp[a.target] - a.amount);
  else partyHp[a.target] = Math.max(0, partyHp[a.target] - a.amount);
}

/** Index of the step playing at time `t` (last step once the replay is over). */
export function stepAt(steps: Step[], t: number): number {
  let lo = 0, hi = steps.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (steps[mid].start <= t) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}
