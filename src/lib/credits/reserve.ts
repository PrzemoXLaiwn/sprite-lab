/**
 * Pipeline-shaped credit reservation and refund.
 *
 * Exports `reserveCredits` and `refundReservedCredits` — the latter
 * deliberately distinct in name from the legacy `refundCredits` in
 * db/credits.ts so the orchestrator imports and pairs correctly.
 *
 * Wraps src/lib/db/credits.ts primitives with:
 *   - Typed PipelineError throwing (InsufficientCreditsError vs.
 *     CreditDeductionError — see errors.ts step 3 split).
 *   - "Audit reason" string on refund (persisted to
 *     credit_transactions.description via addCredits, not lost like it
 *     would be via the existing refundCredits helper).
 *   - Refund-failure swallow: a failed refund on top of a failed pipeline
 *     is logged but never re-thrown. The original pipeline error is the
 *     caller's concern; masking it with a refund error would be worse.
 *
 * Race-safety: `checkAndDeductCredits` uses a Prisma transaction. Do not
 * split it into separate check / deduct calls — the atomicity is what
 * prevents two concurrent requests both passing the balance check on 1
 * credit. See db/credits.ts header comment.
 */

import {
  checkAndDeductCredits,
  getUserCredits,
  addCredits,
} from "../db/credits";
import {
  InsufficientCreditsError,
  CreditDeductionError,
} from "../pipeline/errors";
import { logger } from "../logger";

export interface ReserveCreditsParams {
  userId: string;
  amount: number;
}

export interface ReserveCreditsResult {
  success: true;
  balanceAfter: number;
}

export interface RefundReservedCreditsParams {
  userId: string;
  amount: number;
  /**
   * Short audit tag — lands in `credit_transactions.description` as
   * `pipeline: ${reason}`. Keep it machine-parseable (underscores, no
   * free-form sentences). Examples:
   *   - "pipeline_failure_runware"
   *   - "pipeline_failure_bg_removal"
   *   - "pipeline_failure_persistence"
   */
  reason: string;
}

// ─── reserveCredits (step 3) ──────────────────────────────────────────────

/**
 * Atomically check balance and deduct `amount` credits.
 *
 * Throws:
 *   - InsufficientCreditsError — user balance < amount. No deduction
 *     attempted. `context.available` populated via a follow-up balance
 *     fetch (best-effort; omitted if the fetch itself fails).
 *   - CreditDeductionError — any other failure from checkAndDeductCredits.
 *     The underlying Prisma transaction would have rolled back, so no
 *     deduction actually persists in the DB in practice — BUT the
 *     orchestrator treats this as `recoverable: true` and refunds
 *     defensively against the edge case where the commit ACK was lost
 *     over the wire (Postgres committed, client saw an error).
 *     In the rare reverse case (deduction genuinely rolled back AND the
 *     defensive refund fires anyway), the user nets +amount credits —
 *     accepted cost vs. silent billing bugs in the commit-lost direction.
 *
 * Returns `{ success: true, balanceAfter }` only when the deduction has
 * definitively committed.
 */
export async function reserveCredits(
  params: ReserveCreditsParams
): Promise<ReserveCreditsResult> {
  const { userId, amount } = params;
  const t0 = Date.now();

  let result: Awaited<ReturnType<typeof checkAndDeductCredits>>;
  try {
    result = await checkAndDeductCredits(userId, amount);
  } catch (cause) {
    // checkAndDeductCredits catches its own errors internally, so a throw
    // here means something upstream of the try/catch (Prisma init, etc.).
    throw new CreditDeductionError(
      "credit deduction threw before returning a result",
      {
        cause,
        context: { userId, amount },
      }
    );
  }

  if (!result.success) {
    if (result.error === "Not enough credits") {
      // Best-effort balance fetch for the error context. A failed fetch
      // must not shadow the real (insufficient-credits) error.
      const ctx: Record<string, unknown> = { userId, amount };
      try {
        const bal = await getUserCredits(userId);
        if (bal.success) ctx.available = bal.credits;
      } catch {
        // swallow — context is decorative, the error is the main signal
      }
      throw new InsufficientCreditsError(
        `user has insufficient credits (need ${amount})`,
        { context: ctx }
      );
    }

    // Any other error — deduction may or may not have committed (see
    // JSDoc above). Orchestrator refunds defensively (recoverable=true).
    throw new CreditDeductionError(
      `credit deduction failed: ${result.error ?? "unknown"}`,
      {
        context: {
          userId,
          amount,
          dbError: result.error,
        },
      }
    );
  }

  // success path — defensive: ensure we actually got a credits number back.
  if (typeof result.credits !== "number") {
    throw new CreditDeductionError(
      "credit deduction returned success but no credits field",
      {
        context: { userId, amount },
      }
    );
  }

  const durationMs = Date.now() - t0;
  logger.info("reserveCredits ok", {
    userId,
    amount,
    balanceAfter: result.credits,
    durationMs,
  });

  return { success: true, balanceAfter: result.credits };
}

// ─── refundReservedCredits (catch-path utility) ──────────────────────────

/**
 * Return `amount` credits to the user's balance, tagged with `reason`
 * for audit. Used in the orchestrator's catch block when a pipeline
 * step fails AFTER credits were deducted (recoverable=true error class).
 *
 * NEVER throws — refund failure is logged and swallowed so the original
 * pipeline error surfaces to the caller intact. A refund that fails
 * (rare — DB outage) is a follow-up problem, not a reason to mask the
 * root cause.
 *
 * Uses `addCredits(..., "REFUND", "pipeline: <reason>")` rather than
 * the existing `refundCredits` helper so the `reason` tag persists in
 * `credit_transactions.description` — queryable from the DB for ops
 * (e.g. "how many runware-failure refunds this week?").
 */
export async function refundReservedCredits(
  params: RefundReservedCreditsParams
): Promise<void> {
  const { userId, amount, reason } = params;
  const t0 = Date.now();

  let result: Awaited<ReturnType<typeof addCredits>>;
  try {
    result = await addCredits(userId, amount, "REFUND", `pipeline: ${reason}`);
  } catch (cause) {
    logger.error("refundReservedCredits failed (db threw)", {
      userId,
      amount,
      reason,
      cause,
    });
    return;
  }

  if (!result.success) {
    logger.error("refundReservedCredits failed (db returned success: false)", {
      userId,
      amount,
      reason,
    });
    return;
  }

  logger.info("refundReservedCredits ok", {
    userId,
    amount,
    reason,
    balanceAfter: result.credits,
    durationMs: Date.now() - t0,
  });
}
