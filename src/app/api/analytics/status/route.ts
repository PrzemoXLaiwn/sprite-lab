import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Publiczny status systemu analitycznego (bez autoryzacji)
export async function GET() {
  try {
    // Pobierz statystyki z bazy
    const [
      pendingJobs,
      completedJobs,
      failedJobs,
      totalAnalyses,
      hallucinationsFound,
      optimizedPrompts,
      recentAnalyses,
    ] = await Promise.all([
      prisma.analysisJob.count({ where: { status: "pending" } }),
      prisma.analysisJob.count({ where: { status: "completed" } }),
      prisma.analysisJob.count({ where: { status: "failed" } }),
      prisma.imageAnalysis.count(),
      prisma.imageAnalysis.count({ where: { hasHallucination: true } }),
      prisma.optimizedPrompt.count({ where: { isActive: true } }),
      prisma.imageAnalysis.findMany({
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          qualityScore: true,
          promptAlignment: true,
          hasHallucination: true,
          hallucinationType: true,
          createdAt: true,
        },
      }),
    ]);

    // Średnie metryki
    const avgMetrics = await prisma.imageAnalysis.aggregate({
      _avg: {
        qualityScore: true,
        promptAlignment: true,
        styleAccuracy: true,
      },
    });

    return NextResponse.json({
      status: "active",
      timestamp: new Date().toISOString(),
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
      jobs: {
        pending: pendingJobs,
        completed: completedJobs,
        failed: failedJobs,
        total: pendingJobs + completedJobs + failedJobs,
      },
      analysis: {
        total: totalAnalyses,
        hallucinationsFound,
        hallucinationRate: totalAnalyses > 0
          ? ((hallucinationsFound / totalAnalyses) * 100).toFixed(1) + "%"
          : "0%",
      },
      learning: {
        optimizedPrompts,
      },
      averageScores: {
        quality: avgMetrics._avg.qualityScore?.toFixed(1) || "N/A",
        promptAlignment: avgMetrics._avg.promptAlignment?.toFixed(1) || "N/A",
        styleAccuracy: avgMetrics._avg.styleAccuracy?.toFixed(1) || "N/A",
      },
      recentAnalyses: recentAnalyses.map((a) => ({
        id: a.id,
        quality: a.qualityScore,
        alignment: a.promptAlignment,
        hallucination: a.hasHallucination ? a.hallucinationType : null,
        date: a.createdAt,
      })),
    });
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
}
