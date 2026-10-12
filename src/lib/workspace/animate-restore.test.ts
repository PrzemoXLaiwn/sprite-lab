import { describe, expect, it } from "vitest";
import { actionForAnimation } from "./animate-restore";
import { parseAnimationPrompt } from "./history";

const parse = (p: string) => {
  const parsed = parseAnimationPrompt(p);
  if (!parsed) throw new Error("bad fixture");
  return parsed;
};

describe("actionForAnimation", () => {
  it("maps direction sets to their rotation option", () => {
    expect(actionForAnimation(parse("[Animation: 4-direction walk, 16f] knight"), "CHARACTERS")).toBe("walk4dir");
    expect(actionForAnimation(parse("[Animation: 4 directions, 4f] knight"), "CHARACTERS")).toBe("rotate4");
    expect(actionForAnimation(parse("[Animation: 8 directions, 8f] knight"), "CHARACTERS")).toBe("rotate8");
  });

  it("finds category presets by id or label", () => {
    expect(actionForAnimation(parse("[Animation: walk, 6f] knight"), "CHARACTERS")).toBe("walk");
    expect(actionForAnimation(parse("[Animation: idle, 6f] knight"), "CHARACTERS")).toBe("idle");
  });

  it("selects the custom card for custom motions", () => {
    expect(actionForAnimation(parse("[Animation: custom, 8f] knight"), "CHARACTERS")).toBe("custom");
  });

  it("leaves tailored motions alone", () => {
    expect(actionForAnimation(parse("[Animation: bark, 6f] dog"), "CREATURES")).toBeNull();
  });
});
