import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createCheckoutSession,
  createCreditPackCheckoutSession,
  PLANS,
  getCreditPackByCredits
} from "@/lib/stripe";

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

    // Get the origin for redirect URLs (use env variable for production)
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get("origin") || "http://localhost:3000";

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
        `${origin}/dashboard?success=true&credits=${credits}`,
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

    // Create checkout session
    const session = await createCheckoutSession(
      user.id,
      user.email!,
      selectedPlan.priceId,
      `${origin}/dashboard?success=true&plan=${plan}`,
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
      { error: error instanceof Error ? error.message : "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
