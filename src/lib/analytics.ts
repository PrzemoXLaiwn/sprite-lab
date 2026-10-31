// Lightweight client-side funnel tracking. Sends events to Vercel Analytics
// (auto-collected by the <Analytics /> component in app/layout.tsx) and to
// Google Ads / Analytics if `gtag` is loaded. No-op on the server.
//
// Use for top-of-funnel and conversion-decision events the team needs to see
// in dashboards — NOT for per-action UI tracking (those live elsewhere).

import { track as vercelTrack } from "@vercel/analytics";

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const checkoutCompleteSent = new Set<string>();

/** One checkout_complete per successful return, including a refresh of the receipt. */
export function trackCheckoutCompleteOnce(dedupeKey: string, props?: Props): void {
  if (typeof window === "undefined") return;
  if (checkoutCompleteSent.has(dedupeKey)) return;
  const storageKey = `spritelab.checkout-complete:${dedupeKey}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) {
      checkoutCompleteSent.add(dedupeKey);
      return;
    }
    window.sessionStorage.setItem(storageKey, "1");
  } catch {
    /* storage blocked — the in-memory set still covers this page load */
  }
  checkoutCompleteSent.add(dedupeKey);
  track(FUNNEL.checkoutComplete, props);
}

export function track(event: string, props?: Props): void {
  if (typeof window === "undefined") return;
  try {
    const safeProps: Record<string, string | number | boolean | null> = {};
    if (props) {
      for (const [k, v] of Object.entries(props)) {
        if (v === undefined) continue;
        safeProps[k] = v;
      }
    }
    vercelTrack(event, safeProps);
  } catch {
    /* swallow — telemetry must never break UX */
  }
  try {
    if (window.gtag) {
      window.gtag("event", event, props ?? {});
    }
  } catch {
    /* swallow */
  }
  try {
    const payload = JSON.stringify({
      name: event,
      path: window.location.pathname,
      referrer: document.referrer,
      search: window.location.search,
      props: props ?? {},
    });
    const body = new Blob([payload], { type: "application/json" });
    if (!navigator.sendBeacon?.("/api/analytics/funnel", body)) {
      void fetch("/api/analytics/funnel", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      });
    }
  } catch {
    /* telemetry must never break UX */
  }
}

export const FUNNEL = {
  signupComplete: "signup_complete",
  firstGenerationAttempt: "first_generation_attempt",
  firstGenerationSuccess: "first_generation_success",
  generationAttempt: "generation_attempt",
  generationSuccess: "generation_success",
  generationError: "generation_error",
  pricingView: "pricing_view",
  checkoutStart: "checkout_start",
  checkoutComplete: "checkout_complete",
  upgradeModalShown: "upgrade_modal_shown",
  upgradeModalClicked: "upgrade_modal_clicked",
  creditsExhausted: "credits_exhausted",
  firstGenerationFailed: "first_generation_failed",
  upsellShown: "upsell_shown",
  upsellClick: "upsell_click",
  offerApplied: "offer_applied",
  // Landing-page guest funnel (no personal data in payloads)
  guestGenerateSuccess: "guest_generate_success",
  guestLimitReached: "guest_limit_reached",
  guestSignupClick: "guest_signup_click",
  guestSpriteClaimed: "guest_sprite_claimed",
  oneTapSignIn: "one_tap_sign_in",
} as const;
