import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RUNS_PER_DAY } from "@/lib/dungeon/config";
import { runsLeft } from "@/lib/dungeon/rules";
import {
  loadActiveRun, loadParty, loadRecords, loadRoster, loadTower, loadTrophies, nextUtcMidnight, runsUsedToday,
} from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/play — sprites, party (auto-equipped on the very first visit),
 * runs left, records, badges, this week's tower, and an unfinished run to
 * resume (finished automatically when idle for 10+ minutes).
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const active = await loadActiveRun(user.id, now);
    const [roster, party, used, trophies, records] = await Promise.all([
      loadRoster(user.id), loadParty(user.id, { autoIfNew: true }), runsUsedToday(user.id, now), loadTrophies(user.id), loadRecords(user.id, now),
    ]);
    return NextResponse.json({
      roster, party, active, trophies, records,
      tower: loadTower(now),
      runsPerDay: RUNS_PER_DAY,
      runsLeft: runsLeft(used),
      runsResetAt: nextUtcMidnight(now).toISOString(),
    });
  } catch (err) {
    console.error("[Dungeon] Load failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't open the tower. Try again in a moment." }, { status: 500 });
  }
}
