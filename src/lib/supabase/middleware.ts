import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isCheckoutReturn, safeRedirectPath } from "@/lib/safe-redirect";

const PATH_HEADER = "x-pathname";

/** So the dashboard layout can tell a checkout URL from any other protected page. */
function stampPath(request: NextRequest) {
  try {
    request.headers.set(PATH_HEADER, request.nextUrl.pathname + request.nextUrl.search);
  } catch {
    // Some NextRequest headers are immutable. The checkout redirect below still
    // sends anonymous buyers to /login with the checkout URL attached.
  }
}

/**
 * A refresh that cannot complete: the refresh token was already rotated by
 * another request or tab ("Invalid Refresh Token: Already Used"), or the
 * chunked session cookie was read half-written ("Cannot create property
 * 'user' on string"). Neither says the person is signed out — the browser
 * usually holds a newer cookie — so the request goes through unchanged
 * instead of clearing the cookies and bouncing them to /login.
 */
export function isSessionRefreshGlitch(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  return /refresh[_ ]token|already used|cannot create property|unexpected token|is not valid json/i.test(message)
    || /refresh_token_(already_used|not_found)|bad_json/i.test(code);
}

export async function updateSession(request: NextRequest) {
  stampPath(request);
  // The cookies as the browser sent them: a failed refresh must not forward a
  // request whose cookies the auth client has already blanked out
  const originalHeaders = new Headers(request.headers);
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          stampPath(request);
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // A visitor without a session cookie costs no network call here. If the auth
  // service is unreachable, treat everyone as signed out: public pages keep
  // working and protected ones send people to the login page.
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (!user && error && isSessionRefreshGlitch(error)) {
      console.warn("[proxy] session refresh glitch, request passed through:", error.message);
      return NextResponse.next({ request: { headers: originalHeaders } });
    }
  } catch (error) {
    if (isSessionRefreshGlitch(error)) {
      console.warn("[proxy] session refresh glitch, request passed through:", error instanceof Error ? error.message : error);
      return NextResponse.next({ request: { headers: originalHeaders } });
    }
    console.error("[proxy] auth check failed:", error);
  }

  // Protected routes
  const protectedPaths = ["/generate", "/gallery", "/assets", "/presets", "/projects", "/settings", "/dashboard", "/usage", "/referrals", "/admin", "/moderator", "/animate", "/upscale", "/remove-bg", "/variations", "/edit", "/quests", "/play", "/st-packs"];
  const isProtectedPath = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (!user && isProtectedPath) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Checkout links go out by email to existing accounts (the Starter first
  // month offer), so a signed-out buyer lands on sign-in with the full checkout
  // URL — plan and `?offer=` included — carried along; the form links to
  // sign-up for people who are new, and the offer survives that hop too.
  if (!user && isCheckoutReturn(request.nextUrl.pathname)) {
    const next = safeRedirectPath(
      request.nextUrl.pathname + request.nextUrl.search,
      request.nextUrl.origin,
    );
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    if (isCheckoutReturn(next)) {
      url.searchParams.set("redirectTo", next);
    }
    return NextResponse.redirect(url);
  }

  // Auth routes - redirect to dashboard if already logged in
  const authPaths = ["/login", "/register"];
  const isAuthPath = authPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (user && isAuthPath) {
    // Only a checkout return overrides the usual "already signed in → /generate"
    // redirect. Other auth-page visits stay as they are.
    const requested = request.nextUrl.searchParams.get("next") ?? request.nextUrl.searchParams.get("redirectTo");
    if (requested) {
      const next = safeRedirectPath(requested, request.nextUrl.origin);
      if (isCheckoutReturn(next)) {
        return NextResponse.redirect(new URL(next, request.nextUrl.origin));
      }
    }
    const url = request.nextUrl.clone();
    url.pathname = "/generate";
    return NextResponse.redirect(url);
  }

  // Public pages are static for visitors and search engines; signed-in users
  // get the versions with their account state (src/app/member). The address
  // bar keeps the public URL.
  const memberPath = user ? MEMBER_REWRITES[request.nextUrl.pathname] : undefined;
  if (memberPath) {
    const url = request.nextUrl.clone();
    url.pathname = memberPath;
    const rewrite = NextResponse.rewrite(url, { request });
    supabaseResponse.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
    return rewrite;
  }

  return supabaseResponse;
}

const MEMBER_REWRITES: Record<string, string> = {
  "/": "/member/home",
  "/pricing": "/member/pricing",
  "/community": "/member/community",
};
