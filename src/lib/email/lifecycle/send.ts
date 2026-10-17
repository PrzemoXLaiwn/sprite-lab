// =============================================================================
// Lifecycle emails — the only place that actually hands a message to Resend
// =============================================================================
// Called by run.ts and nowhere else, and only when MARKETING_EMAILS_ENABLED is
// "true" and the run isn't a dry run. Always sends the List-Unsubscribe
// headers (one-click in Gmail / Outlook) and a plain-text part, and logs the
// outcome to email_logs so the frequency caps see it.
// =============================================================================

import { resend, EMAIL_FROM, EMAIL_REPLY_TO } from "../resend";
import { logEmail, type EmailResult, type EmailType } from "../send";
import { marketingSuppressionReason } from "../suppression";
import { unsubscribeHeaders } from "../unsubscribe";
import { LIFECYCLE_LOG_TYPES, type SequenceId } from "./rules";

export interface OutgoingLifecycleEmail {
  to: string;
  userId: string;
  sequence: SequenceId;
  subject: string;
  html: string;
  text: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
}

export async function sendLifecycleEmail(msg: OutgoingLifecycleEmail): Promise<EmailResult> {
  const type = LIFECYCLE_LOG_TYPES[msg.sequence] as EmailType;
  const base = { email: msg.to, userId: msg.userId, type, subject: msg.subject, metadata: { sequence: msg.sequence, ...msg.metadata } };
  if (!resend) return { success: false, error: "RESEND_API_KEY not configured" };
  try {
    // Last-line guard: a bounce/complaint may have arrived after the audience was loaded
    const suppressed = await marketingSuppressionReason(msg.to, msg.userId);
    if (suppressed) return { success: false, error: suppressed };
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: msg.to,
      replyTo: EMAIL_REPLY_TO,
      subject: msg.subject,
      html: msg.html,
      text: msg.text,
      headers: unsubscribeHeaders(msg.userId),
    });
    if (error) {
      await logEmail({ ...base, status: "failed", errorMessage: error.message });
      return { success: false, error: error.message };
    }
    await logEmail({ ...base, status: "sent", messageId: data?.id });
    return { success: true, messageId: data?.id };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    await logEmail({ ...base, status: "failed", errorMessage });
    return { success: false, error: errorMessage };
  }
}
