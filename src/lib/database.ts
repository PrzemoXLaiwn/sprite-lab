import { prisma } from "@/lib/prisma";

// ===================================
// USER FUNCTIONS
// ===================================

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
          credits: 15, // Free tier: 15 credits to start
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
      include: {
        _count: {
          select: { generations: true },
        },
      },
    });

    return { success: true, user };
  } catch (error) {
    console.error("Failed to fetch user:", error);
    return { success: false, error, user: null };
  }
}

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

export async function updateUserProfile(userId: string, data: UpdateProfileData) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data,
    });

    return { success: true, user };
  } catch (error) {
    console.error("Failed to update user:", error);
    return { success: false, error };
  }
}

export async function checkUsernameAvailable(username: string, excludeUserId?: string) {
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

// ===================================
// CREDITS FUNCTIONS
// ===================================

export async function getUserCredits(userId: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { credits: true, plan: true, role: true },
    });

    return {
      success: true,
      credits: user?.credits || 0,
      plan: user?.plan || "FREE",
      role: user?.role || "USER"
    };
  } catch (error) {
    console.error("Failed to fetch credits:", error);
    return { success: false, credits: 0, plan: "FREE", role: "USER" };
  }
}

export async function deductCredit(userId: string, amount: number = 1) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          decrement: amount,
        },
      },
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "GENERATION",
        description: "Image generation",
      },
    });

    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to deduct credit:", error);
    return { success: false, error };
  }
}

/**
 * Atomically check and deduct credits using database transaction
 * Prevents race condition where user could get multiple generations with insufficient credits
 */
export async function checkAndDeductCredits(userId: string, amount: number = 1): Promise<{
  success: boolean;
  credits?: number;
  error?: string;
}> {
  try {
    // Use transaction to atomically check and deduct
    const result = await prisma.$transaction(async (tx) => {
      // Lock the user row and check credits
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.credits < amount) {
        throw new Error("INSUFFICIENT_CREDITS");
      }

      // Deduct credits atomically
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          credits: {
            decrement: amount,
          },
        },
      });

      // Log the transaction
      await tx.creditTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: "GENERATION",
          description: "Image generation",
        },
      });

      return updatedUser.credits;
    });

    return { success: true, credits: result };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (errorMessage === "INSUFFICIENT_CREDITS") {
      return { success: false, error: "Not enough credits" };
    }

    console.error("Failed to check and deduct credits:", error);
    return { success: false, error: errorMessage };
  }
}

/**
 * Refund credits if generation fails (after successful deduction)
 */
export async function refundCredits(userId: string, amount: number = 1): Promise<{
  success: boolean;
  credits?: number;
}> {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });

    // Log the refund
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount: amount,
        type: "REFUND",
        description: "Generation failed - credits refunded",
      },
    });

    console.log(`Refunded ${amount} credit(s) to user ${userId}`);
    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to refund credits:", error);
    return { success: false };
  }
}

export async function addCredits(userId: string, amount: number, type: string = "PURCHASE", description?: string) {
  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        credits: {
          increment: amount,
        },
      },
    });

    // Log transaction
    await prisma.creditTransaction.create({
      data: {
        userId,
        amount,
        type,
        description,
      },
    });

    return { success: true, credits: user.credits };
  } catch (error) {
    console.error("Failed to add credits:", error);
    return { success: false, error };
  }
}

export async function getCreditTransactions(userId: string, limit: number = 50) {
  try {
    const transactions = await prisma.creditTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return { success: true, transactions };
  } catch (error) {
    console.error("Failed to fetch transactions:", error);
    return { success: false, transactions: [] };
  }
}

// ===================================
// GENERATION FUNCTIONS
// ===================================

export interface SaveGenerationParams {
  userId: string;
  prompt: string;
  fullPrompt?: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  imageUrl: string;
  seed?: number;
  replicateCost?: number; // Cost in USD from Replicate API
}

export async function saveGeneration(params: SaveGenerationParams) {
  try {
    // Create generation and update lastActiveAt in parallel
    const [generation] = await Promise.all([
      prisma.generation.create({
        data: {
          userId: params.userId,
          prompt: params.prompt,
          fullPrompt: params.fullPrompt,
          categoryId: params.categoryId,
          subcategoryId: params.subcategoryId,
          styleId: params.styleId,
          imageUrl: params.imageUrl,
          seed: params.seed,
          replicateCost: params.replicateCost,
        },
      }),
      // Update user's last active timestamp
      prisma.user.update({
        where: { id: params.userId },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    console.log("Saved generation to database:", generation.id, "Cost: $" + (params.replicateCost || 0).toFixed(4));

    // 🔬 Queue for automatic quality analysis (background, non-blocking)
    queueGenerationForAnalysis(generation.id).catch((err) => {
      console.error("Failed to queue analysis job:", err);
    });

    return { success: true, generation };
  } catch (error) {
    console.error("Failed to save generation:", error);
    return { success: false, error };
  }
}

// Queue generation for automatic AI analysis
async function queueGenerationForAnalysis(generationId: string): Promise<void> {
  try {
    // Only analyze if ANTHROPIC_API_KEY is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return;
    }

    await prisma.analysisJob.create({
      data: {
        generationId,
        status: "pending",
        priority: 0,
      },
    });

    console.log(`[Analytics] 📊 Queued generation ${generationId} for analysis`);
  } catch (error) {
    // Ignore duplicate key errors (generation already queued)
    if ((error as { code?: string }).code !== "P2002") {
      throw error;
    }
  }
}

export async function getUserGenerations(userId: string, limit?: number) {
  try {
    const generations = await prisma.generation.findMany({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return { success: true, generations };
  } catch (error) {
    console.error("Failed to fetch generations:", error);
    return { success: false, error, generations: [] };
  }
}

export async function deleteGeneration(id: string, userId: string) {
  try {
    await prisma.generation.delete({
      where: {
        id,
        userId,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to delete generation:", error);
    return { success: false, error };
  }
}

// ===================================
// STATS FUNCTIONS
// ===================================

export async function getUserStats(userId: string) {
  try {
    const [totalGenerations, recentGenerations, user] = await Promise.all([
      prisma.generation.count({ where: { userId } }),
      prisma.generation.count({
        where: {
          userId,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { credits: true, plan: true, createdAt: true },
      }),
    ]);

    return {
      success: true,
      stats: {
        totalGenerations,
        recentGenerations,
        credits: user?.credits || 0,
        plan: user?.plan || "FREE",
        memberSince: user?.createdAt || new Date(),
      },
    };
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return { success: false, stats: null };
  }
}
