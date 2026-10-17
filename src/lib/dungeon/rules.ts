// =============================================================================
// Sprite Dungeon — calendar, daily limit, prizes, public names (pure)
// =============================================================================

import { isoWeek, weekStart } from "@/lib/quests/progress";
import { BADGE_RANKS, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS, RUNS_PER_DAY, badgeFor } from "./config";
import { publicTag } from "./rng";

export { isoWeek, weekStart };

const DAY_MS = 86_400_000;

/** UTC calendar day, "2026-10-14". Runs reset at 00:00 UTC. */
export function utcDay(now: Date): string {
  return now.toISOString().slice(0, 10);
}

export function nextUtcMidnight(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

/** The ISO week before the one containing `now`: id + [start, end). */
export function previousWeek(now: Date): { week: string; start: Date; end: Date } {
  const end = weekStart(now);
  const start = new Date(end.getTime() - 7 * DAY_MS);
  return { week: isoWeek(start), start, end };
}

export function runsLeft(usedToday: number): number {
  return Math.max(0, RUNS_PER_DAY - usedToday);
}

/**
 * Index the next run would take (1-based), or null when the day is used up.
 * `taken` are the indices already stored for the day; the unique
 * (user_id, run_day, run_index) key makes a parallel request that picked the
 * same index fail, and it simply retries with the next one.
 */
export function nextRunIndex(taken: number[]): number | null {
  const next = (taken.length ? Math.max(...taken) : 0) + 1;
  return next <= RUNS_PER_DAY ? next : null;
}

export interface Prize {
  rank: number;
  credits: number;
  badge: string;
}

/** Prize for a final weekly rank. Credits only when the player is eligible. */
export function prizeFor(rank: number, eligibleForCredits: boolean): Prize | null {
  if (rank < 1 || rank > BADGE_RANKS) return null;
  const credits = eligibleForCredits ? PRIZE_CREDITS[rank - 1] ?? 0 : 0;
  return { rank, credits, badge: badgeFor(rank) };
}

export function isEligibleForCredits(paidGenerationsThatWeek: number): boolean {
  return paidGenerationsThatWeek >= PRIZE_MIN_PAID_GENERATIONS;
}

/** Most credits one week can pay out. */
export function maxWeeklyPayout(): number {
  return PRIZE_CREDITS.slice(0, BADGE_RANKS).reduce((a, b) => a + b, 0);
}

/** Name on the leaderboard: the username, otherwise a stable tag. Never an email. */
export function displayName(username: string | null | undefined, userId: string): string {
  const u = username?.trim();
  return u ? u : `Creator #${publicTag(userId)}`;
}
