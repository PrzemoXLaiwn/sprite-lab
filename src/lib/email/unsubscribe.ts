// =============================================================================
// Signed one-click unsubscribe links
// =============================================================================
// Links carry the user id plus an HMAC of it, so only the recipient's own
// link can unsubscribe that account. EMAIL_LINK_SECRET is preferred; the cron
// secret is a fallback so links work without extra setup.
// =============================================================================

import { createHmac, timingSafeEqual } from "crypto";

const SITE = "https://www.sprite-lab.com";

function secret(): string {
  const s = process.env.EMAIL_LINK_SECRET || process.env.CRON_SECRET;
  if (!s) throw new Error("EMAIL_LINK_SECRET (or CRON_SECRET) is not set");
  return s;
}

function sign(userId: string): string {
  return createHmac("sha256", secret()).update(`unsubscribe:${userId}`).digest("base64url").slice(0, 32);
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  if (!userId || !token || userId.length > 64 || token.length !== 32) return false;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(token);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export function unsubscribeUrl(userId: string): string {
  return `${SITE}/api/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${sign(userId)}`;
}

/** Headers that give Gmail/Outlook their native "Unsubscribe" button (RFC 8058). */
export function unsubscribeHeaders(userId: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl(userId)}>, <mailto:support@sprite-lab.com?subject=unsubscribe>`,
    "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
  };
}
