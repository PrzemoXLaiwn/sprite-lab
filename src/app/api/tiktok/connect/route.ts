import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

// One-time admin step: connect the SpriteLab TikTok account so the homepage
// can sort videos by views (TikTok Display API, scopes user.info.basic + video.list).
// Redirect URI to register in the TikTok developer portal:
//   https://www.sprite-lab.com/api/tiktok/callback

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clientKey = process.env.TIKTOK_CLIENT_KEY;
  if (!clientKey || !process.env.TIKTOK_CLIENT_SECRET) {
    return NextResponse.json({ error: "Set TIKTOK_CLIENT_KEY and TIKTOK_CLIENT_SECRET first" }, { status: 400 });
  }

  const state = randomBytes(16).toString("hex");
  const redirectUri = new URL("/api/tiktok/callback", request.url).toString();
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", clientKey);
  url.searchParams.set("scope", "user.info.basic,video.list");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  const res = NextResponse.redirect(url.toString());
  res.cookies.set("tiktok_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/tiktok" });
  return res;
}
