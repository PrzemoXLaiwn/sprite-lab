import { NextResponse } from "next/server";
import { fetchCommunityPage } from "@/lib/community-gallery";

// ===========================================
// GET - Fetch public community gallery (filters + infinite scroll)
// ===========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const parsedOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.min(Math.max(parsedOffset, 0), 10000) : 0;

    const page = await fetchCommunityPage({
      category: searchParams.get("category"),
      type: searchParams.get("type"),
      sort: searchParams.get("sort") || "newest",
      limit,
      offset,
    });

    return NextResponse.json({ success: true, ...page, limit, offset });
  } catch (error) {
    console.error("[Community] Error:", error);
    return NextResponse.json({ error: "Failed to fetch community gallery" }, { status: 500 });
  }
}
