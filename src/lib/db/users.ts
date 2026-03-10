// =============================================================================
// SPRITELAB — USER DATABASE OPERATIONS
// =============================================================================
// All user-identity and profile database logic lives here.
// Extracted from src/lib/database.ts — that file re-exports these functions
// so existing callers are not broken during the migration.
// =============================================================================

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// TYPES (re-exported so callers don't need a second import)
// -----------------------------------------------------------------------------

export interface UpdateProfileData {
  name?: string;
  avatarUrl?: string;
  username?: string;
  bio?: string;
  website?: string;
  socialTwitter?: string;
  socialGithub?: string;
  isProfilePublic?: boolean;
}

export type UserTier = "free" | "starter" | "pro" | "lifetime";

// -----------------------------------------------------------------------------
// READ
// -----------------------------------------------------------------------------

export async function getOrCreateUser(supabaseUserId: string, email: string) {
  try {
    let user = await prisma.user.findUnique({
      where: { id: supabaseUserId },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: supabaseUserId,
          email,
          credits: 5,
          plan: "FREE",
        },
      });
      console.log("Created new user:", user.id);
    }

    return { success: true, user };
  } catch (error) {
    console.error("Failed to get/create user:", error);
    return { success: false, error, user: null };
  }
}

export async function getUser(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { _count: { select: { generations: true } } },
    });
    return { success: true, user };
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { success: false, error, user: null };
  }
}

export async function checkUsernameAvailable(
  username: string,
  excludeUserId?: string
) {
  try {
    const existing = await prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
    });
    return { available: !existing };
  } catch (error) {
    console.error("Failed to check username:", error);
    return { available: false };
  }
}

export async function getPublicProfile(username: string) {
  try {
    const user = await prisma.user.findFirst({
      where: {
        username: username.toLowerCase(),
        isProfilePublic: true,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        avatarUrl: true,
        bio: true,
        website: true,
        socialTwitter: true,
        socialGithub: true,
        plan: true,
        badges: true,
        totalLikesReceived: true,
        totalGenerationsPublic: true,
        createdAt: true,
        generations: {
          where: { isPublic: true },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            prompt: true,
            imageUrl: true,
            likes: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            generations: { where: { isPublic: true } },
            communityPosts: { where: { isHidden: false } },
          },
        },
      },
    });

    if (!user) {
      return { success: false, user: null, error: "User not found" };
    }

    return { success: true, user };
  } catch (error) {
    console.error("Failed to fetch public profile:", error);
    return { success: false, user: null, error: "Failed to fetch profile" };
  }
}

// -----------------------------------------------------------------------------
// WRITE
// -----------------------------------------------------------------------------

export async function updateUserProfile(
  userId: string,
  data: UpdateProfileData
) {
  try {
    const user = await prisma.user.update({ where: { id: userId }, data });
    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { success: false, error };
  }
}

// -----------------------------------------------------------------------------
// TIER HELPERS
// -----------------------------------------------------------------------------

/**
 * Map the plan string stored in the DB to a tier used for AI model selection.
 */
export function planToTier(plan: string): UserTier {
  const p = plan.toUpperCase();
  if (p === "LIFETIME") return "lifetime";
  if (p === "PRO" || p === "UNLIMITED") return "pro";
  if (p === "STARTER") return "starter";
  return "free";
}

export async function getUserTier(userId: string): Promise<UserTier> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true },
    });
    return planToTier(user?.plan ?? "FREE");
  } catch (error) {
    console.error("Failed to get user tier:", error);
    return "free";
  }
}
