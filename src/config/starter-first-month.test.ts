import { describe, expect, it } from "vitest";
import { PLAN_FEATURES, PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "@/config/plan-features";
import {
  STARTER_FIRST_MONTH_AMOUNT_OFF_PENCE,
  STARTER_FIRST_MONTH_OFFER,
  STARTER_UPSELL_COOLDOWN_MS,
  creditTransactionShowsSubscription,
  lowBalanceUpsellDue,
  qualifiesForStarterFirstMonth,
  readStarterFirstMonthCouponId,
  resolveStarterFirstMonthDiscount,
  starterCheckoutHref,
  starterCheckoutOfferLine,
  starterFirstMonthIntroGbp,
  starterFirstMonthPitch,
  starterRegularPitch,
  starterUpsellContent,
  type StarterOfferUser,
} from "@/config/starter-first-month";

const COUPON = "coupon_starter_first_month";

function freeUser(overrides: Partial<StarterOfferUser> = {}): StarterOfferUser {
  return {
    plan: "FREE",
    stripeSubscriptionId: null,
    stripePriceId: null,
    hadSubscriptionHistory: false,
    ...overrides,
  };
}

describe("starter first-month qualification", () => {
  it("accepts a free account with no subscription id and no history", () => {
    expect(qualifiesForStarterFirstMonth(freeUser())).toBe(true);
    expect(qualifiesForStarterFirstMonth(freeUser({ stripeSubscriptionId: "  ", stripePriceId: "" }))).toBe(true);
  });

  it("rejects a current or leftover stripeSubscriptionId", () => {
    expect(qualifiesForStarterFirstMonth(freeUser({ stripeSubscriptionId: "sub_live" }))).toBe(false);
    expect(qualifiesForStarterFirstMonth(freeUser({ stripeSubscriptionId: " sub_old " }))).toBe(false);
  });

  it("rejects a stored subscription price id", () => {
    expect(qualifiesForStarterFirstMonth(freeUser({ stripePriceId: "price_starter" }))).toBe(false);
  });

  it("rejects subscription history even after the id was cleared", () => {
    expect(qualifiesForStarterFirstMonth(freeUser({ hadSubscriptionHistory: true }))).toBe(false);
  });

  it("rejects anyone not on the free plan", () => {
    for (const plan of ["STARTER", "PRO", "UNLIMITED", "LIFETIME"]) {
      expect(qualifiesForStarterFirstMonth(freeUser({ plan })), plan).toBe(false);
    }
  });

  it("treats Stripe invoices and cancellation rows as history, not lifetime grants", () => {
    expect(creditTransactionShowsSubscription({ stripeInvoiceId: "in_123", description: null })).toBe(true);
    expect(
      creditTransactionShowsSubscription({
        stripeInvoiceId: null,
        description: "Subscription cancelled — downgraded to FREE (existing credits preserved)",
      })
    ).toBe(true);
    expect(
      creditTransactionShowsSubscription({
        stripeInvoiceId: "in_456",
        description: "STARTER plan subscription",
      })
    ).toBe(true);
    expect(
      creditTransactionShowsSubscription({
        stripeInvoiceId: "lifetime:user:2026-10",
        description: "Lifetime monthly credits (2026-10)",
      })
    ).toBe(false);
    expect(
      creditTransactionShowsSubscription({
        stripeInvoiceId: null,
        description: "Credit pack purchase (25 credits)",
      })
    ).toBe(false);
  });
});

describe("starter first-month kill switch", () => {
  it("is off when the coupon env is missing, empty, or whitespace", () => {
    expect(readStarterFirstMonthCouponId({})).toBeNull();
    expect(readStarterFirstMonthCouponId({ STRIPE_COUPON_STARTER_FIRST_MONTH: "" })).toBeNull();
    expect(readStarterFirstMonthCouponId({ STRIPE_COUPON_STARTER_FIRST_MONTH: "   " })).toBeNull();
  });

  it("reads a trimmed coupon id and nothing else", () => {
    expect(readStarterFirstMonthCouponId({ STRIPE_COUPON_STARTER_FIRST_MONTH: `  ${COUPON}  ` })).toBe(COUPON);
  });

  it("does not apply the offer while the coupon env is empty", () => {
    const decision = resolveStarterFirstMonthDiscount({
      requestedOffer: STARTER_FIRST_MONTH_OFFER,
      plan: "STARTER",
      eligible: true,
      couponId: readStarterFirstMonthCouponId({ STRIPE_COUPON_STARTER_FIRST_MONTH: "" }),
    });
    expect(decision).toEqual({ apply: false });
  });

  it("applies only the server coupon when offer=first3, the plan is Starter, and the user qualifies", () => {
    expect(
      resolveStarterFirstMonthDiscount({
        requestedOffer: STARTER_FIRST_MONTH_OFFER,
        plan: "STARTER",
        eligible: true,
        couponId: COUPON,
      })
    ).toEqual({ apply: true, couponId: COUPON });
  });

  it("ignores a client-supplied coupon id and any other offer string", () => {
    for (const requestedOffer of [COUPON, "coupon_other", "FIRST3", "first3 ", "", null, undefined, { coupon: COUPON }]) {
      expect(
        resolveStarterFirstMonthDiscount({
          requestedOffer,
          plan: "STARTER",
          eligible: true,
          couponId: COUPON,
        }),
        JSON.stringify(requestedOffer)
      ).toEqual({ apply: false });
    }
  });

  it("does not discount ineligible users or other plans", () => {
    expect(
      resolveStarterFirstMonthDiscount({
        requestedOffer: STARTER_FIRST_MONTH_OFFER,
        plan: "STARTER",
        eligible: false,
        couponId: COUPON,
      })
    ).toEqual({ apply: false });
    expect(
      resolveStarterFirstMonthDiscount({
        requestedOffer: STARTER_FIRST_MONTH_OFFER,
        plan: "PRO",
        eligible: true,
        couponId: COUPON,
      })
    ).toEqual({ apply: false });
  });

  it("drops the £3 copy and the offer query when the offer is off", () => {
    const off = starterUpsellContent(false, "low_balance");
    expect(off.priceLine).toBe("£5/month. Cancel anytime.");
    expect(off.priceLine).not.toContain("£3");
    expect(off.priceLine).not.toContain("First month");
    expect(off.checkoutHref).toBe("/checkout/starter");
    expect(off.checkoutHref).not.toContain(STARTER_FIRST_MONTH_OFFER);

    const on = starterUpsellContent(true, "no_credits");
    expect(on.title).toBe("Out of credits");
    expect(on.priceLine).toBe(starterFirstMonthPitch());
    expect(on.checkoutHref).toBe(starterCheckoutHref(true));
    expect(on.pricingHref).toBe("/pricing");
  });
});

describe("starter first-month copy", () => {
  it("derives £3 from a £2 reduction of the Starter price and uses plan-features credits", () => {
    expect(STARTER_FIRST_MONTH_AMOUNT_OFF_PENCE).toBe(200);
    expect(PLAN_MONTHLY_PRICE_GBP.STARTER).toBe(5);
    expect(starterFirstMonthIntroGbp()).toBe(3);
    expect(PLAN_MONTHLY_CREDITS.STARTER).toBe(250);
    expect(PLAN_FEATURES.STARTER[0]).toBe("250 credits / month");
    expect(starterFirstMonthPitch()).toBe("First month £3, then £5/month. Cancel anytime.");
    expect(starterRegularPitch()).toBe("£5/month. Cancel anytime.");
    expect(starterCheckoutOfferLine()).toBe("£3 today, then £5/month");
    expect(starterUpsellContent(true, "low_balance").creditsLine).toBe(PLAN_FEATURES.STARTER[0]);
    expect(starterUpsellContent(true, "low_balance").title).toBe("Running low on credits");
    expect(starterUpsellContent(true, "low_balance").monthlyCredits).toBe(PLAN_MONTHLY_CREDITS.STARTER);
  });
});

describe("low-balance upsell cadence", () => {
  const now = 1_700_000_000_000;

  it("shows under 3 credits when it has not been shown this session or in the last 24h", () => {
    expect(
      lowBalanceUpsellDue({ credits: 2, now, lastShownAt: null, shownThisSession: false })
    ).toBe(true);
    expect(
      lowBalanceUpsellDue({ credits: 0, now, lastShownAt: now - STARTER_UPSELL_COOLDOWN_MS, shownThisSession: false })
    ).toBe(true);
  });

  it("stays quiet at 3 or more credits, within 24h, or after a show this session", () => {
    expect(
      lowBalanceUpsellDue({ credits: 3, now, lastShownAt: null, shownThisSession: false })
    ).toBe(false);
    expect(
      lowBalanceUpsellDue({ credits: 2, now, lastShownAt: now - STARTER_UPSELL_COOLDOWN_MS + 1, shownThisSession: false })
    ).toBe(false);
    expect(
      lowBalanceUpsellDue({ credits: 2, now, lastShownAt: null, shownThisSession: true })
    ).toBe(false);
  });
});
