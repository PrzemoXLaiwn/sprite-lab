import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS, PlanName } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { setupIntentId, plan } = await request.json();

    if (!setupIntentId || !plan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as PlanName];
    if (!selectedPlan?.priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment setup not completed" }, { status: 400 });
    }

    const paymentMethodId = setupIntent.payment_method as string;
    const customerId = setupIntent.customer as string;

    // Set this payment method as the default for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: selectedPlan.priceId }],
      default_payment_method: paymentMethodId,
      metadata: {
        userId: user.id,
      },
      expand: ["latest_invoice.payment_intent"],
    });

    // Update user in database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: plan,
        stripeSubscriptionId: subscription.id,
        credits: {
          increment: selectedPlan.credits,
        },
      },
    });

    console.log(`✅ Subscription created for user ${user.id}: ${subscription.id}`);

    return NextResponse.json({
      success: true,
      subscriptionId: subscription.id,
      plan: selectedPlan.name,
      credits: selectedPlan.credits,
    });

  } catch (error) {
    console.error("Confirm subscription error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm subscription" },
      { status: 500 }
    );
  }
}
