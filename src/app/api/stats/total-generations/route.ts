import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Cache the result for 5 minutes
let cachedTotal: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    const now = Date.now();

    // Return cached value if still valid
    if (cachedTotal !== null && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        total: cachedTotal,
        cached: true
      });
    }

    // Count total generations
    const total = await prisma.generation.count();

    // Update cache
    cachedTotal = total;
    cacheTime = now;

    return NextResponse.json({
      total,
      cached: false
    });
  } catch (error) {
    console.error("Failed to get total generations:", error);
    // Return a reasonable default on error
    return NextResponse.json({
      total: 1000,
      error: true
    });
  }
}
