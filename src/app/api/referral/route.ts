import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

// ===========================================
// REFERRAL SYSTEM API
// ===========================================
// - GET: Get user's referral code and stats
// - POST: Apply referral code during signup

const REFERRAL_REWARD = 10; // Credits for referrer when referee makes first purchase

// Generate a unique, readable referral code
function generateReferralCode(): string {
  return nanoid(8).toUpperCase(); // e.g., "AB12CD34"
}

// GET - Get current user's referral code and stats
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        referralCode: true,
        referralCount: true,
        referralEarnings: true,
        referredBy: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate referral code if user doesn't have one
    if (!dbUser.referralCode) {
      let code = generateReferralCode();

      // Make sure code is unique
      let attempts = 0;
      while (attempts < 5) {
        const existing = await prisma.user.findUnique({
          where: { referralCode: code },
        });
        if (!existing) break;
        code = generateReferralCode();
        attempts++;
      }

      dbUser = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: code },
        select: {
          referralCode: true,
          referralCount: true,
          referralEarnings: true,
          referredBy: true,
        },
      });
    }

    // Get list of referred users (with their purchase status)
    const referredUsers = await prisma.user.findMany({
      where: { referredBy: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
        totalSpent: true,
        referralRewardClaimed: true,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    // Use NEXT_PUBLIC_APP_URL or fallback to production domain
    // Link goes to landing page - user will see the app first, then register
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://www.sprite-lab.com";
    const referralLink = `${baseUrl}?ref=${dbUser.referralCode}`;

    return NextResponse.json({
      referralCode: dbUser.referralCode,
      referralLink,
      stats: {
        totalReferred: dbUser.referralCount,
        totalEarnings: dbUser.referralEarnings,
        pendingRewards: referredUsers.filter(u => u.totalSpent === 0 && !u.referralRewardClaimed).length,
        completedRewards: referredUsers.filter(u => u.referralRewardClaimed).length,
      },
      referredUsers: referredUsers.map(u => ({
        id: u.id,
        email: u.email ? `${u.email.slice(0, 3)}...${u.email.slice(-10)}` : "Anonymous",
        name: u.name,
        joinedAt: u.createdAt,
        hasPurchased: u.totalSpent > 0,
        rewardClaimed: u.referralRewardClaimed,
      })),
      rewardAmount: REFERRAL_REWARD,
      message: `Share your link! You get ${REFERRAL_REWARD} credits when your friend makes their first purchase.`,
    });
  } catch (error) {
    console.error("Referral GET error:", error);
    return NextResponse.json({ error: "Failed to get referral info" }, { status: 500 });
  }
}

// POST - Apply referral code to current user (during/after signup)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { referredBy: true, createdAt: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has a referrer
    if (currentUser.referredBy) {
      return NextResponse.json({
        error: "You already have a referral code applied",
        alreadyReferred: true
      }, { status: 400 });
    }

    // Check if account is too old (only allow referral within 7 days of signup)
    const daysSinceSignup = (Date.now() - currentUser.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceSignup > 7) {
      return NextResponse.json({
        error: "Referral codes can only be applied within 7 days of signup",
        tooLate: true
      }, { status: 400 });
    }

    // Find referrer by code
    const referrer = await prisma.user.findUnique({
      where: { referralCode: referralCode.toUpperCase() },
      select: { id: true, email: true, name: true },
    });

    if (!referrer) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }

    // Can't refer yourself
    if (referrer.id === user.id) {
      return NextResponse.json({ error: "You cannot use your own referral code" }, { status: 400 });
    }

    // Apply referral
    await prisma.$transaction([
      // Update current user with referrer
      prisma.user.update({
        where: { id: user.id },
        data: { referredBy: referrer.id },
      }),
      // Increment referrer's count
      prisma.user.update({
        where: { id: referrer.id },
        data: { referralCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Referral code applied! Your friend will receive ${REFERRAL_REWARD} credits when you make your first purchase.`,
      referrerName: referrer.name || "A friend",
    });
  } catch (error) {
    console.error("Referral POST error:", error);
    return NextResponse.json({ error: "Failed to apply referral code" }, { status: 500 });
  }
}
