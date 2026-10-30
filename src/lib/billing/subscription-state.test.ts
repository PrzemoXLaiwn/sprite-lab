import { describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { activeSubscriptionPatch, endedSubscriptionPatch } from "@/lib/billing/subscription-state";

function subscription(overrides: Record<string, unknown> = {}): Stripe.Subscription {
  return {
    id: "sub_1",
    cancel_at_period_end: false,
    pause_collection: null,
    items: {
      data: [{ price: { id: "price_pro" }, current_period_end: 1_800_000_000 }],
    },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

describe("subscription state written from Stripe webhooks", () => {
  it("keeps the paid plan when cancellation is scheduled for period end", () => {
    const patch = activeSubscriptionPatch(
      subscription({ cancel_at_period_end: true }),
      "PRO"
    );
    expect(patch.plan).toBe("PRO");
    expect(patch.cancelAtPeriodEnd).toBe(true);
    expect(patch.stripeSubscriptionId).toBe("sub_1");
    expect(patch.billingPaused).toBe(false);
    expect(patch.stripeCurrentPeriodEnd).toEqual(new Date(1_800_000_000 * 1000));
  });

  it("records a pause without clearing the plan", () => {
    const patch = activeSubscriptionPatch(
      subscription({
        pause_collection: { behavior: "void", resumes_at: 1_800_000_000 },
      }),
      "STARTER"
    );
    expect(patch.plan).toBe("STARTER");
    expect(patch.billingPaused).toBe(true);
    expect(patch.subscriptionPauseResumesAt).toEqual(new Date(1_800_000_000 * 1000));
  });

  it("clears cancel and pause flags when the subscription ends, without touching credits", () => {
    const patch = endedSubscriptionPatch("STARTER");
    expect(patch).toEqual({
      plan: "STARTER",
      stripeSubscriptionId: null,
      stripePriceId: null,
      stripeCurrentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      billingPaused: false,
      subscriptionPauseResumesAt: null,
    });
    expect(patch).not.toHaveProperty("credits");
  });
});
