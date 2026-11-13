import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFunnelEventName } from "@/lib/funnel-events";
import { recordFunnelEvent } from "@/lib/funnel";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  if (!isFunnelEventName(body?.name)) {
    return NextResponse.json({ error: "Unknown event" }, { status: 400 });
  }

  await recordFunnelEvent({ name: body.name, userId: user.id, props: body.props });
  return NextResponse.json({ ok: true });
}
