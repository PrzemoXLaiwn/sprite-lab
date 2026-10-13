// =============================================================================
// Unit economics — one formula for every feature × plan × scenario
// =============================================================================
// netPerCredit = (grossGBP / vatDivisor − fees) / credits
//   grossGBP  = priceUSD × FX            (FX from the real Stripe charge)
//   fees      = grossGBP × 5.25% + £0.20 (3.25% international card + 2% FX + 20p;
//                                         one observed charge — UK cards are cheaper)
//   vatDivisor= 1.2 in the "VAT included" scenario, else 1 (VAT status unknown)
// costGBP     = (runwareUsd × (1 + overhead) + claudeUsd) × FX   (central)
//             = (runwareMaxUsd × (1 + high overhead) + claudeMaxUsd) × FX (worst)
// margin      = credits × netPerCredit − cost ; pct = margin / revenue
// Nothing is rounded until display.
// =============================================================================

import { PLANS, CREDIT_PACKS } from "@/lib/stripe";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "./animations";
import { FAILURE_OVERHEAD, FEATURE_COSTS, type CostStatus } from "./provider-costs";
import { REMOVE_BG_CREDITS, VARIATION_CREDITS, upscaleCredits } from "./tool-prices";

export const FX_GBP_PER_USD = 0.757225;
export const FEE_PCT = 0.0525;
export const FEE_FIXED_GBP = 0.2;
export const VAT_RATE = 0.2;

export interface Offer { key: string; label: string; priceUsd: number; credits: number; monthly: boolean }

export function offers(): Offer[] {
  const plans = Object.entries(PLANS).filter(([, p]) => p.price > 0).map(([k, p]) => ({ key: k, label: p.name ?? k, priceUsd: p.price, credits: p.credits, monthly: true }));
  // Stripe pack prices are USD (the `price` field is in cents)
  const packs = Object.entries(CREDIT_PACKS).map(([k, p]) => ({ key: k, label: k, priceUsd: p.price / 100, credits: p.credits, monthly: false }));
  return [...plans, ...packs];
}

export function netPerCreditGbp(o: Pick<Offer, "priceUsd" | "credits">, vat: boolean): number {
  const gross = o.priceUsd * FX_GBP_PER_USD;
  const fees = gross * FEE_PCT + FEE_FIXED_GBP;
  return ((vat ? gross / (1 + VAT_RATE) : gross) - fees) / o.credits;
}

/** Feature → credits charged today (read from the same config the routes use). */
export function featureCredits(): Record<string, number> {
  const out: Record<string, number> = { sprite: 1, sprite_hd: 3, style_match: 4, edit: 4, rig: RIG_CREDITS };
  for (const o of ANIMATION_FRAME_OPTIONS) {
    out[`anim_${o.frames}`] = animationCredits(o.frames, false);
    out[`anim_smooth_${o.frames}`] = animationCredits(o.frames, true);
  }
  for (const r of ROTATIONS) out[r.id] = r.credits;
  out.remove_bg = REMOVE_BG_CREDITS;
  out.upscale_2x = upscaleCredits(2);
  out.upscale_4x = upscaleCredits(4);
  out.variation = VARIATION_CREDITS;
  return out;
}

export function costGbp(feature: string, scenario: "central" | "worst"): number {
  const c = FEATURE_COSTS[feature];
  if (!c) throw new Error(`no cost data for ${feature}`);
  const usd = scenario === "central"
    ? c.runwareUsd * (1 + FAILURE_OVERHEAD.central) + c.claudeUsd
    : c.runwareMaxUsd * (1 + FAILURE_OVERHEAD.high) + c.claudeMaxUsd;
  return usd * FX_GBP_PER_USD;
}

export interface MarginRow {
  feature: string; offer: string; credits: number; vat: boolean; scenario: "central" | "worst";
  revenueGbp: number; costGbp: number; marginGbp: number; marginPct: number; status: CostStatus; n: number;
}

export function marginTable(): MarginRow[] {
  const credits = featureCredits();
  const rows: MarginRow[] = [];
  for (const [feature, cr] of Object.entries(credits)) {
    const fc = FEATURE_COSTS[feature];
    for (const o of offers()) for (const vat of [false, true]) for (const scenario of ["central", "worst"] as const) {
      const revenue = cr * netPerCreditGbp(o, vat);
      const cost = costGbp(feature, scenario);
      rows.push({ feature, offer: o.key, credits: cr, vat, scenario, revenueGbp: revenue, costGbp: cost, marginGbp: revenue - cost, marginPct: (revenue - cost) / revenue, status: fc.status, n: fc.n });
    }
  }
  return rows;
}

/**
 * The bar a price must clear: central cost, no VAT, every offer → ≥15%;
 * central cost with VAT → ≥0%. Worst case is reported, not enforced (it is
 * bounded by the per-operation cost cap instead).
 */
export const MIN_MARGIN = { central: 0.15, centralVat: 0 } as const;

export const violationKey = (r: MarginRow) => `${r.feature}@${r.offer}${r.vat ? "+VAT" : ""}`;

export function violations(rows = marginTable()): MarginRow[] {
  return rows.filter((r) => r.scenario === "central" && r.marginPct < (r.vat ? MIN_MARGIN.centralVat : MIN_MARGIN.central));
}
