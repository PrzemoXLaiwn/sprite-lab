import { describe, expect, it } from "vitest";
import { checkSfw, findUnsafeTerm } from "./sfw";

describe("ST Packs SFW filter", () => {
  it("passes ordinary character descriptions", () => {
    for (const t of [
      "a red-haired ranger in a green cloak, freckles, calm smile",
      "anime cel shading, soft light, cel-shaded",
      "knight in full plate armour holding a sword",
      "classic sci-fi scientist, glasses, lab coat",
      "a bratty princess with a braid",
    ]) expect(findUnsafeTerm(t)).toBeNull();
  });

  it("blocks sexual, fetish, minor-sexualising and gore terms, including disguised spellings", () => {
    expect(findUnsafeTerm("a nude elf")).toBe("nude");
    expect(findUnsafeTerm("N.U.D.E elf")).toBe("nude");
    expect(findUnsafeTerm("s3xy maid")).toBe("sexy");
    expect(findUnsafeTerm("latex bondage outfit")).toBe("latex");
    expect(findUnsafeTerm("loli in a swimsuit")).toBe("loli");
    expect(findUnsafeTerm("guro scene with entrails")).toBe("guro");
    expect(findUnsafeTerm("naga wojowniczka")).toBe("naga");
    expect(findUnsafeTerm("masturbating")).toBe("masturbat");
  });

  it("checkSfw looks at every text and returns a message safe for the UI", () => {
    expect(checkSfw("a ranger", "soft light")).toEqual({ ok: true });
    const r = checkSfw("a ranger", "topless, soft light");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.term).toBe("topless");
      expect(r.message).toMatch(/fully clothed/);
    }
    expect(checkSfw(null, undefined)).toEqual({ ok: true });
  });
});
