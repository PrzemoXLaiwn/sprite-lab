import { describe, expect, it } from "vitest";
import { simulateRun } from "@/lib/dungeon/simulate";
import { deriveParty } from "@/lib/dungeon/stats";
import { buildTimeline, stepAt } from "./replay";

const party = deriveParty([
  { id: "a", categoryId: "CHARACTERS", styleId: "PIXEL_ART_16", animated: true, hd: false },
  { id: "b", categoryId: "ITEMS", styleId: "CARTOON", animated: false, hd: false },
]);

describe("replay timeline", () => {
  it("only replays the log: HP at each floor's end matches the server's next floor start", () => {
    const log = simulateRun(party, 99);
    const { steps, total } = buildTimeline(log);
    expect(total).toBeGreaterThan(0);
    expect(steps.at(-1)!.kind).toBe("end");
    expect(steps.filter((s) => s.kind === "act")).toHaveLength(log.floors.reduce((a, f) => a + f.actions.length, 0));
    const fall = steps.find((s) => s.kind === "fall")!;
    expect(fall.floor).toBe(log.floor);
    expect(fall.partyHp.every((h) => h <= 0)).toBe(true);
    // Each "clear" step shows the HP before the rest; the next floor starts at or above it
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
