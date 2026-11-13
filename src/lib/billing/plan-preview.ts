import { prisma } from "@/lib/prisma";
import { PLANS, type PlanName } from "@/lib/stripe";
import { loadStarterFirstMonthEligibility } from "@/lib/billing/starter-first-month";
import {
  STARTER_FIRST_MONTH_OFFER,
  isStarterFirstMonthOfferEnabled,
  readStarterFirstMonthCouponId,
  resolveStarterFirstMonthDiscount,
} from "@/config/starter-first-month";

export interface SubscriptionPreview {
  plan: { name: string; price: number; credits: number };
  firstMonthApplied: boolean;
}

/**
 * What the checkout summary shows. Does not create a Stripe customer or a
 * SetupIntent — that happens when the person clicks pay.
 */
export async function previewSubscriptionPlan(
  userId: string,
  plan: string,
  requestedOffer: unknown,
): Promise<{ ok: true; preview: SubscriptionPreview } | { ok: false; error: string; status: number }> {
  const selected = PLANS[plan as PlanName];
  if (!selected?.priceId) {
    return { ok: false, error: "Invalid plan", status: 400 };
  }

  const couponId = readStarterFirstMonthCouponId(process.env);
  const eligible =
    plan === "STARTER" && requestedOffer === STARTER_FIRST_MONTH_OFFER && couponId
      ? await loadStarterFirstMonthEligibility(userId)
      : false;
  const firstMonth = resolveStarterFirstMonthDiscount({
    requestedOffer,
    plan,
    eligible,
    couponId,
  });

  // Touch the user row so a missing account fails here, not on the pay click.
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) return { ok: false, error: "Account not found", status: 404 };

  return {
    ok: true,
    preview: {
      plan: { name: selected.name, price: selected.price, credits: selected.credits },
      firstMonthApplied: firstMonth.apply && isStarterFirstMonthOfferEnabled(),
    },
  };
}
