// =============================================================================
// Plan feature lists — single source of truth (client-safe, no Stripe import)
// =============================================================================
// Used by src/lib/stripe.ts (PLANS), the /pricing page, the landing pricing
// section and the upgrade modal. Only list things the product actually does:
// every plan gets all 12 styles, both Standard (1 credit) and HD (3 credits)
// quality, and a transparent PNG on every sprite. Plans differ by monthly
// credits and by the extra tools below. Shelf price per credit, from the
// constants below: Starter £0.020 (£5 / 250), Pro £0.0185 (£12 / 650),
// Studio £0.0167 (£25 / 1,500). Studio is the lowest.
// =============================================================================

import { SIGNUP_CREDITS } from "@/config/signup";

/** Monthly credit allowance for paid plans. Free signup credits live in signup.ts. */
export const PLAN_MONTHLY_CREDITS = {
  STARTER: 250,
  PRO: 650,
  UNLIMITED: 1500,
} as const;

/** Recurring monthly price in GBP. The Starter intro price is not this number. */
export const PLAN_MONTHLY_PRICE_GBP = {
  STARTER: 5,
  PRO: 12,
  UNLIMITED: 25,
} as const;

export const PLAN_FEATURES = {
  FREE: [
    `${SIGNUP_CREDITS} credits to start`,
    "Earn extra credits with quests",
    "All 12 art styles, Standard & HD",
    "Transparent PNG on every sprite",
    "Animations, 4 & 8 directions, AI editing",
    "Projects + pack export (.zip)",
  ],
  STARTER: [
    `${PLAN_MONTHLY_CREDITS.STARTER} credits / month`,
    "Everything in Free",
    "Commercial license",
  ],
  PRO: [
    `${PLAN_MONTHLY_CREDITS.PRO} credits / month`,
    "Everything in Starter",
    "AI upscale 2× / 4×",
    "Variations",
    "Commercial license",
  ],
  UNLIMITED: [
    `${PLAN_MONTHLY_CREDITS.UNLIMITED.toLocaleString("en-GB")} credits / month`,
    "Everything in Pro",
    "Most credits per month",
    "Commercial license",
  ],
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;

export type PaidPlanKey = keyof typeof PLAN_MONTHLY_CREDITS;

const PAID_PLAN_NAMES: Record<PaidPlanKey, string> = {
  STARTER: "Starter",
  PRO: "Pro",
  UNLIMITED: "Studio",
};

/** Shelf price per credit in GBP (price ÷ monthly credits). Not the net after Stripe. */
export function planPricePerCreditGbp(plan: PaidPlanKey): number {
  return PLAN_MONTHLY_PRICE_GBP[plan] / PLAN_MONTHLY_CREDITS[plan];
}

/** Paid monthly plan with the lowest shelf price per credit. */
export function lowestMonthlyPricePerCredit(): { plan: PaidPlanKey; name: string; gbp: number } {
  const plans = (Object.keys(PLAN_MONTHLY_CREDITS) as PaidPlanKey[]).map((plan) => ({
    plan,
    name: PAID_PLAN_NAMES[plan],
    gbp: planPricePerCreditGbp(plan),
  }));
  return plans.reduce((best, row) => (row.gbp < best.gbp ? row : best));
}
