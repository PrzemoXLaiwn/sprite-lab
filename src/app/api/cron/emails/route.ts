import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReEngagementEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Vercel Cron Job - Automated email campaigns
// Runs daily at 10:00 AM UTC
// Schedule in vercel.json: "0 10 * * *"

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron or CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    const isAuthorized =
      isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized && process.env.NODE_ENV === "production") {
      console.log("[CRON:Email] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log("[CRON:Email] RESEND_API_KEY not configured, skipping");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "RESEND_API_KEY not configured",
      });
    }

    console.log("[CRON:Email] Starting automated email job...");
    const startTime = Date.now();

    const results = {
      reEngagement: { sent: 0, failed: 0, errors: [] as string[] },
    };

    // ========================================
    // 1. RE-ENGAGEMENT EMAILS
    // Users inactive for 7+ days with credits left
    // ========================================
    const inactiveDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    // Don't send more than 1 re-engagement email per 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        credits: { gte: 1 },
        // User must have been active at some point AND inactive for X days
        AND: [
          { lastActiveAt: { not: null } },
          { lastActiveAt: { lt: cutoffDate } },
        ],
        // Exclude users who opted out of marketing
        OR: [
          { emailPreferences: { equals: Prisma.AnyNull } },
          {
            emailPreferences: {
              path: ["marketing"],
              not: false,
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        lastActiveAt: true,
        emailPreferences: true,
      },
      take: 50, // Max 50 per run to avoid timeouts
    });

    // Filter users who received re-engagement recently
    const eligibleUsers = inactiveUsers.filter((u) => {
      const prefs = u.emailPreferences as { lastReEngagementAt?: string } | null;
      if (!prefs?.lastReEngagementAt) return true;
      return new Date(prefs.lastReEngagementAt) < sevenDaysAgo;
    });

    console.log(
      `[CRON:Email] Found ${eligibleUsers.length} users for re-engagement (from ${inactiveUsers.length} inactive)`
    );

    for (const user of eligibleUsers) {
      const daysSince = Math.floor(
        (Date.now() - (user.lastActiveAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
      );

      // Get last generation category
      const lastGeneration = await prisma.generation.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        select: { categoryId: true },
      });

      const result = await sendReEngagementEmail(
        user.email,
        user.name || undefined,
        user.credits,
        daysSince,
        lastGeneration?.categoryId,
        user.id
      );

      if (result.success) {
        results.reEngagement.sent++;

        // Update user's last re-engagement timestamp
        const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailPreferences: {
              ...currentPrefs,
              lastReEngagementAt: new Date().toISOString(),
            },
          },
        });
      } else {
        results.reEngagement.failed++;
        results.reEngagement.errors.push(`${user.email}: ${result.error}`);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON:Email] Completed in ${duration}s`, results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    console.error("[CRON:Email] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
