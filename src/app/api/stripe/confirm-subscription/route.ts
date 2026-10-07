import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, PLANS, PlanName } from "@/lib/stripe";
import {
  getSubscriptionPeriodEnd,
  grantSubscriptionInvoiceCredits,
  hasActiveSubscription,
  isUniqueViolation,
  stripeId,
} from "../_lib/fulfillment";

// Creates the subscription after the client confirmed a SetupIntent from
// create-subscription-intent.
//
// Safety properties:
//  - Ownership: the SetupIntent must carry metadata.userId === caller AND
//    belong to the caller's Stripe customer; the plan must match metadata.plan.
//  - One subscription per SetupIntent: subscriptions.create uses an idempotency
//    key derived from the SetupIntent id, and the SetupIntent is recorded as
//    consumed (ProcessedStripeEvent, id = seti_...) so later replays are no-ops.
//  - payment_behavior "error_if_incomplete": no unpaid subscriptions.
//  - Credits: granted per paid invoice via grantSubscriptionInvoiceCredits
//    (unique on invoice id), shared with the invoice.payment_succeeded webhook,
//    so the first month is credited exactly once.
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const setupIntentId = body?.setupIntentId;
    const plan = body?.plan;

    if (typeof setupIntentId !== "string" || !setupIntentId || typeof plan !== "string" || !plan) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const selectedPlan = PLANS[plan as PlanName];
    if (!selectedPlan?.priceId) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true, stripeSubscriptionId: true },
    });

    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json({ error: "Payment setup not found" }, { status: 400 });
    }

    // Retrieve the SetupIntent to get the payment method
    const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);

    // ── Ownership + plan checks ─────────────────────────────────────────────
    const setupCustomerId = stripeId(setupIntent.customer);
    if (setupIntent.metadata?.userId !== user.id || setupCustomerId !== dbUser.stripeCustomerId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (setupIntent.metadata?.plan !== plan) {
      return NextResponse.json({ error: "Plan does not match payment setup" }, { status: 400 });
    }

    if (setupIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment setup not completed" }, { status: 400 });
    }

    const paymentMethodId = stripeId(setupIntent.payment_method);
    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment setup not completed" }, { status: 400 });
    }

    // ── Replay guard: each SetupIntent yields at most one subscription ─────
    const consumed = await prisma.processedStripeEvent.findUnique({
      where: { id: setupIntent.id },
      select: { id: true },
    });
    if (consumed) {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        subscriptionId: dbUser.stripeSubscriptionId,
        plan: selectedPlan.name,
        credits: selectedPlan.credits,
      });
    }

    if (await hasActiveSubscription(dbUser.stripeSubscriptionId)) {
      return NextResponse.json(
        { error: "You already have an active subscription. Manage it from your account settings." },
        { status: 409 }
      );
    }

    const customerId = dbUser.stripeCustomerId;

    // Set this payment method as the default for the customer
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // Create the subscription (idempotent per SetupIntent for 24h on Stripe's side)
    let subscription: Stripe.Subscription;
    try {
      subscription = await stripe.subscriptions.create(
        {
          customer: customerId,
          items: [{ price: selectedPlan.priceId }],
          default_payment_method: paymentMethodId,
          payment_behavior: "error_if_incomplete",
          metadata: {
            userId: user.id,
            plan,
          },
          expand: ["latest_invoice"],
        },
        { idempotencyKey: `confirm-subscription-${setupIntent.id}` }
      );
    } catch (error) {
      if (error instanceof Stripe.errors.StripeCardError) {
        console.warn(`Subscription payment declined for user ${user.id}:`, error.code);
        return NextResponse.json(
          { error: "Your payment was declined. Please try a different card." },
          { status: 402 }
        );
      }
      throw error;
    }

    if (subscription.status !== "active" && subscription.status !== "trialing") {
      console.error(`Subscription ${subscription.id} created with status ${subscription.status}`);
      return NextResponse.json(
        { error: "Payment could not be completed. Please try again." },
        { status: 402 }
      );
    }

    const periodEnd = getSubscriptionPeriodEnd(subscription);

    // Mark the SetupIntent consumed and link the subscription atomically.
    try {
      await prisma.$transaction([
        prisma.processedStripeEvent.create({
          data: { id: setupIntent.id, type: "setup_intent.consumed" },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: {
            plan,
            stripeSubscriptionId: subscription.id,
            stripePriceId: selectedPlan.priceId,
            ...(periodEnd ? { stripeCurrentPeriodEnd: periodEnd } : {}),
          },
        }),
      ]);
    } catch (error) {
      // A concurrent request consumed it first (same subscription via the
      // idempotency key) — fall through to the idempotent credit grant.
      if (!isUniqueViolation(error)) throw error;
    }

    // Credit the initial invoice now for instant UX; the webhook may already
    // have done it, in which case this is a no-op.
    const invoice = typeof subscription.latest_invoice === "object" ? subscription.latest_invoice : null;
    if (invoice?.id && invoice.status === "paid") {
      await grantSubscriptionInvoiceCredits({
        userId: user.id,
        invoiceId: invoice.id,
        planName: plan as PlanName,
        amountPaid: (invoice.amount_paid || 0) / 100,
        description: `${plan} plan subscription`,
      });
    }

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
      { error: "Failed to confirm subscription" },
      { status: 500 }
    );
  }
}
