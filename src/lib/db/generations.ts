// =============================================================================
// SPRITELAB — GENERATION DATABASE OPERATIONS
// =============================================================================
// All generation-record database logic lives here.
// Extracted from src/lib/database.ts — that file re-exports these functions
// so existing callers are not broken during the migration.
// =============================================================================

import { prisma } from "@/lib/prisma";

// -----------------------------------------------------------------------------
// TYPES
// -----------------------------------------------------------------------------

export interface SaveGenerationParams {
  userId: string;
  prompt: string;
  fullPrompt?: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  imageUrl: string;
  seed?: number;
  replicateCost?: number;
}

// -----------------------------------------------------------------------------
// READ
// -----------------------------------------------------------------------------

export async function getUserGenerations(userId: string, limit?: number) {
  try {
    const generations = await prisma.generation.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return { success: true, generations };
  } catch (error) {
    console.error("Failed to fetch generations:", error);
    return { success: false, error, generations: [] };
  }
}

export async function getUserStats(userId: string) {
  try {
    const [totalGenerations, recentGenerations, user] = await Promise.all([
      prisma.generation.count({ where: { userId } }),
      prisma.generation.count({
        where: {
          userId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
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
        credits: user?.credits ?? 0,
        plan: user?.plan ?? "FREE",
        memberSince: user?.createdAt ?? new Date(),
      },
    };
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return { success: false, stats: null };
  }
}

// -----------------------------------------------------------------------------
// WRITE
// -----------------------------------------------------------------------------

export async function saveGeneration(params: SaveGenerationParams) {
  try {
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
      prisma.user.update({
        where: { id: params.userId },
        data: { lastActiveAt: new Date() },
      }),
    ]);

    console.log(
      "Saved generation to database:",
      generation.id,
      "Cost: $" + (params.replicateCost ?? 0).toFixed(4)
    );

    // Queue for AI quality analysis — background, non-blocking
    queueGenerationForAnalysis(generation.id).catch((err) => {
      console.error("Failed to queue analysis job:", err);
    });

    return { success: true, generation };
  } catch (error) {
    console.error("Failed to save generation:", error);
    return { success: false, error };
  }
}

export async function deleteGeneration(id: string, userId: string) {
  try {
    await prisma.generation.delete({ where: { id, userId } });
    return { success: true };
  } catch (error) {
    console.error("Failed to delete generation:", error);
    return { success: false, error };
  }
}

// -----------------------------------------------------------------------------
// INTERNAL HELPERS
// -----------------------------------------------------------------------------

async function queueGenerationForAnalysis(generationId: string): Promise<void> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) return;

    await prisma.analysisJob.create({
      data: { generationId, status: "pending", priority: 0 },
    });

    console.log(`[Analytics] Queued generation ${generationId} for analysis`);
  } catch (error) {
    // Ignore duplicate key errors (already queued)
    if ((error as { code?: string }).code !== "P2002") {
      throw error;
    }
  }
}
