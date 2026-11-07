// Client-safe types and constants for the community gallery (no Prisma import).

/** Items per page: the server renders the first page, the client fetches the rest. */
export const COMMUNITY_PAGE_SIZE = 48;

export interface CommunityItem {
  id: string;
  prompt: string;
  imageUrl: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed?: number;
  likes: number;
  /** ISO date. */
  createdAt: string;
  user?: { name: string | null; avatarUrl: string | null };
}

/** 2D / 3D totals for the current category and search, not just the loaded page. */
export interface CommunityTypeCounts {
  "2d": number;
  "3d": number;
}

export interface CommunityPage {
  generations: CommunityItem[];
  total: number;
  /** Whole gallery, ignoring the category chip, type tab and search box. */
  categoryCounts: Record<string, number>;
  typeCounts: CommunityTypeCounts;
}

/**
 * The "All" chip. Category counts stay gallery-wide, so this must not follow
 * `total` — that number shrinks as soon as a category, type or search is on.
 */
export function galleryAllCount(categoryCounts: Record<string, number>, fallback: number): number {
  const sum = Object.values(categoryCounts).reduce((acc, n) => acc + (Number.isFinite(n) ? n : 0), 0);
  return sum > 0 ? sum : fallback;
}

/** Prompt search shared by the gallery API and the page. Empty means "no search". */
export function normalizeCommunitySearch(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const q = raw.replace(/\s+/g, " ").trim().slice(0, 80);
  return q.length > 0 ? q : null;
}
