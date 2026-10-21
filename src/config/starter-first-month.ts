// =============================================================================
// Starter first month — £3 once, then the normal monthly price
// =============================================================================
// Client-safe. The Stripe coupon id is NOT in this file. The server reads
// STRIPE_COUPON_STARTER_FIRST_MONTH and, when that variable is empty, the
// offer is off: copy stays at the full price and `offer=first3` is ignored.
// Callers must never accept a coupon id from the browser.
// =============================================================================

import { PLAN_FEATURES, PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "@/config/plan-features";

/** Query / metadata value. Not a Stripe coupon id. */
export const STARTER_FIRST_MONTH_OFFER = "first3";

export const STARTER_FIRST_MONTH_COUPON_ENV = "STRIPE_COUPON_STARTER_FIRST_MONTH";

/** £2 off the £5 Starter price, in pence. Matches the coupon Przemek creates. */
export const STARTER_FIRST_MONTH_AMOUNT_OFF_PENCE = 200;

export const STARTER_UPSELL_LOW_CREDITS = 3;
export const STARTER_UPSELL_COOLDOWN_MS = 24 * 60 * 60 * 1000;
export const STARTER_UPSELL_STORAGE_KEY = "spritelab.starter-upsell-at";

/** Invoice ids from Stripe. Lifetime grants use a `lifetime:` key instead. */
export const SUBSCRIPTION_INVOICE_PREFIX = "in_";
export const SUBSCRIPTION_CANCELLED_MARKER = "Subscription cancelled";
export const SUBSCRIPTION_GRANT_MARKER = "plan subscription";

export type UpsellReason = "low_balance" | "no_credits";

export interface StarterOfferUser {
  plan: string;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  /** True when a credit row shows a past subscription invoice or cancellation. */
  hadSubscriptionHistory: boolean;
}

export function formatGbp(amount: number): string {
  const text = Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
  return `£${text}`;
}

export function starterFirstMonthIntroGbp(): number {
  return PLAN_MONTHLY_PRICE_GBP.STARTER - STARTER_FIRST_MONTH_AMOUNT_OFF_PENCE / 100;
}

export function readStarterFirstMonthCouponId(
  env: Record<string, string | undefined>
): string | null {
  const raw = env[STARTER_FIRST_MONTH_COUPON_ENV];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Kill switch: an empty or missing coupon id turns the whole offer off. */
export function isStarterFirstMonthOfferEnabled(
  env: Record<string, string | undefined> = process.env
): boolean {
  return readStarterFirstMonthCouponId(env) !== null;
}

function hasStoredId(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * First-month price is only for a free account that has never subscribed.
 * A current `stripeSubscriptionId` (active or leftover) and any historical
 * subscription marker both disqualify. This does not call Stripe.
 */
export function qualifiesForStarterFirstMonth(user: StarterOfferUser): boolean {
  if (user.plan !== "FREE") return false;
  if (hasStoredId(user.stripeSubscriptionId)) return false;
  if (hasStoredId(user.stripePriceId)) return false;
  if (user.hadSubscriptionHistory) return false;
  return true;
}

export function creditTransactionShowsSubscription(tx: {
  stripeInvoiceId?: string | null;
  description?: string | null;
}): boolean {
  const invoiceId = tx.stripeInvoiceId ?? "";
  if (invoiceId.startsWith(SUBSCRIPTION_INVOICE_PREFIX)) return true;
  const description = tx.description ?? "";
  return (
    description.includes(SUBSCRIPTION_CANCELLED_MARKER) ||
    description.includes(SUBSCRIPTION_GRANT_MARKER)
  );
}

export type FirstMonthDiscount =
  | { apply: false }
  | { apply: true; couponId: string };

/**
 * Decide whether subscriptions.create should receive a discount.
 * `requestedOffer` is the only client signal we honour, and only the literal
 * `first3`. A coupon id, `discounts` payload, or any other string is ignored.
 * The coupon id always comes from the server env.
 */
export function resolveStarterFirstMonthDiscount(input: {
  requestedOffer: unknown;
  plan: string;
  eligible: boolean;
  couponId: string | null;
}): FirstMonthDiscount {
  if (input.requestedOffer !== STARTER_FIRST_MONTH_OFFER) return { apply: false };
  if (input.plan !== "STARTER") return { apply: false };
  if (!input.couponId) return { apply: false };
  if (!input.eligible) return { apply: false };
  return { apply: true, couponId: input.couponId };
}

export function starterFirstMonthPitch(): string {
  return `First month ${formatGbp(starterFirstMonthIntroGbp())}, then ${formatGbp(PLAN_MONTHLY_PRICE_GBP.STARTER)}/month. Cancel anytime.`;
}

export function starterRegularPitch(): string {
  return `${formatGbp(PLAN_MONTHLY_PRICE_GBP.STARTER)}/month. Cancel anytime.`;
}

/** Shown on the Starter checkout summary when the offer is applied. */
export function starterCheckoutOfferLine(): string {
  return `${formatGbp(starterFirstMonthIntroGbp())} today, then ${formatGbp(PLAN_MONTHLY_PRICE_GBP.STARTER)}/month`;
}

export function starterCheckoutHref(offerEnabled: boolean): string {
  return offerEnabled
    ? `/checkout/starter?offer=${STARTER_FIRST_MONTH_OFFER}`
    : "/checkout/starter";
}

export function starterUpsellContent(offerEnabled: boolean, reason: UpsellReason) {
  return {
    title: reason === "low_balance" ? "Running low on credits" : "Out of credits",
    creditsLine: PLAN_FEATURES.STARTER[0],
    monthlyCredits: PLAN_MONTHLY_CREDITS.STARTER,
    priceLine: offerEnabled ? starterFirstMonthPitch() : starterRegularPitch(),
    cta: "Get Starter",
    seeAllPlans: "See all plans",
    checkoutHref: starterCheckoutHref(offerEnabled),
    pricingHref: "/pricing",
  };
}

/** After a generation, below 3 credits: once this session and not again for 24h. */
export function lowBalanceUpsellDue(input: {
  credits: number;
  now: number;
  lastShownAt: number | null;
  shownThisSession: boolean;
}): boolean {
  if (!(input.credits < STARTER_UPSELL_LOW_CREDITS)) return false;
  if (input.shownThisSession) return false;
  if (
    input.lastShownAt != null &&
    input.now - input.lastShownAt < STARTER_UPSELL_COOLDOWN_MS
  ) {
    return false;
  }
  return true;
}
