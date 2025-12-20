import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");
    const subcategoryId = searchParams.get("subcategoryId");

    if (!categoryId) {
      return NextResponse.json({ examples: [] });
    }

    // Fetch top public generations for this category
    // Prioritize by likes, then by recency
    const examples = await prisma.generation.findMany({
      where: {
        categoryId,
        ...(subcategoryId && { subcategoryId }),
        isPublic: true,
        // Only get ones with likes or recent ones
        OR: [
          { likes: { gte: 1 } },
          // Fallback to recent ones if no liked content
          {
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        ],
      },
      select: {
        id: true,
        imageUrl: true,
        prompt: true,
        styleId: true,
      },
      orderBy: [
        { likes: "desc" },
        { createdAt: "desc" },
      ],
      take: 8,
    });

    return NextResponse.json({ examples });
  } catch (error) {
    console.error("Failed to fetch examples:", error);
    return NextResponse.json({ examples: [] });
  }
}
