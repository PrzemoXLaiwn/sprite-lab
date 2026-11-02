import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The pipeline's time decisions, with the model, planner and image work faked:
// each fake image pass moves the clock forward by its latency.
const latencies: number[] = [];
const gridCalls: Array<{ size?: number; deadline?: number }> = [];
const gridPrompts: string[] = [];
const gridThrows: unknown[] = [];

vi.mock("@/lib/animation-planner", () => ({
  planAnimation: vi.fn(async () => ({ bodyType: "humanoid", subject: "knight", consistency: "", frames: [], planned: true })),
}));
vi.mock("@/lib/runware", () => ({
  generateAnimationGrid: vi.fn(async (opts: { size?: number; deadline?: number; prompt?: string }) => {
    gridCalls.push({ size: opts.size, deadline: opts.deadline });
    gridPrompts.push(opts.prompt ?? "");
    vi.setSystemTime(Date.now() + (latencies.shift() ?? 20_000));
    const boom = gridThrows.shift();
    if (boom) throw boom;
    return { image: Buffer.from("grid"), cost: 0.1 };
  }),
}));
vi.mock("@/lib/billing/ledger", () => ({ canSpend: () => true }));
// Per call: how many sprites the fake sheet yields (default: the full layout)
const extractCounts: number[] = [];
// Frames from the looser background key. Empty means "no better cut".
const looseCounts: number[] = [];

vi.mock("@/lib/image/animation", () => {
  const frame = () => ({ data: Buffer.alloc(4), width: 10, height: 20 });
  return {
    extractFrames: vi.fn(async (_img: Buffer, cols: number, rows: number, opts?: { tolerance?: number }) => {
      if (opts?.tolerance) return Array.from({ length: looseCounts.shift() ?? 0 }, frame);
      return Array.from({ length: extractCounts.shift() ?? cols * rows }, frame);
    }),
    extractTileFrames: vi.fn(),
    isSlicedFrame: (f: { cut?: boolean }) => f.cut === true,
    interleave: vi.fn(async (a: unknown[], b: unknown[]) => [...a, ...b]),
    referenceGrid: vi.fn(async () => Buffer.from("sheet")),
    assembleAnimation: vi.fn(async (frames: unknown[]) => ({ frames: frames.map(() => Buffer.from("f")), frameCount: frames.length })),
    assembleTileAnimation: vi.fn(),
  };
});

import { makeAnimation, makeRotation, normalizeViewHeights, viewsLookRight } from "./animation-service";
import { AnimationTimeBudgetError, workDeadline } from "./animation-budget";
import { ROTATIONS } from "@/config/animations";

const T0 = new Date("2026-10-21T12:00:00Z").getTime();
const input = (deadline: number) => ({
  reference: Buffer.from("ref"),
  prompt: "knight",
  categoryId: "CHARACTERS",
  motion: "walk",
  frames: 6,
  smooth: true,
  pixel: true,
  anchor: "ground" as const,
  loop: true,
  deadline,
});

describe("makeAnimation time budget (smooth, 6 frames)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(T0);
    latencies.length = 0;
    gridCalls.length = 0;
    gridPrompts.length = 0;
    gridThrows.length = 0;
    extractCounts.length = 0;
    looseCounts.length = 0;
  });
  afterEach(() => vi.useRealTimers());

  it("redraws the in-between sheet once when the first one doesn't line up", async () => {
    const deadline = workDeadline(T0);
    latencies.push(17_000, 17_000, 17_000);
    extractCounts.push(6, 4, 6); // keys fine, first in-between sheet short, redraw fine
    const out = await makeAnimation(input(deadline));
    expect(out.smoothed).toBe(true);
    expect(gridCalls).toHaveLength(3);
  });

  it("falls back to key frames when the redrawn in-between sheet is wrong too", async () => {
    const deadline = workDeadline(T0);
    latencies.push(17_000, 17_000, 17_000);
    extractCounts.push(6, 4, 4); // too few twice (too many would be trimmed and accepted)
    const out = await makeAnimation(input(deadline));
    expect(out.smoothed).toBe(false);
    expect(gridCalls).toHaveLength(3);
    expect(out.anim.frameCount).toBe(6);
  });

  it("direction sheet: a page with more figures than directions is redrawn, not trimmed to the first four", async () => {
    const rotate4 = ROTATIONS.find((r) => r.id === "rotate4")!;
    latencies.push(15_000, 15_000);
    extractCounts.push(8, 4); // a turnaround of 8 figures, then a proper row of 4
    const out = await makeRotation({ reference: Buffer.from("ref"), prompt: "knight", pixel: true, rotation: rotate4, deadline: workDeadline(T0) });
    expect(out.anim.frameCount).toBe(4);
    expect(gridCalls).toHaveLength(2);
    expect(gridPrompts[0]).toMatch(/same individual/);
    expect(gridPrompts[0]).not.toMatch(/previous sheet was rejected/);
    expect(gridPrompts[1]).toMatch(/previous sheet was rejected/);
    expect(gridPrompts[1]).toMatch(/One row only/);
  });

  it("direction sheet: a looser background key salvages a welded row without a paid redraw", async () => {
    const rotate4 = ROTATIONS.find((r) => r.id === "rotate4")!;
    latencies.push(15_000);
    extractCounts.push(1); // grey gutters merged the row
    looseCounts.push(4);
    const out = await makeRotation({ reference: Buffer.from("ref"), prompt: "knight", pixel: true, rotation: rotate4, deadline: workDeadline(T0) });
    expect(out.anim.frameCount).toBe(4);
    expect(gridCalls).toHaveLength(1);
  });

  it("retries a timed-out direction sheet once instead of failing the job", async () => {
    const rotate4 = ROTATIONS.find((r) => r.id === "rotate4")!;
    latencies.push(15_000, 15_000);
    gridThrows.push(Object.assign(new Error("The operation was aborted"), { name: "AbortError" }));
    extractCounts.push(4);
    const out = await makeRotation({ reference: Buffer.from("ref"), prompt: "knight", pixel: true, rotation: rotate4, deadline: workDeadline(T0) });
    expect(out.anim.frameCount).toBe(4);
    expect(gridCalls).toHaveLength(2);
    expect(gridPrompts[1]).toMatch(/previous sheet was rejected/);
  });

  it("direction sheet: still wrong after the redraw → fails (the route refunds) instead of shipping wrong directions", async () => {
    const rotate4 = ROTATIONS.find((r) => r.id === "rotate4")!;
    latencies.push(15_000, 15_000);
    extractCounts.push(8, 8);
    await expect(makeRotation({ reference: Buffer.from("ref"), prompt: "knight", pixel: true, rotation: rotate4, deadline: workDeadline(T0) })).rejects.toThrow(/broken|views/);
    expect(gridCalls).toHaveLength(2);
  });

  it("does not redraw the in-between sheet when that would overrun the deadline", async () => {
    // 165 s in: 68 s left after the keys (a 2048 pass needs 60), 51 s after the first in-between try
    const deadline = workDeadline(T0 - 165_000);
    latencies.push(17_000, 17_000, 17_000);
    extractCounts.push(6, 4, 6);
    const out = await makeAnimation(input(deadline));
    expect(out.smoothed).toBe(false);
    expect(gridCalls).toHaveLength(2);
  });

  it("draws keys + in-betweens on a typical run, each pass bounded by the request deadline", async () => {
    const deadline = workDeadline(T0);
    latencies.push(17_000, 17_000);
    const out = await makeAnimation(input(deadline));
    expect(out.smoothed).toBe(true);
    expect(gridCalls).toEqual([{ size: 2048, deadline }, { size: 2048, deadline }]);
  });

  it("skips the in-between pass (smoothed: false → route refunds the smooth part) when it can't finish in time", async () => {
    // The request already spent most of its time before the key pass ended
    // 180 s into the request: 70 s of image time left, 45 s after the key pass
    const deadline = workDeadline(T0 - 180_000);
    latencies.push(25_000);
    const out = await makeAnimation(input(deadline));
    expect(out.smoothed).toBe(false);
    expect(gridCalls).toHaveLength(1);
    expect(out.anim.frameCount).toBe(6);
  });

  it("fails fast before any paid pass when the deadline has already passed", async () => {
    const deadline = workDeadline(T0 - 260_000);
    await expect(makeAnimation(input(deadline))).rejects.toBeInstanceOf(AnimationTimeBudgetError);
    expect(gridCalls).toHaveLength(0);
  });

  it("accepts a narrow side view and still rejects a sliver, a sliced figure or a half body", () => {
    const box = (width: number, height = 100, cut = false) => ({ data: Buffer.alloc(4), width, height, ...(cut ? { cut: true } : {}) });
    // Front views ~180–190px wide, side profiles 40 and 50. The old check used
    // the wide median (180) and 0.35 of it (63), so the 40px profile failed.
    expect(viewsLookRight([box(40), box(180), box(50), box(190)], 4)).toBe(true);
    expect(viewsLookRight([box(12), box(180), box(50), box(190)], 4)).toBe(false);
    expect(viewsLookRight([box(40), box(180), box(50, 100, true), box(190)], 4)).toBe(false);
    expect(viewsLookRight([box(40), box(180), box(50, 40), box(190)], 4)).toBe(false);
  });

  it("scales direction views that are only a little smaller onto one height", async () => {
    const solid = (w: number, h: number) => ({ data: Buffer.alloc(w * h * 4, 255), width: w, height: h });
    const out = await normalizeViewHeights([solid(10, 20), solid(10, 20), solid(8, 16), solid(4, 8)], false);
    expect(out.map((f) => f.height)).toEqual([20, 20, 20, 8]);
    expect(out[2].width).toBe(10);
  });
});
