import { describe, expect, it } from "vitest";
import { bandCentroid, stabilizeFrames, translateFrame } from "./stabilize";
import { bustFrame, drawDisc, makeFrame, pixel } from "./test-fixtures";

const BAND: [number, number] = [0.8, 0.97];
const OPTS = { band: BAND, window: 5, maxShiftPx: 24 };
const W = 96;
const H = 128;

describe("bandCentroid", () => {
  it("returns the alpha-weighted centre of the band and null when the band is empty", () => {
    const f = makeFrame(40, 40);
    drawDisc(f, 20.5, 30.5, 6, [255, 255, 255]);
    const c = bandCentroid(f, [0.5, 1]);
    expect(c).not.toBeNull();
    expect(c!.x).toBeCloseTo(20.5, 1);
    expect(c!.y).toBeCloseTo(30.5, 1);
    expect(c!.mass).toBeGreaterThan(0);
    expect(bandCentroid(f, [0, 0.5])).toBeNull();
  });
});

describe("translateFrame", () => {
  it("moves the centroid by (+3, 0) within 0.05 px", () => {
    const f = bustFrame(W, H);
    const before = bandCentroid(f, [0, 1])!;
    const moved = translateFrame(f, 3, 0);
    const after = bandCentroid(moved, [0, 1])!;
    expect(after.x - before.x).toBeCloseTo(3, 1);
    expect(Math.abs(after.x - before.x - 3)).toBeLessThanOrEqual(0.05);
    expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(0.05);
  });

  it("moves sub-pixel amounts and keeps the edge colour (premultiplied sampling)", () => {
    const f = makeFrame(32, 32);
    drawDisc(f, 16, 16, 8, [200, 40, 40]);
    const moved = translateFrame(f, 0.5, -1.25);
    const before = bandCentroid(f, [0, 1])!;
    const after = bandCentroid(moved, [0, 1])!;
    expect(after.x - before.x).toBeCloseTo(0.5, 1);
    expect(after.y - before.y).toBeCloseTo(-1.25, 1);
    // every pixel with alpha still carries the disc colour, not a darkened mix with transparent black
    for (let o = 0; o < moved.data.length; o += 4) {
      if (moved.data[o + 3] === 0) continue;
      expect(moved.data[o]).toBe(200);
      expect(moved.data[o + 1]).toBe(40);
    }
    // the input is not mutated
    expect(pixel(f, 16, 16)[3]).toBe(255);
  });

  it("drops content pushed outside the frame", () => {
    const f = makeFrame(16, 16, [10, 10, 10, 255]);
    const moved = translateFrame(f, 4, 0);
    expect(pixel(moved, 0, 5)[3]).toBe(0);
    expect(pixel(moved, 3, 5)[3]).toBe(0);
    expect(pixel(moved, 4, 5)[3]).toBe(255);
  });
});

describe("stabilizeFrames", () => {
  it("registers a slow sideways drift of up to 10 px (sub-pixel steps) back to ≤ 0.5 px", () => {
    const n = 64;
    const base = bustFrame(W, H);
    const frames = Array.from({ length: n }, (_, i) => {
      const drift = 5 - 5 * Math.cos((2 * Math.PI * i) / n); // 0 → 10 → 0 px
      return translateFrame(base, drift, 0);
    });
    const beforeXs = frames.map((f) => bandCentroid(f, BAND)!.x);
    expect(Math.max(...beforeXs) - Math.min(...beforeXs)).toBeGreaterThan(9);

    const res = stabilizeFrames(frames, OPTS);
    expect(res.flagged).toBe(false);
    expect(res.frames).toHaveLength(n);
    expect(res.maxShift).toBeGreaterThan(9);
    expect(res.maxShift).toBeLessThanOrEqual(10.5);
    expect(res.residualRangePx).toBeLessThanOrEqual(0.5);
    expect(res.shiftsX[n / 2]).toBeCloseTo(-10, 0);
    // y is untouched when the clip only drifts sideways
    expect(res.shiftsY.every((v) => v === 0)).toBe(true);
    // inputs untouched
    expect(bandCentroid(frames[n / 2], BAND)!.x).toBeCloseTo(beforeXs[n / 2], 5);
  });

  it("flags a 30 px jump and returns the frames unchanged", () => {
    const n = 24;
    const base = bustFrame(W, H);
    const frames = Array.from({ length: n }, (_, i) => translateFrame(base, i >= n / 2 ? 30 : 0, 0));
    const res = stabilizeFrames(frames, OPTS);
    expect(res.flagged).toBe(true);
    expect(res.maxShift).toBeGreaterThanOrEqual(30 - 0.1);
    expect(res.frames).toHaveLength(n);
    for (let i = 0; i < n; i++) {
      expect(res.frames[i].data.equals(frames[i].data)).toBe(true);
      expect(Object.is(res.frames[i].data, frames[i].data)).toBe(false);
    }
    expect(res.residualRangePx).toBeGreaterThan(29);
  });

  it("also flags a single-frame glitch beyond the clamp", () => {
    const n = 12;
    const base = bustFrame(W, H);
    const frames = Array.from({ length: n }, (_, i) => translateFrame(base, i === 6 ? -30 : 0, 0));
    const res = stabilizeFrames(frames, OPTS);
    expect(res.flagged).toBe(true);
  });

  it("corrects vertical drift only beyond half a pixel", () => {
    // A uniform torso block can't reveal vertical motion inside the band, so use a
    // blob sitting inside the band rows (102..124 of 128).
    const n = 16;
    const base = makeFrame(W, H);
    drawDisc(base, 48, 113, 8, [200, 100, 50]);
    const bob = Array.from({ length: n }, (_, i) => translateFrame(base, 0, 0.3 * Math.sin((2 * Math.PI * i) / n)));
    const resBob = stabilizeFrames(bob, OPTS);
    expect(resBob.shiftsY.every((v) => v === 0)).toBe(true);

    const slide = Array.from({ length: n }, (_, i) => translateFrame(base, 0, 1.5 - 1.5 * Math.cos((2 * Math.PI * i) / n)));
    const resSlide = stabilizeFrames(slide, OPTS);
    expect(resSlide.shiftsY.some((v) => v < -2)).toBe(true);
    const ys = resSlide.frames.map((f) => bandCentroid(f, BAND)!.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1);
  });

  it("handles an empty input", () => {
    expect(stabilizeFrames([], OPTS)).toEqual({ frames: [], shiftsX: [], shiftsY: [], maxShift: 0, flagged: false, residualRangePx: 0 });
  });
});
