"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchUserData } from "@/app/(dashboard)/layout.actions";

interface UserPlanBadgeProps {
  email: string;
}

export function UserPlanBadge({ email }: UserPlanBadgeProps) {
  const [planName, setPlanName] = useState<string>("Loading...");

  const loadData = useCallback(async () => {
    const result = await fetchUserData();
    if (result.success && result.data) {
      setPlanName(result.data.planName);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);

    // Listen for custom refresh event
    const handleRefresh = () => loadData();
    window.addEventListener("credits-updated", handleRefresh);

    return () => {
      clearInterval(interval);
      window.removeEventListener("credits-updated", handleRefresh);
    };
  }, [loadData]);

  return (
    <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/5">
      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#00ff88]/30 to-[#00d4ff]/30 flex items-center justify-center text-sm font-bold text-white">
        {email?.[0].toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate text-white/80">{email}</p>
        <p className="text-xs text-white/40">{planName} Plan</p>
      </div>
    </div>
  );
}
