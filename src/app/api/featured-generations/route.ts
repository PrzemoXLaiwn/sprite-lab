import { NextRequest, NextResponse } from "next/server";
import { getFeaturedGenerations } from "@/lib/featured-generations";

// Dynamic because the category filter comes from the query string; the
// underlying query is cached for 5 minutes in getFeaturedGenerations.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") || "12", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 24)
      : 12;
    const category = searchParams.get("category");

    const generations = await getFeaturedGenerations(limit, category);

    return NextResponse.json({
      success: true,
      generations,
      count: generations.length,
    });
  } catch (error) {
    console.error("Error fetching featured generations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch featured generations" },
      { status: 500 }
    );
  }
}
