"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserGenerations, deleteGeneration, getUserCredits } from "@/lib/database";

export async function fetchUserGenerations() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", generations: [] };
  }

  const result = await getUserGenerations(user.id);
  return result;
}

export async function deleteUserGeneration(generationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await deleteGeneration(generationId, user.id);
  return result;
}

export async function fetchUserPlan() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", plan: "FREE", role: "USER" };
  }

  const result = await getUserCredits(user.id);
  return { success: result.success, plan: result.plan, role: result.role };
}
