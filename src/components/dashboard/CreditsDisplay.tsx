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
      <div className="p-4 rounded-xl bg-gradient-to-br from-[#00ff88]/10 to-[#00d4ff]/10 border border-[#00ff88]/20">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-[#00ff88]" />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative p-4 rounded-xl overflow-hidden border transition-all duration-300 ${
      isLow
        ? "bg-gradient-to-br from-[#ff4444]/10 to-[#ff4444]/5 border-[#ff4444]/30"
        : "bg-gradient-to-br from-[#00ff88]/10 to-[#00d4ff]/10 border-[#00ff88]/20 hover:border-[#00ff88]/40"
    }`}>
      {/* Animated glow */}
      <div className={`absolute inset-0 rounded-xl opacity-50 blur-xl ${
        isLow ? "bg-[#ff4444]/10" : "bg-[#00ff88]/10"
      }`} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${
              isLow ? "bg-[#ff4444]/20" : "bg-[#00ff88]/20"
            }`}>
              <Zap className={`w-3.5 h-3.5 ${isLow ? "text-[#ff4444]" : "text-[#00ff88]"}`} />
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
          <p className={`text-3xl font-bold ${isLow ? "text-[#ff4444]" : "text-white"}`}>
            {credits}
          </p>
          <span className="text-xs text-white/40">remaining</span>
        </div>

        {/* Plan badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
            data?.plan === "PRO"
              ? "bg-[#c084fc]/20 text-[#c084fc] border border-[#c084fc]/30"
              : data?.plan === "UNLIMITED"
              ? "bg-[#ffd93d]/20 text-[#ffd93d] border border-[#ffd93d]/30"
              : data?.plan === "STARTER"
              ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
              : "bg-white/10 text-white/60 border border-white/10"
          }`}>
            {data?.planName || "Spark"}
          </span>
          {isLow && (
            <span className="text-[10px] text-[#ff4444] animate-pulse">Low balance!</span>
          )}
        </div>

        {/* Upgrade button */}
        <Link
          href="/pricing"
          className="group flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-gradient-to-r from-[#00ff88]/20 to-[#00d4ff]/20 border border-[#00ff88]/30 text-[#00ff88] text-sm font-medium hover:from-[#00ff88]/30 hover:to-[#00d4ff]/30 transition-all"
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
