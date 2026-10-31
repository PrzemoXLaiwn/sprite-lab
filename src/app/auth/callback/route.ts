import { createClient } from "@/lib/supabase/server";
import { NextResponse, after } from "next/server";
import { sendWelcomeFor } from "@/lib/auth/sync-user";
import { establishFirstLogin } from "@/lib/auth/first-login";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";
import { recordSignupFromRequest } from "@/lib/funnel/signup";

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

      // Insert result, not a prior lookup: parallel callbacks cannot each
      // count as new. A database failure still lets the signed-in user through.
      const firstLogin = user ? await establishFirstLogin(user, referralCode) : { ok: true as const, isNewUser: false };
      const isNewUser = firstLogin.ok && firstLogin.isNewUser;

      // Password reset - redirect to update-password page
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      // Email confirmation OR fresh signup that just landed here for the
      // first time. Supabase PKCE does not consistently carry `type=signup`
      // through the redirect, so fall back to the insert result above.
      // The welcome email goes out only when the users row was created.
      if (user && isNewUser) {
        after(() => sendWelcomeFor(user));
        after(() => recordSignupFromRequest(request, user.id));
      }
      if (type === "signup" || isNewUser) {
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
