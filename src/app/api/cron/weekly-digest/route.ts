import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWeeklyDigestEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Vercel Cron Job - Weekly digest emails
// Runs every Sunday at 10:00 AM UTC
// Schedule in vercel.json: "0 10 * * 0"

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

// Get community stats for the week
async function getCommunityStats() {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalAssetsThisWeek, popularCategory, topCreators] = await Promise.all([
    // Total assets created this week
    prisma.generation.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),

    // Most popular category this week
    prisma.generation
      .groupBy({
        by: ["categoryId"],
        where: { createdAt: { gte: oneWeekAgo } },
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 1,
      })
      .then((result) => {
        if (result.length === 0) return null;
        const categoryNames: Record<string, string> = {
          character: "Characters",
          enemy: "Enemies",
          item: "Items",
          environment: "Environments",
          ui: "UI Elements",
          effect: "Effects",
          vehicle: "Vehicles",
          weapon: "Weapons",
        };
        return {
          name: categoryNames[result[0].categoryId] || result[0].categoryId,
          count: result[0]._count.categoryId,
        };
      }),

    // Top creators this week (by generation count)
    prisma.generation
      .groupBy({
        by: ["userId"],
        where: { createdAt: { gte: oneWeekAgo } },
        _count: { userId: true },
        orderBy: { _count: { userId: "desc" } },
        take: 5,
      })
      .then(async (result) => {
        const userIds = result.map((r) => r.userId);
        const users = await prisma.user.findMany({
          where: { id: { in: userIds }, isProfilePublic: true },
          select: { id: true, name: true, username: true },
        });

        return result
          .map((r) => {
            const user = users.find((u) => u.id === r.userId);
            if (!user) return null;
            return {
              name: user.name || user.username || "Anonymous",
              count: r._count.userId,
            };
          })
          .filter(Boolean)
          .slice(0, 3) as { name: string; count: number }[];
      }),
  ]);

  return {
    totalAssetsThisWeek,
    popularPrompt: popularCategory
      ? `${popularCategory.name} (${popularCategory.count} created)`
      : "Characters",
    topCreators,
  };
}

// Get user stats for the week
async function getUserWeeklyStats(userId: string) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [assetsCreated, topCategory, topStyle] = await Promise.all([
    // Assets created this week
    prisma.generation.count({
      where: {
        userId,
        createdAt: { gte: oneWeekAgo },
      },
    }),

    // Top category
    prisma.generation
      .groupBy({
        by: ["categoryId"],
        where: { userId, createdAt: { gte: oneWeekAgo } },
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 1,
      })
      .then((result) => {
        if (result.length === 0) return null;
        const categoryNames: Record<string, string> = {
          character: "Characters",
          enemy: "Enemies",
          item: "Items",
          environment: "Environments",
          ui: "UI Elements",
          effect: "Effects",
          vehicle: "Vehicles",
          weapon: "Weapons",
        };
        return categoryNames[result[0].categoryId] || result[0].categoryId;
      }),

    // Top style
    prisma.generation
      .groupBy({
        by: ["styleId"],
        where: { userId, createdAt: { gte: oneWeekAgo } },
        _count: { styleId: true },
        orderBy: { _count: { styleId: "desc" } },
        take: 1,
      })
      .then((result) => {
        if (result.length === 0) return null;
        const styleNames: Record<string, string> = {
          "pixel-16": "16-bit Pixel",
          "pixel-32": "32-bit Pixel",
          "hd-render": "HD Render",
          "vector-flat": "Vector Flat",
          "hand-drawn": "Hand Drawn",
        };
        return styleNames[result[0].styleId] || result[0].styleId;
      }),
  ]);

  return {
    assetsCreated,
    topCategory,
    topStyle,
  };
}

export async function GET(request: NextRequest) {
  try {
    // Verify Vercel Cron or CRON_SECRET
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    const isAuthorized =
      isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized && process.env.NODE_ENV === "production") {
      console.log("[CRON:WeeklyDigest] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log("[CRON:WeeklyDigest] RESEND_API_KEY not configured, skipping");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "RESEND_API_KEY not configured",
      });
    }

    console.log("[CRON:WeeklyDigest] Starting weekly digest job...");
    const startTime = Date.now();

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get community stats
    const communityStats = await getCommunityStats();

    // Find users who should receive weekly digest
    // Users who opted in OR active users who haven't opted out
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const eligibleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        // Must have at least one generation (engaged user)
        generations: {
          some: {},
        },
        // Check email preferences
        OR: [
          // Users who explicitly opted in
          {
            emailPreferences: {
              path: ["weeklyDigest"],
              equals: true,
            },
          },
          // Active users who haven't set preferences (default to send)
          {
            AND: [
              {
                lastActiveAt: {
                  gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // Active in last 60 days
                },
              },
              {
                OR: [
                  { emailPreferences: { equals: Prisma.AnyNull } },
                  {
                    emailPreferences: {
                      path: ["weeklyDigest"],
                      equals: Prisma.AnyNull,
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        credits: true,
        emailPreferences: true,
      },
      take: 200, // Max 200 per run
    });

    console.log(`[CRON:WeeklyDigest] Found ${eligibleUsers.length} eligible users`);

    // Filter users who haven't received a weekly digest recently
    const usersToEmail = eligibleUsers.filter((user) => {
      const prefs = user.emailPreferences as {
        lastWeeklyDigestAt?: string;
        marketing?: boolean;
      } | null;

      // Skip if marketing is explicitly disabled
      if (prefs?.marketing === false) return false;

      // Skip if already sent this week
      if (prefs?.lastWeeklyDigestAt) {
        const lastSent = new Date(prefs.lastWeeklyDigestAt);
        if (lastSent > oneWeekAgo) return false;
      }

      return true;
    });

    console.log(`[CRON:WeeklyDigest] ${usersToEmail.length} users after filtering`);

    for (const user of usersToEmail) {
      try {
        // Get user's weekly stats
        const userStats = await getUserWeeklyStats(user.id);

        // Skip users with no activity this week (they might not care about the digest)
        if (userStats.assetsCreated === 0) {
          results.skipped++;
          continue;
        }

        const result = await sendWeeklyDigestEmail(
          user.email,
          user.name || undefined,
          {
            credits: user.credits,
            weeklyStats: {
              assetsCreated: userStats.assetsCreated,
              topCategory: userStats.topCategory || undefined,
              topStyle: userStats.topStyle || undefined,
            },
            communityStats: {
              totalAssetsThisWeek: communityStats.totalAssetsThisWeek,
              popularPrompt: communityStats.popularPrompt,
            },
            newFeatures: [],
            topCreators: communityStats.topCreators,
          },
          user.id
        );

        if (result.success) {
          results.sent++;

          // Update last weekly digest timestamp
          const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailPreferences: {
                ...currentPrefs,
                lastWeeklyDigestAt: new Date().toISOString(),
              },
            },
          });
        } else {
          results.failed++;
          results.errors.push(`${user.email}: ${result.error}`);
        }

        // Small delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (userError) {
        results.failed++;
        results.errors.push(
          `${user.email}: ${userError instanceof Error ? userError.message : "Unknown error"}`
        );
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[CRON:WeeklyDigest] Completed in ${duration}s`, results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      communityStats,
      results,
    });
  } catch (error) {
    console.error("[CRON:WeeklyDigest] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
