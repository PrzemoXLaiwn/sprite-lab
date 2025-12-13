"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import {
  isAdmin,
  isModerator,
  getUserRole,
  getAllUsers,
  grantCreditsAsAdmin,
  getAdminStats,
  setUserActive,
  updateUserRole,
  getReports,
  updateReportStatus,
  getModeratorStats,
  UserRole,
  getUserById,
  getUserGenerations,
} from "@/lib/admin";

export async function checkAdminAccess() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, isAdmin: false, isModerator: false, role: null };
  }

  const [adminStatus, moderatorStatus, role] = await Promise.all([
    isAdmin(user.id),
    isModerator(user.id),
    getUserRole(user.id),
  ]);

  return { success: true, isAdmin: adminStatus, isModerator: moderatorStatus, role };
}

export async function fetchAllUsers(limit: number = 100, offset: number = 0) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", users: [], total: 0 };
  }

  const result = await getAllUsers(user.id, limit, offset);
  return result;
}

export async function grantCredits(targetUserId: string, amount: number, reason?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await grantCreditsAsAdmin(user.id, targetUserId, amount, reason);
  return result;
}

export async function fetchAdminStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", stats: null };
  }

  const result = await getAdminStats(user.id);
  return result;
}

export async function toggleUserActive(targetUserId: string, isActive: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await setUserActive(user.id, targetUserId, isActive);
  return result;
}

export async function changeUserRole(targetUserId: string, newRole: UserRole) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await updateUserRole(user.id, targetUserId, newRole);
  return result;
}

// Moderator actions
export async function fetchReports(status?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", reports: [] };
  }

  const result = await getReports(user.id, status);
  return result;
}

export async function handleReport(
  reportId: string,
  status: "PENDING" | "REVIEWED" | "RESOLVED" | "DISMISSED",
  moderatorNote?: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  const result = await updateReportStatus(user.id, reportId, status, moderatorNote);
  return result;
}

export async function fetchModeratorStats() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", stats: null };
  }

  const result = await getModeratorStats(user.id);
  return result;
}

// Fetch detailed user info for admin view
export async function fetchUserDetails(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", user: null };
  }

  const result = await getUserById(user.id, targetUserId);
  return result;
}

// Fetch user generations for admin view
export async function fetchUserGenerations(targetUserId: string, limit: number = 50) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", generations: [] };
  }

  const result = await getUserGenerations(user.id, targetUserId, limit);
  return result;
}

// Kick user session (force logout) - uses Supabase Admin API
export async function kickUserSession(targetUserId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // Check if caller is admin
  const adminStatus = await isAdmin(user.id);
  if (!adminStatus) {
    return { success: false, error: "Unauthorized: Not an admin" };
  }

  try {
    // Use Supabase Admin API to sign out user
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.auth.admin.signOut(targetUserId);

    if (error) {
      console.error("Failed to kick user session:", error);
      return { success: false, error: error.message };
    }

    console.log(`Admin ${user.id} kicked user ${targetUserId}`);
    return { success: true };
  } catch (error) {
    console.error("Error kicking user:", error);
    return { success: false, error: "Failed to kick user" };
  }
}
