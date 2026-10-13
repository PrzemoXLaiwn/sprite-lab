"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, RefreshCw, Zap, Sparkles } from "lucide-react";
import Link from "next/link";
import { fetchUserData } from "@/app/(dashboard)/layout.actions";

export function CreditsDisplay() {
  const [data, setData] = useState<{ credits: number; plan: string; planName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const result = await fetchUserData();
    if (result.success && result.data) {
      setData({
        credits: result.data.credits,
        plan: result.data.plan,
        planName: result.data.planName,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Defer the initial load out of the effect body (no sync setState).
    const initial = setTimeout(loadData, 0);

    // Auto-refresh every 10 seconds
    const interval = setInterval(loadData, 10000);

    // Listen for custom refresh event
    const handleRefresh = () => loadData();
    window.addEventListener("credits-updated", handleRefresh);

    return () => {
      clearTimeout(initial);
      clearInterval(interval);
      window.removeEventListener("credits-updated", handleRefresh);
    };
  }, [loadData]);

  const handleManualRefresh = () => {
    setLoading(true);
    loadData();
  };

  const credits = data?.credits ?? 0;
  const isLow = credits <= 2;

  if (loading && !data) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#19223F] p-4">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-[#FFA300]" />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-2xl border p-4 transition-colors ${
        isLow
          ? "border-red-400/20 bg-red-500/[0.06]"
          : "border-white/[0.06] bg-[#19223F] hover:border-white/20"
      }`}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className={`h-3.5 w-3.5 ${isLow ? "text-red-300" : "text-[#FFA300]"}`} />
          <span className="text-[12px] text-[#9AA1CC]">Credits</span>
        </div>
        <button
          type="button"
          onClick={handleManualRefresh}
          className="rounded-lg p-1 text-[#8A92BF] transition-colors hover:bg-white/[0.05] hover:text-white"
          title="Refresh credits"
          aria-label="Refresh credits"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Credits count */}
      <div className="mb-2 flex items-baseline gap-1.5">
        <p className={`font-sans tracking-tight text-[28px] font-semibold leading-none tabular-nums ${isLow ? "text-red-200" : "text-white"}`}>
          {credits}
        </p>
        <span className="font-mono text-[11px] text-[#8A92BF]">remaining</span>
      </div>

      {/* Plan badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`px-corners px-2 py-0.5 font-mono text-[11px] font-medium ${
            data?.plan && data.plan !== "FREE"
              ? "bg-[#FFA300]/15 text-[#FFC857]"
              : "bg-white/[0.06] text-[#C8CCE8]"
          }`}
        >
          {data?.planName || "Spark"}
        </span>
        {isLow && <span className="font-mono text-[11px] text-red-200">low balance</span>}
      </div>

      {/* Upgrade button */}
      <Link
        href="/pricing"
        className="px-corners flex w-full items-center justify-center gap-2 bg-[#FFA300] py-2.5 text-[13px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
      >
        <Sparkles className="h-4 w-4" />
        Get more credits
      </Link>
    </div>
  );
}

// Helper function to trigger credits refresh from anywhere
export function triggerCreditsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("credits-updated"));
  }
}
