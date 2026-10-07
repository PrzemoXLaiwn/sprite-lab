import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { deleteImageFromStorage } from "@/lib/storage";
import { deleteFromR2, isR2Configured, isR2Url } from "@/lib/r2";
import { getOrCreateUser } from "@/lib/database";

// Best-effort removal of a generation's image from whichever backend hosts it.
// Never throws — a storage failure must not block the DB delete.
async function deleteGenerationImage(imageUrl: string): Promise<void> {
  try {
    if (imageUrl.includes("supabase")) {
      await deleteImageFromStorage(imageUrl);
    } else if (isR2Configured() && isR2Url(imageUrl)) {
      await deleteFromR2(imageUrl);
    }
  } catch (error) {
    console.error("[Bulk Delete] Storage delete failed:", error);
  }
}

// ===========================================
// GET - Fetch user's generations
// ===========================================
export async function GET(request: Request) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // Ensure user exists in database
    await getOrCreateUser(user.id, user.email!);

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") || "50", 10);
    const parsedOffset = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 100)
      : 50;
    const offset = Number.isFinite(parsedOffset) ? Math.max(parsedOffset, 0) : 0;
    const categoryId = searchParams.get("category");

    // Build where clause
    const where: Prisma.GenerationWhereInput = {
      userId: user.id,
    };

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    // Fetch generations from database
    const generations = await prisma.generation.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        prompt: true,
        imageUrl: true,
        categoryId: true,
        subcategoryId: true,
        styleId: true,
        seed: true,
        createdAt: true,
      },
    });

    // Get total count
    const total = await prisma.generation.count({ where });

    return NextResponse.json({
      success: true,
      generations,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[Generations] Error:", error);
    // Never echo error.message — Prisma errors leak schema details and
    // raw constraint violations are not user-actionable.
    return NextResponse.json(
      { error: "Failed to fetch generations" },
      { status: 500 }
    );
  }
}

// ===========================================
// DELETE - Bulk delete generations
// ===========================================
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ids } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Please provide an array of generation IDs to delete." },
        { status: 400 }
      );
    }

    if (ids.length > 50) {
      return NextResponse.json(
        { error: "Maximum 50 items can be deleted at once." },
        { status: 400 }
      );
    }

    // Find all generations that belong to this user
    const generations = await prisma.generation.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    });

    if (generations.length === 0) {
      return NextResponse.json(
        { error: "No valid generations found to delete." },
        { status: 404 }
      );
    }

    // Delete from storage (Supabase or R2)
    await Promise.all(generations.map(g => deleteGenerationImage(g.imageUrl)));

    // Delete from database
    const result = await prisma.generation.deleteMany({
      where: {
        id: { in: generations.map(g => g.id) },
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `Successfully deleted ${result.count} generation(s).`,
    });
  } catch (error) {
    console.error("[Bulk Delete] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete generations" },
      { status: 500 }
    );
  }
}
