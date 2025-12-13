import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// User is considered online if last seen within 2 minutes
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

// Store last seen in memory (for simplicity, could use Redis for scale)
const lastSeenMap = new Map<string, number>();

// POST - Update user's presence (heartbeat)
export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update last seen timestamp
    lastSeenMap.set(user.id, Date.now());

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
