// What a Stripe subscription should write onto users. No credits, no Stripe calls.
// While the subscription is still active, cancelAtPeriodEnd matches Stripe.
// When Stripe has ended it, the row drops back to Free (the caller may keep a
// lifetime plan) and the flag is cleared because nothing is left to cancel.

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export interface SubscriptionSnapshot {
  id: string;
  status: SubscriptionStatus | string;
  cancelAtPeriodEnd: boolean;
  priceId: string | null;
  /** Plan name for that price, or null when the price is unknown. */
  planName: string | null;
  periodEnd: Date | null;
}

export interface SubscriptionUserPatch {
  /** Omitted when the plan must not change (unknown price, or a not-yet-active sub). */
  plan?: string;
  cancelAtPeriodEnd: boolean;
  stripeCurrentPeriodEnd: Date | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  /** True when the subscription is over and the paid plan should end. */
  ended: boolean;
}

const LIVE = new Set(["active", "trialing", "past_due"]);
const ENDED = new Set(["canceled", "incomplete_expired"]);

export function billingPatchForSubscription(snapshot: SubscriptionSnapshot): SubscriptionUserPatch {
  if (ENDED.has(snapshot.status)) {
    return {
      plan: "FREE",
      cancelAtPeriodEnd: false,
      stripeCurrentPeriodEnd: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      ended: true,
    };
  }

  if (!LIVE.has(snapshot.status)) {
    return {
      cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd === true,
      stripeCurrentPeriodEnd: snapshot.periodEnd,
      ended: false,
    };
  }

  return {
    ...(snapshot.planName ? { plan: snapshot.planName } : {}),
    cancelAtPeriodEnd: snapshot.cancelAtPeriodEnd === true,
    stripeCurrentPeriodEnd: snapshot.periodEnd,
    stripeSubscriptionId: snapshot.id,
    stripePriceId: snapshot.priceId,
    ended: false,
  };
}

/** Lifetime buyers keep the plan the deal was sold as. Everyone else goes Free. */
export function planAfterSubscriptionEnded(user: {
  isLifetime: boolean;
  lifetimePlan: string | null;
  plan: string;
}): string {
  if (!user.isLifetime) return "FREE";
  if (user.lifetimePlan) return user.lifetimePlan;
  return user.plan === "FREE" ? "FREE" : "STARTER";
}
