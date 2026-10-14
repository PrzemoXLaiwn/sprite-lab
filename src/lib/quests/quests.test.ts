// Quest rewards are free credits: these tests keep the budget from creeping up
// (see the header of definitions.ts for why these numbers stay profitable).
import { describe, expect, it } from "vitest";
import { QUESTS, levelFor, xpFor } from "./definitions";
import { claimKey, isoWeek, questStates, weekStart } from "./progress";

const sum = (kind: string) => QUESTS.filter((q) => q.kind === kind).reduce((a, q) => a + q.reward, 0);

const ZERO = { sprites: 0, animations: 0, shared: 0, inProjects: 0, likesReceived: 0, hasUsername: false, weekSprites: 0, weekAnimations: 0, weekActiveDays: 0 };

describe("quest budget", () => {
  it("onboarding pays at most 8 credits per account", () => expect(sum("onboarding")).toBeLessThanOrEqual(8));
  it("weekly quests pay at most 5 credits per week", () => expect(sum("weekly")).toBeLessThanOrEqual(5));
  it("weekly goals need credits spent first (≥ 10 sprite credits, ≥ 2 animations)", () => {
    const w = Object.fromEntries(QUESTS.filter((q) => q.kind === "weekly").map((q) => [q.id, q]));
    expect(w.week_sprites.goal).toBeGreaterThanOrEqual(10);
    expect(w.week_animations.goal).toBeGreaterThanOrEqual(2);
  });
  it("milestones pay at most 1 credit per 25 sprites made", () => {
    for (const q of QUESTS.filter((x) => x.kind === "milestone" && x.metric === "sprites")) expect(q.reward / q.goal).toBeLessThanOrEqual(0.1);
  });
  it("quest ids are unique", () => expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length));
});

describe("weeks", () => {
  it("starts on Monday 00:00 UTC", () => {
    expect(weekStart(new Date("2026-10-14T15:00:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(weekStart(new Date("2026-10-18T23:59:00Z")).toISOString()).toBe("2026-10-12T00:00:00.000Z");
  });
  it("names ISO weeks across a year boundary", () => {
    expect(isoWeek(new Date("2026-10-14T12:00:00Z"))).toBe("2026-W42");
    expect(isoWeek(new Date("2027-01-01T12:00:00Z"))).toBe("2026-W53");
  });
  it("weekly claims are keyed per week, one-time claims are not", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    expect(claimKey({ id: "week_sprites", kind: "weekly" }, now)).toBe("week_sprites@2026-W42");
    expect(claimKey({ id: "first_sprite", kind: "onboarding" }, now)).toBe("first_sprite");
  });
});

describe("progress", () => {
  it("marks complete and claimed from stats and stored claims", () => {
    const now = new Date("2026-10-14T12:00:00Z");
    const states = questStates({ ...ZERO, sprites: 12, weekSprites: 10 }, { first_sprite: "x", "week_sprites@2026-W41": "x" }, now);
    const by = Object.fromEntries(states.map((s) => [s.id, s]));
    expect(by.first_sprite).toMatchObject({ complete: true, claimed: true });
    expect(by.sprites_10).toMatchObject({ complete: true, claimed: false, progress: 10 });
    expect(by.week_sprites).toMatchObject({ complete: true, claimed: false }); // last week's claim doesn't count
    expect(by.sprites_50.complete).toBe(false);
  });
  it("levels grow with paid activity", () => {
    expect(levelFor(0).level).toBe(0);
    expect(levelFor(xpFor({ sprites: 5, animations: 0, shared: 0, inProjects: 0 })).level).toBe(1);
    expect(levelFor(xpFor({ sprites: 30, animations: 5, shared: 2, inProjects: 10 })).level).toBeGreaterThanOrEqual(3);
  });
});
