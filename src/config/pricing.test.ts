// Structure of prices + a regression guard on unit economics.
// The full margin report (with today's KNOWN_FAILURE rows) is `npm run economics`;
// this test only fails on NEW violations so a price/cost change can't silently
// make another feature lose money.
import { FEATURES } from "@/lib/billing/features";
import { PLANS } from "@/lib/stripe";
import { describe, expect, it } from "vitest";
import { RIG_CREDITS, ROTATIONS, animationCredits } from "./animations";
import { FX_GBP_PER_USD, costGbp, featureCredits, netPerCreditGbp, violations, violationKey } from "./economics";
import { MOVESETS, moveCredits, movesetCredits } from "./movesets";
import { FEATURE_COSTS } from "./provider-costs";
import { KNOWN_MARGIN_VIOLATIONS } from "./economics-known";

describe("unit economics", () => {
  it("has cost data for every paid feature", () => {
    for (const f of Object.keys(featureCredits())) expect(FEATURE_COSTS[f], f).toBeDefined();
  });

  it("uses the documented formula (Pro: $12 → £8.41 net, matching the real charge)", () => {
    expect(netPerCreditGbp({ priceUsd: PLANS.PRO.price, credits: PLANS.PRO.credits }, false) * PLANS.PRO.credits).toBeCloseTo(8.41, 2);
    expect(netPerCreditGbp({ priceUsd: PLANS.PRO.price, credits: PLANS.PRO.credits }, true)).toBeLessThan(netPerCreditGbp({ priceUsd: PLANS.PRO.price, credits: PLANS.PRO.credits }, false));
    expect(costGbp("anim_6", "worst")).toBeGreaterThan(costGbp("anim_6", "central"));
  });

  it("covers the central cost of every feature at the pound price actually charged", () => {
    // economics.ts treats the GBP sticker as USD. This is the charge the customer pays.
    for (const plan of [PLANS.STARTER, PLANS.PRO, PLANS.UNLIMITED]) {
      const netPerCredit = (plan.price * (1 - 0.029) - 0.2) / plan.credits;
      for (const [feature, credits] of Object.entries(featureCredits())) {
        const revenue = credits * netPerCredit;
        expect(revenue, `${feature}@${plan.name}`).toBeGreaterThan(costGbp(feature, "central"));
      }
    }
    expect(animationCredits(4, true)).toBe(16);
  });

  it("returns at least 1.5× the reserved provider cost on Starter, in gross credit value", () => {
    // Starter is the cheapest paid plan: £5 / 250 credits = 2p gross per credit.
    // Provider cost is the operation's reserved estimate (the $0.188 anim_4 figure),
    // converted to GBP at the same FX the economics report uses.
    const perCredit = PLANS.STARTER.price / PLANS.STARTER.credits;
    const reserved: Record<string, number> = {
      style_match: FEATURES.style_match.estCostUsd,
      edit: FEATURES.edit.estCostUsd,
      rig: FEATURES.rig.estCostUsd,
      anim_4: FEATURES.anim_4.estCostUsd,
      anim_6: FEATURES.anim_6.estCostUsd,
      anim_9: FEATURES.anim_9.estCostUsd,
      anim_smooth_4: FEATURES.anim_smooth_4.estCostUsd,
      anim_smooth_6: FEATURES.anim_smooth_6.estCostUsd,
      anim_smooth_9: FEATURES.anim_smooth_9.estCostUsd,
      rotate4: FEATURES.rotate4.estCostUsd,
      rotate8: FEATURES.rotate8.estCostUsd,
      walk4dir: FEATURES.walk4dir.estCostUsd,
    };
    const credits = featureCredits();
    for (const [feature, usd] of Object.entries(reserved)) {
      const revenue = credits[feature] * perCredit;
      expect(revenue, feature).toBeGreaterThanOrEqual(1.5 * usd * FX_GBP_PER_USD - 1e-9);
    }
  });

  it("introduces no NEW margin violations beyond the known list (see npm run economics)", () => {
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
