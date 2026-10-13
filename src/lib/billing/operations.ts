// =============================================================================
// Paid operations — charge, guard, run, refund, finish
// =============================================================================
//   const started = await startOperation({ userId, feature, credits, ... });
//   if (!started.ok) return NextResponse.json(started.body, { status: started.status });
//   const op = started.op;
//   try { const out = await op.run(() => work()); await op.succeed(id); }
//   catch (e) { await op.fail("PROVIDER_ERROR"); }       // refunds what's still due
//
// Guards before any money moves (all per user, plus per network for abuse):
//   rate (ops/hour) · failure cap · same failing input · failures per IP ·
//   daily spend budget and free-tier budget (checked under a DB lock).
// For expensive features every guard FAILS SAFE: if the database can't answer,
// the request is refused (nothing charged). Cheap features fail open.
// =============================================================================

import { createHash } from "node:crypto";
import { FEATURES, LIMITS, spendLimits, type FeatureKey } from "./features";
import { flushOperation, runInOperation, type OperationContext } from "./ledger";
import { prismaStore, type BillingStore, type FinalStatus } from "./store";

export interface StartInput {
  userId: string;
  feature: FeatureKey;
  credits: number;
  plan?: string | null;
  /** Anything identifying the request (prompt, motion, source id, options) — for the same-failure guard. */
  input?: unknown;
  ip?: string | null;
  store?: BillingStore;
  now?: Date;
}

export type StartResult =
  | { ok: true; op: OpHandle }
  | { ok: false; status: number; code: string; body: { error: string; code: string; noCredits?: boolean; retryAfterSec?: number } };

export interface OpHandle {
  id: string;
  creditsCharged: number;
  /** Runs provider work inside the operation context (cost cap + ledger correlation). */
  run<T>(fn: () => Promise<T>): Promise<T>;
  /** Refunds part of the charge (e.g. a smooth pass that didn't happen). Idempotent up to the charge. */
  refund(amount: number, reason: string): Promise<number>;
  succeed(generationId?: string | null): Promise<void>;
  partial(generationId: string | null, reason: string): Promise<void>;
  /** Refunds everything still due and closes the operation as FAILED. */
  fail(errorCode: string): Promise<number>;
  /** Refunds everything and closes as CANCELLED — not a failure (a fallback path takes over). */
  cancel(reason: string): Promise<number>;
  readonly context: OperationContext;
}

const hash = (v: unknown) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v ?? null)).digest("hex").slice(0, 32);
const refuse = (status: number, code: string, error: string, extra: Partial<{ noCredits: boolean; retryAfterSec: number }> = {}): StartResult =>
  ({ ok: false, status, code, body: { error, code, ...extra } });

export async function startOperation(input: StartInput): Promise<StartResult> {
  const store = input.store ?? prismaStore();
  const spec = FEATURES[input.feature];
  const now = input.now ?? new Date();
  const hourAgo = new Date(now.getTime() - 3600_000);
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const inputHash = input.input === undefined ? null : hash([input.feature, input.input]);
  const ipHash = input.ip ? hash(["ip", input.ip]) : null;
  if (!Number.isInteger(input.credits) || input.credits < 1) return refuse(500, "BAD_PRICE", "Couldn't process credits.");

  // ── Rolling-hour guards ──────────────────────────────────────────────────
  let stats;
  try {
    stats = await store.stats(input.userId, ipHash, inputHash, hourAgo);
  } catch (err) {
    console.error("[billing] stats unavailable:", err instanceof Error ? err.message : err);
    if (spec.expensive) return refuse(503, "GUARD_UNAVAILABLE", "This tool is paused for a moment — nothing was charged. Please try again in a minute.");
    stats = null;
  }
  if (stats) {
    if (spec.expensive && stats.opsLastHour >= LIMITS.opsPerHour) {
      return refuse(429, "RATE_LIMITED", "You've made a lot of requests this hour — please wait a few minutes.", { retryAfterSec: 600 });
    }
    if (spec.expensive && stats.sameInputFailed >= LIMITS.sameInputFailures) {
      return refuse(429, "REPEATED_FAILURE", "This exact request failed twice — try a different description or motion. Nothing was charged.", { retryAfterSec: 3600 });
    }
    if (spec.expensive && stats.failedLastHour >= LIMITS.failedPerHour) {
      return refuse(429, "FAILURE_COOLDOWN", "A few attempts failed in a row, so this tool is paused for you for a bit. Nothing was charged.", { retryAfterSec: 1800 });
    }
    if (spec.expensive && stats.ipFailedLastHour >= LIMITS.failedPerIpPerHour) {
      return refuse(429, "FAILURE_COOLDOWN", "Too many failed attempts from this network — please try again later. Nothing was charged.", { retryAfterSec: 1800 });
    }
  }

  // ── Charge + budget under one transaction ────────────────────────────────
  const limits = spendLimits();
  let opened;
  try {
    opened = await store.open({
      userId: input.userId, feature: input.feature, credits: input.credits,
      estCostUsd: spec.estCostUsd, costCapUsd: spec.capUsd, inputHash, ipHash,
      plan: input.plan ?? null, expensive: spec.expensive,
      dailyLimitUsd: limits.daily, freeDailyLimitUsd: limits.freeDaily, dayStart,
    });
  } catch (err) {
    console.error("[billing] open failed:", err instanceof Error ? err.message : err);
    return refuse(503, "GUARD_UNAVAILABLE", "This tool is paused for a moment — nothing was charged. Please try again in a minute.");
  }
  if (!opened.ok) {
    if (opened.reason === "insufficient") return refuse(402, "NO_CREDITS", `This costs ${input.credits} credits.`, { noCredits: true });
    if (opened.reason === "no_user") return refuse(404, "NO_USER", "Account not found.");
    if (opened.reason === "free_budget") return refuse(503, "FREE_BUDGET", "Free animations are busy for today — they'll be back tomorrow. Paid plans keep working. Nothing was charged.");
    return refuse(503, "BUDGET", "This tool is resting for today — please try again tomorrow. Nothing was charged.");
  }

  return { ok: true, op: makeHandle(store, opened.operationId, input.userId, input.credits, spec.capUsd) };
}

function makeHandle(store: BillingStore, id: string, userId: string, credits: number, capUsd: number): OpHandle {
  const context: OperationContext = { operationId: id, userId, capUsd, spentUsd: 0, calls: 0, incomplete: false, pending: [] };
  // Credits a partial refund owed but couldn't write — settled later by the cron
  let pendingRefund = 0;
  const safeRefund = async (amount: number | null, reason: string) => {
    try {
      return await store.refund(id, amount, reason);
    } catch (err) {
      if (amount !== null) pendingRefund += amount;
      // Not retried here: the operation keeps its "due" balance and the
      // reconcile job (or an admin) refunds it later — never twice.
      console.error(`[billing] refund failed for ${id}:`, err instanceof Error ? err.message : err);
      return 0;
    }
  };
  const safeFinish = async (status: FinalStatus, data: { generationId?: string | null; errorCode?: string | null }) => {
    const complete = await flushOperation(context);
    // A delivered operation that still owes a partial refund records it for the cron
    const errorCode = status === "PARTIAL" && pendingRefund > 0 ? `refund_pending:${pendingRefund}` : data.errorCode;
    try {
      await store.finish(id, status, { ...data, errorCode, costLogIncomplete: !complete });
    } catch (err) {
      console.error(`[billing] finish failed for ${id}:`, err instanceof Error ? err.message : err);
    }
  };
  return {
    id,
    creditsCharged: credits,
    context,
    run: (fn) => runInOperation(context, fn),
    refund: (amount, reason) => safeRefund(Math.max(0, Math.floor(amount)), reason),
    succeed: (generationId) => safeFinish("SUCCEEDED", { generationId: generationId ?? null }),
    partial: (generationId, reason) => safeFinish("PARTIAL", { generationId, errorCode: reason }),
    async fail(errorCode) {
      const refunded = await safeRefund(null, errorCode);
      await safeFinish("FAILED", { errorCode });
      return refunded;
    },
    async cancel(reason) {
      const refunded = await safeRefund(null, reason);
      // If the refund didn't land, FAILED lets the cron settle it; otherwise it's a clean cancel
      await safeFinish(refunded > 0 || credits === 0 ? "CANCELLED" : "FAILED", { errorCode: reason });
      return refunded;
    },
  };
}

/**
 * Which budget an account draws from. Anyone who has paid (subscription or
 * credit pack) is "PAID" — the free-tier cap only applies to people who never paid.
 */
export function budgetPlan(user: { plan?: string | null; totalSpent?: number | null; stripeCustomerId?: string | null } | null | undefined): string {
  if (!user) return "FREE";
  if (user.plan && user.plan !== "FREE") return user.plan;
  return (user.totalSpent ?? 0) > 0 || user.stripeCustomerId ? "PAID" : "FREE";
}

/** Client IP from proxy headers (first hop). */
export function requestIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || null);
}
