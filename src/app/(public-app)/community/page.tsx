import { COMMUNITY_PAGE_SIZE, fetchCommunityPage, type CommunityPage } from "@/lib/community-gallery";
import { CommunityClient } from "./CommunityClient";

// Static, refreshed every 5 minutes (without the database the client loads the works itself)
export const revalidate = 300;

/**
 * /community — the first page of public works (newest first) is fetched and
 * rendered on the server, so the HTML already contains each piece's prompt,
 * style, likes and image alt text. Filters, search, infinite scroll, likes,
 * comments and chat stay in the client component.
 */
export default async function CommunityRoute() {
  let initial: CommunityPage | null = null;
  try {
    initial = await fetchCommunityPage({ sort: "newest", type: "all", category: "all", limit: COMMUNITY_PAGE_SIZE, offset: 0 });
  } catch (error) {
    // Database unreachable: the client retries through /api/community and shows its own empty/error state.
    console.error("[Community] server render failed:", error);
  }
  return <CommunityClient initial={initial} />;
}
