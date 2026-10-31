import { describe, expect, it } from "vitest";
import { CREDIT_PACKS } from "@/lib/stripe";
import { CREDIT_PACK_CARDS } from "@/app/(public-app)/pricing/pricing-data";
import {
  SHORTFALL_PACK,
  chooseUpgradeView,
  creditCostFromPayload,
  isCreditShortfall,
  shortfallCopy,
} from "@/config/credit-shortfall";

describe("credit shortfall", () => {
  it("uses the £2.99 pack and stays aligned with the charged pack", () => {
    const card = CREDIT_PACK_CARDS.find((pack) => pack.key === "PACK_75");
    const charged = CREDIT_PACKS.PACK_75;
    expect(card?.featured).toBe(true);
    expect(SHORTFALL_PACK).toMatchObject({
      key: "PACK_75",
      name: charged.name,
      credits: charged.credits,
      pricePence: charged.price,
      href: "/checkout/credits/blaze",
    });
    expect(charged.price).toBe(299);
    expect(charged.credits).toBe(75);
  });

  it("treats a non-zero balance that cannot cover the action as a shortfall", () => {
    expect(isCreditShortfall({ balance: 9, cost: 12 })).toBe(true);
    expect(isCreditShortfall({ balance: 9, cost: null })).toBe(true);
    expect(isCreditShortfall({ balance: 0, cost: 12 })).toBe(false);
    expect(isCreditShortfall({ balance: 12, cost: 12 })).toBe(false);
    expect(isCreditShortfall({ balance: null, cost: 12 })).toBe(false);
    expect(isCreditShortfall({ balance: Number.POSITIVE_INFINITY, cost: 12 })).toBe(false);
  });

  it("prefers the pack view over the Starter upsell when credits remain", () => {
    expect(chooseUpgradeView({ balance: 9, cost: 12, starterEligible: true })).toBe("shortfall");
    expect(chooseUpgradeView({ balance: 0, cost: 7, starterEligible: true })).toBe("starter");
    expect(chooseUpgradeView({ balance: 0, cost: 7, starterEligible: false })).toBe("plans");
    expect(chooseUpgradeView({ balance: null, cost: 7, starterEligible: true })).toBe("starter");
    expect(chooseUpgradeView({ balance: null, starterEligible: false })).toBe("plans");
  });

  it("reads the cost from the existing 402 sentence", () => {
    expect(creditCostFromPayload({ error: "This costs 12 credits." })).toBe(12);
    expect(creditCostFromPayload({ error: "Not enough credits. You need 3 credits." })).toBe(3);
    expect(creditCostFromPayload({ error: "Editing costs 5 credits." })).toBe(5);
    expect(creditCostFromPayload({ creditsRequired: 8, error: "nope" })).toBe(8);
    expect(creditCostFromPayload({ error: "Something else" })).toBeUndefined();
    expect(creditCostFromPayload(null)).toBeUndefined();
  });

  it("says what it costs and what you have, and leads with the pack", () => {
    const copy = shortfallCopy({ cost: 12, balance: 9, offerEnabled: false });
    expect(copy.title).toBe("This costs 12 credits");
    expect(copy.detail).toBe("You have 9.");
    expect(copy.packCta).toBe("Get 75 credits · £2.99");
    expect(copy.packHref).toBe("/checkout/credits/blaze");
    expect(copy.packNote).toMatch(/does not include a commercial licence/);
    expect(copy.starterCta).toMatch(/commercial licence/);
    expect(copy.starterHref).toBe("/checkout/starter");
    expect(copy.title).not.toBe("Out of credits");
  });

  it("keeps the Starter intro price on the secondary link when the offer is on", () => {
    const copy = shortfallCopy({ cost: null, balance: 4, offerEnabled: true });
    expect(copy.title).toBe("This costs more than you have");
    expect(copy.starterPrice).toBe("£3 today, then £5/month");
    expect(copy.starterHref).toBe("/checkout/starter?offer=first3");
  });
});
