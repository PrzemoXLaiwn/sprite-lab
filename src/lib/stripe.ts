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
// Pricing strategy: ~£0.02/generation cost, targeting 75-80% margin
export const PLANS = {
  FREE: {
    name: "Spark",
    credits: 15,
    price: 0,
    priceId: null,
    features: [
      "15 generation credits",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "PNG download",
      "7-day gallery storage",
    ],
  },
  STARTER: {
    name: "Forge",
    credits: 75,
    price: 12, // £12/month
    priceId: process.env.STRIPE_STARTER_PRICE_ID,
    features: [
      "75 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "PNG download",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
    ],
  },
  PRO: {
    name: "Apex",
    credits: 250,
    price: 39, // £39/month
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: [
      "250 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "PNG download",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
      "Priority support",
    ],
  },
  UNLIMITED: {
    name: "Titan",
    credits: 750,
    price: 99, // £99/month
    priceId: process.env.STRIPE_UNLIMITED_PRICE_ID,
    features: [
      "750 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "PNG download",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
      "Priority support",
      "Early access to new features",
    ],
  },
} as const;

export type PlanName = keyof typeof PLANS;

// ===========================================
// CREDIT PACKS CONFIGURATION (GBP - British Pounds)
// ===========================================
// 🚀 LAUNCH PROMO: Bonus credits on all packs!
export const LAUNCH_PROMO = {
  enabled: true,
  endDate: "2025-01-31",
};

export const CREDIT_PACKS = {
  PACK_25: {
    name: "Ember",
    credits: 25,
    bonus: 5, // Launch bonus
    price: 499, // £4.99
    priceId: process.env.STRIPE_CREDITS_25_PRICE_ID,
  },
  PACK_60: {
    name: "Blaze",
    credits: 60,
    bonus: 15, // Launch bonus
    price: 999, // £9.99
    priceId: process.env.STRIPE_CREDITS_60_PRICE_ID,
  },
  PACK_150: {
    name: "Inferno",
    credits: 150,
    bonus: 50, // Launch bonus
    price: 1999, // £19.99
    priceId: process.env.STRIPE_CREDITS_150_PRICE_ID,
  },
  PACK_400: {
    name: "Supernova",
    credits: 400,
    bonus: 150, // Launch bonus
    price: 4499, // £44.99
    priceId: process.env.STRIPE_CREDITS_400_PRICE_ID,
  },
} as const;

// ===========================================
// LIFETIME DEALS CONFIGURATION (GBP - British Pounds)
// ⚠️ LIMITED SLOTS - Creates urgency and limits risk!
// ===========================================
// ⚠️ TOTAL 50 LIFETIME SLOTS EVER - Creates massive urgency!
export const LIFETIME_DEALS = {
  STARTER_LIFETIME: {
    name: "Forge Lifetime",
    basePlan: "STARTER",
    credits: 75, // Monthly credits forever
    price: 17900, // £179 (15% margin over 5y cost of £157)
    originalPrice: 28800, // £288 (2 years of monthly)
    priceId: process.env.STRIPE_FORGE_LIFETIME_PRICE_ID,
    maxSlots: 30, // 30 of 50 total slots
  },
  PRO_LIFETIME: {
    name: "Apex Lifetime",
    basePlan: "PRO",
    credits: 250, // Monthly credits forever
    price: 59900, // £599 (15% margin over 5y cost of £525)
    originalPrice: 93600, // £936 (2 years of monthly)
    priceId: process.env.STRIPE_APEX_LIFETIME_PRICE_ID,
    maxSlots: 15, // 15 of 50 total slots
  },
  UNLIMITED_LIFETIME: {
    name: "Titan Lifetime",
    basePlan: "UNLIMITED",
    credits: 750, // Monthly credits forever (matching UNLIMITED plan)
    price: 119900, // £1,199 (15% margin over 5y cost of £1,050)
    originalPrice: 237600, // £2,376 (2 years of monthly)
    priceId: process.env.STRIPE_TITAN_LIFETIME_PRICE_ID,
    maxSlots: 5, // 5 of 50 total slots
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
