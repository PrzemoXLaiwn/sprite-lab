import { describe, expect, it } from "vitest";
import { fitFrames, isWalkMotion } from "./animation-service";

const frame = (opaque: number) => {
  const w = 20, h = 20, data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < opaque; i++) data[i * 4 + 3] = 255;
  return { data, width: w, height: h };
};

describe("fitFrames", () => {
  it("drops a detached effect piece when the model gives 7 pieces for 6 poses", () => {
    const poses = [200, 210, 190, 205, 195, 200].map(frame);
    const spark = frame(30);
    const got = fitFrames([poses[0], poses[1], spark, poses[2], poses[3], poses[4], poses[5]], 6);
    expect(got).toHaveLength(6);
    expect(got).not.toContain(spark);
  });
  it("keeps the first poses in order when nothing stands out", () => {
    const poses = [200, 210, 190, 205, 195, 200, 198].map(frame);
    expect(fitFrames(poses, 6)).toEqual(poses.slice(0, 6));
  });
  it("leaves the right count alone", () => {
    const poses = [200, 210, 190, 205].map(frame);
    expect(fitFrames(poses, 4)).toBe(poses);
  });
});

describe("isWalkMotion", () => {
  it("matches walks and runs, not idles or attacks", () => {
    expect(isWalkMotion("Walk cycle in place")).toBe(true);
    expect(isWalkMotion("heavy walk")).toBe(true);
    expect(isWalkMotion("run")).toBe(true);
    expect(isWalkMotion("idle breathing")).toBe(false);
    expect(isWalkMotion("sword slash attack")).toBe(false);
  });
});
