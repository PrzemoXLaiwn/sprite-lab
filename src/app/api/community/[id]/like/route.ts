import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
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

    // Verify generation exists and is public (private generations can't be liked)
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

    // Toggle atomically: try to remove an existing like first; if nothing was
    // removed, insert one. The counter only moves by the number of rows that
    // were actually deleted/inserted, so concurrent double-clicks can't drift it.
    const { liked, likes } = await prisma.$transaction(async (tx) => {
      let liked: boolean;

      const deleted = await tx.$executeRaw`
        DELETE FROM likes
        WHERE user_id = ${user.id} AND generation_id = ${generationId}
      `;

      if (deleted > 0) {
        await tx.$executeRaw`
          UPDATE generations SET likes = GREATEST(0, likes - ${deleted})
          WHERE id = ${generationId}
        `;
        liked = false;
      } else {
        const inserted = await tx.$executeRaw`
          INSERT INTO likes (id, user_id, generation_id, created_at)
          VALUES (${randomUUID()}, ${user.id}, ${generationId}, NOW())
          ON CONFLICT DO NOTHING
        `;
        if (inserted > 0) {
          await tx.$executeRaw`
            UPDATE generations SET likes = likes + 1
            WHERE id = ${generationId}
          `;
        }
        liked = true;
      }

      const updated = await tx.$queryRaw<{ likes: number }[]>`
        SELECT likes FROM generations WHERE id = ${generationId}
      `;

      return { liked, likes: updated[0]?.likes || 0 };
    });

    return NextResponse.json({
      success: true,
      liked,
      likes,
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
