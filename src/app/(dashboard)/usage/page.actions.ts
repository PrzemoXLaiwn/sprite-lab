"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserStats, getUserGenerations } from "@/lib/database";

export async function fetchDashboardData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null };
  }

  const [statsResult, recentGens] = await Promise.all([
    getUserStats(user.id),
    getUserGenerations(user.id, 6),
  ]);

  return {
    success: true,
    data: {
      stats: statsResult.stats,
      recentGenerations: recentGens.generations,
    },
  };
}
