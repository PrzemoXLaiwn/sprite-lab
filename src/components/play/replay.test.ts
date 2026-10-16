import { describe, expect, it } from "vitest";
import { chooseBlessing, initialState, runSegment, simulateFull, type RunState } from "@/lib/dungeon/simulate";
import { deriveParty } from "@/lib/dungeon/stats";
import type { Leaderboard } from "@/lib/dungeon/store";
import { boardAfterRun, removeHero, setGear, setHero, wornBy } from "./party-edit";
import { buildTimeline, stepAt } from "./replay";

const f = (id: string, categoryId: string, prompt: string) => ({ id, categoryId, styleId: "A", prompt, hd: false, animations: 0, rotated: false });
const party = deriveParty([
  { hero: f("a", "CHARACTERS", "fire mage"), trinket: f("t", "CONSUMABLES", "potion") },
  { hero: f("b", "CREATURES", "wolf") },
]);

describe("replay timeline", () => {
  it("only replays the log: climb per floor, one step per action, boss gate and chest, fall at the end", () => {
    const { floors, state } = simulateFull(party, 99, "2026-W42");
    const { steps, total } = buildTimeline(floors);
    expect(total).toBeGreaterThan(0);
    expect(steps.at(-1)!.kind).toBe("end");
    expect(steps.filter((s) => s.kind === "climb")).toHaveLength(floors.length);
    expect(steps.filter((s) => s.kind === "act")).toHaveLength(floors.reduce((a, x) => a + x.actions.length, 0));
    expect(steps.filter((s) => s.kind === "gate")).toHaveLength(floors.filter((x) => x.boss).length);
    expect(steps.filter((s) => s.kind === "chest")).toHaveLength(floors.filter((x) => x.chest).length);
    const fall = steps.find((s) => s.kind === "fall")!;
    expect(fall.floor).toBe(state.floor);
    expect(fall.partyHp.every((h) => h <= 0)).toBe(true);
  });

  it("shows the record moment once, when passing the old best", () => {
    const { floors } = simulateFull(party, 99, "2026-W42");
    const rec = buildTimeline(floors, { bestBefore: 1 }).steps.filter((s) => s.kind === "record");
    expect(rec).toHaveLength(floors.length >= 2 ? 1 : 0);
    if (rec.length) expect(rec[0].floor).toBe(2);
    expect(buildTimeline(floors, { bestBefore: 99 }).steps.some((s) => s.kind === "record")).toBe(false);
  });

  it("finds the step playing at any time; the combo resets when an enemy lands a hit", () => {
    const { floors } = simulateFull(party, 5, "2026-W42");
    const { steps, total } = buildTimeline(floors);
    expect(stepAt(steps, 0)).toBe(0);
    expect(steps[stepAt(steps, total)].kind).toBe("end");
    const mid = steps[Math.floor(steps.length / 2)];
    expect(stepAt(steps, mid.start + 1)).toBe(steps.indexOf(mid));
    steps.forEach((s, i) => {
      if (i && steps[i - 1].action?.side === "enemy" && steps[i - 1].action?.kind === "hit") expect(s.combo).toBeLessThanOrEqual(1);
    });
  });
});

describe("effects are visible in the replay", () => {
  it("a Phoenix revive at floor start: hero shown down during the climb, then a revive step brings them back", () => {
    const paused: RunState = { ...initialState(party, 3, "2026-W42"), floor: 3, hp: [0, party[1].hp], offer: ["phoenix"] };
    const c = chooseBlessing(paused, "phoenix");
    if (!c.ok) throw new Error("choice refused");
    const { floors } = runSegment(party, c.state);
    const { steps } = buildTimeline(floors);
    expect(steps[0]).toMatchObject({ kind: "climb" });
    expect(steps[0].partyHp[0]).toBe(0);
    expect(steps[1]).toMatchObject({ kind: "revive", event: { kind: "revive", target: 0 } });
    expect(steps[2].partyHp[0]).toBe(Math.round(party[0].hp * 0.5));
  });

  it("cleared floors carry the rest heal for the green numbers", () => {
    const st: RunState = { ...initialState(party, 3, "2026-W42"), hp: party.map((u) => Math.round(u.hp * 0.5)) };
    const { floors } = runSegment(party, st);
    const clear = buildTimeline(floors).steps.find((s) => s.kind === "clear" && s.restHeal);
    expect(clear?.restHeal?.some((h) => h > 0)).toBe(true);
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
