// =============================================================================
// Plan feature lists — single source of truth (client-safe, no Stripe import)
// =============================================================================
// Used by src/lib/stripe.ts (PLANS), the /pricing page, the landing pricing
// section and the upgrade modal. Only list things the product actually does:
// every plan gets all 12 styles, both Standard (1 credit) and HD (3 credits)
// quality, and a transparent PNG on every sprite. Plans differ by monthly
// credits and by the extra tools below. Starter is the lowest price per
// credit (£5 / 250); Studio is the largest monthly allowance.
// =============================================================================

import { SIGNUP_CREDITS } from "@/config/signup";

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
    "250 credits / month",
    "Everything in Free",
    "Commercial license",
  ],
  PRO: [
    "500 credits / month",
    "Everything in Starter",
    "AI upscale 2× / 4×",
    "Variations",
    "Commercial license",
  ],
  UNLIMITED: [
    "1,200 credits / month",
    "Everything in Pro",
    "Most credits per month",
    "Commercial license",
  ],
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;
