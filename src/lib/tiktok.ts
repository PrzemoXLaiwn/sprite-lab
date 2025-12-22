// ===========================================
// TikTok Pixel Events Helper
// ===========================================
// Pixel ID: D54A1JBC77U0DP19C6K0
//
// Usage:
//   import { trackTikTokEvent } from "@/lib/tiktok";
//   trackTikTokEvent("CompleteRegistration");
//   trackTikTokEvent("CompletePayment", { value: 9.99, currency: "GBP" });

declare global {
  interface Window {
    ttq?: {
      track: (event: string, params?: Record<string, unknown>) => void;
      identify: (params: Record<string, unknown>) => void;
      page: () => void;
    };
  }
}

// Standard TikTok Events:
// - ViewContent - viewing a product page
// - ClickButton - clicking a button
// - Search - performing a search
// - AddToWishlist - adding to wishlist
// - AddToCart - adding to cart
// - InitiateCheckout - starting checkout
// - AddPaymentInfo - adding payment info
// - CompletePayment - completing purchase
// - PlaceAnOrder - placing an order
// - Contact - contacting business
// - Download - downloading content
// - SubmitForm - submitting a form
// - CompleteRegistration - completing signup
// - Subscribe - subscribing

export type TikTokEvent =
  | "ViewContent"
  | "ClickButton"
  | "Search"
  | "AddToWishlist"
  | "AddToCart"
  | "InitiateCheckout"
  | "AddPaymentInfo"
  | "CompletePayment"
  | "PlaceAnOrder"
  | "Contact"
  | "Download"
  | "SubmitForm"
  | "CompleteRegistration"
  | "Subscribe";

export interface TikTokEventParams {
  // E-commerce
  value?: number;
  currency?: string;
  content_id?: string;
  content_type?: string;
  content_name?: string;
  quantity?: number;

  // Custom
  description?: string;
  query?: string;

  // Any other params
  [key: string]: unknown;
}

/**
 * Track a TikTok Pixel event
 */
export function trackTikTokEvent(event: TikTokEvent, params?: TikTokEventParams): void {
  if (typeof window === "undefined") return;

  try {
    if (window.ttq) {
      window.ttq.track(event, params);
      console.log(`[TikTok Pixel] Tracked: ${event}`, params);
    }
  } catch (error) {
    console.error("[TikTok Pixel] Error tracking event:", error);
  }
}

/**
 * Identify a user (for better matching)
 */
export function identifyTikTokUser(params: {
  email?: string;
  phone_number?: string;
  external_id?: string;
}): void {
  if (typeof window === "undefined") return;

  try {
    if (window.ttq) {
      window.ttq.identify(params);
      console.log("[TikTok Pixel] User identified");
    }
  } catch (error) {
    console.error("[TikTok Pixel] Error identifying user:", error);
  }
}

// ===========================================
// Convenience functions for SpriteLab events
// ===========================================

/**
 * Track user registration
 */
export function trackRegistration(): void {
  trackTikTokEvent("CompleteRegistration");
}

/**
 * Track when user starts checkout
 */
export function trackCheckoutStart(plan: string, value: number): void {
  trackTikTokEvent("InitiateCheckout", {
    content_id: plan.toLowerCase().replace(/\s+/g, "-"),
    content_type: "product",
    content_name: plan,
    value,
    currency: "GBP",
    quantity: 1,
  });
}

/**
 * Track successful purchase
 */
export function trackPurchase(plan: string, value: number): void {
  trackTikTokEvent("CompletePayment", {
    content_id: plan.toLowerCase().replace(/\s+/g, "-"),
    content_type: "product",
    content_name: plan,
    value,
    currency: "GBP",
    quantity: 1,
  });
}

/**
 * Track sprite generation
 */
export function trackGeneration(type: string): void {
  trackTikTokEvent("ViewContent", {
    content_type: "sprite",
    content_name: type,
  });
}

/**
 * Track search/prompt
 */
export function trackSearch(query: string): void {
  trackTikTokEvent("Search", {
    query,
  });
}
