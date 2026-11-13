import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing cancellation" }, { status: 400 });

  const updated = await prisma.subscriptionCancellation.updateMany({
    where: { id, userId: user.id, offerAccepted: false },
    data: { outcome: "portal" },
  });
  if (updated.count === 0) {
    const owned = await prisma.subscriptionCancellation.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!owned) return NextResponse.json({ error: "Cancellation not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
