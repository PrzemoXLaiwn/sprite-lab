import { describe, expect, it } from "vitest";
import {
  ANIMATED_BONUS, BADGE_RANKS, PRIZE_BUDGET_PER_WEEK, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS, ROLES, ROLL_MAX, ROLL_MIN, RUNS_PER_DAY,
} from "./config";
import { hash32, publicTag, runSeed } from "./rng";
import {
  displayName, isEligibleForCredits, maxWeeklyPayout, nextRunIndex, previousWeek, prizeFor, runsLeft, utcDay,
} from "./rules";
import { simulateRun, spawnFloor } from "./simulate";
import { baseRoll, deriveParty, deriveUnit, roleFor, styleSynergy, type SpriteFacts } from "./stats";
import { makeRng } from "./rng";

const sprite = (id: string, categoryId = "CHARACTERS", styleId = "PIXEL_ART_16", animated = false, hd = false): SpriteFacts =>
  ({ id, categoryId, styleId, animated, hd });

describe("stats", () => {
  it("maps categories to roles, everything else is a Charm", () => {
    expect(roleFor("CHARACTERS")).toBe("hero");
    expect(roleFor("CREATURES")).toBe("beast");
    expect(roleFor("WEAPONS")).toBe("blade");
    expect(roleFor("ARMOR")).toBe("guard");
    expect(roleFor("POTIONS")).toBe("charm");
    expect(roleFor("")).toBe("charm");
  });

  it("rolls are stable per generation id and stay in the narrow range", () => {
    expect(baseRoll("gen_abc")).toBe(baseRoll("gen_abc"));
    for (let i = 0; i < 500; i++) {
      const r = baseRoll(`g${i}`);
      expect(r).toBeGreaterThanOrEqual(ROLL_MIN);
      expect(r).toBeLessThanOrEqual(ROLL_MAX);
    }
    expect(deriveUnit(sprite("x1"))).toEqual(deriveUnit(sprite("x1")));
  });

  it("an animation made from the sprite adds 40% power, HD adds 15%", () => {
    const plain = deriveUnit(sprite("k1"));
    const animated = deriveUnit(sprite("k1", "CHARACTERS", "PIXEL_ART_16", true));
    const hd = deriveUnit(sprite("k1", "CHARACTERS", "PIXEL_ART_16", false, true));
    expect(animated.atk / plain.atk).toBeCloseTo(1 + ANIMATED_BONUS, 1);
    expect(animated.hp / plain.hp).toBeCloseTo(1 + ANIMATED_BONUS, 1);
    expect(hd.hp / plain.hp).toBeCloseTo(1.15, 1);
    expect(animated.power).toBeGreaterThan(plain.power);
  });

  it("roles keep their shape: Beast has most HP, Blade most attack, Guard most defence, Charm heals", () => {
    const [h, b, w, g, c] = ["CHARACTERS", "CREATURES", "WEAPONS", "ARMOR", "ITEMS"].map((cat) => deriveUnit(sprite("same", cat)));
    expect(b.hp).toBeGreaterThan(h.hp);
    expect(w.atk).toBeGreaterThan(h.atk);
    expect(g.def).toBeGreaterThan(h.def);
    expect(c.heal).toBeGreaterThan(0);
    expect(h.heal).toBe(0);
    expect(ROLES.charm.heal).toBeGreaterThan(0);
  });

  it("style variety gives a small capped synergy", () => {
    expect(styleSynergy(["A", "A", "A"])).toBe(0);
    expect(styleSynergy(["A", "B"])).toBeCloseTo(0.05);
    expect(styleSynergy(["A", "B", "C", "D"])).toBeCloseTo(0.15);
    expect(styleSynergy(["A", "B", "C", "D", "E"])).toBeCloseTo(0.15);
    const same = deriveParty([sprite("p1", "CHARACTERS", "A"), sprite("p2", "CHARACTERS", "A")]);
    const mixed = deriveParty([sprite("p1", "CHARACTERS", "A"), sprite("p2", "CHARACTERS", "B")]);
    expect(mixed[0].atk).toBeGreaterThanOrEqual(same[0].atk);
    expect(mixed[0].hp).toBeGreaterThan(same[0].hp);
  });

  it("a party has at most 4 members and no duplicates", () => {
    const p = deriveParty(["a", "b", "a", "c", "d", "e"].map((id) => sprite(id)));
    expect(p.map((u) => u.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("simulation", () => {
  const party = deriveParty([
    sprite("h", "CHARACTERS", "PIXEL_ART_16", true), sprite("g", "ARMOR", "CARTOON"),
    sprite("w", "WEAPONS", "ANIME"), sprite("c", "ITEMS", "PIXEL_ART_32"),
  ]);

  it("same party + same seed → the same log", () => {
    const seed = runSeed("user-1", "2026-10-14", 3);
    expect(simulateRun(party, seed)).toEqual(simulateRun(party, seed));
    expect(JSON.stringify(simulateRun(party, seed))).toBe(JSON.stringify(simulateRun(party, seed)));
  });

  it("different seeds give different runs", () => {
    const logs = [1, 2, 3, 4, 5].map((i) => JSON.stringify(simulateRun(party, runSeed("user-1", "2026-10-14", i))));
    expect(new Set(logs).size).toBe(5);
  });

  it("the log is consistent: the party falls on the last floor, every other floor is cleared", () => {
    const log = simulateRun(party, 42);
    expect(log.floor).toBe(log.floors.length);
    expect(log.floor).toBeGreaterThan(1);
    log.floors.slice(0, -1).forEach((f) => expect(f.cleared).toBe(true));
    expect(log.floors.at(-1)!.cleared).toBe(false);

    for (const f of log.floors) {
      // Replaying the actions from the floor's starting HP reproduces the outcome
      const hp = [...f.partyHpStart];
      const ehp = f.enemies.map((e) => e.hp);
      for (const a of f.actions) {
        if (a.kind === "heal") hp[a.target] += a.amount;
        else if (a.side === "party") ehp[a.target] -= a.amount;
        else hp[a.target] -= a.amount;
        const after = a.kind === "hit" ? (a.side === "party" ? ehp[a.target] : hp[a.target]) : 1;
        expect(a.ko).toBe(after <= 0);
        expect(a.amount).toBeGreaterThanOrEqual(a.kind === "heal" ? 0 : 1);
      }
      expect(f.cleared).toBe(ehp.every((h) => h <= 0) && hp.some((h) => h > 0));
      expect(f.dealt.reduce((a, b) => a + b, 0)).toBe(f.actions.filter((a) => a.side === "party" && a.kind === "hit").reduce((s, a) => s + a.amount, 0));
      expect(f.taken.reduce((a, b) => a + b, 0)).toBe(f.actions.filter((a) => a.side === "enemy").reduce((s, a) => s + a.amount, 0));
    }
  });

  it("every 5th floor is a single boss, enemies get tougher with depth", () => {
    const rng = makeRng(7);
    const f5 = spawnFloor(5, rng);
    expect(f5).toHaveLength(1);
    expect(f5[0].boss).toBe(true);
    expect(spawnFloor(1, makeRng(1)).every((e) => !e.boss)).toBe(true);
    const avgHp = (floor: number) => spawnFloor(floor, makeRng(3)).reduce((a, e) => a + e.hp, 0);
    expect(avgHp(12)).toBeGreaterThan(avgHp(2));
  });

  it("animated sprites go deeper on average", () => {
    const plain = deriveParty([sprite("a"), sprite("b", "CREATURES"), sprite("c", "WEAPONS")]);
    const anim = deriveParty([sprite("a", "CHARACTERS", "PIXEL_ART_16", true), sprite("b", "CREATURES", "PIXEL_ART_16", true), sprite("c", "WEAPONS", "PIXEL_ART_16", true)]);
    const avg = (p: typeof plain) => Array.from({ length: 40 }, (_, s) => simulateRun(p, s + 1).floor).reduce((a, b) => a + b, 0) / 40;
    expect(avg(anim)).toBeGreaterThan(avg(plain));
  });

  it("an empty party doesn't enter the dungeon", () => {
    expect(simulateRun([], 1)).toMatchObject({ floor: 0, floors: [] });
  });
});

describe("daily limit", () => {
  it(`allows ${RUNS_PER_DAY} runs per UTC day`, () => {
    expect(nextRunIndex([])).toBe(1);
    expect(nextRunIndex([1, 2])).toBe(3);
    expect(nextRunIndex([1, 2, 3, 4])).toBe(5);
    expect(nextRunIndex([1, 2, 3, 4, 5])).toBeNull();
    expect(runsLeft(0)).toBe(5);
    expect(runsLeft(5)).toBe(0);
    expect(runsLeft(9)).toBe(0);
  });

  it("days and weeks are UTC", () => {
    expect(utcDay(new Date("2026-10-14T23:59:59Z"))).toBe("2026-10-14");
    expect(utcDay(new Date("2026-10-15T00:00:00Z"))).toBe("2026-10-15");
    const prev = previousWeek(new Date("2026-10-19T00:10:00Z")); // Monday
    expect(prev.week).toBe("2026-W42");
    expect(prev.start.toISOString()).toBe("2026-10-12T00:00:00.000Z");
    expect(prev.end.toISOString()).toBe("2026-10-19T00:00:00.000Z");
  });

  it("seeds depend on user, day and run index", () => {
    const s = runSeed("u", "2026-10-14", 1);
    expect(runSeed("u", "2026-10-14", 1)).toBe(s);
    expect(runSeed("u", "2026-10-14", 2)).not.toBe(s);
    expect(runSeed("u", "2026-10-15", 1)).not.toBe(s);
    expect(runSeed("v", "2026-10-14", 1)).not.toBe(s);
    expect(hash32("abc")).toBe(hash32("abc"));
  });
});

describe("prizes", () => {
  it(`weekly credit prizes never exceed ${PRIZE_BUDGET_PER_WEEK} credits`, () => {
    expect(maxWeeklyPayout()).toBeLessThanOrEqual(PRIZE_BUDGET_PER_WEEK);
    expect(PRIZE_CREDITS.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(PRIZE_BUDGET_PER_WEEK);
    expect(PRIZE_CREDITS.every((c) => Number.isInteger(c) && c >= 0)).toBe(true);
  });

  it("top 3 get credits when eligible, top 10 get a badge", () => {
    expect(prizeFor(1, true)).toEqual({ rank: 1, credits: 30, badge: "gold" });
    expect(prizeFor(3, true)).toEqual({ rank: 3, credits: 10, badge: "bronze" });
    expect(prizeFor(4, true)).toEqual({ rank: 4, credits: 0, badge: "top10" });
    expect(prizeFor(1, false)).toEqual({ rank: 1, credits: 0, badge: "gold" });
    expect(prizeFor(BADGE_RANKS + 1, true)).toBeNull();
    expect(isEligibleForCredits(PRIZE_MIN_PAID_GENERATIONS)).toBe(true);
    expect(isEligibleForCredits(PRIZE_MIN_PAID_GENERATIONS - 1)).toBe(false);
  });

  it("leaderboard names never show an email", () => {
    expect(displayName("pixelfox", "u1")).toBe("pixelfox");
    expect(displayName(null, "u1")).toMatch(/^Creator #[0-9a-z]{5}$/);
    expect(displayName("  ", "u1")).toBe(displayName(null, "u1"));
    expect(publicTag("u1")).toBe(publicTag("u1"));
    expect(publicTag("u1")).not.toBe(publicTag("u2"));
  });
});
