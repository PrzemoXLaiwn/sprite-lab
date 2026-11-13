"use client";

import { loadStripe } from "@stripe/stripe-js";

let stripePromise: ReturnType<typeof loadStripe> | null = null;

/** Stripe.js loads the first time a checkout form needs it, not on other pages. */
export function getCheckoutStripe() {
  if (!stripePromise) stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  return stripePromise;
}
