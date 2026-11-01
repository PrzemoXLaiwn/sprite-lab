import { describe, expect, it } from "vitest";
import { ST_QA, qaThresholds } from "@/config/st-packs";
import { computeQa } from "./qa";
import { bustFrame, drawRect, makeFrame } from "./test-fixtures";
import type { Frame } from "./types";

const W = 96;
const H = 128;
const BAND: [number, number] = [0.8, 0.97];
const INFO = { fps: 16, bytes: 400_000, band: BAND };

/** A breathing bust: the head radius pulses on a closed sine, nothing drifts. */
function goodLoop(n = 32): Frame[] {
  return Array.from({ length: n }, (_, i) => bustFrame(W, H, { headR: 14 + 2 * Math.sin((2 * Math.PI * i) / n) }));
}

describe("computeQa", () => {
  it("passes a clean, steady, seamless loop", () => {
    const res = computeQa(goodLoop(), INFO);
    expect(res.flags).toEqual([]);
    expect(res.flagged).toBe(false);
    expect(res.metrics.frames).toBe(32);
    expect(res.metrics.fps).toBe(16);
    expect(res.metrics.width).toBe(W);
    expect(res.metrics.height).toBe(H);
    expect(res.metrics.bytes).toBe(INFO.bytes);
    expect(res.metrics.drift_px).toBeLessThanOrEqual(ST_QA.driftPx);
    expect(res.metrics.edge_touch).toBe(false);
    expect(res.metrics.corner_opaque).toBe(0);
    expect(res.metrics.alpha_coverage).toBeGreaterThan(ST_QA.alphaCoverageMin);
    expect(res.metrics.alpha_coverage).toBeLessThan(ST_QA.alphaCoverageMax);
    expect(Math.abs(res.metrics.halo)).toBeLessThan(ST_QA.haloDelta);
    expect(res.metrics.head_x_range).toBeLessThan(0.5);
  });

  it("flags sideways drift", () => {
    const n = 32;
    const frames = Array.from({ length: n }, (_, i) => bustFrame(W, H, { dx: Math.round((8 * i) / (n - 1)) }));
    const res = computeQa(frames, INFO);
    expect(res.flagged).toBe(true);
    expect(res.flags.some((f) => f.startsWith("drift"))).toBe(true);
    expect(res.metrics.drift_px).toBeGreaterThan(2);
  });

  it("lets an expressive clip move and still flags a painted corner", () => {
    const n = 32;
    const moving = Array.from({ length: n }, (_, i) => bustFrame(W, H, { dx: Math.round((40 * i) / (n - 1)) }));
    expect(computeQa(moving, INFO, qaThresholds("subtle")).flags.some((f) => f.startsWith("drift"))).toBe(true);
    expect(computeQa(moving, INFO, qaThresholds("expressive")).flags.some((f) => f.startsWith("drift"))).toBe(false);
    const painted = goodLoop(8).map((f) => {
      drawRect(f, 0, 0, 24, 24, [40, 200, 60]);
      return f;
    });
    expect(computeQa(painted, INFO, qaThresholds("expressive")).flags.some((f) => f.startsWith("corner opaque"))).toBe(true);
  });

  it("flags a popping seam", () => {
    const n = 32;
    const frames = Array.from({ length: n }, (_, i) => bustFrame(W, H, { headR: 10 + (8 * i) / (n - 1) }));
    const res = computeQa(frames, INFO);
    expect(res.flags.some((f) => f.startsWith("seam"))).toBe(true);
  });

  it("flags a character that touches the side edges", () => {
    const frames = goodLoop(8).map((f) => {
      drawRect(f, 0, 100, W, H, [90, 60, 140]);
      return f;
    });
    const res = computeQa(frames, INFO);
    expect(res.metrics.edge_touch).toBe(true);
    expect(res.flags.some((f) => f.startsWith("edge touch"))).toBe(true);
  });

  it("flags leftover background in the corners", () => {
    const frames = goodLoop(8).map((f) => {
      drawRect(f, 0, 0, 24, 24, [40, 200, 60]);
      return f;
    });
    const res = computeQa(frames, INFO);
    expect(res.metrics.corner_opaque).toBeCloseTo(0.25, 2);
    expect(res.flags.some((f) => f.startsWith("corner opaque"))).toBe(true);
  });

  it("flags a file over the size cap", () => {
    const res = computeQa(goodLoop(8), { ...INFO, bytes: ST_QA.maxBytes + 1 });
    expect(res.flags.some((f) => f.startsWith("bytes"))).toBe(true);
  });

  it("flags a bright halo on the edge pixels", () => {
    const frames = goodLoop(8).map((f) => {
      for (let o = 0; o < f.data.length; o += 4) {
        const a = f.data[o + 3];
        // a white fringe around a dark subject (the threshold only trips on a gross one)
        if (a > 0 && a < 200) {
          f.data[o] = 255;
          f.data[o + 1] = 255;
          f.data[o + 2] = 255;
        } else if (a >= 200) {
          f.data[o] = 40;
          f.data[o + 1] = 40;
          f.data[o + 2] = 40;
        }
      }
      return f;
    });
    const res = computeQa(frames, INFO);
    expect(res.metrics.halo).toBeGreaterThan(ST_QA.haloDelta);
    expect(res.flags.some((f) => f.startsWith("halo"))).toBe(true);
  });

  it("flags empty alpha coverage and no frames", () => {
    const empty = computeQa([], INFO);
    expect(empty.flagged).toBe(true);
    expect(empty.flags).toContain("no frames");
    const blank = computeQa([bustFrame(W, H, { headR: 0 })].map((f) => ({ ...f, data: Buffer.alloc(f.data.length) })), INFO);
    expect(blank.flags.some((f) => f.startsWith("alpha coverage"))).toBe(true);
  });

  it("flags a near-white field that leaves more than 65% of the frame opaque", () => {
    const f = makeFrame(200, 200, [255, 253, 255, 255]);
    const clear = (x: number, y: number) => { f.data[(y * 200 + x) * 4 + 3] = 0; };
    for (let y = 0; y < 24; y++) for (let x = 0; x < 24; x++) {
      clear(x, y); clear(199 - x, y); clear(x, 199 - y); clear(199 - x, 199 - y);
    }
    const res = computeQa([f], INFO);
    expect(res.metrics.alpha_coverage).toBeGreaterThan(0.65);
    expect(res.metrics.corner_opaque).toBe(0);
    expect(res.flagged).toBe(true);
    expect(res.flags.some((flag) => flag.startsWith("alpha coverage"))).toBe(true);
  });
});
