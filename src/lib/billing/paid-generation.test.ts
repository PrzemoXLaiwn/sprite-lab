import { describe, expect, it } from "vitest";
import { hasPaidGenerationAccess, PAID_PLAN_MESSAGE } from "./paid-generation";

describe("hasPaidGenerationAccess", () => {
  it("keeps signup credits on static sprites", () => {
    expect(hasPaidGenerationAccess({ plan: "FREE", totalSpent: 0 })).toBe(false);
    expect(hasPaidGenerationAccess(null)).toBe(false);
    expect(hasPaidGenerationAccess({ plan: "FREE", role: "USER", totalSpent: 0 })).toBe(false);
  });

  it("unlocks a paid plan, a credit pack and staff", () => {
    expect(hasPaidGenerationAccess({ plan: "STARTER", totalSpent: 5 })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "PRO" })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "UNLIMITED" })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "LIFETIME" })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "FREE", totalSpent: 1.19 })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "FREE", role: "ADMIN", totalSpent: 0 })).toBe(true);
    expect(hasPaidGenerationAccess({ plan: "FREE", role: "OWNER" })).toBe(true);
  });

  it("names the gate in one sentence", () => {
    expect(PAID_PLAN_MESSAGE).toContain("Static sprites");
    expect(PAID_PLAN_MESSAGE).not.toMatch(/top-?up/i);
  });
});
