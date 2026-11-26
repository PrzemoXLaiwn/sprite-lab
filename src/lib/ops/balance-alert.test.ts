import { describe, expect, it } from "vitest";
import { BALANCE_ALERT_INTERVAL_MS, balanceAlertDue } from "./balance-alert";

describe("balanceAlertDue", () => {
  const now = new Date("2026-11-26T12:00:00.000Z");

  it("sends when there has never been an alert", () => {
    expect(balanceAlertDue(null, now)).toBe(true);
    expect(balanceAlertDue("not-a-date", now)).toBe(true);
  });

  it("stays quiet for a day after the last email", () => {
    const recent = new Date(now.getTime() - BALANCE_ALERT_INTERVAL_MS + 60_000).toISOString();
    const old = new Date(now.getTime() - BALANCE_ALERT_INTERVAL_MS - 1).toISOString();
    expect(balanceAlertDue(recent, now)).toBe(false);
    expect(balanceAlertDue(old, now)).toBe(true);
  });
});
