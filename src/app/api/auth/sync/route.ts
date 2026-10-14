import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeFor, syncAuthUser } from "@/lib/auth/sync-user";

export const dynamic = "force-dynamic";

const Body = z.object({ ref: z.string().regex(/^[A-Za-z0-9]{4,16}$/).nullish() });

/**
 * POST /api/auth/sync — called by Google One Tap right after
 * signInWithIdToken (which never passes through /auth/callback). Does the same
 * as the callback: creates the users row, applies a referral code and sends
 * the welcome email for a new account. Repeat calls are harmless: only the
 * call that creates the row counts as new.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  const { isNewUser } = await syncAuthUser(user, parsed.success ? parsed.data.ref ?? null : null);
  if (isNewUser) sendWelcomeFor(user);
  return NextResponse.json({ isNewUser });
}
