import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CheckStatus = "OK" | "MISSING" | "PARTIAL" | "ERROR";
type Check = { status: CheckStatus; detail?: string; missing?: string[] };

function envGroup(name: string, vars: string[]): Check {
  const missing = vars.filter((v) => !process.env[v]);
  if (missing.length === 0) return { status: "OK" };
  if (missing.length === vars.length) return { status: "MISSING", detail: `${name} not configured`, missing };
  return { status: "PARTIAL", detail: `${name} partially configured`, missing };
}

export async function GET() {
  const checks: Record<string, Check> = {};

  // ── Core platform env (hard requirements) ─────────────────────────────────
  const coreEnv = [
    "DATABASE_URL",
    "DIRECT_URL",
    "RUNWARE_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];
  for (const envVar of coreEnv) {
    checks[envVar] = process.env[envVar]
      ? { status: "OK" }
      : { status: "MISSING", detail: `${envVar} is required` };
  }

  // ── Database reachability ─────────────────────────────────────────────────
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "OK" };
  } catch (error) {
    checks.database = {
      status: "ERROR",
      detail: error instanceof Error ? error.message : String(error),
    };
  }

  // ── Image hosting (R2 → Supabase) ────────────────────────────────────────
  // Without at least one of these, every successful generation fails to
  // save and the user sees broken images. Upgraded from PARTIAL to MISSING
  // so the endpoint actually returns 503.
  const r2 = envGroup("R2 storage", [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
    "R2_PUBLIC_URL",
  ]);
  checks.r2_storage = r2;

  // ── Stripe (subscription + credit packs + lifetime) ───────────────────────
  // A single missing price ID = "Plan is not properly configured" 500 at
  // checkout-create time. Surface this here so the owner can spot it
  // before users do.
  checks.stripe_secrets = envGroup("Stripe secrets", [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  ]);
  checks.stripe_subscriptions = envGroup("Stripe subscription price IDs", [
    "STRIPE_STARTER_PRICE_ID",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_UNLIMITED_PRICE_ID",
  ]);
  checks.stripe_credit_packs = envGroup("Stripe credit-pack price IDs", [
    "STRIPE_CREDITS_25_PRICE_ID",
    "STRIPE_CREDITS_75_PRICE_ID",
    "STRIPE_CREDITS_200_PRICE_ID",
    "STRIPE_CREDITS_500_PRICE_ID",
  ]);

  // ── Anthropic (translation + prompt enhancement) ──────────────────────────
  // Missing this means non-English prompts produce garbage and now return
  // TRANSLATION_UNAVAILABLE. Mark as PARTIAL because the platform still
  // works for English-only users, but flag it.
  checks.anthropic = process.env.ANTHROPIC_API_KEY
    ? { status: "OK" }
    : { status: "PARTIAL", detail: "ANTHROPIC_API_KEY missing — non-English prompts will be refused" };

  // ── Upstash (rate limiting) ───────────────────────────────────────────────
  checks.rate_limiting = envGroup("Upstash rate limiter", [
    "UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN",
  ]);

  // ── Replicate (guest TryItNow + 3D) ───────────────────────────────────────
  checks.replicate = process.env.REPLICATE_API_TOKEN
    ? { status: "OK" }
    : { status: "PARTIAL", detail: "REPLICATE_API_TOKEN missing — guest TryItNow and 3D generation disabled" };

  // ── Resend (transactional email) ──────────────────────────────────────────
  checks.email = process.env.RESEND_API_KEY
    ? { status: "OK" }
    : { status: "PARTIAL", detail: "RESEND_API_KEY missing — welcome and notification emails will not send" };

  // ── Aggregate ─────────────────────────────────────────────────────────────
  // A missing PARTIAL service degrades but does not break the platform.
  // A MISSING or ERROR check returns 503 so monitoring tools alert.
  const statuses = Object.values(checks).map((c) => c.status);
  const hasFailure = statuses.includes("MISSING") || statuses.includes("ERROR");
  const hasDegraded = statuses.includes("PARTIAL");
  const overall = hasFailure ? "unhealthy" : hasDegraded ? "degraded" : "healthy";

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: hasFailure ? 503 : 200 }
  );
}
