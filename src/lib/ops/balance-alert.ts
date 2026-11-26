// Once a day, tell the owner that Runware's prepaid balance is empty.
// The pure check is what the tests lock. Sending is best-effort: a log line
// always happens, the email uses the existing Resend client, and the last
// send is remembered in R2 so a second serverless instance does not repeat it.

import { getR2ObjectBuffer, uploadBufferToR2 } from "@/lib/r2";
import { resend, EMAIL_FROM } from "@/lib/email/resend";

export const BALANCE_ALERT_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STATE_KEY = "ops/provider-balance-alert.json";
const ALERT_TO = process.env.ALERT_EMAIL || "spritelab.contact@gmail.com";

export function balanceAlertDue(lastAlertAt: string | null | undefined, now: Date): boolean {
  if (!lastAlertAt) return true;
  const at = Date.parse(lastAlertAt);
  if (!Number.isFinite(at)) return true;
  return now.getTime() - at >= BALANCE_ALERT_INTERVAL_MS;
}

let memoryAt: string | null = null;

async function readLastAlertAt(): Promise<string | null> {
  try {
    const buf = await getR2ObjectBuffer(STATE_KEY);
    if (!buf) return null;
    const parsed = JSON.parse(buf.toString("utf8")) as { lastAlertAt?: unknown };
    return typeof parsed.lastAlertAt === "string" ? parsed.lastAlertAt : null;
  } catch {
    return null;
  }
}

/** Log always. Email at most once per day. Never includes a user's sprite or prompt. */
export async function reportProviderBalanceLow(feature: string): Promise<void> {
  const now = new Date();
  console.error("[ops] Runware prepaid balance is empty", { feature, at: now.toISOString() });
  if (!balanceAlertDue(memoryAt, now)) return;
  const stored = await readLastAlertAt();
  if (!balanceAlertDue(stored, now)) {
    memoryAt = stored;
    return;
  }
  memoryAt = now.toISOString();
  if (!resend) return;
  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to: ALERT_TO,
      subject: "SpriteLab: Runware balance is empty",
      text: [
        `Runware's prepaid balance is empty, so ${feature} is temporarily unavailable.`,
        "Users are not charged, or the credits are refunded if a job had already started.",
        "Static sprites still use the Cloudflare fallback when that is configured.",
        "",
        "Top up the Runware account, then retry. This email is sent at most once a day.",
      ].join("\n"),
    });
    await uploadBufferToR2(
      Buffer.from(JSON.stringify({ lastAlertAt: memoryAt, feature })),
      STATE_KEY,
      "application/json",
    );
  } catch (error) {
    console.error("[ops] provider balance alert email failed:", error instanceof Error ? error.message : error);
  }
}
