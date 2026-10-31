import { describe, expect, it } from "vitest";
import { normalQuantile, experimentDecision, requiredSampleSizePerVariant, twoProportionZTest } from "@/lib/funnel/stats";

describe("experiment guardrails", () => {
  it("uses the usual normal quantiles", () => {
    expect(normalQuantile(0.975)).toBeCloseTo(1.96, 2);
    expect(normalQuantile(0.8)).toBeCloseTo(0.8416, 3);
  });

  it("asks for a real sample before a 1-point lift on a ~1.5% baseline", () => {
    const n = requiredSampleSizePerVariant({ baselineRate: 0.0148, mde: 0.01, alpha: 0.05, power: 0.8 });
    expect(n).toBeGreaterThan(1000);
    expect(Number.isFinite(n)).toBe(true);
  });

  it("does not declare a winner on a tiny sample even when every variant converts", () => {
    const decision = experimentDecision({
      control: { n: 10, conversions: 0 },
      variant: { n: 10, conversions: 10 },
      baselineRate: 0.0148,
      mde: 0.01,
    });
    expect(decision.call).toBe("keep_collecting");
    expect(decision.pValue).toBeNull();
    expect(decision.requiredPerVariant).toBeGreaterThan(10);
  });

  it("can call a winner only after both sides clear the threshold", () => {
    const required = requiredSampleSizePerVariant({ baselineRate: 0.5, mde: 0.2, alpha: 0.05, power: 0.8 });
    const decision = experimentDecision({
      control: { n: required, conversions: Math.round(required * 0.5) },
      variant: { n: required, conversions: Math.round(required * 0.8) },
      baselineRate: 0.5,
      mde: 0.2,
    });
    expect(decision.call).toBe("variant");
    expect(decision.pValue).not.toBeNull();
    expect(decision.pValue!).toBeLessThan(0.05);
  });

  it("reports no difference when the rates match and the sample is large enough", () => {
    const required = requiredSampleSizePerVariant({ baselineRate: 0.5, mde: 0.2 });
    const decision = experimentDecision({
      control: { n: required, conversions: Math.round(required * 0.5) },
      variant: { n: required, conversions: Math.round(required * 0.5) },
      baselineRate: 0.5,
      mde: 0.2,
    });
    expect(decision.call).toBe("no_difference");
    expect(twoProportionZTest(
      { n: required, conversions: Math.round(required * 0.5) },
      { n: required, conversions: Math.round(required * 0.5) },
    ).pValue).toBeGreaterThan(0.05);
  });
});
