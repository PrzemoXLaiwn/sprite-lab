import { describe, expect, it } from "vitest";
import { LIFETIME_DEALS } from "@/lib/stripe";
import { PLAN_CARDS } from "@/app/(public-app)/pricing/pricing-data";
import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "./plan-features";

function pencePerCredit(priceGbp: number, credits: number): number {
  return (priceGbp * 100) / credits;
}

describe("monthly plan ladder", () => {
  it("makes each higher plan a better price per credit, and marks Starter most popular", () => {
    const starter = pencePerCredit(PLAN_MONTHLY_PRICE_GBP.STARTER, PLAN_MONTHLY_CREDITS.STARTER);
    const pro = pencePerCredit(PLAN_MONTHLY_PRICE_GBP.PRO, PLAN_MONTHLY_CREDITS.PRO);
    const studio = pencePerCredit(PLAN_MONTHLY_PRICE_GBP.UNLIMITED, PLAN_MONTHLY_CREDITS.UNLIMITED);
    expect(pro).toBeLessThan(starter);
    expect(studio).toBeLessThan(pro);
    expect(PLAN_CARDS.find((plan) => plan.featured)?.id).toBe("STARTER");
    expect(PLAN_CARDS.filter((plan) => plan.featured).map((plan) => plan.id)).toEqual(["STARTER"]);
  });

  it("leaves lifetime allowances at the amounts those deals were sold with", () => {
    expect(LIFETIME_DEALS.STARTER_LIFETIME.credits).toBe(250);
    expect(LIFETIME_DEALS.PRO_LIFETIME.credits).toBe(500);
    expect(LIFETIME_DEALS.UNLIMITED_LIFETIME.credits).toBe(1200);
    expect(LIFETIME_DEALS.PRO_LIFETIME.credits).not.toBe(PLAN_MONTHLY_CREDITS.PRO);
    expect(LIFETIME_DEALS.UNLIMITED_LIFETIME.credits).not.toBe(PLAN_MONTHLY_CREDITS.UNLIMITED);
  });
});
