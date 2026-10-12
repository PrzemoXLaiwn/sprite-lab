import { NextResponse } from "next/server";
import { LIFETIME_DEALS, LifetimeDealName } from "@/lib/stripe";
import { getLifetimeSlotsSold } from "@/app/api/stripe/_lib/fulfillment";
import { lifetimeSalesEnabled } from "@/lib/lifetime-sales";

export async function GET() {
  if (!lifetimeSalesEnabled()) return NextResponse.json({ success: true, salesEnabled: false, slots: {} });
  try {
    // Count lifetime users per deal (by lifetimeDeal, falling back to plan
    // for rows created before that column existed)
    const { perDeal } = await getLifetimeSlotsSold();

    // Map to plan counts
    const soldSlots: Record<string, { sold: number; max: number; available: number }> = {};

    for (const [dealKey, deal] of Object.entries(LIFETIME_DEALS)) {
      const sold = perDeal[dealKey as LifetimeDealName] || 0;
      soldSlots[dealKey] = {
        sold,
        max: deal.maxSlots,
        available: Math.max(0, deal.maxSlots - sold),
      };
    }

    return NextResponse.json({
      success: true,
      salesEnabled: true,
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
