import Stripe from "stripe";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  stripe,
  getCreditsForPlan,
  LIFETIME_DEALS,
  LifetimeDealName,
  PlanName,
} from "@/lib/stripe";

// =============================================================================
// Shared Stripe fulfillment logic
// =============================================================================
// Used by the client-confirm routes (confirm-*) AND the webhook, so that the
// same payment can arrive through either path (or both, concurrently) and is
// only ever applied once.
//
// IDEMPOTENCY MODEL
//   - One-off purchases (credit packs, lifetime deals) are keyed on the
//     PaymentIntent id: CreditTransaction.stripePaymentIntentId is @unique and
//     the row is created in the SAME transaction as the credit increment.
//   - Subscription credits are keyed on the invoice id:
//     CreditTransaction.stripeInvoiceId is @unique, same pattern.
//   A Prisma P2002 (unique violation) therefore means "already applied".
//
// SUBSCRIPTION CREDIT SOURCE OF TRUTH
//   Monthly credits are granted exactly once per PAID INVOICE whose
//   billing_reason is subscription_create or subscription_cycle — see
//   grantSubscriptionInvoiceCredits(). The invoice.payment_succeeded webhook is
//   the canonical caller; confirm-subscription also calls it for the initial
//   invoice so credits appear instantly. Whichever commits first wins, the
//   other is a no-op. checkout.session.completed NEVER grants credits — it
//   only links the subscription to the user.
// =============================================================================

export function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

/** Normalise a Stripe expandable field to its id. */
export function stripeId(
  value: string | { id: string } | null | undefined
): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

// Subscription states in which the user is (still) a paying subscriber.
const ACTIVE_SUBSCRIPTION_STATUSES: ReadonlyArray<Stripe.Subscription.Status> = [
  "active",
  "trialing",
  "past_due",
];

export function isActiveSubscriptionStatus(status: Stripe.Subscription.Status): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

/**
 * True when the stored subscription id points at a live Stripe subscription.
 * A stale id (deleted in Stripe) counts as "no active subscription".
 */
export async function hasActiveSubscription(
  stripeSubscriptionId: string | null | undefined
): Promise<boolean> {
  if (!stripeSubscriptionId) return false;
  try {
    const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
    return isActiveSubscriptionStatus(subscription.status);
  } catch (error) {
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return false;
    }
    throw error;
  }
}

/**
 * Period end of a subscription. Since API 2025-03-31 (we pin 2025-11-17.clover)
 * current_period_end lives on each SubscriptionItem, not on the Subscription.
 */
export function getSubscriptionPeriodEnd(subscription: Stripe.Subscription): Date | null {
  const ends = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((v): v is number => typeof v === "number" && v > 0);
  if (ends.length === 0) return null;
  return new Date(Math.max(...ends) * 1000);
}

/**
 * Subscription id of an invoice. Since API 2025-03-31 `invoice.subscription`
 * was removed in favour of `invoice.parent.subscription_details.subscription`.
 */
export function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  return stripeId(invoice.parent?.subscription_details?.subscription ?? null);
}

// =============================================================================
// REFERRAL REWARD
// =============================================================================
export const REFERRAL_REWARD_CREDITS = 10;

/**
 * Pay the referrer of `userId` once, on that user's first paid purchase.
 * The conditional updateMany (referralRewardClaimed=false → true) makes the
 * claim atomic: concurrent purchases can't both pay out.
 * Never throws — a referral failure must not fail the purchase.
 */
export async function processReferralReward(userId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { referredBy: true, referralRewardClaimed: true },
      });

      if (!user?.referredBy || user.referralRewardClaimed) {
        return;
      }

      const claimed = await tx.user.updateMany({
        where: { id: userId, referralRewardClaimed: false },
        data: { referralRewardClaimed: true },
      });
      if (claimed.count !== 1) {
        return; // Another request claimed it first
      }

      await tx.user.update({
        where: { id: user.referredBy },
        data: {
          credits: { increment: REFERRAL_REWARD_CREDITS },
          referralEarnings: { increment: REFERRAL_REWARD_CREDITS },
        },
      });

      await tx.creditTransaction.create({
        data: {
          userId: user.referredBy,
          amount: REFERRAL_REWARD_CREDITS,
          type: "BONUS",
          description: `Referral reward - your friend made their first purchase!`,
        },
      });

      await tx.notification.create({
        data: {
          userId: user.referredBy,
          type: "REFERRAL_REWARD",
          title: "Referral Reward! +10 Credits",
          message: `Your friend just made their first purchase! You earned ${REFERRAL_REWARD_CREDITS} bonus credits. Keep sharing your referral link!`,
          data: JSON.stringify({ credits: REFERRAL_REWARD_CREDITS, referredUserId: userId }),
        },
      });

      console.log(`Referral reward: ${REFERRAL_REWARD_CREDITS} credits added to referrer ${user.referredBy}`);
    });
  } catch (error) {
    console.error("Error processing referral reward:", error);
  }
}

// =============================================================================
// SUBSCRIPTION CREDITS (per paid invoice)
// =============================================================================

/**
 * Grant a plan's monthly credits for one paid invoice. Returns false when the
 * invoice was already credited (by the webhook or confirm-subscription).
 */
export async function grantSubscriptionInvoiceCredits(params: {
  userId: string;
  invoiceId: string;
  planName: PlanName;
  amountPaid: number; // major units (GBP)
  description: string;
}): Promise<boolean> {
  const { userId, invoiceId, planName, amountPaid, description } = params;
  const credits = getCreditsForPlan(planName);

  try {
    await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: "PURCHASE",
          description,
          moneyAmount: amountPaid,
          stripeInvoiceId: invoiceId,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: credits },
          totalSpent: { increment: amountPaid },
        },
      }),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      console.log(`Invoice ${invoiceId} already credited — skipping`);
      return false;
    }
    throw error;
  }

  console.log(`Added ${credits} credits to user ${userId} for invoice ${invoiceId} (${planName})`);

  if (amountPaid > 0) {
    await processReferralReward(userId);
  }
  return true;
}

// =============================================================================
// ONE-OFF PURCHASES (credit packs / lifetime deals)
// =============================================================================

/**
 * Credit a one-off payment exactly once (keyed on the PaymentIntent id).
 * Returns null when the PaymentIntent was already credited.
 */
export async function grantOneTimeCredits(params: {
  userId: string;
  paymentIntentId: string;
  credits: number;
  moneyAmount: number; // major units (GBP)
  description: string;
}): Promise<{ totalCredits: number } | null> {
  const { userId, paymentIntentId, credits, moneyAmount, description } = params;

  let totalCredits: number;
  try {
    const [, updatedUser] = await prisma.$transaction([
      prisma.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: "PURCHASE",
          description,
          moneyAmount,
          stripePaymentIntentId: paymentIntentId,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          credits: { increment: credits },
          totalSpent: { increment: moneyAmount },
        },
        select: { credits: true },
      }),
    ]);
    totalCredits = updatedUser.credits;
  } catch (error) {
    if (isUniqueViolation(error)) return null;
    throw error;
  }

  if (moneyAmount > 0) {
    await processReferralReward(userId);
  }
  return { totalCredits };
}

export type OneTimeFulfillmentResult =
  | { status: "credited"; kind: "credit_pack" | "lifetime_deal"; credits: number; totalCredits: number; plan?: string }
  | { status: "already_processed"; kind: "credit_pack" | "lifetime_deal"; credits: number; plan?: string }
  | { status: "sold_out"; message: string; refundInitiated: boolean }
  | { status: "already_lifetime"; refundInitiated: boolean }
  | { status: "forbidden" }
  | { status: "not_paid" }
  | { status: "ignored"; reason: string };

export const TOTAL_LIFETIME_SLOTS = Object.values(LIFETIME_DEALS).reduce((sum, d) => sum + d.maxSlots, 0);

/**
 * Lifetime slots sold per deal (read-only, for display / pre-checks). Users
 * are attributed by `lifetimeDeal`; rows from before that column existed fall
 * back to matching the deal's basePlan. The authoritative check happens
 * inside the purchase transaction (fulfillLifetimeDeal).
 */
export async function getLifetimeSlotsSold(): Promise<{
  perDeal: Record<LifetimeDealName, number>;
  total: number;
}> {
  const rows = await prisma.user.groupBy({
    by: ["lifetimeDeal", "plan"],
    where: { isLifetime: true },
    _count: { _all: true },
  });

  const perDeal = Object.fromEntries(
    Object.keys(LIFETIME_DEALS).map((key) => [key, 0])
  ) as Record<LifetimeDealName, number>;
  let total = 0;

  for (const row of rows) {
    total += row._count._all;
    const dealKey =
      row.lifetimeDeal && row.lifetimeDeal in LIFETIME_DEALS
        ? (row.lifetimeDeal as LifetimeDealName)
        : (Object.keys(LIFETIME_DEALS) as LifetimeDealName[]).find(
            (key) => !row.lifetimeDeal && LIFETIME_DEALS[key].basePlan === row.plan
          );
    if (dealKey) perDeal[dealKey] += row._count._all;
  }

  return { perDeal, total };
}

// Arbitrary constant key for pg_advisory_xact_lock — serialises lifetime slot
// allocation. The lock is released automatically at commit/rollback.
const LIFETIME_SLOT_LOCK_KEY = 784211903;

class LifetimeRejected extends Error {
  constructor(
    public readonly reason: "sold_out" | "already_lifetime",
    message: string
  ) {
    super(message);
  }
}

async function refundPaymentIntent(paymentIntentId: string): Promise<boolean> {
  try {
    await stripe.refunds.create(
      { payment_intent: paymentIntentId, reason: "requested_by_customer" },
      { idempotencyKey: `auto-refund-${paymentIntentId}` }
    );
    console.log(`Refund initiated for ${paymentIntentId}`);
    return true;
  } catch (error) {
    console.error(`Failed to auto-refund ${paymentIntentId}:`, error);
    return false;
  }
}

/**
 * Apply a succeeded credit-pack / lifetime-deal PaymentIntent. Safe to call any
 * number of times from confirm-* routes and the payment_intent.succeeded
 * webhook. `expectedUserId` enforces ownership for client-initiated calls.
 */
export async function fulfillOneTimePayment(
  paymentIntentId: string,
  opts: { expectedUserId?: string } = {}
): Promise<OneTimeFulfillmentResult> {
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
    expand: ["latest_charge"],
  });

  const userId = paymentIntent.metadata?.userId;
  if (opts.expectedUserId && userId !== opts.expectedUserId) {
    return { status: "forbidden" };
  }
  if (paymentIntent.status !== "succeeded") {
    return { status: "not_paid" };
  }
  if (!userId) {
    return { status: "ignored", reason: "no userId metadata" };
  }

  const type = paymentIntent.metadata.type;
  if (type !== "credit_pack" && type !== "lifetime_deal") {
    return { status: "ignored", reason: `not a one-off purchase (type=${type ?? "none"})` };
  }

  const charge = typeof paymentIntent.latest_charge === "object" ? paymentIntent.latest_charge : null;
  if (charge && (charge.amount_refunded > 0 || charge.disputed)) {
    return { status: "ignored", reason: "payment refunded or disputed" };
  }

  const credits = parseInt(paymentIntent.metadata.credits ?? "", 10);
  if (!Number.isInteger(credits) || credits <= 0) {
    return { status: "ignored", reason: "invalid credits metadata" };
  }

  const moneyAmount = (paymentIntent.amount_received || paymentIntent.amount) / 100;

  // Purchases credited before stripePaymentIntentId existed only recorded the
  // PI id in the description. Those rows already exist, so this read is not
  // racy; new rows are protected by the unique constraint.
  const legacy = await prisma.creditTransaction.findFirst({
    where: {
      userId,
      type: "PURCHASE",
      stripePaymentIntentId: null,
      description: { contains: paymentIntent.id },
    },
    select: { id: true },
  });
  if (legacy) {
    return { status: "already_processed", kind: type, credits };
  }

  if (type === "credit_pack") {
    const packName = paymentIntent.metadata.pack;
    const result = await grantOneTimeCredits({
      userId,
      paymentIntentId: paymentIntent.id,
      credits,
      moneyAmount,
      description: `Credit pack: ${packName} (${credits} credits) - ${paymentIntent.id}`,
    });
    if (!result) {
      return { status: "already_processed", kind: "credit_pack", credits };
    }
    console.log(`Credits added for user ${userId}: +${credits} credits (${packName})`);
    return { status: "credited", kind: "credit_pack", credits, totalCredits: result.totalCredits };
  }

  return fulfillLifetimeDeal(paymentIntent, userId, credits, moneyAmount);
}

async function fulfillLifetimeDeal(
  paymentIntent: Stripe.PaymentIntent,
  userId: string,
  credits: number,
  moneyAmount: number
): Promise<OneTimeFulfillmentResult> {
  const dealKey = paymentIntent.metadata.deal as LifetimeDealName;
  const deal = LIFETIME_DEALS[dealKey];
  if (!deal) {
    return { status: "ignored", reason: `unknown lifetime deal ${dealKey}` };
  }

  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      // Idempotency first: a duplicate PaymentIntent aborts with P2002.
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: credits,
          type: "PURCHASE",
          description: `Lifetime deal: ${dealKey} (${credits} credits/month forever) - ${paymentIntent.id}`,
          moneyAmount,
          stripePaymentIntentId: paymentIntent.id,
        },
      });

      // Serialise slot allocation so two buyers can't take the last slot.
      // Constant SQL (no user input).
      await tx.$executeRawUnsafe(`SELECT pg_advisory_xact_lock(${LIFETIME_SLOT_LOCK_KEY})`);

      const current = await tx.user.findUnique({
        where: { id: userId },
        select: { isLifetime: true, plan: true },
      });
      if (!current) {
        throw new Error(`User ${userId} not found for lifetime purchase`);
      }
      if (current.isLifetime) {
        throw new LifetimeRejected("already_lifetime", "You already have a lifetime plan!");
      }

      // Rows created before lifetimeDeal existed are matched by plan.
      const dealSold = await tx.user.count({
        where: {
          isLifetime: true,
          OR: [
            { lifetimeDeal: dealKey },
            { lifetimeDeal: null, plan: deal.basePlan },
          ],
        },
      });
      if (dealSold >= deal.maxSlots) {
        throw new LifetimeRejected(
          "sold_out",
          `Sorry! ${deal.name} sold out while processing your payment. A refund has been initiated.`
        );
      }

      const totalSold = await tx.user.count({ where: { isLifetime: true } });
      if (totalSold >= TOTAL_LIFETIME_SLOTS) {
        throw new LifetimeRejected(
          "sold_out",
          `All ${TOTAL_LIFETIME_SLOTS} lifetime spots have been claimed! A refund has been initiated.`
        );
      }

      // Never downgrade an active subscriber (e.g. Studio subscriber buying
      // Starter Lifetime keeps Studio until that subscription ends; the
      // cancellation handler then falls back to the lifetime plan).
      const rank: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, UNLIMITED: 3 };
      const plan = (rank[current.plan] ?? 0) > (rank[deal.basePlan] ?? 0) ? current.plan : deal.basePlan;

      return tx.user.update({
        where: { id: userId },
        data: {
          plan,
          isLifetime: true,
          lifetimeDeal: dealKey,
          credits: { increment: credits },
          totalSpent: { increment: moneyAmount },
        },
        select: { credits: true },
      });
    });

    console.log(`Lifetime deal activated for user ${userId}: ${dealKey} (${deal.basePlan}, ${credits} credits/month)`);

    if (moneyAmount > 0) {
      await processReferralReward(userId);
    }

    return {
      status: "credited",
      kind: "lifetime_deal",
      credits,
      totalCredits: updatedUser.credits,
      plan: deal.basePlan,
    };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { status: "already_processed", kind: "lifetime_deal", credits, plan: deal.basePlan };
    }
    if (error instanceof LifetimeRejected) {
      console.error(`Lifetime purchase rejected (${error.reason}) for ${paymentIntent.id} — refunding`);
      const refundInitiated = await refundPaymentIntent(paymentIntent.id);
      if (error.reason === "sold_out") {
        return { status: "sold_out", message: error.message, refundInitiated };
      }
      return { status: "already_lifetime", refundInitiated };
    }
    throw error;
  }
}

// =============================================================================
// REFUNDS / DISPUTES — claw back granted credits
// =============================================================================

/**
 * Reverse credits granted by a payment. `refundedFraction` is cumulative
 * (charge.amount_refunded / charge.amount, or 1 for full refunds/disputes), so
 * repeated events only reverse the difference. The balance never goes below 0.
 * Any (partial or full) reversal of a lifetime deal revokes lifetime status.
 */
export async function reversePaymentCredits(params: {
  paymentIntentId: string;
  refundedFraction: number;
  reason: "refund" | "dispute";
}): Promise<void> {
  const { paymentIntentId, reason } = params;
  const fraction = Math.min(1, Math.max(0, params.refundedFraction));

  // One-off purchases are keyed by PaymentIntent; subscription invoices by invoice id.
  let purchase = await prisma.creditTransaction.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    select: { id: true },
  });

  if (!purchase) {
    const invoicePayments = await stripe.invoicePayments.list({
      payment: { type: "payment_intent", payment_intent: paymentIntentId },
      limit: 1,
    });
    const invoiceId = stripeId(invoicePayments.data[0]?.invoice ?? null);
    if (invoiceId) {
      purchase = await prisma.creditTransaction.findUnique({
        where: { stripeInvoiceId: invoiceId },
        select: { id: true },
      });
    }
  }

  if (!purchase) {
    console.log(`No credited purchase found for ${paymentIntentId} — nothing to reverse`);
    return;
  }

  // Any refund/dispute on a lifetime purchase revokes lifetime status —
  // otherwise a 99% refund would keep "credits forever" for 1% of the price.
  let revokeLifetime = false;
  if (fraction > 0) {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    revokeLifetime = paymentIntent.metadata?.type === "lifetime_deal";
  }

  const purchaseId = purchase.id;

  await prisma.$transaction(async (tx) => {
    const original = await tx.creditTransaction.findUnique({ where: { id: purchaseId } });
    if (!original) return;

    const target = fraction >= 1 ? original.amount : Math.floor(original.amount * fraction);
    const delta = target - original.creditsReversed;

    if (delta > 0) {
      // Optimistic concurrency: only one concurrent reversal can move the counter.
      const moved = await tx.creditTransaction.updateMany({
        where: { id: original.id, creditsReversed: original.creditsReversed },
        data: { creditsReversed: target },
      });
      if (moved.count !== 1) {
        throw new Error(`Concurrent reversal on ${original.id} — retry`);
      }

      await tx.$executeRaw`UPDATE "users" SET "credits" = GREATEST("credits" - ${delta}, 0) WHERE "id" = ${original.userId}`;

      await tx.creditTransaction.create({
        data: {
          userId: original.userId,
          amount: -delta,
          type: "REFUND",
          description: `${reason === "dispute" ? "Payment disputed" : "Payment refunded"} - ${delta} credits reversed (${paymentIntentId})`,
        },
      });
    }

    if (revokeLifetime) {
      const user = await tx.user.findUnique({
        where: { id: original.userId },
        select: { isLifetime: true, stripeSubscriptionId: true },
      });
      if (user?.isLifetime) {
        await tx.user.update({
          where: { id: original.userId },
          data: {
            isLifetime: false,
            lifetimeDeal: null,
            ...(user.stripeSubscriptionId ? {} : { plan: "FREE" }),
          },
        });
      }
    }
  });

  console.log(`Reversed credits for ${paymentIntentId} (${reason}, fraction=${fraction})`);
}
