import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CANCEL_REASONS } from "@/config/retention";
import {
  BillingError,
  acceptRetentionOffer,
  confirmCancellation,
  keepSubscription,
  startCancellation,
} from "@/lib/billing/manage-subscription";

export const dynamic = "force-dynamic";

const reasonIds = CANCEL_REASONS.map((reason) => reason.id) as [
  (typeof CANCEL_REASONS)[number]["id"],
  ...(typeof CANCEL_REASONS)[number]["id"][],
];

const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    reason: z.enum(reasonIds),
    note: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("keep"),
    attemptId: z.string().min(1).optional(),
  }),
  z.object({
    action: z.literal("accept"),
    attemptId: z.string().min(1),
    offer: z.enum(["discount", "downgrade", "pause"]),
  }),
  z.object({
    action: z.literal("confirm"),
    attemptId: z.string().min(1),
  }),
]);

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function POST(request: Request) {
  const id = await userId();
  if (!id) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }

  try {
    const body = parsed.data;
    if (body.action === "start") {
      const result = await startCancellation(id, { reason: body.reason, note: body.note });
      return NextResponse.json({ success: true, ...result });
    }
    if (body.action === "keep") {
      const result = await keepSubscription(id, body.attemptId);
      return NextResponse.json({ success: true, ...result });
    }
    if (body.action === "accept") {
      const result = await acceptRetentionOffer(id, body.attemptId, body.offer);
      return NextResponse.json({ success: true, ...result });
    }
    const result = await confirmCancellation(id, body.attemptId);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof BillingError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Cancellation error:", error);
    return NextResponse.json(
      { error: "We couldn't update your subscription. Nothing was cancelled. Try again in a moment." },
      { status: 500 }
    );
  }
}
