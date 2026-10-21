// =============================================================================
// SPRITELAB — GENERATION DATABASE OPERATIONS
// =============================================================================
// All generation-record database logic lives here.
// Extracted from src/lib/database.ts — that file re-exports these functions
// so existing callers are not broken during the migration.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { NOT_UPLOADED } from "@/lib/upload-marker";

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
  /** The sprite this animation / edit was made from. */
  sourceGenerationId?: string;
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
      // "Generated" = made by us; free uploads aren't counted
      prisma.generation.count({ where: { userId, ...NOT_UPLOADED } }),
      prisma.generation.count({
        where: {
          userId,
          ...NOT_UPLOADED,
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
          sourceGenerationId: params.sourceGenerationId,
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

// -----------------------------------------------------------------------------
// ANIMATION → SOURCE SPRITE
// -----------------------------------------------------------------------------

/**
 * Best guess at the sprite an animation was made from. There is no
 * source_generation_id column yet, so this matches the source prompt that
 * /api/animate copies into the animation's prompt ("[Animation: walk, 8f]
 * <source prompt>") against the same user's non-animation generations made
 * before it, newest first. Prompts are cut at 1000 chars when saved, so a
 * truncated source prompt is matched as a prefix.
 */
export async function findAnimationSourceId(
  userId: string,
  animation: { sourcePrompt: string; createdAt: Date; savedPromptLength: number }
): Promise<string | null> {
  const sourcePrompt = animation.sourcePrompt;
  if (!sourcePrompt) return null;
  const truncated = animation.savedPromptLength >= 1000;
  try {
    const match = await prisma.generation.findFirst({
      where: {
        userId,
        createdAt: { lte: animation.createdAt },
        NOT: { subcategoryId: "ANIMATION" },
        prompt: truncated ? { startsWith: sourcePrompt } : { equals: sourcePrompt },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    return match?.id ?? null;
  } catch (error) {
    console.error("Failed to find animation source:", error);
    return null;
  }
}
