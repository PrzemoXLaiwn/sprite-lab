"use client";

import { useState, useEffect } from "react";
import { X, Zap, Gift, TrendingUp } from "lucide-react";
import Link from "next/link";

// FOMO Config - Total slots available
const TOTAL_SLOTS = 100;

export function PromoBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const [totalAssets, setTotalAssets] = useState(1247);
  const [claimedSlots, setClaimedSlots] = useState(0);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("promoBannerDismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Fetch real data in parallel
    Promise.all([
      // Fetch total assets count
      fetch("/api/stats/total-generations")
        .then((res) => res.json())
        .then((data) => {
          if (data.total) {
            setTotalAssets(data.total);
          }
        })
        .catch(() => {}),
      // Fetch claimed lifetime slots
      fetch("/api/lifetime-slots")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.slots) {
            // Sum all sold slots across all plans
            const totalSold = Object.values(data.slots as Record<string, { sold: number }>)
              .reduce((sum, slot) => sum + slot.sold, 0);
            setClaimedSlots(totalSold);
          }
        })
        .catch(() => {}),
    ]);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("promoBannerDismissed", "true");
  };

  const slotsRemaining = Math.max(0, TOTAL_SLOTS - claimedSlots);

  if (isDismissed) return null;

  return (
    <div className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-black">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Main content */}
          <div className="flex items-center gap-6 flex-1 overflow-x-auto">
            {/* FOMO - First 100 Users */}
            <Link
              href="/pricing"
              className="flex items-center gap-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              <Zap className="w-4 h-4 animate-pulse" />
              <span className="font-bold">FIRST 100 USERS:</span>
              <span>Only {slotsRemaining} spots left!</span>
              <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-bold">
                50% OFF forever
              </span>
            </Link>

            {/* Separator */}
            <span className="hidden md:inline text-black/30">|</span>

            {/* Social Proof - Total Assets */}
            <div className="hidden md:flex items-center gap-2 whitespace-nowrap">
              <TrendingUp className="w-4 h-4" />
              <span className="font-semibold">{totalAssets.toLocaleString()}</span>
              <span className="text-black/80">assets created</span>
            </div>

            {/* Separator */}
            <span className="hidden lg:inline text-black/30">|</span>

            {/* Credit Bonus */}
            <Link
              href="/pricing#credits"
              className="hidden lg:flex items-center gap-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              <Gift className="w-4 h-4" />
              <span className="font-semibold">FREE bonus credits</span>
              <span className="text-black/80">on all packs</span>
            </Link>
          </div>

          {/* CTA Button */}
          <Link
            href="/pricing"
            className="hidden sm:flex items-center gap-1 bg-black text-white px-3 py-1.5 rounded-full text-sm font-bold hover:bg-black/80 transition-colors whitespace-nowrap"
          >
            Claim 50% OFF
          </Link>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-black/10 rounded transition-colors"
            aria-label="Close banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
