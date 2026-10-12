// Every paid action must cost the user more than it costs us — even for the
// customer who gets the cheapest credits (the biggest monthly plan).
//
// Provider costs are the real averages from generations.replicate_cost
// (Oct 2026); Claude is the animation planner call. Update them when the
// models or their prices change.

import { describe, expect, it } from "vitest";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "./animations";
import { MOVESETS, moveCredits, movesetCredits } from "./movesets";
import { PLANS } from "@/lib/stripe";

const CLAUDE_PLANNER_USD = 0.03;

/** Average provider cost in USD, keyed by action. */
const PROVIDER_COST: Record<string, number> = {
  "anim:4": 0.069 + CLAUDE_PLANNER_USD,
  "anim:6": 0.117 + CLAUDE_PLANNER_USD,
  "anim:9": 0.103 + CLAUDE_PLANNER_USD,
  "smooth:4": 0.142 + CLAUDE_PLANNER_USD,
  "smooth:6": 0.206 + CLAUDE_PLANNER_USD,
  "smooth:9": 0.206 + CLAUDE_PLANNER_USD,
  rotate4: 0.069,
  rotate8: 0.137,
  walk4dir: 0.206,
  rig: 0.03, // Claude joints only, image work is local
};

// Monthly plans only: lifetime deals are priced on a different basis
const paidPlans = Object.values(PLANS).filter((p) => p.price > 0);
const cheapestCreditUsd = Math.min(...paidPlans.map((p) => p.price / p.credits));

const revenue = (credits: number) => credits * cheapestCreditUsd;

describe("pricing covers provider cost", () => {
  it("knows the cheapest credit price", () => {
    expect(cheapestCreditUsd).toBeGreaterThan(0.015);
  });

  for (const o of ANIMATION_FRAME_OPTIONS) {
    it(`AI animation ${o.frames} frames`, () => {
      expect(revenue(animationCredits(o.frames, false))).toBeGreaterThan(PROVIDER_COST[`anim:${o.frames}`]);
    });
    it(`smooth AI animation ${o.frames} frames`, () => {
      expect(revenue(animationCredits(o.frames, true))).toBeGreaterThan(PROVIDER_COST[`smooth:${o.frames}`]);
    });
  }

  for (const r of ROTATIONS) {
    it(`${r.label}`, () => {
      expect(revenue(r.credits)).toBeGreaterThan(PROVIDER_COST[r.id]);
    });
  }

  it("rig idle", () => {
    expect(revenue(RIG_CREDITS)).toBeGreaterThan(PROVIDER_COST.rig);
  });
});

describe("move sets", () => {
  it("total equals the sum of each move", () => {
    for (const set of MOVESETS) {
      expect(movesetCredits(set)).toBe(set.moves.reduce((a, m) => a + moveCredits(m), 0));
    }
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
