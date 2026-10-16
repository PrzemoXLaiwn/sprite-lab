// =============================================================================
// Tower replay — turns the floors the server sent into a timed list of steps
// =============================================================================
// Pure: no DOM, no randomness. Each step carries both sides' HP BEFORE it
// plays, so the stage can jump to any moment without re-simulating. The
// combo counter is display-only (consecutive hero hits since the last enemy hit).
// =============================================================================

import type { BattleAction, EnemyUnit, FloorLog, StartEvent } from "@/lib/dungeon/simulate";

export type StepKind = "climb" | "revive" | "gate" | "intro" | "act" | "clear" | "chest" | "record" | "fall" | "end";

export interface Step {
  kind: StepKind;
  floorIndex: number;
  floor: number;
  boss: boolean;
  enemies: EnemyUnit[];
  action: BattleAction | null;
  partyHp: number[];
  enemyHp: number[];
  combo: number;
  chest: string | null;
  /** Floor-start event shown in a "revive" step. */
  event: StartEvent | null;
  /** HP regained by each hero, shown on the "clear" step. */
  restHeal: number[] | null;
  start: number;
  ms: number;
}

export const STEP_MS: Record<StepKind, number> = {
  climb: 1300, revive: 1000, gate: 1000, intro: 450, act: 300, clear: 450, chest: 1500, record: 1300, fall: 1600, end: 0,
};
/** Extra time on crits and KOs: the hit-stop that makes big hits land. */
export const HIT_STOP_MS = 150;

/** Extra time for skills (so their real animation plays out) and the slow-motion boss knock-out. */
export const SKILL_MS = { rare: 380, epic: 480, legendary: 760 } as const;
export const BOSS_KO_MS = 520;

export function actionMs(a: BattleAction, bossKo = false): number {
  if (a.kind === "revive") return 800;
  if (a.kind === "heal") return 260;
  if (a.kind === "stunned") return 360;
  const skill = a.skill && a.skill.rule !== "basic" ? SKILL_MS[a.skill.rule] : 0;
  return STEP_MS.act + (a.crit || a.ko ? HIT_STOP_MS : 0) + (a.extra?.length ? 80 : 0) + skill + (bossKo ? BOSS_KO_MS : 0);
}

export function applyAction(a: BattleAction, partyHp: number[], enemyHp: number[]): void {
  if (a.kind === "stunned") return;
  if (a.kind === "heal") partyHp[a.target] += a.amount;
  else if (a.kind === "revive") partyHp[a.target] = a.amount;
  else if (a.side === "party") {
    enemyHp[a.target] = Math.max(0, enemyHp[a.target] - a.amount);
    for (const x of a.extra ?? []) enemyHp[x.target] = Math.max(0, enemyHp[x.target] - x.amount);
    if (a.leech) partyHp[a.actor] += a.leech;
  } else partyHp[a.target] = Math.max(0, partyHp[a.target] - a.amount);
}

export function buildTimeline(floors: FloorLog[], opts: { bestBefore?: number | null } = {}): { steps: Step[]; total: number } {
  const steps: Step[] = [];
  let t = 0;
  let combo = 0;
  let recordShown = false;
  const push = (s: Omit<Step, "start" | "ms" | "combo">, ms = STEP_MS[s.kind]) => {
    steps.push({ ...s, combo, start: t, ms });
    t += ms;
  };

  floors.forEach((f, floorIndex) => {
    const events = f.startEvents ?? [];
    // Heroes revived as the floor starts were down until then
    const partyHp = f.partyHpStart.map((h, i) => (events.some((ev) => ev.target === i) ? 0 : h));
    const enemyHp = f.enemies.map((e) => e.hp);
    const base = { floorIndex, floor: f.floor, boss: f.boss, enemies: f.enemies, chest: null as string | null, event: null as StartEvent | null, restHeal: null as number[] | null };
    const snap = () => ({ partyHp: [...partyHp], enemyHp: [...enemyHp] });
    push({ ...base, kind: "climb", action: null, ...snap() });
    for (const ev of events) {
      push({ ...base, kind: "revive", event: ev, action: null, ...snap() });
      partyHp[ev.target] = ev.amount;
    }
    if (opts.bestBefore != null && !recordShown && f.floor === opts.bestBefore + 1) {
      recordShown = true;
      push({ ...base, kind: "record", action: null, ...snap() });
    }
    if (f.boss) push({ ...base, kind: "gate", action: null, ...snap() });
    push({ ...base, kind: "intro", action: null, ...snap() });
    for (const a of f.actions) {
      if (a.side === "enemy" && a.kind === "hit") combo = 0;
      const bossKo = a.side === "party" && a.kind === "hit" && (((a.ko && f.enemies[a.target]?.boss) || a.extra?.some((x) => x.ko && f.enemies[x.target]?.boss)) ?? false);
      push({ ...base, kind: "act", action: a, ...snap() }, actionMs(a, bossKo));
      if (a.side === "party" && a.kind === "hit") combo++;
      applyAction(a, partyHp, enemyHp);
    }
    push({ ...base, kind: f.cleared ? "clear" : "fall", action: null, restHeal: f.cleared && f.restHeal?.some((h) => h > 0) ? f.restHeal : null, ...snap() });
    if (f.chest) push({ ...base, chest: f.chest, kind: "chest", action: null, ...snap() });
  });

  const last = steps.at(-1);
  if (last) push({ ...last, kind: "end", action: null });
  return { steps, total: t };
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
