import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-11-17.clover",
  typescript: true,
});

// ===========================================
// PLAN CONFIGURATION (GBP - British Pounds)
// ===========================================
// COST BREAKDOWN (Runware API):
// - flux-schnell: ~$0.003/image (fast, good quality)
// - flux-dev: ~$0.01/image (premium quality)
// - Stripe fee: 2.9% + £0.20 per transaction
//
// PRICING STRATEGY:
// - Free: 5 credits (schnell) - marketing cost ~$0.015
// - Starter: 250 credits (schnell) @ £5 - cost ~$0.75, margin 85%
// - Pro: 500 credits (dev) @ £12 - cost ~$5, margin 58%
// - Studio: 1200 credits (dev) @ £25 - cost ~$12, margin 52%
export const PLANS = {
  FREE: {
    name: "Free",
    credits: 5,
    price: 0,
    priceId: null,
    features: [
      "5 generation credits",
      "All asset categories",
      "Fast AI model",
      "PNG downloads",
    ],
  },
  STARTER: {
    name: "Starter",
    credits: 250,
    price: 5.00,
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "250 credits/month",
      "All art styles",
      "Fast AI model",
      "Background removal",
      "30-day storage",
      "Commercial license",
    ],
  },
  PRO: {
    name: "Pro",
    credits: 500,
    price: 12.00,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "500 credits/month",
      "Premium AI model",
      "Best quality output",
      "Sprite sheets",
      "Image editing",
      "Unlimited storage",
      "Commercial license",
    ],
  },
  UNLIMITED: {
    name: "Studio",
    credits: 1200,
    price: 25.00,
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID,
    features: [
      "1200 credits/month",
      "Everything in Pro",
      "Priority support",
      "Early access",
      "Custom styles",
      "API access (soon)",
    ],
  },
} as const;

export type PlanName = keyof typeof PLANS;

// ===========================================
// CREDIT PACKS CONFIGURATION (GBP - British Pounds)
// ===========================================
// Pay-as-you-go option for casual users
// PRICING: Must cover AI cost (~£0.024/gen flux-dev) + Stripe (~2.9%+£0.20) + margin (min 25%)
export const LAUNCH_PROMO = {
  enabled: true,
  // Dynamic - always 7 days from now for urgency
  get endDate() {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
  },
};

export const CREDIT_PACKS = {
  PACK_25: {
    name: "Ember",
    credits: 25,
    bonus: 5, // Launch bonus - 30 total! (£0.040/credit effective)
    price: 119, // £1.19 - cost £0.60+£0.23 = £0.83, profit £0.36, margin 30%
    priceId: process.env.STRIPE_CREDITS_25_PRICE_ID,
  },
  PACK_75: {
    name: "Blaze",
    credits: 75,
    bonus: 15, // Launch bonus - 90 total! (£0.033/credit effective)
    price: 299, // £2.99 - cost £1.80+£0.29 = £2.09, profit £0.90, margin 30%
    priceId: process.env.STRIPE_CREDITS_75_PRICE_ID,
  },
  PACK_200: {
    name: "Inferno",
    credits: 200,
    bonus: 50, // Launch bonus - 250 total! (£0.032/credit effective)
    price: 799, // £7.99 - cost £4.80+£0.43 = £5.23, profit £2.76, margin 35%
    priceId: process.env.STRIPE_CREDITS_200_PRICE_ID,
  },
  PACK_500: {
    name: "Supernova",
    credits: 500,
    bonus: 150, // Launch bonus - 650 total! (£0.031/credit effective) BEST VALUE
    price: 1999, // £19.99 - cost £12.00+£0.78 = £12.78, profit £7.21, margin 36%
    priceId: process.env.STRIPE_CREDITS_500_PRICE_ID,
  },
} as const;

// ===========================================
// LIFETIME DEALS CONFIGURATION (GBP - British Pounds)
// ⚠️ LIMITED SLOTS - Creates urgency and limits risk!
// ===========================================
// ⚠️ TOTAL 50 LIFETIME SLOTS EVER - Creates massive urgency!
//
// RISK CALCULATION (assuming 5-year lifetime at £0.024/gen flux-dev):
// - Forge: 50 credits/month * 60 months = 3000 credits * £0.024 = £72 cost
//   Price £49 = LOSS but drives upgrades and word-of-mouth
// - Apex: 150 credits/month * 60 months = 9000 credits * £0.024 = £216 cost
//   Price £99 = LOSS but very limited slots
// - Titan: 500 credits/month * 60 months = 30000 credits * £0.024 = £720 cost
//   Price £249 = LOSS but only 5 slots, drives FOMO
//
// Strategy: Lifetime deals are LOSS LEADERS to build community and word-of-mouth
export const LIFETIME_DEALS = {
  STARTER_LIFETIME: {
    name: "Forge Lifetime",
    basePlan: "STARTER",
    credits: 50, // Monthly credits forever (matching new STARTER plan)
    price: 4900, // £49 (~19.7 months of £2.49)
    originalPrice: 5976, // £59.76 (2 years of monthly)
    priceId: process.env.STRIPE_FORGE_LIFETIME_PRICE_ID,
    maxSlots: 30, // 30 of 50 total slots
  },
  PRO_LIFETIME: {
    name: "Apex Lifetime",
    basePlan: "PRO",
    credits: 150, // Monthly credits forever (matching new PRO plan)
    price: 9900, // £99 (~16.5 months of £5.99)
    originalPrice: 14376, // £143.76 (2 years of monthly)
    priceId: process.env.STRIPE_APEX_LIFETIME_PRICE_ID,
    maxSlots: 15, // 15 of 50 total slots
  },
  UNLIMITED_LIFETIME: {
    name: "Titan Lifetime",
    basePlan: "UNLIMITED",
    credits: 500, // Monthly credits forever (matching new UNLIMITED plan)
    price: 24900, // £249 (~14.7 months of £16.99)
    originalPrice: 40776, // £407.76 (2 years of monthly)
    priceId: process.env.STRIPE_TITAN_LIFETIME_PRICE_ID,
    maxSlots: 5, // 5 of 50 total slots - ULTRA RARE!
  },
} as const;

// Total lifetime slots available: 30 + 15 + 5 = 50

export type LifetimeDealName = keyof typeof LIFETIME_DEALS;

export type CreditPackName = keyof typeof CREDIT_PACKS;

/**
 * Get credit pack by credits amount
 */
export function getCreditPackByCredits(credits: number): typeof CREDIT_PACKS[CreditPackName] | null {
  for (const pack of Object.values(CREDIT_PACKS)) {
    if (pack.credits === credits) {
      return pack;
    }
  }
  return null;
}

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get plan details by name
 */
export function getPlanByName(planName: string): typeof PLANS[PlanName] | null {
  const plan = PLANS[planName as PlanName];
  return plan || null;
}

/**
 * Get plan name by Stripe price ID
 */
export function getPlanByPriceId(priceId: string): PlanName | null {
  for (const [planName, plan] of Object.entries(PLANS)) {
    if (plan.priceId === priceId) {
      return planName as PlanName;
    }
  }
  return null;
}

/**
 * Check if user has premium access
 */
export function hasPremiumAccess(plan: string, role: string): boolean {
  return plan !== "FREE" || role === "OWNER" || role === "ADMIN";
}

/**
 * Get credits for plan
 */
export function getCreditsForPlan(planName: string): number {
  const plan = getPlanByName(planName);
  return plan?.credits || 5;
}

/**
 * Format price for display (GBP)
 */
export function formatPrice(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
  }).format(pence / 100);
}

/**
 * Create or retrieve Stripe customer
 */
export async function getOrCreateStripeCustomer(
  userId: string,
  email: string
): Promise<string> {
  const { default: prisma } = await import("./prisma");

  // Check if user already has a Stripe customer ID
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true },
  });

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Save customer ID to database
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
}

/**
 * Create checkout session for subscriptions
 */
export async function createCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
    subscription_data: {
      metadata: {
        userId,
      },
    },
  });

  return session;
}

/**
 * Create checkout session for one-time credit pack purchases
 */
export async function createCreditPackCheckoutSession(
  userId: string,
  email: string,
  priceId: string,
  credits: number,
  successUrl: string,
  cancelUrl: string
): Promise<Stripe.Checkout.Session> {
  const customerId = await getOrCreateStripeCustomer(userId, email);

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      type: "credit_pack",
      credits: credits.toString(),
    },
  });

  return session;
}

/**
 * Create customer portal session
 */
export async function createPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return session;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.cancel(subscriptionId);
  return subscription;
}

/**
 * Update subscription
 */
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "create_prorations",
  });

  return updatedSubscription;
}
