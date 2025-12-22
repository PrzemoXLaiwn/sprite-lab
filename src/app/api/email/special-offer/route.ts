import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendSpecialOfferEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Special Offer Email API
// Sends emails to users who have 0 credits and haven't been active
// Reminds them the site exists and offers special deals

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    const isVercelCron = request.headers.get("x-vercel-cron") === "true";

    const isAuthorized =
      isVercelCron || (cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isAuthorized && process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Resend is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "RESEND_API_KEY not configured",
      });
    }

    console.log("[Email:SpecialOffer] Starting special offer email job...");
    const startTime = Date.now();

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Find users who:
    // 1. Have 0 credits
    // 2. Have been active at some point (lastActiveAt is set)
    // 3. Haven't received special offer email in last 14 days
    // 4. Signed up at least 7 days ago (give them time to use free credits)

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const eligibleUsers = await prisma.user.findMany({
      where: {
        credits: 0,
        // Signed up at least 7 days ago
        createdAt: { lt: sevenDaysAgo },
        // Has been active before
        lastActiveAt: { not: null },
        // Not on a paid plan
        plan: "FREE",
        // Email marketing not disabled
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
        lastActiveAt: true,
        createdAt: true,
        emailPreferences: true,
      },
      take: 50, // Max 50 per run
    });

    console.log(
      `[Email:SpecialOffer] Found ${eligibleUsers.length} users with 0 credits`
    );

    // Filter out users who received special offer email recently
    const filteredUsers = eligibleUsers.filter((user) => {
      const prefs = user.emailPreferences as { lastSpecialOfferAt?: string } | null;
      if (!prefs?.lastSpecialOfferAt) return true;
      return new Date(prefs.lastSpecialOfferAt) < fourteenDaysAgo;
    });

    console.log(
      `[Email:SpecialOffer] ${filteredUsers.length} users eligible after filtering`
    );

    // Determine the offer based on user activity
    for (const user of filteredUsers) {
      // Check email log to prevent duplicate sends
      const recentEmail = await prisma.emailLog.findFirst({
        where: {
          email: user.email,
          type: "SPECIAL_OFFER",
          createdAt: { gt: fourteenDaysAgo },
        },
      });

      if (recentEmail) {
        results.skipped++;
        continue;
      }

      // Calculate days since signup and last activity
      const daysSinceSignup = Math.floor(
        (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const daysSinceActive = user.lastActiveAt
        ? Math.floor(
            (Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24)
          )
        : 999;

      // Personalize message based on activity
      let offerTitle: string;
      let offerDescription: string;
      let discountPercent: number | undefined;
      let promoCode: string | undefined;

      if (daysSinceActive > 30) {
        // Long inactive users - bigger incentive
        offerTitle = "We miss your creativity!";
        offerDescription = `It's been ${daysSinceActive} days since you created something amazing. SpriteLab keeps improving with new features and better AI. Come back and see what's new!`;
        discountPercent = 20;
        promoCode = "COMEBACK20";
      } else if (daysSinceActive > 14) {
        // Medium inactive
        offerTitle = "Your next creation awaits!";
        offerDescription = "You used all your free credits - that means you loved what you saw! We've added new art styles and improved generation quality since your last visit.";
        discountPercent = 15;
        promoCode = "WELCOME15";
      } else {
        // Recently ran out of credits
        offerTitle = "Ready to create more?";
        offerDescription = "You've used all your free credits creating awesome assets. SpriteLab is a one-person indie project - every purchase directly supports development of new features!";
      }

      const result = await sendSpecialOfferEmail(
        user.email,
        user.name || undefined,
        {
          offerTitle,
          offerDescription,
          discountPercent,
          promoCode,
          expiresIn: "7 days",
        },
        user.id
      );

      if (result.success) {
        results.sent++;

        // Update user's email preferences
        const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
        await prisma.user.update({
          where: { id: user.id },
          data: {
            emailPreferences: {
              ...currentPrefs,
              lastSpecialOfferAt: new Date().toISOString(),
            },
          },
        });
      } else {
        results.failed++;
        results.errors.push(`${user.email}: ${result.error}`);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Email:SpecialOffer] Completed in ${duration}s`, results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    console.error("[Email:SpecialOffer] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
