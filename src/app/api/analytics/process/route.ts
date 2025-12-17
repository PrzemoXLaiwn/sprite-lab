import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processPendingJobs, getAnalysisStats } from "@/lib/analytics/image-analyzer";
import { runAutoLearning, updateHallucinationPrevention, getLearningStats } from "@/lib/analytics/auto-learner";

/**
 * Background Analysis Processing API
 * Should be called by a cron job every few minutes
 *
 * - Processes pending image analysis jobs
 * - Runs auto-learning when enough data is available
 * - Updates hallucination prevention patterns
 */

// POST - Process pending jobs (cron or admin)
export async function POST(request: NextRequest) {
  try {
    // Verify authorization (cron secret or admin)
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

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action = "process", limit = 5 } = body;

    let result: Record<string, unknown> = {};

    switch (action) {
      case "process":
        // Process pending analysis jobs
        const processed = await processPendingJobs(Math.min(limit, 20));
        result = { action: "process", processed };
        break;

      case "learn":
        // Run auto-learning
        const learningResult = await runAutoLearning();
        result = { action: "learn", ...learningResult };
        break;

      case "fix-hallucinations":
        // Update hallucination prevention
        const fixedCount = await updateHallucinationPrevention();
        result = { action: "fix-hallucinations", fixed: fixedCount };
        break;

      case "full":
        // Run full processing cycle
        const [processedJobs, learning, hallucinationFixes] = await Promise.all([
          processPendingJobs(Math.min(limit, 10)),
          runAutoLearning(),
          updateHallucinationPrevention(),
        ]);
        result = {
          action: "full",
          processed: processedJobs,
          learning,
          hallucinationFixes,
        };
        break;

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("Analysis processing error:", error);
    return NextResponse.json(
      { error: "Processing failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET - Get processing stats
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

    const [analysisStats, learningStats] = await Promise.all([
      getAnalysisStats(),
      getLearningStats(),
    ]);

    return NextResponse.json({
      analysis: analysisStats,
      learning: learningStats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Get stats error:", error);
    return NextResponse.json(
      { error: "Failed to get stats" },
      { status: 500 }
    );
  }
}
