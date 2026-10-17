// =============================================================================
// First login: one users row, one referral, one "new" signal
// =============================================================================
// Used by /api/auth/sync and /auth/callback. "New" comes from the insert
// itself (createMany skipDuplicates count === 1), not from a prior
// findUnique. The referral update is conditional on referredBy still being
// null, in the same transaction, so parallel calls cannot each increment
// referralCount. Callers send the welcome email only when isNewUser is true.
// =============================================================================

import type { User } from "@supabase/supabase-js";
import { prisma } from "@/lib/prisma";
import { sanitizeAvatarUrl, sanitizeName } from "@/lib/auth/sync-user";
import { newAccountGrant } from "@/lib/signup-grant";

const REFERRAL_CODE = /^[A-Za-z0-9]{4,16}$/;

export type FirstLoginResult =
  | { ok: true; isNewUser: boolean }
  | { ok: false };

function normalizeReferralCode(code: string | null): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  if (!REFERRAL_CODE.test(trimmed)) return null;
  return trimmed.toUpperCase();
}

/** Prisma code + message only. The error object can carry the query and row. */
function logPrisma(context: string, err: unknown): void {
  const record = typeof err === "object" && err !== null ? (err as { code?: unknown; message?: unknown }) : null;
  const code = typeof record?.code === "string" ? record.code : "unknown";
  const message = typeof record?.message === "string" ? record.message : "no message";
  console.error(`[Auth] ${context}:`, code, message);
}

/**
 * Inserts the users row on first sign-in and, for that insert only, applies
 * a referral code. Never throws: a database failure is `{ ok: false }` after
 * the Prisma code and message are logged.
 */
export async function establishFirstLogin(user: User, referralCode: string | null): Promise<FirstLoginResult> {
  const email = user.email;
  if (!email) {
    console.error("[Auth] first login failed:", "missing_email", "supabase user has no email");
    return { ok: false };
  }

  const code = normalizeReferralCode(referralCode);

  try {
    return await prisma.$transaction(async (tx) => {
      const created = await tx.user.createMany({
        data: [
          {
            id: user.id,
            email,
            name: sanitizeName(user.user_metadata),
            avatarUrl: sanitizeAvatarUrl(user.user_metadata),
            ...newAccountGrant(),
            plan: "FREE",
            role: "USER",
            isActive: true,
          },
        ],
        skipDuplicates: true,
      });
      const isNewUser = created.count === 1;

      if (isNewUser && code) {
        const referrer = await tx.user.findUnique({
          where: { referralCode: code },
          select: { id: true },
        });
        if (referrer && referrer.id !== user.id) {
          const claimed = await tx.user.updateMany({
            where: { id: user.id, referredBy: null },
            data: { referredBy: referrer.id },
          });
          if (claimed.count === 1) {
            await tx.user.update({
              where: { id: referrer.id },
              data: { referralCount: { increment: 1 } },
            });
          }
        }
      }

      return { ok: true as const, isNewUser };
    });
  } catch (err) {
    logPrisma("first login failed", err);
    return { ok: false };
  }
}
