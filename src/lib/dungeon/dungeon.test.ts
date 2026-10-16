import { describe, expect, it } from "vitest";
import {
  ANIMATED_BONUS, BADGE_RANKS, BOSS_EVERY, GEAR_BONUS, HD_BONUS, PRIZE_BUDGET_PER_WEEK, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS,
  ROLL_MAX, ROLL_MIN, RUNS_PER_DAY, THEMES, themeFor,
} from "./config";
import { hash32, makeRng, publicTag, runSeed } from "./rng";
import {
  displayName, isEligibleForCredits, maxWeeklyPayout, nextRunIndex, previousWeek, prizeFor, runsLeft, utcDay,
} from "./rules";
import { simulateRun, spawnFloor } from "./simulate";
import {
  baseRoll, deriveMember, deriveParty, deriveUnit, gearBonus, roleFor, slotFor, spriteMultiplier, styleSynergy,
  type MemberFacts, type SpriteFacts,
} from "./stats";
import { rankChange, summarizeRun } from "./summary";

const sprite = (id: string, categoryId = "CHARACTERS", styleId = "PIXEL_ART_16", animated = false, hd = false): SpriteFacts =>
  ({ id, categoryId, styleId, animated, hd });
const hero = (id: string, styleId = "A", animated = false, hd = false): MemberFacts => ({ hero: sprite(id, "CHARACTERS", styleId, animated, hd) });
const equipped = (id: string, styleId = "A", animated = false): MemberFacts => ({
  hero: sprite(id, "CHARACTERS", styleId, animated),
  weapon: sprite(`${id}-w`, "WEAPONS"), armor: sprite(`${id}-a`, "ARMOR"), trinket: sprite(`${id}-t`, "CONSUMABLES"),
});

/** Median floor over many seeds. */
function medianFloor(members: MemberFacts[], runs = 60): number {
  const units = deriveParty(members);
  const floors = Array.from({ length: runs }, (_, s) => simulateRun(units, s * 7919 + 1).floor).sort((a, b) => a - b);
  return floors[Math.floor(runs / 2)];
}

describe("slots and roles", () => {
  it("only characters and creatures are heroes; weapons, armor and everything else is gear", () => {
    expect(roleFor("CHARACTERS")).toBe("hero");
    expect(roleFor("CREATURES")).toBe("beast");
    expect(roleFor("WEAPONS")).toBeNull();
    expect(slotFor("CHARACTERS")).toBe("hero");
    expect(slotFor("CREATURES")).toBe("hero");
    expect(slotFor("WEAPONS")).toBe("weapon");
    expect(slotFor("ARMOR")).toBe("armor");
    expect(slotFor("CONSUMABLES")).toBe("trinket");
    expect(slotFor("RESOURCES")).toBe("trinket");
    expect(slotFor("TILESETS")).toBe("trinket");
  });
});

describe("stats", () => {
  it("rolls are stable per generation id and stay in the narrow range", () => {
    expect(baseRoll("gen_abc")).toBe(baseRoll("gen_abc"));
    for (let i = 0; i < 500; i++) {
      const r = baseRoll(`g${i}`);
      expect(r).toBeGreaterThanOrEqual(ROLL_MIN);
      expect(r).toBeLessThanOrEqual(ROLL_MAX);
    }
    expect(deriveUnit(sprite("x1"))).toEqual(deriveUnit(sprite("x1")));
  });

  it("an animation made from the hero adds 40%, HD adds 15%", () => {
    const plain = deriveUnit(sprite("k1"));
    const animated = deriveUnit(sprite("k1", "CHARACTERS", "A", true));
    const hd = deriveUnit(sprite("k1", "CHARACTERS", "A", false, true));
    expect(animated.atk / plain.atk).toBeCloseTo(1 + ANIMATED_BONUS, 1);
    expect(animated.hp / plain.hp).toBeCloseTo(1 + ANIMATED_BONUS, 1);
    expect(hd.hp / plain.hp).toBeCloseTo(1 + HD_BONUS, 1);
    expect(animated.power).toBeGreaterThan(plain.power);
  });

  it("a beast has more HP, a hero more attack", () => {
    const h = deriveUnit(sprite("same", "CHARACTERS")), b = deriveUnit(sprite("same", "CREATURES"));
    expect(b.hp).toBeGreaterThan(h.hp);
    expect(h.atk).toBeGreaterThan(b.atk);
  });

  it("gear adds its slot bonus scaled by the item's own roll, animation and HD", () => {
    const w = sprite("w1", "WEAPONS");
    const wb = gearBonus(w, "weapon");
    expect(wb.atk).toBe(Math.round(GEAR_BONUS.weapon.atk * spriteMultiplier(w)));
    expect(wb.crit).toBeGreaterThan(0);
    expect(wb.def).toBe(0);
    const animatedW = gearBonus(sprite("w1", "WEAPONS", "A", true), "weapon");
    expect(animatedW.atk).toBeGreaterThan(wb.atk);

    const a = gearBonus(sprite("a1", "ARMOR"), "armor");
    expect(a.def).toBeGreaterThan(0);
    expect(a.hp).toBeGreaterThan(0);
    expect(a.atk).toBe(0);
    expect(gearBonus(sprite("t1", "CONSUMABLES"), "trinket").heal).toBeGreaterThan(0);

    const bare = deriveMember(hero("h1"));
    const full = deriveMember(equipped("h1"));
    expect(full.atk).toBe(bare.atk + gearBonus(sprite("h1-w", "WEAPONS"), "weapon").atk);
    expect(full.def).toBe(bare.def + gearBonus(sprite("h1-a", "ARMOR"), "armor").def);
    expect(full.hp).toBe(bare.hp + gearBonus(sprite("h1-a", "ARMOR"), "armor").hp);
    expect(full.heal).toBe(gearBonus(sprite("h1-t", "CONSUMABLES"), "trinket").heal);
    expect(full.gear).toEqual({ weapon: "h1-w", armor: "h1-a", trinket: "h1-t" });
    expect(full.power).toBeGreaterThan(bare.power);
  });

  it("style variety among heroes gives a small capped synergy", () => {
    expect(styleSynergy(["A", "A", "A"])).toBe(0);
    expect(styleSynergy(["A", "B"])).toBeCloseTo(0.05);
    expect(styleSynergy(["A", "B", "C", "D"])).toBeCloseTo(0.15);
    expect(styleSynergy(["A", "B", "C", "D", "E"])).toBeCloseTo(0.15);
    const same = deriveParty([hero("p1", "A"), hero("p2", "A")]);
    const mixed = deriveParty([hero("p1", "A"), hero("p2", "B")]);
    expect(mixed[0].hp).toBeGreaterThan(same[0].hp);
  });

  it("a party has at most 4 members", () => {
    expect(deriveParty(["a", "b", "c", "d", "e"].map((id) => hero(id))).map((u) => u.id)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("balance (the numbers in config.ts)", () => {
  it("one bare plain hero reaches about floor 4–5", () => {
    const f = medianFloor([hero("solo")]);
    expect(f).toBeGreaterThanOrEqual(4);
    expect(f).toBeLessThanOrEqual(6);
  });

  it("4 animated heroes, fully equipped, reach about floor 15–20", () => {
    const f = medianFloor(["A", "B", "C", "D"].map((st, i) => equipped(`h${i}`, st, true)));
    expect(f).toBeGreaterThanOrEqual(15);
    expect(f).toBeLessThanOrEqual(21);
  });

  it("gear and animation each push the party deeper", () => {
    const bare = medianFloor([0, 1, 2, 3].map((i) => hero(`b${i}`)));
    const geared = medianFloor([0, 1, 2, 3].map((i) => equipped(`b${i}`)));
    const animated = medianFloor([0, 1, 2, 3].map((i) => hero(`b${i}`, "A", true)));
    expect(geared).toBeGreaterThan(bare);
    expect(animated).toBeGreaterThan(bare);
  });
});

describe("simulation", () => {
  const party = deriveParty([equipped("h", "PIXEL_ART_16", true), hero("g", "CARTOON"), { hero: sprite("c", "CREATURES", "ANIME") }]);

  it("same party + same seed → the same log", () => {
    const seed = runSeed("user-1", "2026-10-14", 3);
    expect(JSON.stringify(simulateRun(party, seed))).toBe(JSON.stringify(simulateRun(party, seed)));
  });

  it("different seeds give different runs", () => {
    const logs = [1, 2, 3, 4, 5].map((i) => JSON.stringify(simulateRun(party, runSeed("user-1", "2026-10-14", i))));
    expect(new Set(logs).size).toBe(5);
  });

  it("the log is consistent: the party falls on the last floor, every other floor is cleared", () => {
    const log = simulateRun(party, 42);
    expect(log.floor).toBe(log.floors.length);
    log.floors.slice(0, -1).forEach((f) => expect(f.cleared).toBe(true));
    expect(log.floors.at(-1)!.cleared).toBe(false);
    for (const f of log.floors) {
      expect(f.theme).toBe(themeFor(f.floor).id);
      const hp = [...f.partyHpStart];
      const ehp = f.enemies.map((e) => e.hp);
      for (const a of f.actions) {
        if (a.kind === "heal") hp[a.target] += a.amount;
        else if (a.side === "party") ehp[a.target] -= a.amount;
        else hp[a.target] -= a.amount;
        if (a.kind === "hit") expect(a.ko).toBe((a.side === "party" ? ehp[a.target] : hp[a.target]) <= 0);
        expect(hp.every((h, i) => h <= party[i].hp)).toBe(true);
      }
      expect(f.cleared).toBe(ehp.every((h) => h <= 0) && hp.some((h) => h > 0));
    }
  });

  it("themes change every 5 floors, each ending in its crowned boss", () => {
    expect(themeFor(1).name).toBe("Sewers");
    expect(themeFor(6).name).toBe("Crypt");
    expect(themeFor(11).name).toBe("Cave");
    expect(themeFor(16).name).toBe("Forge");
    expect(themeFor(21).name).toBe("Abyss");
    expect(themeFor(80).name).toBe("Abyss");
    const f10 = spawnFloor(10, makeRng(7));
    expect(f10).toHaveLength(1);
    expect(f10[0]).toMatchObject({ boss: true, name: "Bone Lord" });
    for (let f = 1; f <= 30; f++) {
      const names = new Set(themeFor(f).enemies.map((e) => e.name));
      const line = spawnFloor(f, makeRng(f));
      if (f % BOSS_EVERY === 0) expect(line[0].name).toBe(themeFor(f).boss.name);
      else line.forEach((e) => expect(names.has(e.name)).toBe(true));
    }
    expect(THEMES.map((t) => t.from)).toEqual([1, 6, 11, 16, 21]);
  });

  it("an empty party doesn't enter the dungeon", () => {
    expect(simulateRun([], 1)).toMatchObject({ floor: 0, floors: [] });
  });
});

describe("run summary", () => {
  it("names the MVP, what stopped the party, and the rank change", () => {
    const log = simulateRun(deriveParty([hero("a"), equipped("b")]), 9);
    const s = summarizeRun(log);
    const dealt = [0, 0];
    log.floors.forEach((f) => f.dealt.forEach((d, i) => { dealt[i] += d; }));
    expect(s.mvp).toBe(dealt[1] > dealt[0] ? 1 : 0);
    expect(s.mvpDamage).toBe(Math.max(...dealt));
    const last = log.floors.at(-1)!;
    expect(s.bossStop).toBe(last.boss);
    if (last.boss) expect(s.stoppedBy).toBe(last.enemies[0].name);
    expect(rankChange(7, 3)).toEqual({ before: 7, after: 3, climbed: 4 });
    expect(rankChange(null, 5).climbed).toBe(0);
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
    expect(publicTag("u1")).not.toBe(publicTag("u2"));
  });
});
