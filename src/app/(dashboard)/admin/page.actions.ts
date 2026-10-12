"use server";

// Slim admin/moderator server actions. The user-management half of the
// old admin panel (user table, role/credits management, broadcast email,
// image-quality audits) was removed when the panel was reduced to a
// counters-only dashboard. The remaining helpers cover:
//
//   - Sidebar gating via <AdminNavLink />
//   - The new counters-only /admin page
//   - The /moderator reports queue (still in use)

import { createClient } from "@/lib/supabase/server";
import {
  isAdmin,
  isModerator,
  getUserRole,
  getAdminStats,
  getReports,
  updateReportStatus,
  getModeratorStats,
} from "@/lib/admin";

export async function checkAdminAccess() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, isAdmin: false, isModerator: false, role: null };
  }

  const [adminStatus, moderatorStatus, role] = await Promise.all([
    isAdmin(user.id),
    isModerator(user.id),
    getUserRole(user.id),
  ]);

  return {
    success: true,
    isAdmin: adminStatus,
    isModerator: moderatorStatus,
    role,
  };
}

export async function fetchAdminStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", stats: null };
  }

  return getAdminStats(user.id);
}

// -----------------------------------------------------------------------------
// Moderator actions — used by /moderator
// -----------------------------------------------------------------------------

export async function fetchReports(status?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", reports: [] };
  }

  return getReports(user.id, status);
}

export async function handleReport(
  reportId: string,
  status: "REVIEWED" | "RESOLVED" | "DISMISSED",
  moderatorNote?: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  return updateReportStatus(user.id, reportId, status, moderatorNote);
}

export async function fetchModeratorStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized", stats: null };
  }

  return getModeratorStats(user.id);
}
