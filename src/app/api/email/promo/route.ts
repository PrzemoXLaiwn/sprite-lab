import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendPromoEmail } from "@/lib/email/send";

// Admin endpoint to send promotional emails
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

    if (adminUser?.role !== "ADMIN") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const {
      // Target audience
      targetAudience = "all", // "all", "free", "paid", "inactive"
      inactiveDays = 14, // For "inactive" audience

      // Promo details
      promoCode,
      discountPercent = 20,
      creditsAmount = 100,
      expiresIn = "48 hours",
      promoTitle = "Special Offer!",
      promoMessage = "Get more credits at a special price!",

      // Options
      limit = 100,
      dryRun = false
    } = body;

    // Build query based on target audience
    let whereClause: any = {
      // Only users who allow marketing emails
      OR: [
        { emailPreferences: { equals: null } },
        {
          emailPreferences: {
            path: ["marketing"],
            not: false
          }
        }
      ]
    };

    if (targetAudience === "free") {
      whereClause.plan = "FREE";
    } else if (targetAudience === "paid") {
      whereClause.plan = { not: "FREE" };
    } else if (targetAudience === "inactive") {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      whereClause.lastActiveAt = { lt: cutoffDate };
    }

    // Find target users
    const targetUsers = await prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        email: true,
        name: true,
        plan: true,
        lastActiveAt: true
      },
      take: limit,
    });

    if (dryRun) {
      return NextResponse.json({
        dryRun: true,
        usersFound: targetUsers.length,
        promoDetails: {
          promoCode,
          discountPercent,
          creditsAmount,
          expiresIn,
          promoTitle,
          promoMessage
        },
        users: targetUsers.map(u => ({
          email: u.email,
          name: u.name,
          plan: u.plan,
          lastActive: u.lastActiveAt
        }))
      });
    }

    // Validate required promo fields
    if (!promoTitle || !promoMessage) {
      return NextResponse.json(
        { error: "promoTitle and promoMessage are required" },
        { status: 400 }
      );
    }

    // Send emails
    const results = {
      sent: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const dbUser of targetUsers) {
      const result = await sendPromoEmail(
        dbUser.email,
        dbUser.name || undefined,
        {
          promoCode,
          discountPercent,
          creditsAmount,
          expiresIn,
          promoTitle,
          promoMessage
        }
      );

      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        results.errors.push(`${dbUser.email}: ${result.error}`);
      }

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Log the campaign
    console.log(`[Promo Campaign] ${promoTitle}: ${results.sent} sent, ${results.failed} failed`);

    return NextResponse.json({
      success: true,
      campaign: promoTitle,
      ...results
    });
  } catch (error) {
    console.error("[API] Promo email error:", error);
    return NextResponse.json(
      { error: "Failed to send promotional emails" },
      { status: 500 }
    );
  }
}
