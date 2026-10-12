import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fulfillOneTimePayment } from "../_lib/fulfillment";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const paymentIntentId = body?.paymentIntentId;

    if (typeof paymentIntentId !== "string" || !paymentIntentId) {
      return NextResponse.json({ error: "Missing payment intent ID" }, { status: 400 });
    }

    // Shared with the payment_intent.succeeded webhook. Idempotent: the
    // CreditTransaction row (unique on stripePaymentIntentId) is created in the
    // same DB transaction as the credit increment.
    const result = await fulfillOneTimePayment(paymentIntentId, { expectedUserId: user.id });

    switch (result.status) {
      case "credited":
        if (result.kind !== "credit_pack") break;
        return NextResponse.json({
          success: true,
          credits: result.credits,
          totalCredits: result.totalCredits,
        });
      case "already_processed":
        if (result.kind !== "credit_pack") break;
        return NextResponse.json({
          success: true,
          credits: result.credits,
          message: "Credits already added",
        });
      case "forbidden":
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      case "not_paid":
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    console.error(`confirm-credit-purchase: unexpected result for ${paymentIntentId}:`, result);
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });

  } catch (error) {
    console.error("Confirm credit purchase error:", error);
    return NextResponse.json(
      { error: "Failed to confirm purchase" },
      { status: 500 }
    );
  }
}
