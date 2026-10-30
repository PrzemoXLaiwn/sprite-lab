import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, getPlanByPriceId, LIFETIME_DEALS } from "@/lib/stripe";
import {
  getSubscriptionPeriodEnd,
  isActiveSubscriptionStatus,
} from "@/app/api/stripe/_lib/fulfillment";
import {
  RETENTION_DISCOUNT_PERCENT,
  RETENTION_PAUSE_DAYS,
  isCancelReason,
  type CancelReason,
} from "@/config/retention";
import {
  billingStatus,
  billingStatusLabel,
  type BillingSubscriptionView,
} from "@/lib/billing/billing-view";
import {
  buildRetentionOffers,
  cancellationConsequences,
  lifetimeSpendGbp,
  monthlyPriceGbp,
  offerShownKey,
  offerWasShown,
  planDisplayName,
  priceIdForPlan,
  type RetentionOffer,
} from "@/lib/billing/retention";
import { activeSubscriptionPatch, endedSubscriptionPatch } from "@/lib/billing/subscription-state";

export class BillingError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
    this.name = "BillingError";
  }
}

const USER_SELECT = {
  id: true,
  plan: true,
  credits: true,
  isLifetime: true,
  lifetimeDeal: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  stripePriceId: true,
  stripeCurrentPeriodEnd: true,
  cancelAtPeriodEnd: true,
  billingPaused: true,
  subscriptionPauseResumesAt: true,
  retentionDiscountUsedAt: true,
  totalSpent: true,
} as const;

type BillingUser = {
  id: string;
  plan: string;
  credits: number;
  isLifetime: boolean;
  lifetimeDeal: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  stripePriceId: string | null;
  stripeCurrentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  billingPaused: boolean;
  subscriptionPauseResumesAt: Date | null;
  retentionDiscountUsedAt: Date | null;
  totalSpent: number;
};

async function loadUser(userId: string): Promise<BillingUser> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw new BillingError("Account not found.", 404);
  return user;
}

function lifetimeFallbackPlan(user: Pick<BillingUser, "isLifetime" | "lifetimeDeal" | "plan">): string {
  if (!user.isLifetime) return "FREE";
  const deal = LIFETIME_DEALS[(user.lifetimeDeal ?? "") as keyof typeof LIFETIME_DEALS];
  return deal?.basePlan ?? (user.plan === "FREE" ? "FREE" : "STARTER");
}

function isMissingSubscription(error: unknown): boolean {
  return (
    error instanceof Stripe.errors.StripeInvalidRequestError &&
    error.code === "resource_missing"
  );
}

async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["discounts.source.coupon"],
    });
  } catch (error) {
    if (isMissingSubscription(error)) return null;
    throw error;
  }
}

function couponOf(discount: Stripe.Discount | string): Stripe.Coupon | null {
  if (typeof discount === "string") return null;
  const coupon = discount.source?.coupon;
  if (!coupon || typeof coupon === "string") return null;
  return coupon;
}

function discountSummary(subscription: Stripe.Subscription): { percentOff: number | null; amountOffGbp: number | null } {
  let percentOff: number | null = null;
  let amountOffGbp: number | null = null;
  for (const entry of subscription.discounts) {
    const coupon = couponOf(entry);
    if (!coupon) continue;
    if (typeof coupon.percent_off === "number") {
      percentOff = Math.max(percentOff ?? 0, coupon.percent_off);
    }
    if (typeof coupon.amount_off === "number" && coupon.amount_off > 0) {
      amountOffGbp = (amountOffGbp ?? 0) + coupon.amount_off / 100;
    }
  }
  return { percentOff, amountOffGbp };
}

async function spendFor(user: BillingUser): Promise<number> {
  const agg = await prisma.creditTransaction.aggregate({
    where: { userId: user.id, type: "PURCHASE" },
    _sum: { moneyAmount: true },
  });
  return lifetimeSpendGbp(user.totalSpent, agg._sum.moneyAmount);
}

async function countsFor(userId: string): Promise<{ projectCount: number; generationCount: number }> {
  const [projectCount, generationCount] = await Promise.all([
    prisma.project.count({ where: { userId } }),
    prisma.generation.count({ where: { userId } }),
  ]);
  return { projectCount, generationCount };
}

function viewFrom(input: {
  user: BillingUser;
  subscription: Stripe.Subscription | null;
  projectCount: number;
  generationCount: number;
  /** Stripe could not be read. Trust the saved subscription id and flags. */
  stripeUnreachable?: boolean;
}): BillingSubscriptionView {
  const { user, subscription } = input;
  const live = subscription && isActiveSubscriptionStatus(subscription.status) ? subscription : null;
  const hasSavedSubscription = Boolean(user.stripeSubscriptionId) && input.stripeUnreachable === true;
  const periodEnd = live ? getSubscriptionPeriodEnd(live) : user.stripeCurrentPeriodEnd;
  const cancelAtPeriodEnd = live ? live.cancel_at_period_end === true : user.cancelAtPeriodEnd;
  const billingPaused = live ? live.pause_collection != null : user.billingPaused;
  const pauseResumesAt = live?.pause_collection?.resumes_at
    ? new Date(live.pause_collection.resumes_at * 1000)
    : user.subscriptionPauseResumesAt;
  const pastDue = live?.status === "past_due";
  const hasSubscription = Boolean(live) || hasSavedSubscription;
  const status = billingStatus({
    hasSubscription,
    isLifetime: user.isLifetime && !hasSubscription,
    cancelAtPeriodEnd: hasSubscription && cancelAtPeriodEnd,
    billingPaused: hasSubscription && billingPaused,
    pastDue: Boolean(pastDue),
  });
  const plan = hasSubscription || user.isLifetime ? user.plan : "FREE";
  const discounts = live ? discountSummary(live) : { percentOff: null, amountOffGbp: null };

  return {
    plan,
    planLabel: planDisplayName(plan),
    priceGbp: hasSubscription ? monthlyPriceGbp(user.plan) : null,
    status,
    statusLabel: billingStatusLabel(status, periodEnd, pauseResumesAt),
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
    cancelAtPeriodEnd: hasSubscription && cancelAtPeriodEnd,
    billingPaused: hasSubscription && billingPaused,
    credits: user.credits,
    projectCount: input.projectCount,
    generationCount: input.generationCount,
    isLifetime: user.isLifetime,
    canCancel: hasSubscription && !cancelAtPeriodEnd,
    canResume: hasSubscription && cancelAtPeriodEnd,
    canResumePause: hasSubscription && billingPaused && !cancelAtPeriodEnd,
    canOpenPortal: Boolean(user.stripeCustomerId),
    percentOff: discounts.percentOff,
    amountOffGbp: discounts.amountOffGbp,
    consequences: cancellationConsequences({
      plan: user.plan,
      credits: user.credits,
      projectCount: input.projectCount,
      generationCount: input.generationCount,
      isLifetime: user.isLifetime,
    }),
  };
}

// priceGbp line above has a redundant ternary. I'll clean it when I notice.
// Wait I should fix it before shipping. Let me fix in the write... I already wrote the confusing version.
// I'll strreplace after.

export async function getBillingSubscription(userId: string): Promise<BillingSubscriptionView> {
  const user = await loadUser(userId);
  const counts = await countsFor(userId);
  let subscription: Stripe.Subscription | null = null;
  if (user.stripeSubscriptionId) {
    try {
      subscription = await retrieveSubscription(user.stripeSubscriptionId);
    } catch (error) {
      console.error("Billing view could not read Stripe; using the saved subscription:", error);
      return viewFrom({ user, subscription: null, ...counts, stripeUnreachable: true });
    }
  }

  if (user.stripeSubscriptionId && !subscription) {
    await prisma.user.update({
      where: { id: userId },
      data: endedSubscriptionPatch(lifetimeFallbackPlan(user)),
    });
    const cleared = { ...user, ...endedSubscriptionPatch(lifetimeFallbackPlan(user)), plan: lifetimeFallbackPlan(user) };
    return viewFrom({ user: cleared, subscription: null, ...counts });
  }

  if (subscription && isActiveSubscriptionStatus(subscription.status)) {
    const priceId = subscription.items.data[0]?.price.id;
    const planName = priceId ? getPlanByPriceId(priceId) : null;
    if (planName) {
      const patch = activeSubscriptionPatch(subscription, planName);
      await prisma.user.update({ where: { id: userId }, data: patch });
      Object.assign(user, patch);
    }
  } else if (subscription && (subscription.status === "canceled" || subscription.status === "incomplete_expired")) {
    const plan = lifetimeFallbackPlan(user);
    await prisma.user.update({ where: { id: userId }, data: endedSubscriptionPatch(plan) });
    Object.assign(user, endedSubscriptionPatch(plan));
    return viewFrom({ user, subscription: null, ...counts });
  }

  if (subscription && !isActiveSubscriptionStatus(subscription.status)) {
    return viewFrom({ user, subscription: null, ...counts, stripeUnreachable: true });
  }

  return viewFrom({ user, subscription, ...counts });
}

async function requireLiveSubscription(user: BillingUser): Promise<Stripe.Subscription> {
  if (!user.stripeSubscriptionId) {
    throw new BillingError("There is no subscription to change.", 400);
  }
  const subscription = await retrieveSubscription(user.stripeSubscriptionId);
  if (!subscription || !isActiveSubscriptionStatus(subscription.status)) {
    throw new BillingError("There is no active subscription to change.", 400);
  }
  return subscription;
}

async function discountShownBefore(userId: string, exceptAttemptId?: string): Promise<boolean> {
  const rows = await prisma.subscriptionCancellation.findMany({
    where: { userId },
    select: { id: true, offerShown: true },
  });
  return rows.some((row) => row.id !== exceptAttemptId && offerWasShown(row.offerShown, "discount"));
}

async function offerContext(user: BillingUser, reason: CancelReason, exceptAttemptId?: string) {
  const [spend, shown, subscription] = await Promise.all([
    spendFor(user),
    discountShownBefore(user.id, exceptAttemptId),
    user.stripeSubscriptionId ? retrieveSubscription(user.stripeSubscriptionId) : Promise.resolve(null),
  ]);
  const live = subscription && isActiveSubscriptionStatus(subscription.status) ? subscription : null;
  const cheaper = user.plan === "UNLIMITED" ? "PRO" : user.plan === "PRO" ? "STARTER" : null;
  return {
    ctx: {
      reason,
      plan: user.plan,
      lifetimeSpendGbp: spend,
      discountAlreadyUsed: user.retentionDiscountUsedAt != null,
      discountAlreadyShown: shown,
      canDowngrade: Boolean(cheaper && priceIdForPlan(cheaper)),
      canPause: !(live ? live.pause_collection != null : user.billingPaused),
    },
    subscription: live,
  };
}

export interface CancellationStart {
  attemptId: string;
  offers: RetentionOffer[];
  periodEnd: string | null;
  planLabel: string;
}

export async function startCancellation(
  userId: string,
  input: { reason: string; note?: string }
): Promise<CancellationStart> {
  if (!isCancelReason(input.reason)) {
    throw new BillingError("Choose a reason to continue.", 400);
  }
  const note = input.note?.trim() ? input.note.trim().slice(0, 2000) : null;
  const user = await loadUser(userId);
  const { ctx, subscription } = await offerContext(user, input.reason);
  if (!subscription) throw new BillingError("There is no active subscription to cancel.", 400);

  if (subscription.cancel_at_period_end) {
    throw new BillingError("This subscription is already set to cancel. You can resume it from billing.", 409);
  }

  const offers = buildRetentionOffers(ctx);
  const attempt = await prisma.subscriptionCancellation.create({
    data: {
      userId,
      reason: input.reason,
      note,
      offerShown: offerShownKey(offers),
      offerAccepted: false,
      outcome: "in_progress",
      plan: user.plan,
    },
  });
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  return {
    attemptId: attempt.id,
    offers,
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
    planLabel: planDisplayName(user.plan),
  };
}

async function loadAttempt(userId: string, attemptId: string) {
  const attempt = await prisma.subscriptionCancellation.findFirst({
    where: { id: attemptId, userId },
  });
  if (!attempt) throw new BillingError("That cancellation can't be found.", 404);
  return attempt;
}

export async function keepSubscription(userId: string, attemptId?: string): Promise<{ outcome: "retained" }> {
  if (attemptId) {
    const attempt = await loadAttempt(userId, attemptId);
    if (attempt.outcome === "cancelled") {
      throw new BillingError("This subscription is already set to cancel. Resume it from billing.", 409);
    }
    if (attempt.outcome === "in_progress") {
      await prisma.subscriptionCancellation.update({
        where: { id: attempt.id },
        data: { outcome: "retained", offerAccepted: false },
      });
    }
    return { outcome: "retained" };
  }
  const user = await loadUser(userId);
  await prisma.subscriptionCancellation.create({
    data: {
      userId,
      outcome: "retained",
      offerAccepted: false,
      plan: user.plan,
    },
  });
  return { outcome: "retained" };
}

function existingDiscountRefs(subscription: Stripe.Subscription): Stripe.SubscriptionUpdateParams.Discount[] {
  return subscription.discounts.flatMap((entry) => {
    if (typeof entry === "string") return [{ discount: entry }];
    return [{ discount: entry.id }];
  });
}

async function syncFromStripe(userId: string, subscription: Stripe.Subscription, extra: Record<string, unknown> = {}) {
  const priceId = subscription.items.data[0]?.price.id;
  const planName = priceId ? getPlanByPriceId(priceId) : null;
  if (!planName) {
    const pause = subscription.pause_collection;
    await prisma.user.update({
      where: { id: userId },
      data: {
        cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
        billingPaused: pause != null,
        subscriptionPauseResumesAt: pause?.resumes_at ? new Date(pause.resumes_at * 1000) : null,
        ...extra,
      },
    });
    return;
  }
  await prisma.user.update({
    where: { id: userId },
    data: { ...activeSubscriptionPatch(subscription, planName), ...extra },
  });
}

export async function acceptRetentionOffer(
  userId: string,
  attemptId: string,
  offer: "discount" | "downgrade" | "pause"
): Promise<{ outcome: "retained"; message: string }> {
  const attempt = await loadAttempt(userId, attemptId);
  if (attempt.outcome === "retained" && attempt.offerAccepted) {
    return { outcome: "retained", message: "That offer is already on your subscription." };
  }
  if (attempt.outcome !== "in_progress") {
    throw new BillingError("This cancellation is already closed.", 409);
  }
  if (!attempt.reason || !isCancelReason(attempt.reason)) {
    throw new BillingError("Choose a reason before accepting an offer.", 400);
  }
  if (!offerWasShown(attempt.offerShown, offer)) {
    throw new BillingError("That offer is not available.", 400);
  }

  const user = await loadUser(userId);
  const { ctx, subscription } = await offerContext(user, attempt.reason, attempt.id);
  if (!subscription) throw new BillingError("There is no active subscription to change.", 400);
  const allowed = buildRetentionOffers(ctx);
  if (!allowed.some((item) => item.type === offer)) {
    throw new BillingError("That offer is no longer available.", 400);
  }

  const claimed = await prisma.subscriptionCancellation.updateMany({
    where: { id: attempt.id, userId, outcome: "in_progress", offerAccepted: false },
    data: { offerAccepted: true },
  });
  if (claimed.count !== 1) {
    throw new BillingError("That offer was already used.", 409);
  }

  try {
    if (offer === "discount" && user.retentionDiscountUsedAt) {
      await prisma.subscriptionCancellation.update({
        where: { id: attempt.id },
        data: { outcome: "retained", offerAccepted: true },
      });
      return {
        outcome: "retained",
        message: `${RETENTION_DISCOUNT_PERCENT}% off is already applied to your next renewal.`,
      };
    }

    if (offer === "discount") {
      await applyDiscount(user, attempt.id, subscription);
    } else if (offer === "downgrade") {
      await applyDowngrade(userId, subscription);
    } else {
      await applyPause(userId, subscription);
    }
  } catch (error) {
    await prisma.subscriptionCancellation.update({
      where: { id: attempt.id },
      data: { offerAccepted: false },
    });
    if (error instanceof BillingError) throw error;
    console.error("Retention offer failed:", error);
    throw new BillingError("We couldn't apply that offer. Your subscription was not changed.", 502);
  }

  await prisma.subscriptionCancellation.update({
    where: { id: attempt.id },
    data: { outcome: "retained", offerAccepted: true },
  });

  if (offer === "discount") {
    return {
      outcome: "retained",
      message: `${RETENTION_DISCOUNT_PERCENT}% off is applied to your next renewal. The month after that is the normal price.`,
    };
  }
  if (offer === "downgrade") {
    const target = subscription.items.data[0] ? (user.plan === "UNLIMITED" ? "Pro" : "Starter") : "the lower plan";
    return {
      outcome: "retained",
      message: `You're on ${target} now. You were not charged today. The next renewal uses the lower price.`,
    };
  }
  return {
    outcome: "retained",
    message: `Billing is paused for ${RETENTION_PAUSE_DAYS} days. Your plan and current credits stay. A new credit grant waits until billing resumes.`,
  };
}

async function applyDiscount(user: BillingUser, attemptId: string, subscription: Stripe.Subscription) {
  const claimed = await prisma.user.updateMany({
    where: { id: user.id, retentionDiscountUsedAt: null },
    data: { retentionDiscountUsedAt: new Date() },
  });
  if (claimed.count !== 1) {
    throw new BillingError("The discount offer has already been used on this account.", 409);
  }

  let applied = false;
  try {
    const attempt = await prisma.subscriptionCancellation.findUnique({
      where: { id: attemptId },
      select: { stripeCouponId: true },
    });
    let couponId = attempt?.stripeCouponId ?? null;
    if (!couponId) {
      const coupon = await stripe.coupons.create(
        {
          percent_off: RETENTION_DISCOUNT_PERCENT,
          duration: "once",
          name: `SpriteLab ${RETENTION_DISCOUNT_PERCENT}% off next month`,
          max_redemptions: 1,
          metadata: { userId: user.id, purpose: "retention", attemptId },
        },
        { idempotencyKey: `retention-coupon-${attemptId}` }
      );
      couponId = coupon.id;
      await prisma.subscriptionCancellation.update({
        where: { id: attemptId },
        data: { stripeCouponId: couponId },
      });
    }

    const updated = await stripe.subscriptions.update(
      subscription.id,
      {
        discounts: [...existingDiscountRefs(subscription), { coupon: couponId }],
        cancel_at_period_end: false,
      },
      { idempotencyKey: `retention-apply-${attemptId}` }
    );
    applied = true;
    await syncFromStripe(user.id, updated);
  } catch (error) {
    // The flag is the "one offer" lock. Release it only when Stripe did not
    // take the coupon, so a failed call can be retried and a successful one
    // cannot be repeated.
    if (!applied) {
      await prisma.user.updateMany({
        where: { id: user.id },
        data: { retentionDiscountUsedAt: null },
      });
    }
    throw error;
  }
}

async function applyDowngrade(userId: string, subscription: Stripe.Subscription) {
  const user = await loadUser(userId);
  const target = user.plan === "UNLIMITED" ? "PRO" : user.plan === "PRO" ? "STARTER" : null;
  if (!target) throw new BillingError("There isn't a cheaper plan to move to.", 400);
  const priceId = priceIdForPlan(target);
  if (!priceId) throw new BillingError("Changing plan isn't available right now.", 503);
  const item = subscription.items.data[0];
  if (!item) throw new BillingError("This subscription has no plan to change.", 409);

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: item.id, price: priceId }],
    proration_behavior: "none",
    cancel_at_period_end: false,
  });
  await syncFromStripe(userId, updated);
}

async function applyPause(userId: string, subscription: Stripe.Subscription) {
  const resumesAt = Math.floor(Date.now() / 1000) + RETENTION_PAUSE_DAYS * 24 * 60 * 60;
  const updated = await stripe.subscriptions.update(subscription.id, {
    pause_collection: { behavior: "void", resumes_at: resumesAt },
    cancel_at_period_end: false,
  });
  await syncFromStripe(userId, updated);
}

export async function confirmCancellation(
  userId: string,
  attemptId: string
): Promise<{ outcome: "cancelled"; periodEnd: string | null; message: string }> {
  const attempt = await loadAttempt(userId, attemptId);
  const user = await loadUser(userId);
  if (attempt.outcome === "cancelled" || user.cancelAtPeriodEnd) {
    if (attempt.outcome === "in_progress") {
      await prisma.subscriptionCancellation.update({
        where: { id: attempt.id },
        data: { outcome: "cancelled", offerAccepted: false },
      });
    }
    const periodEnd = user.stripeCurrentPeriodEnd?.toISOString() ?? null;
    return {
      outcome: "cancelled",
      periodEnd,
      message: "Your subscription is already set to end at the close of this period.",
    };
  }
  if (attempt.outcome !== "in_progress") {
    throw new BillingError("This cancellation is already closed.", 409);
  }
  if (!attempt.reason) {
    throw new BillingError("Choose a reason before cancelling.", 400);
  }

  const subscription = await requireLiveSubscription(user);
  // Period end, not immediately. subscriptions.cancel() is not used.
  const updated = await stripe.subscriptions.update(
    subscription.id,
    { cancel_at_period_end: true },
    { idempotencyKey: `retention-cancel-${attemptId}` }
  );
  const periodEnd = getSubscriptionPeriodEnd(updated);
  await syncFromStripe(userId, updated);
  await prisma.subscriptionCancellation.updateMany({
    where: { id: attempt.id, userId, outcome: "in_progress" },
    data: { outcome: "cancelled", offerAccepted: false },
  });
  const when = periodEnd ? periodEnd.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "the end of this period";
  return {
    outcome: "cancelled",
    periodEnd: periodEnd ? periodEnd.toISOString() : null,
    message: `Your ${planDisplayName(user.plan)} plan stays active until ${when}. You won't be charged again. You can resume until that date.`,
  };
}

export async function resumeCancellation(userId: string): Promise<{ message: string }> {
  const user = await loadUser(userId);
  const subscription = await requireLiveSubscription(user);
  if (!subscription.cancel_at_period_end && !user.cancelAtPeriodEnd) {
    return { message: "Your subscription is already set to renew." };
  }
  const updated = await stripe.subscriptions.update(subscription.id, { cancel_at_period_end: false });
  await syncFromStripe(userId, updated);
  return { message: "Your subscription will renew as usual." };
}

export async function resumePausedBilling(userId: string): Promise<{ message: string }> {
  const user = await loadUser(userId);
  const subscription = await requireLiveSubscription(user);
  if (!subscription.pause_collection && !user.billingPaused) {
    return { message: "Billing is already active." };
  }
  const updated = await stripe.subscriptions.update(subscription.id, { pause_collection: "" });
  await syncFromStripe(userId, updated);
  return { message: "Billing will resume on the next renewal." };
}
