import { describe, expect, it } from "vitest";
import { billingPatchForSubscription, planAfterSubscriptionEnded, type SubscriptionSnapshot } from "./subscription-sync";

const end = new Date("2026-12-01T00:00:00Z");

function snap(over: Partial<SubscriptionSnapshot> = {}): SubscriptionSnapshot {
  return {
    id: "sub_1",
    status: "active",
    cancelAtPeriodEnd: false,
    priceId: "price_pro",
    planName: "PRO",
    periodEnd: end,
    ...over,
  };
}

describe("billingPatchForSubscription", () => {
  it("records a portal cancellation without changing the plan or the period", () => {
    const patch = billingPatchForSubscription(snap({ cancelAtPeriodEnd: true }));
    expect(patch).toMatchObject({
      plan: "PRO",
      cancelAtPeriodEnd: true,
      stripeCurrentPeriodEnd: end,
      stripeSubscriptionId: "sub_1",
      stripePriceId: "price_pro",
      ended: false,
    });
  });

  it("clears the flag when the customer resumes", () => {
    expect(billingPatchForSubscription(snap({ cancelAtPeriodEnd: false })).cancelAtPeriodEnd).toBe(false);
  });

  it("ends the paid plan when Stripe has canceled the subscription", () => {
    const patch = billingPatchForSubscription(snap({ status: "canceled", cancelAtPeriodEnd: true }));
    expect(patch).toMatchObject({
      plan: "FREE",
      cancelAtPeriodEnd: false,
      stripeCurrentPeriodEnd: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      ended: true,
    });
  });

  it("does not invent a plan for an incomplete subscription", () => {
    const patch = billingPatchForSubscription(snap({ status: "incomplete", cancelAtPeriodEnd: false }));
    expect(patch.plan).toBeUndefined();
    expect(patch.ended).toBe(false);
    expect(patch.cancelAtPeriodEnd).toBe(false);
  });

  it("keeps a past_due plan and still stores the cancel flag", () => {
    const patch = billingPatchForSubscription(snap({ status: "past_due", cancelAtPeriodEnd: true }));
    expect(patch.plan).toBe("PRO");
    expect(patch.cancelAtPeriodEnd).toBe(true);
    expect(patch.ended).toBe(false);
  });
});

describe("planAfterSubscriptionEnded", () => {
  it("returns Free, or the lifetime plan the deal was sold as", () => {
    expect(planAfterSubscriptionEnded({ isLifetime: false, lifetimePlan: null, plan: "PRO" })).toBe("FREE");
    expect(planAfterSubscriptionEnded({ isLifetime: true, lifetimePlan: "STARTER", plan: "UNLIMITED" })).toBe("STARTER");
    expect(planAfterSubscriptionEnded({ isLifetime: true, lifetimePlan: null, plan: "PRO" })).toBe("STARTER");
  });
});
