import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

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
    const packName = paymentIntent.metadata.pack;

    if (isNaN(credits) || credits <= 0) {
      return NextResponse.json({ error: "Invalid credits amount" }, { status: 400 });
    }

    // Check if this payment was already processed (idempotency) using description
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
        credits: existingTransaction.amount,
        message: "Credits already added",
      });
    }

    // Add credits to user and record transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: {
            increment: credits,
          },
          totalSpent: {
            increment: paymentIntent.amount / 100, // Convert pence to pounds
          },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: credits,
          type: "PURCHASE",
          description: `Credit pack: ${packName} (${credits} credits) - ${paymentIntentId}`,
          moneyAmount: paymentIntent.amount / 100,
        },
      }),
    ]);

    console.log(`✅ Credits added for user ${user.id}: +${credits} credits (${packName})`);

    return NextResponse.json({
      success: true,
      credits,
      totalCredits: updatedUser.credits,
    });

  } catch (error) {
    console.error("Confirm credit purchase error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to confirm purchase" },
      { status: 500 }
    );
  }
}
