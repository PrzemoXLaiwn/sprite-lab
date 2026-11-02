import { describe, expect, it } from "vitest";
import { pixelWalkPeak, pixelWalkUnit, walkAmplitudes } from "./walk-amplitude";

/**
 * Front-view figure, then the same figure with one leg stepped out by the
 * walk budget. Returns the share of the silhouette that changed — the metric
 * from the production audit (frozen walks sat under 0.08, median 0.048).
 */
function frontWalkChange(bodyW: number, bodyH: number): number {
  const amp = walkAmplitudes(bodyH, bodyW);
  const padX = Math.ceil(amp.outward) + 4;
  const padY = Math.ceil(amp.lift) + 4;
  const W = bodyW + padX * 2;
  const H = bodyH + padY * 2;
  const paint = (legDx: number, legDy: number) => {
    const buf = new Uint8Array(W * H);
    const rect = (x0: number, y0: number, x1: number, y1: number, dx = 0, dy = 0) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && yy >= 0 && xx < W && yy < H) buf[yy * W + xx] = 1;
      }
    };
    const x = padX, y = padY;
    rect(x + 8, y + 4, x + bodyW - 8, y + Math.round(bodyH * 0.55));
    rect(x + 12, y, x + bodyW - 12, y + 16);
    rect(x + 4, y + 18, x + 12, y + Math.round(bodyH * 0.5), -Math.round(amp.armDeg / 8), 0);
    rect(x + bodyW - 12, y + 18, x + bodyW - 4, y + Math.round(bodyH * 0.5), Math.round(amp.armDeg / 8), 0);
    const legW = Math.max(4, Math.round(bodyW * 0.18));
    const legTop = y + Math.round(bodyH * 0.52);
    rect(x + Math.round(bodyW * 0.28), legTop, x + Math.round(bodyW * 0.28) + legW, y + bodyH, legDx, legDy);
    rect(x + Math.round(bodyW * 0.55), legTop, x + Math.round(bodyW * 0.55) + legW, y + bodyH);
    return buf;
  };
  const a = paint(0, 0);
  const b = paint(Math.round(amp.outward), -Math.round(amp.lift));
  let only = 0, union = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i] || b[i]) union++;
    if (a[i] !== b[i]) only++;
  }
  return union ? only / union : 0;
}

describe("walk amplitude", () => {
  it("lifts the foot by at least 12% of the body", () => {
    const amp = walkAmplitudes(100, 40);
    expect(amp.lift / 100).toBeGreaterThanOrEqual(0.12);
    expect(amp.armDeg).toBeGreaterThanOrEqual(18);
    expect(amp.outward / 40).toBeGreaterThanOrEqual(0.15);
  });

  it("changes more than 12% of a front-view silhouette between the passing pose and the step", () => {
    expect(frontWalkChange(48, 96)).toBeGreaterThan(0.12);
    expect(frontWalkChange(36, 72)).toBeGreaterThan(0.12);
  });

  it("scales pixel-art steps with the sprite instead of a fixed 2px shuffle", () => {
    expect(pixelWalkUnit(28)).toBe(1);
    expect(pixelWalkUnit(110)).toBeGreaterThanOrEqual(4);
    expect(pixelWalkPeak(110).y).toBeGreaterThanOrEqual(16);
    expect(pixelWalkPeak(32).y).toBeGreaterThanOrEqual(4);
  });
});
