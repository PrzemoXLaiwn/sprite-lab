import { describe, expect, it } from "vitest";
import { planAutoChanges, type AutoValues } from "./useAutoSettings";

const DEFAULTS: AutoValues = { groupId: "WEAPONS", subcategoryId: "SWORDS", styleId: "PIXEL_ART_16", view: "none", palette: "auto", pose: "auto" };

describe("planAutoChanges", () => {
  it("owner's example switches type and view, and remembers what was there", () => {
    const { patch, next, flash } = planAutoChanges("top-down main character from survival game", DEFAULTS, {}, new Set());
    expect(patch).toEqual({ groupId: "CHARACTERS", subcategoryId: "HEROES", view: "topdown" });
    expect(flash).toEqual(["type", "view"]);
    expect(next.type?.prev).toEqual({ groupId: "WEAPONS", subcategoryId: "SWORDS" });
    expect(next.view?.prev).toEqual({ view: "none" });
    expect(next.type?.reason).toBe("main character");
  });

  it("never touches a control the user set", () => {
    const { patch } = planAutoChanges("32-bit pixel art knight, side view", DEFAULTS, {}, new Set(["type", "style"] as const));
    expect(patch.groupId).toBeUndefined();
    expect(patch.styleId).toBeUndefined();
    // Weapons has no camera view, so the view stays too
    expect(patch.view).toBeUndefined();
  });

  it("sets the view once the type allows it", () => {
    const { patch } = planAutoChanges("32-bit pixel art knight, side view", DEFAULTS, {}, new Set());
    expect(patch).toEqual({ groupId: "CHARACTERS", subcategoryId: "HEROES", styleId: "PIXEL_ART_32", view: "side" });
  });

  it("no camera view for floor tiles", () => {
    const { patch } = planAutoChanges("top-down grass floor tile", DEFAULTS, {}, new Set());
    expect(patch).toEqual({ groupId: "ENVIRONMENT", subcategoryId: "GROUND" });
  });

  it("puts a setting back when its word leaves the prompt", () => {
    const first = planAutoChanges("anime knight", DEFAULTS, {}, new Set());
    const after = { ...DEFAULTS, ...first.patch };
    const second = planAutoChanges("knight", after, first.next, new Set());
    expect(second.patch).toEqual({ styleId: "PIXEL_ART_16" });
    expect(second.next.style).toBeUndefined();
    // The asset type stays (still a knight)
    expect(second.next.type?.value).toEqual({ groupId: "CHARACTERS", subcategoryId: "HEROES" });
  });

  it("keeps the original value as the undo target across several changes", () => {
    const a = planAutoChanges("anime knight", DEFAULTS, {}, new Set());
    const b = planAutoChanges("cartoon knight", { ...DEFAULTS, ...a.patch }, a.next, new Set());
    expect(b.patch).toEqual({ styleId: "CARTOON_WESTERN" });
    expect(b.next.style?.prev).toEqual({ styleId: "PIXEL_ART_16" });
  });

  it("does nothing when the prompt already matches the panel", () => {
    const { patch, flash } = planAutoChanges("iron sword with red gem", DEFAULTS, {}, new Set());
    expect(patch).toEqual({});
    expect(flash).toEqual([]);
  });

  it("pose only for characters and creatures", () => {
    expect(planAutoChanges("ninja in a dynamic pose", DEFAULTS, {}, new Set()).patch.pose).toBe("dynamic");
    expect(planAutoChanges("sword mid-swing", DEFAULTS, {}, new Set()).patch.pose).toBeUndefined();
  });
});
