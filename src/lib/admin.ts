// =============================================================================
// SpriteLab — Admin / Moderator helpers
// =============================================================================
// ROLE HIERARCHY:    USER < SUPPORT < MODERATOR < ADMIN < OWNER
//   USER       Regular user
//   SUPPORT    (reserved — no callers yet)
//   MODERATOR  Can review reports, hide community content
//   ADMIN      Full admin access — sees the counters dashboard
//   OWNER      Reserved for the platform owner / SEO holder
//
// Trimmed during the admin-panel simplification: user-management,
// credit-grant, role-update and per-user query helpers were removed
// because the new counters-only dashboard does not need them and they
// had no callers elsewhere. Bring them back as focused tools when there's
// a real moderation or support workflow that wants them.
// =============================================================================

import { prisma } from "@/lib/prisma";

export type UserRole = "USER" | "SUPPORT" | "MODERATOR" | "ADMIN" | "OWNER";

const ROLE_LEVELS: Record<UserRole, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

function hasRoleLevel(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_LEVELS[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_LEVELS[requiredRole];
  return userLevel >= requiredLevel;
}

// -----------------------------------------------------------------------------
// Role lookups
// -----------------------------------------------------------------------------

export async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return (user?.role as UserRole) || null;
  } catch (error) {
    console.error("Failed to get user role:", error);
    return null;
  }
}

export async function isAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return hasRoleLevel(user?.role || "USER", "ADMIN");
  } catch (error) {
    console.error("Failed to check admin status:", error);
    return false;
  }
}

export async function isModerator(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return hasRoleLevel(user?.role || "USER", "MODERATOR");
  } catch (error) {
    console.error("Failed to check moderator status:", error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// Admin counters dashboard
// -----------------------------------------------------------------------------

export async function getAdminStats(adminId: string) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized", stats: null };
    }

    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      paidUsers,
      activeUsers7d,
      newUsers7d,
      totalGenerations,
      generations7d,
      generations24h,
      totalRevenueAgg,
      apiCosts,
      recentTransactions,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { plan: { in: ["STARTER", "PRO", "UNLIMITED", "LIFETIME"] } } }),
      prisma.user.count({ where: { lastActiveAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.generation.count(),
      prisma.generation.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.generation.count({ where: { createdAt: { gte: oneDayAgo } } }),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { moneyAmount: true },
      }),
      // `replicateCost` is the legacy column name — values are USD Runware
      // costs since the provider switch.
      prisma.generation.aggregate({
        _sum: { replicateCost: true },
      }),
      prisma.creditTransaction.findMany({
        where: { type: "PURCHASE" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { user: { select: { email: true, name: true } } },
      }),
    ]);

    const totalRevenue = totalRevenueAgg._sum.moneyAmount || 0;
    const totalRunwareCost = apiCosts._sum?.replicateCost || 0;

    return {
      success: true,
      stats: {
        totalUsers,
        paidUsers,
        activeUsers7d,
        newUsers7d,
        totalGenerations,
        generations7d,
        generations24h,
        totalRevenue,
        totalRunwareCost,
        profit: totalRevenue - totalRunwareCost,
        recentTransactions,
      },
    };
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return { success: false, error, stats: null };
  }
}

// -----------------------------------------------------------------------------
// Moderator queue (used by /moderator)
// -----------------------------------------------------------------------------

export async function getReports(userId: string, status?: string, limit = 50) {
  try {
    const canModerate = await isModerator(userId);
    if (!canModerate) {
      return { success: false, error: "Unauthorized", reports: [] };
    }

    const reports = await prisma.report.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        reporter: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        reportedUser: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
        post: {
          select: { id: true, title: true, content: true, imageUrl: true },
        },
      },
    });

    return { success: true, reports };
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return { success: false, error, reports: [] };
  }
}

export async function updateReportStatus(
  moderatorId: string,
  reportId: string,
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED",
  moderatorNote?: string
) {
  try {
    const canModerate = await isModerator(moderatorId);
    if (!canModerate) {
      return { success: false, error: "Unauthorized" };
    }

    const report = await prisma.report.update({
      where: { id: reportId },
      data: { status, moderatorId, moderatorNote },
    });

    return { success: true, report };
  } catch (error) {
    console.error("Failed to update report:", error);
    return { success: false, error };
  }
}

export async function getModeratorStats(userId: string) {
  try {
    const canModerate = await isModerator(userId);
    if (!canModerate) {
      return { success: false, error: "Unauthorized", stats: null };
    }

    const [
      pendingReports,
      totalReports,
      totalPosts,
      hiddenPosts,
      totalGenerations,
      publicGenerations,
    ] = await Promise.all([
      prisma.report.count({ where: { status: "PENDING" } }),
      prisma.report.count(),
      prisma.communityPost.count(),
      prisma.communityPost.count({ where: { isHidden: true } }),
      prisma.generation.count(),
      prisma.generation.count({ where: { isPublic: true } }),
    ]);

    return {
      success: true,
      stats: {
        pendingReports,
        totalReports,
        totalPosts,
        hiddenPosts,
        totalGenerations,
        publicGenerations,
      },
    };
  } catch (error) {
    console.error("Failed to get moderator stats:", error);
    return { success: false, error, stats: null };
  }
}
