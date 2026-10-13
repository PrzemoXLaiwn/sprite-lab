import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { lifecycleDeps, marketingEmailsEnabled } from "@/lib/email/lifecycle/deps";
import { DEFAULT_DAILY_CAP, runLifecycle } from "@/lib/email/lifecycle/run";

// Daily lifecycle emails (vercel.json cron). Picks at most ONE email per user
// per day (see src/lib/email/lifecycle/rules.ts).
//
// Sends NOTHING unless MARKETING_EMAILS_ENABLED=true AND RESEND_API_KEY is set
// AND the request isn't ?dryRun=1. Otherwise it's a dry run: it returns who
// would get what and touches neither Resend nor email_preferences.
// LIFECYCLE_DAILY_CAP (default 80) limits sends per run.

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const q = request.nextUrl.searchParams.get("dryRun");
  const dryRunReason = !marketingEmailsEnabled()
    ? "MARKETING_EMAILS_ENABLED is not true"
    : !process.env.RESEND_API_KEY
      ? "RESEND_API_KEY not configured"
      : q === "1" || q === "true"
        ? "dryRun=1"
        : undefined;
  const dailyCap = Math.min(Math.max(Number(process.env.LIFECYCLE_DAILY_CAP) || DEFAULT_DAILY_CAP, 1), 1000);

  try {
    const result = await runLifecycle({ dryRun: Boolean(dryRunReason), dryRunReason, dailyCap }, lifecycleDeps);
    console.log("[CRON:Lifecycle]", { ...result, sample: undefined, errors: result.errors.slice(0, 5) });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON:Lifecycle] Error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
