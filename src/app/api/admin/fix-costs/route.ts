import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Model costs for historical data
const MODEL_COSTS: Record<string, number> = {
  "flux-dev": 0.025,
  "flux-schnell": 0.003,
  "sdxl": 0.0023,
};

// Default cost if model unknown (average)
const DEFAULT_COST = 0.015;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER can run this migration
    const isOwnerUser = await isOwner(user.id);
    if (!isOwnerUser) {
      return NextResponse.json({ error: "Only OWNER can fix costs" }, { status: 403 });
    }

    // Find all generations without cost
    const generationsWithoutCost = await prisma.generation.findMany({
      where: {
        replicateCost: null,
      },
      select: {
        id: true,
        styleId: true,
      },
    });

    console.log(`Found ${generationsWithoutCost.length} generations without cost`);

    // Update each generation with estimated cost
    let updated = 0;
    for (const gen of generationsWithoutCost) {
      // Try to determine model from styleId
      // Most styles use flux-dev or sdxl
      let cost = DEFAULT_COST;

      // Pixel art styles typically use SDXL
      if (gen.styleId?.includes("PIXEL") || gen.styleId?.includes("8BIT") || gen.styleId?.includes("16BIT")) {
        cost = MODEL_COSTS["sdxl"];
      }
      // High quality styles use flux-dev
      else if (gen.styleId?.includes("HAND_PAINTED") || gen.styleId?.includes("ANIME") || gen.styleId?.includes("DARK_FANTASY")) {
        cost = MODEL_COSTS["flux-dev"];
      }
      // Default to sdxl for most game art
      else {
        cost = MODEL_COSTS["sdxl"];
      }

      await prisma.generation.update({
        where: { id: gen.id },
        data: { replicateCost: cost },
      });
      updated++;
    }

    // Calculate total cost
    const totalCost = await prisma.generation.aggregate({
      _sum: { replicateCost: true },
      _count: true,
    });

    return NextResponse.json({
      success: true,
      updated,
      totalGenerations: totalCost._count,
      totalCost: totalCost._sum.replicateCost || 0,
      message: `Updated ${updated} generations with estimated costs`,
    });
  } catch (error) {
    console.error("Fix costs error:", error);
    return NextResponse.json(
      { error: "Failed to fix costs" },
      { status: 500 }
    );
  }
}
