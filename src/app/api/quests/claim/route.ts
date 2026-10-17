import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { claimQuest } from "@/lib/quests/store";

export const dynamic = "force-dynamic";

const Body = z.object({ id: z.string().min(1).max(40).regex(/^[a-z0-9_]+$/) });

const MESSAGES = {
  unknown: "That quest doesn't exist.",
  incomplete: "Finish the quest first, then claim the reward.",
  claimed: "You've already claimed this reward.",
} as const;

/** POST /api/quests/claim { id } — adds the reward once, after re-checking progress on the server. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked } = await rateLimitUserAction("quest", user.id);
  if (blocked) return blocked;

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    const result = await claimQuest(user.id, parsed.data.id);
    if (!result.ok) return NextResponse.json({ error: MESSAGES[result.reason], reason: result.reason }, { status: 409 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[Quests] Claim failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't claim the reward. Try again in a moment." }, { status: 500 });
  }
}
