import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserStats } from "@/lib/database";
import { loadStarterFirstMonthEligibility } from "@/lib/billing/starter-first-month";
import { isStarterFirstMonthOfferEnabled } from "@/config/starter-first-month";

async function starterUpsellFor(userId: string) {
  const offerEnabled = isStarterFirstMonthOfferEnabled();
  try {
    return {
      eligible: await loadStarterFirstMonthEligibility(userId),
      offerEnabled,
    };
  } catch (error) {
    console.error("[stats] starter upsell eligibility failed:", error);
    return { eligible: false, offerEnabled };
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getUserStats(user.id);
    const starterUpsell = await starterUpsellFor(user.id);

    if (!result.success || !result.stats) {
      return NextResponse.json(
        { totalGenerations: 0, credits: 0, plan: "FREE", starterUpsell },
        { status: 200 }
      );
    }

    return NextResponse.json({ ...result.stats, starterUpsell });
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
