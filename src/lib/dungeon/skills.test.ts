import { describe, expect, it } from "vitest";
import { pickAnimations, roleOf } from "./anims";
import { SKILL_RULES, TIER_MIN } from "./config";
import { initialState, runSegment, type RunState } from "./simulate";
import { autoAssignSkills, isSkillLabel, resolveSkills, scoreSkill, skillName, slotAccepts, tierFor, type Raster } from "./skills";
import { deriveParty, skillRule, type MemberFacts, type SkillInput } from "./stats";

// ── synthetic sheets ─────────────────────────────────────────────────────────
const W = 32, H = 32;
function frame(paint: (x: number, y: number) => [number, number, number, number] | null): Raster {
  const data = new Uint8Array(W * H * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = paint(x, y);
    if (c) data.set(c, (y * W + x) * 4);
  }
  return { w: W, h: H, data };
}
/** A 10×16 grey knight standing in the middle. */
const body = (dx = 0) => (x: number, y: number): [number, number, number, number] | null =>
  x >= 11 + dx && x < 21 + dx && y >= 14 && y < 30 ? [120, 120, 130, 255] : null;
const source = frame(body());

describe("spectacle score", () => {
  it("a static animation scores low (Common)", () => {
    const r = scoreSkill({ frames: [source, source, source, source], source, frameCount: 4 });
    expect(r.metrics.motion).toBe(0);
    expect(r.metrics.reach).toBe(1);
    expect(r.metrics.newColours).toBe(0);
    expect(r.score).toBe(r.metrics.framesPts);
    expect(r.tier).toBe("common");
  });

  it("movement raises the motion part", () => {
    const moving = [0, 3, 6, 3].map((dx) => frame(body(dx)));
    const r = scoreSkill({ frames: moving, source, frameCount: 4 });
    expect(r.metrics.motion).toBeGreaterThan(0.2);
    expect(r.metrics.motionPts).toBeGreaterThan(15);
  });

  it("a wide effect (breath, shockwave) raises reach", () => {
    const wide = [0, 1, 2, 3].map((k) => frame((x, y) => body()(x, y) ?? (y >= 20 && y < 24 && x >= 21 && x < 21 + k * 3 ? [120, 120, 130, 255] : null)));
    const r = scoreSkill({ frames: wide, source, frameCount: 4 });
    expect(r.metrics.reach).toBeGreaterThan(1.5);
    expect(r.metrics.reachPts).toBeGreaterThan(10);
  });

  it("new effect colours (fire, magic) raise the effects part", () => {
    const fire = [0, 1, 2, 3].map((k) => frame((x, y) => body()(x, y) ?? (y >= 18 && y < 26 && x >= 21 && x < 31 ? [[255, 80, 0, 255], [255, 200, 40, 255], [255, 140, 0, 255], [200, 40, 0, 255]][(x + y + k) % 4] as [number, number, number, number] : null)));
    const r = scoreSkill({ frames: fire, source, frameCount: 4 });
    expect(r.metrics.newColours).toBeGreaterThanOrEqual(3);
    expect(r.metrics.coverage).toBeGreaterThan(0.2);
    expect(r.metrics.effectsPts).toBeGreaterThan(15);
  });

  it("more frames score more; the score is deterministic and capped at 100", () => {
    const f4 = scoreSkill({ frames: [source, source], source, frameCount: 4 }).metrics.framesPts;
    const f9 = scoreSkill({ frames: [source, source], source, frameCount: 9 }).metrics.framesPts;
    expect(f9).toBeGreaterThan(f4);
    const big = [0, 4, 8, 4, 0, 4, 8, 4, 0].map((dx, k) => frame((x, y) => body(dx)(x, y) ?? (y >= 2 && x >= 0 && (x + k) % 3 === 0 ? [40 + k * 25, 220, 255 - k * 20, 255] : null)));
    const a = scoreSkill({ frames: big, source, frameCount: 9 });
    const b = scoreSkill({ frames: big, source, frameCount: 9 });
    expect(a).toEqual(b);
    expect(a.score).toBeLessThanOrEqual(100);
    expect(a.score).toBeGreaterThanOrEqual(TIER_MIN.epic);
  });

  it("tiers: Common < 35, Rare 35+, Epic 60+, Legendary 80+", () => {
    expect([0, 34, 35, 59, 60, 79, 80, 100].map(tierFor)).toEqual(["common", "common", "rare", "rare", "epic", "epic", "legendary", "legendary"]);
  });
});

describe("skill labels and slots", () => {
  it("attack-type labels are skills; idle / walk / hurt are not", () => {
    for (const l of ["attack", "slash", "cast", "fire breath", "ground slam", "bite", "combo", "special"]) expect(isSkillLabel(l), l).toBe(true);
    for (const l of ["idle", "walk", "run", "hurt", "defeat", "jump", "4 directions"]) expect(isSkillLabel(l), l).toBe(false);
    expect(skillName("ground slam")).toBe("Ground Slam");
  });

  it("the Legendary slot needs Epic+, Special needs Rare+, Basic takes anything", () => {
    expect(slotAccepts("legendary", "common")).toBe(false);
    expect(slotAccepts("legendary", "rare")).toBe(false);
    expect(slotAccepts("legendary", "epic")).toBe(true);
    expect(slotAccepts("special", "rare")).toBe(true);
    expect(slotAccepts("special", "common")).toBe(false);
    expect(slotAccepts("basic", "common")).toBe(true);
  });

  it("auto-assigns the best animation to the highest slot it qualifies for", () => {
    expect(autoAssignSkills([{ id: "a", score: 85, tier: "legendary" }, { id: "b", score: 40, tier: "rare" }, { id: "c", score: 10, tier: "common" }]))
      .toEqual({ legendary: "a", special: "b", basic: "c" });
    // A lone Common goes to Basic; a lone Rare to Special (Basic stays the plain attack)
    expect(autoAssignSkills([{ id: "c", score: 10, tier: "common" }])).toEqual({ basic: "c" });
    expect(autoAssignSkills([{ id: "b", score: 40, tier: "rare" }])).toEqual({ special: "b" });
    expect(autoAssignSkills([])).toEqual({});
  });

  it("a player's choice is kept only when valid; the rest is filled automatically", () => {
    const opts = [{ id: "a", score: 85, tier: "legendary" as const }, { id: "b", score: 40, tier: "rare" as const }, { id: "c", score: 10, tier: "common" as const }];
    expect(resolveSkills({ basic: "a" }, opts)).toEqual({ basic: "a", special: "b" });
    // Too weak for the slot, not this hero's, or used twice → dropped
    expect(resolveSkills({ legendary: "b", special: "zz", basic: "c" }, opts)).toEqual({ legendary: "a", special: "b", basic: "c" });
    const dup = resolveSkills({ special: "b", basic: "b" }, opts);
    const ids = Object.values(dup);
    expect(new Set(ids).size).toBe(ids.length); // each animation sits in one slot only
  });
});

describe("hero animation roles for the stage", () => {
  it("picks the newest sheet per role from the labels; rotation sets are skipped", () => {
    const rows = [
      { id: "a2", source_generation_id: "h", prompt: "[Animation: attack, 6f] knight", image_url: "u/a2" },
      { id: "a1", source_generation_id: "h", prompt: "[Animation: attack, 4f] knight", image_url: "u/a1" },
      { id: "i1", source_generation_id: "h", prompt: "[Animation: idle, 4f] knight", image_url: "u/i1" },
      { id: "w1", source_generation_id: "h", prompt: "[Animation: 4-direction walk, 16f] knight", image_url: "u/w1" },
      { id: "r1", source_generation_id: "h", prompt: "[Animation: 8 directions, 8f] knight", image_url: "u/r1" },
      { id: "x1", source_generation_id: "g", prompt: "[Animation: hurt, 4f] golem", image_url: "u/x1" },
    ];
    const anims = pickAnimations(rows);
    expect(anims.h.attack?.url).toBe("u/a2");
    expect(anims.h.idle?.url).toBe("u/i1");
    expect(anims.h.walk).toMatchObject({ url: "u/w1", walkSet: true });
    expect(anims.g.hurt?.url).toBe("u/x1");
    expect(roleOf("8 directions")).toBeNull();
    expect(roleOf("ground slam")).toBe("attack");
    expect(roleOf("death")).toBe("defeat");
  });
});

describe("skills in battle", () => {
  const sp = (id: string, prompt: string) => ({ id, categoryId: "CHARACTERS", styleId: "A", prompt, hd: true, animations: 3, rotated: false });
  const withSkills = (skills: SkillInput[]): MemberFacts => ({ hero: sp("h", "orc"), skills });
  const fight = (skills: SkillInput[], floor = 12) => {
    const units = deriveParty([withSkills(skills), { hero: sp("k", "knight") }]);
    const st: RunState = { ...initialState(units, 4321, "2026-W42"), floor: floor - 1 };
    return runSegment(units, st).floors[0];
  };
  const heroHits = (f: ReturnType<typeof fight>) => f.actions.filter((a) => a.side === "party" && a.actor === 0 && a.kind === "hit");

  it("slot + tier decide the rule", () => {
    expect(skillRule("basic", "legendary")).toBe("basic");
    expect(skillRule("special", "rare")).toBe("rare");
    expect(skillRule("special", "legendary")).toBe("epic");
    expect(skillRule("legendary", "epic")).toBe("epic");
    expect(skillRule("legendary", "legendary")).toBe("legendary");
  });

  it("Legendary fires once per floor on the hero's 2nd turn, hits every enemy ×2.5 and stuns them", () => {
    const f = fight([{ slot: "legendary", tier: "legendary", name: "Ground Slam", animId: "anim-leg" }]);
    const legs = heroHits(f).filter((a) => a.skill?.rule === "legendary");
    expect(legs).toHaveLength(1);
    expect(legs[0].round).toBe(SKILL_RULES.legendary.atTurn);
    expect(legs[0].skill).toMatchObject({ name: "Ground Slam", animId: "anim-leg", tier: "legendary" });
    expect(legs[0].stun?.length).toBeGreaterThan(0);
    const after = f.actions.slice(f.actions.indexOf(legs[0]));
    expect(after.some((a) => a.kind === "stunned" && legs[0].stun!.includes(a.actor))).toBe(true);
    // Every living enemy was hit
    expect(1 + (legs[0].extra?.length ?? 0)).toBeGreaterThanOrEqual(legs[0].stun!.length);
  });

  it("Epic fires every 4th turn on every enemy; Rare every 3rd turn on one enemy at ×1.5", () => {
    const epic = heroHits(fight([{ slot: "special", tier: "epic", name: "Cleave", animId: "e" }], 22));
    expect(epic.filter((a) => a.skill?.rule === "epic").map((a) => a.round).every((r) => r % SKILL_RULES.epic.every === 0)).toBe(true);
    const rare = heroHits(fight([{ slot: "special", tier: "rare", name: "Slash", animId: "r" }], 22));
    const rares = rare.filter((a) => a.skill?.rule === "rare");
    expect(rares.length).toBeGreaterThan(0);
    expect(rares.every((a) => a.round % SKILL_RULES.rare.every === 0 && !a.extra)).toBe(true);
  });

  it("skills make the party deeper and stronger on paper", () => {
    const none = deriveParty([withSkills([])])[0];
    const leg = deriveParty([withSkills([{ slot: "legendary", tier: "legendary", name: "Slam", animId: "x" }])])[0];
    expect(leg.power).toBeGreaterThan(none.power);
    expect(leg.why.skillBonus).toBeCloseTo(0.4);
    const dealt = (sk: SkillInput[]) => fight(sk, 22).dealt[0];
    expect(dealt([{ slot: "legendary", tier: "legendary", name: "Slam", animId: "x" }])).toBeGreaterThan(dealt([]));
  });
});
