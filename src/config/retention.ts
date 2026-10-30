// =============================================================================
// Retention offers shown during self-serve cancellation
// =============================================================================
// Change the numbers here. A coupon is created in Stripe only when the
// customer accepts, and only once per account (users.retention_discount_used_at).
//
// RETENTION_DISCOUNT_PERCENT is the percent off the next invoice only
// (Stripe coupon duration "once"). 40 is inside the 30–50% range we want
// for a save offer. Values outside 1–100 are ignored and the discount is
// not offered.
//
// RETENTION_HIGH_SPEND_GBP is lifetime spend in pounds. A customer qualifies
// for the discount when they are on Pro or Studio, or when spend (the higher
// of users.total_spent and the sum of credit_transactions.money_amount on
// PURCHASE rows) reaches this amount. 24 is two months of Pro or one month
// of Studio, so a brand-new Starter subscriber is not offered it.
// =============================================================================

/** Percent off the next renewal. Recommended band: 30–50. */
export const RETENTION_DISCOUNT_PERCENT = 40;

/** Lifetime spend (GBP) that counts as a valuable customer on any paid plan. */
export const RETENTION_HIGH_SPEND_GBP = 24;

/** How long "pause billing" skips collection, in days. */
export const RETENTION_PAUSE_DAYS = 30;

export const SUPPORT_EMAIL = "support@sprite-lab.com";

export const CANCEL_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using_enough", label: "Not using it enough" },
  { id: "quality", label: "Quality of results not good enough" },
  { id: "missing_feature", label: "Missing a feature" },
  { id: "found_another_tool", label: "Found another tool" },
  { id: "one_project", label: "Only needed it for one project" },
  { id: "technical", label: "Technical problems" },
  { id: "other", label: "Other" },
] as const;

export type CancelReason = (typeof CANCEL_REASONS)[number]["id"];

const REASON_IDS = new Set<string>(CANCEL_REASONS.map((reason) => reason.id));

export function isCancelReason(value: string): value is CancelReason {
  return REASON_IDS.has(value);
}

export function cancelReasonLabel(reason: string | null | undefined): string {
  if (!reason) return "No reason given";
  return CANCEL_REASONS.find((item) => item.id === reason)?.label ?? reason;
}

/** True when the configured percent can be sent to Stripe as percent_off. */
export function isRetentionDiscountPercentValid(percent: number): boolean {
  return Number.isInteger(percent) && percent >= 1 && percent <= 100;
}
