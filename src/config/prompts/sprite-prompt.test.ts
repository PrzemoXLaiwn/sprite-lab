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

describe("framing and armed stance", () => {
  it("asks for a margin so feet, blades and glow are never cut off", () => {
    const p = buildSpritePrompt({ subject: "a four-armed samurai boss", styleId: "REALISTIC_PAINTED", categoryId: "CHARACTERS", pose: "auto" });
    expect(p).toMatch(/wide empty margin on every side/);
    expect(p).toMatch(/no part of it touches or crosses the edges/);
  });
  it("figures holding weapons get the armed stance instead of open hands, creatures too", () => {
    for (const categoryId of ["CHARACTERS", "CREATURES"]) {
      const p = buildSpritePrompt({ subject: "a four-armed samurai boss with a katana in each hand", original: "4 hands boss with samurai sword in each hand", styleId: "REALISTIC_PAINTED", categoryId, pose: "auto" });
      expect(p, categoryId).toMatch(/held out and away from the body/);
      expect(p, categoryId).not.toMatch(/A-pose|open hands|standing calmly/);
    }
  });
  it("an A-pose picked explicitly wins over the armed stance, for creatures too", () => {
    for (const categoryId of ["CHARACTERS", "CREATURES"]) {
      const p = buildSpritePrompt({ subject: "a living toaster with a sword", original: "angry toaster with a sword", styleId: "REALISTIC_PAINTED", categoryId, pose: "a-pose" });
      expect(p, categoryId).toMatch(/A-pose/);
      expect(p, categoryId).toMatch(/pointing down along the side/);
      expect(p, categoryId).not.toMatch(/held out and away|standing calmly/);
    }
  });
  it("a picked view comes right after the subject, before the pose", () => {
    const p = buildSpritePrompt({ subject: "a knight", original: "knight", styleId: "REALISTIC_PAINTED", categoryId: "CHARACTERS", pose: "a-pose", view: "FRONT" });
    expect(p.indexOf("Camera: perfectly straight-on front view")).toBeGreaterThan(0);
    expect(p.indexOf("Camera:")).toBeLessThan(p.indexOf("A-pose"));
    expect(p).toMatch(/its sides are hidden/);
    expect(p.match(/straight-on front view/g)).toHaveLength(1);
  });
  it("tells every sprite there is no floor or contact shadow", () => {
    expect(buildSpritePrompt({ subject: "a knight", styleId: "REALISTIC_PAINTED", categoryId: "CHARACTERS", pose: "auto" })).toMatch(/no floor plane, no cast or contact shadow/);
  });
  it("unarmed creatures keep the calm pose", () => {
    const p = buildSpritePrompt({ subject: "a green slime", original: "green slime", styleId: "PIXEL_ART_16", categoryId: "CREATURES", pose: "auto" });
    expect(p).toMatch(/standing calmly/);
  });
});

describe("long subjects", () => {
  it("are cut at a word boundary, never mid-word", () => {
    const subject = Array.from({ length: 80 }, (_, i) => `word${i}`).join(" ");
    const p = buildSpritePrompt({ subject, styleId: "PIXEL_ART_16", categoryId: "CHARACTERS" });
    const s = p.slice("A 2D video game sprite of ".length, p.indexOf(". "));
    expect(s.length).toBeLessThanOrEqual(400);
    expect(subject.split(" ")).toContain(s.split(" ").at(-1));
  });
});

describe("no invented props", () => {
  // Regression: a margin line naming "weapon tips, flames and any glow" made the
  // model add torches and flaming swords to doctors, ogres and textures.
  it("never names weapons, flames or glow for subjects that don't have them", () => {
    const cases = [
      { subject: "a young male doctor in a white lab coat", original: "young male doctor", categoryId: "CHARACTERS", pose: "auto" },
      { subject: "a stocky green ogre in tattered rags", original: "green ogre", categoryId: "CREATURES", pose: "auto" },
      { subject: "a leather money pouch", original: "money pouch", categoryId: "QUEST_ITEMS" },
    ];
    for (const c of cases) {
      const p = buildSpritePrompt({ ...c, styleId: "PIXEL_ART_16" });
      expect(p, c.subject).not.toMatch(/weapon tips|flames|glow|torch/i);
    }
  });
});
