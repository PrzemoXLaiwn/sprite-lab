import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// PUBLIC STATS ENDPOINT
// ===========================================
// Returns real-time stats for marketing pages
// No authentication required

// Cache for performance
let cachedStats: {
  totalGenerations: number;
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  paidSubscribers: number;
} | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

export async function GET() {
  try {
    const now = Date.now();

    // Return cached value if still valid
    if (cachedStats !== null && now - cacheTime < CACHE_DURATION) {
      return NextResponse.json({
        ...cachedStats,
        cached: true,
        timestamp: new Date().toISOString(),
      });
    }

    // Calculate real stats from database
    const [
      totalGenerations,
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      paidSubscribers,
    ] = await Promise.all([
      // Total generations ever made
      prisma.generation.count(),

      // Total registered users
      prisma.user.count(),

      // Users active in last 24 hours
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Users active in last 7 days
      prisma.user.count({
        where: {
          lastActiveAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Paid subscribers (non-FREE plans)
      prisma.user.count({
        where: {
          plan: {
            not: "FREE",
          },
        },
      }),
    ]);

    // Update cache
    cachedStats = {
      totalGenerations,
      totalUsers,
      activeUsersToday,
      activeUsersWeek,
      paidSubscribers,
    };
    cacheTime = now;

    return NextResponse.json({
      ...cachedStats,
      cached: false,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Failed to get stats:", error);

    // Return reasonable defaults on error
    return NextResponse.json({
      totalGenerations: 1000,
      totalUsers: 100,
      activeUsersToday: 5,
      activeUsersWeek: 20,
      paidSubscribers: 0,
      error: true,
      timestamp: new Date().toISOString(),
    });
  }
}
