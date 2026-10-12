import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/send";
import { RELAUNCH, relaunchActive } from "@/config/relaunch";

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

// user_metadata is user-writable via the anon key (supabase.auth.updateUser),
// so it is only trusted for the initial profile on account creation, and only
// within these bounds.
const MAX_NAME_LENGTH = 50;
const TRUSTED_AVATAR_HOST_SUFFIXES = [
  "googleusercontent.com",
  "discordapp.com",
  "discord.com",
  "githubusercontent.com",
];

function sanitizeName(metadata: Record<string, unknown> | undefined): string | null {
  const raw = metadata?.full_name || metadata?.name;
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, MAX_NAME_LENGTH);
  return name || null;
}

function sanitizeAvatarUrl(metadata: Record<string, unknown> | undefined): string | null {
  const raw = metadata?.avatar_url;
  if (typeof raw !== "string" || !raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase();
    const trusted = TRUSTED_AVATAR_HOST_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`)
    );
    return trusted ? url.toString() : null;
  } catch {
    return null;
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

      let isNewUser = false;

      if (user) {
        // Check if this is a new user (for referral tracking)
        const existingUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { id: true, referredBy: true },
        });
        isNewUser = !existingUser;

        // Ensure user exists in database (auto-sync from Supabase Auth)
        try {
          await prisma.user.upsert({
            where: { id: user.id },
            // Never overwrite name/avatar on login: user_metadata is
            // user-controlled, so it only seeds the profile on creation.
            update: {},
            create: {
              id: user.id,
              email: user.email!,
              name: sanitizeName(user.user_metadata),
              avatarUrl: sanitizeAvatarUrl(user.user_metadata),
              credits: 10,
              plan: "FREE",
              role: "USER",
              isActive: true,
            },
          });

          // Apply referral code for new users
          if (isNewUser && referralCode) {
            try {
              // Find referrer by code
              const referrer = await prisma.user.findUnique({
                where: { referralCode: referralCode.toUpperCase() },
                select: { id: true },
              });

              if (referrer && referrer.id !== user.id) {
                // Apply referral
                await prisma.$transaction([
                  prisma.user.update({
                    where: { id: user.id },
                    data: { referredBy: referrer.id },
                  }),
                  prisma.user.update({
                    where: { id: referrer.id },
                    data: { referralCount: { increment: 1 } },
                  }),
                ]);
                console.log(`[Auth Callback] Referral applied: ${user.id} referred by ${referrer.id}`);
              }
            } catch (refErr) {
              console.error("[Auth Callback] Failed to apply referral:", refErr);
            }
          }
        } catch (err) {
          console.error("[Auth Callback] Failed to sync user to DB:", err);
        }
      }

      // Password reset - redirect to update-password page
      if (type === "recovery" || next === "/update-password") {
        return NextResponse.redirect(`${origin}/update-password`);
      }
      // Email confirmation OR fresh signup that just landed here for the
      // first time. Supabase PKCE does not consistently carry `type=signup`
      // through the redirect, so fall back to the `isNewUser` flag we
      // already computed above to detect first-time users.
      if (type === "signup" || isNewUser) {
        if (user) {
          sendWelcomeEmail(
            user.email!,
            sanitizeName(user.user_metadata) ?? undefined,
            // The relaunch bonus is added on their first app visit
            RELAUNCH.SIGNUP_CREDITS + (relaunchActive() ? RELAUNCH.NEW_USER_BONUS : 0),
            user.id
          ).catch((err) => console.error("[Auth Callback] Welcome email failed:", err));
        }
        return NextResponse.redirect(`${origin}/auth/confirm`);
      }
      // Otherwise redirect to the next page
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate`);
}
