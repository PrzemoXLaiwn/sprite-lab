// Copy and routing for a generation that costs more than a non-zero balance.
// Display only. Pack price and credits are checked against pricing-data in tests.

import { CREDIT_PACK_CARDS, formatPence } from "@/app/(public-app)/pricing/pricing-data";
import {
  starterCheckoutHref,
  starterCheckoutOfferLine,
  starterRegularPitch,
} from "@/config/starter-first-month";

const blaze = CREDIT_PACK_CARDS.find((pack) => pack.key === "PACK_75");
if (!blaze) throw new Error("PACK_75 is missing from pricing-data");

/** The £2.99 pack. Primary action when the user still has some credits. */
export const SHORTFALL_PACK = {
  key: blaze.key,
  name: blaze.name,
  credits: blaze.credits,
  pricePence: blaze.price,
  href: `/checkout/credits/${blaze.slug}`,
} as const;

export type UpgradeView = "shortfall" | "starter" | "plans";

/**
 * A 402 with credits still on the account is a shortfall, not an empty balance.
 * Unknown balance keeps the previous starter / plans choice.
 */
export function chooseUpgradeView(input: {
  balance: number | null;
  cost?: number | null;
  starterEligible: boolean;
}): UpgradeView {
  if (isCreditShortfall({ balance: input.balance, cost: input.cost })) return "shortfall";
  if (input.starterEligible) return "starter";
  return "plans";
}

export function isCreditShortfall(input: {
  balance: number | null;
  cost?: number | null;
}): boolean {
  if (input.balance == null || !Number.isFinite(input.balance) || input.balance <= 0) return false;
  if (input.cost == null || !Number.isFinite(input.cost)) return true;
  return input.cost > input.balance;
}

/** Pull a credit cost out of the API's existing 402 sentence. */
export function creditCostFromPayload(data: { error?: unknown; creditsRequired?: unknown } | null | undefined): number | undefined {
  const explicit = data?.creditsRequired;
  if (typeof explicit === "number" && Number.isInteger(explicit) && explicit > 0) return explicit;
  const message = typeof data?.error === "string" ? data.error : "";
  const match = message.match(/(\d+)\s+credits?\b/i);
  if (!match) return undefined;
  const cost = Number(match[1]);
  return Number.isInteger(cost) && cost > 0 ? cost : undefined;
}

export function shortfallCopy(input: { cost: number | null; balance: number; offerEnabled: boolean }) {
  const price = formatPence(SHORTFALL_PACK.pricePence);
  return {
    title: input.cost != null ? `This costs ${input.cost} credits` : "This costs more than you have",
    detail: `You have ${input.balance}.`,
    packCta: `Get ${SHORTFALL_PACK.credits} credits · ${price}`,
    packHref: SHORTFALL_PACK.href,
    packNote: "One-time pack. It adds credits and does not include a commercial licence.",
    starterCta: "Starter — commercial licence",
    starterPrice: input.offerEnabled ? starterCheckoutOfferLine() : starterRegularPitch(),
    starterHref: starterCheckoutHref(input.offerEnabled),
    plansHref: "/pricing",
  };
}
