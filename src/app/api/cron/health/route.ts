import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { prisma } from "@/lib/prisma";
import { getR2ObjectBuffer, uploadBufferToR2 } from "@/lib/r2";
import { resend, EMAIL_FROM } from "@/lib/email/resend";
import { HEALTHY, homeLooksHealthy, nextHealthState, type AlertKind, type HealthState } from "@/lib/health/alerts";

// Uptime check every 5 minutes (vercel.json cron):
//   home     — https://www.sprite-lab.com/ answers 200 with an <h1> (what Google sees)
//   database — SELECT 1 through Prisma
//   auth     — Supabase Auth health endpoint
// The database and auth checks also keep the Supabase project from being
// paused for inactivity (that outage cost 9 days of search traffic in
// Sept/Oct 2026). A failing check is retried once before it counts.
// Alerts go to ALERT_EMAIL (falls back to the support inbox): on the first
// failure, every 6 hours while it lasts, and once on recovery.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = "https://www.sprite-lab.com/";
const STATE_KEY = "ops/health-state.json";
const ALERT_TO = process.env.ALERT_EMAIL || "spritelab.contact@gmail.com";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms))]);
}

const CHECKS: Record<string, () => Promise<void>> = {
  async home() {
    const res = await withTimeout(fetch(SITE, { cache: "no-store", headers: { "user-agent": "SpriteLab-HealthCheck/1.0" } }), 15_000);
    const html = await res.text();
    if (!homeLooksHealthy(res.status, html)) throw new Error(`status ${res.status}, ${/<h1[\s>]/i.test(html) ? "has" : "no"} <h1>`);
  },
  async database() {
    await withTimeout(prisma.$queryRaw`SELECT 1`, 10_000);
  },
  async auth() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error("Supabase env missing");
    const res = await withTimeout(fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: "no-store" }), 10_000);
    if (!res.ok) throw new Error(`status ${res.status}`);
  },
};

async function runCheck(run: () => Promise<void>): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await run();
      return null;
    } catch (error) {
      if (attempt === 1) return error instanceof Error ? error.message : String(error);
      await new Promise((r) => setTimeout(r, 5_000));
    }
  }
  return null;
}

async function readState(): Promise<HealthState> {
  try {
    const buf = await getR2ObjectBuffer(STATE_KEY);
    return buf ? { ...HEALTHY, ...(JSON.parse(buf.toString("utf8")) as Partial<HealthState>) } : HEALTHY;
  } catch {
    return HEALTHY;
  }
}

async function sendAlert(kind: Exclude<AlertKind, null>, state: HealthState, errors: Record<string, string>) {
  if (!resend) {
    console.error("[CRON:Health] RESEND_API_KEY missing, alert not sent:", kind, errors);
    return;
  }
  const subject =
    kind === "recovered" ? "SpriteLab is back up"
    : kind === "still-down" ? `SpriteLab still down: ${state.failing.join(", ")}`
    : `SpriteLab down: ${state.failing.join(", ")}`;
  const lines =
    kind === "recovered"
      ? ["All checks pass again: home page, database and auth."]
      : [
          `Failing since ${state.since} (UTC).`,
          "",
          ...Object.entries(errors).map(([name, msg]) => `${name}: ${msg}`),
          "",
          "If the database or auth is failing, check that the Supabase project isn't paused (supabase.com/dashboard).",
          "Public pages are static, so visitors and Google keep getting them; sign-in and generation need the database.",
        ];
  await resend.emails.send({ from: EMAIL_FROM, to: ALERT_TO, subject, text: lines.join("\n") });
}

export async function GET(request: NextRequest) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const names = Object.keys(CHECKS);
  const results = await Promise.all(names.map((n) => runCheck(CHECKS[n])));
  const errors: Record<string, string> = {};
  names.forEach((n, i) => { if (results[i]) errors[n] = results[i]!; });
  const failing = Object.keys(errors);

  const prev = await readState();
  const next = nextHealthState(prev, failing, new Date());
  const { alert } = next;
  let state = next.state;
  if (alert) {
    try {
      await sendAlert(alert, state, errors);
    } catch (error) {
      console.error("[CRON:Health] alert email failed:", error);
      // Not sent: try again on the next run
      state = { ...state, lastAlertAt: prev.lastAlertAt };
    }
  }
  if (JSON.stringify(state) !== JSON.stringify(prev)) {
    await uploadBufferToR2(Buffer.from(JSON.stringify(state)), STATE_KEY, "application/json");
  }

  if (failing.length) console.error("[CRON:Health] failing:", errors);
  return NextResponse.json({ ok: failing.length === 0, failing: errors, alert });
}
