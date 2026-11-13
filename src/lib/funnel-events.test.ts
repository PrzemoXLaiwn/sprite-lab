import { describe, expect, it } from "vitest";
import { isFunnelEventName, sanitizeFunnelProps } from "./funnel-events";

describe("funnel events", () => {
  it("accepts only the four recorded names", () => {
    expect(isFunnelEventName("paywall_shown")).toBe(true);
    expect(isFunnelEventName("checkout_opened")).toBe(true);
    expect(isFunnelEventName("payment_failed")).toBe(true);
    expect(isFunnelEventName("payment_succeeded")).toBe(true);
    expect(isFunnelEventName("signup_complete")).toBe(false);
    expect(isFunnelEventName(12)).toBe(false);
  });

  it("keeps short scalars and drops nested values", () => {
    expect(sanitizeFunnelProps({
      cost: 12,
      balance: 10,
      surface: "animate",
      note: "x".repeat(200),
      nested: { a: 1 },
      "bad key": 1,
    })).toEqual({
      cost: 12,
      balance: 10,
      surface: "animate",
      note: "x".repeat(120),
    });
    expect(sanitizeFunnelProps(null)).toBeUndefined();
    expect(sanitizeFunnelProps([])).toBeUndefined();
  });
});
