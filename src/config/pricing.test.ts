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

describe("unit economics", () => {
  it("has cost data for every paid feature", () => {
    for (const f of Object.keys(featureCredits())) expect(FEATURE_COSTS[f], f).toBeDefined();
  });

  it("uses the documented formula (Pro: $12 → £8.41 net, matching the real charge)", () => {
    expect(netPerCreditGbp({ priceUsd: 12, credits: 500 }, false) * 500).toBeCloseTo(8.41, 2);
    expect(netPerCreditGbp({ priceUsd: 12, credits: 500 }, true)).toBeLessThan(netPerCreditGbp({ priceUsd: 12, credits: 500 }, false));
    expect(costGbp("anim_6", "worst")).toBeGreaterThan(costGbp("anim_6", "central"));
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
