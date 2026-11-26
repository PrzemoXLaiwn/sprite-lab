// Animations, direction sheets and image edits spend real provider money.
// Free signup and quest credits only cover static sprites. A paid plan or a
// credit-pack purchase (totalSpent > 0) unlocks the rest. Staff can check it.
// A Stripe customer id alone is not a purchase.

const PAID_PLANS = new Set(["STARTER", "PRO", "UNLIMITED", "LIFETIME"]);

export const PAID_PLAN_CODE = "PAID_PLAN_REQUIRED";

export const PAID_PLAN_MESSAGE =
  "Animations, directions and image edits are on a paid plan or a credit pack. Static sprites stay free.";

export function hasPaidGenerationAccess(input: {
  plan?: string | null;
  role?: string | null;
  totalSpent?: number | null;
} | null | undefined): boolean {
  if (!input) return false;
  if (input.role === "ADMIN" || input.role === "OWNER") return true;
  if (PAID_PLANS.has((input.plan ?? "FREE").toUpperCase())) return true;
  return (input.totalSpent ?? 0) > 0;
}
