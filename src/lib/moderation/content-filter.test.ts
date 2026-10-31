import { describe, expect, it } from "vitest";
import { findBlockedTerm, isBlockedText } from "./content-filter";

describe("community content filter", () => {
  it("blocks the case that reached the gallery, and variants", () => {
    expect(findBlockedTerm("Magic fluid character green color with aura around it, holding big sword, with dildo on head")).toBe("dildo");
    expect(isBlockedText("D1LD0 hat")).toBe(true);
    expect(isBlockedText("a NSFW knight")).toBe(true);
    expect(isBlockedText("masturbating goblin")).toBe(true);
    expect(isBlockedText("kurwa mać")).toBe(true);
    expect(isBlockedText("pedał")).toBe(true);
  });

  it("lets ordinary game prompts through (no substring false positives)", () => {
    for (const ok of [
      "glass potion", "class icon", "assassin with a bass guitar", "cumulus cloud tile", "analysis screen UI",
      "Scunthorpe castle", "bicycle pedal", "sussex knight", "a titan", "cocktail glass", "Dickens-style lamp",
      "shitake mushroom", "sextant item", "naga warrior", "peacock feather", "hancock", "grape", "therapist npc",
    ]) expect(isBlockedText(ok), ok).toBe(false);
  });

  it("handles empty input", () => {
    expect(findBlockedTerm("")).toBeNull();
    expect(findBlockedTerm(null)).toBeNull();
  });
});
