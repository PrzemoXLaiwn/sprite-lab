import { describe, expect, it } from "vitest";
import type { Raw } from "./animation";
import { strideOf, walkRowFrozen, walkRowScore } from "./walk-check";

/** A stick figure: body block + two legs whose feet sit `spread` px apart. */
function figure(spread: number, liftLeft = 0): Raw {
  const width = 120, height = 120;
  const data = Buffer.alloc(width * height * 4);
  const fill = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) data[(y * width + x) * 4 + 3] = 255;
  };
  fill(45, 10, 75, 70); // head + body
  fill(60 - spread / 2 - 5, 70, 60 - spread / 2 + 5, 110 - liftLeft); // left leg
  fill(60 + spread / 2 - 5, 70, 60 + spread / 2 + 5, 110); // right leg
  return { data, width, height };
}

describe("walk-check", () => {
  it("measures a wider stride for feet further apart", () => {
    expect(strideOf(figure(60))).toBeGreaterThan(strideOf(figure(10)));
  });

  it("flags a side row that keeps one pose", () => {
    const row = [figure(60), figure(60), figure(60), figure(60)];
    expect(walkRowFrozen(row, "side")).toBe(true);
  });

  it("accepts a side row that alternates contact and passing", () => {
    const row = [figure(60), figure(10, 12), figure(60), figure(10)];
    expect(walkRowFrozen(row, "side")).toBe(false);
  });

  it("flags a front row with no leg change and accepts a stepping one", () => {
    expect(walkRowFrozen([figure(20), figure(20), figure(20), figure(20)], "front")).toBe(true);
    expect(walkRowFrozen([figure(20, 15), figure(20), figure(20, 15), figure(20)], "front")).toBe(false);
  });

  it("scores a real walk above a frozen one", () => {
    const frozen = [figure(60), figure(60), figure(60), figure(60)];
    const walking = [figure(60), figure(10, 12), figure(60), figure(10)];
    expect(walkRowScore(walking)).toBeGreaterThan(walkRowScore(frozen));
  });
});
