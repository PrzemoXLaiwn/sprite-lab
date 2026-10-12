// =============================================================================
// Relaunch email campaign — one "SpriteLab is back" email per existing account
// =============================================================================
// Sent in daily batches (Resend's free plan allows 100 emails/day) by
// /api/cron/relaunch, most engaged users first. Each account is emailed at
// most once: anyone with a sent RELAUNCH row in email_logs is skipped.
// Users who turned marketing off or unsubscribed are never emailed.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { RELAUNCH } from "@/config/relaunch";
import { sendRelaunchEmail } from "./send";
import { unsubscribeUrl } from "./unsubscribe";

const SITE = "https://www.sprite-lab.com";
const UTM = "utm_source=email&utm_medium=email&utm_campaign=relaunch";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  lastPrompt?: string;
}

/** Existing accounts that can still receive the relaunch email, best first. */
export async function relaunchRecipients(limit: number): Promise<Recipient[]> {
  const alreadySent = await prisma.emailLog.findMany({
    where: { type: "RELAUNCH", status: "sent" },
    select: { userId: true, email: true },
  });
  const sentIds = new Set(alreadySent.map((e) => e.userId).filter(Boolean));
  const sentEmails = new Set(alreadySent.map((e) => e.email.toLowerCase()));

  const users = await prisma.user.findMany({
    where: { isActive: true, createdAt: { lt: RELAUNCH.STARTS_AT } },
    select: {
      id: true,
      email: true,
      name: true,
      emailPreferences: true,
      lastActiveAt: true,
      _count: { select: { generations: true } },
    },
  });

  const eligible = users.filter((u) => {
    const prefs = u.emailPreferences as { marketing?: boolean; unsubscribedAt?: string } | null;
    if (prefs?.marketing === false || prefs?.unsubscribedAt) return false;
    if (!u.email || !u.email.includes("@")) return false;
    return !sentIds.has(u.id) && !sentEmails.has(u.email.toLowerCase());
  });

  // People who actually generated something first, most recently active first
  eligible.sort((a, b) => {
    const ga = a._count.generations > 0 ? 1 : 0, gb = b._count.generations > 0 ? 1 : 0;
    if (ga !== gb) return gb - ga;
    return (b.lastActiveAt?.getTime() ?? 0) - (a.lastActiveAt?.getTime() ?? 0);
  });

  const picked = eligible.slice(0, limit);
  const out: Recipient[] = [];
  for (const u of picked) {
    const last = await prisma.generation.findFirst({
      where: { userId: u.id, NOT: { subcategoryId: "ANIMATION" } },
      orderBy: { createdAt: "desc" },
      select: { prompt: true },
    });
    out.push({ id: u.id, email: u.email, name: u.name, lastPrompt: last ? cleanPrompt(last.prompt) : undefined });
  }
  return out;
}

export async function countRelaunchRemaining(): Promise<number> {
  return (await relaunchRecipients(100_000)).length;
}

export function relaunchEmailProps(r: Recipient) {
  return {
    userName: firstName(r.name),
    bonus: RELAUNCH.RETURNING_BONUS,
    lastPrompt: r.lastPrompt,
    ctaUrl: `${SITE}/generate?${UTM}`,
    retryUrl: r.lastPrompt ? `${SITE}/generate?prompt=${encodeURIComponent(r.lastPrompt)}&${UTM}&utm_content=retry` : undefined,
    unsubscribeUrl: unsubscribeUrl(r.id),
  };
}

export async function runRelaunchBatch(opts: { limit: number; dryRun?: boolean }) {
  const recipients = await relaunchRecipients(opts.limit);
  const result = { attempted: recipients.length, sent: 0, failed: 0, errors: [] as string[], dryRun: Boolean(opts.dryRun) };
  if (opts.dryRun) return result;
  for (const r of recipients) {
    const res = await sendRelaunchEmail(r.email, r.id, relaunchEmailProps(r));
    if (res.success) result.sent++;
    else {
      result.failed++;
      result.errors.push(`${r.id}: ${res.error}`);
      // Daily quota hit — stop and continue tomorrow
      if (/limit|quota|429/i.test(res.error ?? "")) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 600)); // Resend: 2 requests/second
  }
  return result;
}

function firstName(name: string | null): string | undefined {
  const first = name?.trim().split(/\s+/)[0];
  if (!first || first.length > 24 || /[@<>]|https?:/i.test(first)) return undefined;
  return first;
}

function cleanPrompt(prompt: string): string | undefined {
  const text = prompt.replace(/^\[[^\]]*\]\s*/, "").replace(/\s+/g, " ").trim();
  if (text.length < 3 || /https?:|www\.|<|>/i.test(text)) return undefined;
  return text.length > 70 ? `${text.slice(0, 67).replace(/\s+\S*$/, "")}…` : text;
}
