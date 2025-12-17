import { prisma } from "@/lib/prisma";

/**
 * Prompt Learning System
 * Automatically learns from user feedback to improve prompt quality
 */

// Analyze and suggest prompt improvements based on feedback
export async function analyzePromptPerformance() {
  // Get all prompt analytics with enough data
  const analytics = await prisma.promptAnalytics.findMany({
    where: {
      totalGenerations: { gte: 10 }, // Need at least 10 generations
    },
    orderBy: { avgRating: "desc" },
  });

  const improvements: PromptInsight[] = [];

  // Group by category/subcategory/style
  const grouped = new Map<string, typeof analytics>();

  for (const item of analytics) {
    const key = `${item.categoryId}:${item.subcategoryId}:${item.styleId}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(item);
  }

  // Find patterns that work vs don't work
  for (const [key, items] of grouped) {
    if (items.length < 2) continue;

    const [categoryId, subcategoryId, styleId] = key.split(":");
    const bestPerformers = items.filter((i) => i.avgRating >= 4);
    const worstPerformers = items.filter((i) => i.avgRating <= 2);

    if (bestPerformers.length > 0 && worstPerformers.length > 0) {
      // Extract keywords that appear in best but not worst
      const bestKeywords = new Set(
        bestPerformers.flatMap((p) => p.promptPattern.split(" "))
      );
      const worstKeywords = new Set(
        worstPerformers.flatMap((p) => p.promptPattern.split(" "))
      );

      const goodKeywords = [...bestKeywords].filter(
        (k) => !worstKeywords.has(k) && k.length > 3
      );
      const badKeywords = [...worstKeywords].filter(
        (k) => !bestKeywords.has(k) && k.length > 3
      );

      if (goodKeywords.length > 0 || badKeywords.length > 0) {
        improvements.push({
          categoryId,
          subcategoryId,
          styleId,
          insight: {
            goodKeywords,
            badKeywords,
            bestRating: Math.max(...bestPerformers.map((p) => p.avgRating)),
            worstRating: Math.min(...worstPerformers.map((p) => p.avgRating)),
            sampleSize: items.reduce((sum, i) => sum + i.totalGenerations, 0),
          },
        });
      }
    }
  }

  return improvements;
}

// Get the best prompt variant for a category/style combination
export async function getBestPromptVariant(
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<string | null> {
  const best = await prisma.promptAnalytics.findFirst({
    where: {
      categoryId,
      subcategoryId,
      styleId,
      totalGenerations: { gte: 5 },
      avgRating: { gte: 4 },
    },
    orderBy: [{ avgRating: "desc" }, { totalGenerations: "desc" }],
  });

  return best?.bestPromptVariant || null;
}

// Store learned improvement
export async function storePromptImprovement(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  originalKeywords: string,
  improvedPrompt: string,
  source: "auto" | "manual" | "a/b_test" = "auto"
) {
  return prisma.promptImprovement.upsert({
    where: {
      categoryId_subcategoryId_styleId_originalKeywords: {
        categoryId,
        subcategoryId,
        styleId,
        originalKeywords,
      },
    },
    update: {
      improvedPrompt,
      source,
    },
    create: {
      categoryId,
      subcategoryId,
      styleId,
      originalKeywords,
      improvedPrompt,
      source,
    },
  });
}

// Get suggested prompt improvement
export async function getSuggestedImprovement(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  userPrompt: string
): Promise<string | null> {
  // Normalize user prompt to keywords
  const keywords = userPrompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .join(" ");

  // Look for existing improvement
  const improvement = await prisma.promptImprovement.findFirst({
    where: {
      categoryId,
      subcategoryId,
      styleId,
      originalKeywords: keywords,
      isActive: true,
      successRate: { gte: 0.6 }, // Only suggest if 60%+ success rate
    },
  });

  if (improvement) {
    // Track usage
    await prisma.promptImprovement.update({
      where: { id: improvement.id },
      data: { usageCount: { increment: 1 } },
    });
    return improvement.improvedPrompt;
  }

  return null;
}

// Update daily stats
export async function updateDailyStats() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's stats
  const [
    totalGenerations,
    uniqueUsersResult,
    newUsers,
    creditsUsed,
    categoryBreakdown,
    styleBreakdown,
    avgRatingResult,
  ] = await Promise.all([
    prisma.generation.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.generation.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.user.count({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
    }),
    prisma.creditTransaction.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
        type: "GENERATION",
      },
      _sum: { amount: true },
    }),
    prisma.generation.groupBy({
      by: ["categoryId"],
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
      _count: { categoryId: true },
    }),
    prisma.generation.groupBy({
      by: ["styleId"],
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
      _count: { styleId: true },
    }),
    prisma.generationFeedback.aggregate({
      where: {
        createdAt: { gte: today, lt: tomorrow },
      },
      _avg: { rating: true },
    }),
  ]);

  // Find top category and style
  const topCategory = categoryBreakdown.sort(
    (a, b) => b._count.categoryId - a._count.categoryId
  )[0];
  const topStyle = styleBreakdown.sort(
    (a, b) => b._count.styleId - a._count.styleId
  )[0];

  // Upsert daily stats
  await prisma.dailyStats.upsert({
    where: { date: today },
    update: {
      totalGenerations,
      uniqueUsers: uniqueUsersResult.length,
      newUsers,
      totalCreditsUsed: Math.abs(creditsUsed._sum.amount || 0),
      avgRating: avgRatingResult._avg.rating,
      topCategory: topCategory?.categoryId,
      topStyle: topStyle?.styleId,
      categoryBreakdown: JSON.stringify(
        Object.fromEntries(
          categoryBreakdown.map((c) => [c.categoryId, c._count.categoryId])
        )
      ),
      styleBreakdown: JSON.stringify(
        Object.fromEntries(
          styleBreakdown.map((s) => [s.styleId, s._count.styleId])
        )
      ),
    },
    create: {
      date: today,
      totalGenerations,
      uniqueUsers: uniqueUsersResult.length,
      newUsers,
      totalCreditsUsed: Math.abs(creditsUsed._sum.amount || 0),
      avgRating: avgRatingResult._avg.rating,
      topCategory: topCategory?.categoryId,
      topStyle: topStyle?.styleId,
      categoryBreakdown: JSON.stringify(
        Object.fromEntries(
          categoryBreakdown.map((c) => [c.categoryId, c._count.categoryId])
        )
      ),
      styleBreakdown: JSON.stringify(
        Object.fromEntries(
          styleBreakdown.map((s) => [s.styleId, s._count.styleId])
        )
      ),
    },
  });
}

// Types
interface PromptInsight {
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  insight: {
    goodKeywords: string[];
    badKeywords: string[];
    bestRating: number;
    worstRating: number;
    sampleSize: number;
  };
}

// Export report of learned insights
export async function generateLearningReport(): Promise<LearningReport> {
  const insights = await analyzePromptPerformance();

  const improvements = await prisma.promptImprovement.findMany({
    where: { isActive: true },
    orderBy: { successRate: "desc" },
    take: 50,
  });

  const analytics = await prisma.promptAnalytics.findMany({
    orderBy: { totalGenerations: "desc" },
    take: 100,
  });

  return {
    totalPatterns: analytics.length,
    activeImprovements: improvements.length,
    insights,
    topImprovements: improvements.slice(0, 10).map((i) => ({
      category: i.categoryId,
      subcategory: i.subcategoryId,
      style: i.styleId,
      original: i.originalKeywords,
      improved: i.improvedPrompt,
      successRate: i.successRate,
      usageCount: i.usageCount,
    })),
    recommendations: generateRecommendations(insights),
  };
}

function generateRecommendations(insights: PromptInsight[]): string[] {
  const recommendations: string[] = [];

  for (const insight of insights.slice(0, 5)) {
    if (insight.insight.goodKeywords.length > 0) {
      recommendations.push(
        `For ${insight.categoryId}/${insight.subcategoryId} with ${insight.styleId} style: ` +
          `Consider using keywords: ${insight.insight.goodKeywords.join(", ")}`
      );
    }
    if (insight.insight.badKeywords.length > 0) {
      recommendations.push(
        `For ${insight.categoryId}/${insight.subcategoryId} with ${insight.styleId} style: ` +
          `Avoid keywords: ${insight.insight.badKeywords.join(", ")}`
      );
    }
  }

  return recommendations;
}

interface LearningReport {
  totalPatterns: number;
  activeImprovements: number;
  insights: PromptInsight[];
  topImprovements: Array<{
    category: string;
    subcategory: string;
    style: string;
    original: string;
    improved: string;
    successRate: number;
    usageCount: number;
  }>;
  recommendations: string[];
}
