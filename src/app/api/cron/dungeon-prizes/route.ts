// =============================================================================
// CRON — Sprite Dungeon weekly prizes (Mondays 00:10 UTC)
// =============================================================================
// Pays the finished ISO week: top 10 get a badge, top 3 get 30 / 20 / 10
// credits if they made at least 5 paid generations that week. One SQL
// statement per week writes the prize rows, adds the credits and logs the
// BONUS transactions together; unique (week, rank) and (week, user_id) make a
// second run pay nothing. The week before is re-checked too, so a missed run
// is caught up.
// =============================================================================

import { NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { payWeeklyPrizes } from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const weeks = await payWeeklyPrizes();
    console.log("[dungeon-prizes]", JSON.stringify(weeks));
    return NextResponse.json({ success: true, weeks });
  } catch (err) {
    console.error("[dungeon-prizes] failed:", err);
    return NextResponse.json({ success: false, error: "Prize payout failed" }, { status: 500 });
  }
}
