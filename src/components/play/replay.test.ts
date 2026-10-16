import { describe, expect, it } from "vitest";
import { simulateRun } from "@/lib/dungeon/simulate";
import { deriveParty } from "@/lib/dungeon/stats";
import type { Leaderboard } from "@/lib/dungeon/store";
import { boardAfterRun, removeHero, setGear, setHero, wornBy } from "./party-edit";
import { buildTimeline, stepAt } from "./replay";

const party = deriveParty([
  { hero: { id: "a", categoryId: "CHARACTERS", styleId: "PIXEL_ART_16", animated: true, hd: false }, trinket: { id: "t", categoryId: "CONSUMABLES", styleId: "A", animated: false, hd: false } },
  { hero: { id: "b", categoryId: "CREATURES", styleId: "CARTOON", animated: false, hd: false } },
]);

describe("replay timeline", () => {
  it("only replays the log: one step per action, the fall is on the logged floor", () => {
    const log = simulateRun(party, 99);
    const { steps, total } = buildTimeline(log);
    expect(total).toBeGreaterThan(0);
    expect(steps.at(-1)!.kind).toBe("end");
    expect(steps.filter((s) => s.kind === "act")).toHaveLength(log.floors.reduce((a, f) => a + f.actions.length, 0));
    const fall = steps.find((s) => s.kind === "fall")!;
    expect(fall.floor).toBe(log.floor);
    expect(fall.partyHp.every((h) => h <= 0)).toBe(true);
    for (const s of steps.filter((x) => x.kind === "clear")) {
      const next = log.floors[s.floorIndex + 1];
      s.partyHp.forEach((h, i) => expect(next.partyHpStart[i]).toBeGreaterThanOrEqual(h));
    }
  });

  it("finds the step playing at any time", () => {
    const { steps, total } = buildTimeline(simulateRun(party, 5));
    expect(stepAt(steps, 0)).toBe(0);
    expect(steps[stepAt(steps, total)].kind).toBe("end");
    expect(steps[stepAt(steps, total + 10_000)].kind).toBe("end");
    const mid = steps[Math.floor(steps.length / 2)];
    expect(stepAt(steps, mid.start + 1)).toBe(steps.indexOf(mid));
  });
});

describe("party editing on the page", () => {
  const slots = [{ hero: "h1", weapon: "w1" }, { hero: "h2" }];

  it("moving an item to another hero takes it off the first one", () => {
    expect(setGear(slots, 1, "weapon", "w1")).toEqual([{ hero: "h1" }, { hero: "h2", weapon: "w1" }]);
    expect(setGear(slots, 0, "weapon", null)).toEqual([{ hero: "h1" }, { hero: "h2" }]);
    expect(wornBy(slots, "w1")).toBe(0);
    expect(wornBy(slots, "h2")).toBe(1);
    expect(wornBy(slots, "nope")).toBe(-1);
  });

  it("adds, swaps and removes heroes; a hero can't be in the party twice", () => {
    expect(setHero(slots, 2, "h3")).toEqual([...slots, { hero: "h3" }]);
    expect(setHero(slots, 0, "h9")).toEqual([{ hero: "h9", weapon: "w1" }, { hero: "h2" }]);
    expect(setHero(slots, 0, "h2")).toBe(slots);
    expect(removeHero(slots, 0)).toEqual([{ hero: "h2" }]);
  });
});

describe("leaderboard after a run", () => {
  const empty: Leaderboard = { week: "2026-W42", resetsAt: "", players: 0, top: [], me: null };
  const fresh: Leaderboard = { ...empty, players: 1, top: [{ rank: 1, name: "ana", floor: 7, you: true }], me: { rank: 1, name: "ana", floor: 7, you: true } };

  it("takes the board the server read after storing the run (no stale 'No runs yet')", () => {
    expect(boardAfterRun(empty, fresh)).toBe(fresh);
    expect(boardAfterRun(null, fresh)).toBe(fresh);
    expect(boardAfterRun(empty, undefined)).toBe(empty);
  });
});
