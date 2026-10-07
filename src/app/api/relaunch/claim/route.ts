import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { claimRelaunchBonus } from "@/lib/relaunch";

export const dynamic = "force-dynamic";

/** POST /api/relaunch/claim — grants the relaunch bonus once per account. */
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const result = await claimRelaunchBonus(user.id);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Relaunch] Claim failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ granted: false, reason: "error" }, { status: 500 });
  }
}
