import { describe, expect, it } from "vitest";
import { assessMatte, repairMatte, type RgbaImage } from "./matte-qa";

function image(w: number, h: number, fill: [number, number, number, number] = [255, 255, 255, 255]): RgbaImage & {
  rect: (x0: number, y0: number, x1: number, y1: number, c: [number, number, number, number]) => void;
} {
  const data = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    data[i * 4] = fill[0]; data[i * 4 + 1] = fill[1]; data[i * 4 + 2] = fill[2]; data[i * 4 + 3] = fill[3];
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, c: [number, number, number, number]) => {
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      const i = (y * w + x) * 4;
      data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2]; data[i + 3] = c[3];
    }
  };
  return { data, width: w, height: h, rect };
}

const ALPHA = (raw: RgbaImage, x: number, y: number) => raw.data[(y * raw.width + x) * 4 + 3];

describe("repairMatte", () => {
  it("clears a near-white fringe and keeps the dark subject", () => {
    const img = image(80, 80, [0, 0, 0, 0]);
    img.rect(20, 20, 60, 60, [30, 32, 40, 255]);
    img.rect(19, 19, 61, 21, [248, 248, 248, 255]);
    img.rect(19, 59, 61, 61, [248, 248, 248, 255]);
    img.rect(19, 19, 21, 61, [248, 248, 248, 255]);
    img.rect(59, 19, 61, 61, [248, 248, 248, 255]);
    const before = assessMatte(img);
    expect(before.halo).toBe(true);
    expect(before.lightEdgeRatio).toBeGreaterThan(0.12);
    const after = repairMatte(img);
    expect(after.halo).toBe(false);
    expect(after.lightEdgeRatio).toBeLessThan(0.12);
    expect(ALPHA(img, 40, 40)).toBe(255);
  });

  it("does not eat a white shirt whose inside is also white", () => {
    const img = image(80, 100, [0, 0, 0, 0]);
    img.rect(20, 20, 60, 80, [250, 250, 250, 255]);
    repairMatte(img);
    expect(ALPHA(img, 40, 50)).toBe(255);
    expect(ALPHA(img, 21, 40)).toBe(255);
  });

  it("drops specks and calls a field of scraps a cutout before they are removed", () => {
    const img = image(100, 100, [0, 0, 0, 0]);
    img.rect(10, 10, 12, 12, [20, 20, 20, 255]);
    img.rect(40, 80, 42, 82, [20, 20, 20, 255]);
    img.rect(80, 20, 82, 22, [20, 20, 20, 255]);
    img.rect(70, 70, 72, 72, [20, 20, 20, 255]);
    expect(assessMatte(img).cutout).toBe(true);
    const report = repairMatte(img);
    expect(report.fragments).toBe(0);
    expect(report.opaqueRatio).toBe(0);
  });
});
