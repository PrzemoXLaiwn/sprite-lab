import { describe, expect, it } from "vitest";
import { newSignupBonus, relaunchBonusFor } from "./relaunch";

describe("relaunch bonus (fixed 2026-10-19)", () => {
  it("returning accounts keep +15", () => {
    expect(relaunchBonusFor(new Date("2026-01-01T00:00:00Z"))).toEqual({ amount: 15, kind: "returning" });
  });
  it("accounts made during the campaign before the cut keep the promised +10", () => {
    expect(relaunchBonusFor(new Date("2026-10-18T12:00:00Z")).amount).toBe(10);
  });
  it("new accounts from 2026-10-19 20:00 UTC start with 10 and no bonus", () => {
    expect(relaunchBonusFor(new Date("2026-10-19T20:00:01Z")).amount).toBe(0);
    expect(newSignupBonus(new Date("2026-10-25T00:00:00Z"))).toBe(0);
  });
});
