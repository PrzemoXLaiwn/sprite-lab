// Sample size and a two-proportion z-test.
// A call is never "control" or "variant" until both sides meet the sample size.

export interface Arm {
  n: number;
  conversions: number;
}

export interface DecisionInput {
  control: Arm;
  variant: Arm;
  /** Expected conversion of the control, as a rate between 0 and 1. */
  baselineRate: number;
  /** Smallest absolute lift worth detecting (for example 0.01 = 1 percentage point). */
  mde: number;
  alpha?: number;
  power?: number;
}

export type ExperimentCall = "keep_collecting" | "no_difference" | "control" | "variant";

export interface ExperimentDecision {
  call: ExperimentCall;
  pValue: number | null;
  requiredPerVariant: number;
  reason: string;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const p = 0.3275911;
  const t = 1 / (1 + p * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a));
  return sign * y;
}

export function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2));
}

/** Inverse of the standard normal CDF. Used for alpha and power. */
export function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("quantile out of range");
  let lo = -8;
  let hi = 8;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (normalCdf(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function requiredSampleSizePerVariant(input: Pick<DecisionInput, "baselineRate" | "mde" | "alpha" | "power">): number {
  const alpha = input.alpha ?? 0.05;
  const power = input.power ?? 0.8;
  const p1 = Math.min(0.99, Math.max(0.001, input.baselineRate));
  const p2 = Math.min(0.999, Math.max(0.001, p1 + input.mde));
  const diff = p2 - p1;
  if (diff === 0) return Number.POSITIVE_INFINITY;
  const za = normalQuantile(1 - alpha / 2);
  const zb = normalQuantile(power);
  const n = ((za + zb) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))) / diff ** 2;
  return Math.ceil(n);
}

export function twoProportionZTest(control: Arm, variant: Arm): { z: number; pValue: number } {
  if (control.n < 1 || variant.n < 1) return { z: 0, pValue: 1 };
  const pooled = (control.conversions + variant.conversions) / (control.n + variant.n);
  const se = Math.sqrt(pooled * (1 - pooled) * (1 / control.n + 1 / variant.n));
  if (!Number.isFinite(se) || se === 0) return { z: 0, pValue: 1 };
  const z = (variant.conversions / variant.n - control.conversions / control.n) / se;
  const pValue = Math.min(1, Math.max(0, 2 * (1 - normalCdf(Math.abs(z)))));
  return { z, pValue };
}

/**
 * No winner is reported before both variants have the required sample.
 * A tiny p-value on 10 people stays `keep_collecting`.
 */
export function experimentDecision(input: DecisionInput): ExperimentDecision {
  const requiredPerVariant = requiredSampleSizePerVariant(input);
  const alpha = input.alpha ?? 0.05;
  if (input.control.n < requiredPerVariant || input.variant.n < requiredPerVariant) {
    return {
      call: "keep_collecting",
      pValue: null,
      requiredPerVariant,
      reason: `Need ${requiredPerVariant} visitors in each variant before a call. Control has ${input.control.n}, variant has ${input.variant.n}.`,
    };
  }
  const { pValue } = twoProportionZTest(input.control, input.variant);
  if (pValue >= alpha) {
    return {
      call: "no_difference",
      pValue,
      requiredPerVariant,
      reason: `Both sides reached ${requiredPerVariant} and the difference is not significant at ${alpha}.`,
    };
  }
  const controlRate = input.control.conversions / input.control.n;
  const variantRate = input.variant.conversions / input.variant.n;
  const call = variantRate > controlRate ? "variant" : "control";
  return {
    call,
    pValue,
    requiredPerVariant,
    reason: `${call} is ahead. Both sides reached ${requiredPerVariant} and p=${pValue.toFixed(4)} is under ${alpha}.`,
  };
}
