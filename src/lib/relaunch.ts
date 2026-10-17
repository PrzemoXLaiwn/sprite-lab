// =============================================================================
// Relaunch bonus — granted once per account, atomically
// =============================================================================

import { prisma } from "@/lib/prisma";
import { needsReturningTopUp, relaunchActive, relaunchBonusFor, RELAUNCH } from "@/config/relaunch";
import { SIGNUP_CREDITS } from "@/config/signup";

export type RelaunchClaim =
  | { granted: true; amount: number; kind: "returning" | "new" | "topup"; credits: number }
  | { granted: false; reason: "inactive" | "claimed" | "no-user" };

type Prefs = {
  signupCredits?: number;
  relaunchBonusAt?: string;
  relaunchBonusAmount?: number | string;
  returningTopUpAt?: string;
};

export async function claimRelaunchBonus(userId: string): Promise<RelaunchClaim> {
  if (!relaunchActive()) return { granted: false, reason: "inactive" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, emailPreferences: true },
  });
  if (!user) return { granted: false, reason: "no-user" };
  const prefs = user.emailPreferences as Prefs | null;
  // Flat signup grant already written. Never add the campaign new-user bonus
  // on top, even if the relaunchBonusAt stamp was missed.
  if (prefs?.signupCredits === SIGNUP_CREDITS) return { granted: false, reason: "claimed" };

  if (!prefs?.relaunchBonusAt) {
    const bonus = relaunchBonusFor(user.createdAt);
    // One conditional UPDATE: adds the credits and stamps the marker only if the
    // marker isn't there yet, so parallel requests can't claim twice.
    // relaunchBonusAmount records what was granted so a later +5 cannot stack
    // onto a fresh grant of 20.
    const rows = await prisma.$queryRaw<{ credits: number }[]>`
      UPDATE users
      SET credits = credits + ${bonus.amount},
          total_bonus_credits = total_bonus_credits + ${bonus.amount},
          email_preferences = jsonb_set(
            jsonb_set(
              COALESCE(email_preferences::jsonb, '{}'::jsonb),
              '{relaunchBonusAt}',
              to_jsonb(now()::text)
            ),
            '{relaunchBonusAmount}',
            to_jsonb(${bonus.amount}::int)
          ),
          updated_at = now()
      WHERE id = ${userId}
        AND (email_preferences IS NULL OR email_preferences::jsonb->>'relaunchBonusAt' IS NULL)
      RETURNING credits`;
    if (rows.length > 0) {
      await prisma.creditTransaction
        .create({
          data: {
            userId,
            amount: bonus.amount,
            type: "BONUS",
            description: bonus.kind === "returning" ? "Relaunch: welcome back bonus" : "Relaunch: new account bonus",
          },
        })
        .catch((err) => console.error("[Relaunch] Failed to log transaction:", err));
      return { granted: true, amount: bonus.amount, kind: bonus.kind, credits: rows[0].credits };
    }
  }

  if (needsReturningTopUp(user.createdAt, prefs)) {
    const amount = RELAUNCH.RETURNING_TOP_UP;
    const rows = await prisma.$queryRaw<{ credits: number }[]>`
      UPDATE users
      SET credits = credits + ${amount},
          total_bonus_credits = total_bonus_credits + ${amount},
          email_preferences = jsonb_set(
            COALESCE(email_preferences::jsonb, '{}'::jsonb),
            '{returningTopUpAt}',
            to_jsonb(now()::text)
          ),
          updated_at = now()
      WHERE id = ${userId}
        AND created_at < ${RELAUNCH.STARTS_AT}
        AND email_preferences::jsonb->>'relaunchBonusAt' IS NOT NULL
        AND email_preferences::jsonb->>'returningTopUpAt' IS NULL
        AND (
          email_preferences::jsonb->>'relaunchBonusAmount' IS NULL
          OR email_preferences::jsonb->>'relaunchBonusAmount' = ${String(RELAUNCH.PREVIOUS_RETURNING_BONUS)}
        )
        AND (email_preferences IS NULL OR email_preferences::jsonb->>'signupCredits' IS DISTINCT FROM ${String(SIGNUP_CREDITS)})
      RETURNING credits`;
    if (rows.length > 0) {
      await prisma.creditTransaction
        .create({
          data: {
            userId,
            amount,
            type: "BONUS",
            description: "Relaunch: welcome-back top-up",
          },
        })
        .catch((err) => console.error("[Relaunch] Failed to log top-up:", err));
      return { granted: true, amount, kind: "topup", credits: rows[0].credits };
    }
  }

  return { granted: false, reason: "claimed" };
}
