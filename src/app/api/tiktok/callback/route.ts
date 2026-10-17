import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";
import { tiktokToken } from "@/lib/tiktok";

// Finishes /api/tiktok/connect: shows the refresh token (admin only) so it
// can be saved as TIKTOK_REFRESH_TOKEN in Vercel. Valid for 365 days.

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expected = (await cookies()).get("tiktok_oauth_state")?.value;
  if (!code || !state || state !== expected) return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });

  try {
    const token = await tiktokToken({
      code,
      grant_type: "authorization_code",
      redirect_uri: new URL("/api/tiktok/callback", request.url).toString(),
    });
    const days = Math.round((token.refresh_expires_in ?? 0) / 86400);
    const body = `TikTok connected.\n\nAdd this to Vercel → Settings → Environment Variables (Production), then redeploy:\n\nTIKTOK_REFRESH_TOKEN=${token.refresh_token}\n\nValid for about ${days} days. Do not share it.\n`;
    const res = new NextResponse(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
    res.cookies.delete({ name: "tiktok_oauth_state", path: "/api/tiktok" });
    return res;
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Token exchange failed" }, { status: 502 });
  }
}
