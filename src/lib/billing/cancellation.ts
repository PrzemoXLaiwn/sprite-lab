// Cancel-screen reasons and the save offer. The coupon id, when one is
// configured, is read from the server env and never from the browser.

export const CANCEL_REASONS = [
  { id: "too_expensive", label: "Too expensive" },
  { id: "not_using", label: "Not using it enough" },
  { id: "missing_feature", label: "Missing a feature I need" },
  { id: "switched_tool", label: "Switched to another tool" },
  { id: "other", label: "Something else" },
] as const;

export type CancelReasonId = (typeof CANCEL_REASONS)[number]["id"];

const REASON_IDS = new Set<string>(CANCEL_REASONS.map((reason) => reason.id));

export const CANCEL_SAVE_COUPON_ENV = "STRIPE_COUPON_CANCEL_SAVE";
export const PAUSE_DAYS = 30;

export type RetentionOffer =
  | { kind: "pause_30"; days: number }
  | { kind: "discount"; couponId: string };

export function parseCancelReason(value: unknown): CancelReasonId | null {
  return typeof value === "string" && REASON_IDS.has(value) ? (value as CancelReasonId) : null;
}

export function parseCancelNote(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * A configured coupon is offered instead of a pause. An empty variable means
 * pause only — we do not invent a discount percentage.
 */
export function retentionOffer(env: Record<string, string | undefined> = process.env): RetentionOffer {
  const coupon = env[CANCEL_SAVE_COUPON_ENV];
  if (typeof coupon === "string" && coupon.trim().length > 0) {
    return { kind: "discount", couponId: coupon.trim() };
  }
  return { kind: "pause_30", days: PAUSE_DAYS };
}
