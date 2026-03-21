import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { processPendingJobs } from "@/lib/analytics/image-analyzer";
import { runAutoLearning, updateHallucinationPrevention } from "@/lib/analytics/auto-learner";

export const maxDuration = 300; // 5 minutes max
export const dynamic = "force-dynamic";

// POST - Manually trigger batch processing (processes up to 50 at once)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const batchSize = Math.min(body.batchSize || 25, 50); // Max 50 per call
    const runLearning = body.runLearning ?? false;

    console.log(`[ManualProcess] Processing ${batchSize} jobs...`);
    const startTime = Date.now();

    // Process pending jobs
    const processed = await processPendingJobs(batchSize);

    // Optionally run learning
    let learningResult = null;
    let hallucinationFixes = 0;
    if (runLearning) {
      hallucinationFixes = await updateHallucinationPrevention();
      learningResult = await runAutoLearning();
    }

    // Get updated stats
    const [pending, completed, failed, totalAnalyzed] = await Promise.all([
      prisma.analysisJob.count({ where: { status: "pending" } }),
      prisma.analysisJob.count({ where: { status: "completed" } }),
      prisma.analysisJob.count({ where: { status: "failed" } }),
      prisma.imageAnalysis.count(),
    ]);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      processed,
      duration: `${duration}s`,
      queue: { pending, completed, failed },
      totalAnalyzed,
      learning: learningResult ? {
        updated: learningResult.updated,
        skipped: learningResult.skipped,
        hallucinationFixes,
      } : null,
      estimatedTimeRemaining: pending > 0 ? `${Math.ceil(pending / batchSize)} more calls needed (${pending} remaining)` : "All done!",
    });
  } catch (error) {
    console.error("[ManualProcess] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed",
    }, { status: 500 });
  }
}
