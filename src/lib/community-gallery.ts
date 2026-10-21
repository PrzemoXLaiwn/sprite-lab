// =============================================================================
// Public community gallery query — shared by GET /api/community (filters and
// infinite scroll) and the server-rendered first page of /community.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { publicGenerationWhere } from "@/lib/moderation/visibility";
import type { Prisma } from "@prisma/client";
import type { CommunityItem, CommunityPage } from "@/lib/community-gallery-types";

export { COMMUNITY_PAGE_SIZE } from "@/lib/community-gallery-types";
export type { CommunityItem, CommunityPage };

export interface CommunityQuery {
  category?: string | null;
  /** "2d" | "3d" | "all" */
  type?: string | null;
  /** "newest" | "popular" */
  sort?: string | null;
  limit: number;
  offset: number;
}

export async function fetchCommunityPage(q: CommunityQuery): Promise<CommunityPage> {
  // Shared, owner not banned, nothing from the content filter (see moderation/visibility)
  const where: Prisma.GenerationWhereInput = publicGenerationWhere();
  if (q.category && q.category !== "all") where.categoryId = q.category;
  if (q.type === "2d") where.styleId = { not: { startsWith: "3D_" } };
  else if (q.type === "3d") where.styleId = { startsWith: "3D_" };

  const orderBy: Prisma.GenerationOrderByWithRelationInput[] =
    q.sort === "popular" ? [{ likes: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [rows, total, counts] = await Promise.all([
    prisma.generation.findMany({
      where,
      orderBy,
      take: q.limit,
      skip: q.offset,
      select: {
        id: true,
        prompt: true,
        imageUrl: true,
        categoryId: true,
        subcategoryId: true,
        styleId: true,
        seed: true,
        likes: true,
        createdAt: true,
        // Internal user id intentionally not exposed publicly
        user: { select: { name: true, avatarUrl: true } },
      },
    }),
    prisma.generation.count({ where }),
    prisma.generation.groupBy({ by: ["categoryId"], where: publicGenerationWhere(), _count: true }),
  ]);

  return {
    generations: rows.map((r) => ({
      ...r,
      seed: r.seed ?? undefined,
      createdAt: r.createdAt.toISOString(),
      user: r.user ?? undefined,
    })),
    total,
    categoryCounts: Object.fromEntries(counts.map((c) => [c.categoryId, c._count])),
  };
}
