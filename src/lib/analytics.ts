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
} as const;
