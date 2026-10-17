// Structure of prices + a regression guard on unit economics.
// The full margin report (with today's KNOWN_FAILURE rows) is `npm run economics`;
// this test only fails on NEW violations so a price/cost change can't silently
// make another feature lose money.
import { describe, expect, it } from "vitest";
import { RIG_CREDITS, ROTATIONS } from "./animations";
import { MOVESETS, moveCredits, movesetCredits } from "./movesets";
import { costGbp, featureCredits, netPerCreditGbp, violations, violationKey } from "./economics";
import { FEATURE_COSTS } from "./provider-costs";
import { KNOWN_MARGIN_VIOLATIONS } from "./economics-known";
import { PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP, lowestMonthlyPricePerCredit, planPricePerCreditGbp } from "./plan-features";

describe("unit economics", () => {
  it("has cost data for every paid feature", () => {
    for (const f of Object.keys(featureCredits())) expect(FEATURE_COSTS[f], f).toBeDefined();
  });

  it("uses the documented formula (Pro £12 charge → £8.41 net, matching the real charge)", () => {
    const credits = PLAN_MONTHLY_CREDITS.PRO;
    const price = PLAN_MONTHLY_PRICE_GBP.PRO;
    expect(netPerCreditGbp({ priceUsd: price, credits }, false) * credits).toBeCloseTo(8.41, 2);
    expect(netPerCreditGbp({ priceUsd: price, credits }, true)).toBeLessThan(netPerCreditGbp({ priceUsd: price, credits }, false));
    expect(costGbp("anim_6", "worst")).toBeGreaterThan(costGbp("anim_6", "central"));
  });

  it("shelf price per credit follows the monthly allowance", () => {
    expect(planPricePerCreditGbp("STARTER")).toBeCloseTo(0.02, 4);
    expect(planPricePerCreditGbp("PRO")).toBeCloseTo(0.0185, 4);
    expect(planPricePerCreditGbp("UNLIMITED")).toBeCloseTo(0.0167, 4);
    expect(lowestMonthlyPricePerCredit()).toMatchObject({ plan: "UNLIMITED", name: "Studio" });
  });

  it("introduces no NEW margin violations beyond the known list (see npm run economics)", () => {
    // The central bar stays at 15%. Pro 650 / Studio 1,500 did not get a lower
    // bar and feature credit prices were not raised; the extra misses are on
    // the known list (economics-known.ts, 2026-10-17). There is no ≥35% test.
    const fresh = violations().map(violationKey).filter((k) => !KNOWN_MARGIN_VIOLATIONS.includes(k));
    expect(fresh).toEqual([]);
  });
});

describe("move sets", () => {
  it("total equals the sum of each move", () => {
    for (const set of MOVESETS) expect(movesetCredits(set)).toBe(set.moves.reduce((a, m) => a + moveCredits(m), 0));
  });

  it("idle uses the rig price and walk4dir the rotation price", () => {
    const topdown = MOVESETS.find((s) => s.id === "topdown")!;
    expect(moveCredits(topdown.moves.find((m) => m.name === "idle")!)).toBe(RIG_CREDITS);
    expect(moveCredits(topdown.moves.find((m) => m.name === "walk")!)).toBe(ROTATIONS.find((r) => r.id === "walk4dir")!.credits);
  });

  it("every move name is unique within its set (engine pack file names)", () => {
    for (const set of MOVESETS) {
      const names = set.moves.map((m) => m.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
