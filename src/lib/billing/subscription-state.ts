import type Stripe from "stripe";
import { getSubscriptionPeriodEnd } from "@/app/api/stripe/_lib/fulfillment";

/** Fields written while a subscription is still active, past_due or trialing. */
export function activeSubscriptionPatch(subscription: Stripe.Subscription, planName: string) {
  const periodEnd = getSubscriptionPeriodEnd(subscription);
  const pause = subscription.pause_collection;
  return {
    plan: planName,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0]?.price.id ?? null,
    ...(periodEnd ? { stripeCurrentPeriodEnd: periodEnd } : {}),
    cancelAtPeriodEnd: subscription.cancel_at_period_end === true,
    billingPaused: pause != null,
    subscriptionPauseResumesAt: pause?.resumes_at ? new Date(pause.resumes_at * 1000) : null,
  };
}

/**
 * Fields written when the subscription is gone. `plan` is FREE, or the
 * lifetime deal's base plan when the account bought one. Credits are not
 * part of this patch — paid credits stay on the account.
 */
export function endedSubscriptionPatch(plan: string) {
  return {
    plan,
    stripeSubscriptionId: null,
    stripePriceId: null,
    stripeCurrentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    billingPaused: false,
    subscriptionPauseResumesAt: null,
  };
}
