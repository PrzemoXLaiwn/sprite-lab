import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { setSignupSourceOnce } from "@/app/api/_lib/email-prefs";

export const dynamic = "force-dynamic";

const token = (max: number) => z.string().regex(/^[a-z0-9._-]+$/).max(max).nullable();
const Body = z.object({
  source: z.enum(["tiktok", "google", "bing", "youtube", "reddit", "twitter", "instagram", "facebook", "discord", "itch", "producthunt", "ai_assistant", "email", "direct", "other"]),
  medium: token(40),
  campaign: token(60),
  referrerHost: z.string().regex(/^[a-z0-9.-]+$/).max(80).nullable(),
  landing: z.string().regex(/^\/[A-Za-z0-9/_.-]*$/).max(80),
});

/**
 * POST /api/user/source — where a new account came from (first touch), stored
 * once on the user so channels can be compared by who goes on to create or pay.
 * Coarse, non-personal fields only; a second call never overwrites the first.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid source" }, { status: 400 });
  try {
    const stored = await setSignupSourceOnce(user.id, parsed.data);
    return NextResponse.json({ stored });
  } catch (err) {
    console.error("[Source] store failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ stored: false }, { status: 500 });
  }
}
