import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RUNS_PER_DAY } from "@/lib/dungeon/config";
import { runsLeft } from "@/lib/dungeon/rules";
import { loadParty, loadRoster, loadTrophies, nextUtcMidnight, runsUsedToday } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

/** GET /api/play — the player's sprites, saved party, runs left today and trophies. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const [roster, party, used, trophies] = await Promise.all([
      loadRoster(user.id), loadParty(user.id), runsUsedToday(user.id, now), loadTrophies(user.id),
    ]);
    return NextResponse.json({
      roster,
      party,
      runsPerDay: RUNS_PER_DAY,
      runsLeft: runsLeft(used),
      runsResetAt: nextUtcMidnight(now).toISOString(),
      trophies,
    });
  } catch (err) {
    console.error("[Dungeon] Load failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't open the dungeon. Try again in a moment." }, { status: 500 });
  }
}
