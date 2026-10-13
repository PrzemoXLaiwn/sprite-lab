// =============================================================================
// Who must never get a marketing email (bounced, complained, opted out)
// =============================================================================
// Two sources, both written by the Resend webhook (/api/webhooks/resend):
//   - users.email_preferences: bouncedAt / complainedAt (+ marketing: false)
//   - email_logs.status "bounced" / "complained" for the address (covers
//     addresses without an account, e.g. abandoned checkouts)
// The batch senders filter with `marketingBlockedByPrefs`; every marketing
// send function in send.tsx and lifecycle/send.ts also asks
// `marketingSuppressionReason` right before handing the message to Resend,
// so a new or forgotten caller can't email a suppressed address.
// =============================================================================

import { prisma } from "@/lib/prisma";

/** email_logs statuses that mean "never market to this address again". */
export const SUPPRESSING_STATUSES = ["bounced", "complained"] as const;

export type BlockReason = "opted_out" | "bounced" | "complained";

/** Pure check on the raw email_preferences jsonb. */
export function marketingBlockedByPrefs(raw: unknown): BlockReason | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.complainedAt === "string" && p.complainedAt) return "complained";
  if (typeof p.bouncedAt === "string" && p.bouncedAt) return "bounced";
  if (p.marketing === false || (typeof p.unsubscribedAt === "string" && p.unsubscribedAt)) return "opted_out";
  return null;
}

/** Last-line guard before a marketing send. Returns a readable reason or null. */
export async function marketingSuppressionReason(email: string, userId?: string | null): Promise<string | null> {
  const address = email.trim();
  const variants = [...new Set([address, address.toLowerCase()])];
  const [user, log] = await Promise.all([
    prisma.user.findFirst({
      where: userId ? { id: userId } : { email: { in: variants } },
      select: { emailPreferences: true },
    }),
    prisma.emailLog.findFirst({
      where: { email: { in: variants }, status: { in: [...SUPPRESSING_STATUSES] } },
      select: { status: true },
    }),
  ]);
  const byPrefs = marketingBlockedByPrefs(user?.emailPreferences);
  if (byPrefs) return `suppressed: ${byPrefs}`;
  if (log) return `suppressed: ${log.status}`;
  return null;
}
