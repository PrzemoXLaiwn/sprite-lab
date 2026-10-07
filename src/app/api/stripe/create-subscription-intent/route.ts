import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, getOrCreateStripeCustomer, PLANS, PlanName } from "@/lib/stripe";
import { hasActiveSubscription } from "../_lib/fulfillment";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await request.json();

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

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Create a SetupIntent - this allows saving the payment method for future use
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      metadata: {
        userId: user.id,
        plan: plan,
        priceId: selectedPlan.priceId,
      },
    });

    return NextResponse.json({
      clientSecret: setupIntent.client_secret,
      customerId,
      plan: {
        name: selectedPlan.name,
        price: selectedPlan.price,
        credits: selectedPlan.credits,
        priceId: selectedPlan.priceId,
      },
      currentPlan: dbUser?.plan || "FREE",
    });

  } catch (error) {
    console.error("Create subscription intent error:", error);
    return NextResponse.json(
      { error: "Failed to create subscription intent" },
      { status: 500 }
    );
  }
}
