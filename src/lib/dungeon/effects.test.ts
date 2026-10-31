// Every blessing, chest buff and class special must change the climb, and be
// logged so the replay can show it. Each test runs the same floor with the same
// seed with and without the effect: the dice sequence is identical, so any
// difference is the effect.
import { describe, expect, it } from "vitest";
import { CHEST_BUFFS, blessingById, offerFor } from "./blessings";
import { CRIT_MULTIPLIER, type Element } from "./config";
import { chooseBlessing, initialState, runSegment, type BattleAction, type FloorLog, type RunState } from "./simulate";
import { deriveParty, type MemberFacts, type UnitStats } from "./stats";
import { floorEnemies, towerWeek } from "./tower";

const WEEK = "2026-W42";
let n = 0;
const sp = (categoryId: string, prompt: string) => ({ id: `e${n++}`, categoryId, styleId: "A", prompt, hd: false, animations: 0, rotated: false });
const hero = (prompt: string, gear: { w?: string; a?: string; t?: string } = {}): MemberFacts => ({
  hero: sp("CHARACTERS", prompt),
  weapon: gear.w ? sp("WEAPONS", gear.w) : null,
  armor: gear.a ? sp("ARMOR", gear.a) : null,
  trinket: gear.t ? sp("CONSUMABLES", gear.t) : null,
});

/** Fights one floor from a hand-made state. */
function fight(units: UnitStats[], o: { floor: number; blessings?: string[]; buffs?: string[]; hpRatio?: number; seed?: number }): { log: FloorLog; state: RunState } {
  const st: RunState = {
    ...initialState(units, o.seed ?? 1234, WEEK),
    floor: o.floor - 1,
    blessings: o.blessings ?? [],
    buffs: o.buffs ?? [],
    hp: units.map((u) => Math.max(1, Math.round(u.hp * (o.hpRatio ?? 1)))),
  };
  const seg = runSegment(units, st);
  return { log: seg.floors[0], state: seg.state };
}

const partyHits = (l: FloorLog) => l.actions.filter((a) => a.side === "party" && a.kind === "hit");
const enemyHits = (l: FloorLog) => l.actions.filter((a) => a.side === "enemy" && a.kind === "hit");
const first = (xs: BattleAction[]) => xs[0];

const basic = deriveParty([hero("knight"), hero("elf ranger"), hero("mage"), hero("dwarf cleric")]);
const DEEP = 22; // big enemy HP: hits are never capped by the target's remaining HP

describe("blessings change the outcome", () => {
  it("Whetstone: +15% party attack", () => {
    const off = first(partyHits(fight(basic, { floor: DEEP }).log)).amount;
    const on = first(partyHits(fight(basic, { floor: DEEP, blessings: ["whetstone"] }).log)).amount;
    expect(on / off).toBeGreaterThan(1.1);
    expect(on / off).toBeLessThan(1.2);
  });

  it("Bulwark: +25% defence → enemy hits land softer", () => {
    const off = first(enemyHits(fight(basic, { floor: DEEP }).log));
    const on = first(enemyHits(fight(basic, { floor: DEEP, blessings: ["bulwark"] }).log));
    expect(on.target).toBe(off.target);
    expect(on.amount).toBeLessThan(off.amount);
  });

  it("Second wind: standing heroes heal 20% of max HP more after the floor", () => {
    const strong = deriveParty([hero("knight", { w: "sword", a: "plate" }), hero("orc", { w: "axe" })]);
    const off = fight(strong, { floor: 1, hpRatio: 0.4 }).log.restHeal;
    const on = fight(strong, { floor: 1, hpRatio: 0.4, blessings: ["second-wind"] }).log.restHeal;
    on.forEach((h, i) => { if (off[i] > 0) expect(h - off[i]).toBe(Math.round(strong[i].hp * 0.35) - Math.round(strong[i].hp * 0.15)); });
    expect(on.reduce((a, b) => a + b, 0)).toBeGreaterThan(off.reduce((a, b) => a + b, 0));
  });

  it("Giant slayer: crits on bosses deal ×3.5 instead of ×1.75", () => {
    const critters = basic.map((u) => ({ ...u, crit: 1 }));
    const off = first(partyHits(fight(critters, { floor: 25 }).log));
    const on = first(partyHits(fight(critters, { floor: 25, blessings: ["giant-slayer"] }).log));
    expect(off.crit && on.crit).toBe(true);
    expect(on.amount / off.amount).toBeCloseTo(2, 1);
    // Not on normal floors
    const n1 = first(partyHits(fight(critters, { floor: 24 }).log)).amount;
    const n2 = first(partyHits(fight(critters, { floor: 24, blessings: ["giant-slayer"] }).log)).amount;
    expect(n2).toBe(n1);
    expect(CRIT_MULTIPLIER).toBe(1.75);
  });

  it("Iron wall: the Guardian draws more attacks, logged as taunts", () => {
    const party = deriveParty([hero("paladin"), hero("elf ranger"), hero("mage"), hero("cleric")]);
    // Share of enemy hits taken by the Guardian while it is still standing
    const count = (l: FloorLog) => {
      const ko = l.actions.findIndex((a) => a.side === "enemy" && a.target === 0 && a.ko);
      const hits = enemyHits({ ...l, actions: ko >= 0 ? l.actions.slice(0, ko + 1) : l.actions });
      return hits.filter((a) => a.taunt).length / Math.max(1, hits.length);
    };
    let off = 0, on = 0;
    for (let seed = 1; seed <= 12; seed++) {
      off += count(fight(party, { floor: 9, seed }).log);
      on += count(fight(party, { floor: 9, seed, blessings: ["iron-wall"] }).log);
    }
    expect(on / 12).toBeGreaterThan(0.8);
    expect(off / 12).toBeLessThan(0.75);
    // Only offered when there is a Guardian to use it
    for (let s = 0; s < 100; s++) expect(offerFor(s, 3, [], ["neutral"], false)).not.toContain("iron-wall");
  });

  it("Keen eye: +12% crit chance → more crits on the same dice", () => {
    let off = 0, on = 0;
    for (let seed = 1; seed <= 10; seed++) {
      off += partyHits(fight(basic, { floor: DEEP, seed }).log).filter((a) => a.crit).length;
      on += partyHits(fight(basic, { floor: DEEP, seed, blessings: ["keen-eye"] }).log).filter((a) => a.crit).length;
    }
    expect(on).toBeGreaterThan(off);
  });

  it("Exploit: weakness hits deal ×2 instead of ×1.5", () => {
    const zone = towerWeek(WEEK).find((z) => z.from <= DEEP && (z.to ?? 99) >= DEEP)!;
    const weak = zone.weakTo[0];
    expect(weak).toBeTruthy();
    const party = basic.map((u) => ({ ...u, attackElement: weak as Element, crit: 0 }));
    const off = first(partyHits(fight(party, { floor: DEEP }).log));
    const on = first(partyHits(fight(party, { floor: DEEP, blessings: ["exploit"] }).log));
    expect(off.matchup).toBe("weak");
    expect(on.amount / off.amount).toBeCloseTo(2 / 1.5, 1);
  });

  it("Leech: each hit heals the attacker 10% of the damage, logged on the hit", () => {
    const { log } = fight(basic, { floor: DEEP, hpRatio: 0.5, blessings: ["leech"] });
    const leeches = partyHits(log).filter((a) => a.leech);
    expect(leeches.length).toBeGreaterThan(0);
    const a = leeches[0];
    const total = a.amount + (a.extra ?? []).reduce((s, x) => s + x.amount, 0);
    expect(a.leech).toBe(Math.round(total * 0.1));
    expect(partyHits(fight(basic, { floor: DEEP, hpRatio: 0.5 }).log).some((x) => x.leech)).toBe(false);
  });

  it("Phoenix feather: the next hero to fall gets back up once at 50% HP", () => {
    const weak = deriveParty([hero("mage"), hero("elf ranger")]);
    const { log, state } = fight(weak, { floor: DEEP, blessings: ["phoenix"] });
    const revives = log.actions.filter((a) => a.kind === "revive");
    expect(revives).toHaveLength(1);
    expect(revives[0].amount).toBe(Math.round(weak[revives[0].target].hp * 0.5));
    // It follows the knock-out of the same hero
    const i = log.actions.indexOf(revives[0]);
    expect(log.actions[i - 1]).toMatchObject({ side: "enemy", target: revives[0].target, ko: true });
    expect(state.revivesUsed).toBe(1);
    expect(fight(weak, { floor: DEEP }).log.actions.some((a) => a.kind === "revive")).toBe(false);
  });

  it("Phoenix feather picked while a hero is already down: they get back up as the next floor starts", () => {
    const party = deriveParty([hero("knight"), hero("mage"), hero("cleric")]);
    const paused: RunState = { ...initialState(party, 77, WEEK), floor: 3, hp: [0, party[1].hp, party[2].hp], offer: ["phoenix", "whetstone", "bulwark"] };
    const c = chooseBlessing(paused, "phoenix");
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    const seg = runSegment(party, c.state);
    expect(seg.floors[0].startEvents).toEqual([{ kind: "revive", target: 0, amount: Math.round(party[0].hp * 0.5) }]);
    expect(seg.floors[0].partyHpStart[0]).toBe(Math.round(party[0].hp * 0.5));
    // The feather is used up: nobody else is revived later
    expect(seg.floors.flatMap((f) => f.actions).some((a) => a.kind === "revive")).toBe(false);
  });

  it("Ambush: +50% damage in round one only, flagged on the hit", () => {
    const off = partyHits(fight(basic, { floor: DEEP }).log);
    const on = partyHits(fight(basic, { floor: DEEP, blessings: ["ambush"] }).log);
    expect(on[0].ambush).toBe(true);
    const r1 = (xs: BattleAction[]) => xs.filter((a) => a.round === 1).reduce((t, a) => t + a.amount, 0);
    expect(r1(on) / r1(off)).toBeGreaterThan(1.4);
    expect(r1(on) / r1(off)).toBeLessThan(1.6);
    expect(on.filter((a) => a.round > 1).every((a) => !a.ambush)).toBe(true);
  });

  it("Element oaths: that element's attacks deal +30%", () => {
    const fire = basic.map((u) => ({ ...u, attackElement: "fire" as Element, crit: 0 }));
    const off = first(partyHits(fight(fire, { floor: DEEP }).log)).amount;
    const on = first(partyHits(fight(fire, { floor: DEEP, blessings: ["oath-fire"] }).log)).amount;
    expect(on / off).toBeCloseTo(1.3, 1);
    const ice = first(partyHits(fight(basic.map((u) => ({ ...u, attackElement: "ice" as Element, crit: 0 })), { floor: DEEP, blessings: ["oath-fire"] }).log)).amount;
    const ice0 = first(partyHits(fight(basic.map((u) => ({ ...u, attackElement: "ice" as Element, crit: 0 })), { floor: DEEP }).log)).amount;
    expect(ice).toBe(ice0);
  });

  it("every blessing and chest buff has a definition and text", () => {
    for (const id of ["whetstone", "bulwark", "second-wind", "giant-slayer", "iron-wall", "keen-eye", "exploit", "leech", "phoenix", "ambush", "oath-fire", ...CHEST_BUFFS.map((c) => c.id)]) {
      const b = blessingById(id);
      expect(b, id).not.toBeNull();
      expect(b!.text.length).toBeGreaterThan(10);
    }
  });
});

describe("new run upgrades (Oct 2026) change the outcome and are logged", () => {
  // Same floor, same seed: the dice match until the effect, so the first hit it touches differs
  it("Executioner: hits on enemies below 30% HP deal more and are flagged", () => {
    // A boss has HP to spare below 30%, so the extra damage isn't hidden by a killing blow
    const tanks = basic.map((u) => ({ ...u, hp: 100_000 }));
    const off = partyHits(fight(tanks, { floor: 25 }).log);
    const on = partyHits(fight(tanks, { floor: 25, blessings: ["executioner"] }).log);
    expect(off.some((a) => a.execute)).toBe(false);
    const k = on.findIndex((a) => a.execute && !a.ko);
    expect(k).toBeGreaterThan(0);
    expect(on[k].amount / off[k].amount).toBeCloseTo(1.5, 1);
    expect(on.slice(0, on.findIndex((a) => a.execute)).map((a) => a.amount)).toEqual(off.slice(0, on.findIndex((a) => a.execute)).map((a) => a.amount));
  });

  it("Kingslayer: +35% damage on a boss floor, nothing on a normal one", () => {
    const boss = first(partyHits(fight(basic, { floor: 25 }).log)).amount;
    const bossOn = first(partyHits(fight(basic, { floor: 25, blessings: ["kingslayer"] }).log)).amount;
    expect(bossOn / boss).toBeCloseTo(1.35, 1);
    expect(first(partyHits(fight(basic, { floor: DEEP, blessings: ["kingslayer"] }).log)).amount)
      .toBe(first(partyHits(fight(basic, { floor: DEEP }).log)).amount);
  });

  it("Battle rhythm: round 1 is unchanged, later rounds hit harder", () => {
    const off = partyHits(fight(basic, { floor: DEEP }).log);
    const on = partyHits(fight(basic, { floor: DEEP, blessings: ["battle-rhythm"] }).log);
    expect(on.filter((a) => a.round === 1).map((a) => a.amount)).toEqual(off.filter((a) => a.round === 1).map((a) => a.amount));
    const k = on.findIndex((a) => a.round === 2);
    expect(on[k].amount).toBeGreaterThan(off[k].amount);
  });

  it("Last stand: a hero below 35% HP deals +60%, flagged", () => {
    const off = first(partyHits(fight(basic, { floor: DEEP, hpRatio: 0.2 }).log));
    const on = first(partyHits(fight(basic, { floor: DEEP, hpRatio: 0.2, blessings: ["last-stand"] }).log));
    expect(on.lastStand).toBe(true);
    expect(on.amount / off.amount).toBeCloseTo(1.6, 1);
    expect(first(partyHits(fight(basic, { floor: DEEP, blessings: ["last-stand"] }).log)).lastStand).toBeUndefined();
  });

  it("Twin strike: some attacks strike again for less, logged as a separate hit", () => {
    let doubles = 0;
    for (let seed = 1; seed <= 10; seed++) {
      const hits = partyHits(fight(basic, { floor: DEEP, seed, blessings: ["twin-strike"] }).log);
      doubles += hits.filter((a) => a.double).length;
      expect(partyHits(fight(basic, { floor: DEEP, seed }).log).some((a) => a.double)).toBe(false);
    }
    expect(doubles).toBeGreaterThan(0);
  });

  it("Vengeance: a fallen hero fires up the others for the rest of the floor", () => {
    const weak = deriveParty([hero("rogue"), hero("elf ranger"), hero("mage")]);
    let checked = 0;
    for (let seed = 1; seed <= 20 && !checked; seed++) {
      const off = fight(weak, { floor: DEEP + 5, seed }).log.actions;
      const on = fight(weak, { floor: DEEP + 5, seed, blessings: ["vengeance"] }).log.actions;
      const ko = on.findIndex((a) => a.rally);
      if (ko < 0) continue;
      const after = on.findIndex((a, k) => k > ko && a.side === "party" && a.kind === "hit" && !a.ko);
      if (after < 0 || !off[after]) continue;
      expect(on[after].amount).toBeGreaterThan(off[after].amount);
      checked++;
    }
    expect(checked).toBe(1);
  });

  it("Blessed hands: heals are 50% stronger; only offered when the party heals", () => {
    const party = deriveParty([hero("knight"), hero("dwarf cleric")]);
    const off = fight(party, { floor: DEEP, hpRatio: 0.3 }).log.actions.filter((a) => a.kind === "heal");
    const on = fight(party, { floor: DEEP, hpRatio: 0.3, blessings: ["blessed-hands"] }).log.actions.filter((a) => a.kind === "heal");
    expect(on[0].amount).toBe(Math.round(off[0].amount * 1.5));
    for (let s = 0; s < 100; s++) expect(offerFor(s, 3, [], ["neutral"], true, false)).not.toContain("blessed-hands");
  });

  it("Offers are weighted by tier: Epic shows up, but less often than Common", () => {
    const seen: Record<string, number> = { common: 0, rare: 0, epic: 0 };
    for (let s = 0; s < 600; s++) for (const id of offerFor(s, 3, [], ["fire"])) seen[blessingById(id)!.tier]++;
    expect(seen.epic).toBeGreaterThan(0);
    expect(seen.common).toBeGreaterThan(seen.rare);
    expect(seen.rare).toBeGreaterThan(seen.epic);
  });

  it("every blessing and chest buff has a tier", () => {
    for (let s = 0; s < 50; s++) for (const id of offerFor(s, 3, [], ["fire", "ice"])) expect(blessingById(id)?.tier).toMatch(/common|rare|epic/);
    for (const c of CHEST_BUFFS) expect(c.tier).toBe("common");
  });
});

describe("boss chests are awarded and work", () => {
  it("clearing a boss floor drops a chest whose buff applies from the next floor", () => {
    const strong = deriveParty(["knight", "orc", "elf ranger", "cleric"].map((p) => hero(p, { w: "sword", a: "plate", t: "potion" })).map((m) => ({
      ...m, hero: { ...m.hero, hd: true, animations: 3 },
    })));
    const st: RunState = { ...initialState(strong, 5, WEEK), floor: 4 };
    const seg = runSegment(strong, st);
    expect(seg.floors[0].floor).toBe(5);
    expect(seg.floors[0].cleared).toBe(true);
    expect(seg.floors[0].chest).toBeTruthy();
    expect(seg.state.buffs).toEqual([seg.floors[0].chest]);
  });

  it("Giant's tonic +10% attack, Iron charm +10% defence, Lucky coin +5% crit, Mending moss +10% heal", () => {
    const r1 = (l: FloorLog) => partyHits(l).filter((a) => a.round === 1).reduce((t, a) => t + a.amount, 0);
    const atk0 = r1(fight(basic, { floor: DEEP }).log);
    const atk1 = r1(fight(basic, { floor: DEEP, buffs: ["chest-might"] }).log);
    expect(atk1 / atk0).toBeGreaterThan(1.05);
    const def0 = first(enemyHits(fight(basic, { floor: DEEP }).log)).amount;
    const def1 = first(enemyHits(fight(basic, { floor: DEEP, buffs: ["chest-guard"] }).log)).amount;
    expect(def1).toBeLessThan(def0);
    let c0 = 0, c1 = 0;
    for (let seed = 1; seed <= 15; seed++) {
      c0 += partyHits(fight(basic, { floor: DEEP, seed }).log).filter((a) => a.crit).length;
      c1 += partyHits(fight(basic, { floor: DEEP, seed, buffs: ["chest-luck"] }).log).filter((a) => a.crit).length;
    }
    expect(c1).toBeGreaterThan(c0);
    const strong = deriveParty([hero("knight", { w: "sword", a: "plate" }), hero("orc", { w: "axe" })]);
    const h0 = fight(strong, { floor: 1, hpRatio: 0.4 }).log.restHeal.reduce((a, b) => a + b, 0);
    const h1 = fight(strong, { floor: 1, hpRatio: 0.4, buffs: ["chest-mend"] }).log.restHeal.reduce((a, b) => a + b, 0);
    expect(h1).toBeGreaterThan(h0);
  });
});


describe("class specials and gear effects show up in the log", () => {
  it("Healer heals the weakest hurt ally (green heal actions)", () => {
    const party = deriveParty([hero("knight"), hero("dwarf cleric")]);
    const heals = fight(party, { floor: DEEP, hpRatio: 0.6 }).log.actions.filter((a) => a.kind === "heal");
    expect(heals.length).toBeGreaterThan(0);
    expect(heals.every((a) => a.actor === 1 && a.amount > 0)).toBe(true);
  });

  it("Caster hits every enemy; a staff on a non-caster splashes the others", () => {
    const multi = DEEP + 1; // a normal floor with several enemies
    expect(floorEnemies(WEEK, multi).length).toBeGreaterThan(1);
    const caster = deriveParty([hero("fire mage")]);
    const hit = first(partyHits(fight(caster, { floor: multi }).log));
    expect(1 + (hit.extra?.length ?? 0)).toBe(floorEnemies(WEEK, multi).length);
    const staff = deriveParty([hero("knight", { w: "oak staff" })]);
    expect(first(partyHits(fight(staff, { floor: multi }).log)).extra?.length).toBeGreaterThan(0);
    const plain = deriveParty([hero("knight", { w: "iron mace" })]);
    expect(first(partyHits(fight(plain, { floor: multi }).log)).extra).toBeUndefined();
  });

  it("Striker crits more often than a Guardian", () => {
    const rate = (p: string) => {
      let c = 0, t = 0;
      for (let seed = 1; seed <= 10; seed++) {
        const hits = partyHits(fight(deriveParty([hero(p)]), { floor: DEEP, seed }).log);
        c += hits.filter((a) => a.crit).length; t += hits.length;
      }
      return c / t;
    };
    expect(rate("elf ranger")).toBeGreaterThan(rate("knight") + 0.1);
  });

  it("Guardian taunts are logged; with no Guardian there are none", () => {
    expect(enemyHits(fight(deriveParty([hero("paladin"), hero("mage")]), { floor: DEEP }).log).some((a) => a.taunt)).toBe(true);
    expect(enemyHits(fight(deriveParty([hero("rogue"), hero("mage")]), { floor: DEEP }).log).some((a) => a.taunt)).toBe(false);
  });

  it("An element trinket wards off that element: softer hits, logged as Ward", () => {
    const zone = towerWeek(WEEK).find((z) => z.from <= DEEP && (z.to ?? 99) >= DEEP)!;
    expect(zone.element).not.toBe("neutral");
    const word = { fire: "fire", ice: "ice", poison: "poison", holy: "holy", shadow: "shadow", nature: "forest", lightning: "storm", neutral: "" }[zone.element];
    const warded = deriveParty([hero("rogue", { t: `${word} amulet` })]);
    const bare = deriveParty([hero("rogue")]);
    expect(warded[0].ward).toBe(zone.element);
    const w = first(enemyHits(fight(warded, { floor: DEEP }).log));
    const b = first(enemyHits(fight(bare, { floor: DEEP }).log));
    expect(w.ward).toBe(true);
    expect(w.amount).toBeLessThan(b.amount);
  });
});
