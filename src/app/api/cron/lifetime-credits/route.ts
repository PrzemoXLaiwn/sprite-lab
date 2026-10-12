import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { LIFETIME_DEALS, type LifetimeDealName } from "@/lib/stripe";

// Vercel Cron Job - Monthly credits for lifetime deal holders
// Runs every day at 03:00 UTC; each user is granted at most once per calendar
// month (UTC). Schedule in vercel.json: "0 3 * * *"
//
// LIFETIME_DEALS promise `credits` per month forever. The purchase itself
// grants the purchase month's credits (fulfillLifetimeDeal), so that month is
// skipped here. Idempotency: the grant's CreditTransaction uses the unique
// stripeInvoiceId column with key `lifetime:${userId}:${YYYY-MM}`; a P2002 on
// insert means the month was already granted and rolls back the increment.

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

const BATCH_SIZE = 100;

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function resolveDeal(lifetimeDeal: string | null, plan: string): LifetimeDealName | null {
  if (lifetimeDeal && lifetimeDeal in LIFETIME_DEALS) {
    return lifetimeDeal as LifetimeDealName;
  }
  // Rows created before lifetimeDeal existed are matched by plan.
  return (
    (Object.keys(LIFETIME_DEALS) as LifetimeDealName[]).find(
      (key) => LIFETIME_DEALS[key].basePlan === plan
    ) ?? null
  );
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = monthKey(new Date());
  const counts = {
    month,
    processed: 0,
    granted: 0,
    creditsGranted: 0,
    alreadyGranted: 0,
    skippedPurchaseMonth: 0,
    skippedUnknownDeal: 0,
    errors: 0,
  };

  let cursor: string | undefined;

  try {
    for (;;) {
      const users = await prisma.user.findMany({
        where: { isLifetime: true },
        select: { id: true, lifetimeDeal: true, plan: true },
        orderBy: { id: "asc" },
        take: BATCH_SIZE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (users.length === 0) break;
      cursor = users[users.length - 1].id;

      const userIds = users.map((u) => u.id);

      // Grants already recorded for this month (cheap pre-filter; the unique
      // constraint is still the real guard).
      const existing = await prisma.creditTransaction.findMany({
        where: { stripeInvoiceId: { in: userIds.map((id) => `lifetime:${id}:${month}`) } },
        select: { userId: true },
      });
      const alreadyGranted = new Set(existing.map((t) => t.userId));

      // Latest lifetime purchase per user — its month was paid by the purchase.
      const purchases = await prisma.creditTransaction.findMany({
        where: {
          userId: { in: userIds },
          stripePaymentIntentId: { not: null },
          description: { startsWith: "Lifetime deal" },
        },
        select: { userId: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      const purchaseMonth = new Map<string, string>();
      for (const p of purchases) {
        if (!purchaseMonth.has(p.userId)) purchaseMonth.set(p.userId, monthKey(p.createdAt));
      }

      for (const user of users) {
        counts.processed++;

        if (alreadyGranted.has(user.id)) {
          counts.alreadyGranted++;
          continue;
        }
        if (purchaseMonth.get(user.id) === month) {
          counts.skippedPurchaseMonth++;
          continue;
        }

        const dealKey = resolveDeal(user.lifetimeDeal, user.plan);
        if (!dealKey) {
          counts.skippedUnknownDeal++;
          console.warn(`[CRON lifetime-credits] No lifetime deal for user ${user.id} (deal=${user.lifetimeDeal}, plan=${user.plan})`);
          continue;
        }
        const credits = LIFETIME_DEALS[dealKey].credits;

        try {
          await prisma.$transaction([
            prisma.creditTransaction.create({
              data: {
                userId: user.id,
                amount: credits,
                type: "BONUS",
                description: `Lifetime monthly credits (${month})`,
                stripeInvoiceId: `lifetime:${user.id}:${month}`,
              },
            }),
            prisma.user.update({
              where: { id: user.id },
              data: { credits: { increment: credits } },
            }),
          ]);
          counts.granted++;
          counts.creditsGranted += credits;
        } catch (err) {
          if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
            counts.alreadyGranted++;
          } else {
            counts.errors++;
            console.error(`[CRON lifetime-credits] Failed to grant credits to user ${user.id}:`, err);
          }
        }
      }

      if (users.length < BATCH_SIZE) break;
    }
  } catch (error) {
    console.error("[CRON lifetime-credits] Fatal error:", error);
    return NextResponse.json({ success: false, error: "Cron failed", ...counts }, { status: 500 });
  }

  console.log("[CRON lifetime-credits] Done:", counts);
  return NextResponse.json({ success: true, ...counts });
}
