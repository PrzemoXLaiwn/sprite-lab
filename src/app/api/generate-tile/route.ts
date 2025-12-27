import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndDeductCredits, refundCredits } from "@/lib/database";
import Replicate from "replicate";
import { STYLES_2D_FULL, COLOR_PALETTES } from "@/config";

// ===========================================
// SEAMLESS TILE GENERATION API
// ===========================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Tile types for different use cases
const TILE_TYPES = {
  GROUND: {
    name: "Ground/Floor",
    promptBoost: "ground texture, floor surface, top-down view, seamless tileable pattern",
    examples: ["grass", "dirt", "stone", "sand", "snow", "cobblestone", "wood floor"],
  },
  WALL: {
    name: "Wall",
    promptBoost: "wall texture, vertical surface, side view, seamless tileable pattern",
    examples: ["brick", "stone wall", "wood planks", "metal", "concrete"],
  },
  NATURE: {
    name: "Nature",
    promptBoost: "natural texture, organic pattern, seamless tileable",
    examples: ["leaves", "moss", "water", "lava", "crystal", "vines"],
  },
  ABSTRACT: {
    name: "Abstract/Pattern",
    promptBoost: "abstract pattern, decorative texture, seamless tileable pattern",
    examples: ["geometric", "ornamental", "magical runes", "tech circuit"],
  },
};

// Build seamless tile prompt
function buildTilePrompt(
  description: string,
  tileType: keyof typeof TILE_TYPES,
  styleId: string,
  colorPaletteId?: string
): string {
  const style = Object.values(STYLES_2D_FULL).find((s) => s.id === styleId);
  const palette = colorPaletteId
    ? COLOR_PALETTES.find((p) => p.id === colorPaletteId)
    : null;
  const tileConfig = TILE_TYPES[tileType];

  const parts: string[] = [];

  // User description
  parts.push(description);

  // Tile type boost
  parts.push(tileConfig.promptBoost);

  // Style components
  if (style) {
    parts.push(style.styleCore);
    parts.push(style.rendering);
    parts.push(style.colors);
    parts.push(style.edges);
  }

  // Color palette
  if (palette) {
    parts.push(palette.promptModifier);
  }

  // Critical seamless tile requirements
  parts.push(
    "seamlessly tileable texture",
    "perfectly repeating pattern",
    "no visible seams when tiled",
    "continuous edges",
    "game ready texture",
    "high quality",
    "clean design"
  );

  return parts.join(", ");
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const {
      description,
      tileType = "GROUND",
      styleId,
      colorPaletteId,
      tileSize = 512,
      customSeed,
    }: {
      description: string;
      tileType: keyof typeof TILE_TYPES;
      styleId: string;
      colorPaletteId?: string;
      tileSize?: number;
      customSeed?: number;
    } = body;

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Description is required" },
        { status: 400 }
      );
    }

    if (!TILE_TYPES[tileType]) {
      return NextResponse.json({ error: "Invalid tile type" }, { status: 400 });
    }

    // Check and deduct credits atomically (1 credit per tile)
    const creditCost = 1;

    const creditResult = await checkAndDeductCredits(user.id, creditCost);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: "Insufficient credits. You need 1 credit for tile generation.",
          noCredits: true,
        },
        { status: 402 }
      );
    }

    const seed = customSeed || Math.floor(Math.random() * 2147483647);
    const prompt = buildTilePrompt(description, tileType, styleId, colorPaletteId);

    try {
      // Use FLUX Schnell for tile generation
      const output = await replicate.run("black-forest-labs/flux-schnell", {
        input: {
          prompt,
          seed,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 95,
        },
      });

      const imageUrl = Array.isArray(output) ? output[0] : output;

      if (!imageUrl) {
        // Refund on failure
        await refundCredits(user.id, creditCost);
        return NextResponse.json(
          { error: "Generation failed - no image returned. Credit refunded." },
          { status: 500 }
        );
      }

      // Save to database
      const generation = await prisma.generation.create({
        data: {
          userId: user.id,
          prompt,
          imageUrl: String(imageUrl),
          categoryId: "TILESETS",
          subcategoryId: tileType,
          styleId,
          seed,
          isPublic: false,
        },
      });

      // Get updated credit balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true },
      });

      return NextResponse.json({
        success: true,
        id: generation.id,
        imageUrl: String(imageUrl),
        prompt,
        seed,
        tileType,
        tileSize,
        styleId,
        colorPaletteId,
        creditsUsed: creditCost,
        creditsRemaining: updatedUser?.credits || 0,
      });
    } catch (genError) {
      // Refund on generation error
      await refundCredits(user.id, creditCost);

      console.error("Tile generation error:", genError);
      return NextResponse.json(
        {
          error: "Generation failed. Credit refunded.",
          message:
            genError instanceof Error ? genError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Tile API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
