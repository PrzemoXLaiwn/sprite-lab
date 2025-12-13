import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe, LIFETIME_DEALS } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { paymentIntentId } = await request.json();

    if (!paymentIntentId) {
      return NextResponse.json({ error: "Missing payment intent ID" }, { status: 400 });
    }

    // Retrieve the PaymentIntent
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "succeeded") {
      return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    // Verify the user matches
    if (paymentIntent.metadata.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const credits = parseInt(paymentIntent.metadata.credits, 10);
    const basePlan = paymentIntent.metadata.basePlan;
    const dealName = paymentIntent.metadata.deal;

    if (isNaN(credits) || credits <= 0) {
      return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
    }

    // Check if this payment was already processed (idempotency)
    const existingTransaction = await prisma.creditTransaction.findFirst({
      where: {
        userId: user.id,
        type: "PURCHASE",
        description: { contains: paymentIntentId },
      },
    });

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        credits,
        message: "Lifetime deal already activated",
      });
    }

    // ========================================
    // CRITICAL: Final check before activating
    // Double-check slots to prevent race conditions
    // ========================================
    const lifetimeCount = await prisma.user.count({
      where: {
        isLifetime: true,
        plan: basePlan,
      },
    });

    const dealConfig = Object.values(LIFETIME_DEALS).find(d => d.basePlan === basePlan);
    if (dealConfig && lifetimeCount >= dealConfig.maxSlots) {
      // CRITICAL: Slots are full - initiate refund
      console.error(`❌ RACE CONDITION: ${basePlan} lifetime slots full. Initiating refund for ${paymentIntentId}`);

      try {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
        });
        console.log(`✅ Refund initiated for ${paymentIntentId}`);
      } catch (refundError) {
        console.error("Failed to auto-refund:", refundError);
      }

      return NextResponse.json(
        {
          error: "SOLD_OUT",
          message: `Sorry! ${dealConfig.name} sold out while processing your payment. A refund has been initiated.`,
          refundInitiated: true,
        },
        { status: 410 }
      );
    }

    // Also check total slots
    const totalLifetimeCount = await prisma.user.count({
      where: { isLifetime: true },
    });
    const totalMaxSlots = Object.values(LIFETIME_DEALS).reduce((sum, d) => sum + d.maxSlots, 0);

    if (totalLifetimeCount >= totalMaxSlots) {
      console.error(`❌ RACE CONDITION: Total lifetime slots (${totalMaxSlots}) full. Initiating refund.`);

      try {
        await stripe.refunds.create({
          payment_intent: paymentIntentId,
          reason: "requested_by_customer",
        });
      } catch (refundError) {
        console.error("Failed to auto-refund:", refundError);
      }

      return NextResponse.json(
        {
          error: "SOLD_OUT",
          message: "All 50 lifetime spots have been claimed! A refund has been initiated.",
          refundInitiated: true,
        },
        { status: 410 }
      );
    }

    // Update user to lifetime plan and add initial credits
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          plan: basePlan,
          isLifetime: true,
          credits: {
            increment: credits,
          },
          totalSpent: {
            increment: paymentIntent.amount / 100,
          },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: credits,
          type: "PURCHASE",
          description: `Lifetime deal: ${dealName} (${credits} credits/month forever) - ${paymentIntentId}`,
          moneyAmount: paymentIntent.amount / 100,
        },
      }),
    ]);

    console.log(`✅ Lifetime deal activated for user ${user.id}: ${dealName} (${basePlan}, ${credits} credits/month)`);

    return NextResponse.json({
      success: true,
      credits,
      plan: basePlan,
      totalCredits: updatedUser.credits,
    });

  } catch (error) {
    console.error("Confirm lifetime purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm purchase" },
      { status: 500 }
    );
  }
}
