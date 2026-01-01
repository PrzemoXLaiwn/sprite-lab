import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {};

  // Check environment variables
  const requiredEnvVars = [
    "DATABASE_URL",
    "DIRECT_URL",
    "RUNWARE_API_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ];

  for (const envVar of requiredEnvVars) {
    checks[envVar] = {
      status: process.env[envVar] ? "OK" : "MISSING",
    };
  }

  // Check database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: "OK" };
  } catch (error) {
    checks.database = {
      status: "ERROR",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check R2 config
  const r2Vars = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL"];
  const r2Configured = r2Vars.every((v) => !!process.env[v]);
  checks.r2_storage = { status: r2Configured ? "OK" : "PARTIAL" };

  const allOk = Object.values(checks).every((c) => c.status === "OK");

  return NextResponse.json(
    {
      status: allOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allOk ? 200 : 503 }
  );
}
