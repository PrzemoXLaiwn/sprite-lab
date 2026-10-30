import { NextResponse } from "next/server";
import { readPublicGenerationStats } from "@/lib/public-stats";

// ===========================================
// PUBLIC STATS ENDPOINT
// ===========================================
// Marketing pages may show how many assets have been generated.
// Paid subscriber counts and user-activity numbers are not public.
// The admin dashboard loads those from getAdminStats, not from here.

export async function GET() {
  try {
    const stats = await readPublicGenerationStats();
    return NextResponse.json({
      ...stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get stats:", error);
    return NextResponse.json(
      {
        totalGenerations: 0,
        error: true,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
