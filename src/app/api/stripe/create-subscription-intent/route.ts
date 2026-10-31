import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, getOrCreateStripeCustomer, PLANS, PlanName } from "@/lib/stripe";
import { hasActiveSubscription } from "../_lib/fulfillment";
import { loadStarterFirstMonthEligibility } from "@/lib/billing/starter-first-month";
import {
  STARTER_FIRST_MONTH_OFFER,
  isStarterFirstMonthOfferEnabled,
  readStarterFirstMonthCouponId,
  resolveStarterFirstMonthDiscount,
} from "@/config/starter-first-month";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    // Only `plan`, the literal offer code, and `intent: "preview"` are read.
    // Coupon ids, `discounts`, and `promotion_code` from the client are ignored.
    // Preview returns the summary and does not create a Stripe customer or SetupIntent.
    const plan = body?.plan;
    const requestedOffer = body?.offer;
    const preview = body?.intent === "preview";

    if (!plan || !PLANS[plan as PlanName]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as PlanName];
    if (!selectedPlan.priceId) {
      return NextResponse.json({ error: "Free plan doesn't require payment" }, { status: 400 });
    }

    // Get user's current plan / subscription
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true, stripeSubscriptionId: true },
    });

    // One subscription per user — changes go through the billing portal
    if (await hasActiveSubscription(dbUser?.stripeSubscriptionId)) {
      return NextResponse.json(
        { error: "You already have an active subscription. Manage it from your account settings." },
        { status: 409 }
      );
    }

    // Intro price is decided here and stamped onto the SetupIntent. confirm-subscription
    // reads that metadata; the browser cannot attach a coupon later.
    const couponId = readStarterFirstMonthCouponId(process.env);
    const eligible =
      plan === "STARTER" && requestedOffer === STARTER_FIRST_MONTH_OFFER && couponId
        ? await loadStarterFirstMonthEligibility(user.id)
        : false;
    const firstMonth = resolveStarterFirstMonthDiscount({
      requestedOffer,
      plan,
      eligible,
      couponId,
    });

    const planPayload = {
      name: selectedPlan.name,
      price: selectedPlan.price,
      credits: selectedPlan.credits,
      priceId: selectedPlan.priceId,
    };
    const firstMonthOffer = { applied: firstMonth.apply && isStarterFirstMonthOfferEnabled() };

    // Page views ask for a preview. The SetupIntent is created when the buyer pays.
    if (preview) {
      return NextResponse.json({
        plan: planPayload,
        currentPlan: dbUser?.plan || "FREE",
        firstMonthOffer,
      });
    }

    // Create a SetupIntent - this allows saving the payment method for future use.
    // Card only, same as before. Payment methods are not changed here.
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        userId: user.id,
        plan: plan,
        priceId: selectedPlan.priceId,
        ...(firstMonth.apply ? { offer: STARTER_FIRST_MONTH_OFFER } : {}),
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      plan: planPayload,
      currentPlan: dbUser?.plan || "FREE",
      firstMonthOffer,
    });

  } catch (error) {
    console.error("Create subscription intent error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription intent" },
      { status: 500 }
    );
  }
}
