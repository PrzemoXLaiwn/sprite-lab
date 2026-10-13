// =============================================================================
// Lifecycle emails — who gets which ONE email today (pure, no I/O)
// =============================================================================
// Inputs: a snapshot of one user (account, email prefs, recent work, the
// marketing emails we sent them in the last 7 days) and "now".
// Output: the single sequence to send today, or the reason nobody is emailed.
//
// Hard rules (checked first, in this order):
//   1. a usable address, marketing not turned off, not unsubscribed,
//      not bounced/complained
//   2. quiet period: nothing in the first 24 h after signup (welcome is
//      separate and not sent from here)
//   3. at most 1 marketing email per UTC day and 3 per rolling 7 days — counted
//      over EVERY marketing email type in email_logs, not just lifecycle ones
// Then the first eligible sequence in SEQUENCE_PRIORITY wins.
//
// The cron (run.ts) also claims the day per user atomically before sending,
// so a retried or doubled cron run can't email anyone twice.
// =============================================================================

export const HOUR = 60 * 60 * 1000;
export const DAY = 24 * HOUR;

export type SequenceId = "bring_to_life" | "unfinished" | "unused_credits" | "winback" | "inspiration";

/** Strongest first: the first one a user qualifies for is the one they get. */
export const SEQUENCE_PRIORITY: readonly SequenceId[] = [
  "bring_to_life",
  "unfinished",
  "unused_credits",
  "winback",
  "inspiration",
];

/** email_logs.type per sequence. */
export const LIFECYCLE_LOG_TYPES: Record<SequenceId, string> = {
  bring_to_life: "LIFECYCLE_BRING_TO_LIFE",
  unfinished: "LIFECYCLE_UNFINISHED",
  unused_credits: "LIFECYCLE_UNUSED_CREDITS",
  winback: "LIFECYCLE_WINBACK",
  inspiration: "LIFECYCLE_INSPIRATION",
};

/** email_preferences key holding when a sequence was last sent (flat keys: written with a jsonb merge). */
export const SENT_AT_KEYS: Record<SequenceId, string> = {
  bring_to_life: "lifecycleBringToLifeAt",
  unfinished: "lifecycleUnfinishedAt",
  unused_credits: "lifecycleUnusedCreditsAt",
  winback: "lifecycleWinbackAt",
  inspiration: "lifecycleInspirationAt",
};

/** Every email_logs type that counts towards the frequency caps (welcome / receipts don't). */
export const MARKETING_LOG_TYPES: readonly string[] = [
  ...Object.values(LIFECYCLE_LOG_TYPES),
  "RE_ENGAGEMENT",
  "PROMO",
  "ABANDONED_CART",
  "SPECIAL_OFFER",
  "DAILY_REMINDER",
  "WEEKLY_DIGEST",
  "NEW_FEATURES",
  "RELAUNCH",
];

export const RULES = {
  maxPerDay: 1,
  maxPer7Days: 3,
  /** No marketing in the first 24 h after signup. */
  quietPeriodMs: 24 * HOUR,
  /** Also never two marketing emails closer than this (a send at 23:50 and 00:10 is "two days"). */
  minGapMs: 20 * HOUR,
  bringToLife: { maxAccountAgeMs: 7 * DAY },
  unfinished: { idleMs: 2 * DAY, windowMs: 7 * DAY, cooldownMs: 7 * DAY },
  unusedCredits: { idleMs: 5 * DAY, minCredits: 1 },
  winback: { idleMs: 21 * DAY },
  inspiration: { everyMs: 7 * DAY, activeWithinMs: 60 * DAY, minItems: 3 },
} as const;

export type WorkKind = "sprite" | "animation" | "edit";

/** One thing the user made (a row in `generations`). */
export interface WorkItem {
  id: string;
  kind: WorkKind;
  /** Absolute https URL, or null when the image can't be shown in an email. */
  imageUrl: string | null;
  /** Prompt without tool tags. */
  prompt: string;
  categoryId: string;
  styleId: string;
  createdAt: Date;
  /** Animations: motion label ("walk", "4-direction walk"). */
  motionLabel?: string;
  /** Animations: the sprite it was made from, when we could find it. */
  sourceSpriteId?: string | null;
}

/** The part of users.email_preferences the lifecycle engine reads. */
export interface LifecyclePrefs {
  marketing?: boolean;
  unsubscribedAt?: string;
  bouncedAt?: string;
  lastMarketingEmailAt?: string;
  /** UTC day ("2026-10-13") claimed by the lifecycle cron. */
  lifecycleDay?: string;
  /** Generation featured in the last lifecycle email (never featured twice in a row). */
  lifecycleLastItemId?: string;
  sentAt: Partial<Record<SequenceId, string>>;
}

export interface UserSnapshot {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  createdAt: Date;
  lastActiveAt: Date | null;
  prefs: LifecyclePrefs;
  /** Marketing emails sent to this user (any type, status "sent") in the last 7 days. */
  marketingSends: Date[];
  /** A bounce or spam complaint is on record for this address. */
  suppressed: boolean;
  /** Most recent thing they made (sprite, animation or edit) — models excluded. */
  latestItem: WorkItem | null;
  /** Most recent still image they can animate (sprite or edit). */
  latestSprite: WorkItem | null;
  hasAnimation: boolean;
  lastCreatedAt: Date | null;
}

export interface SelectionContext {
  now: Date;
  /** How many public community items the inspiration email would show today. */
  inspirationItems: number;
}

export type SkipReason =
  | "invalid_email"
  | "opted_out"
  | "suppressed"
  | "quiet_period"
  | "already_today"
  | "weekly_cap"
  | "no_match";

export type Decision =
  | { send: true; sequence: SequenceId; item: WorkItem | null }
  | { send: false; reason: SkipReason };

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

export function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function date(v: unknown): Date | null {
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const str = (v: unknown) => (typeof v === "string" && v ? v : undefined);

/** Reads the lifecycle-relevant keys out of the raw jsonb (anything else is ignored). */
export function parseLifecyclePrefs(raw: unknown): LifecyclePrefs {
  const o = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const sentAt: LifecyclePrefs["sentAt"] = {};
  for (const seq of SEQUENCE_PRIORITY) {
    const v = str(o[SENT_AT_KEYS[seq]]);
    if (v && date(v)) sentAt[seq] = v;
  }
  return {
    marketing: typeof o.marketing === "boolean" ? o.marketing : undefined,
    unsubscribedAt: str(o.unsubscribedAt),
    bouncedAt: str(o.bouncedAt),
    lastMarketingEmailAt: str(o.lastMarketingEmailAt),
    lifecycleDay: str(o.lifecycleDay),
    lifecycleLastItemId: str(o.lifecycleLastItemId),
    sentAt,
  };
}

export function isUsableEmail(email: string | null | undefined): boolean {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Last sign of life: a visit (last_active_at) or something they made. */
export function lastActivity(u: Pick<UserSnapshot, "createdAt" | "lastActiveAt" | "lastCreatedAt">): Date {
  let t = u.createdAt.getTime();
  if (u.lastActiveAt) t = Math.max(t, u.lastActiveAt.getTime());
  if (u.lastCreatedAt) t = Math.max(t, u.lastCreatedAt.getTime());
  return new Date(t);
}

const sentAt = (u: UserSnapshot, seq: SequenceId) => date(u.prefs.sentAt[seq]);

// -----------------------------------------------------------------------------
// Gates (no generation data needed — the loader uses this to skip work)
// -----------------------------------------------------------------------------

export function gate(u: Pick<UserSnapshot, "email" | "prefs" | "suppressed" | "createdAt" | "marketingSends">, now: Date): SkipReason | null {
  if (!isUsableEmail(u.email)) return "invalid_email";
  if (u.prefs.marketing === false || u.prefs.unsubscribedAt) return "opted_out";
  if (u.suppressed || u.prefs.bouncedAt) return "suppressed";
  if (now.getTime() - u.createdAt.getTime() < RULES.quietPeriodMs) return "quiet_period";

  const today = utcDay(now);
  if (u.prefs.lifecycleDay === today) return "already_today";
  const last = date(u.prefs.lastMarketingEmailAt);
  const sends = u.marketingSends.filter((d) => now.getTime() - d.getTime() < 7 * DAY && d.getTime() <= now.getTime());
  const latest = Math.max(last?.getTime() ?? 0, ...sends.map((d) => d.getTime()));
  if (latest && (utcDay(new Date(latest)) === today || now.getTime() - latest < RULES.minGapMs)) return "already_today";
  if (sends.filter((d) => utcDay(d) === today).length >= RULES.maxPerDay) return "already_today";
  if (sends.length >= RULES.maxPer7Days) return "weekly_cap";
  return null;
}

// -----------------------------------------------------------------------------
// Sequences
// -----------------------------------------------------------------------------

type Rule = (u: UserSnapshot, ctx: SelectionContext) => WorkItem | null | false;
// A rule returns false (not eligible) or the item to feature (null = none needed).

const RULE_FNS: Record<SequenceId, Rule> = {
  /** Day 1–7, made a sprite, never animated: show THEIR sprite, one click to Animate. */
  bring_to_life(u, { now }) {
    const age = now.getTime() - u.createdAt.getTime();
    if (age > RULES.bringToLife.maxAccountAgeMs) return false;
    if (u.hasAnimation || sentAt(u, "bring_to_life")) return false;
    if (!u.latestSprite?.imageUrl) return false;
    return u.latestSprite;
  },

  /** Made something in the last 7 days, nothing for 2+ days: link straight back to it. */
  unfinished(u, { now }) {
    const item = u.latestItem;
    if (!item?.imageUrl) return false;
    const sinceItem = now.getTime() - item.createdAt.getTime();
    if (sinceItem > RULES.unfinished.windowMs) return false;
    if (now.getTime() - lastActivity(u).getTime() < RULES.unfinished.idleMs) return false;
    if (u.prefs.lifecycleLastItemId === item.id) return false;
    const last = sentAt(u, "unfinished");
    if (last && now.getTime() - last.getTime() < RULES.unfinished.cooldownMs) return false;
    return item;
  },

  /** Away 5–20 days with credits left — once per absence. */
  unused_credits(u, { now }) {
    const active = lastActivity(u);
    const idle = now.getTime() - active.getTime();
    if (idle < RULES.unusedCredits.idleMs || idle >= RULES.winback.idleMs) return false;
    if (u.credits < RULES.unusedCredits.minCredits) return false;
    const last = sentAt(u, "unused_credits");
    if (last && last.getTime() > active.getTime()) return false;
    return u.latestSprite?.imageUrl ? u.latestSprite : null;
  },

  /** Away 21+ days — one light note per absence, never repeated until they come back. */
  winback(u, { now }) {
    const active = lastActivity(u);
    if (now.getTime() - active.getTime() < RULES.winback.idleMs) return false;
    const last = sentAt(u, "winback");
    if (last && last.getTime() > active.getTime()) return false;
    return u.latestSprite?.imageUrl ? u.latestSprite : null;
  },

  /** Recently active, no other marketing email this week: 6 community picks. */
  inspiration(u, { now, inspirationItems }) {
    if (inspirationItems < RULES.inspiration.minItems) return false;
    if (now.getTime() - lastActivity(u).getTime() > RULES.inspiration.activeWithinMs) return false;
    if (u.marketingSends.some((d) => now.getTime() - d.getTime() < 7 * DAY)) return false;
    const lastMk = date(u.prefs.lastMarketingEmailAt);
    if (lastMk && now.getTime() - lastMk.getTime() < 7 * DAY) return false;
    const last = sentAt(u, "inspiration");
    if (last && now.getTime() - last.getTime() < RULES.inspiration.everyMs) return false;
    return null;
  },
};

/** The one email (if any) this user should get today. */
export function selectLifecycleEmail(u: UserSnapshot, ctx: SelectionContext): Decision {
  const blocked = gate(u, ctx.now);
  if (blocked) return { send: false, reason: blocked };
  for (const sequence of SEQUENCE_PRIORITY) {
    const item = RULE_FNS[sequence](u, ctx);
    if (item !== false) return { send: true, sequence, item };
  }
  return { send: false, reason: "no_match" };
}

/** Everything to merge into email_preferences after a successful send. */
export function sentPatch(sequence: SequenceId, item: WorkItem | null, now: Date): Record<string, string> {
  const at = now.toISOString();
  const patch: Record<string, string> = { lastMarketingEmailAt: at, [SENT_AT_KEYS[sequence]]: at };
  if (item) patch.lifecycleLastItemId = item.id;
  return patch;
}
