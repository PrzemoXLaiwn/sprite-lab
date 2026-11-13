import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { STARTER_FIRST_MONTH_OFFER } from "@/config/starter-first-month";
import { previewSubscriptionPlan } from "@/lib/billing/plan-preview";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const plan = url.searchParams.get("plan") ?? "";
  const offer = url.searchParams.get("offer") === STARTER_FIRST_MONTH_OFFER ? STARTER_FIRST_MONTH_OFFER : null;
  const result = await previewSubscriptionPlan(user.id, plan, offer);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.preview);
}
