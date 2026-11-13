import { describe, expect, it } from "vitest";
import { GAME_ART_RETRY_PREFIX, softenForModeration } from "./provider-soften";

describe("softenForModeration", () => {
  it("rewrites the words Google rejects and leaves the rest of the sprite alone", () => {
    const out = softenForModeration("a slime monster spitting acid, with a bloody sword slash");
    expect(out.startsWith(GAME_ART_RETRY_PREFIX)).toBe(true);
    expect(out).toMatch(/round jelly creatures/);
    expect(out).toMatch(/bright green liquid/);
    expect(out).toMatch(/red paint/);
    expect(out).not.toMatch(/\bslime\b|\bacid\b|\bbloody\b/i);
    expect(out).toMatch(/sword slash/);
  });

  it("does not touch skeletons, knights or the word skill", () => {
    const out = softenForModeration("a skeleton knight using a fire skill");
    expect(out).toMatch(/skeleton knight/);
    expect(out).toMatch(/fire skill/);
  });

  it("prefixes once, and keeps a caller-supplied prefix", () => {
    const once = softenForModeration("a green slime");
    expect(softenForModeration(once)).toBe(once);
    const portrait = softenForModeration("a portrait", "Harmless character portrait, fully clothed.");
    expect(portrait.startsWith("Harmless character portrait, fully clothed.")).toBe(true);
    expect(portrait).not.toMatch(/sprite sheet/);
  });
});
