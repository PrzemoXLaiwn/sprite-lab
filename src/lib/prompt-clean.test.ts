import { describe, expect, it } from "vitest";
import { cleanUserPrompt } from "./prompt-clean";

describe("cleanUserPrompt", () => {
  it("drops leftover example text", () => {
    expect(cleanUserPrompt("e.g. iron sword with red gem", "WEAPONS").prompt).toBe("iron sword with red gem");
  });

  it("strips chat-model boilerplate", () => {
    const { prompt } = cleanUserPrompt("Create a detailed 2D knight with a sword on a grey checkerboard background 128x128", "CHARACTERS");
    expect(prompt).not.toMatch(/create|detailed|2D|checkerboard|128x128/i);
    expect(prompt).toMatch(/knight with a sword/);
  });

  it("moves a character out of an item category", () => {
    expect(cleanUserPrompt("a goblin merchant with a big backpack", "WEAPONS").category).toEqual({ categoryId: "CHARACTERS", subcategoryId: "HEROES" });
  });

  it("keeps a weapon described with its owner as a weapon", () => {
    expect(cleanUserPrompt("warrior's sword with gold hilt", "WEAPONS").category).toBeNull();
  });

  it("moves a house to buildings", () => {
    expect(cleanUserPrompt("small wooden house with a red roof", "WEAPONS").category).toEqual({ categoryId: "ENVIRONMENT", subcategoryId: "BUILDINGS" });
  });

  it("detects sprite-sheet requests", () => {
    expect(cleanUserPrompt("knight sprite sheet with 8 frames", "CHARACTERS").wantsSheet).toBe(true);
    expect(cleanUserPrompt("knight with a sword", "CHARACTERS").wantsSheet).toBe(false);
  });

  it("never returns an empty prompt", () => {
    expect(cleanUserPrompt("Create a", "CHARACTERS").prompt.length).toBeGreaterThan(0);
  });
});

describe("asset type left on Weapons, beyond the word list", () => {
  it("reroutes characters the word list misses", () => {
    expect(cleanUserPrompt("young male doctor resembling Stardew Valley doctor", "WEAPONS").category?.categoryId).toBe("CHARACTERS");
  });
  it("keeps real weapons", () => {
    expect(cleanUserPrompt("iron sword with red gem in the hilt", "WEAPONS").category).toBeNull();
  });
});

describe("sprite sheet requests in the sprite prompt", () => {
  it("keeps the subject and drops the sheet wording", () => {
    const c = cleanUserPrompt("sprite sheet of a fantasy swordsman with teal armor, 8 frames", "CHARACTERS");
    expect(c.wantsSheet).toBe(true);
    expect(c.prompt).toMatch(/fantasy swordsman with teal armor/);
    expect(c.prompt).not.toMatch(/sprite sheet|8 frames/i);
  });

  it("a walk cycle is one sprite, opened as a walk, drawn from the side", () => {
    const c = cleanUserPrompt("walk cycle of a knight", "CHARACTERS");
    expect(c.wantsSheet).toBe(true);
    expect(c.motion).toBe("walk");
    expect(c.preferSideView).toBe(true);
    expect(c.prompt).not.toMatch(/walk cycle/i);
  });

  it("a set keeps a count and is not sent to Animate", () => {
    const c = cleanUserPrompt("a set of 4 health potions", "CONSUMABLES");
    expect(c.wantsSheet).toBe(false);
    expect(c.setCount).toBe(4);
    expect(c.prompt).toMatch(/health potions/);
  });
});

describe("armour is the piece, unless the sentence is a person", () => {
  it("reroutes a knight in plate armour to characters", () => {
    expect(cleanUserPrompt("knight in plate armor", "ARMOR").category).toEqual({
      categoryId: "CHARACTERS",
      subcategoryId: "HEROES",
    });
  });

  it("keeps an armour piece in armour", () => {
    expect(cleanUserPrompt("dragon scale chestplate", "ARMOR").category).toBeNull();
    expect(cleanUserPrompt("warrior's helmet with horns", "ARMOR").category).toBeNull();
  });
});
