import { NextRequest, NextResponse } from "next/server";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";
import { stripe, PLANS, CREDIT_PACKS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { sendAbandonedCartEmail } from "@/lib/email/send";
import { Prisma } from "@prisma/client";

// Abandoned Cart Email API
// Can be called manually or via cron job
// Sends emails to users who started checkout but didn't complete

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
  if (PLANS.UNLIMITED.priceId && priceId === PLANS.UNLIMITED.priceId) {
    return { name: PLANS.UNLIMITED.name, credits: `${PLANS.UNLIMITED.credits} credits/month`, price: `£${PLANS.UNLIMITED.price}` };
  }
  // One-time credit packs — derived from CREDIT_PACKS so names/prices match checkout
  for (const pack of Object.values(CREDIT_PACKS)) {
    if (pack.priceId && priceId === pack.priceId) {
      return {
        name: `${pack.name} Pack`,
        credits: `${pack.credits + pack.bonus} credits`,
        price: `£${(pack.price / 100).toFixed(2)}`,
      };
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    if (!isAuthorizedCronRequest(request)) {
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

    console.log("[Email:AbandonedCart] Starting abandoned cart email job...");
    const startTime = Date.now();

    const results = {
      sent: 0,
      failed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    // Get incomplete/expired checkout sessions from last 24-48 hours
    // We wait at least 1 hour before sending (give them time to complete)
    const hourAgo = Math.floor(Date.now() / 1000) - 60 * 60;
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 48 * 60 * 60;

    const checkoutSessions = await stripe.checkout.sessions.list({
      limit: 100,
      created: {
        gte: twoDaysAgo,
        lte: hourAgo,
      },
    });

    // Filter for incomplete sessions with customer email
    const incompleteSessions = checkoutSessions.data.filter(
      (session) =>
        session.status === "expired" &&
        session.customer_email &&
        session.line_items
    );

    console.log(
      `[Email:AbandonedCart] Found ${incompleteSessions.length} incomplete checkout sessions`
    );

    // Track which emails we've already processed to avoid duplicates
    const processedEmails = new Set<string>();

    // Check which users have already received abandoned cart email recently (7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    for (const session of incompleteSessions) {
      const email = session.customer_email;
      if (!email || processedEmails.has(email)) {
        results.skipped++;
        continue;
      }

      processedEmails.add(email);

      // Get line items for this session
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
        limit: 1,
      });

      const priceId = lineItems.data[0]?.price?.id;
      if (!priceId) {
        results.skipped++;
        continue;
      }

      const planInfo = getPlanFromPriceId(priceId);
      if (!planInfo) {
        results.skipped++;
        continue;
      }

      // Check if user exists and has email preferences
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          emailPreferences: true,
        },
      });

      // Check if user opted out of marketing emails
      const prefs = user?.emailPreferences as { marketing?: boolean; lastAbandonedCartAt?: string } | null;
      if (prefs?.marketing === false) {
        results.skipped++;
        continue;
      }

      // Check if we already sent abandoned cart email recently
      if (prefs?.lastAbandonedCartAt && new Date(prefs.lastAbandonedCartAt) > sevenDaysAgo) {
        results.skipped++;
        continue;
      }

      // Check email log to prevent duplicate sends
      const recentEmail = await prisma.emailLog.findFirst({
        where: {
          email,
          type: "ABANDONED_CART",
          createdAt: { gt: sevenDaysAgo },
        },
      });

      if (recentEmail) {
        results.skipped++;
        continue;
      }

      // Send the email
      const result = await sendAbandonedCartEmail(
        email,
        user?.name || undefined,
        {
          planName: planInfo.name,
          planPrice: planInfo.price,
          planCredits: planInfo.credits,
          checkoutUrl: "https://sprite-lab.com/pricing",
        },
        user?.id
      );

      if (result.success) {
        results.sent++;

        // Update user's email preferences if user exists
        if (user) {
          const currentPrefs = (user.emailPreferences as Record<string, unknown>) || {};
          await prisma.user.update({
            where: { id: user.id },
            data: {
              emailPreferences: {
                ...currentPrefs,
                lastAbandonedCartAt: new Date().toISOString(),
              },
            },
          });
        }
      } else {
        results.failed++;
        results.errors.push(`${email.replace(/^(.).*@/, "$1***@")}: ${result.error}`);
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[Email:AbandonedCart] Completed in ${duration}s`, results);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      duration: `${duration}s`,
      results,
    });
  } catch (error) {
    console.error("[Email:AbandonedCart] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
