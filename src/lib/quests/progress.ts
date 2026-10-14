// =============================================================================
// Quest progress — pure functions shared by the API, the page and the tests
// =============================================================================

import { QUESTS, type QuestDef, type QuestStats } from "./definitions";

/** ISO week id ("2026-W42"); weeks start Monday 00:00 UTC. */
export function isoWeek(now: Date): string {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day); // Thursday of this week decides the year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Monday 00:00 UTC of the week containing `now`. */
export function weekStart(now: Date): Date {
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (day - 1));
  return d;
}

/** Key under which a claim is stored: weekly quests can be claimed once per week. */
export function claimKey(q: Pick<QuestDef, "id" | "kind">, now: Date): string {
  return q.kind === "weekly" ? `${q.id}@${isoWeek(now)}` : q.id;
}

export interface QuestState {
  id: string;
  kind: QuestDef["kind"];
  title: string;
  description: string;
  href: string;
  reward: number;
  goal: number;
  progress: number;
  complete: boolean;
  claimed: boolean;
  color?: string;
}

function valueOf(q: QuestDef, s: QuestStats): number {
  return q.metric === "hasUsername" ? (s.hasUsername ? 1 : 0) : s[q.metric];
}

export function questStates(stats: QuestStats, claims: Record<string, unknown>, now: Date): QuestState[] {
  return QUESTS.map((q) => {
    const progress = Math.min(q.goal, valueOf(q, stats));
    return {
      id: q.id, kind: q.kind, title: q.title, description: q.description, href: q.href,
      reward: q.reward, goal: q.goal, progress, complete: progress >= q.goal,
      claimed: Boolean(claims[claimKey(q, now)]), color: q.color,
    };
  });
}

/** Rewards ready to claim right now (for the nav dot). */
export function claimableCount(states: QuestState[]): number {
  return states.filter((s) => s.complete && !s.claimed).length;
}
