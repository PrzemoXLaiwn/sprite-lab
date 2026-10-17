// =============================================================================
// Profile fields and the welcome email shared by the OAuth callback and One Tap
// =============================================================================
// The users-row insert and the referral live in src/lib/auth/first-login.ts.
// Callers send this email only when that insert reports a new row.
// =============================================================================

import type { User } from "@supabase/supabase-js";
import { sendWelcomeEmail } from "@/lib/email/send";
import { SIGNUP_CREDITS } from "@/config/signup";

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

/**
 * Welcome email for an account row that was just created.
 * Returns the send promise so route handlers can pass it to `after()`.
 * The amount is SIGNUP_CREDITS, the same grant the users row is inserted with.
 */
export async function sendWelcomeFor(user: User): Promise<void> {
  if (!user.email) return;
  try {
    await sendWelcomeEmail(
      user.email,
      sanitizeName(user.user_metadata) ?? undefined,
      SIGNUP_CREDITS,
      user.id
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "welcome email failed";
    console.error("[Auth] welcome email failed:", message);
  }
}
