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

    // Shared with the payment_intent.succeeded webhook. The slot check, the
    // "already lifetime" re-check and the idempotency row all run inside one
    // DB transaction under an advisory lock; sold-out / duplicate purchases
    // are refunded automatically.
    const result = await fulfillOneTimePayment(paymentIntentId, { expectedUserId: user.id });

    switch (result.status) {
      case "credited":
        if (result.kind !== "lifetime_deal") break;
        return NextResponse.json({
          success: true,
          credits: result.credits,
          plan: result.plan,
          totalCredits: result.totalCredits,
        });
      case "already_processed":
        if (result.kind !== "lifetime_deal") break;
        return NextResponse.json({
          success: true,
          credits: result.credits,
          plan: result.plan,
          message: "Lifetime deal already activated",
        });
      case "sold_out":
        return NextResponse.json(
          {
            error: "SOLD_OUT",
            message: result.message,
            refundInitiated: result.refundInitiated,
          },
          { status: 410 }
        );
      case "already_lifetime":
        return NextResponse.json(
          {
            error: "ALREADY_LIFETIME",
            message: "You already have a lifetime plan! This payment has been refunded.",
            refundInitiated: result.refundInitiated,
          },
          { status: 409 }
        );
      case "forbidden":
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      case "not_paid":
        return NextResponse.json({ error: "Payment not completed" }, { status: 400 });
    }

    console.error(`confirm-lifetime-purchase: unexpected result for ${paymentIntentId}:`, result);
    return NextResponse.json({ error: "Invalid payment" }, { status: 400 });

  } catch (error) {
    console.error("Confirm lifetime purchase error:", error);
    return NextResponse.json(
      { error: "Failed to confirm purchase" },
      { status: 500 }
    );
  }
}
