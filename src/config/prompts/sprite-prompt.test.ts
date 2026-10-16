// Characters are game-ready by default: A-pose, nothing in the hands unless asked.
import { describe, expect, it } from "vitest";
import { asksForHeldItem, buildSpritePrompt } from "./sprite-prompt";

describe("game-ready characters", () => {
  it("auto pose is an A-pose with empty hands when no item was asked for", () => {
    const p = buildSpritePrompt({ subject: "an elf ranger in a green hooded cloak", original: "elf ranger with a green hood", styleId: "REALISTIC_PAINTED", categoryId: "CHARACTERS", pose: "auto" });
    expect(p).toMatch(/A-pose/);
    expect(p).toMatch(/Hands empty/);
  });
  it("keeps items the user asked for", () => {
    const p = buildSpritePrompt({ subject: "a knight", original: "knight holding a sword and shield", styleId: "PIXEL_ART_16", categoryId: "CHARACTERS", pose: "auto" });
    expect(p).not.toMatch(/Hands empty/);
  });
  it("dynamic pose and non-figures don't get the empty-hands line", () => {
    expect(buildSpritePrompt({ subject: "a knight", styleId: "PIXEL_ART_16", categoryId: "CHARACTERS", pose: "dynamic" })).not.toMatch(/Hands empty/);
    expect(buildSpritePrompt({ subject: "a red potion", styleId: "PIXEL_ART_16", categoryId: "CONSUMABLES" })).not.toMatch(/Hands empty|A-pose/);
  });
  it("detects held items in what the user typed", () => {
    expect(asksForHeldItem("wizard with a staff")).toBe(true);
    expect(asksForHeldItem("archer with a bow")).toBe(true);
    expect(asksForHeldItem("elf ranger with a green hood")).toBe(false);
    expect(asksForHeldItem("rainbow slime")).toBe(false);
  });
});

describe("key colour", () => {
  it("magenta only for pale pixel-art subjects without soft light", async () => {
    const { keyBackgroundFor } = await import("./sprite-prompt");
    expect(keyBackgroundFor("elven longbow carved from silver wood", "PIXEL_ART_16")).toMatch(/magenta/);
    expect(keyBackgroundFor("white cleric with a glowing healing aura", "PIXEL_ART_16")).not.toMatch(/magenta/);
    expect(keyBackgroundFor("silver knight", "REALISTIC_PAINTED")).not.toMatch(/magenta/);
    expect(keyBackgroundFor("red goblin", "PIXEL_ART_16")).not.toMatch(/magenta/);
  });
});
