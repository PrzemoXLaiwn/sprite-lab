import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RUNS_PER_DAY } from "@/lib/dungeon/config";
import { runsLeft } from "@/lib/dungeon/rules";
import { partyUpgrades } from "@/lib/dungeon/upgrades";
import { SPRITE_CREDIT_COSTS } from "@/config/tool-prices";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS } from "@/config/animations";
import {
  loadActiveRun, loadParty, loadRecords, loadRoster, loadTower, loadTrophies, nextUtcMidnight, runsUsedToday,
} from "@/lib/dungeon/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/play — sprites, party (auto-equipped on the very first visit),
 * the party's next upgrades,
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
    // Prices of the actions the suggestions lead to, from the same config the tools charge from
    const upgrades = partyUpgrades(party, roster, {
      sprite: SPRITE_CREDIT_COSTS.normal, hdSprite: SPRITE_CREDIT_COSTS.hd, animationMin: RIG_CREDITS,
      // Smooth mode included: the card never shows less than the tool can charge
      animationMax: Math.max(...ANIMATION_FRAME_OPTIONS.map((o) => o.credits + o.smoothExtra)),
      attackMin: Math.min(...ANIMATION_FRAME_OPTIONS.map((o) => o.credits)),
    });
    return NextResponse.json({
      roster, party, active, trophies, records, upgrades,
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
