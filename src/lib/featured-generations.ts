import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";

export interface FeaturedGeneration {
  id: string;
  imageUrl: string;
  prompt: string;
  categoryId: string;
  styleId: string;
  likes: number;
  style: string;
  category: string;
}

/** Friendly category label -> DB category id. */
export const CATEGORY_MAP: Record<string, string> = {
  Characters: "CHARACTERS",
  Creatures: "CREATURES",
  Weapons: "WEAPONS",
  Items: "CONSUMABLES",
  Equipment: "ARMOR",
  Environment: "ENVIRONMENT",
  UI: "UI_ELEMENTS",
  Effects: "EFFECTS",
};

const STYLE_NAMES: Record<string, string> = {
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

const CATEGORY_NAMES: Record<string, string> = {
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

async function queryFeaturedGenerations(
  limit: number,
  category?: string | null
): Promise<FeaturedGeneration[]> {
  const where: { isPublic: boolean; categoryId?: string } = { isPublic: true };

  if (category && category !== "All") {
    where.categoryId = CATEGORY_MAP[category] || category;
  }

  const generations = await prisma.generation.findMany({
    where,
    orderBy: [{ likes: "desc" }, { createdAt: "desc" }],
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

  return generations.map((gen) => ({
    ...gen,
    style: STYLE_NAMES[gen.styleId] || gen.styleId,
    category: CATEGORY_NAMES[gen.categoryId] || gen.categoryId,
  }));
}

/**
 * Featured generations, cached for 5 minutes.
 *
 * The landing page renders these into the initial HTML, so this runs on every
 * cold visit — the cache keeps that off the database.
 */
export const getFeaturedGenerations = unstable_cache(
  queryFeaturedGenerations,
  ["featured-generations"],
  { revalidate: 300, tags: ["featured-generations"] }
);

/** Never let a landing-page render fail because the gallery query did. */
export async function getFeaturedGenerationsSafe(
  limit: number,
  category?: string | null
): Promise<FeaturedGeneration[]> {
  try {
    return await getFeaturedGenerations(limit, category);
  } catch (error) {
    console.error("Failed to load featured generations:", error);
    return [];
  }
}
