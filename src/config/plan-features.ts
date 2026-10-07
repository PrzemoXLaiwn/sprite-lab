// =============================================================================
// Plan feature lists — single source of truth (client-safe, no Stripe import)
// =============================================================================
// Used by src/lib/stripe.ts (PLANS), the /pricing page, the landing pricing
// section and the upgrade modal. Only list things the product actually does:
// every plan gets all 12 styles and both Standard (1 credit) and HD (3 credits)
// quality — plans differ by monthly credits.
// =============================================================================

export const PLAN_FEATURES = {
  FREE: [
    "10 credits to start",
    "All 12 art styles, Standard & HD",
    "Sprite animations (walk, attack…)",
    "Projects + pack export (.zip)",
  ],
  STARTER: [
    "250 credits / month",
    "Everything in Free",
    "Background removal",
    "Image editing",
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
    "Lowest price per credit",
    "Commercial license",
  ],
} as const;

export type PlanFeatureKey = keyof typeof PLAN_FEATURES;
