import { describe, expect, it } from "vitest";
import type { Frame } from "./animation";
import {
  chooseDirectionViews,
  DIRECTION_MIN_WIDTH_RATIO,
  directionViewsLookRight,
  PRODUCTION_MIN_WIDTH_RATIO,
  productionFramesLookRight,
  rotationQaEnabled,
  ROTATION_QA_FLAG,
} from "./rotation-qa";

function frame(w: number, h: number, cut = false): Frame {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { data, width: w, height: h, ...(cut ? { cut: true } : {}) };
}

describe("rotation QA", () => {
  it("is off unless the env flag is set", () => {
    expect(rotationQaEnabled({})).toBe(false);
    expect(rotationQaEnabled({ [ROTATION_QA_FLAG]: "1" })).toBe(true);
  });

  it("rejects a slim side profile under the production 35% rule and keeps it under the direction rule", () => {
    // Front and back are wide; the two side profiles are 25% of that width.
    // Median of four widths is a front view, so 0.35 × median rejects the sides.
    const views = [frame(160, 120), frame(40, 120), frame(160, 120), frame(40, 120)];
    expect(PRODUCTION_MIN_WIDTH_RATIO).toBe(0.35);
    expect(productionFramesLookRight(views, 4)).toBe(false);
    expect(DIRECTION_MIN_WIDTH_RATIO).toBe(0.18);
    expect(directionViewsLookRight(views, 4)).toBe(true);
  });

  it("still rejects a figure our cutter sliced in half", () => {
    const views = [frame(160, 120), frame(40, 120, true), frame(160, 120), frame(150, 120)];
    expect(directionViewsLookRight(views, 4)).toBe(false);
  });

  it("drops the empty-cell speck instead of the last real view", () => {
    const views = [
      frame(80, 120), frame(70, 120), frame(80, 120),
      frame(8, 8),
      frame(75, 120), frame(70, 120), frame(80, 120), frame(72, 120),
      frame(68, 120),
    ];
    const kept = chooseDirectionViews(views, 8);
    expect(kept).toHaveLength(8);
    expect(kept.some((f) => f.width === 8)).toBe(false);
    expect(kept[kept.length - 1].width).toBe(68);
  });
});
