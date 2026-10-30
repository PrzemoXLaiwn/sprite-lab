import { afterEach, describe, expect, it } from "vitest";
import {
  RETENTION_DISCOUNT_PERCENT,
  RETENTION_HIGH_SPEND_GBP,
} from "@/config/retention";
import { billingStatus, billingStatusLabel } from "@/lib/billing/billing-view";
import {
  buildRetentionOffers,
  cancellationConsequences,
  isValuableCustomer,
  lifetimeSpendGbp,
  offerShownKey,
  priceIdForPlan,
} from "@/lib/billing/retention";

const base = {
  discountAlreadyUsed: false,
  discountAlreadyShown: false,
  canDowngrade: true,
  canPause: true,
};

describe("retention offers", () => {
  afterEach(() => {
    delete process.env.STRIPE_STARTER_PRICE_ID;
    delete process.env.STRIPE_PRO_PRICE_ID;
  });

  it("treats Pro and Studio as valuable, and Starter only past the spend threshold", () => {
    expect(isValuableCustomer("PRO", 0)).toBe(true);
    expect(isValuableCustomer("UNLIMITED", 0)).toBe(true);
    expect(isValuableCustomer("STARTER", RETENTION_HIGH_SPEND_GBP)).toBe(true);
    expect(isValuableCustomer("STARTER", RETENTION_HIGH_SPEND_GBP - 0.01)).toBe(false);
    expect(lifetimeSpendGbp(5, 30)).toBe(30);
    expect(lifetimeSpendGbp(40, 10)).toBe(40);
  });

  it("offers a one-time discount and a downgrade when Pro is too expensive", () => {
    const offers = buildRetentionOffers({
      ...base,
      reason: "too_expensive",
      plan: "PRO",
      lifetimeSpendGbp: 0,
    });
    expect(offers.map((offer) => offer.type)).toEqual(["discount", "downgrade"]);
    expect(offers[0]).toMatchObject({ type: "discount", percent: RETENTION_DISCOUNT_PERCENT });
    expect(offers[1]).toMatchObject({ type: "downgrade", toPlan: "STARTER", priceGbp: 5 });
    expect(offerShownKey(offers)).toBe("discount,downgrade");
  });

  it("does not repeat a discount that was already shown or used", () => {
    const shown = buildRetentionOffers({
      ...base,
      reason: "too_expensive",
      plan: "PRO",
      lifetimeSpendGbp: 100,
      discountAlreadyShown: true,
    });
    expect(shown.map((offer) => offer.type)).toEqual(["downgrade"]);
    const used = buildRetentionOffers({
      ...base,
      reason: "quality",
      plan: "UNLIMITED",
      lifetimeSpendGbp: 0,
      discountAlreadyUsed: true,
    });
    expect(used.map((offer) => offer.type)).toEqual(["support"]);
  });

  it("offers pause or downgrade when the plan is not being used", () => {
    const offers = buildRetentionOffers({
      ...base,
      reason: "not_using_enough",
      plan: "STARTER",
      lifetimeSpendGbp: 0,
      canDowngrade: false,
    });
    expect(offers).toEqual([{ type: "pause", days: 30 }]);
  });

  it("points quality and technical reasons at support, plus a discount for valuable customers", () => {
    const quality = buildRetentionOffers({
      ...base,
      reason: "quality",
      plan: "PRO",
      lifetimeSpendGbp: 0,
      canDowngrade: false,
      canPause: false,
    });
    expect(quality.map((offer) => offer.type)).toEqual(["discount", "support"]);
    const technical = buildRetentionOffers({
      ...base,
      reason: "technical",
      plan: "STARTER",
      lifetimeSpendGbp: 0,
      canDowngrade: false,
    });
    expect(technical).toEqual([{ type: "support", email: "support@sprite-lab.com" }]);
  });

  it("skips the save step when a low-spend Starter customer has no matching offer", () => {
    const offers = buildRetentionOffers({
      ...base,
      reason: "one_project",
      plan: "STARTER",
      lifetimeSpendGbp: 5,
      canDowngrade: false,
      canPause: false,
    });
    expect(offers).toEqual([]);
  });

  it("ignores a discount percent Stripe would reject", () => {
    const offers = buildRetentionOffers({
      ...base,
      reason: "too_expensive",
      plan: "PRO",
      lifetimeSpendGbp: 0,
      discountPercent: 0,
      canDowngrade: false,
    });
    expect(offers).toEqual([]);
  });

  it("reads plan price ids at call time", () => {
    expect(priceIdForPlan("STARTER")).toBeNull();
    process.env.STRIPE_STARTER_PRICE_ID = " price_starter ";
    expect(priceIdForPlan("STARTER")).toBe("price_starter");
  });

  it("says credits and sprites stay, and names the monthly grant that stops", () => {
    const copy = cancellationConsequences({
      plan: "PRO",
      credits: 120,
      projectCount: 1,
      generationCount: 4,
      isLifetime: false,
    });
    expect(copy.keep.join(" ")).toContain("120 credits already on your account");
    expect(copy.keep.join(" ")).toContain("1 project");
    expect(copy.keep.join(" ")).toContain("4 sprites");
    expect(copy.ends.join(" ")).toContain("500");
    expect(copy.ends.join(" ")).not.toMatch(/delete your credits/i);
  });
});

describe("billing status", () => {
  it("keeps a cancelling subscriber on the paid plan until the period ends", () => {
    expect(billingStatus({
      hasSubscription: true,
      isLifetime: false,
      cancelAtPeriodEnd: true,
      billingPaused: false,
      pastDue: false,
    })).toBe("canceling");
    const label = billingStatusLabel("canceling", new Date("2026-11-12T00:00:00Z"), null);
    expect(label).toContain("2026");
    expect(label.toLowerCase()).toContain("access until");
  });
});
