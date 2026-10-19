// "Next upgrades" must only promise what the game rules actually give, at the
// price the tools actually charge.
import { describe, expect, it } from "vitest";
import { animationMultiplier, animationStep } from "./config";
import { deriveMember, itemBonus, type SpriteFacts } from "./stats";
import { partyUpgrades, type UpgradeCosts } from "./upgrades";
import type { DungeonSprite, PartyMember } from "./store";

const COSTS: UpgradeCosts = { sprite: 1, hdSprite: 3, animationMin: 3, animationMax: 12, attackMin: 7 };

const facts = (id: string, categoryId: string, animations = 0, hd = false, prompt = id): SpriteFacts =>
  ({ id, categoryId, styleId: "A", prompt, hd, animations, rotated: false });

const sprite = (f: SpriteFacts, slot: DungeonSprite["slot"], power = 10): DungeonSprite => ({
  id: f.id, name: f.prompt, imageUrl: "", styleId: "A", categoryId: f.categoryId, slot, pixel: false,
  stars: 1, hd: f.hd, animated: f.animations > 0, animations: f.animations, element: "neutral", classId: null, power,
  stats: null, bonus: slot === "hero" ? null : itemBonus(f, slot),
});

const member = (hero: SpriteFacts, gear: Partial<Record<"weapon" | "armor" | "trinket", SpriteFacts>> = {}, skills = 0): PartyMember => ({
  hero: sprite(hero, "hero"),
  weapon: gear.weapon ? sprite(gear.weapon, "weapon") : null,
  armor: gear.armor ? sprite(gear.armor, "armor") : null,
  trinket: gear.trinket ? sprite(gear.trinket, "trinket") : null,
  stats: deriveMember({ hero }),
  skills: Array.from({ length: skills }, (_, k) => ({ id: `s${k}`, name: "", label: "attack", score: 10 }) as never),
});

describe("partyUpgrades", () => {
  it("offers free gear the player already owns first, with that item's real bonus", () => {
    const sword = facts("iron sword", "WEAPONS");
    const ups = partyUpgrades([member(facts("knight", "CHARACTERS", 1), {}, 1)], [sprite(sword, "weapon")], COSTS);
    expect(ups[0]).toMatchObject({ kind: "equip", cost: "Free", href: null, picker: { index: 0, slot: "weapon" } });
    expect(ups[0].effect).toContain(itemBonus(sword, "weapon").text);
  });

  it("never offers the same spare item to two heroes", () => {
    const ups = partyUpgrades(
      [member(facts("knight", "CHARACTERS", 1), {}, 1), member(facts("elf", "CHARACTERS", 1), {}, 1)],
      [sprite(facts("sword", "WEAPONS"), "weapon")], COSTS, 5,
    );
    expect(ups.filter((u) => u.kind === "equip")).toHaveLength(1);
  });

  it("an unanimated hero gets its first animation at the real +30% and the real price range", () => {
    const ups = partyUpgrades([member(facts("knight", "CHARACTERS"), { weapon: facts("s", "WEAPONS"), armor: facts("a", "ARMOR"), trinket: facts("p potion", "CONSUMABLES") })], [], COSTS);
    const a = ups.find((u) => u.kind === "animate")!;
    expect(a.effect).toContain(`+${Math.round((animationStep(1) / animationMultiplier(0)) * 100)}%`);
    expect(a.cost).toBe("3–12 credits");
    expect(a.href).toBe("/animate?id=knight");
  });

  it("asks to make gear only when none is owned, at the sprite price", () => {
    const ups = partyUpgrades([member(facts("knight", "CHARACTERS", 2), {}, 1)], [], COSTS);
    const make = ups.find((u) => u.kind === "make-gear")!;
    expect(make.cost).toBe("1 credit");
    expect(make.href).toBe("/generate?categoryId=WEAPONS");
    expect(ups.filter((u) => u.kind === "make-gear")).toHaveLength(1); // one per hero
  });

  it("a fully equipped, animated hero with a skill only gets the next animation and HD", () => {
    const full = member(facts("knight", "CHARACTERS", 2), { weapon: facts("s", "WEAPONS"), armor: facts("a", "ARMOR"), trinket: facts("p potion", "CONSUMABLES") }, 1);
    const kinds = partyUpgrades([full], [], COSTS).map((u) => u.kind);
    expect(kinds).toEqual(["animate", "hd-hero"]);
  });

  it("stops suggesting animations at the counted cap", () => {
    const capped = member(facts("knight", "CHARACTERS", 6, true), { weapon: facts("s", "WEAPONS"), armor: facts("a", "ARMOR"), trinket: facts("p potion", "CONSUMABLES") }, 1);
    expect(partyUpgrades([capped], [], COSTS)).toEqual([]);
  });

  it("an attack skill is priced from the cheapest attack-capable animation", () => {
    const ups = partyUpgrades([member(facts("knight", "CHARACTERS", 1), { weapon: facts("s", "WEAPONS"), armor: facts("a", "ARMOR"), trinket: facts("p potion", "CONSUMABLES") })], [], COSTS);
    expect(ups.find((u) => u.kind === "attack-skill")?.cost).toBe("7–12 credits");
  });

  it("shows different kinds of action before a second of the same kind", () => {
    const party = ["a", "b", "c", "d"].map((id) => member(facts(id, "CHARACTERS")));
    const kinds = partyUpgrades(party, [], COSTS).map((u) => u.kind);
    // Four unanimated heroes would fill all three with "Animate"; gear gets a place
    expect(kinds).toHaveLength(3);
    expect(kinds).toContain("animate");
    expect(kinds).toContain("make-gear");
  });

  it("returns at most `max` suggestions and nothing for an empty party", () => {
    const party = ["a", "b", "c", "d"].map((id) => member(facts(id, "CHARACTERS")));
    expect(partyUpgrades(party, [], COSTS)).toHaveLength(3);
    expect(partyUpgrades([], [], COSTS)).toEqual([]);
  });
});
