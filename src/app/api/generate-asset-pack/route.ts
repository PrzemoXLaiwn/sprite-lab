import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Replicate from "replicate";
import { ASSET_PACKS, COLOR_PALETTES } from "@/config/features";
import { STYLES_2D_FULL } from "@/config";

// ===========================================
// ASSET PACK GENERATION API
// ===========================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Build prompt for an asset pack item
function buildAssetPrompt(
  item: { name: string; promptModifier: string },
  styleId: string,
  colorPaletteId?: string
): string {
  const style = Object.values(STYLES_2D_FULL).find((s) => s.id === styleId);
  const palette = colorPaletteId
    ? COLOR_PALETTES.find((p) => p.id === colorPaletteId)
    : null;

  const parts: string[] = [];

  // Base item description
  parts.push(item.promptModifier);

  // Add style components
  if (style) {
    parts.push(style.styleCore);
    parts.push(style.rendering);
    parts.push(style.colors);
    parts.push(style.edges);
  }

  // Add color palette if specified
  if (palette) {
    parts.push(palette.promptModifier);
  }

  // Common game asset requirements
  parts.push(
    "single centered item, game asset, transparent background, clean edges, high quality"
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
      assetPackId,
      styleId,
      colorPaletteId,
      customSeed,
    }: {
      assetPackId: string;
      styleId: string;
      colorPaletteId?: string;
      customSeed?: number;
    } = body;

    // Find asset pack
    const pack = ASSET_PACKS.find((p) => p.id === assetPackId);
    if (!pack) {
      return NextResponse.json(
        { error: "Invalid asset pack" },
        { status: 400 }
      );
    }

    // Check credits (use atomic transaction to prevent race conditions)
    const totalCredits = pack.creditsRequired;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });

    if (!dbUser || dbUser.credits < totalCredits) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: totalCredits,
          available: dbUser?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Deduct credits atomically
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: totalCredits } },
    });

    // Generate all items in the pack
    const baseSeed = customSeed || Math.floor(Math.random() * 2147483647);
    const generatedItems: Array<{
      id: string;
      name: string;
      imageUrl: string;
      category: string;
      subcategory: string;
      seed: number;
    }> = [];

    try {
      // Generate items sequentially to avoid rate limits
      for (let i = 0; i < pack.items.length; i++) {
        const item = pack.items[i];
        const itemSeed = baseSeed + i;
        const prompt = buildAssetPrompt(item, styleId, colorPaletteId);

        // Use FLUX Schnell for speed
        const output = await replicate.run(
          "black-forest-labs/flux-schnell",
          {
            input: {
              prompt,
              seed: itemSeed,
              num_outputs: 1,
              aspect_ratio: "1:1",
              output_format: "png",
              output_quality: 90,
            },
          }
        );

        const imageUrl = Array.isArray(output) ? output[0] : output;

        if (!imageUrl) {
          throw new Error(`Failed to generate item: ${item.name}`);
        }

        // Save to database
        const generation = await prisma.generation.create({
          data: {
            userId: user.id,
            prompt,
            imageUrl: String(imageUrl),
            categoryId: item.category,
            subcategoryId: item.subcategory,
            styleId,
            seed: itemSeed,
            isPublic: false,
          },
        });

        generatedItems.push({
          id: generation.id,
          name: item.name,
          imageUrl: String(imageUrl),
          category: item.category,
          subcategory: item.subcategory,
          seed: itemSeed,
        });
      }

      // Get updated credit balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true },
      });

      return NextResponse.json({
        success: true,
        pack: {
          id: pack.id,
          name: pack.name,
          itemCount: pack.itemCount,
        },
        items: generatedItems,
        baseSeed,
        styleId,
        colorPaletteId,
        creditsUsed: totalCredits,
        creditsRemaining: updatedUser?.credits || 0,
      });
    } catch (genError) {
      // If generation fails, refund credits for items not generated
      const itemsNotGenerated = pack.items.length - generatedItems.length;
      if (itemsNotGenerated > 0) {
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: itemsNotGenerated } },
        });
      }

      console.error("Asset pack generation error:", genError);
      return NextResponse.json(
        {
          error: "Generation failed",
          message:
            genError instanceof Error ? genError.message : "Unknown error",
          partialResults: generatedItems,
          creditsRefunded: itemsNotGenerated,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Asset pack API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
