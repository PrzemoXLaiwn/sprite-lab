// =============================================================================
// Plan feature lists — single source of truth (client-safe, no Stripe import)
// =============================================================================
// Used by src/lib/stripe.ts (PLANS), the /pricing page, the landing pricing
// section and the upgrade modal. Only list things the product actually does:
// every plan gets all 12 styles, both Standard (1 credit) and HD (3 credits)
// quality, and a transparent PNG on every sprite. Plans differ by monthly
// credits, by a few extra tools, and by licence. Commercial use is included
// on Starter, Pro and Studio only. Free is personal, non-commercial use.
// Starter is the lowest price per credit (£5 / 250); Studio is the largest
// monthly allowance.
// =============================================================================

import { SIGNUP_CREDITS } from "@/config/signup";

/** Monthly credit allowance for paid plans. Free signup credits live in signup.ts. */
export const PLAN_MONTHLY_CREDITS = {
  STARTER: 250,
  PRO: 500,
  UNLIMITED: 1200,
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
    "Personal, non-commercial use",
  ],
  STARTER: [
    `${PLAN_MONTHLY_CREDITS.STARTER} credits / month`,
    "Everything in Free",
    "Commercial licence",
  ],
  PRO: [
    `${PLAN_MONTHLY_CREDITS.PRO} credits / month`,
    "Everything in Starter",
    "AI upscale 2× / 4×",
    "Variations",
    "Commercial licence",
  ],
  UNLIMITED: [
    `${PLAN_MONTHLY_CREDITS.UNLIMITED.toLocaleString("en-GB")} credits / month`,
    "Everything in Pro",
    "Most credits per month",
    "Commercial licence",
  ],
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;
