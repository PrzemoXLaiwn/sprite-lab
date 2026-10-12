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
