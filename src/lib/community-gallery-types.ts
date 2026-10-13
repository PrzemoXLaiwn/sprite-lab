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

export interface CommunityPage {
  generations: CommunityItem[];
  total: number;
  categoryCounts: Record<string, number>;
}
