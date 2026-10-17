import { NextResponse } from "next/server";
import { mergeEmailPreferences } from "@/app/api/_lib/email-prefs";
import { prisma } from "@/lib/prisma";
import { handleResendEvent, verifyWebhookSignature, type WebhookDeps } from "@/lib/email/resend-webhook";

// Resend → Webhooks → https://www.sprite-lab.com/api/webhooks/resend
// Events: email.bounced, email.complained, email.delivery_delayed.
// Verified with RESEND_WEBHOOK_SECRET (Svix signature, node:crypto). Without
// the secret every request is rejected (503) — fail closed. Writes only
// email_logs.status and, on bounce/complaint, a jsonb merge into
// users.email_preferences. Never sends anything.

export const dynamic = "force-dynamic";

const MAX_BODY = 256 * 1024;

const deps: WebhookDeps = {
  async updateStatus(messageId, to, from) {
    const res = await prisma.emailLog.updateMany({ where: { messageId, status: { in: [...from] } }, data: { status: to } });
    return res.count;
  },
  async findUsers(messageId, addresses) {
    const logs = messageId
      ? await prisma.emailLog.findMany({ where: { messageId, userId: { not: null } }, select: { userId: true } })
      : [];
    const ids = [...new Set(logs.map((l) => l.userId).filter((id): id is string => Boolean(id)))];
    const or = [
      ...(ids.length ? [{ id: { in: ids } }] : []),
      ...addresses.map((a) => ({ email: { equals: a, mode: "insensitive" as const } })),
    ];
    if (!or.length) return [];
    return prisma.user.findMany({ where: { OR: or }, select: { id: true, emailPreferences: true }, take: 20 });
  },
  mergePrefs: mergeEmailPreferences,
};

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret?.trim()) {
    console.error("[Webhook:Resend] RESEND_WEBHOOK_SECRET is not set — rejecting");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const body = await request.text();
  if (body.length > MAX_BODY) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const h = request.headers;
  const verified = verifyWebhookSignature(
    secret,
    {
      id: h.get("svix-id") ?? h.get("webhook-id"),
      timestamp: h.get("svix-timestamp") ?? h.get("webhook-timestamp"),
      signature: h.get("svix-signature") ?? h.get("webhook-signature"),
      body,
    }
  );
  if (!verified.ok) {
    console.warn("[Webhook:Resend] Rejected:", verified.reason);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const outcome = await handleResendEvent(payload, deps);
    if (outcome.handled) console.log("[Webhook:Resend]", outcome);
    return NextResponse.json({ received: true, ...outcome });
  } catch (error) {
    console.error("[Webhook:Resend] Error:", error);
    // 500 → Resend retries; the writes are idempotent
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
