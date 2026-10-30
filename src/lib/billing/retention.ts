// Client-safe offer selection for the cancellation flow. No Stripe, no Prisma.
// The server recomputes this on every accept so the browser cannot grant
// itself a discount by posting a made-up offer.

import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "@/config/plan-features";
import {
  RETENTION_DISCOUNT_PERCENT,
  RETENTION_HIGH_SPEND_GBP,
  RETENTION_PAUSE_DAYS,
  SUPPORT_EMAIL,
  isRetentionDiscountPercentValid,
  type CancelReason,
} from "@/config/retention";

export type PaidPlan = "STARTER" | "PRO" | "UNLIMITED";

export type RetentionOffer =
  | { type: "discount"; percent: number }
  | { type: "downgrade"; toPlan: "STARTER" | "PRO"; priceGbp: number; credits: number }
  | { type: "pause"; days: number }
  | { type: "support"; email: string };

export interface OfferContext {
  reason: CancelReason;
  plan: string;
  /** Higher of users.totalSpent and summed purchase money_amount, in GBP. */
  lifetimeSpendGbp: number;
  discountAlreadyUsed: boolean;
  /** Another attempt already included a discount offer. One show per account. */
  discountAlreadyShown: boolean;
  /** False when the cheaper plan has no Stripe price id configured. */
  canDowngrade: boolean;
  /** False when collection is already paused. */
  canPause: boolean;
  discountPercent?: number;
  highSpendGbp?: number;
  pauseDays?: number;
}

const PLAN_RANK: Record<string, number> = { FREE: 0, STARTER: 1, PRO: 2, UNLIMITED: 3 };

export function planDisplayName(plan: string | null | undefined): string {
  switch ((plan || "FREE").toUpperCase()) {
    case "UNLIMITED":
      return "Studio";
    case "PRO":
      return "Pro";
    case "STARTER":
      return "Starter";
    case "LIFETIME":
      return "Lifetime";
    default:
      return "Free";
  }
}

export function monthlyPriceGbp(plan: string): number | null {
  switch (plan.toUpperCase()) {
    case "STARTER":
      return PLAN_MONTHLY_PRICE_GBP.STARTER;
    case "PRO":
      return PLAN_MONTHLY_PRICE_GBP.PRO;
    case "UNLIMITED":
      return PLAN_MONTHLY_PRICE_GBP.UNLIMITED;
    default:
      return null;
  }
}

export function monthlyCredits(plan: string): number | null {
  switch (plan.toUpperCase()) {
    case "STARTER":
      return PLAN_MONTHLY_CREDITS.STARTER;
    case "PRO":
      return PLAN_MONTHLY_CREDITS.PRO;
    case "UNLIMITED":
      return PLAN_MONTHLY_CREDITS.UNLIMITED;
    default:
      return null;
  }
}

/** One step down. Studio → Pro, Pro → Starter. Starter has nowhere cheaper. */
export function downgradePlan(plan: string): "STARTER" | "PRO" | null {
  if (plan === "UNLIMITED") return "PRO";
  if (plan === "PRO") return "STARTER";
  return null;
}

export function isHigherPricedPlan(plan: string): boolean {
  return plan === "PRO" || plan === "UNLIMITED";
}

export function isValuableCustomer(plan: string, lifetimeSpendGbp: number, highSpendGbp = RETENTION_HIGH_SPEND_GBP): boolean {
  if (isHigherPricedPlan(plan)) return true;
  return Number.isFinite(lifetimeSpendGbp) && lifetimeSpendGbp >= highSpendGbp;
}

export function lifetimeSpendGbp(totalSpent: number | null | undefined, purchaseMoneySum: number | null | undefined): number {
  const spent = Number.isFinite(totalSpent) ? (totalSpent as number) : 0;
  const purchases = Number.isFinite(purchaseMoneySum) ? (purchaseMoneySum as number) : 0;
  return Math.max(0, spent, purchases);
}

function discountOffer(ctx: OfferContext): RetentionOffer | null {
  const percent = ctx.discountPercent ?? RETENTION_DISCOUNT_PERCENT;
  if (!isRetentionDiscountPercentValid(percent)) return null;
  if (ctx.discountAlreadyUsed || ctx.discountAlreadyShown) return null;
  const threshold = ctx.highSpendGbp ?? RETENTION_HIGH_SPEND_GBP;
  if (!isValuableCustomer(ctx.plan, ctx.lifetimeSpendGbp, threshold)) return null;
  return { type: "discount", percent };
}

/**
 * Offers for the save step. Empty means skip that step and go to confirm.
 * Discount is included for a valuable customer on any reason, once.
 */
export function buildRetentionOffers(ctx: OfferContext): RetentionOffer[] {
  const offers: RetentionOffer[] = [];
  const discount = discountOffer(ctx);
  if (discount) offers.push(discount);

  const cheaper = downgradePlan(ctx.plan);
  const wantsDowngrade = ctx.reason === "too_expensive" || ctx.reason === "not_using_enough";
  if (wantsDowngrade && ctx.canDowngrade && cheaper) {
    offers.push({
      type: "downgrade",
      toPlan: cheaper,
      priceGbp: monthlyPriceGbp(cheaper) ?? 0,
      credits: monthlyCredits(cheaper) ?? 0,
    });
  }

  if (ctx.reason === "not_using_enough" && ctx.canPause) {
    const days = ctx.pauseDays ?? RETENTION_PAUSE_DAYS;
    if (Number.isFinite(days) && days >= 1) {
      offers.push({ type: "pause", days: Math.round(days) });
    }
  }

  if (ctx.reason === "quality" || ctx.reason === "technical") {
    offers.push({ type: "support", email: SUPPORT_EMAIL });
  }

  return offers;
}

export function offerShownKey(offers: RetentionOffer[]): string | null {
  if (offers.length === 0) return null;
  return offers.map((offer) => offer.type).join(",");
}

export function offerWasShown(offerShown: string | null | undefined, type: RetentionOffer["type"]): boolean {
  if (!offerShown) return false;
  return offerShown.split(",").includes(type);
}

export function formatLongDate(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function countPhrase(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function cancellationConsequences(input: {
  plan: string;
  credits: number;
  projectCount: number;
  generationCount: number;
  isLifetime: boolean;
}): { keep: string[]; ends: string[] } {
  const credits = Math.max(0, input.credits);
  const keep = [
    `The ${credits} credit${credits === 1 ? "" : "s"} already on your account`,
    `Your ${countPhrase(input.projectCount, "project", "projects")} and ${countPhrase(input.generationCount, "sprite", "sprites")}`,
    "The commercial licence on sprites you already generated while this plan was active",
  ];
  if (input.isLifetime) {
    keep.push("Your lifetime access. Cancelling only stops the extra monthly subscription");
  }

  const ends: string[] = [];
  const grant = monthlyCredits(input.plan);
  if (grant) {
    ends.push(`The next monthly grant of ${grant.toLocaleString("en-GB")} credits`);
  }
  const rank = PLAN_RANK[input.plan] ?? 0;
  if (rank >= PLAN_RANK.STARTER) {
    ends.push("A commercial licence on sprites you generate after the plan ends (Free is personal use)");
  }
  if (rank >= PLAN_RANK.PRO) {
    ends.push("AI upscale and variations");
  }
  if (!input.isLifetime) {
    ends.push("The paid plan itself, after the date shown on the last step");
  }
  return { keep, ends };
}

/** Stripe price id for a plan, read at call time so tests can set env first. */
export function priceIdForPlan(plan: "STARTER" | "PRO" | "UNLIMITED"): string | null {
  const raw =
    plan === "STARTER"
      ? process.env.STRIPE_STARTER_PRICE_ID
      : plan === "PRO"
        ? process.env.STRIPE_PRO_PRICE_ID
        : process.env.STRIPE_UNLIMITED_PRICE_ID || process.env.STRIPE_STUDIO_PRICE_ID;
  const id = raw?.trim();
  return id ? id : null;
}
