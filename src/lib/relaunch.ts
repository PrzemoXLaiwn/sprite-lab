// =============================================================================
// Relaunch bonus — granted once per account, atomically
// =============================================================================

import { prisma } from "@/lib/prisma";
import { relaunchActive, relaunchBonusFor } from "@/config/relaunch";

export type RelaunchClaim =
  | { granted: true; amount: number; kind: "returning" | "new"; credits: number }
  | { granted: false; reason: "inactive" | "claimed" | "no-user" };

export async function claimRelaunchBonus(userId: string): Promise<RelaunchClaim> {
  if (!relaunchActive()) return { granted: false, reason: "inactive" };

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } });
  if (!user) return { granted: false, reason: "no-user" };
  const bonus = relaunchBonusFor(user.createdAt);

  // One conditional UPDATE: adds the credits and stamps the marker only if the
  // marker isn't there yet, so parallel requests can't claim twice.
  const rows = await prisma.$queryRaw<{ credits: number }[]>`
    UPDATE users
    SET credits = credits + ${bonus.amount},
        total_bonus_credits = total_bonus_credits + ${bonus.amount},
        email_preferences = jsonb_set(
          COALESCE(email_preferences::jsonb, '{}'::jsonb),
          '{relaunchBonusAt}',
          to_jsonb(now()::text)
        ),
        updated_at = now()
    WHERE id = ${userId}
      AND (email_preferences IS NULL OR email_preferences::jsonb->>'relaunchBonusAt' IS NULL)
    RETURNING credits`;
  if (rows.length === 0) return { granted: false, reason: "claimed" };

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
