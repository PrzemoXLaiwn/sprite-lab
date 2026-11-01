import { describe, expect, it } from "vitest";
import { hashBasePng, planNeutral, skippedEstimateLabels } from "./neutral-reuse";

describe("neutral reuse plan", () => {
  it("includes a new neutral, copies one that already exists, and omits it when unticked", () => {
    expect(planNeutral(true, false)).toBe("generate");
    expect(planNeutral(true, true)).toBe("reuse");
    expect(planNeutral(false, true)).toBe("omit");
    expect(planNeutral(false, false)).toBe("omit");
    expect(skippedEstimateLabels("reuse")).toEqual(["neutral"]);
    expect(skippedEstimateLabels("generate")).toEqual([]);
    expect(skippedEstimateLabels("omit")).toEqual([]);
  });

  it("hashes the base bytes, so the same upload matches and a different one does not", () => {
    const a = hashBasePng(Buffer.from("same-png"));
    const b = hashBasePng(Buffer.from("same-png"));
    const c = hashBasePng(Buffer.from("other-png"));
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
