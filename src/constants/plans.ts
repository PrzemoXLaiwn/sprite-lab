// =============================================================================
// SPRITELAB — CANONICAL PRICING SOURCE OF TRUTH
// =============================================================================
// This is THE single source of truth for all plan data.
// Used by: UI components, API routes, Stripe webhook, credit logic.
//
// IMPORTANT: The Prisma schema stores `plan` as a plain String field.
// Valid string values: "FREE" | "STARTER" | "PRO" | "UNLIMITED"
// The UNLIMITED plan displays as "Studio" in the UI.
//
// Currency: GBP (British Pounds) — prices are in whole pounds (not pence).
// Stripe prices are in PENCE (multiply by 100 when creating sessions).
// =============================================================================

export type PlanId = "FREE" | "STARTER" | "PRO" | "UNLIMITED";

export interface PlanConfig {
  /** The DB/enum key — matches the `plan` string stored in the User table */
  id: PlanId;
  /** Human-readable name shown in UI (may differ from id, e.g. UNLIMITED → "Studio") */
  displayName: string;
  /** Short tagline shown under the plan name */
  description: string;
  /** Monthly price in GBP whole pounds. null = free forever */
  price: number | null;
  /** ISO 4217 currency code */
  currency: "GBP" | null;
  /** Credits granted per billing cycle */
  creditsPerMonth: number;
  /** Stripe recurring price ID. null for FREE. Read from env at runtime. */
  stripePriceId: string | null;
  /** Features shown on pricing page */
  features: string[];
  /** Runware model tier used for this plan */
  model: "FLUX.1 Schnell" | "FLUX.1 Dev" | "FLUX.1.1 Pro";
  /**
   * Whether this plan appears in the public-facing pricing UI.
   * STARTER is hidden (legacy plan — existing users keep it, new users
   * cannot select it). Set to false to suppress without deleting.
   */
  isPublic: boolean;
}

// -----------------------------------------------------------------------------
// PLAN DEFINITIONS
// -----------------------------------------------------------------------------

export const PLAN_DETAILS: Record<PlanId, PlanConfig> = {
  FREE: {
    id: "FREE",
    displayName: "Free",
    description: "Try it out",
    price: null,
    currency: null,
    creditsPerMonth: 50,
    stripePriceId: null,
    features: [
      "50 generation credits / month",
      "All asset categories",
      "All art styles",
      "PNG download",
      "Commercial license",
    ],
    model: "FLUX.1 Schnell",
    isPublic: true,
  },

  STARTER: {
    id: "STARTER",
    displayName: "Starter",
    description: "For hobbyists",
    price: 5,
    currency: "GBP",
    creditsPerMonth: 250,
    // Reads from env — will be null if env var not set (safe, just means
    // new checkouts can't be created for this plan, which is intentional).
    stripePriceId: process.env.STRIPE_STARTER_PRICE_ID ?? null,
    features: [
      "250 credits / month",
      "All art styles",
      "Background removal",
      "30-day storage",
      "Commercial license",
    ],
    model: "FLUX.1 Schnell",
    // Hidden from public pricing UI — legacy plan, existing users keep it.
    isPublic: false,
  },

  PRO: {
    id: "PRO",
    displayName: "Pro",
    description: "For indie developers",
    price: 9,
    currency: "GBP",
    creditsPerMonth: 500,
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID ?? null,
    features: [
      "500 credits / month",
      "All asset categories & styles",
      "Batch / pack generation",
      "Sprite Sheet Generator",
      "Background removal",
      "PNG + Unity + Godot export",
    ],
    model: "FLUX.1 Dev",
    isPublic: true,
  },

  UNLIMITED: {
    id: "UNLIMITED",
    // NOTE: The UI calls this "Studio". The DB enum key is "UNLIMITED".
    // Always use displayName when showing to users.
    displayName: "Studio",
    description: "For teams & power users",
    price: 29,
    currency: "GBP",
    creditsPerMonth: 3000,
    stripePriceId: process.env.STRIPE_UNLIMITED_PRICE_ID ?? null,
    features: [
      "3000 credits / month",
      "Everything in Pro",
      "Priority generation queue",
      "Style library & presets",
      "Priority support",
      "Early access to features",
    ],
    model: "FLUX.1.1 Pro",
    isPublic: true,
  },
};

// -----------------------------------------------------------------------------
// DERIVED EXPORTS
// -----------------------------------------------------------------------------

/**
 * Plans shown in the public-facing pricing UI.
 * Ordered: Free → Pro → Studio (STARTER is excluded — legacy only).
 */
export const PUBLIC_PLANS: PlanConfig[] = [
  PLAN_DETAILS.FREE,
  PLAN_DETAILS.PRO,
  PLAN_DETAILS.UNLIMITED,
];

/**
 * All plan IDs that are valid in the database.
 * Used for runtime validation.
 */
export const ALL_PLAN_IDS: PlanId[] = ["FREE", "STARTER", "PRO", "UNLIMITED"];

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Look up a plan by its Stripe recurring price ID.
 * Used in the Stripe webhook to map an incoming price ID to a plan.
 *
 * @returns The PlanId string ("FREE" | "STARTER" | "PRO" | "UNLIMITED")
 *          or null if the price ID is not recognised.
 */
export function getPlanByStripePriceId(priceId: string): PlanId | null {
  for (const [id, config] of Object.entries(PLAN_DETAILS) as [
    PlanId,
    PlanConfig,
  ][]) {
    if (config.stripePriceId && config.stripePriceId === priceId) {
      return id;
    }
  }
  return null;
}

/**
 * Get the monthly credit allowance for a plan.
 * Safe fallback: returns FREE credits (50) for unknown plan strings.
 *
 * @param planId - The plan string stored in the database (e.g. "PRO")
 */
export function getCreditsForPlan(planId: string): number {
  const plan = PLAN_DETAILS[planId as PlanId];
  return plan?.creditsPerMonth ?? PLAN_DETAILS.FREE.creditsPerMonth;
}

/**
 * Get the display name for a plan ID.
 * Resolves the UNLIMITED → "Studio" mapping and handles unknowns gracefully.
 *
 * @param planId - The plan string stored in the database
 */
export function getPlanDisplayName(planId: string): string {
  const plan = PLAN_DETAILS[planId as PlanId];
  return plan?.displayName ?? planId;
}

/**
 * Check whether a plan string is a valid known plan ID.
 */
export function isValidPlanId(planId: string): planId is PlanId {
  return ALL_PLAN_IDS.includes(planId as PlanId);
}

/**
 * Get full plan config by ID. Returns null for unknown plan strings.
 */
export function getPlanById(planId: string): PlanConfig | null {
  return PLAN_DETAILS[planId as PlanId] ?? null;
}
