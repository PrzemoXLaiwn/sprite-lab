import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendReEngagementEmail, sendAbandonedCartEmail, sendSpecialOfferEmail } from "@/lib/email/send";
import { stripe, PLANS } from "@/lib/stripe";
import { Prisma } from "@prisma/client";

// Vercel Cron Job - Automated email campaigns
// Runs daily at 10:00 AM UTC
// Schedule in vercel.json: "0 10 * * *"

export const maxDuration = 300; // Max 5 minutes
export const dynamic = "force-dynamic";

// Map Stripe price IDs to plan info
function getPlanFromPriceId(priceId: string): { name: string; credits: string; price: string } | null {
  if (priceId === process.env.STRIPE_STARTER_PRICE_ID) {
    return { name: PLANS.STARTER.name, credits: `${PLANS.STARTER.credits} credits/month`, price: `£${PLANS.STARTER.price}` };
  }
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) {
    return { name: PLANS.PRO.name, credits: `${PLANS.PRO.credits} credits/month`, price: `£${PLANS.PRO.price}` };
  }
  if (priceId === process.env.STRIPE_UNLIMITED_PRICE_ID) {
    return { name: PLANS.UNLIMITED.name, credits: `${PLANS.UNLIMITED.credits} credits/month`, price: `£${PLANS.UNLIMITED.price}` };
  }
  if (priceId === process.env.STRIPE_CREDITS_25_PRICE_ID) {
    return { name: "Spark Pack", credits: "30 credits", price: "£0.99" };
  }
  if (priceId === process.env.STRIPE_CREDITS_75_PRICE_ID) {
    return { name: "Blaze Pack", credits: "90 credits", price: "£2.99" };
  }
  if (priceId === process.env.STRIPE_CREDITS_200_PRICE_ID) {
    return { name: "Inferno Pack", credits: "250 credits", price: "£6.99" };
  }
  if (priceId === process.env.STRIPE_CREDITS_500_PRICE_ID) {
    return { name: "Supernova Pack", credits: "650 credits", price: "£19.99" };
  }
  return null;
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
      abandonedCart: { sent: 0, failed: 0, skipped: 0, errors: [] as string[] },
      specialOffer: { sent: 0, failed: 0, skipped: 0, errors: [] as string[] },
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

    // ========================================
    // 2. ABANDONED CART EMAILS
    // Users who started checkout but didn't complete
    // ========================================
    console.log("[CRON:Email] Processing abandoned cart emails...");

    try {
      const hourAgo = Math.floor(Date.now() / 1000) - 60 * 60;
      const twoDaysAgo = Math.floor(Date.now() / 1000) - 48 * 60 * 60;
      const sevenDaysAgoCart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      const checkoutSessions = await stripe.checkout.sessions.list({
        limit: 50,
        created: { gte: twoDaysAgo, lte: hourAgo },
      });

      const incompleteSessions = checkoutSessions.data.filter(
        (s) => s.status === "expired" && s.customer_email
      );

      const processedEmails = new Set<string>();

      for (const session of incompleteSessions) {
        const email = session.customer_email;
        if (!email || processedEmails.has(email)) {
          results.abandonedCart.skipped++;
          continue;
        }
        processedEmails.add(email);

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
        const priceId = lineItems.data[0]?.price?.id;
        if (!priceId) { results.abandonedCart.skipped++; continue; }

        const planInfo = getPlanFromPriceId(priceId);
        if (!planInfo) { results.abandonedCart.skipped++; continue; }

        const user = await prisma.user.findUnique({
          where: { email },
          select: { id: true, name: true, emailPreferences: true },
        });

        const prefs = user?.emailPreferences as { marketing?: boolean; lastAbandonedCartAt?: string } | null;
        if (prefs?.marketing === false) { results.abandonedCart.skipped++; continue; }
        if (prefs?.lastAbandonedCartAt && new Date(prefs.lastAbandonedCartAt) > sevenDaysAgoCart) {
          results.abandonedCart.skipped++;
          continue;
        }

        const recentEmail = await prisma.emailLog.findFirst({
          where: { email, type: "ABANDONED_CART", createdAt: { gt: sevenDaysAgoCart } },
        });
        if (recentEmail) { results.abandonedCart.skipped++; continue; }

        const result = await sendAbandonedCartEmail(
          email, user?.name || undefined,
          { planName: planInfo.name, planPrice: planInfo.price, planCredits: planInfo.credits },
          user?.id
        );

        if (result.success) {
          results.abandonedCart.sent++;
          if (user) {
            const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
            await prisma.user.update({
              where: { id: user.id },
              data: { emailPreferences: { ...currentPrefs, lastAbandonedCartAt: new Date().toISOString() } },
            });
          }
        } else {
          results.abandonedCart.failed++;
          results.abandonedCart.errors.push(`${email}: ${result.error}`);
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (cartError) {
      console.error("[CRON:Email] Abandoned cart error:", cartError);
      results.abandonedCart.errors.push(cartError instanceof Error ? cartError.message : "Unknown error");
    }

    // ========================================
    // 3. SPECIAL OFFER EMAILS
    // Users with 0 credits who haven't been active
    // ========================================
    console.log("[CRON:Email] Processing special offer emails...");

    const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const sevenDaysAgoOffer = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const zeroCreditsUsers = await prisma.user.findMany({
      where: {
        credits: 0,
        createdAt: { lt: sevenDaysAgoOffer },
        lastActiveAt: { not: null },
        plan: "FREE",
        OR: [
          { emailPreferences: { equals: Prisma.AnyNull } },
          { emailPreferences: { path: ["marketing"], not: false } },
        ],
      },
      select: { id: true, email: true, name: true, lastActiveAt: true, emailPreferences: true },
      take: 30,
    });

    const filteredOfferUsers = zeroCreditsUsers.filter((u) => {
      const prefs = u.emailPreferences as { lastSpecialOfferAt?: string } | null;
      if (!prefs?.lastSpecialOfferAt) return true;
      return new Date(prefs.lastSpecialOfferAt) < fourteenDaysAgo;
    });

    for (const user of filteredOfferUsers) {
      const recentEmail = await prisma.emailLog.findFirst({
        where: { email: user.email, type: "SPECIAL_OFFER", createdAt: { gt: fourteenDaysAgo } },
      });
      if (recentEmail) { results.specialOffer.skipped++; continue; }

      const daysSinceActive = user.lastActiveAt
        ? Math.floor((Date.now() - user.lastActiveAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      let offerTitle: string, offerDescription: string;
      let discountPercent: number | undefined, promoCode: string | undefined;

      if (daysSinceActive > 30) {
        offerTitle = "We miss your creativity!";
        offerDescription = `It's been ${daysSinceActive} days since you created something amazing. Come back and see what's new!`;
        discountPercent = 20;
        promoCode = "COMEBACK20";
      } else if (daysSinceActive > 14) {
        offerTitle = "Your next creation awaits!";
        offerDescription = "You used all your free credits - we've added new art styles and improved quality since your last visit.";
        discountPercent = 15;
        promoCode = "WELCOME15";
      } else {
        offerTitle = "Ready to create more?";
        offerDescription = "You've used all your free credits. SpriteLab is a one-person indie project - every purchase supports development!";
      }

      const result = await sendSpecialOfferEmail(
        user.email, user.name || undefined,
        { offerTitle, offerDescription, discountPercent, promoCode, expiresIn: "7 days" },
        user.id
      );

      if (result.success) {
        results.specialOffer.sent++;
        const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
        await prisma.user.update({
          where: { id: user.id },
          data: { emailPreferences: { ...currentPrefs, lastSpecialOfferAt: new Date().toISOString() } },
        });
      } else {
        results.specialOffer.failed++;
        results.specialOffer.errors.push(`${user.email}: ${result.error}`);
      }
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
