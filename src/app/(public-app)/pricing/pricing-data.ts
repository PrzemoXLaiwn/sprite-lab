// =============================================================================
// Pricing display data — client-safe mirror of src/lib/stripe.ts
// =============================================================================
// PLANS / CREDIT_PACKS / LIFETIME_DEALS live in src/lib/stripe.ts, which
// imports the Stripe Node SDK and must not be bundled into client components.
// This file mirrors the *display* values only (names, credits, prices,
// features). The amounts actually charged are always decided server-side by
// the /api/stripe/* routes from stripe.ts — keep these in sync when they change.
//
// Credit-pack bonuses are only granted while isLaunchPromoActive() is true on
// the server, so UIs must gate bonus display on fetchLaunchPromoStatus().
// =============================================================================

import { PLAN_FEATURES } from "@/config/plan-features";

export type SubscriptionPlanId = "FREE" | "STARTER" | "PRO" | "UNLIMITED";

export interface PlanCard {
  id: SubscriptionPlanId;
  name: string;
  /** Monthly price in whole pounds as displayed. */
  price: number;
  /** Pre-launch reference price shown struck-through on /pricing. */
  oldPrice: number | null;
  credits: number;
  description: string;
  features: readonly string[];
  cta: string;
  featured: boolean;
}

export const PLAN_CARDS: readonly PlanCard[] = [
  {
    id: "FREE",
    name: "Free",
    price: 0,
    oldPrice: null,
    credits: 10,
    description: "Try it free",
    features: PLAN_FEATURES.FREE,
    cta: "Start creating",
    featured: false,
  },
  {
    id: "STARTER",
    name: "Starter",
    price: 5,
    oldPrice: null,
    credits: 250,
    description: "Perfect for indie devs",
    features: PLAN_FEATURES.STARTER,
    cta: "Get Starter",
    featured: false,
  },
  {
    id: "PRO",
    name: "Pro",
    price: 12,
    oldPrice: null,
    credits: 500,
    description: "For serious creators",
    features: PLAN_FEATURES.PRO,
    cta: "Go Pro",
    featured: true,
  },
  {
    id: "UNLIMITED",
    name: "Studio",
    price: 25,
    oldPrice: null,
    credits: 1200,
    description: "For teams & studios",
    features: PLAN_FEATURES.UNLIMITED,
    cta: "Go Studio",
    featured: false,
  },
];

/** URL slug used by /checkout/[plan] for each paid plan. */
export const PLAN_CHECKOUT_SLUG: Record<Exclude<SubscriptionPlanId, "FREE">, string> = {
  STARTER: "starter",
  PRO: "pro",
  UNLIMITED: "studio",
};

export interface CreditPackCard {
  key: "PACK_25" | "PACK_75" | "PACK_200" | "PACK_500";
  /** Slug understood by /checkout/credits/[pack]. */
  slug: string;
  name: string;
  credits: number;
  /** Launch bonus — only granted while the server-side promo is active. */
  bonus: number;
  /** Price in pence. */
  price: number;
  featured?: boolean;
}

export const CREDIT_PACK_CARDS: readonly CreditPackCard[] = [
  { key: "PACK_25", slug: "ember", name: "Ember", credits: 25, bonus: 5, price: 119 },
  { key: "PACK_75", slug: "blaze", name: "Blaze", credits: 75, bonus: 15, price: 299, featured: true },
  { key: "PACK_200", slug: "inferno", name: "Inferno", credits: 200, bonus: 50, price: 799 },
  { key: "PACK_500", slug: "supernova", name: "Supernova", credits: 500, bonus: 150, price: 1999 },
];

export interface LifetimeCard {
  key: "STARTER_LIFETIME" | "PRO_LIFETIME" | "UNLIMITED_LIFETIME";
  /** Slug understood by /checkout/lifetime/[deal]. */
  slug: string;
  name: string;
  credits: number;
  /** Whole pounds. */
  price: number;
  /** Whole pounds — 12 months of the matching subscription. */
  originalPrice: number;
  maxSlots: number;
  featured?: boolean;
}

export const LIFETIME_CARDS: readonly LifetimeCard[] = [
  { key: "STARTER_LIFETIME", slug: "starter_lifetime", name: "Starter Lifetime", credits: 250, price: 49, originalPrice: 60, maxSlots: 30 },
  { key: "PRO_LIFETIME", slug: "pro_lifetime", name: "Pro Lifetime", credits: 500, price: 99, originalPrice: 144, maxSlots: 15, featured: true },
  { key: "UNLIMITED_LIFETIME", slug: "unlimited_lifetime", name: "Studio Lifetime", credits: 1200, price: 249, originalPrice: 300, maxSlots: 5 },
];

export const TOTAL_LIFETIME_SLOTS = LIFETIME_CARDS.reduce((n, d) => n + d.maxSlots, 0);

export interface LifetimeSlotInfo {
  sold: number;
  max: number;
  available: number;
}

export function formatPence(pence: number): string {
  return `£${(pence / 100).toFixed(2)}`;
}
