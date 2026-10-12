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
  projectId?: string;
  folderId?: string;
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

/**
 * projectId / folderId originate from the client. Only keep them when they
 * belong to the user; otherwise a user could attach generations to (and leak
 * them into) someone else's project. Invalid ids are dropped, not rejected,
 * so a stale UI selection never loses a paid generation.
 */
async function resolveOwnedPlacement(
  userId: string,
  projectId?: string,
  folderId?: string
): Promise<{ projectId: string | null; folderId: string | null }> {
  let ownedProjectId: string | null = null;
  let ownedFolderId: string | null = null;

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (project) ownedProjectId = project.id;
    else console.warn(`[saveGeneration] Dropping projectId not owned by user ${userId}`);
  }

  if (folderId) {
    const folder = await prisma.projectFolder.findFirst({
      where: {
        id: folderId,
        project: { userId },
        ...(ownedProjectId ? { projectId: ownedProjectId } : {}),
      },
      select: { id: true, projectId: true },
    });
    if (folder) {
      ownedFolderId = folder.id;
      if (!ownedProjectId && !projectId) ownedProjectId = folder.projectId;
    } else {
      console.warn(`[saveGeneration] Dropping folderId not owned by user ${userId}`);
    }
  }

  return { projectId: ownedProjectId, folderId: ownedFolderId };
}

export async function saveGeneration(params: SaveGenerationParams) {
  try {
    const placement = await resolveOwnedPlacement(
      params.userId,
      params.projectId,
      params.folderId
    );

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
          projectId: placement.projectId,
          folderId: placement.folderId,
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
