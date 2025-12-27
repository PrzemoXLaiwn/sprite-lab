import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isOwner } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

// Runware API model costs (USD per image)
// Based on: https://runware.ai/pricing
const MODEL_COSTS: Record<string, number> = {
  "flux-schnell": 0.003,  // FLUX.1 Schnell - fast, 4 steps
  "flux-dev": 0.01,       // FLUX.1 Dev - quality, 25 steps
  "flux-pro": 0.03,       // FLUX.1.1 Pro - premium quality
};

// Default cost for Runware (average between schnell and dev)
const DEFAULT_COST = 0.007;

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

    // Update each generation with estimated Runware cost
    let updated = 0;
    for (const gen of generationsWithoutCost) {
      // Estimate cost based on user tier/style
      // Free tier uses flux-schnell, Starter uses flux-dev, Pro uses flux-pro
      let cost = DEFAULT_COST;

      // Pixel art and simpler styles - likely free tier (flux-schnell)
      if (gen.styleId?.includes("PIXEL") || gen.styleId?.includes("8BIT") || gen.styleId?.includes("16BIT")) {
        cost = MODEL_COSTS["flux-schnell"];
      }
      // High quality styles - likely starter/pro tier (flux-dev)
      else if (gen.styleId?.includes("HAND_PAINTED") || gen.styleId?.includes("ANIME") || gen.styleId?.includes("DARK_FANTASY")) {
        cost = MODEL_COSTS["flux-dev"];
      }
      // Default to flux-schnell for most generations (free tier was most common)
      else {
        cost = MODEL_COSTS["flux-schnell"];
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
