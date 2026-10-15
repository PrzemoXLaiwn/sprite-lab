import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { PARTY_SIZE } from "@/lib/dungeon/config";
import { saveParty } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

const Body = z.object({ slots: z.array(z.string().min(1).max(64)).max(PARTY_SIZE) });

/** PUT /api/play/party { slots } — saves the party. Only the caller's own original sprites are kept. */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked } = await rateLimitUserAction("play", user.id);
  if (blocked) return blocked;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `Pick up to ${PARTY_SIZE} of your sprites.` }, { status: 400 });

  try {
    const party = await saveParty(user.id, parsed.data.slots);
    return NextResponse.json({ party });
  } catch (err) {
    console.error("[Dungeon] Party save failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't save your party. Try again in a moment." }, { status: 500 });
  }
}
