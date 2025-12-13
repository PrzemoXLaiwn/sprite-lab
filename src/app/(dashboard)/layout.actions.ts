"use server";

import { createClient } from "@/lib/supabase/server";
import { getOrCreateUser, getUserCredits } from "@/lib/database";
import { PLANS } from "@/lib/stripe";

// Map plan keys to friendly names
const PLAN_NAMES: Record<string, string> = {
  FREE: PLANS.FREE.name,       // Spark
  STARTER: PLANS.STARTER.name, // Forge
  PRO: PLANS.PRO.name,         // Arsenal
  UNLIMITED: PLANS.UNLIMITED.name, // Titan
};

export async function fetchUserData() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, data: null };
  }

  // Ensure user exists in database
  await getOrCreateUser(user.id, user.email!);

  // Get credits and plan
  const creditsData = await getUserCredits(user.id);
  const plan = creditsData.plan || "FREE";
  const planName = PLAN_NAMES[plan] || "Spark";

  return {
    success: true,
    data: {
      email: user.email!,
      credits: creditsData.credits,
      plan: plan,
      planName: planName,
    },
  };
}
