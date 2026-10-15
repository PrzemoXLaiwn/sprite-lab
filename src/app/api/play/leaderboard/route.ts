import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { loadLeaderboard } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

/** GET /api/play/leaderboard — this ISO week's top 25 + the caller's own rank. No emails, no user ids. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await loadLeaderboard(user.id));
  } catch (err) {
    console.error("[Dungeon] Leaderboard failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load the leaderboard. Try again in a moment." }, { status: 500 });
  }
}
