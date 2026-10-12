import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsedLimit = parseInt(searchParams.get("limit") || "8", 10);
    const limit = Number.isFinite(parsedLimit)
      ? Math.min(Math.max(parsedLimit, 1), 20)
      : 8;

    // Fetch recent public generations with good ratings/likes
    const generations = await prisma.generation.findMany({
      where: {
        isPublic: true,
      },
      select: {
        id: true,
        imageUrl: true,
        prompt: true,
        categoryId: true,
        subcategoryId: true,
        styleId: true,
        likes: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { createdAt: "desc" },
      ],
      take: limit,
    });

    return NextResponse.json({ generations });
  } catch (error) {
    console.error("Failed to fetch community generations:", error);
    return NextResponse.json({ generations: [] });
  }
}
