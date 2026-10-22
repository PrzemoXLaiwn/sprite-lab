import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The pipeline's time decisions, with the model, planner and image work faked:
// each fake image pass moves the clock forward by its latency.
const latencies: number[] = [];
const gridCalls: Array<{ size?: number; deadline?: number }> = [];

vi.mock("@/lib/animation-planner", () => ({
  planAnimation: vi.fn(async () => ({ bodyType: "humanoid", subject: "knight", consistency: "", frames: [], planned: true })),
}));
vi.mock("@/lib/runware", () => ({
  generateAnimationGrid: vi.fn(async (opts: { size?: number; deadline?: number }) => {
    gridCalls.push({ size: opts.size, deadline: opts.deadline });
    vi.setSystemTime(Date.now() + (latencies.shift() ?? 20_000));
    return { image: Buffer.from("grid"), cost: 0.1 };
  }),
}));
vi.mock("@/lib/billing/ledger", () => ({ canSpend: () => true }));
// Per call: how many sprites the fake sheet yields (default: the full layout)
const extractCounts: number[] = [];

vi.mock("@/lib/image/animation", () => {
  const frame = () => ({ data: Buffer.alloc(4), width: 10, height: 20 });
  return {
    extractFrames: vi.fn(async (_img: Buffer, cols: number, rows: number) => Array.from({ length: extractCounts.shift() ?? cols * rows }, frame)),
    extractTileFrames: vi.fn(),
    isSlicedFrame: () => false,
    interleave: vi.fn(async (a: unknown[], b: unknown[]) => [...a, ...b]),
    referenceGrid: vi.fn(async () => Buffer.from("sheet")),
    assembleAnimation: vi.fn(async (frames: unknown[]) => ({ frames: frames.map(() => Buffer.from("f")), frameCount: frames.length })),
    assembleTileAnimation: vi.fn(),
  };
});

import { makeAnimation } from "./animation-service";
import { AnimationTimeBudgetError, workDeadline } from "./animation-budget";

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
    extractCounts.length = 0;
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
});
