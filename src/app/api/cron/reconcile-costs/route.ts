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
// 3. Operations stuck in RUNNING for >30 min are only reported, never
//    auto-refunded: the user may well have received the result.
// =============================================================================

import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { prismaStore } from "@/lib/billing/store";
import { fetchRunwareAccount } from "@/lib/billing/runware-usage";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const out: Record<string, unknown> = {};

  // ── 1. Runware reconciliation ────────────────────────────────────────────
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

  // ── 2. Refunds still due on failed operations ────────────────────────────
  const due = await prisma.$queryRawUnsafe<{ id: string }[]>(
    `SELECT id FROM operations WHERE status = 'FAILED' AND credits_refunded < credits_charged ORDER BY created_at LIMIT 50`);
  const store = prismaStore();
  let settled = 0;
  for (const { id } of due) {
    try { settled += await store.refund(id, null, "reconcile"); } catch (err) { console.error("[reconcile] refund failed", id, err); }
  }
  out.refundsSettled = { operations: due.length, credits: settled };

  // ── 3. Stuck operations (report only) ────────────────────────────────────
  const [stuck] = await prisma.$queryRawUnsafe<{ n: number }[]>(
    `SELECT count(*)::int AS n FROM operations WHERE status = 'RUNNING' AND created_at < now() - interval '30 minutes'`);
  out.stuckRunning = stuck?.n ?? 0;

  console.log("[reconcile-costs]", JSON.stringify(out));
  return NextResponse.json({ success: true, ...out });
}
