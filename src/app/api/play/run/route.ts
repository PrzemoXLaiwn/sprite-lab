import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { RUNS_PER_DAY } from "@/lib/dungeon/config";
import { startRun } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

/**
 * POST /api/play/run — starts one expedition. The server simulates the whole
 * run and returns its event log; the page only replays it.
 */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked } = await rateLimitUserAction("play", user.id);
  if (blocked) return blocked;

  try {
    const result = await startRun(user.id);
    if (!result.ok && result.reason === "no_party") {
      return NextResponse.json({ error: "Add a character or creature to your party first.", code: "NO_PARTY" }, { status: 400 });
    }
    if (!result.ok) {
      return NextResponse.json({ error: `You've used all ${RUNS_PER_DAY} runs today. New runs at 00:00 UTC.`, code: "DAILY_LIMIT" }, { status: 429 });
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Dungeon] Run failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't start the run. Try again in a moment." }, { status: 500 });
  }
}
