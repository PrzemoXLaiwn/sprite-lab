import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET - Get analytics dashboard data (admin only)
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

    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 7d, 30d, 90d, all

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    switch (period) {
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "90d":
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      case "all":
        startDate = new Date(0);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Fetch all analytics data in parallel
    const [
      totalGenerations,
      totalUsers,
      recentGenerations,
      topCategories,
      topStyles,
      feedbackStats,
      qualityMetrics,
      recentFeedback,
      dailyGenerations,
      promptPerformance,
    ] = await Promise.all([
      // Total generations
      prisma.generation.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Total unique users
      prisma.user.count({
        where: { createdAt: { gte: startDate } },
      }),

      // Recent generations with full details
      prisma.generation.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          user: { select: { email: true, name: true } },
        },
      }),

      // Top categories
      prisma.generation.groupBy({
        by: ["categoryId"],
        where: { createdAt: { gte: startDate } },
        _count: { categoryId: true },
        orderBy: { _count: { categoryId: "desc" } },
        take: 10,
      }),

      // Top styles
      prisma.generation.groupBy({
        by: ["styleId"],
        where: { createdAt: { gte: startDate } },
        _count: { styleId: true },
        orderBy: { _count: { styleId: "desc" } },
        take: 10,
      }),

      // Feedback statistics
      prisma.generationFeedback.groupBy({
        by: ["rating"],
        where: { createdAt: { gte: startDate } },
        _count: { rating: true },
      }),

      // Average rating
      prisma.generationFeedback.aggregate({
        where: { createdAt: { gte: startDate } },
        _avg: { rating: true },
        _count: { id: true },
      }),

      // Recent feedback with details
      prisma.generationFeedback.findMany({
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      // Daily generation counts for chart
      prisma.$queryRaw`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as count
        FROM generations
        WHERE created_at >= ${startDate}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        LIMIT 30
      ` as Promise<Array<{ date: string; count: bigint }>>,

      // Best and worst performing prompts
      prisma.promptAnalytics.findMany({
        where: { totalGenerations: { gte: 5 } },
        orderBy: { avgRating: "desc" },
        take: 20,
      }),
    ]);

    // Process feedback stats
    const positiveCount = feedbackStats
      .filter((f) => f.rating > 0)
      .reduce((sum, f) => sum + f._count.rating, 0);
    const negativeCount = feedbackStats
      .filter((f) => f.rating < 0)
      .reduce((sum, f) => sum + f._count.rating, 0);
    const totalFeedback = positiveCount + negativeCount;
    const satisfactionRate =
      totalFeedback > 0 ? (positiveCount / totalFeedback) * 100 : 0;

    // Event statistics
    const eventStats = await prisma.generationEvent.groupBy({
      by: ["eventType"],
      where: { createdAt: { gte: startDate } },
      _count: { eventType: true },
    });

    // Calculate engagement metrics
    const downloadCount =
      eventStats.find((e) => e.eventType === "download")?._count.eventType || 0;
    const shareCount =
      eventStats.find((e) => e.eventType === "share")?._count.eventType || 0;
    const regenerateCount =
      eventStats.find((e) => e.eventType === "regenerate")?._count.eventType ||
      0;

    const downloadRate =
      totalGenerations > 0 ? (downloadCount / totalGenerations) * 100 : 0;
    const shareRate =
      totalGenerations > 0 ? (shareCount / totalGenerations) * 100 : 0;
    const regenerateRate =
      totalGenerations > 0 ? (regenerateCount / totalGenerations) * 100 : 0;

    return NextResponse.json({
      overview: {
        totalGenerations,
        totalUsers,
        period,
        satisfactionRate: satisfactionRate.toFixed(1),
        avgRating: qualityMetrics._avg.rating?.toFixed(2) || "N/A",
        totalFeedback: qualityMetrics._count.id,
      },
      engagement: {
        downloadRate: downloadRate.toFixed(1),
        shareRate: shareRate.toFixed(1),
        regenerateRate: regenerateRate.toFixed(1),
        eventBreakdown: eventStats.map((e) => ({
          type: e.eventType,
          count: e._count.eventType,
        })),
      },
      topCategories: topCategories.map((c) => ({
        category: c.categoryId,
        count: c._count.categoryId,
      })),
      topStyles: topStyles.map((s) => ({
        style: s.styleId,
        count: s._count.styleId,
      })),
      dailyGenerations: (dailyGenerations as any[]).map((d) => ({
        date: d.date,
        count: Number(d.count),
      })),
      promptPerformance: {
        best: promptPerformance.slice(0, 10),
        worst: promptPerformance.slice(-10).reverse(),
      },
      recentGenerations: recentGenerations.map((g) => ({
        id: g.id,
        prompt: g.prompt,
        category: g.categoryId,
        subcategory: g.subcategoryId,
        style: g.styleId,
        imageUrl: g.imageUrl,
        createdAt: g.createdAt,
        user: g.user?.email || "Unknown",
      })),
      recentFeedback: recentFeedback.map((f) => ({
        generationId: f.generationId,
        rating: f.rating,
        comment: f.comment,
        issues: f.issues ? JSON.parse(f.issues) : null,
        createdAt: f.createdAt,
      })),
    });
  } catch (error) {
    console.error("Analytics dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
