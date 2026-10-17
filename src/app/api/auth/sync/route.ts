import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeFor } from "@/lib/auth/sync-user";
import { establishFirstLogin } from "@/lib/auth/first-login";
import { rateLimitAuthSync } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const Body = z.object({ ref: z.string().regex(/^[A-Za-z0-9]{4,16}$/).nullish() });

function isJsonContentType(request: Request): boolean {
  const media = request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase();
  return media === "application/json";
}

/**
 * Browser Origin must be this app. A cross-site POST cannot set Origin to
 * the host it is calling, so comparing it to this request's origin (and the
 * configured app URL) rejects CSRF without trusting a spoofed Host.
 */
function originAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(request.url).origin);
  } catch {
    /* ignore malformed request URL */
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      /* ignore malformed app URL */
    }
  }
  return allowed.has(origin);
}

/**
 * POST /api/auth/sync — called by Google One Tap right after
 * signInWithIdToken (which never passes through /auth/callback). Creates the
 * users row, applies a referral for that new row, and sends the welcome email
 * only when the insert actually created it.
 */
export async function POST(request: Request) {
  if (!isJsonContentType(request)) {
    return NextResponse.json({ error: "Unsupported content type" }, { status: 403 });
  }
  if (!originAllowed(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { blocked } = await rateLimitAuthSync(user.id);
  if (blocked) return blocked;

  const parsed = Body.safeParse(await request.json().catch(() => ({})));
  const result = await establishFirstLogin(user, parsed.success ? parsed.data.ref ?? null : null);
  if (!result.ok) {
    return NextResponse.json({ error: "Could not finish sign-in" }, { status: 500 });
  }
  if (result.isNewUser) sendWelcomeFor(user);
  return NextResponse.json({ isNewUser: result.isNewUser });
}
