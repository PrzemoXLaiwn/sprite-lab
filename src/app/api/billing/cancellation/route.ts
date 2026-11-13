import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseCancelNote, parseCancelReason, retentionOffer } from "@/lib/billing/cancellation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const reason = parseCancelReason(body?.reason);
  if (!reason) return NextResponse.json({ error: "Choose a reason" }, { status: 400 });

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, stripeSubscriptionId: true },
  });
  if (!dbUser?.stripeSubscriptionId || dbUser.plan === "FREE") {
    return NextResponse.json({ error: "There is no subscription to cancel" }, { status: 400 });
  }

  const offer = retentionOffer();
  const row = await prisma.subscriptionCancellation.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      reason,
      note: parseCancelNote(body?.note),
      offerShown: offer.kind,
      offerAccepted: false,
      outcome: "in_progress",
      plan: dbUser.plan,
    },
    select: { id: true },
  });

  return NextResponse.json({
    id: row.id,
    offer: offer.kind === "discount" ? { kind: "discount" } : { kind: "pause_30", days: offer.days },
  });
}
