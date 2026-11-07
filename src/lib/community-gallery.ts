// =============================================================================
// Public community gallery query — shared by GET /api/community (filters and
// infinite scroll) and the server-rendered first page of /community.
// =============================================================================

import { prisma } from "@/lib/prisma";
import { publicGenerationWhere } from "@/lib/moderation/visibility";
import type { Prisma } from "@prisma/client";
import { normalizeCommunitySearch, type CommunityItem, type CommunityPage } from "@/lib/community-gallery-types";

export { COMMUNITY_PAGE_SIZE } from "@/lib/community-gallery-types";
export type { CommunityItem, CommunityPage };

export interface CommunityQuery {
  category?: string | null;
  /** "2d" | "3d" | "all" */
  type?: string | null;
  /** "newest" | "popular" */
  sort?: string | null;
  /** Prompt text. Matched case-insensitively across the whole gallery, not one page. */
  q?: string | null;
  limit: number;
  offset: number;
}

/**
 * Filters for one gallery listing. `type` is omitted for the 2D/3D breakdown
 * so those two numbers still add up while a type tab is selected.
 * `publicGenerationWhere()` already sets `NOT`, so extra filters go in `AND`.
 */
export function communityListWhere(
  q: Pick<CommunityQuery, "category" | "type" | "q">,
  opts?: { type?: boolean },
): Prisma.GenerationWhereInput {
  const parts: Prisma.GenerationWhereInput[] = [publicGenerationWhere()];
  if (q.category && q.category !== "all") parts.push({ categoryId: q.category });
  const search = normalizeCommunitySearch(q.q);
  if (search) parts.push({ prompt: { contains: search, mode: "insensitive" } });
  if (opts?.type !== false) {
    if (q.type === "2d") parts.push({ styleId: { not: { startsWith: "3D_" } } });
    else if (q.type === "3d") parts.push({ styleId: { startsWith: "3D_" } });
  }
  return parts.length === 1 ? parts[0] : { AND: parts };
}

export async function fetchCommunityPage(q: CommunityQuery): Promise<CommunityPage> {
  // Shared, owner not banned, nothing from the content filter (see moderation/visibility)
  const where = communityListWhere(q);
  const breakdownWhere = communityListWhere(q, { type: false });
  const twoD: Prisma.GenerationWhereInput = { styleId: { not: { startsWith: "3D_" } } };
  const threeD: Prisma.GenerationWhereInput = { styleId: { startsWith: "3D_" } };

  const orderBy: Prisma.GenerationOrderByWithRelationInput[] =
    q.sort === "popular" ? [{ likes: "desc" }, { createdAt: "desc" }] : [{ createdAt: "desc" }];

  const [rows, total, counts, count2d, count3d] = await Promise.all([
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
    prisma.generation.count({ where: { AND: [breakdownWhere, twoD] } }),
    prisma.generation.count({ where: { AND: [breakdownWhere, threeD] } }),
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
    typeCounts: { "2d": count2d, "3d": count3d },
  };
}
