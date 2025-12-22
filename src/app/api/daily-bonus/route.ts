import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// DAILY LOGIN BONUS SYSTEM
// ===========================================
// Rewards users for logging in daily
// Streak bonuses encourage consistent engagement

// Bonus structure
const DAILY_BONUS = {
  base: 1, // 1 credit for logging in
  streak3: 2, // +2 extra at 3-day streak (total 3)
  streak7: 5, // +5 extra at 7-day streak (total 6)
  streak14: 10, // +10 extra at 14-day streak (total 11)
  streak30: 20, // +20 extra at 30-day streak (total 21)
};

function calculateBonus(streak: number): { credits: number; milestone: string | null } {
  let credits = DAILY_BONUS.base;
  let milestone: string | null = null;

  if (streak === 30 || streak % 30 === 0) {
    credits += DAILY_BONUS.streak30;
    milestone = "30-day streak!";
  } else if (streak === 14 || streak % 14 === 0) {
    credits += DAILY_BONUS.streak14;
    milestone = "14-day streak!";
  } else if (streak === 7 || streak % 7 === 0) {
    credits += DAILY_BONUS.streak7;
    milestone = "7-day streak!";
  } else if (streak === 3) {
    credits += DAILY_BONUS.streak3;
    milestone = "3-day streak!";
  }

  return { credits, milestone };
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function isYesterday(date: Date, today: Date): boolean {
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(date, yesterday);
}

// GET - Check daily bonus status
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        loginStreak: true,
        lastLoginBonusAt: true,
        totalBonusCredits: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const lastBonus = dbUser.lastLoginBonusAt;
    const alreadyClaimedToday = lastBonus && isSameDay(lastBonus, today);
    const streakActive = lastBonus && (isSameDay(lastBonus, today) || isYesterday(lastBonus, today));

    // Calculate what bonus they'd get
    const nextStreak = streakActive ? dbUser.loginStreak + (alreadyClaimedToday ? 0 : 1) : 1;
    const { credits: nextBonus, milestone: nextMilestone } = calculateBonus(nextStreak);

    return NextResponse.json({
      currentStreak: dbUser.loginStreak,
      totalBonusCredits: dbUser.totalBonusCredits,
      canClaim: !alreadyClaimedToday,
      lastClaimedAt: dbUser.lastLoginBonusAt,
      nextBonus: alreadyClaimedToday ? null : {
        credits: nextBonus,
        newStreak: nextStreak,
        milestone: nextMilestone,
      },
      streakWillReset: !streakActive && dbUser.loginStreak > 0,
      bonusStructure: {
        daily: DAILY_BONUS.base,
        streak3: DAILY_BONUS.streak3,
        streak7: DAILY_BONUS.streak7,
        streak14: DAILY_BONUS.streak14,
        streak30: DAILY_BONUS.streak30,
      },
    });
  } catch (error) {
    console.error("Daily bonus GET error:", error);
    return NextResponse.json({ error: "Failed to get bonus status" }, { status: 500 });
  }
}

// POST - Claim daily bonus
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        loginStreak: true,
        lastLoginBonusAt: true,
        credits: true,
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const today = new Date();
    const lastBonus = dbUser.lastLoginBonusAt;

    // Check if already claimed today
    if (lastBonus && isSameDay(lastBonus, today)) {
      return NextResponse.json({
        error: "Already claimed today",
        alreadyClaimed: true,
        nextClaimAt: new Date(today.setDate(today.getDate() + 1)).setHours(0, 0, 0, 0),
      }, { status: 400 });
    }

    // Calculate new streak
    let newStreak: number;
    if (lastBonus && isYesterday(lastBonus, today)) {
      // Continuing streak
      newStreak = dbUser.loginStreak + 1;
    } else {
      // Starting new streak (or first time)
      newStreak = 1;
    }

    // Calculate bonus
    const { credits: bonusCredits, milestone } = calculateBonus(newStreak);

    // Update user and create transaction
    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          credits: { increment: bonusCredits },
          loginStreak: newStreak,
          lastLoginBonusAt: today,
          totalBonusCredits: { increment: bonusCredits },
        },
        select: { credits: true, loginStreak: true },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: bonusCredits,
          type: "BONUS",
          description: milestone
            ? `Daily login bonus (${milestone})`
            : `Daily login bonus (Day ${newStreak})`,
        },
      }),
      prisma.notification.create({
        data: {
          userId: user.id,
          type: "DAILY_BONUS",
          title: milestone ? `${milestone} +${bonusCredits} credits!` : "Daily Bonus!",
          message: milestone
            ? `Amazing! You've logged in ${newStreak} days in a row! Here's ${bonusCredits} bonus credits!`
            : `Welcome back! Here's your daily ${bonusCredits} credit${bonusCredits > 1 ? "s" : ""}.`,
          data: JSON.stringify({ credits: bonusCredits, streak: newStreak, milestone }),
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      creditsAwarded: bonusCredits,
      newStreak,
      totalCredits: updatedUser.credits,
      milestone,
      message: milestone
        ? `${milestone} You earned ${bonusCredits} credits!`
        : `Daily bonus claimed! +${bonusCredits} credit${bonusCredits > 1 ? "s" : ""}`,
      nextMilestone: getNextMilestone(newStreak),
    });
  } catch (error) {
    console.error("Daily bonus POST error:", error);
    return NextResponse.json({ error: "Failed to claim bonus" }, { status: 500 });
  }
}

function getNextMilestone(currentStreak: number): { days: number; bonus: number } | null {
  if (currentStreak < 3) return { days: 3, bonus: DAILY_BONUS.streak3 };
  if (currentStreak < 7) return { days: 7, bonus: DAILY_BONUS.streak7 };
  if (currentStreak < 14) return { days: 14, bonus: DAILY_BONUS.streak14 };
  if (currentStreak < 30) return { days: 30, bonus: DAILY_BONUS.streak30 };
  // After 30, next milestone is 60, 90, etc.
  const next30 = Math.ceil((currentStreak + 1) / 30) * 30;
  return { days: next30, bonus: DAILY_BONUS.streak30 };
}
