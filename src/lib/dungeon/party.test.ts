import { describe, expect, it } from "vitest";
import { autoEquip, itemScore, parseSlots, referencedIds, validateSlots } from "./party";
import { deriveUnit, type SpriteFacts } from "./stats";

const sp = (id: string, categoryId: string, animated = false, hd = false, prompt = id): SpriteFacts =>
  ({ id, categoryId, styleId: "A", prompt, hd, animations: animated ? 1 : 0, rotated: false });
const own = (...list: SpriteFacts[]) => new Map(list.map((s) => [s.id, s]));

describe("parseSlots", () => {
  it("reads the old format (plain ids) as heroes", () => {
    expect(parseSlots(["a", "b"])).toEqual([{ hero: "a" }, { hero: "b" }]);
  });

  it("reads the new format and skips anything malformed", () => {
    expect(parseSlots([{ hero: "h", weapon: "w", armor: 5, trinket: "" }, { weapon: "x" }, null, 42, "", { hero: "k", armor: "a" }]))
      .toEqual([{ hero: "h", weapon: "w" }, { hero: "k", armor: "a" }]);
    expect(parseSlots(null)).toEqual([]);
    expect(parseSlots({ hero: "h" })).toEqual([]);
    expect(parseSlots(["x".repeat(65)])).toEqual([]);
  });

  it("lists every referenced id once", () => {
    expect(referencedIds([{ hero: "h", weapon: "w" }, { hero: "k", weapon: "w", trinket: "t" }]).sort()).toEqual(["h", "k", "t", "w"]);
  });
});

describe("validateSlots (server side, never trusts the client)", () => {
  const owned = own(
    sp("knight", "CHARACTERS"), sp("wolf", "CREATURES"), sp("elf", "CHARACTERS"),
    sp("sword", "WEAPONS"), sp("plate", "ARMOR"), sp("potion", "CONSUMABLES"), sp("ore", "RESOURCES"), sp("axe", "WEAPONS"),
  );

  it("old rows keep only figure ids as heroes", () => {
    const old = parseSlots(["sword", "knight", "plate", "wolf"]);
    expect(validateSlots(old, owned)).toEqual([{ hero: "knight" }, { hero: "wolf" }]);
  });

  it("drops sprites the user doesn't own (or that aren't originals)", () => {
    expect(validateSlots([{ hero: "someone-elses", weapon: "sword" }, { hero: "knight", weapon: "stolen" }], owned)).toEqual([{ hero: "knight" }]);
  });

  it("each gear slot takes only its category", () => {
    expect(validateSlots([{ hero: "knight", weapon: "plate", armor: "sword", trinket: "knight" }], owned)).toEqual([{ hero: "knight" }]);
    expect(validateSlots([{ hero: "knight", weapon: "sword", armor: "plate", trinket: "ore" }], owned))
      .toEqual([{ hero: "knight", weapon: "sword", armor: "plate", trinket: "ore" }]);
  });

  it("an item can be worn by one member only, a hero can appear once", () => {
    expect(validateSlots([{ hero: "knight", weapon: "sword" }, { hero: "wolf", weapon: "sword" }, { hero: "knight" }], owned))
      .toEqual([{ hero: "knight", weapon: "sword" }, { hero: "wolf" }]);
  });

  it("weapons, armor and items can't be party members", () => {
    expect(validateSlots([{ hero: "sword" }, { hero: "plate" }, { hero: "potion" }], owned)).toEqual([]);
  });

  it("keeps at most 4 members", () => {
    const many = own(...["a", "b", "c", "d", "e"].map((id) => sp(id, "CHARACTERS")));
    expect(validateSlots(["a", "b", "c", "d", "e"].map((hero) => ({ hero })), many)).toHaveLength(4);
  });
});

describe("autoEquip", () => {
  const roster = [
    sp("h1", "CHARACTERS"), sp("h2", "CHARACTERS", true), sp("h3", "CREATURES"), sp("h4", "CHARACTERS", false, true), sp("h5", "CHARACTERS"),
    sp("w1", "WEAPONS"), sp("w2", "WEAPONS", true), sp("a1", "ARMOR"), sp("t1", "RESOURCES"), sp("t2", "CONSUMABLES", true),
  ];

  it("takes the 4 strongest figures and gives each the best unused gear, deterministically", () => {
    const slots = autoEquip(roster);
    expect(slots).toHaveLength(4);
    const heroes = roster.filter((s) => s.categoryId === "CHARACTERS" || s.categoryId === "CREATURES")
      .sort((a, b) => deriveUnit(b).power - deriveUnit(a).power).slice(0, 4).map((s) => s.id);
    expect(slots.map((s) => s.hero)).toEqual(heroes);
    expect(slots[0].weapon).toBe(itemScore(roster[6], "weapon") >= itemScore(roster[5], "weapon") ? "w2" : "w1");
    expect(slots[0].trinket).toBe("t2"); // animated trinket beats a plain one
    expect(slots[0].armor).toBe("a1");
    expect(slots[1].armor).toBeUndefined();
    expect(autoEquip([...roster].reverse())).toEqual(slots);
    // Its output always survives validation
    expect(validateSlots(slots, own(...roster))).toEqual(slots);
  });

  it("is empty without figures", () => {
    expect(autoEquip([sp("w", "WEAPONS")])).toEqual([]);
  });
});
