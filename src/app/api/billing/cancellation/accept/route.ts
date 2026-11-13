import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { PAUSE_DAYS, retentionOffer } from "@/lib/billing/cancellation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing cancellation" }, { status: 400 });

  const row = await prisma.subscriptionCancellation.findFirst({
    where: { id, userId: user.id },
  });
  if (!row) return NextResponse.json({ error: "Cancellation not found" }, { status: 404 });
  if (row.offerAccepted) return NextResponse.json({ ok: true, already: true, offer: row.offerShown });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeSubscriptionId: true },
  });
  if (!dbUser?.stripeSubscriptionId) {
    return NextResponse.json({ error: "There is no subscription to update" }, { status: 400 });
  }

  const offer = retentionOffer();
  try {
    if (row.offerShown === "discount" && offer.kind === "discount") {
      await stripe.subscriptions.update(dbUser.stripeSubscriptionId, {
        discounts: [{ coupon: offer.couponId }],
      });
    } else {
      const resumesAt = Math.floor(Date.now() / 1000) + PAUSE_DAYS * 24 * 60 * 60;
      await stripe.subscriptions.update(dbUser.stripeSubscriptionId, {
        pause_collection: { behavior: "void", resumes_at: resumesAt },
      });
    }
  } catch (error) {
    console.error("[cancellation] offer failed:", error);
    return NextResponse.json(
      { error: "We couldn't apply that offer. You can still continue to cancel." },
      { status: 502 },
    );
  }

  const acceptedDiscount = row.offerShown === "discount" && offer.kind === "discount";
  await prisma.subscriptionCancellation.update({
    where: { id: row.id },
    data: {
      offerAccepted: true,
      outcome: acceptedDiscount ? "discounted" : "paused",
      stripeCouponId: acceptedDiscount ? offer.couponId : null,
    },
  });

  return NextResponse.json({ ok: true, offer: acceptedDiscount ? "discount" : "pause_30" });
}
