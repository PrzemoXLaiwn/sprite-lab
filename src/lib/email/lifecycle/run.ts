// =============================================================================
// Lifecycle emails — one daily run
// =============================================================================
// Dry run (the default whenever MARKETING_EMAILS_ENABLED isn't "true"): load,
// select, count, return. No claim, no send, no preference write.
// Live run: for each picked user, in priority order and up to the daily cap:
//   claim the day (atomic) → render → send → merge the sent markers.
// A user whose claim fails was already handled today and is skipped.
// =============================================================================

import { buildLifecycleMessage, renderLifecycleHtml, type InspirationPick } from "./content";
import { SEQUENCE_PRIORITY, lastActivity, selectLifecycleEmail, sentPatch, utcDay, type SequenceId, type SkipReason, type UserSnapshot, type WorkItem } from "./rules";
import type { LifecycleAudience } from "./data";
import type { OutgoingLifecycleEmail } from "./send";
import type { EmailResult } from "../send";

/** Resend's free plan allows 100 emails a day across everything we send. */
export const DEFAULT_DAILY_CAP = 80;

export interface LifecycleDeps {
  loadAudience(now: Date): Promise<LifecycleAudience>;
  unsubscribeUrl(userId: string): string;
  claimDay(userId: string, day: string): Promise<boolean>;
  send(msg: OutgoingLifecycleEmail): Promise<EmailResult>;
  markSent(userId: string, patch: Record<string, unknown>): Promise<void>;
  sleep(ms: number): Promise<void>;
}

export interface LifecycleRunOptions {
  dryRun: boolean;
  now?: Date;
  dailyCap?: number;
  /** Shown in the response so it's obvious why nothing was sent. */
  dryRunReason?: string;
}

export interface LifecycleRunResult {
  dryRun: boolean;
  dryRunReason?: string;
  day: string;
  scanned: number;
  /** Users who qualify today, per sequence (before the daily cap). */
  eligible: Record<SequenceId, number>;
  /** Would be (dry run) or were attempted (live) today, after the daily cap. */
  planned: Record<SequenceId, number>;
  dailyCap: number;
  /** Qualified but over today's cap — they're picked up on a later day. */
  deferred: number;
  skipped: Partial<Record<SkipReason, number>>;
  inspirationItems: number;
  /** First few picks for eyeballing: user id, sequence and subject — no addresses. */
  sample: { userId: string; sequence: SequenceId; subject: string }[];
  sent: number;
  failed: number;
  alreadyClaimed: number;
  errors: string[];
}

const zero = (): Record<SequenceId, number> =>
  Object.fromEntries(SEQUENCE_PRIORITY.map((s) => [s, 0])) as Record<SequenceId, number>;

interface Pick {
  user: UserSnapshot;
  sequence: SequenceId;
  item: WorkItem | null;
}

export async function runLifecycle(opts: LifecycleRunOptions, deps: LifecycleDeps): Promise<LifecycleRunResult> {
  const now = opts.now ?? new Date();
  const day = utcDay(now);
  const dailyCap = Math.max(0, Math.floor(opts.dailyCap ?? DEFAULT_DAILY_CAP));
  const audience = await deps.loadAudience(now);
  const inspiration: InspirationPick | null = audience.inspiration;

  const result: LifecycleRunResult = {
    dryRun: opts.dryRun,
    dryRunReason: opts.dryRun ? opts.dryRunReason : undefined,
    day,
    scanned: audience.scanned,
    eligible: zero(),
    planned: zero(),
    dailyCap,
    deferred: 0,
    skipped: { ...audience.gated },
    inspirationItems: inspiration?.items.length ?? 0,
    sample: [],
    sent: 0,
    failed: 0,
    alreadyClaimed: 0,
    errors: [],
  };

  const picks: Pick[] = [];
  for (const user of audience.users) {
    const d = selectLifecycleEmail(user, { now, inspirationItems: result.inspirationItems });
    if (!d.send) {
      result.skipped[d.reason] = (result.skipped[d.reason] ?? 0) + 1;
      continue;
    }
    result.eligible[d.sequence]++;
    picks.push({ user, sequence: d.sequence, item: d.item });
  }

  // Strongest sequence first, then the most recently active people
  const rank = (s: SequenceId) => SEQUENCE_PRIORITY.indexOf(s);
  picks.sort((a, b) => rank(a.sequence) - rank(b.sequence) || lastActivity(b.user).getTime() - lastActivity(a.user).getTime());
  const today = picks.slice(0, dailyCap);
  result.deferred = picks.length - today.length;

  for (const p of today) {
    result.planned[p.sequence]++;
    if (result.sample.length < 10) {
      const msg = buildLifecycleMessage({ sequence: p.sequence, user: p.user, item: p.item, inspiration, unsubscribeUrl: "https://www.sprite-lab.com/settings" });
      result.sample.push({ userId: p.user.id, sequence: p.sequence, subject: msg.subject });
    }
  }
  if (opts.dryRun) return result;

  for (const p of today) {
    try {
      if (!(await deps.claimDay(p.user.id, day))) {
        result.alreadyClaimed++;
        continue;
      }
      const msg = buildLifecycleMessage({ sequence: p.sequence, user: p.user, item: p.item, inspiration, unsubscribeUrl: deps.unsubscribeUrl(p.user.id) });
      const html = await renderLifecycleHtml(msg);
      const res = await deps.send({
        to: p.user.email,
        userId: p.user.id,
        sequence: p.sequence,
        subject: msg.subject,
        html,
        text: msg.text,
        metadata: { day, itemId: p.item?.id ?? null },
      });
      if (res.success) {
        result.sent++;
        await deps.markSent(p.user.id, sentPatch(p.sequence, p.item, now));
      } else {
        result.failed++;
        result.errors.push(`${p.user.id}: ${res.error}`);
        // Daily provider quota hit — stop; the rest go out on a later day
        if (/limit|quota|429/i.test(res.error ?? "")) break;
      }
    } catch (err) {
      result.failed++;
      result.errors.push(`${p.user.id}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
    await deps.sleep(600); // Resend: 2 requests/second
  }
  return result;
}
