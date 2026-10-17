import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendWelcomeFor, syncAuthUser } from "@/lib/auth/sync-user";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";

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
        // A plan or credit pack chosen before sign-up has to survive email
        // confirmation and OAuth. Other first-time users still see /auth/confirm.
        if (isCheckoutReturn(next)) {
          return NextResponse.redirect(`${origin}${next}`);
        }
        return NextResponse.redirect(`${origin}/auth/confirm`);
      }
      // Otherwise redirect to the next page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions. Keep a chosen plan on
  // the login link so retrying doesn't drop it.
  if (isCheckoutReturn(next)) {
    const failed = new URL("/login", origin);
    failed.searchParams.set("error", "Could not authenticate");
    failed.searchParams.set("redirectTo", next);
    return NextResponse.redirect(failed);
  }
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
