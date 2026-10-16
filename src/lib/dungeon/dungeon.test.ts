import { describe, expect, it } from "vitest";
import { blessingById, chestFor, modsFor, offerFor } from "./blessings";
import {
  BADGE_RANKS, BLESSING_EVERY, CLASSES, CRIT_MULTIPLIER, PRIZE_BUDGET_PER_WEEK, PRIZE_CREDITS, PRIZE_MIN_PAID_GENERATIONS,
  RUNS_PER_DAY, STAR_STEP, ZONES, starMultiplier, zoneFor,
} from "./config";
import { computeDamage, elementMultiplier, matchup } from "./damage";
import { classFor, classMatch, elementFor, starsFor, trinketKind, weaponKind, type SpriteFacts } from "./detect";
import { createRng, hash32, makeRng, publicTag, runSeed } from "./rng";
import {
  displayName, isEligibleForCredits, maxWeeklyPayout, nextRunIndex, previousWeek, prizeFor, runsLeft, utcDay,
} from "./rules";
import { chooseBlessing, initialState, runSegment, simulateFull } from "./simulate";
import { deriveMember, deriveParty, deriveUnit, itemBonus, type MemberFacts } from "./stats";
import { buildReport, runTips, type ResultHero } from "./summary";
import { floorEnemies, towerWeek } from "./tower";

let n = 0;
const sp = (categoryId: string, prompt: string, stars = 1, id?: string): SpriteFacts => ({
  id: id ?? `g${n++}`, categoryId, styleId: "A", prompt,
  hd: stars >= 2, animations: stars >= 4 ? 3 : stars >= 3 ? 1 : 0, rotated: false,
});
const hero = (prompt: string, stars = 1, gear: { w?: string; a?: string; t?: string; gs?: number } = {}): MemberFacts => ({
  hero: sp("CHARACTERS", prompt, stars),
  weapon: gear.w ? sp("WEAPONS", gear.w, gear.gs ?? stars) : null,
  armor: gear.a ? sp("ARMOR", gear.a, gear.gs ?? stars) : null,
  trinket: gear.t ? sp("CONSUMABLES", gear.t, gear.gs ?? stars) : null,
});
const WEEKS = ["2026-W42", "2026-W43", "2026-W44", "2026-W45"];

function median(members: () => MemberFacts[], runs = 24): number {
  const floors: number[] = [];
  for (const w of WEEKS) for (let k = 0; k < runs / WEEKS.length; k++) floors.push(simulateFull(deriveParty(members()), k * 7919 + 13, w).state.floor);
  floors.sort((a, b) => a - b);
  return floors[Math.floor(floors.length / 2)];
}

describe("class from the prompt", () => {
  it("reads documented keywords, with a priority order", () => {
    expect(classFor("armored knight with a sword", "CHARACTERS")).toBe("guardian");
    expect(classFor("elf ranger", "CHARACTERS")).toBe("striker");
    expect(classFor("fire mage", "CHARACTERS")).toBe("caster");
    expect(classFor("dwarf cleric", "CHARACTERS")).toBe("healer"); // healer beats brute
    expect(classFor("orc", "CHARACTERS")).toBe("brute");
    expect(classFor("baby dragon", "CREATURES")).toBe("beast");
    expect(classFor("skeleton necromancer", "CREATURES")).toBe("caster");
    expect(classFor("Knights", "CHARACTERS")).toBe("guardian"); // case and plural
  });

  it("falls back by category and returns the deciding word", () => {
    expect(classMatch("a cute farmer", "CHARACTERS")).toEqual({ id: "striker", word: null });
    expect(classMatch("cute blob", "CREATURES")).toEqual({ id: "beast", word: null });
    expect(classMatch("paladin", "CHARACTERS")).toEqual({ id: "guardian", word: "paladin" });
    expect(classFor("iron sword", "WEAPONS")).toBeNull();
  });
});

describe("element and item kind from the prompt", () => {
  it("detects elements, neutral otherwise", () => {
    expect(elementFor("flaming sword")).toBe("fire");
    expect(elementFor("frost giant")).toBe("ice");
    expect(elementFor("holy paladin")).toBe("holy");
    expect(elementFor("lightning staff")).toBe("lightning"); // "light" is a whole word only
    expect(elementFor("toxic slime")).toBe("poison");
    expect(elementFor("iron sword")).toBe("neutral");
  });

  it("knows blades, staves and trinket kinds", () => {
    expect(weaponKind("short bow")).toBe("blade");
    expect(weaponKind("oak staff")).toBe("staff");
    expect(weaponKind("war hammer")).toBe("plain");
    expect(trinketKind("health potion")).toBe("heal");
    expect(trinketKind("fire amulet")).toBe("ward");
    expect(trinketKind("old key")).toBe("small-heal");
  });
});

describe("stars: work put into the sprite", () => {
  it("★ plain, +HD, +animated, +3 animations or a walk / rotation; max 4", () => {
    expect(starsFor({ hd: false, animations: 0, rotated: false }).stars).toBe(1);
    expect(starsFor({ hd: true, animations: 0, rotated: false }).stars).toBe(2);
    expect(starsFor({ hd: false, animations: 1, rotated: false }).stars).toBe(2);
    expect(starsFor({ hd: false, animations: 2, rotated: false }).stars).toBe(2);
    expect(starsFor({ hd: false, animations: 3, rotated: false }).stars).toBe(3);
    expect(starsFor({ hd: false, animations: 0, rotated: true }).stars).toBe(3);
    expect(starsFor({ hd: true, animations: 5, rotated: true }).stars).toBe(4);
  });

  it("each star multiplies by a fixed step", () => {
    expect(starMultiplier(1)).toBe(1);
    expect(starMultiplier(2)).toBeCloseTo(STAR_STEP);
    expect(starMultiplier(4)).toBeCloseTo(STAR_STEP ** 3, 2);
    expect(starMultiplier(9)).toBe(starMultiplier(4));
    const one = deriveUnit(sp("CHARACTERS", "knight", 1));
    const three = deriveUnit(sp("CHARACTERS", "knight", 3));
    expect(one.hp).toBe(CLASSES.guardian.hp);
    expect(three.hp).toBe(Math.round(CLASSES.guardian.hp * starMultiplier(3)));
  });
});

describe("damage formula", () => {
  it("ATK × 100/(100+DEF) × element × crit × modifier × variance", () => {
    const base = { atk: 100, def: 0, attackElement: "neutral" as const, defenderElement: "neutral" as const, crit: false, roll: 0.5 };
    expect(computeDamage(base).amount).toBe(100); // roll 0.5 → variance 1.0
    expect(computeDamage({ ...base, def: 100 }).amount).toBe(50);
    expect(computeDamage({ ...base, crit: true }).amount).toBe(Math.round(100 * CRIT_MULTIPLIER));
    expect(computeDamage({ ...base, modifier: 1.3 }).amount).toBe(130);
    expect(computeDamage({ ...base, roll: 0 }).amount).toBe(90);
    expect(computeDamage({ ...base, roll: 0.9999 }).amount).toBe(110);
    expect(computeDamage({ ...base, atk: 1, def: 900 }).amount).toBe(1); // never below 1
  });

  it("weakness ×1.5, resisted ×0.6, neutral attacks are plain", () => {
    expect(matchup("fire", "ice")).toBe("weak");
    expect(matchup("fire", "fire")).toBe("resist");
    expect(matchup("holy", "shadow")).toBe("weak");
    expect(matchup("neutral", "shadow")).toBe("normal");
    expect(elementMultiplier("fire", "ice")).toBe(1.5);
    expect(elementMultiplier("fire", "fire")).toBe(0.6);
    expect(elementMultiplier("fire", "ice", 2)).toBe(2);
    const r = computeDamage({ atk: 100, def: 0, attackElement: "fire", defenderElement: "ice", crit: false, roll: 0.5 });
    expect(r).toEqual({ amount: 150, matchup: "weak" });
  });
});

describe("gear", () => {
  it("weapon → ATK (+crit for blades, splash for staves), armor → HP + DEF, trinket → heal or ward", () => {
    const blade = itemBonus(sp("WEAPONS", "fire sword"), "weapon");
    expect(blade.atk).toBeGreaterThan(0);
    expect(blade.crit).toBeGreaterThan(0);
    expect(blade.element).toBe("fire");
    expect(itemBonus(sp("WEAPONS", "oak staff"), "weapon").splash).toBeGreaterThan(0);
    expect(itemBonus(sp("WEAPONS", "oak staff"), "weapon", "caster").allHit).toBeGreaterThan(0);
    const armor = itemBonus(sp("ARMOR", "plate armor"), "armor");
    expect(armor.hp).toBeGreaterThan(0);
    expect(armor.def).toBeGreaterThan(0);
    expect(itemBonus(sp("CONSUMABLES", "health potion"), "trinket").heal).toBeGreaterThan(0);
    expect(itemBonus(sp("CONSUMABLES", "frost amulet"), "trinket").ward).toBe("ice");
    // Item power scales with its stars
    expect(itemBonus(sp("WEAPONS", "sword", 4), "weapon").atk).toBeGreaterThan(blade.atk);
  });

  it("a hero attacks with the weapon's element, else its own; the breakdown adds up", () => {
    const m = deriveMember(hero("ice knight", 2, { w: "fire sword", a: "plate armor", t: "potion" }));
    expect(m.element).toBe("ice");
    expect(m.attackElement).toBe("fire");
    expect(deriveMember(hero("ice knight", 2, { w: "iron mace" })).attackElement).toBe("ice");
    const w = m.why;
    const base = Math.round(w.base.atk * w.starMultiplier);
    expect(m.atk).toBe(base + w.gear.reduce((a, g) => a + g.atk, 0));
    expect(m.hp).toBe(Math.round(w.base.hp * w.starMultiplier) + w.gear.reduce((a, g) => a + g.hp, 0));
    expect(w.classWord).toBe("knight");
    expect(w.elementWord).toBe("ice");
    expect(m.power).toBeGreaterThan(deriveUnit(sp("CHARACTERS", "ice knight", 2)).power);
  });
});

describe("blessings", () => {
  it("apply clear modifiers", () => {
    expect(modsFor([]).atkMul).toBe(1);
    expect(modsFor(["whetstone"]).atkMul).toBeCloseTo(1.15);
    expect(modsFor(["whetstone", "chest-might"]).atkMul).toBeCloseTo(1.15 * 1.1);
    expect(modsFor(["exploit"]).weakMul).toBe(2);
    expect(modsFor(["giant-slayer"]).bossCritMul).toBe(CRIT_MULTIPLIER * 2);
    expect(modsFor(["iron-wall"]).taunt).toBe(0.9);
    expect(modsFor(["oath-fire"]).elementMul.fire).toBeCloseTo(1.3);
    expect(modsFor(["phoenix"]).revives).toBe(1);
    expect(modsFor(["not-a-blessing"])).toEqual(modsFor([]));
    expect(blessingById("oath-neutral")).toBeNull();
  });

  it("offers 3 distinct, seeded, never already chosen; oaths only for the party's elements", () => {
    const a = offerFor(42, 3, [], ["fire", "neutral"]);
    expect(a).toHaveLength(3);
    expect(new Set(a).size).toBe(3);
    expect(offerFor(42, 3, [], ["fire", "neutral"])).toEqual(a);
    for (let s = 0; s < 200; s++) {
      const o = offerFor(s, 6, ["whetstone"], ["fire"]);
      expect(o).not.toContain("whetstone");
      expect(o.filter((x) => x.startsWith("oath-")).every((x) => x === "oath-fire")).toBe(true);
    }
    expect(chestFor(1, 5)).toBe(chestFor(1, 5));
  });

  it("a chosen blessing changes the climb", () => {
    const party = deriveParty([hero("knight"), hero("fire mage"), hero("elf ranger"), hero("cleric")]);
    const st = runSegment(party, initialState(party, 7, "2026-W42")).state;
    expect(st.offer).not.toBeNull();
    const outcomes = st.offer!.map((id) => {
      let s = (chooseBlessing(st, id) as { ok: true; state: typeof st }).state;
      for (let i = 0; i < 40 && !s.done; i++) {
        s = runSegment(party, s).state;
        if (s.offer) s = (chooseBlessing(s, s.offer[0]) as { ok: true; state: typeof st }).state;
      }
      return JSON.stringify(s.dealt);
    });
    expect(new Set(outcomes).size).toBeGreaterThan(1);
  });
});

describe("weekly tower", () => {
  it("is the same for everyone in a week and changes between weeks", () => {
    expect(floorEnemies("2026-W42", 7)).toEqual(floorEnemies("2026-W42", 7));
    expect(towerWeek("2026-W42")).toEqual(towerWeek("2026-W42"));
    const all = (w: string) => JSON.stringify(Array.from({ length: 30 }, (_, i) => floorEnemies(w, i + 1)));
    expect(all("2026-W42")).not.toBe(all("2026-W43"));
  });

  it("zones every 5 floors, each 5th floor is the zone's boss, enemies carry the zone's element", () => {
    expect(ZONES.map((z) => z.from)).toEqual([1, 6, 11, 16, 21]);
    expect(zoneFor(40).id).toBe("abyss");
    const week = towerWeek("2026-W42");
    for (let f = 1; f <= 30; f++) {
      const line = floorEnemies("2026-W42", f);
      const z = week.find((x) => x.id === zoneFor(f).id)!;
      line.forEach((e) => expect(e.element).toBe(z.element));
      if (f % 5 === 0) expect(line).toEqual([expect.objectContaining({ boss: true, name: zoneFor(f).boss.name })]);
      else expect(line.every((e) => !e.boss)).toBe(true);
    }
    expect(week.every((z) => z.weakTo.every((e) => typeof e === "string"))).toBe(true);
  });

  it("combat rolls differ per run on the same tower", () => {
    const party = deriveParty([hero("knight"), hero("mage")]);
    const a = simulateFull(party, 1, "2026-W42"), b = simulateFull(party, 2, "2026-W42");
    expect(a.floors[0].enemies).toEqual(b.floors[0].enemies);
    expect(JSON.stringify(a.floors[0].actions)).not.toBe(JSON.stringify(b.floors[0].actions));
  });
});

describe("stepwise run state machine", () => {
  const party = deriveParty([hero("knight", 2), hero("fire mage", 2), hero("elf ranger", 2), hero("dwarf cleric", 2)]);

  it("pauses every 3 cleared floors with an offer and resumes exactly", () => {
    const s0 = initialState(party, 99, "2026-W42");
    const seg = runSegment(party, s0);
    expect(seg.state.floor).toBe(BLESSING_EVERY);
    expect(seg.state.offer).toHaveLength(3);
    expect(seg.floors.map((f) => f.floor)).toEqual([1, 2, 3]);
    // Paused: another segment call does nothing until a choice is made
    expect(runSegment(party, seg.state).floors).toHaveLength(0);
    // Round-tripping the state through JSON (the database) changes nothing
    const stored = JSON.parse(JSON.stringify(seg.state));
    const pick = seg.state.offer![1];
    const a = runSegment(party, (chooseBlessing(seg.state, pick) as { ok: true; state: typeof s0 }).state);
    const b = runSegment(party, (chooseBlessing(stored, pick) as { ok: true; state: typeof s0 }).state);
    expect(JSON.stringify(b)).toBe(JSON.stringify(a));
    // Segments + choices = one continuous deterministic run
    const full1 = simulateFull(party, 99, "2026-W42");
    const full2 = simulateFull(party, 99, "2026-W42");
    expect(JSON.stringify(full1)).toBe(JSON.stringify(full2));
    expect(full1.state.done).toBe(true);
  });

  it("only accepts an offered blessing, once", () => {
    const st = runSegment(party, initialState(party, 5, "2026-W42")).state;
    expect(chooseBlessing(st, "not-offered-id")).toEqual({ ok: false, reason: "not-offered" });
    const c = chooseBlessing(st, st.offer![0]);
    expect(c.ok).toBe(true);
    if (c.ok) expect(chooseBlessing(c.state, st.offer![0])).toEqual({ ok: false, reason: "not-waiting" });
    expect(chooseBlessing(initialState(party, 5, "2026-W42"), "whetstone")).toEqual({ ok: false, reason: "not-waiting" });
  });

  it("does not mutate the state it was given", () => {
    const s0 = initialState(party, 3, "2026-W42");
    const copy = JSON.stringify(s0);
    runSegment(party, s0);
    expect(JSON.stringify(s0)).toBe(copy);
  });

  it("the replayable log is consistent: HP math adds up, the party falls on the last floor", () => {
    const { floors, state } = simulateFull(party, 11, "2026-W43");
    expect(floors.at(-1)!.cleared).toBe(false);
    expect(floors.at(-1)!.floor).toBe(state.floor);
    for (const f of floors) {
      const ehp = f.enemies.map((e) => e.hp);
      for (const a of f.actions) {
        if (a.side === "party" && a.kind === "hit") {
          for (const t of [{ target: a.target, amount: a.amount, ko: a.ko }, ...(a.extra ?? [])]) {
            ehp[t.target] -= t.amount;
            expect(t.ko).toBe(ehp[t.target] <= 0);
          }
        }
      }
      expect(f.cleared).toBe(ehp.every((h) => h <= 0));
      expect(f.enemyHpEnd).toEqual(ehp.map((h) => Math.max(0, h)));
    }
  });

  it("the rng state can be stored and resumed", () => {
    const r = createRng(123);
    r.next(); r.next();
    const resumed = createRng(r.state);
    expect(resumed.next()).toBe(r.next());
  });
});

describe("balance (numbers in config.ts)", () => {
  it("4 plain heroes without gear reach about floor 8", () => {
    const f = median(() => [hero("knight"), hero("elf ranger"), hero("mage"), hero("dwarf cleric")]);
    expect(f).toBeGreaterThanOrEqual(7);
    expect(f).toBeLessThanOrEqual(10);
  });

  it("a good build with matching elements reaches about 20–25", () => {
    const f = median(() => [
      hero("knight", 3, { w: "fire sword", a: "plate armor", t: "potion", gs: 2 }),
      hero("elf ranger", 2, { w: "holy bow", a: "leather armor", t: "potion", gs: 2 }),
      hero("fire mage", 3, { w: "fire staff", a: "robe", t: "herb", gs: 1 }),
      hero("dwarf cleric", 2, { w: "holy mace", a: "chainmail", t: "apple", gs: 1 }),
    ]);
    expect(f).toBeGreaterThanOrEqual(18);
    expect(f).toBeLessThanOrEqual(30);
  });

  it("a maxed party reaches 35+ and still has headroom below the cap", () => {
    const f = median(() => [
      hero("holy paladin", 4, { w: "fire sword", a: "plate armor", t: "potion" }),
      hero("elf ranger", 4, { w: "fire bow", a: "leather armor", t: "potion" }),
      hero("fire mage", 4, { w: "fire staff", a: "robe", t: "herb" }),
      hero("dwarf cleric", 4, { w: "holy mace", a: "chainmail", t: "elixir" }),
    ]);
    expect(f).toBeGreaterThanOrEqual(33);
    expect(f).toBeLessThan(60);
  });
});

describe("climb report and tips", () => {
  const heroes: ResultHero[] = [
    { id: "h1", name: "Elf ranger", classId: "striker", stars: 1, animated: false, hd: false, attackElement: "neutral", gear: {} },
    { id: "h2", name: "Knight", classId: "guardian", stars: 2, animated: true, hd: true, attackElement: "neutral", gear: { armor: "a" } },
  ];
  const state = { ...initialState([], 1, "2026-W42"), done: true, floor: 8, dealt: [100, 300], firstFallen: 0, shortBy: 14, hp: [0, 0] };

  it("near misses, MVP, who fell first, what stopped the party", () => {
    const r = buildReport({ state, heroes, bestBefore: 10, rankBefore: 7, rankAfter: 7, players: 12, spare: { weapon: 0, armor: 0, trinket: 0 } });
    expect(r.nearMiss).toEqual(["14 HP short of floor 9", "Your best is 2 floors up"]);
    expect(r.mvp).toBe(1);
    expect(r.mvpDamage).toBe(300);
    expect(r.firstFallen).toBe(0);
    expect(r.newBest).toBe(false);
    expect(r.stoppedBy.length).toBeGreaterThan(0);
    const best = buildReport({ state, heroes, bestBefore: 5, rankBefore: 7, rankAfter: 3, players: 12, spare: { weapon: 0, armor: 0, trinket: 0 } });
    expect(best.newBest).toBe(true);
    expect(best.nearMiss).toContain("3 floors above your old best");
  });

  it("tips come from the run: armor for who fell, the zone's weakness, then stars", () => {
    const tips = runTips(state, heroes, { weapon: 0, armor: 0, trinket: 0 });
    expect(tips[0]).toMatchObject({ href: "/generate?categoryId=ARMOR" });
    expect(tips[0].text).toContain("Elf ranger fell first");
    const zone = towerWeek("2026-W42").find((z) => z.id === zoneFor(8).id)!;
    if (zone.weakTo.length) expect(tips[1].href).toContain("/generate?categoryId=WEAPONS&prompt=");
    // Spare armor: equip it instead of making one
    expect(runTips(state, heroes, { weapon: 0, armor: 2, trinket: 0 })[0]).toMatchObject({ href: null, picker: { index: 0, slot: "armor" } });
    expect(runTips(state, heroes, { weapon: 0, armor: 0, trinket: 0 }).length).toBeLessThanOrEqual(2);
  });
});

describe("daily limit", () => {
  it(`allows ${RUNS_PER_DAY} runs per UTC day`, () => {
    expect(nextRunIndex([])).toBe(1);
    expect(nextRunIndex([1, 2, 3, 4])).toBe(5);
    expect(nextRunIndex([1, 2, 3, 4, 5])).toBeNull();
    expect(runsLeft(0)).toBe(5);
    expect(runsLeft(9)).toBe(0);
  });

  it("days and weeks are UTC; seeds depend on user, day and run index", () => {
    expect(utcDay(new Date("2026-10-14T23:59:59Z"))).toBe("2026-10-14");
    const prev = previousWeek(new Date("2026-10-19T00:10:00Z"));
    expect(prev.week).toBe("2026-W42");
    const s = runSeed("u", "2026-10-14", 1);
    expect(runSeed("u", "2026-10-14", 2)).not.toBe(s);
    expect(runSeed("v", "2026-10-14", 1)).not.toBe(s);
    expect(hash32("abc")).toBe(hash32("abc"));
    expect(makeRng(1)()).toBe(makeRng(1)());
  });
});

describe("prizes (unchanged)", () => {
  it(`weekly credit prizes never exceed ${PRIZE_BUDGET_PER_WEEK} credits`, () => {
    expect(maxWeeklyPayout()).toBeLessThanOrEqual(PRIZE_BUDGET_PER_WEEK);
    expect(PRIZE_CREDITS.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(PRIZE_BUDGET_PER_WEEK);
  });

  it("top 3 get credits when eligible, top 10 a badge", () => {
    expect(prizeFor(1, true)).toEqual({ rank: 1, credits: 30, badge: "gold" });
    expect(prizeFor(4, true)).toEqual({ rank: 4, credits: 0, badge: "top10" });
    expect(prizeFor(1, false)).toEqual({ rank: 1, credits: 0, badge: "gold" });
    expect(prizeFor(BADGE_RANKS + 1, true)).toBeNull();
    expect(isEligibleForCredits(PRIZE_MIN_PAID_GENERATIONS)).toBe(true);
    expect(isEligibleForCredits(PRIZE_MIN_PAID_GENERATIONS - 1)).toBe(false);
  });

  it("leaderboard names never show an email", () => {
    expect(displayName("pixelfox", "u1")).toBe("pixelfox");
    expect(displayName(null, "u1")).toMatch(/^Creator #[0-9a-z]{5}$/);
    expect(publicTag("u1")).not.toBe(publicTag("u2"));
  });
});
