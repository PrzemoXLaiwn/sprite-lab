import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendDailyReminderEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Vercel Cron Job - Daily reminder emails
// Runs every day at 9:00 AM UTC
// Schedule in vercel.json: "0 9 * * *"

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

// Get trending category based on recent generations
async function getTrendingCategory(): Promise<string> {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const trending = await prisma.generation.groupBy({
    by: ["categoryId"],
    where: {
      createdAt: { gte: oneDayAgo },
    },
    _count: { categoryId: true },
    orderBy: { _count: { categoryId: "desc" } },
    take: 1,
  });

  if (trending.length > 0) {
    // Map category IDs to friendly names
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
    return categoryNames[trending[0].categoryId] || trending[0].categoryId;
  }

  return "Characters";
}

// Calculate login streak (days with generations)
async function calculateStreak(userId: string): Promise<number> {
  const generations = await prisma.generation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
    take: 100,
  });

  if (generations.length === 0) return 0;

  let streak = 0;
  let currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  const uniqueDays = new Set<string>();
  for (const gen of generations) {
    const date = new Date(gen.createdAt);
    date.setHours(0, 0, 0, 0);
    uniqueDays.add(date.toISOString());
  }

  const sortedDays = Array.from(uniqueDays).sort().reverse();

  for (const day of sortedDays) {
    const genDate = new Date(day);
    const diffDays = Math.floor((currentDate.getTime() - genDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 1) {
      streak++;
      currentDate = genDate;
    } else {
      break;
    }
  }

  return streak;
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
      console.log("[CRON:DailyReminder] Unauthorized request");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      console.log("[CRON:DailyReminder] RESEND_API_KEY not configured, skipping");
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "RESEND_API_KEY not configured",
      });
    }

    console.log("[CRON:DailyReminder] Starting daily reminder job...");
    const startTime = Date.now();

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get trending category for today
    const trendingCategory = await getTrendingCategory();

    // Find users who opted in to daily reminders
    // Users with emailPreferences.dailyReminders = true
    // OR users who haven't set preferences yet (null) - we'll send to active users by default
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const eligibleUsers = await prisma.user.findMany({
      where: {
        isActive: true,
        // Must have been active in last 30 days (engaged users only)
        lastActiveAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
        // Must have at least 1 generation (engaged users)
        generations: {
          some: {},
        },
        // Check email preferences
        OR: [
          // Users who explicitly opted in
          {
            emailPreferences: {
              path: ["dailyReminders"],
              equals: true,
            },
          },
          // Users with credits who haven't set preferences (send by default to engaged users)
          {
            AND: [
              { credits: { gte: 1 } },
              {
                OR: [
                  { emailPreferences: { equals: Prisma.AnyNull } },
                  {
                    emailPreferences: {
                      path: ["dailyReminders"],
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
      take: 100, // Max 100 per run
    });

    console.log(`[CRON:DailyReminder] Found ${eligibleUsers.length} eligible users`);

    // Filter users who haven't received a daily reminder today
    const usersToEmail = eligibleUsers.filter((user) => {
      const prefs = user.emailPreferences as { lastDailyReminderAt?: string; marketing?: boolean } | null;

      // Skip if marketing is explicitly disabled
      if (prefs?.marketing === false) return false;

      // Skip if already sent today
      if (prefs?.lastDailyReminderAt) {
        const lastSent = new Date(prefs.lastDailyReminderAt);
        if (lastSent > oneDayAgo) return false;
      }

      return true;
    });

    console.log(`[CRON:DailyReminder] ${usersToEmail.length} users after filtering`);

    for (const user of usersToEmail) {
      try {
        // Calculate user's streak
        const streak = await calculateStreak(user.id);

        const result = await sendDailyReminderEmail(
          user.email,
          user.name || undefined,
          {
            credits: user.credits,
            loginStreak: streak,
            trendingCategory,
          },
          user.id
        );

        if (result.success) {
          results.sent++;

          // Update last daily reminder timestamp
          const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailPreferences: {
                ...currentPrefs,
                lastDailyReminderAt: new Date().toISOString(),
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
    console.log(`[CRON:DailyReminder] Completed in ${duration}s`, results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      trendingCategory,
      results,
    });
  } catch (error) {
    console.error("[CRON:DailyReminder] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
