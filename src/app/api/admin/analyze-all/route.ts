import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { queueForAnalysis } from "@/lib/analytics/image-analyzer";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

// POST - Queue all unanalyzed generations for analysis
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

    // Find all generations that don't have an analysis yet and don't have a pending job
    const unanalyzed = await prisma.generation.findMany({
      where: {
        AND: [
          { analysis: null },
          { NOT: { id: { in: (await prisma.analysisJob.findMany({ where: { status: { in: ["pending", "processing"] } }, select: { generationId: true } })).map(j => j.generationId) } } },
        ],
      },
      select: { id: true },
    });

    // Queue them all
    let queued = 0;
    for (const gen of unanalyzed) {
      await queueForAnalysis(gen.id, 1); // priority 1 = bulk analysis
      queued++;
    }

    // Get current stats
    const [totalGenerations, totalAnalyzed, pendingJobs, failedJobs] = await Promise.all([
      prisma.generation.count(),
      prisma.imageAnalysis.count(),
      prisma.analysisJob.count({ where: { status: "pending" } }),
      prisma.analysisJob.count({ where: { status: "failed" } }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Queued ${queued} new generations for analysis`,
      stats: {
        totalGenerations,
        alreadyAnalyzed: totalAnalyzed,
        newlyQueued: queued,
        totalPending: pendingJobs,
        failed: failedJobs,
        coverage: totalGenerations > 0 ? `${Math.round((totalAnalyzed / totalGenerations) * 100)}%` : "0%",
      },
    });
  } catch (error) {
    console.error("[AnalyzeAll] Error:", error);
    return NextResponse.json({ error: "Failed to queue analyses" }, { status: 500 });
  }
}

// GET - Full analysis report with prompt improvement recommendations
export async function GET(request: NextRequest) {
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

    // 1. Coverage stats
    const [totalGenerations, totalAnalyzed, pendingJobs] = await Promise.all([
      prisma.generation.count(),
      prisma.imageAnalysis.count(),
      prisma.analysisJob.count({ where: { status: "pending" } }),
    ]);

    // 2. What people generate most (top categories + subcategories)
    const topCombinations = await prisma.generation.groupBy({
      by: ["categoryId", "subcategoryId", "styleId"],
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 30,
    });

    // 3. Quality scores per category
    const qualityByCategory = await prisma.$queryRaw<
      Array<{
        category_id: string;
        subcategory_id: string;
        style_id: string;
        count: bigint;
        avg_quality: number;
        avg_alignment: number;
        avg_style_accuracy: number;
        hallucination_count: bigint;
      }>
    >`
      SELECT
        g.category_id,
        g.subcategory_id,
        g.style_id,
        COUNT(*)::bigint as count,
        ROUND(AVG(ia.quality_score)::numeric, 1) as avg_quality,
        ROUND(AVG(ia.prompt_alignment)::numeric, 1) as avg_alignment,
        ROUND(AVG(ia.style_accuracy)::numeric, 1) as avg_style_accuracy,
        COUNT(CASE WHEN ia.has_hallucination THEN 1 END)::bigint as hallucination_count
      FROM generations g
      JOIN image_analyses ia ON ia.generation_id = g.id
      GROUP BY g.category_id, g.subcategory_id, g.style_id
      HAVING COUNT(*) >= 3
      ORDER BY AVG(ia.prompt_alignment) ASC
      LIMIT 50
    `;

    // 4. Most common hallucination patterns
    const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
      where: { isActive: true },
      orderBy: { occurrenceCount: "desc" },
      take: 30,
    });

    // 5. Worst performing generations (lowest prompt alignment with hallucinations)
    const worstGenerations = await prisma.imageAnalysis.findMany({
      where: {
        hasHallucination: true,
        promptAlignment: { lt: 60 },
      },
      include: {
        generation: {
          select: {
            id: true,
            prompt: true,
            fullPrompt: true,
            categoryId: true,
            subcategoryId: true,
            styleId: true,
            imageUrl: true,
          },
        },
      },
      orderBy: { promptAlignment: "asc" },
      take: 30,
    });

    // 6. Best performing generations (for learning what works)
    const bestGenerations = await prisma.imageAnalysis.findMany({
      where: {
        hasHallucination: false,
        promptAlignment: { gte: 85 },
        qualityScore: { gte: 80 },
      },
      include: {
        generation: {
          select: {
            id: true,
            prompt: true,
            fullPrompt: true,
            categoryId: true,
            subcategoryId: true,
            styleId: true,
          },
        },
      },
      orderBy: { promptAlignment: "desc" },
      take: 20,
    });

    // 7. Current optimized prompts (auto-learned fixes)
    const optimizedPrompts = await prisma.optimizedPrompt.findMany({
      where: { isActive: true },
      orderBy: { version: "desc" },
      take: 30,
    });

    // 8. Build recommendations
    const recommendations = buildRecommendations(
      qualityByCategory,
      hallucinationPatterns,
      worstGenerations,
      bestGenerations,
      topCombinations
    );

    return NextResponse.json({
      coverage: {
        totalGenerations,
        totalAnalyzed,
        pendingJobs,
        percentage: totalGenerations > 0 ? `${Math.round((totalAnalyzed / totalGenerations) * 100)}%` : "0%",
      },
      userDemand: topCombinations.map((c) => ({
        category: c.categoryId,
        subcategory: c.subcategoryId,
        style: c.styleId,
        count: c._count.id,
      })),
      qualityByCategory: qualityByCategory.map((q) => ({
        category: q.category_id,
        subcategory: q.subcategory_id,
        style: q.style_id,
        count: Number(q.count),
        avgQuality: q.avg_quality,
        avgAlignment: q.avg_alignment,
        avgStyleAccuracy: q.avg_style_accuracy,
        hallucinationRate: Number(q.count) > 0 ? `${Math.round((Number(q.hallucination_count) / Number(q.count)) * 100)}%` : "0%",
        status: q.avg_alignment >= 80 ? "GOOD" : q.avg_alignment >= 60 ? "NEEDS_WORK" : "BROKEN",
      })),
      hallucinationPatterns: hallucinationPatterns.map((p) => ({
        category: p.categoryId,
        subcategory: p.subcategoryId,
        style: p.styleId,
        type: p.hallucinationType,
        occurrences: p.occurrenceCount,
        triggerKeywords: safeParseJSON(p.triggerKeywords),
        prevention: p.preventionPrompt,
      })),
      worstGenerations: worstGenerations.map((w) => ({
        id: w.generation?.id,
        prompt: w.generation?.prompt,
        category: w.generation?.categoryId,
        subcategory: w.generation?.subcategoryId,
        style: w.generation?.styleId,
        imageUrl: w.generation?.imageUrl,
        qualityScore: w.qualityScore,
        promptAlignment: w.promptAlignment,
        hallucinationType: w.hallucinationType,
        missingElements: safeParseJSON(w.missingElements),
        extraElements: safeParseJSON(w.extraElements),
        suggestedFix: w.suggestedFix,
      })),
      bestGenerations: bestGenerations.map((b) => ({
        id: b.generation?.id,
        prompt: b.generation?.prompt,
        fullPrompt: b.generation?.fullPrompt?.slice(0, 300),
        category: b.generation?.categoryId,
        subcategory: b.generation?.subcategoryId,
        style: b.generation?.styleId,
        qualityScore: b.qualityScore,
        promptAlignment: b.promptAlignment,
      })),
      autoFixes: optimizedPrompts.map((o) => ({
        category: o.categoryId,
        subcategory: o.subcategoryId,
        style: o.styleId,
        template: o.promptTemplate,
        required: safeParseJSON(o.requiredKeywords),
        avoid: safeParseJSON(o.avoidKeywords),
        version: o.version,
        successRate: o.avgQualityScore,
      })),
      recommendations,
    });
  } catch (error) {
    console.error("[AnalyzeAll] Report error:", error);
    return NextResponse.json({ error: "Failed to generate report" }, { status: 500 });
  }
}

function safeParseJSON(str: string | null | undefined): unknown {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return str; }
}

interface QualityRow {
  category_id: string;
  subcategory_id: string;
  style_id: string;
  count: bigint;
  avg_quality: number;
  avg_alignment: number;
  avg_style_accuracy: number;
  hallucination_count: bigint;
}

function buildRecommendations(
  qualityByCategory: QualityRow[],
  hallucinationPatterns: Array<{ categoryId: string; subcategoryId: string; styleId: string; hallucinationType: string; occurrenceCount: number; preventionPrompt: string | null }>,
  worstGenerations: Array<{ hallucinationType: string | null; suggestedFix: string | null; generation: { categoryId: string; subcategoryId: string; styleId: string; prompt: string } | null }>,
  bestGenerations: Array<{ generation: { categoryId: string; subcategoryId: string; fullPrompt: string | null } | null; promptAlignment: number }>,
  topCombinations: Array<{ categoryId: string; subcategoryId: string; styleId: string; _count: { id: number } }>
): Array<{ priority: string; category: string; subcategory: string; style: string; issue: string; recommendation: string; evidence: string }> {
  const recs: Array<{ priority: string; category: string; subcategory: string; style: string; issue: string; recommendation: string; evidence: string }> = [];

  // HIGH PRIORITY: Combinations with high demand AND low quality
  const demandMap = new Map<string, number>();
  for (const c of topCombinations) {
    demandMap.set(`${c.categoryId}|${c.subcategoryId}|${c.styleId}`, c._count.id);
  }

  for (const q of qualityByCategory) {
    const key = `${q.category_id}|${q.subcategory_id}|${q.style_id}`;
    const demand = demandMap.get(key) || 0;
    const halRate = Number(q.count) > 0 ? Number(q.hallucination_count) / Number(q.count) : 0;

    if (q.avg_alignment < 60 && demand >= 5) {
      recs.push({
        priority: "HIGH",
        category: q.category_id,
        subcategory: q.subcategory_id,
        style: q.style_id,
        issue: `Avg alignment ${q.avg_alignment}% with ${demand} user generations`,
        recommendation: `Rewrite prompt config for ${q.subcategory_id}. Current alignment is critically low.`,
        evidence: `${Number(q.count)} analyzed, ${Math.round(halRate * 100)}% hallucination rate`,
      });
    } else if (halRate > 0.4 && demand >= 3) {
      recs.push({
        priority: "HIGH",
        category: q.category_id,
        subcategory: q.subcategory_id,
        style: q.style_id,
        issue: `${Math.round(halRate * 100)}% hallucination rate with ${demand} user generations`,
        recommendation: `Add stronger negative prompts for ${q.subcategory_id} + ${q.style_id}`,
        evidence: `${Number(q.hallucination_count)}/${Number(q.count)} hallucinated`,
      });
    }
  }

  // MEDIUM: Recurring hallucination patterns (5+ occurrences)
  for (const p of hallucinationPatterns) {
    if (p.occurrenceCount >= 5) {
      recs.push({
        priority: "MEDIUM",
        category: p.categoryId,
        subcategory: p.subcategoryId,
        style: p.styleId,
        issue: `Recurring ${p.hallucinationType} (${p.occurrenceCount}x)`,
        recommendation: p.preventionPrompt
          ? `Auto-fix applied: "${p.preventionPrompt}". Verify it works.`
          : `No auto-fix yet. Manually add prevention to prompt config.`,
        evidence: `${p.occurrenceCount} occurrences detected`,
      });
    }
  }

  // Sort: HIGH first, then by evidence weight
  recs.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority === "HIGH" ? -1 : 1;
    return 0;
  });

  return recs;
}
