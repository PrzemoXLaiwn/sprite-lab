import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET - Pobierz szczegółowe dane o jakości generacji
export async function GET(request: NextRequest) {
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

    // 1. Ogólne statystyki
    const [
      totalAnalyses,
      pendingJobs,
      failedJobs,
      avgScores,
      hallucinationCount,
    ] = await Promise.all([
      prisma.imageAnalysis.count(),
      prisma.analysisJob.count({ where: { status: "pending" } }),
      prisma.analysisJob.count({ where: { status: "failed" } }),
      prisma.imageAnalysis.aggregate({
        _avg: {
          qualityScore: true,
          promptAlignment: true,
          styleAccuracy: true,
          confidenceScore: true,
        },
      }),
      prisma.imageAnalysis.count({ where: { hasHallucination: true } }),
    ]);

    // 2. Problemy pogrupowane po kategorii/subcategorii
    let problemsByCategory: Array<{
      categoryId: string;
      subcategoryId: string;
      styleId: string;
      totalAnalyses: bigint;
      avgQuality: number;
      avgAlignment: number;
      hallucinationCount: bigint;
      hallucinationRate: number;
    }> = [];

    if (totalAnalyses > 0) {
      try {
        problemsByCategory = await prisma.$queryRaw`
          SELECT
            g."categoryId",
            g."subcategoryId",
            g."styleId",
            COUNT(ia.id) as "totalAnalyses",
            AVG(ia."qualityScore") as "avgQuality",
            AVG(ia."promptAlignment") as "avgAlignment",
            SUM(CASE WHEN ia."hasHallucination" = true THEN 1 ELSE 0 END) as "hallucinationCount",
            (SUM(CASE WHEN ia."hasHallucination" = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ia.id)::float, 0) * 100) as "hallucinationRate"
          FROM "ImageAnalysis" ia
          JOIN "Generation" g ON ia."generationId" = g.id
          GROUP BY g."categoryId", g."subcategoryId", g."styleId"
          HAVING COUNT(ia.id) >= 1
          ORDER BY "hallucinationRate" DESC, "avgAlignment" ASC
        `;
      } catch (e) {
        console.error("problemsByCategory query failed:", e);
      }
    }

    // 3. Najczęstsze typy halucynacji
    const hallucinationTypes = await prisma.imageAnalysis.groupBy({
      by: ["hallucinationType"],
      where: { hasHallucination: true, hallucinationType: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10,
    });

    // 4. Wzorce halucynacji z sugestiami naprawy
    const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
      orderBy: { occurrenceCount: "desc" },
      take: 20,
    });

    // 5. Ostatnie problematyczne generacje (niski alignment lub halucynacje)
    const recentProblems = await prisma.imageAnalysis.findMany({
      where: {
        OR: [
          { hasHallucination: true },
          { promptAlignment: { lt: 60 } },
          { qualityScore: { lt: 50 } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        generation: {
          select: {
            id: true,
            prompt: true,
            imageUrl: true,
            categoryId: true,
            subcategoryId: true,
            styleId: true,
            createdAt: true,
            user: {
              select: {
                email: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 6. Optymalizowane prompty (nauczony system)
    const optimizedPrompts = await prisma.optimizedPrompt.findMany({
      where: { isActive: true },
      orderBy: { avgQualityScore: "desc" },
      take: 20,
    });

    // 7. Statystyki po dniach (ostatnie 7 dni)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    let dailyStats: Array<{
      date: Date;
      totalAnalyses: bigint;
      avgQuality: number;
      avgAlignment: number;
      hallucinationCount: bigint;
    }> = [];

    if (totalAnalyses > 0) {
      try {
        dailyStats = await prisma.$queryRaw`
          SELECT
            DATE(ia."createdAt") as date,
            COUNT(*) as "totalAnalyses",
            AVG(ia."qualityScore") as "avgQuality",
            AVG(ia."promptAlignment") as "avgAlignment",
            SUM(CASE WHEN ia."hasHallucination" = true THEN 1 ELSE 0 END) as "hallucinationCount"
          FROM "ImageAnalysis" ia
          WHERE ia."createdAt" >= ${sevenDaysAgo}
          GROUP BY DATE(ia."createdAt")
          ORDER BY date DESC
        `;
      } catch (e) {
        console.error("dailyStats query failed:", e);
      }
    }

    // 8. Konkretne rekomendacje naprawy
    const recommendations = generateRecommendations(
      problemsByCategory.map(p => ({
        ...p,
        totalAnalyses: Number(p.totalAnalyses),
        hallucinationCount: Number(p.hallucinationCount),
      })),
      hallucinationPatterns
    );

    return NextResponse.json({
      overview: {
        totalAnalyses,
        pendingJobs,
        failedJobs,
        hallucinationCount,
        hallucinationRate: totalAnalyses > 0
          ? ((hallucinationCount / totalAnalyses) * 100).toFixed(1) + "%"
          : "0%",
        averageScores: {
          quality: avgScores._avg.qualityScore?.toFixed(1) || "N/A",
          alignment: avgScores._avg.promptAlignment?.toFixed(1) || "N/A",
          style: avgScores._avg.styleAccuracy?.toFixed(1) || "N/A",
          confidence: avgScores._avg.confidenceScore?.toFixed(1) || "N/A",
        },
      },
      problemsByCategory: problemsByCategory.map(p => ({
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
        styleId: p.styleId,
        totalAnalyses: Number(p.totalAnalyses),
        avgQuality: Number(p.avgQuality?.toFixed(1) || 0),
        avgAlignment: Number(p.avgAlignment?.toFixed(1) || 0),
        hallucinationCount: Number(p.hallucinationCount),
        hallucinationRate: Number(p.hallucinationRate?.toFixed(1) || 0),
        status: getStatusFromMetrics(Number(p.avgAlignment || 0), Number(p.hallucinationRate || 0)),
      })),
      hallucinationTypes: hallucinationTypes.map(h => ({
        type: h.hallucinationType,
        count: h._count.id,
      })),
      hallucinationPatterns: hallucinationPatterns.map(p => ({
        id: p.id,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
        styleId: p.styleId,
        type: p.hallucinationType,
        triggerKeywords: JSON.parse(p.triggerKeywords || "[]"),
        occurrenceCount: p.occurrenceCount,
        preventionPrompt: p.preventionPrompt,
        isResolved: !p.isActive, // isActive=false means resolved
      })),
      recentProblems: recentProblems.map(p => ({
        id: p.id,
        generationId: p.generationId,
        imageUrl: p.generation.imageUrl,
        prompt: p.generation.prompt,
        categoryId: p.generation.categoryId,
        subcategoryId: p.generation.subcategoryId,
        styleId: p.generation.styleId,
        qualityScore: p.qualityScore,
        promptAlignment: p.promptAlignment,
        hasHallucination: p.hasHallucination,
        hallucinationType: p.hallucinationType,
        suggestedFix: p.suggestedFix,
        missingElements: JSON.parse(p.missingElements || "[]"),
        extraElements: JSON.parse(p.extraElements || "[]"),
        createdAt: p.createdAt,
        user: p.generation.user,
      })),
      optimizedPrompts: optimizedPrompts.map(p => ({
        id: p.id,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
        styleId: p.styleId,
        promptTemplate: p.promptTemplate,
        requiredKeywords: JSON.parse(p.requiredKeywords || "[]"),
        avoidKeywords: JSON.parse(p.avoidKeywords || "[]"),
        avgQualityScore: p.avgQualityScore,
        avgPromptAlignment: p.avgPromptAlignment,
        successCount: p.successCount,
        failureCount: p.failureCount,
        successRate: p.successCount > 0 ? (p.successCount / (p.successCount + p.failureCount) * 100) : 0,
      })),
      dailyStats: dailyStats.map(d => ({
        date: d.date,
        totalAnalyses: Number(d.totalAnalyses),
        avgQuality: Number(d.avgQuality?.toFixed(1) || 0),
        avgAlignment: Number(d.avgAlignment?.toFixed(1) || 0),
        hallucinationCount: Number(d.hallucinationCount),
      })),
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Quality API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quality data" },
      { status: 500 }
    );
  }
}

// Określ status na podstawie metryk
function getStatusFromMetrics(alignment: number, hallucinationRate: number): "good" | "warning" | "critical" {
  if (alignment >= 75 && hallucinationRate < 10) return "good";
  if (alignment >= 50 && hallucinationRate < 30) return "warning";
  return "critical";
}

// Generuj konkretne rekomendacje naprawy
function generateRecommendations(
  problemsByCategory: Array<{
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    totalAnalyses: number;
    avgQuality: number;
    avgAlignment: number;
    hallucinationCount: number;
    hallucinationRate: number;
  }>,
  hallucinationPatterns: Array<{
    categoryId: string;
    subcategoryId: string;
    styleId: string;
    hallucinationType: string;
    triggerKeywords: string;
    occurrenceCount: number;
    preventionPrompt: string | null;
  }>
): Array<{
  priority: "high" | "medium" | "low";
  category: string;
  subcategory: string;
  style: string;
  issue: string;
  recommendation: string;
  affectedGenerations: number;
}> {
  const recommendations: Array<{
    priority: "high" | "medium" | "low";
    category: string;
    subcategory: string;
    style: string;
    issue: string;
    recommendation: string;
    affectedGenerations: number;
  }> = [];

  // Znajdź kategorie z największymi problemami
  const criticalCategories = problemsByCategory
    .filter(p => p.hallucinationRate > 20 || p.avgAlignment < 60)
    .sort((a, b) => b.hallucinationRate - a.hallucinationRate);

  for (const cat of criticalCategories.slice(0, 10)) {
    // Znajdź wzorce halucynacji dla tej kategorii
    const patterns = hallucinationPatterns.filter(
      p => p.categoryId === cat.categoryId &&
           p.subcategoryId === cat.subcategoryId &&
           p.styleId === cat.styleId
    );

    let issue = "";
    let recommendation = "";

    if (cat.hallucinationRate > 30) {
      issue = `Bardzo wysoki współczynnik halucynacji (${cat.hallucinationRate.toFixed(1)}%)`;

      if (patterns.length > 0) {
        const mainPattern = patterns[0];
        const keywords = JSON.parse(mainPattern.triggerKeywords || "[]");
        issue += `. Najczęstszy typ: ${mainPattern.hallucinationType}`;

        if (mainPattern.preventionPrompt) {
          recommendation = mainPattern.preventionPrompt;
        } else {
          recommendation = `Dodaj do prompta: "IMPORTANT: Do not add any extra elements. Only generate exactly what is described." Unikaj słów kluczowych: ${keywords.slice(0, 5).join(", ")}`;
        }
      } else {
        recommendation = "Przejrzyj szablon prompta dla tej kategorii. Dodaj więcej szczegółowych instrukcji co NIE powinno być generowane.";
      }
    } else if (cat.avgAlignment < 50) {
      issue = `Bardzo niski alignment promptów (${cat.avgAlignment.toFixed(1)}%)`;
      recommendation = "Prompt nie opisuje dobrze co użytkownik chce. Dodaj więcej przykładów i słów kluczowych specyficznych dla tej kategorii.";
    } else if (cat.avgAlignment < 70) {
      issue = `Umiarkowane problemy z alignment (${cat.avgAlignment.toFixed(1)}%)`;
      recommendation = "Rozważ dodanie dodatkowych instrukcji stylu i kompozycji do promptów tej kategorii.";
    }

    if (issue && recommendation) {
      recommendations.push({
        priority: cat.hallucinationRate > 30 || cat.avgAlignment < 50 ? "high" :
                  cat.hallucinationRate > 15 || cat.avgAlignment < 65 ? "medium" : "low",
        category: cat.categoryId,
        subcategory: cat.subcategoryId,
        style: cat.styleId,
        issue,
        recommendation,
        affectedGenerations: cat.totalAnalyses,
      });
    }
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}
