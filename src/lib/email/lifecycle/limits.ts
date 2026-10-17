// =============================================================================
// Lifecycle emails — how many may go out today (pure, no I/O)
// =============================================================================
// Two limits, the smaller one wins:
//
// 1. Warm-up. LIFECYCLE_DAILY_CAP (default 20) is the starting cap. Counting
//    from the UTC day of the first live lifecycle send (derived from
//    email_logs, so there's no settings table to keep in sync):
//      days 0–2  → 1× the cap   (20)
//      days 3–6  → 2× the cap   (40)
//      day 7+    → 4× the cap   (80)
//    Before anything was ever sent it's day 0.
//
// 2. Provider. RESEND_DAILY_LIMIT (default 100 = Resend free plan) is shared
//    by EVERY sender (welcome, digest, receipts…). The run reads today's total
//    from email_logs and never pushes the day above it.
// =============================================================================

import { DAY } from "./rules";

export const DEFAULT_BASE_CAP = 20;
export const DEFAULT_RESEND_DAILY_LIMIT = 100;
/** Warm-up steps: [first day index, multiplier of the base cap]. */
export const WARMUP_STEPS: readonly (readonly [number, number])[] = [
  [0, 1],
  [3, 2],
  [7, 4],
];

function envInt(raw: string | undefined, fallback: number, min: number, max: number): number {
  const n = Number(raw);
  if (raw === undefined || raw.trim() === "" || !Number.isFinite(n)) return fallback;
  return Math.min(Math.max(Math.floor(n), min), max);
}

/** LIFECYCLE_DAILY_CAP: the warm-up starting cap (1–1000, default 20). */
export function lifecycleBaseCap(env: Record<string, string | undefined> = process.env): number {
  return envInt(env.LIFECYCLE_DAILY_CAP, DEFAULT_BASE_CAP, 1, 1000);
}

/** RESEND_DAILY_LIMIT: emails per UTC day across all senders (0–100000, default 100). */
export function resendDailyLimit(env: Record<string, string | undefined> = process.env): number {
  return envInt(env.RESEND_DAILY_LIMIT, DEFAULT_RESEND_DAILY_LIMIT, 0, 100_000);
}

const utcMidnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());

/** Whole UTC days since the first live send (0 on that day, and when nothing was sent yet). */
export function warmupDay(firstLiveSendAt: Date | null, now: Date): number {
  if (!firstLiveSendAt) return 0;
  return Math.max(0, Math.round((utcMidnight(now) - utcMidnight(firstLiveSendAt)) / DAY));
}

export function warmupMultiplier(day: number): number {
  let m = 1;
  for (const [from, mult] of WARMUP_STEPS) if (day >= from) m = mult;
  return m;
}

export interface SendStats {
  /** Emails of any type handed to Resend today (UTC), i.e. email_logs rows that didn't fail. */
  sentToday: number;
  /** First lifecycle email that actually went out, or null. */
  firstLiveSendAt: Date | null;
}

export interface DailyCap {
  /** What this run may send. */
  cap: number;
  baseCap: number;
  warmupDay: number;
  warmupCap: number;
  providerLimit: number;
  sentToday: number;
  providerRemaining: number;
  limitedBy: "warmup" | "provider";
}

export function computeDailyCap(input: { baseCap: number; providerLimit: number; stats: SendStats; now: Date }): DailyCap {
  const baseCap = Math.max(0, Math.floor(input.baseCap));
  const day = warmupDay(input.stats.firstLiveSendAt, input.now);
  const warmupCap = baseCap * warmupMultiplier(day);
  const providerLimit = Math.max(0, Math.floor(input.providerLimit));
  const sentToday = Math.max(0, Math.floor(input.stats.sentToday));
  const providerRemaining = Math.max(0, providerLimit - sentToday);
  const cap = Math.min(warmupCap, providerRemaining);
  return {
    cap,
    baseCap,
    warmupDay: day,
    warmupCap,
    providerLimit,
    sentToday,
    providerRemaining,
    limitedBy: providerRemaining < warmupCap ? "provider" : "warmup",
  };
}
