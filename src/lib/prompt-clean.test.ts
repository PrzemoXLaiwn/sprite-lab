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
