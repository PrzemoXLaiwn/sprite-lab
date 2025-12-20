import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// User is considered online if last seen within 2 minutes
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

// Store last seen in memory (for simplicity, could use Redis for scale)
const lastSeenMap = new Map<string, number>();

// Track when we last updated the database for each user (to avoid too many writes)
const lastDbUpdateMap = new Map<string, number>();
const DB_UPDATE_INTERVAL_MS = 5 * 60 * 1000; // Update DB every 5 minutes

// POST - Update user's presence (heartbeat)
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const now = Date.now();

    // Update in-memory last seen timestamp
    lastSeenMap.set(user.id, now);

    // Update lastActiveAt in database periodically (every 5 minutes)
    const lastDbUpdate = lastDbUpdateMap.get(user.id) || 0;
    if (now - lastDbUpdate > DB_UPDATE_INTERVAL_MS) {
      lastDbUpdateMap.set(user.id, now);
      // Fire and forget - don't wait for this
      prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      }).catch((err) => console.error("[Presence] DB update failed:", err));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Presence update error:", error);
    return NextResponse.json({ error: "Failed to update presence" }, { status: 500 });
  }
}

// GET - Get online users (admin only)
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check admin access
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || (dbUser.role !== "ADMIN" && dbUser.role !== "OWNER")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all online users (seen within threshold)
    const now = Date.now();
    const onlineUsers: string[] = [];

    lastSeenMap.forEach((lastSeen, oddzielnyUserId) => {
      if (now - lastSeen < ONLINE_THRESHOLD_MS) {
        onlineUsers.push(oddzielnyUserId);
      } else {
        // Clean up old entries
        lastSeenMap.delete(oddzielnyUserId);
      }
    });

    return NextResponse.json({
      onlineUsers,
      onlineCount: onlineUsers.length,
    });
  } catch (error) {
    console.error("Get presence error:", error);
    return NextResponse.json({ error: "Failed to get presence" }, { status: 500 });
  }
}
