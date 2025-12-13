import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LIFETIME_DEALS } from "@/lib/stripe";

export async function GET() {
  try {
    // Count users with lifetime deals for each plan
    const lifetimeCounts = await prisma.user.groupBy({
      by: ["plan"],
      where: {
        isLifetime: true,
      },
      _count: {
        plan: true,
      },
    });

    // Map to plan counts
    const soldSlots: Record<string, { sold: number; max: number; available: number }> = {};

    for (const [dealKey, deal] of Object.entries(LIFETIME_DEALS)) {
      const planCount = lifetimeCounts.find((c) => c.plan === deal.basePlan);
      const sold = planCount?._count.plan || 0;
      soldSlots[dealKey] = {
        sold,
        max: deal.maxSlots,
        available: Math.max(0, deal.maxSlots - sold),
      };
    }

    return NextResponse.json({
      success: true,
      slots: soldSlots,
    });
  } catch (error) {
    console.error("Error fetching lifetime slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch slots" },
      { status: 500 }
    );
  }
}
