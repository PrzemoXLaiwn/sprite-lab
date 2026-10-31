// Every ST Packs route: 404 while the flag is off (the feature does not
// exist), 401 without a session, 403 for anyone below ADMIN.
import { NextResponse } from "next/server";
import { isStPacksEnabled } from "@/config/st-packs";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export type Guard = { ok: true; userId: string } | { ok: false; response: NextResponse };

export async function requireStAdmin(): Promise<Guard> {
  if (!isStPacksEnabled()) return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!(await isAdmin(user.id))) return { ok: false, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { ok: true, userId: user.id };
}

/** Page guard: true only for an admin while the flag is on. */
export async function canUseStPacks(userId: string | null | undefined): Promise<boolean> {
  if (!isStPacksEnabled() || !userId) return false;
  return isAdmin(userId);
}

export const JOB_ID_RE = /^[a-z0-9]{10,40}$/i;
