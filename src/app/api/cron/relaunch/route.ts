import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { runRelaunchBatch, countRelaunchRemaining } from "@/lib/email/relaunch-campaign";
import { relaunchActive } from "@/config/relaunch";

// Daily batch of "SpriteLab is back" emails (vercel.json cron).
// Off until RELAUNCH_EMAILS_ENABLED=true is set in Vercel — nothing is sent by
// just deploying. RELAUNCH_DAILY_CAP (default 90) keeps us under Resend's
// free-plan limit of 100 emails/day; raise it on a paid Resend plan.

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (process.env.RELAUNCH_EMAILS_ENABLED !== "true") {
    return NextResponse.json({ success: true, skipped: "RELAUNCH_EMAILS_ENABLED is not true" });
  }
  if (!relaunchActive()) {
    return NextResponse.json({ success: true, skipped: "campaign not active" });
  }

  const cap = Math.min(Math.max(Number(process.env.RELAUNCH_DAILY_CAP) || 90, 1), 400);
  const result = await runRelaunchBatch({ limit: cap });
  const remaining = await countRelaunchRemaining();
  console.log("[CRON:Relaunch]", { ...result, remaining });
  return NextResponse.json({ success: true, ...result, remaining });
}
