import { prisma } from "@/lib/prisma";

/**
 * Merge `patch` into users.email_preferences in ONE statement (jsonb `||`).
 *
 * Never write back a previously-read copy of email_preferences: the same JSON
 * holds gifts (src/lib/gifts.ts), so a stale read-modify-write could reset a
 * gift's claimedAt and let it be claimed again, or drop a freshly created one.
 */
export async function mergeEmailPreferences(
  userId: string,
  patch: Record<string, unknown>
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE users
    SET email_preferences = COALESCE(email_preferences::jsonb, '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb,
        updated_at = now()
    WHERE id = ${userId}`;
}

/**
 * Store where the account came from, once: the same jsonb `||` merge, only
 * while `signupSource` isn't set yet. Returns true when this call stored it.
 */
export async function setSignupSourceOnce(userId: string, source: Record<string, string | null>): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE users
    SET email_preferences = COALESCE(email_preferences::jsonb, '{}'::jsonb) || ${JSON.stringify({ signupSource: { ...source, at: new Date().toISOString() } })}::jsonb,
        updated_at = now()
    WHERE id = ${userId}
      AND COALESCE(email_preferences::jsonb -> 'signupSource', 'null'::jsonb) = 'null'::jsonb`;
  return updated === 1;
}

/**
 * Claim today's lifecycle-email slot for a user: the same jsonb `||` merge as
 * above, but only when `lifecycleDay` isn't already `day`. Returns false when
 * another run already claimed it, so a retried or doubled cron never emails
 * anyone twice on the same day.
 */
export async function claimLifecycleDay(userId: string, day: string): Promise<boolean> {
  const updated = await prisma.$executeRaw`
    UPDATE users
    SET email_preferences = COALESCE(email_preferences::jsonb, '{}'::jsonb) || ${JSON.stringify({ lifecycleDay: day })}::jsonb,
        updated_at = now()
    WHERE id = ${userId}
      AND COALESCE(email_preferences::jsonb ->> 'lifecycleDay', '') <> ${day}`;
  return updated === 1;
}
