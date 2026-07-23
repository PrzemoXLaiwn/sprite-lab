import { NextRequest, NextResponse } from "next/server";
import { getFeaturedGenerations } from "@/lib/featured-generations";

// Dynamic because the category filter comes from the query string; the
// underlying query is cached for 5 minutes in getFeaturedGenerations.
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);
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
