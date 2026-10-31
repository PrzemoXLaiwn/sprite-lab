// =============================================================================
// Auth → database user sync (shared by the OAuth/email callback and One Tap)
// =============================================================================
// Creates the users row on first sign-in, applies a referral code for new
// accounts, and sends the (transactional) welcome email once for new accounts.
// =============================================================================

import type { User } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email/send";
import { RELAUNCH, newSignupBonus } from "@/config/relaunch";

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

export function sanitizeName(metadata: Record<string, unknown> | undefined): string | null {
  const raw = metadata?.full_name || metadata?.name;
  if (typeof raw !== "string") return null;
  const name = raw.trim().slice(0, MAX_NAME_LENGTH);
  return name || null;
}

export function sanitizeAvatarUrl(metadata: Record<string, unknown> | undefined): string | null {
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


/** Fire-and-forget welcome email for a new account. */
export function sendWelcomeFor(user: User): void {
  if (!user.email) return;
  sendWelcomeEmail(
    user.email,
    sanitizeName(user.user_metadata) ?? undefined,
    // The relaunch bonus is added on their first app visit
    RELAUNCH.SIGNUP_CREDITS + newSignupBonus(),
    user.id
  ).catch((err) => console.error("[Auth Sync] Welcome email failed:", err));
}
