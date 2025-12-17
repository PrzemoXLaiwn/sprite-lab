import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateLearningReport, updateDailyStats } from "@/lib/analytics/prompt-learning";

// GET - Get learning report (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const report = await generateLearningReport();

    return NextResponse.json(report);
  } catch (error) {
    console.error("Learning report error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 }
    );
  }
}

// POST - Trigger daily stats update (can be called by cron)
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret or admin
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    let isAuthorized = false;

    // Check cron secret
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    } else {
      // Check if admin user
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { role: true },
        });
        if (dbUser && ["ADMIN", "OWNER"].includes(dbUser.role)) {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await updateDailyStats();

    return NextResponse.json({ success: true, message: "Daily stats updated" });
  } catch (error) {
    console.error("Update stats error:", error);
    return NextResponse.json(
      { error: "Failed to update stats" },
      { status: 500 }
    );
  }
}
