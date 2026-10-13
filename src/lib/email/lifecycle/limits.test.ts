import { describe, expect, it } from "vitest";
import { computeDailyCap, lifecycleBaseCap, resendDailyLimit, warmupDay, warmupMultiplier } from "./limits";

const NOW = new Date("2026-10-13T11:00:00Z");
const daysAgo = (n: number, hour = 11) => new Date(Date.UTC(2026, 9, 13 - n, hour));

describe("env defaults", () => {
  it("LIFECYCLE_DAILY_CAP defaults to 20 and is clamped to 1–1000", () => {
    expect(lifecycleBaseCap({})).toBe(20);
    expect(lifecycleBaseCap({ LIFECYCLE_DAILY_CAP: "" })).toBe(20);
    expect(lifecycleBaseCap({ LIFECYCLE_DAILY_CAP: "abc" })).toBe(20);
    expect(lifecycleBaseCap({ LIFECYCLE_DAILY_CAP: "35" })).toBe(35);
    expect(lifecycleBaseCap({ LIFECYCLE_DAILY_CAP: "0" })).toBe(1);
    expect(lifecycleBaseCap({ LIFECYCLE_DAILY_CAP: "99999" })).toBe(1000);
  });

  it("RESEND_DAILY_LIMIT defaults to 100 (Resend free plan)", () => {
    expect(resendDailyLimit({})).toBe(100);
    expect(resendDailyLimit({ RESEND_DAILY_LIMIT: "3000" })).toBe(3000);
    expect(resendDailyLimit({ RESEND_DAILY_LIMIT: "0" })).toBe(0);
  });
});

describe("warm-up ramp", () => {
  it("counts whole UTC days from the first live send", () => {
    expect(warmupDay(null, NOW)).toBe(0);
    expect(warmupDay(daysAgo(0, 1), NOW)).toBe(0);
    // 23:59 yesterday → day 1, even though it's < 24 h ago
    expect(warmupDay(new Date("2026-10-12T23:59:00Z"), NOW)).toBe(1);
    expect(warmupDay(daysAgo(7), NOW)).toBe(7);
  });

  it("20 → 40 → 80 with the default base", () => {
    const capOn = (first: Date | null) => computeDailyCap({ baseCap: 20, providerLimit: 1000, stats: { sentToday: 0, firstLiveSendAt: first }, now: NOW }).cap;
    expect([null, daysAgo(0), daysAgo(1), daysAgo(2)].map(capOn)).toEqual([20, 20, 20, 20]);
    expect([daysAgo(3), daysAgo(4), daysAgo(5), daysAgo(6)].map(capOn)).toEqual([40, 40, 40, 40]);
    expect([daysAgo(7), daysAgo(30), daysAgo(365)].map(capOn)).toEqual([80, 80, 80]);
    expect(warmupMultiplier(2)).toBe(1);
    expect(warmupMultiplier(3)).toBe(2);
    expect(warmupMultiplier(7)).toBe(4);
  });
});

describe("provider limit", () => {
  it("never lets the day go above RESEND_DAILY_LIMIT across all senders", () => {
    const at = (sentToday: number) => computeDailyCap({ baseCap: 20, providerLimit: 100, stats: { sentToday, firstLiveSendAt: daysAgo(30) }, now: NOW });
    expect(at(0)).toMatchObject({ cap: 80, limitedBy: "warmup", providerRemaining: 100 });
    expect(at(30)).toMatchObject({ cap: 70, limitedBy: "provider" });
    expect(at(99)).toMatchObject({ cap: 1 });
    expect(at(100)).toMatchObject({ cap: 0, providerRemaining: 0 });
    expect(at(140)).toMatchObject({ cap: 0, providerRemaining: 0 });
    for (const sent of [0, 10, 50, 95, 100, 130]) expect(sent + at(sent).cap).toBeLessThanOrEqual(Math.max(100, sent));
  });
});
