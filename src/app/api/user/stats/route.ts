import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserStats } from "@/lib/database";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const result = await getUserStats(user.id);

    if (!result.success || !result.stats) {
      return NextResponse.json(
        { totalGenerations: 0, credits: 0, plan: "FREE" },
        { status: 200 }
      );
    }

    return NextResponse.json(result.stats);
  } catch (error) {
    console.error("Failed to fetch user stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
