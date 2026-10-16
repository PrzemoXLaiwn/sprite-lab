// Sprite Dungeon — what the result card shows, computed from the run log (pure).

import type { RunLog } from "./simulate";

export interface RunSummary {
  floor: number;
  /** Party slot that dealt the most damage over the whole run (ties → lower slot). */
  mvp: number;
  mvpDamage: number;
  /** What stopped the party: the boss's name, or the floor's line-up. */
  stoppedBy: string;
  bossStop: boolean;
}

export function summarizeRun(log: RunLog): RunSummary {
  const dealt = log.party.map(() => 0);
  for (const f of log.floors) f.dealt.forEach((d, i) => { dealt[i] += d; });
  let mvp = 0;
  dealt.forEach((d, i) => { if (d > dealt[mvp]) mvp = i; });
  const last = log.floors.at(-1);
  const boss = last?.enemies.find((e) => e.boss);
  const names = [...new Set(last?.enemies.map((e) => e.name) ?? [])];
  return {
    floor: log.floor,
    mvp,
    mvpDamage: dealt[mvp] ?? 0,
    stoppedBy: boss ? boss.name : names.length ? names.join(" and ") : "the dungeon",
    bossStop: Boolean(boss),
  };
}

export interface RankChange {
  before: number | null;
  after: number | null;
  /** Positive = climbed. */
  climbed: number;
}

export function rankChange(before: number | null, after: number | null): RankChange {
  return { before, after, climbed: before !== null && after !== null ? before - after : 0 };
}
