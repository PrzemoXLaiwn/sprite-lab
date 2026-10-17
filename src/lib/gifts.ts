// =============================================================================
// Gift credits — a one-time "claim your gift" link for a specific user
// =============================================================================
// The gift (amount + random token) is stored on the user row
// (users.email_preferences.gifts.<id>). The claim is one conditional UPDATE
// that adds the credits and stamps claimedAt only while it is still unclaimed
// and the token matches, so a link works once and only for its own account.
// =============================================================================

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SITE = "https://www.sprite-lab.com";

export async function createGift(userId: string, amount: number, note: string): Promise<{ id: string; url: string }> {
  const id = `g${Date.now().toString(36)}`;
  const token = randomBytes(18).toString("base64url");
  const gift = JSON.stringify({ amount, token, note, createdAt: new Date().toISOString(), claimedAt: null });
  await prisma.$executeRaw`
    UPDATE users
    SET email_preferences = jsonb_set(
      jsonb_set(COALESCE(email_preferences::jsonb, '{}'::jsonb), '{gifts}', COALESCE(email_preferences::jsonb->'gifts', '{}'::jsonb)),
      ARRAY['gifts', ${id}::text],
      ${gift}::jsonb
    )
    WHERE id = ${userId}`;
  return { id, url: `${SITE}/api/gift/claim?u=${encodeURIComponent(userId)}&g=${id}&t=${token}` };
}

export type GiftClaim = { ok: true; amount: number; credits: number } | { ok: false; reason: "invalid" | "claimed" };

export async function claimGift(userId: string, giftId: string, token: string): Promise<GiftClaim> {
  if (!/^g[a-z0-9]{4,16}$/.test(giftId) || !/^[A-Za-z0-9_-]{20,40}$/.test(token) || userId.length > 64) return { ok: false, reason: "invalid" };
  const rows = await prisma.$queryRaw<{ credits: number; amount: number }[]>`
    UPDATE users
    SET credits = credits + (email_preferences::jsonb->'gifts'->${giftId}->>'amount')::int,
        total_bonus_credits = total_bonus_credits + (email_preferences::jsonb->'gifts'->${giftId}->>'amount')::int,
        email_preferences = jsonb_set(email_preferences::jsonb, ARRAY['gifts', ${giftId}::text, 'claimedAt'], to_jsonb(now()::text)),
        updated_at = now()
    WHERE id = ${userId}
      AND email_preferences::jsonb->'gifts'->${giftId}->>'token' = ${token}
      AND (email_preferences::jsonb->'gifts'->${giftId}->>'claimedAt') IS NULL
    RETURNING credits, (email_preferences::jsonb->'gifts'->${giftId}->>'amount')::int AS amount`;
  if (rows.length === 0) {
    const exists = await prisma.$queryRaw<{ n: number }[]>`
      SELECT 1 AS n FROM users WHERE id = ${userId} AND email_preferences::jsonb->'gifts'->${giftId}->>'token' = ${token}`;
    return { ok: false, reason: exists.length ? "claimed" : "invalid" };
  }
  await prisma.creditTransaction
    .create({ data: { userId, amount: rows[0].amount, type: "BONUS", description: "Gift from SpriteLab" } })
    .catch((err) => console.error("[Gift] Failed to log transaction:", err));
  return { ok: true, amount: rows[0].amount, credits: rows[0].credits };
}
