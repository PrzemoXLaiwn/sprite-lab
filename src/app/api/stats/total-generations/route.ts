import { NextResponse } from "next/server";
import { readPublicGenerationStats } from "@/lib/public-stats";

// Same public generation count as /api/stats, under the older path.
// Never invent a number when the database is down.

export async function GET() {
  try {
    const stats = await readPublicGenerationStats();
    return NextResponse.json({
      total: stats.totalGenerations,
      cached: stats.cached,
    });
  } catch (error) {
    console.error("Failed to get total generations:", error);
    return NextResponse.json({ total: 0, error: true }, { status: 503 });
  }
}
