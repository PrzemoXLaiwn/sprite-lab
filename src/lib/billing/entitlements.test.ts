import { describe, expect, it } from "vitest";
import { SIGNUP_CREDITS } from "@/config/signup";
import { animationCredits } from "@/config/animations";
import { firstRunCreditCost, firstRunFitsFreeGrant, generationHourlyLimit, hasPaidPerks } from "./entitlements";

describe("paid perks", () => {
  it("treats Starter, Pro, Studio and lifetime as paid, and Free as not", () => {
    expect(hasPaidPerks("FREE")).toBe(false);
    expect(hasPaidPerks("STARTER")).toBe(true);
    expect(hasPaidPerks("PRO")).toBe(true);
    expect(hasPaidPerks("UNLIMITED")).toBe(true);
    expect(hasPaidPerks("LIFETIME")).toBe(true);
    expect(hasPaidPerks("FREE", "ADMIN")).toBe(true);
    expect(hasPaidPerks(null)).toBe(false);
  });

  it("gives paid plans a higher hourly generation limit", () => {
    expect(generationHourlyLimit("FREE")).toBe(20);
    expect(generationHourlyLimit("STARTER")).toBeGreaterThan(generationHourlyLimit("FREE"));
  });
});

describe("first-run budget", () => {
  it("fits a standard sprite and a 4-frame walk inside the free grant", () => {
    expect(firstRunCreditCost()).toBe(1 + animationCredits(4, false));
    expect(firstRunFitsFreeGrant()).toBe(true);
    expect(firstRunCreditCost()).toBeLessThanOrEqual(SIGNUP_CREDITS);
    expect(animationCredits(4, true)).toBeGreaterThan(SIGNUP_CREDITS - 1);
  });
});
