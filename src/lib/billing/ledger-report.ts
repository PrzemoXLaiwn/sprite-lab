// =============================================================================
// Cost-ledger report for the admin usage panel
// =============================================================================
// Reads operations / provider_calls / cost_reconciliations. Each query fails
// on its own: before the ledger migration runs the tables don't exist, and
// the panel must show an empty state instead of crashing — so every query
// resolves to null on error and `available` says whether anything answered.
// =============================================================================

export type Query = <T>(sql: string, ...args: unknown[]) => Promise<T[]>;

export interface LedgerDay { date: string; reportedUsd: number; estimatedUsd: number }
export interface LedgerProvider { provider: string; calls: number; failed: number; reportedUsd: number; estimatedUsd: number }
export interface LedgerFeature {
  feature: string;
  ops: number;
  failed: number;
  delivered: number;
  refundedOps: number;
  creditsCharged: number;
  creditsRefunded: number;
  /** Provider cost logged for these operations (reported, else our estimate). */
  costUsd: number;
  /** Operations whose cost log is incomplete (a ledger write failed). */
  incomplete: number;
}
export interface LedgerReconciliation {
  checkedAt: string;
  sinceAt: string | null;
  reportedDeltaUsd: number | null;
  loggedDeltaUsd: number | null;
  gapUsd: number | null;
  note: string | null;
}
export interface LedgerHealth { stuckRunning: number; refundsPending: number; creditsDue: number }

export interface LedgerStats {
  /** False when no ledger query answered (tables not created yet, or DB down). */
  available: boolean;
  days: LedgerDay[];
  providers: LedgerProvider[];
  features: LedgerFeature[];
  reconciliation: LedgerReconciliation | null;
  health: LedgerHealth | null;
}

const day = (col: string) => `to_char(date_trunc('day', ${col} at time zone 'UTC'), 'YYYY-MM-DD')`;

/** Per day and provider: provider-reported cost, and our estimate for calls the provider didn't price. $1 = since. */
export const LEDGER_DAYS_SQL = `
SELECT ${day("created_at")} AS d, provider,
  coalesce(sum(cost_usd), 0)::float AS reported,
  coalesce(sum(est_cost_usd) FILTER (WHERE cost_usd IS NULL), 0)::float AS estimated,
  count(*)::int AS calls,
  count(*) FILTER (WHERE outcome <> 'ok')::int AS failed
FROM provider_calls WHERE created_at >= $1 GROUP BY 1, 2`;

/** Operations per feature since $1, with the provider cost logged for them. */
export const LEDGER_FEATURES_SQL = `
WITH calls AS (
  SELECT operation_id, sum(coalesce(cost_usd, est_cost_usd)) AS c
  FROM provider_calls WHERE operation_id IS NOT NULL AND created_at >= $1 GROUP BY operation_id
)
SELECT o.feature,
  count(*)::int AS ops,
  count(*) FILTER (WHERE o.status = 'FAILED')::int AS failed,
  count(*) FILTER (WHERE o.status IN ('SUCCEEDED', 'PARTIAL'))::int AS delivered,
  count(*) FILTER (WHERE o.credits_refunded > 0)::int AS refunded_ops,
  coalesce(sum(o.credits_charged), 0)::int AS credits_charged,
  coalesce(sum(o.credits_refunded), 0)::int AS credits_refunded,
  coalesce(sum(k.c), 0)::float AS cost_usd,
  count(*) FILTER (WHERE o.cost_log_incomplete)::int AS incomplete
FROM operations o LEFT JOIN calls k ON k.operation_id = o.id
WHERE o.created_at >= $1
GROUP BY o.feature ORDER BY ops DESC`;

/** Latest Runware reconciliation snapshot (reported usage − logged calls). */
export const LEDGER_RECON_SQL = `
SELECT checked_at, since_at, reported_delta_usd, logged_delta_usd, gap_usd, note
FROM cost_reconciliations WHERE provider = 'runware' ORDER BY checked_at DESC LIMIT 1`;

/** Things that need a look: stuck operations and credits still owed back (all time). */
export const LEDGER_HEALTH_SQL = `
SELECT
  count(*) FILTER (WHERE status = 'RUNNING' AND created_at < now() - interval '15 minutes')::int AS stuck,
  count(*) FILTER (WHERE (status = 'FAILED' AND credits_refunded < credits_charged)
                      OR (status = 'PARTIAL' AND error_code LIKE 'refund_pending:%'))::int AS pending,
  coalesce(sum(CASE
    WHEN status = 'FAILED' THEN credits_charged - credits_refunded
    WHEN status = 'PARTIAL' AND error_code LIKE 'refund_pending:%' THEN split_part(error_code, ':', 2)::int
    ELSE 0 END), 0)::int AS due
FROM operations`;

const num = (v: unknown) => (typeof v === "number" ? v : Number(v ?? 0)) || 0;
const iso = (v: unknown) => (v instanceof Date ? v.toISOString() : v ? new Date(String(v)).toISOString() : null);

async function safe<T>(label: string, run: () => Promise<T[]>): Promise<T[] | null> {
  try {
    return await run();
  } catch (err) {
    console.warn(`[ledger-report] ${label} unavailable:`, err instanceof Error ? err.message.split("\n")[0] : err);
    return null;
  }
}

/** `dates` are the panel's YYYY-MM-DD days (oldest first); `since` is the first one at 00:00 UTC. */
export async function loadLedgerStats(q: Query, since: Date, dates: string[]): Promise<LedgerStats> {
  type DayRow = { d: string; provider: string; reported: number; estimated: number; calls: number; failed: number };
  type FeatRow = { feature: string; ops: number; failed: number; delivered: number; refunded_ops: number; credits_charged: number; credits_refunded: number; cost_usd: number; incomplete: number };
  type ReconRow = { checked_at: unknown; since_at: unknown; reported_delta_usd: number | null; logged_delta_usd: number | null; gap_usd: number | null; note: string | null };
  type HealthRow = { stuck: number; pending: number; due: number };

  const [dayRows, featRows, reconRows, healthRows] = await Promise.all([
    safe("spend per day", () => q<DayRow>(LEDGER_DAYS_SQL, since)),
    safe("operations per feature", () => q<FeatRow>(LEDGER_FEATURES_SQL, since)),
    safe("reconciliation", () => q<ReconRow>(LEDGER_RECON_SQL)),
    safe("health", () => q<HealthRow>(LEDGER_HEALTH_SQL)),
  ]);

  const byDate = new Map(dates.map((d) => [d, { date: d, reportedUsd: 0, estimatedUsd: 0 }]));
  const providers = new Map<string, LedgerProvider>();
  for (const r of dayRows ?? []) {
    const d = byDate.get(r.d);
    if (d) { d.reportedUsd += num(r.reported); d.estimatedUsd += num(r.estimated); }
    const p = providers.get(r.provider) ?? { provider: r.provider, calls: 0, failed: 0, reportedUsd: 0, estimatedUsd: 0 };
    p.calls += num(r.calls); p.failed += num(r.failed); p.reportedUsd += num(r.reported); p.estimatedUsd += num(r.estimated);
    providers.set(r.provider, p);
  }

  const recon = reconRows?.[0];
  const health = healthRows?.[0];
  return {
    available: [dayRows, featRows, reconRows, healthRows].some((r) => r !== null),
    days: [...byDate.values()],
    providers: [...providers.values()].sort((a, b) => b.reportedUsd + b.estimatedUsd - (a.reportedUsd + a.estimatedUsd)),
    features: (featRows ?? []).map((r) => ({
      feature: r.feature, ops: num(r.ops), failed: num(r.failed), delivered: num(r.delivered), refundedOps: num(r.refunded_ops),
      creditsCharged: num(r.credits_charged), creditsRefunded: num(r.credits_refunded), costUsd: num(r.cost_usd), incomplete: num(r.incomplete),
    })),
    reconciliation: recon
      ? {
          checkedAt: iso(recon.checked_at) ?? "", sinceAt: iso(recon.since_at),
          reportedDeltaUsd: recon.reported_delta_usd, loggedDeltaUsd: recon.logged_delta_usd, gapUsd: recon.gap_usd, note: recon.note,
        }
      : null,
    health: health ? { stuckRunning: num(health.stuck), refundsPending: num(health.pending), creditsDue: num(health.due) } : null,
  };
}
