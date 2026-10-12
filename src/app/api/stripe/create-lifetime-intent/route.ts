import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, getOrCreateStripeCustomer, LIFETIME_DEALS, LifetimeDealName } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getLifetimeSlotsSold, TOTAL_LIFETIME_SLOTS } from "../_lib/fulfillment";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deal } = await request.json();

    if (!deal || !LIFETIME_DEALS[deal as LifetimeDealName]) {
      return NextResponse.json({ error: "Invalid lifetime deal" }, { status: 400 });
    }

    const selectedDeal = LIFETIME_DEALS[deal as LifetimeDealName];

    // ========================================
    // Pre-check slot availability (UX only — the authoritative, atomic check
    // runs inside the purchase transaction at confirm/webhook time)
    // ========================================
    const slots = await getLifetimeSlotsSold();

    if (slots.perDeal[deal as LifetimeDealName] >= selectedDeal.maxSlots) {
      return NextResponse.json(
        { error: "SOLD_OUT", message: `${selectedDeal.name} is sold out! All ${selectedDeal.maxSlots} slots have been claimed.` },
        { status: 410 } // 410 Gone
      );
    }

    // Also check TOTAL lifetime slots (50 max across all plans)
    if (slots.total >= TOTAL_LIFETIME_SLOTS) {
      return NextResponse.json(
        { error: "SOLD_OUT", message: "All 50 lifetime spots have been claimed! Lifetime deals are no longer available." },
        { status: 410 }
      );
    }

    // Check if user already has lifetime
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isLifetime: true },
    });

    if (existingUser?.isLifetime) {
      return NextResponse.json(
        { error: "ALREADY_LIFETIME", message: "You already have a lifetime plan!" },
        { status: 400 }
      );
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Create a PaymentIntent for one-time lifetime payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedDeal.price,
      currency: "gbp",
      customer: customerId,
      metadata: {
        userId: user.id,
        type: "lifetime_deal",
        deal: deal,
        basePlan: selectedDeal.basePlan,
        credits: selectedDeal.credits.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      deal: {
        name: selectedDeal.name,
        price: selectedDeal.price,
        originalPrice: selectedDeal.originalPrice,
        credits: selectedDeal.credits,
        basePlan: selectedDeal.basePlan,
      },
    });

  } catch (error) {
    console.error("Create lifetime intent error:", error);
    return NextResponse.json(
      { error: "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
