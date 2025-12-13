import { prisma } from "@/lib/prisma";

// ===================================
// ROLE HIERARCHY: USER < SUPPORT < MODERATOR < ADMIN < OWNER
// OWNER - For SEO/business owner access
// ADMIN - Full admin access
// MODERATOR - Can moderate content, view reports, manage community
// SUPPORT - Can view user info, grant small credits
// USER - Regular user
// ===================================

export type UserRole = "USER" | "SUPPORT" | "MODERATOR" | "ADMIN" | "OWNER";

const ROLE_LEVELS: Record<UserRole, number> = {
  USER: 0,
  SUPPORT: 1,
  MODERATOR: 2,
  ADMIN: 3,
  OWNER: 4,
};

export function hasRoleLevel(userRole: string, requiredRole: UserRole): boolean {
  const userLevel = ROLE_LEVELS[userRole as UserRole] ?? 0;
  const requiredLevel = ROLE_LEVELS[requiredRole];
  return userLevel >= requiredLevel;
}

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

export async function isSupport(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return hasRoleLevel(user?.role || "USER", "SUPPORT");
  } catch (error) {
    console.error("Failed to check support status:", error);
    return false;
  }
}

export async function isOwner(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    return user?.role === "OWNER";
  } catch (error) {
    console.error("Failed to check owner status:", error);
    return false;
  }
}

export async function grantCreditsAsAdmin(
  adminId: string,
  targetUserId: string,
  amount: number,
  reason?: string
) {
  try {
    // Verify admin
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized: Not an admin" };
    }

    // Get admin info for notification
    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { name: true, email: true },
    });

    // Add credits
    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId: targetUserId,
        amount,
        type: "ADMIN_GRANT",
        description: reason || "Credits granted by admin",
        adminId,
      },
    });

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "CREDIT_GRANT",
        title: `You received ${amount} credits!`,
        message: reason || "Credits granted by SpriteLab team",
        data: JSON.stringify({
          amount,
          adminId,
          adminName: admin?.name || admin?.email || "Admin",
        }),
      },
    });

    console.log(`Admin ${adminId} granted ${amount} credits to user ${targetUserId}`);
    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to grant credits:", error);
    return { success: false, error };
  }
}

export async function updateUserRole(
  adminId: string,
  targetUserId: string,
  newRole: UserRole
) {
  try {
    // Get admin's role
    const adminRole = await getUserRole(adminId);
    if (!adminRole) {
      return { success: false, error: "Unauthorized" };
    }

    // ADMIN can assign: USER, SUPPORT, MODERATOR
    // OWNER can assign: USER, SUPPORT, MODERATOR, ADMIN, OWNER
    const adminLevel = ROLE_LEVELS[adminRole];
    const targetLevel = ROLE_LEVELS[newRole];

    // Can only assign roles lower than your own (except OWNER can assign any)
    if (adminRole !== "OWNER" && targetLevel >= adminLevel) {
      return { success: false, error: "Cannot assign role equal to or higher than your own" };
    }

    // Only ADMIN+ can change roles
    if (!hasRoleLevel(adminRole, "ADMIN")) {
      return { success: false, error: "Unauthorized: Only ADMIN or OWNER can change roles" };
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    console.log(`${adminRole} ${adminId} changed user ${targetUserId} role to ${newRole}`);
    return { success: true, user };
  } catch (error) {
    console.error("Failed to update role:", error);
    return { success: false, error };
  }
}

export async function getAllUsers(adminId: string, limit: number = 100, offset: number = 0) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized", users: [] };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        skip: offset,
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: { generations: true, creditTransactions: true },
          },
        },
      }),
      prisma.user.count(),
    ]);

    return { success: true, users, total };
  } catch (error) {
    console.error("Failed to fetch users:", error);
    return { success: false, error, users: [], total: 0 };
  }
}

export async function getAdminStats(adminId: string) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized", stats: null };
    }

    const [totalUsers, totalGenerations, totalRevenue, recentTransactions] = await Promise.all([
      prisma.user.count(),
      prisma.generation.count(),
      prisma.creditTransaction.aggregate({
        where: { type: "PURCHASE" },
        _sum: { moneyAmount: true },
      }),
      prisma.creditTransaction.findMany({
        where: { type: "PURCHASE" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          user: {
            select: { email: true, name: true },
          },
        },
      }),
    ]);

    // Calculate Replicate costs
    const replicateCosts = await prisma.generation.aggregate({
      _sum: { replicateCost: true },
      _count: true,
    });

    const stats = {
      totalUsers,
      totalGenerations,
      totalRevenue: totalRevenue._sum.moneyAmount || 0,
      totalReplicateCost: replicateCosts._sum.replicateCost || 0,
      profit: (totalRevenue._sum.moneyAmount || 0) - (replicateCosts._sum.replicateCost || 0),
      recentTransactions,
    };

    return { success: true, stats };
  } catch (error) {
    console.error("Failed to fetch admin stats:", error);
    return { success: false, error, stats: null };
  }
}

export async function setUserActive(adminId: string, targetUserId: string, isActive: boolean) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized" };
    }

    const user = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user status:", error);
    return { success: false, error };
  }
}

// ===================================
// MODERATOR FUNCTIONS
// ===================================

export async function getReports(userId: string, status?: string, limit: number = 50) {
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
      data: {
        status,
        moderatorId,
        moderatorNote,
      },
    });

    return { success: true, report };
  } catch (error) {
    console.error("Failed to update report:", error);
    return { success: false, error };
  }
}

export async function hideCommunityPost(moderatorId: string, postId: string, hide: boolean) {
  try {
    const canModerate = await isModerator(moderatorId);
    if (!canModerate) {
      return { success: false, error: "Unauthorized" };
    }

    const post = await prisma.communityPost.update({
      where: { id: postId },
      data: { isHidden: hide },
    });

    return { success: true, post };
  } catch (error) {
    console.error("Failed to hide post:", error);
    return { success: false, error };
  }
}

export async function hideGeneration(moderatorId: string, generationId: string, hide: boolean) {
  try {
    const canModerate = await isModerator(moderatorId);
    if (!canModerate) {
      return { success: false, error: "Unauthorized" };
    }

    const generation = await prisma.generation.update({
      where: { id: generationId },
      data: { isPublic: !hide },
    });

    return { success: true, generation };
  } catch (error) {
    console.error("Failed to hide generation:", error);
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

// ===================================
// ADMIN - GET USER BY ID (DETAILED)
// ===================================

export async function getUserById(adminId: string, targetUserId: string) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized", user: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      include: {
        _count: {
          select: { generations: true, creditTransactions: true },
        },
      },
    });

    if (!user) {
      return { success: false, error: "User not found", user: null };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Failed to get user:", error);
    return { success: false, error, user: null };
  }
}

// ===================================
// ADMIN - GET USER GENERATIONS
// ===================================

export async function getUserGenerations(adminId: string, targetUserId: string, limit: number = 50) {
  try {
    const isAdminUser = await isAdmin(adminId);
    if (!isAdminUser) {
      return { success: false, error: "Unauthorized", generations: [] };
    }

    const generations = await prisma.generation.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        prompt: true,
        imageUrl: true,
        categoryId: true,
        subcategoryId: true,
        styleId: true,
        isPublic: true,
        likes: true,
        createdAt: true,
      },
    });

    return { success: true, generations };
  } catch (error) {
    console.error("Failed to get user generations:", error);
    return { success: false, error, generations: [] };
  }
}
