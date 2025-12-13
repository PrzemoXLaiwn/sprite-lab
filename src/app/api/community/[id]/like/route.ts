import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// POST - Toggle like on a generation
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
        { error: "Please log in to like." },
        { status: 401 }
      );
    }

    const generationId = params.id;

    // Verify generation exists
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found." },
        { status: 404 }
      );
    }

    // Check if already liked using raw query
    const existingLike = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM likes
      WHERE user_id = ${user.id} AND generation_id = ${generationId}
      LIMIT 1
    `;

    let liked: boolean;

    if (existingLike.length > 0) {
      // Unlike - remove the like
      await prisma.$executeRaw`
        DELETE FROM likes
        WHERE user_id = ${user.id} AND generation_id = ${generationId}
      `;
      // Decrement likes count
      await prisma.$executeRaw`
        UPDATE generations SET likes = GREATEST(0, likes - 1)
        WHERE id = ${generationId}
      `;
      liked = false;
    } else {
      // Like - add new like
      const likeId = `like_${Date.now().toString(36)}`;
      await prisma.$executeRaw`
        INSERT INTO likes (id, user_id, generation_id, created_at)
        VALUES (${likeId}, ${user.id}, ${generationId}, NOW())
      `;
      // Increment likes count
      await prisma.$executeRaw`
        UPDATE generations SET likes = likes + 1
        WHERE id = ${generationId}
      `;
      liked = true;
    }

    // Get updated likes count
    const updated = await prisma.$queryRaw<{ likes: number }[]>`
      SELECT likes FROM generations WHERE id = ${generationId}
    `;

    return NextResponse.json({
      success: true,
      liked,
      likes: updated[0]?.likes || 0,
    });
  } catch (error) {
    console.error("[Like] Error:", error);
    return NextResponse.json(
      { error: "Failed to update like. Please try again." },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - Check if user liked a generation
// ===========================================
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({
        success: true,
        liked: false,
      });
    }

    const generationId = params.id;

    // Check if liked
    const existingLike = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM likes
      WHERE user_id = ${user.id} AND generation_id = ${generationId}
      LIMIT 1
    `;

    return NextResponse.json({
      success: true,
      liked: existingLike.length > 0,
    });
  } catch (error) {
    console.error("[Like GET] Error:", error);
    return NextResponse.json({
      success: true,
      liked: false,
    });
  }
}
