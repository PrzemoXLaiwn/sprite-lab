import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST - Reset quality data (clear problems, patterns, or all)
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { mode } = body; // "problems" | "patterns" | "all"

    const results: Record<string, number> = {};

    if (mode === "problems" || mode === "all") {
      // Delete all image analyses
      const deletedAnalyses = await prisma.imageAnalysis.deleteMany({});
      results.deletedAnalyses = deletedAnalyses.count;

      // Delete all analysis jobs
      const deletedJobs = await prisma.analysisJob.deleteMany({});
      results.deletedJobs = deletedJobs.count;
    }

    if (mode === "patterns" || mode === "all") {
      // Delete all hallucination patterns
      const deletedPatterns = await prisma.hallucinationPattern.deleteMany({});
      results.deletedPatterns = deletedPatterns.count;

      // Delete all optimized prompts
      const deletedOptimized = await prisma.optimizedPrompt.deleteMany({});
      results.deletedOptimized = deletedOptimized.count;
    }

    console.log(`[Quality Reset] Admin ${user.email} cleared data (mode: ${mode}):`, results);

    return NextResponse.json({
      success: true,
      mode,
      results,
      message: `Successfully cleared quality data (${mode})`,
    });
  } catch (error) {
    console.error("Quality Reset API error:", error);
    return NextResponse.json(
      { error: "Failed to reset quality data" },
      { status: 500 }
    );
  }
}
