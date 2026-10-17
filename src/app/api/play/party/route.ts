import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { PARTY_SIZE } from "@/lib/dungeon/config";
import { autoEquipParty, saveParty } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

const Id = z.string().min(1).max(64);
const Body = z.union([
  z.object({ auto: z.literal(true) }),
  z.object({
    slots: z.array(z.object({
      hero: Id, weapon: Id.optional(), armor: Id.optional(), trinket: Id.optional(),
      skills: z.object({ basic: Id.optional(), special: Id.optional(), legendary: Id.optional() }).optional(),
    })).max(PARTY_SIZE),
  }),
]);

/**
 * PUT /api/play/party — { slots: [{ hero, weapon?, armor?, trinket?, skills? }] } or { auto: true }.
 * Everything is re-checked on the server: own original sprites only, figures
 * as heroes, the right category per gear slot, no sprite used twice, and
 * skills only from that hero's own attack animations in a slot their tier allows.
 */
export async function PUT(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked } = await rateLimitUserAction("play", user.id);
  if (blocked) return blocked;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: `Pick up to ${PARTY_SIZE} heroes and their gear.` }, { status: 400 });

  try {
    const party = "auto" in parsed.data ? await autoEquipParty(user.id) : await saveParty(user.id, parsed.data.slots);
    return NextResponse.json({ party });
  } catch (err) {
    console.error("[Dungeon] Party save failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't save your party. Try again in a moment." }, { status: 500 });
  }
}
