import { describe, expect, it } from "vitest";
import { planDelivery } from "./prompt-delivery";

describe("planDelivery", () => {
  it("leaves an ordinary sprite prompt alone", () => {
    const d = planDelivery("knight with a sword");
    expect(d.kind).toBe("sprite");
    expect(d.prompt).toBe("knight with a sword");
    expect(d.motion).toBeNull();
    expect(d.setCount).toBeNull();
    expect(d.preferSideView).toBe(false);
  });

  it("strips a sprite-sheet request and keeps the subject", () => {
    const d = planDelivery("sprite sheet of a fantasy swordsman with teal armor, 8 frames");
    expect(d.kind).toBe("sheet");
    expect(d.prompt).toMatch(/fantasy swordsman with teal armor/);
    expect(d.prompt).not.toMatch(/sprite sheet|8 frames/i);
  });

  it("routes a walk cycle to the walk motion and a side view", () => {
    const d = planDelivery("walk cycle of a knight in steel armour");
    expect(d.kind).toBe("animation");
    expect(d.motion).toBe("walk");
    expect(d.preferSideView).toBe(true);
    expect(d.prompt).toMatch(/knight in steel armour/);
    expect(d.prompt).not.toMatch(/walk cycle/i);
  });

  it("routes a run cycle and an attack animation", () => {
    expect(planDelivery("running animation of a rogue").motion).toBe("run");
    expect(planDelivery("attack animation of an orc").motion).toBe("attack");
    expect(planDelivery("idle animation of a slime").motion).toBe("idle");
  });

  it("routes a turnaround to the direction sheet, not a side-view still", () => {
    const d = planDelivery("character turnaround, front side and back");
    expect(d.rotation).toBe("rotate4");
    expect(d.preferSideView).toBe(false);
    const eight = planDelivery("knight, 8 directions");
    expect(eight.rotation).toBe("rotate8");
  });

  it("turns a set into a counted row and drops the set wording", () => {
    const d = planDelivery("a set of 4 health potions");
    expect(d.kind).toBe("set");
    expect(d.setCount).toBe(4);
    expect(d.prompt).toMatch(/health potions/);
    expect(d.prompt).not.toMatch(/set of/i);
  });

  it("counts several items without treating two-handed as a pair", () => {
    expect(planDelivery("three different swords").setCount).toBe(3);
    expect(planDelivery("two-handed sword").kind).toBe("sprite");
    expect(planDelivery("a set of potions").setCount).toBe(4);
  });

  it("lets an animation win over a set in the same sentence", () => {
    const d = planDelivery("sprite sheet walk cycle of a set of knights");
    expect(d.kind).toBe("animation");
    expect(d.setCount).toBeNull();
    expect(d.motion).toBe("walk");
  });
});
