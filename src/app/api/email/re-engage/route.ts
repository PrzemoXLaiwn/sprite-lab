import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendReEngagementEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Admin endpoint to send re-engagement emails to inactive users
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "OWNER") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      inactiveDays = 7,  // Default: users inactive for 7+ days
      minCredits = 1,     // Only users with credits left
      limit = 50,         // Max emails per batch
      dryRun = false      // Set to true to preview without sending
    } = body;

    // Find inactive users
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);

    const inactiveUsers = await prisma.user.findMany({
      where: {
        credits: { gte: minCredits },
        // Users who are inactive OR never had lastActiveAt set
        OR: [
          { lastActiveAt: { lt: cutoffDate } },
          { lastActiveAt: null },
        ],
        // Also exclude users who opted out of marketing
        AND: [
          {
            OR: [
              { emailPreferences: { equals: Prisma.AnyNull } },
              {
                emailPreferences: {
                  path: ["marketing"],
                  not: false
                }
              }
            ],
          }
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
      take: limit,
    });

    // Filter out users who received re-engagement email recently
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eligibleUsers = inactiveUsers.filter(u => {
      const prefs = u.emailPreferences as { lastReEngagementAt?: string } | null;
      if (!prefs?.lastReEngagementAt) return true;
      return new Date(prefs.lastReEngagementAt) < sevenDaysAgo;
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        usersFound: eligibleUsers.length,
        users: eligibleUsers.map(u => ({
          email: u.email,
          name: u.name,
          credits: u.credits,
          lastActive: u.lastActiveAt,
          daysSinceActive: Math.floor(
            (Date.now() - (u.lastActiveAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
          )
        }))
      });
    }

    // Send emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const dbUser of eligibleUsers) {
      const daysSince = Math.floor(
        (Date.now() - (dbUser.lastActiveAt?.getTime() || 0)) / (1000 * 60 * 60 * 24)
      );

      // Get last asset type from a separate query
      const lastGeneration = await prisma.generation.findFirst({
        where: { userId: dbUser.id },
        orderBy: { createdAt: "desc" },
        select: { categoryId: true }
      });

      const result = await sendReEngagementEmail(
        dbUser.email,
        dbUser.name || undefined,
        dbUser.credits,
        daysSince,
        lastGeneration?.categoryId,
        dbUser.id
      );

      if (result.success) {
        results.sent++;

        // Update user's last re-engagement email timestamp
        const currentPrefs = (dbUser.emailPreferences as Record<string, unknown>) || {};
        await prisma.user.update({
          where: { id: dbUser.id },
          data: {
            emailPreferences: {
              ...currentPrefs,
              lastReEngagementAt: new Date().toISOString()
            }
          }
        });
      } else {
        results.failed++;
        results.errors.push(`${dbUser.email}: ${result.error}`);
      }
    }

    return NextResponse.json({
      success: true,
      ...results
    });
  } catch (error) {
    console.error("[API] Re-engagement email error:", error);
    return NextResponse.json(
      { error: "Failed to send re-engagement emails" },
      { status: 500 }
    );
  }
}
