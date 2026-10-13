// =============================================================================
// Email switches — every env flag that decides whether marketing mail goes out
// =============================================================================
// MARKETING_EMAILS_ENABLED  default OFF. One switch for the lifecycle emails and
//                           the older marketing crons (/api/cron/emails,
//                           /api/cron/daily-reminder, the cron-secret
//                           /api/email/special-offer and /abandoned-cart).
//                           Only the exact string "true" turns it on.
// WEEKLY_DIGEST_ENABLED     default ON (unset keeps today's behaviour). Set to
//                           "false" (or "0" / "off" / "no") to stop the Sunday
//                           digest. Separate on purpose: the digest is live.
// RELAUNCH_EMAILS_ENABLED   default OFF, owned by /api/cron/relaunch. Read here
//                           only so the admin page can show it.
// EMAIL_POSTAL_ADDRESS      postal address printed in every marketing footer.
//                           No default: we never invent one.
// RESEND_WEBHOOK_SECRET     "whsec_…" from Resend → Webhooks. Without it the
//                           bounce/complaint webhook rejects everything.
// The welcome email is transactional and isn't controlled by any of these.
// =============================================================================

/** Lifecycle + older marketing crons. Off unless exactly "true". */
export function marketingEmailsEnabled(): boolean {
  return process.env.MARKETING_EMAILS_ENABLED === "true";
}

/** Sunday weekly digest. On unless explicitly switched off. */
export function weeklyDigestEnabled(): boolean {
  const v = (process.env.WEEKLY_DIGEST_ENABLED ?? "").trim().toLowerCase();
  return !["false", "0", "off", "no"].includes(v);
}

export function relaunchEmailsEnabled(): boolean {
  return process.env.RELAUNCH_EMAILS_ENABLED === "true";
}

/** The postal address for marketing footers, or null when it isn't configured. */
export function postalAddress(): string | null {
  const v = (process.env.EMAIL_POSTAL_ADDRESS ?? "").replace(/\s+/g, " ").trim();
  return v ? v.slice(0, 300) : null;
}

export function webhookSecretConfigured(): boolean {
  return Boolean((process.env.RESEND_WEBHOOK_SECRET ?? "").trim());
}

/** JSON body returned by a marketing cron that the master switch turned off. */
export const MARKETING_OFF_RESPONSE = {
  success: true,
  skipped: true,
  reason: "MARKETING_EMAILS_ENABLED is not true",
} as const;
