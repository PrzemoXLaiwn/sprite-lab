import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ===========================================
// GET - Fetch public community gallery
// Note: Requires migration to add isPublic/likes fields
// ===========================================
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const categoryId = searchParams.get("category");
    const filterType = searchParams.get("type"); // "2d" | "3d" | "all"
    const sortBy = searchParams.get("sort") || "newest"; // "newest" | "popular"

    // Build where clause - isPublic will work after migration
    const where: Record<string, unknown> = {
      isPublic: true,
    };

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    // Filter by type (2D vs 3D)
    if (filterType === "2d") {
      where.styleId = {
        not: {
          startsWith: "3D_",
        },
      };
    } else if (filterType === "3d") {
      where.styleId = {
        startsWith: "3D_",
      };
    }

    // Build orderBy
    const orderBy: any = sortBy === "popular"
      ? [{ likes: "desc" }, { createdAt: "desc" }]
      : { createdAt: "desc" };

    // Fetch public generations
    const generations = await prisma.generation.findMany({
      where,
      orderBy,
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
        likes: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get total count
    const total = await prisma.generation.count({ where });

    // Get category counts
    const categoryCounts = await prisma.generation.groupBy({
      by: ["categoryId"],
      where: { isPublic: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      generations,
      total,
      limit,
      offset,
      categoryCounts: categoryCounts.reduce((acc, item) => {
        acc[item.categoryId] = item._count;
        return acc;
      }, {} as Record<string, number>),
    });
  } catch (error) {
    console.error("[Community] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch community gallery" },
      { status: 500 }
    );
  }
}
