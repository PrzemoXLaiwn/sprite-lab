import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { lifecycleDeps, marketingEmailsEnabled } from "@/lib/email/lifecycle/deps";
import { lifecycleBaseCap, resendDailyLimit } from "@/lib/email/lifecycle/limits";
import { runLifecycle } from "@/lib/email/lifecycle/run";

// Daily lifecycle emails (vercel.json cron). Picks at most ONE email per user
// per day (see src/lib/email/lifecycle/rules.ts).
//
// Sends NOTHING unless MARKETING_EMAILS_ENABLED=true AND RESEND_API_KEY is set
// AND the request isn't ?dryRun=1. Otherwise it's a dry run: it returns who
// would get what and touches neither Resend nor email_preferences.
// LIFECYCLE_DAILY_CAP (default 20) is the warm-up starting cap: x2 from day 3
// and x4 from day 7 after the first live send. RESEND_DAILY_LIMIT (default
// 100) caps the whole day across every sender, read from email_logs.

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

  try {
    const result = await runLifecycle(
      { dryRun: Boolean(dryRunReason), dryRunReason, dailyCap: lifecycleBaseCap(), providerLimit: resendDailyLimit() },
      lifecycleDeps
    );
    console.log("[CRON:Lifecycle]", { ...result, sample: undefined, errors: result.errors.slice(0, 5) });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("[CRON:Lifecycle] Error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, { status: 500 });
  }
}
