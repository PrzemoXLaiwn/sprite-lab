import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { levelFor, xpFor } from "@/lib/quests/definitions";
import { claimableCount, questStates, weekStart } from "@/lib/quests/progress";
import { loadQuestClaims, loadQuestStats } from "@/lib/quests/store";
import { welcomeOfferActive, welcomeOfferEndsAt } from "@/config/welcome-offer";
import { CREDIT_PACKS, isLaunchPromoActive } from "@/lib/stripe";

export const dynamic = "force-dynamic";

/** GET /api/quests — level, quests with progress, and any live pack offer. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const now = new Date();
    const [stats, claims, row] = await Promise.all([
      loadQuestStats(user.id, now),
      loadQuestClaims(user.id),
      prisma.user.findUnique({ where: { id: user.id }, select: { createdAt: true } }),
    ]);
    const quests = questStates(stats, claims, now);
    const xp = xpFor(stats);
    const welcome = welcomeOfferActive(row?.createdAt, now);
    const offerEndsAt = welcome && row ? welcomeOfferEndsAt(row.createdAt).toISOString() : null;
    const nextWeek = new Date(weekStart(now).getTime() + 7 * 86_400_000);
    return NextResponse.json({
      xp,
      ...levelFor(xp),
      quests,
      claimable: claimableCount(quests),
      weekResetsAt: nextWeek.toISOString(),
      offer: welcome || isLaunchPromoActive()
        ? {
            kind: welcome ? "welcome" : "launch",
            endsAt: offerEndsAt,
            packs: Object.entries(CREDIT_PACKS).map(([id, p]) => ({ id, name: p.name, price: p.price, credits: p.credits, bonus: p.bonus })),
          }
        : null,
    });
  } catch (err) {
    console.error("[Quests] Load failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't load your quests. Try again in a moment." }, { status: 500 });
  }
}
