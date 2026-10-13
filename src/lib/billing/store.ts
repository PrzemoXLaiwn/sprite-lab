// =============================================================================
// Billing store — the only place that writes operations / credit balances for
// paid requests. Everything that must be atomic is one SQL transaction here.
// =============================================================================


export interface OpenInput {
  userId: string;
  feature: string;
  credits: number;
  estCostUsd: number;
  costCapUsd: number;
  inputHash: string | null;
  ipHash: string | null;
  plan: string | null;
  expensive: boolean;
  dailyLimitUsd: number;
  freeDailyLimitUsd: number;
  dayStart: Date;
}

export type OpenResult =
  | { ok: true; operationId: string; credits: number }
  | { ok: false; reason: "insufficient" | "budget" | "free_budget" | "no_user" };

export interface UserStats {
  opsLastHour: number;
  failedLastHour: number;
  sameInputFailed: number;
  ipFailedLastHour: number;
}

/** CANCELLED = refunded and not counted as a failure (e.g. a fallback path took over). */
export type FinalStatus = "SUCCEEDED" | "PARTIAL" | "FAILED" | "CANCELLED";

export interface BillingStore {
  stats(userId: string, ipHash: string | null, inputHash: string | null, since: Date): Promise<UserStats>;
  open(input: OpenInput): Promise<OpenResult>;
  /** Refunds up to `amount` (or everything still due when null); returns credits actually refunded. */
  refund(operationId: string, amount: number | null, reason: string): Promise<number>;
  finish(operationId: string, status: FinalStatus, data: { generationId?: string | null; errorCode?: string | null; costLogIncomplete?: boolean }): Promise<void>;
}

// Advisory lock id for the daily spend check (any constant works; one lock for all instances)
export const SPEND_LOCK = 734_201_913;

/** Today's spend: reported/estimated call costs; running or badly-logged operations count at least their reservation. */
export const SPEND_SQL = `
WITH calls AS (
  SELECT operation_id, sum(coalesce(cost_usd, est_cost_usd)) AS c
  FROM provider_calls WHERE created_at >= $1 GROUP BY operation_id
), ops AS (
  SELECT o.plan,
    CASE WHEN o.status = 'RUNNING' OR o.cost_log_incomplete THEN greatest(o.est_cost_usd, coalesce(k.c, 0))
         ELSE coalesce(k.c, o.est_cost_usd) END AS cost
  FROM operations o LEFT JOIN calls k ON k.operation_id = o.id
  WHERE o.created_at >= $1
)
SELECT
  coalesce((SELECT sum(cost) FROM ops), 0)::float AS total,
  coalesce((SELECT sum(cost) FROM ops WHERE plan = 'FREE'), 0)::float AS free,
  coalesce((SELECT c FROM calls WHERE operation_id IS NULL), 0)::float AS outside`;
// "outside" (guest sprites, helper calls) is reported but doesn't block paid
// work: free endpoints have their own rate limits, and counting them here
// would let anyone without credits exhaust the budget for everyone.

/** Rolling-hour counters for the guards. $1 user, $2 ip hash, $3 input hash, $4 since. */
export const STATS_SQL = `SELECT
  count(*) FILTER (WHERE user_id = $1 AND feature <> 'sprite')::int AS "opsLastHour",
  count(*) FILTER (WHERE user_id = $1 AND status = 'FAILED')::int AS "failedLastHour",
  count(*) FILTER (WHERE user_id = $1 AND status = 'FAILED' AND input_hash = $3)::int AS "sameInputFailed",
  count(*) FILTER (WHERE ip_hash = $2 AND status = 'FAILED')::int AS "ipFailedLastHour"
FROM operations WHERE created_at >= $4 AND (user_id = $1 OR ($2::text IS NOT NULL AND ip_hash = $2))`;

/**
 * Conditional refund — the idempotency guard. $1 operation id, $2 max credits.
 * Refunded can never exceed charged, and a delivered (SUCCEEDED/PARTIAL)
 * operation is never refunded. Returns the credits granted and the owner.
 */
export const REFUND_SQL = `
WITH o AS (
  SELECT id, user_id, credits_charged - credits_refunded AS left_
  FROM operations WHERE id = $1 AND status IN ('RUNNING', 'FAILED') FOR UPDATE
), d AS (
  SELECT id, user_id, LEAST(left_, $2::int) AS due FROM o WHERE left_ > 0
)
UPDATE operations SET credits_refunded = credits_refunded + d.due
FROM d WHERE operations.id = d.id AND d.due > 0
RETURNING d.due AS due, d.user_id AS user_id`;

/** A PARTIAL operation whose refund couldn't be written records "refund_pending:<n>"; this settles it once. */
export const SETTLE_PENDING_SQL = `
WITH o AS (
  SELECT id, user_id, LEAST(split_part(error_code, ':', 2)::int, credits_charged - credits_refunded) AS due
  FROM operations
  WHERE id = $1 AND status = 'PARTIAL' AND error_code LIKE 'refund_pending:%' FOR UPDATE
)
UPDATE operations SET credits_refunded = credits_refunded + o.due, error_code = 'refund_settled:' || o.due
FROM o WHERE operations.id = o.id AND o.due > 0
RETURNING o.due AS due, o.user_id AS user_id`;

/**
 * Operations stuck RUNNING (the platform killed the function, or every write
 * failed) with no generation saved for that user around that time: nothing
 * was delivered, so they become FAILED and get refunded by the cron.
 */
export const STALE_RUNNING_SQL = `
UPDATE operations o SET status = 'FAILED', error_code = 'stuck_no_output', finished_at = now()
WHERE o.status = 'RUNNING' AND o.created_at < now() - interval '15 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM generations g
    WHERE g.user_id = o.user_id AND g.created_at BETWEEN o.created_at AND o.created_at + interval '10 minutes')
RETURNING o.id`;

export function prismaStore(): BillingStore {
  const db = async () => (await import("@/lib/prisma")).prisma;
  return {
    async stats(userId, ipHash, inputHash, since) {
      const prisma = await db();
      const rows = await prisma.$queryRawUnsafe<UserStats[]>(STATS_SQL, userId, ipHash, inputHash, since);
      return rows[0] ?? { opsLastHour: 0, failedLastHour: 0, sameInputFailed: 0, ipFailedLastHour: 0 };
    },

    async open(input) {
      const prisma = await db();
      try {
        return await prisma.$transaction(async (tx) => {
          if (input.expensive) {
            // Serialise the budget check + reservation across all instances
            await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${SPEND_LOCK})`);
            const [s] = await tx.$queryRawUnsafe<{ total: number; free: number }[]>(SPEND_SQL, input.dayStart);
            if (s.total + input.estCostUsd > input.dailyLimitUsd) return { ok: false as const, reason: "budget" as const };
            if (input.plan === "FREE" && s.free + input.estCostUsd > input.freeDailyLimitUsd) return { ok: false as const, reason: "free_budget" as const };
          }
          const { count } = await tx.user.updateMany({
            where: { id: input.userId, credits: { gte: input.credits } },
            data: { credits: { decrement: input.credits } },
          });
          if (count !== 1) {
            const exists = await tx.user.findUnique({ where: { id: input.userId }, select: { id: true } });
            return { ok: false as const, reason: exists ? ("insufficient" as const) : ("no_user" as const) };
          }
          const op = await tx.operation.create({
            data: {
              userId: input.userId, feature: input.feature, creditsCharged: input.credits,
              estCostUsd: input.estCostUsd, costCapUsd: input.costCapUsd,
              inputHash: input.inputHash, ipHash: input.ipHash, plan: input.plan,
            },
            select: { id: true },
          });
          await tx.creditTransaction.create({
            data: { userId: input.userId, amount: -input.credits, type: "GENERATION", description: `${input.feature} · op:${op.id}` },
          });
          const user = await tx.user.findUniqueOrThrow({ where: { id: input.userId }, select: { credits: true } });
          return { ok: true as const, operationId: op.id, credits: user.credits };
        }, { maxWait: 10_000, timeout: 20_000 });
      } catch (err) {
        throw err instanceof Error ? err : new Error(String(err));
      }
    },

    async refund(operationId, amount, reason) {
      const prisma = await db();
      return prisma.$transaction(async (tx) => {
        const rows = await tx.$queryRawUnsafe<{ due: number; user_id: string }[]>(REFUND_SQL, operationId, amount ?? 2147483647);
        const r = rows[0];
        if (!r || r.due <= 0) return 0;
        await tx.user.update({ where: { id: r.user_id }, data: { credits: { increment: r.due } } });
        await tx.creditTransaction.create({
          data: { userId: r.user_id, amount: r.due, type: "REFUND", description: `Refund (${reason}) · op:${operationId}` },
        });
        return r.due;
      });
    },

    async finish(operationId, status, data) {
      const prisma = await db();
      // First finish wins; a late duplicate can't flip a result
      await prisma.operation.updateMany({
        where: { id: operationId, status: "RUNNING" },
        data: {
          status, finishedAt: new Date(),
          generationId: data.generationId ?? undefined,
          errorCode: data.errorCode?.slice(0, 120) ?? undefined,
          costLogIncomplete: data.costLogIncomplete ?? undefined,
        },
      });
    },
  };
}
