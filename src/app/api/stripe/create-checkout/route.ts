import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  createCreditPackCheckoutSession,
  PLANS,
  getCreditPackByCredits
} from "@/lib/stripe";
import prisma from "@/lib/prisma";
import { hasActiveSubscription } from "../_lib/fulfillment";

export async function POST(request: Request) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Parse request
    const body = await request.json();
    const { plan, type, credits } = body;

    // Redirect base URL. Fail closed: never derive it from the request Origin
    // header, which the caller controls (open redirect after checkout).
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://www.sprite-lab.com";

    // Handle credit pack purchases
    if (type === "credits" && credits) {
      const creditPack = getCreditPackByCredits(credits);

      if (!creditPack) {
        return NextResponse.json(
          { error: "Invalid credit pack selected." },
          { status: 400 }
        );
      }

      if (!creditPack.priceId) {
        return NextResponse.json(
          { error: "Credit pack is not properly configured. Please contact support." },
          { status: 500 }
        );
      }

      const session = await createCreditPackCheckoutSession(
        user.id,
        user.email!,
        creditPack.priceId,
        creditPack.credits,
        `${origin}/checkout/credits/success?credits=${credits}&session_id={CHECKOUT_SESSION_ID}`,
        `${origin}/pricing?canceled=true`
      );

      console.log("Credit pack checkout session created:", session.id);

      return NextResponse.json({
        success: true,
        sessionId: session.id,
        url: session.url,
      });
    }

    // Handle subscription plans
    if (!plan || !PLANS[plan as keyof typeof PLANS]) {
      return NextResponse.json(
        { error: "Invalid plan selected." },
        { status: 400 }
      );
    }

    const selectedPlan = PLANS[plan as keyof typeof PLANS];

    // Free plan doesn't need checkout
    if (plan === "FREE") {
      return NextResponse.json(
        { error: "Free plan doesn't require checkout." },
        { status: 400 }
      );
    }

    // Check if price ID is configured
    if (!selectedPlan.priceId) {
      return NextResponse.json(
        { error: "Plan is not properly configured. Please contact support." },
        { status: 500 }
      );
    }

    // One subscription per user — changes go through the billing portal
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeSubscriptionId: true },
    });
    if (await hasActiveSubscription(dbUser?.stripeSubscriptionId)) {
      return NextResponse.json(
        { error: "You already have an active subscription. Manage it from your account settings." },
        { status: 409 }
      );
    }

    // Create checkout session
    const session = await createCheckoutSession(
      user.id,
      user.email!,
      selectedPlan.priceId,
      `${origin}/checkout/success?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      `${origin}/pricing?canceled=true`
    );

    console.log("Checkout session created:", session.id);

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });

  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
