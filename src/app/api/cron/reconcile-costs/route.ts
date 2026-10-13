// =============================================================================
// CRON — reconcile provider costs + settle refunds that couldn't be written
// =============================================================================
// 1. Runware: snapshot the account's cumulative usage counter and compare the
//    delta since the last snapshot with what provider_calls logged for the
//    same window. The gap is spend we didn't see (failed attempts, logging
//    outages, scripts) — shown in the admin panel.
// 2. FAILED operations whose refund didn't land (DB error at the time):
//    refund what's still due. The refund is a conditional UPDATE, so running
//    this twice can never pay anyone twice.
// 3. Operations stuck RUNNING >15 min with no generation saved around that
//    time (the platform killed the function) are failed and refunded; ones
//    that delivered something are left alone.
// 4. Partial refunds that couldn't be written are settled once.
// =============================================================================

import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { prismaStore, SETTLE_PENDING_SQL, STALE_RUNNING_SQL } from "@/lib/billing/store";
import { fetchRunwareAccount } from "@/lib/billing/runware-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};

  // Each step runs on its own: a failing snapshot must never stop refunds
  // ── 1. Runware reconciliation ────────────────────────────────────────────
  try {
    const account = await fetchRunwareAccount();
    if (account) {
      const last = await prisma.costReconciliation.findFirst({ where: { provider: "runware" }, orderBy: { checkedAt: "desc" } });
      const now = new Date();
      let reportedDelta: number | null = null, loggedDelta: number | null = null;
      if (last) {
        reportedDelta = account.totalUsd - last.reportedTotalUsd;
        const [row] = await prisma.$queryRawUnsafe<{ s: number }[]>(
          `SELECT coalesce(sum(coalesce(cost_usd, est_cost_usd)), 0)::float AS s FROM provider_calls
           WHERE provider = 'runware' AND created_at > $1 AND created_at <= $2`, last.checkedAt, now);
        loggedDelta = row?.s ?? 0;
      }
      const rec = await prisma.costReconciliation.create({
        data: {
          provider: "runware", checkedAt: now, reportedTotalUsd: account.totalUsd,
          reportedDeltaUsd: reportedDelta, loggedDeltaUsd: loggedDelta,
          gapUsd: reportedDelta !== null && loggedDelta !== null ? reportedDelta - loggedDelta : null,
          sinceAt: last?.checkedAt ?? null,
          note: last ? null : "first snapshot",
        },
      });
      out.runware = { balance: account.balance, reportedDelta, loggedDelta, gap: rec.gapUsd };
    } else {
      out.runware = "unavailable";
    }
  } catch (err) {
    console.error("[reconcile] runware step failed:", err);
    out.runware = "error";
  }

  const store = prismaStore();

  // ── 2. Stuck RUNNING operations with nothing delivered → FAILED (refunded in step 3)
  try {
    const stale = await prisma.$queryRawUnsafe<{ id: string }[]>(STALE_RUNNING_SQL);
    out.stuckMarkedFailed = stale.length;
  } catch (err) {
    console.error("[reconcile] stale step failed:", err);
    out.stuckMarkedFailed = "error";
  }

  // ── 3. Refunds still due on failed operations (idempotent) ────────────────
  try {
    const due = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM operations WHERE status = 'FAILED' AND credits_refunded < credits_charged ORDER BY created_at LIMIT 50`);
    let settled = 0;
    for (const { id } of due) {
      try { settled += await store.refund(id, null, "reconcile"); } catch (err) { console.error("[reconcile] refund failed", id, err); }
    }
    out.refundsSettled = { operations: due.length, credits: settled };
  } catch (err) {
    console.error("[reconcile] refund step failed:", err);
    out.refundsSettled = "error";
  }

  // ── 4. Partial refunds that couldn't be written at the time ───────────────
  try {
    const pending = await prisma.$queryRawUnsafe<{ id: string }[]>(
      `SELECT id FROM operations WHERE status = 'PARTIAL' AND error_code LIKE 'refund_pending:%' LIMIT 50`);
    let credits = 0;
    for (const { id } of pending) {
      try {
        credits += await prisma.$transaction(async (tx) => {
          const [r] = await tx.$queryRawUnsafe<{ due: number; user_id: string }[]>(SETTLE_PENDING_SQL, id);
          if (!r || r.due <= 0) return 0;
          await tx.user.update({ where: { id: r.user_id }, data: { credits: { increment: r.due } } });
          await tx.creditTransaction.create({ data: { userId: r.user_id, amount: r.due, type: "REFUND", description: `Refund (pending partial) · op:${id}` } });
          return r.due;
        });
      } catch (err) { console.error("[reconcile] pending partial failed", id, err); }
    }
    out.partialSettled = { operations: pending.length, credits };
  } catch (err) {
    console.error("[reconcile] partial step failed:", err);
    out.partialSettled = "error";
  }

  console.log("[reconcile-costs]", JSON.stringify(out));
  return NextResponse.json({ success: true, ...out });
}
