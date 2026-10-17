// Display name for a checkout return path. Names come from the public pricing
// cards — this does not decide what Stripe charges.
import {
  CREDIT_PACK_CARDS,
  LIFETIME_CARDS,
  PLAN_CARDS,
  type SubscriptionPlanId,
} from "@/app/(public-app)/pricing/pricing-data";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";

/** URL slug → plan id. Mirrors the checkout page's accepted aliases. */
const PLAN_SLUG: Record<string, Exclude<SubscriptionPlanId, "FREE">> = {
  starter: "STARTER",
  forge: "STARTER",
  pro: "PRO",
  apex: "PRO",
  studio: "UNLIMITED",
  titan: "UNLIMITED",
  unlimited: "UNLIMITED",
};

/** URL slug → credit pack slug on the pricing cards. */
const PACK_SLUG: Record<string, string> = {
  ember: "ember",
  "25": "ember",
  blaze: "blaze",
  "75": "blaze",
  inferno: "inferno",
  "200": "inferno",
  supernova: "supernova",
  "500": "supernova",
};

/** URL slug → lifetime deal slug on the pricing cards. */
const LIFETIME_SLUG: Record<string, string> = {
  starter_lifetime: "starter_lifetime",
  forge_lifetime: "starter_lifetime",
  forge: "starter_lifetime",
  pro_lifetime: "pro_lifetime",
  apex_lifetime: "pro_lifetime",
  apex: "pro_lifetime",
  unlimited_lifetime: "unlimited_lifetime",
  titan_lifetime: "unlimited_lifetime",
  titan: "unlimited_lifetime",
};

/** "Pro", "Blaze", "Pro Lifetime", or null when the path is not a known purchase. */
export function checkoutPurchaseLabel(next: string | null | undefined): string | null {
  const path = safeRedirectPath(next);
  if (!isCheckoutReturn(path)) return null;

  const pathname = path.split(/[?#]/, 1)[0] ?? "";
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "checkout") return null;

  const kind = (parts[1] ?? "").toLowerCase();
  const slug = (parts[2] ?? "").toLowerCase();

  if (kind === "credits") {
    const canonical = PACK_SLUG[slug];
    return canonical ? (CREDIT_PACK_CARDS.find((pack) => pack.slug === canonical)?.name ?? null) : null;
  }

  if (kind === "lifetime") {
    const canonical = LIFETIME_SLUG[slug];
    return canonical ? (LIFETIME_CARDS.find((deal) => deal.slug === canonical)?.name ?? null) : null;
  }

  if (kind === "success" || kind === "") return null;

  const planId = PLAN_SLUG[kind];
  return planId ? (PLAN_CARDS.find((plan) => plan.id === planId)?.name ?? null) : null;
}
