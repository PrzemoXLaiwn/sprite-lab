import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { extractFrames, snapFrameAnchors } from "./animation";
import { assessMatte } from "./matte-qa";

describe("snapFrameAnchors", () => {
  it("collapses a sub-pixel foot difference and keeps a real step", () => {
    const placed = [
      { ax: 10.4, ay: 40 },
      { ax: 10.6, ay: 40.4 },
      { ax: 13.2, ay: 48.8 },
    ];
    snapFrameAnchors(placed);
    // 10.6 would round to 11 on its own; relative to frame 0 it stays put.
    expect(placed.map((p) => p.ax)).toEqual([10, 10, 13]);
    expect(placed.map((p) => p.ay)).toEqual([40, 40, 49]);
  });
});

describe("extractFrames matte", () => {
  it("does not leave a pale rim around a frame cut from a white sheet", async () => {
    const w = 220, h = 180;
    const data = Buffer.alloc(w * h * 4, 255);
    const fill = (x0: number, y0: number, x1: number, y1: number, c: [number, number, number]) => {
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const i = (y * w + x) * 4;
        data[i] = c[0]; data[i + 1] = c[1]; data[i + 2] = c[2];
      }
    };
    // 3px of rgb(228): outside the flood-fill tolerance, inside the fringe tolerance.
    fill(30, 20, 100, 150, [228, 228, 228]);
    fill(33, 23, 97, 147, [32, 48, 120]);
    const png = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
    const [frame] = await extractFrames(png, 1, 1);
    const pad = 2;
    const pw = frame.width + pad * 2, ph = frame.height + pad * 2;
    const padded = Buffer.alloc(pw * ph * 4);
    for (let y = 0; y < frame.height; y++) {
      frame.data.copy(padded, ((y + pad) * pw + pad) * 4, y * frame.width * 4, (y + 1) * frame.width * 4);
    }
    const report = assessMatte({ data: padded, width: pw, height: ph });
    expect(report.halo).toBe(false);
    expect(report.lightEdgeRatio).toBeLessThan(0.12);
    expect(report.opaqueRatio).toBeGreaterThan(0.2);
  });
});
