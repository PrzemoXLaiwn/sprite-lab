"use server";

import { createClient } from "@/lib/supabase/server";
import prisma from "@/lib/prisma";
import { PLANS } from "@/lib/stripe";

// Map plan keys to friendly names
const PLAN_NAMES: Record<string, string> = {
  FREE: PLANS.FREE.name,       // Spark
  STARTER: PLANS.STARTER.name, // Forge
  PRO: PLANS.PRO.name,         // Arsenal
  UNLIMITED: PLANS.UNLIMITED.name, // Titan
};

export async function fetchUserPlan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, plan: "FREE", planName: "Spark" };
  }

  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { plan: true },
    });

    const plan = dbUser?.plan || "FREE";
    const planName = PLAN_NAMES[plan] || "Spark";

    return {
      success: true,
      plan,
      planName,
    };
  } catch (error) {
    console.error("Error fetching user plan:", error);
    return { success: false, plan: "FREE", planName: "Spark" };
  }
}
