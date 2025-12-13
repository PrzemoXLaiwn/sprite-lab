import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe, getOrCreateStripeCustomer, CREDIT_PACKS, CreditPackName, LAUNCH_PROMO } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { pack } = await request.json();

    if (!pack || !CREDIT_PACKS[pack as CreditPackName]) {
      return NextResponse.json({ error: "Invalid credit pack" }, { status: 400 });
    }

    const selectedPack = CREDIT_PACKS[pack as CreditPackName];
    if (!selectedPack.priceId) {
      return NextResponse.json({ error: "Credit pack not configured" }, { status: 400 });
    }

    // Check if promo is active
    const isPromoActive = LAUNCH_PROMO.enabled && new Date() < new Date(LAUNCH_PROMO.endDate);
    const bonusCredits = isPromoActive ? selectedPack.bonus : 0;
    const totalCredits = selectedPack.credits + bonusCredits;

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(user.id, user.email!);

    // Create a PaymentIntent for one-time payment
    const paymentIntent = await stripe.paymentIntents.create({
      amount: selectedPack.price,
      currency: "gbp",
      customer: customerId,
      metadata: {
        userId: user.id,
        type: "credit_pack",
        pack: pack,
        credits: totalCredits.toString(), // Include bonus credits
        baseCredits: selectedPack.credits.toString(),
        bonusCredits: bonusCredits.toString(),
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      pack: {
        name: selectedPack.name,
        price: selectedPack.price,
        credits: selectedPack.credits,
        bonus: bonusCredits,
        total: totalCredits,
      },
    });

  } catch (error) {
    console.error("Create credit intent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create payment intent" },
      { status: 500 }
    );
  }
}
