import { describe, expect, it } from "vitest";
import {
  applyPreAlignNormalize,
  cleanupAlpha,
  colorDistance,
  frameNormalizeEnabled,
  FRAME_NORMALIZE_FLAG,
  isolatedOpaqueCount,
  lightHaloCount,
  mergeNearColors,
  PALETTE_MERGE_DISTANCE,
  type Rgba,
} from "./frame-normalize";

function blank(w: number, h: number): Rgba {
  return { data: Buffer.alloc(w * h * 4), width: w, height: h };
}

function rect(raw: Rgba, x0: number, y0: number, x1: number, y1: number, rgb: [number, number, number], alpha = 255) {
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = (y * raw.width + x) * 4;
      raw.data[i] = rgb[0];
      raw.data[i + 1] = rgb[1];
      raw.data[i + 2] = rgb[2];
      raw.data[i + 3] = alpha;
    }
  }
}

const at = (raw: Rgba, x: number, y: number) => raw.data[(y * raw.width + x) * 4 + 3];

describe("frameNormalizeEnabled", () => {
  it("is off unless the env value is 1, true or on", () => {
    expect(frameNormalizeEnabled({})).toBe(false);
    expect(frameNormalizeEnabled({ [FRAME_NORMALIZE_FLAG]: "" })).toBe(false);
    expect(frameNormalizeEnabled({ [FRAME_NORMALIZE_FLAG]: "0" })).toBe(false);
    expect(frameNormalizeEnabled({ [FRAME_NORMALIZE_FLAG]: "1" })).toBe(true);
    expect(frameNormalizeEnabled({ [FRAME_NORMALIZE_FLAG]: "true" })).toBe(true);
    expect(frameNormalizeEnabled({ [FRAME_NORMALIZE_FLAG]: "on" })).toBe(true);
  });
});

describe("cleanupAlpha", () => {
  it("removes a grey rim on a darker body and keeps a white region", () => {
    const raw = blank(40, 40);
    rect(raw, 8, 8, 32, 32, [185, 188, 190]);
    rect(raw, 10, 10, 30, 30, [180, 40, 40]);
    expect(lightHaloCount(raw)).toBeGreaterThan(0);
    const removed = cleanupAlpha(raw);
    expect(removed).toBeGreaterThan(0);
    expect(lightHaloCount(raw)).toBe(0);
    expect(at(raw, 20, 20)).toBe(255);

    const cloth = blank(30, 30);
    rect(cloth, 4, 4, 26, 26, [250, 250, 248]);
    cleanupAlpha(cloth);
    expect(at(cloth, 8, 8)).toBe(255);
    expect(at(cloth, 4, 8)).toBe(255);
  });

  it("removes an isolated speck and faint edge dust", () => {
    const raw = blank(20, 20);
    rect(raw, 6, 6, 14, 14, [20, 80, 180]);
    raw.data[(2 * 20 + 2) * 4 + 3] = 255;
    raw.data[(2 * 20 + 2) * 4 + 1] = 220;
    expect(isolatedOpaqueCount(raw)).toBe(1);
    cleanupAlpha(raw);
    expect(isolatedOpaqueCount(raw)).toBe(0);
    expect(at(raw, 2, 2)).toBe(0);
    expect(at(raw, 10, 10)).toBe(255);
  });
});

describe("mergeNearColors", () => {
  it("collapses near-duplicate reds and keeps a distant green", () => {
    const a = blank(4, 4);
    const b = blank(4, 4);
    rect(a, 0, 0, 4, 4, [200, 40, 40]);
    rect(b, 0, 0, 2, 4, [208, 46, 42]);
    rect(b, 2, 0, 4, 4, [40, 160, 50]);
    expect(colorDistance([200, 40, 40], [208, 46, 42])).toBeLessThan(PALETTE_MERGE_DISTANCE);
    mergeNearColors([a, b]);
    const colors = new Set<number>();
    for (const f of [a, b]) {
      for (let i = 0; i < f.data.length; i += 4) colors.add((f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2]);
    }
    expect(colors.size).toBe(2);
  });
});

describe("applyPreAlignNormalize", () => {
  it("pulls content heights toward the median and keeps the foot line", async () => {
    const short = blank(60, 100);
    const mid = blank(60, 100);
    const tall = blank(60, 100);
    rect(short, 20, 60, 40, 90, [180, 40, 40]); // height 30, feet on y=89
    rect(mid, 18, 40, 42, 90, [180, 40, 40]); // height 50
    rect(tall, 16, 10, 44, 90, [180, 40, 40]); // height 80
    await applyPreAlignNormalize([short, mid, tall], { pixel: true, anchor: "ground" });
    const height = (raw: Rgba) => {
      let y0 = raw.height, y1 = -1;
      for (let y = 0; y < raw.height; y++) {
        for (let x = 0; x < raw.width; x++) if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) {
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      return y1 - y0 + 1;
    };
    const bottom = (raw: Rgba) => {
      for (let y = raw.height - 1; y >= 0; y--) {
        for (let x = 0; x < raw.width; x++) if (raw.data[(y * raw.width + x) * 4 + 3] >= 128) return y;
      }
      return -1;
    };
    const hs = height(short), ht = height(tall);
    expect(hs).toBeGreaterThan(30);
    expect(ht).toBeLessThan(80);
    expect(Math.abs(hs - ht)).toBeLessThan(50);
    expect(bottom(short)).toBe(bottom(tall));
    expect(bottom(mid)).toBe(bottom(tall));
  });

  it("centers content when the anchor is center", () => {
    const raw = blank(80, 80);
    rect(raw, 4, 4, 20, 24, [20, 80, 180]);
    return applyPreAlignNormalize([raw, blank(80, 80)], { pixel: true, anchor: "center" }).then(() => {
      let x0 = 80, x1 = -1, y0 = 80, y1 = -1, n = 0;
      for (let y = 0; y < 80; y++) for (let x = 0; x < 80; x++) if (raw.data[(y * 80 + x) * 4 + 3] >= 128) {
        n++;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      expect(n).toBeGreaterThan(0);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      expect(Math.abs(cx - 39.5)).toBeLessThan(2);
      expect(Math.abs(cy - 39.5)).toBeLessThan(2);
    });
  });
});
