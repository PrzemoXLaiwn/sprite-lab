import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { rateLimitUserGeneration } from "@/lib/rate-limit";

const MAX_COMMENT_LENGTH = 500;

// ===========================================
// GET - Fetch comments for a generation
// ===========================================
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const generationId = params.id;

    // Verify generation exists and is public
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, isPublic: true },
    });

    if (!generation || !generation.isPublic) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Fetch comments with user info using raw query for now
    // After migration, this will use proper relations
    const comments = await prisma.$queryRaw`
      SELECT
        c.id,
        c.user_id as "userId",
        c.message,
        c.created_at as "createdAt",
        u.name as "userName",
        u.avatar_url as "userAvatar"
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.generation_id = ${generationId}
      ORDER BY c.created_at DESC
      LIMIT 100
    `;

    return NextResponse.json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error("[Comments GET] Error:", error);
    // Return empty array if table doesn't exist yet
    return NextResponse.json({
      success: true,
      comments: [],
    });
  }
}

// ===========================================
// POST - Add a comment
// ===========================================
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to comment." },
        { status: 401 }
      );
    }

    // Per-user rate limit. rate-limit.ts has no dedicated comment limiter, so
    // reuse the 30/hour per-user limiter under a namespaced identifier — this
    // gives comments their own bucket separate from generation quota.
    const { blocked } = await rateLimitUserGeneration(`comment:${user.id}`);
    if (blocked) return blocked;

    const generationId = params.id;
    const body = await request.json().catch(() => null);
    const message: string =
      typeof body?.message === "string" ? body.message.trim() : "";

    if (message.length === 0) {
      return NextResponse.json(
        { error: "Please provide a message." },
        { status: 400 }
      );
    }

    if (message.length > MAX_COMMENT_LENGTH) {
      return NextResponse.json(
        { error: `Comment too long (max ${MAX_COMMENT_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // Verify generation exists and is public
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
      select: { id: true, isPublic: true },
    });

    if (!generation || !generation.isPublic) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Create comment using raw query for now
    const commentId = randomUUID();
    await prisma.$executeRaw`
      INSERT INTO comments (id, user_id, generation_id, message, created_at)
      VALUES (${commentId}, ${user.id}, ${generationId}, ${message}, NOW())
    `;

    // Get user info
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, avatarUrl: true },
    });

    return NextResponse.json({
      success: true,
      comment: {
        id: commentId,
        userId: user.id,
        message,
        createdAt: new Date().toISOString(),
        userName: dbUser?.name || null,
        userAvatar: dbUser?.avatarUrl || null,
      },
    });
  } catch (error) {
    console.error("[Comments POST] Error:", error);
    return NextResponse.json(
      { error: "Failed to add comment. Please try again." },
      { status: 500 }
    );
  }
}
