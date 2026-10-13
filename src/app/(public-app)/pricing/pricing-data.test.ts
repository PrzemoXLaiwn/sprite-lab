import { describe, expect, it } from "vitest";
import { CREDIT_PACKS, LIFETIME_DEALS, PLANS } from "@/lib/stripe";
import { CREDIT_PACK_CARDS, LIFETIME_CARDS, PLAN_CARDS } from "./pricing-data";

// pricing-data.ts is the client-safe mirror used by the landing pricing
// section and the upgrade modal. /pricing reads stripe.ts directly; this keeps
// every other place showing the prices that are actually charged.
describe("pricing display data mirrors stripe.ts", () => {
  it("plans", () => {
    for (const card of PLAN_CARDS) {
      const plan = PLANS[card.id];
      expect([card.name, card.price, card.credits], card.id).toEqual([plan.name, plan.price, plan.credits]);
    }
  });

  it("credit packs", () => {
    for (const card of CREDIT_PACK_CARDS) {
      const pack = CREDIT_PACKS[card.key];
      expect([card.name, card.price, card.credits, card.bonus], card.key).toEqual([pack.name, pack.price, pack.credits, pack.bonus]);
    }
  });

  it("lifetime deals", () => {
    for (const card of LIFETIME_CARDS) {
      const deal = LIFETIME_DEALS[card.key];
      expect([card.name, card.price * 100, card.originalPrice * 100, card.credits, card.maxSlots], card.key).toEqual([
        deal.name,
        deal.price,
        deal.originalPrice,
        deal.credits,
        deal.maxSlots,
      ]);
    }
  });
});
