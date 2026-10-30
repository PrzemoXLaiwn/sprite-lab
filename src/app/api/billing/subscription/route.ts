import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { BillingError, getBillingSubscription, resumeCancellation, resumePausedBilling } from "@/lib/billing/manage-subscription";

export const dynamic = "force-dynamic";

async function userId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function failure(error: unknown) {
  if (error instanceof BillingError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error("Billing subscription error:", error);
  return NextResponse.json({ error: "We couldn't load your subscription. Try again in a moment." }, { status: 500 });
}

export async function GET() {
  try {
    const id = await userId();
    if (!id) return NextResponse.json({ error: "Please log in." }, { status: 401 });
    const subscription = await getBillingSubscription(id);
    return NextResponse.json({ subscription });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const id = await userId();
    if (!id) return NextResponse.json({ error: "Please log in." }, { status: 401 });
    const body = await request.json().catch(() => null) as { action?: string } | null;
    if (body?.action === "resume_cancel") {
      const result = await resumeCancellation(id);
      return NextResponse.json({ success: true, ...result });
    }
    if (body?.action === "resume_pause") {
      const result = await resumePausedBilling(id);
      return NextResponse.json({ success: true, ...result });
    }
    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    return failure(error);
  }
}
