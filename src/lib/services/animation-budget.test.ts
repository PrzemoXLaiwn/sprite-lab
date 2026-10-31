import { describe, expect, it } from "vitest";
import {
  AnimationTimeBudgetError,
  FINISH_RESERVE_MS,
  MAX_PASS_MS,
  MIN_OPTIONAL_PASS_MS,
  ROUTE_LIMIT_MS,
  canStartOptionalPass,
  canStartRequiredPass,
  isOutOfTime,
  passTimeoutMs,
  remainingMs,
  workDeadline,
} from "./animation-budget";

const T0 = 1_000_000;
const deadline = workDeadline(T0);
const at = (s: number) => T0 + s * 1000;

describe("animation time budget", () => {
  it("ends image work early enough to upload, save and refund before the route limit", () => {
    expect(deadline).toBe(T0 + ROUTE_LIMIT_MS - FINISH_RESERVE_MS);
    expect(FINISH_RESERVE_MS).toBeGreaterThanOrEqual(30_000);
  });

  it("caps each pass at MAX_PASS_MS and never past the deadline", () => {
    expect(passTimeoutMs(deadline, at(10))).toBe(MAX_PASS_MS);
    expect(passTimeoutMs(deadline, at(200))).toBe(deadline - at(200));
    expect(passTimeoutMs(deadline, deadline + 5_000)).toBe(0);
    expect(remainingMs(deadline, deadline + 5_000)).toBe(0);
  });

  it("no worst case of planner + keys + redraw + smooth runs past the route limit", () => {
    // Planner with one retry (2 × 45 s), then every pass taking its full timeout
    let now = at(5 + 90);
    let passes = 0;
    while (passes === 0 ? canStartRequiredPass(deadline, now) : canStartOptionalPass(deadline, 2048, now)) {
      now += passTimeoutMs(deadline, now);
      passes++;
      if (passes > 5) break;
    }
    expect(now).toBeLessThanOrEqual(deadline);
    expect(now + FINISH_RESERVE_MS).toBeLessThanOrEqual(T0 + ROUTE_LIMIT_MS);
  });

  it("starts the smooth pass after a typical key pass (~45 s in)", () => {
    expect(canStartOptionalPass(deadline, 2048, at(45))).toBe(true);
    expect(passTimeoutMs(deadline, at(45))).toBe(MAX_PASS_MS);
  });

  it("skips an optional pass that couldn't finish in time", () => {
    const late = deadline - MIN_OPTIONAL_PASS_MS[2048] + 1;
    expect(canStartOptionalPass(deadline, 2048, late)).toBe(false);
    // a small 1024 pass still fits at that point
    expect(canStartOptionalPass(deadline, 1024, late)).toBe(true);
    expect(canStartOptionalPass(deadline, 1024, deadline - MIN_OPTIONAL_PASS_MS[1024] + 1)).toBe(false);
  });

  it("refuses the required pass when almost no time is left", () => {
    expect(canStartRequiredPass(deadline, at(10))).toBe(true);
    expect(canStartRequiredPass(deadline, deadline - 1_000)).toBe(false);
  });

  it("tells timeouts apart from bad model output", () => {
    expect(isOutOfTime(new AnimationTimeBudgetError("key frame"))).toBe(true);
    expect(isOutOfTime(Object.assign(new Error("This operation was aborted"), { name: "AbortError" }))).toBe(true);
    expect(isOutOfTime(new Error("sheet upload failed: Request timed out"))).toBe(true);
    expect(isOutOfTime(new Error("Too few frames found in the animation sheet"))).toBe(false);
    expect(isOutOfTime(new Error("Runware invalidProviderContent: flagged"))).toBe(false);
  });
});
