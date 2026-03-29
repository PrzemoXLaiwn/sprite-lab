"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
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

  const handleManualRefresh = () => {
    setLoading(true);
    loadData();
  };

  const credits = data?.credits ?? 0;
  const isLow = credits <= 2;

  if (loading && !data) {
    return (
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#FF6B2C]/10 to-[#FF6B2C]/10 border border-[#FF6B2C]/20">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#FF6B2C]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative p-4 rounded-xl overflow-hidden border transition-all duration-300 ${
      isLow
        ? "bg-gradient-to-br from-[#ef4444]/10 to-[#ef4444]/5 border-[#ef4444]/30"
        : "bg-gradient-to-br from-[#FF6B2C]/10 to-[#FF6B2C]/10 border-[#FF6B2C]/20 hover:border-[#FF6B2C]/40"
    }`}>
      {/* Animated glow */}
      <div className={`absolute inset-0 rounded-xl opacity-50 blur-xl ${
        isLow ? "bg-[#ef4444]/10" : "bg-[#FF6B2C]/10"
      }`} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isLow ? "bg-[#ef4444]/20" : "bg-[#FF6B2C]/20"
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isLow ? "text-[#ef4444]" : "text-[#FF6B2C]"}`} />
            </div>
            <span className="text-xs font-medium text-white/60">Credits</span>
          </div>
          <button
            onClick={handleManualRefresh}
            className="text-white/40 hover:text-white/80 transition-colors p-1 hover:bg-white/5 rounded-lg"
            title="Refresh credits"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Credits count */}
        <div className="flex items-baseline gap-1 mb-1">
          <p className={`text-3xl font-bold ${isLow ? "text-[#ef4444]" : "text-white"}`}>
            {credits}
          </p>
          <span className="text-xs text-white/40">remaining</span>
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
            data?.plan === "PRO"
              ? "bg-[#8b5cf6]/20 text-[#8b5cf6] border border-[#8b5cf6]/30"
              : data?.plan === "UNLIMITED"
              ? "bg-[#f59e0b]/20 text-[#f59e0b] border border-[#f59e0b]/30"
              : data?.plan === "STARTER"
              ? "bg-[#FF6B2C]/20 text-[#FF6B2C] border border-[#FF6B2C]/30"
              : "bg-white/10 text-white/60 border border-white/10"
          }`}>
            {data?.planName || "Spark"}
          </span>
          {isLow && (
            <span className="text-[10px] text-[#ef4444] animate-pulse">Low balance!</span>
          )}
        </div>

        {/* Upgrade button */}
        <Link
          href="/pricing"
          className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-[#FF6B2C]/20 to-[#FF6B2C]/20 border border-[#FF6B2C]/30 text-[#FF6B2C] text-sm font-medium hover:from-[#FF6B2C]/30 hover:to-[#FF6B2C]/30 transition-all"
        >
          <Sparkles className="w-4 h-4 group-hover:animate-pulse" />
          Get More Credits
        </Link>
      </div>
    </div>
  );
}

// Helper function to trigger credits refresh from anywhere
export function triggerCreditsRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("credits-updated"));
  }
}
