import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mark this route as dynamic to prevent static rendering issues
export const dynamic = 'force-dynamic';
export const revalidate = 300; // Cache for 5 minutes

interface FeaturedGeneration {
  id: string;
  imageUrl: string;
  prompt: string;
  categoryId: string;
  styleId: string;
  likes: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "12"), 24);
    const category = searchParams.get("category"); // Optional category filter

    // Build where clause
    const where: {
      isPublic: boolean;
      categoryId?: string;
    } = {
      isPublic: true,
    };

    if (category && category !== "All") {
      // Map friendly category names to IDs
      const categoryMap: Record<string, string> = {
        Characters: "CHARACTERS",
        Creatures: "CREATURES",
        Weapons: "WEAPONS",
        Items: "CONSUMABLES",
        Equipment: "ARMOR",
        Environment: "ENVIRONMENT",
        UI: "UI_ELEMENTS",
        Effects: "EFFECTS",
      };
      where.categoryId = categoryMap[category] || category;
    }

    // Fetch best public generations (most liked first, then most recent)
    const generations = await prisma.generation.findMany({
      where,
      orderBy: [
        { likes: "desc" },
        { createdAt: "desc" },
      ],
      take: limit,
      select: {
        id: true,
        imageUrl: true,
        prompt: true,
        categoryId: true,
        styleId: true,
        likes: true,
      },
    });

    // Map to response format with style names
    const styleNames: Record<string, string> = {
      PIXEL_ART_16: "Pixel Art",
      PIXEL_ART_32: "Pixel Art HD",
      ANIME: "Anime",
      ANIME_CHIBI: "Chibi Cute",
      CARTOON: "Cartoon",
      HAND_PAINTED: "Hand Painted",
      VECTOR_FLAT: "Vector",
      REALISTIC: "Realistic",
      DARK_FANTASY: "Dark Fantasy",
      ISOMETRIC: "Isometric",
      ISOMETRIC_PIXEL: "Isometric Pixel",
    };

    const categoryNames: Record<string, string> = {
      WEAPONS: "Weapons",
      ARMOR: "Equipment",
      CONSUMABLES: "Items",
      RESOURCES: "Resources",
      QUEST_ITEMS: "Items",
      CHARACTERS: "Characters",
      CREATURES: "Creatures",
      ENVIRONMENT: "Environment",
      ISOMETRIC: "Isometric",
      TILESETS: "Tilesets",
      UI_ELEMENTS: "UI",
      EFFECTS: "Effects",
      PROJECTILES: "Effects",
    };

    const featuredGenerations: FeaturedGeneration[] = generations.map((gen) => ({
      id: gen.id,
      imageUrl: gen.imageUrl,
      prompt: gen.prompt,
      categoryId: gen.categoryId,
      styleId: gen.styleId,
      likes: gen.likes,
      style: styleNames[gen.styleId] || gen.styleId,
      category: categoryNames[gen.categoryId] || gen.categoryId,
    }));

    return NextResponse.json({
      success: true,
      generations: featuredGenerations,
      count: featuredGenerations.length,
    });
  } catch (error) {
    console.error("Error fetching featured generations:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch featured generations" },
      { status: 500 }
    );
  }
}
