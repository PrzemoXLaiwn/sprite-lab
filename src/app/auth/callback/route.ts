import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendWelcomeFor, syncAuthUser } from "@/lib/auth/sync-user";

// Only allow same-origin relative paths. `${origin}${next}` with next="@evil.com"
// or ".evil.com" would otherwise redirect to an attacker-controlled host.
function safeRedirectPath(next: string | null, origin: string): string {
  const fallback = "/generate";
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }
  try {
    const url = new URL(next, origin);
    if (url.origin !== origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = safeRedirectPath(searchParams.get("next"), origin);
  const referralCode = searchParams.get("ref");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get the authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      const isNewUser = user ? (await syncAuthUser(user, referralCode)).isNewUser : false;

      // Password reset - redirect to update-password page
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      // Email confirmation OR fresh signup that just landed here for the
      // first time. Supabase PKCE does not consistently carry `type=signup`
      // through the redirect, so fall back to the `isNewUser` flag we
      // already computed above to detect first-time users.
      if (type === "signup" || isNewUser) {
        if (user) sendWelcomeFor(user);
        // Straight into the creator (no interstitial), set up for a character: what most people make first
        return NextResponse.redirect(`${origin}/generate?welcome=1&categoryId=CHARACTERS`);
      }
      // Otherwise redirect to the next page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
