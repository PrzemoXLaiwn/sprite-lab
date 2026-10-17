// =============================================================================
// Auth → database user sync (shared by the OAuth/email callback and One Tap)
// =============================================================================
// Creates the users row on first sign-in, applies a referral code for new
// accounts, and sends the (transactional) welcome email once for new accounts.
// =============================================================================

import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { sendWelcomeEmail } from "@/lib/email/send";
import { SIGNUP_CREDITS } from "@/config/signup";
import { newAccountGrant } from "@/lib/signup-grant";

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


/** Upserts the DB user and applies a referral for new accounts. Never throws. */
export async function syncAuthUser(user: User, referralCode: string | null): Promise<{ isNewUser: boolean }> {
  let isNewUser = false;
  try {
    const existingUser = await prisma.user.findUnique({ where: { id: user.id }, select: { id: true } });
    isNewUser = !existingUser;
  } catch (err) {
    console.error("[Auth Sync] Lookup failed:", err);
  }
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
        ...newAccountGrant(),
        plan: "FREE",
        role: "USER",
        isActive: true,
      },
    });
    if (isNewUser && referralCode) {
      try {
        const referrer = await prisma.user.findUnique({ where: { referralCode: referralCode.toUpperCase() }, select: { id: true } });
        if (referrer && referrer.id !== user.id) {
          await prisma.$transaction([
            prisma.user.update({ where: { id: user.id }, data: { referredBy: referrer.id } }),
            prisma.user.update({ where: { id: referrer.id }, data: { referralCount: { increment: 1 } } }),
          ]);
          console.log(`[Auth Sync] Referral applied: ${user.id} referred by ${referrer.id}`);
        }
      } catch (refErr) {
        console.error("[Auth Sync] Failed to apply referral:", refErr);
      }
    }
  } catch (err) {
    console.error("[Auth Sync] Failed to sync user to DB:", err);
  }
  return { isNewUser };
}

/** Fire-and-forget welcome email for a new account. */
export function sendWelcomeFor(user: User): void {
  if (!user.email) return;
  sendWelcomeEmail(
    user.email,
    sanitizeName(user.user_metadata) ?? undefined,
    SIGNUP_CREDITS,
    user.id
  ).catch((err) => console.error("[Auth Sync] Welcome email failed:", err));
}
