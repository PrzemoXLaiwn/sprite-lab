import { redirect } from "next/navigation";
import { checkAdminAccess } from "../page.actions";
import { EmailPreviewPanel, type EmailPreview } from "@/components/admin/EmailPreviewPanel";
import { renderLifecycleHtml } from "@/lib/email/lifecycle/content";
import { lifecycleDeps, marketingEmailsEnabled } from "@/lib/email/lifecycle/deps";
import { DEFAULT_DAILY_CAP, runLifecycle, type LifecycleDeps, type LifecycleRunResult } from "@/lib/email/lifecycle/run";
import { sampleLifecycleMessages } from "@/lib/email/lifecycle/samples";

// Admin-only: every lifecycle template rendered with sample data, plus the
// dry-run counts for today. Read-only — the deps below refuse to write.

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
    const dailyCap = Math.min(Math.max(Number(process.env.LIFECYCLE_DAILY_CAP) || DEFAULT_DAILY_CAP, 1), 1000);
    dryRun = await runLifecycle({ dryRun: true, dryRunReason: "admin preview", dailyCap }, readOnlyDeps);
  } catch (err) {
    dryRunError = err instanceof Error ? err.message : "Unknown error";
  }

  return <EmailPreviewPanel previews={previews} dryRun={dryRun} dryRunError={dryRunError} sendingEnabled={marketingEmailsEnabled()} />;
}
