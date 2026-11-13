import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getStripe, getPlanByPriceId, LIFETIME_DEALS } from "@/lib/stripe";
import { getSubscriptionPeriodEnd } from "@/app/api/stripe/_lib/fulfillment";
import { billingPatchForSubscription, planAfterSubscriptionEnded } from "@/lib/billing/subscription-sync";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Re-read every stored subscription from Stripe and write plan, period end
 * and cancel_at_period_end. Never touches credits. Dry-run unless apply=true.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const apply = body?.apply === true;
  const stripe = getStripe();

  const users = await prisma.user.findMany({
    where: { stripeSubscriptionId: { not: null } },
    select: {
      id: true,
      plan: true,
      isLifetime: true,
      lifetimeDeal: true,
      stripeSubscriptionId: true,
      stripePriceId: true,
      stripeCurrentPeriodEnd: true,
      cancelAtPeriodEnd: true,
    },
  });

  const report = { checked: users.length, apply, updated: 0, missing: 0, unchanged: 0, errors: 0 };

  for (const row of users) {
    const subscriptionId = row.stripeSubscriptionId;
    if (!subscriptionId) continue;
    let subscription: Stripe.Subscription | null = null;
    let missing = false;
    try {
      subscription = await stripe.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      if (error instanceof Stripe.errors.StripeInvalidRequestError && error.code === "resource_missing") {
        missing = true;
      } else {
        report.errors += 1;
        console.error("[sync-subscriptions]", subscriptionId, error instanceof Error ? error.message : "unknown");
        continue;
      }
    }

    const lifetimePlan = row.isLifetime
      ? LIFETIME_DEALS[(row.lifetimeDeal ?? "") as keyof typeof LIFETIME_DEALS]?.basePlan ?? null
      : null;

    if (missing || !subscription) {
      const plan = planAfterSubscriptionEnded({ isLifetime: row.isLifetime, lifetimePlan, plan: row.plan });
      const changed = row.plan !== plan || row.cancelAtPeriodEnd || row.stripeSubscriptionId !== null;
      if (!changed) { report.unchanged += 1; continue; }
      report.missing += 1;
      if (apply) {
        await prisma.user.update({
          where: { id: row.id },
          data: {
            plan,
            cancelAtPeriodEnd: false,
            stripeSubscriptionId: null,
            stripePriceId: null,
            stripeCurrentPeriodEnd: null,
          },
        });
      }
      continue;
    }

    const priceId = subscription.items.data[0]?.price.id ?? null;
    const patch = billingPatchForSubscription({
      id: subscription.id,
      status: subscription.status,
      cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
      priceId,
      planName: priceId ? getPlanByPriceId(priceId) : null,
      periodEnd: getSubscriptionPeriodEnd(subscription),
    });
    const nextPlan = patch.ended
      ? planAfterSubscriptionEnded({ isLifetime: row.isLifetime, lifetimePlan, plan: row.plan })
      : patch.plan ?? row.plan;
    const nextPeriod = patch.stripeCurrentPeriodEnd?.getTime() ?? null;
    const currentPeriod = row.stripeCurrentPeriodEnd?.getTime() ?? null;
    const changed = row.cancelAtPeriodEnd !== patch.cancelAtPeriodEnd
      || row.plan !== nextPlan
      || currentPeriod !== nextPeriod
      || (patch.ended && row.stripeSubscriptionId !== null);
    if (!changed) { report.unchanged += 1; continue; }
    report.updated += 1;
    if (!apply) continue;
    if (patch.ended) {
      await prisma.user.update({
        where: { id: row.id },
        data: {
          plan: nextPlan,
          cancelAtPeriodEnd: false,
          stripeSubscriptionId: null,
          stripePriceId: null,
          stripeCurrentPeriodEnd: null,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: row.id },
        data: {
          ...(patch.plan ? { plan: patch.plan } : {}),
          cancelAtPeriodEnd: patch.cancelAtPeriodEnd,
          stripeCurrentPeriodEnd: patch.stripeCurrentPeriodEnd,
          ...(patch.stripePriceId ? { stripePriceId: patch.stripePriceId } : {}),
        },
      });
    }
  }

  return NextResponse.json(report);
}
