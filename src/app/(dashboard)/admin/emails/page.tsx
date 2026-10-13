import { redirect } from "next/navigation";
import { checkAdminAccess } from "../page.actions";
import { EmailPreviewPanel, type EmailPreview } from "@/components/admin/EmailPreviewPanel";
import type { EmailSwitchboard } from "@/components/admin/EmailSwitchboardPanel";
import { marketingEmailsEnabled, postalAddress, relaunchEmailsEnabled, webhookSecretConfigured, weeklyDigestEnabled } from "@/lib/email/flags";
import { renderLifecycleHtml } from "@/lib/email/lifecycle/content";
import { lifecycleDeps } from "@/lib/email/lifecycle/deps";
import { lifecycleBaseCap, resendDailyLimit } from "@/lib/email/lifecycle/limits";
import { runLifecycle, type LifecycleDeps, type LifecycleRunResult } from "@/lib/email/lifecycle/run";
import { sampleLifecycleMessages } from "@/lib/email/lifecycle/samples";

// Admin-only: every lifecycle template rendered with sample data, the email
// switches (read-only, from env), today's send budget and the dry-run counts.
// Read-only — the deps below refuse to write.

export const dynamic = "force-dynamic";

const refuse = async (): Promise<never> => {
  throw new Error("The admin preview never sends or writes");
};

/** Loading is real (read-only); claiming, sending and marking can't happen from here. */
const readOnlyDeps: LifecycleDeps = { ...lifecycleDeps, claimDay: refuse, send: refuse, markSent: refuse };

export default async function AdminEmailsPage() {
  const access = await checkAdminAccess();
  if (!access.isAdmin) redirect("/generate");

  const samples = sampleLifecycleMessages();
  const previews: EmailPreview[] = await Promise.all(
    Object.values(samples).map(async (m) => ({ sequence: m.sequence, subject: m.subject, preview: m.preview, text: m.text, html: await renderLifecycleHtml(m) }))
  );

  let dryRun: LifecycleRunResult | null = null;
  let dryRunError: string | null = null;
  try {
    dryRun = await runLifecycle(
      { dryRun: true, dryRunReason: "admin preview", dailyCap: lifecycleBaseCap(), providerLimit: resendDailyLimit() },
      readOnlyDeps
    );
  } catch (err) {
    dryRunError = err instanceof Error ? err.message : "Unknown error";
  }

  const switchboard: EmailSwitchboard = {
    marketing: marketingEmailsEnabled(),
    weeklyDigest: weeklyDigestEnabled(),
    relaunch: relaunchEmailsEnabled(),
    resendKey: Boolean(process.env.RESEND_API_KEY),
    postalAddress: postalAddress(),
    webhookSecret: webhookSecretConfigured(),
    baseCap: lifecycleBaseCap(),
    resendDailyLimit: resendDailyLimit(),
    limits: dryRun?.limits ?? null,
  };

  return (
    <EmailPreviewPanel
      previews={previews}
      dryRun={dryRun}
      dryRunError={dryRunError}
      sendingEnabled={switchboard.marketing}
      switchboard={switchboard}
    />
  );
}
