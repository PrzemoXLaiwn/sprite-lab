"use client";

import { useState, useEffect } from "react";
import { X, Sparkles, Clock, Zap, Gift } from "lucide-react";
import Link from "next/link";

interface SlotInfo {
  sold: number;
  max: number;
  available: number;
}

export function PromoBanner() {
  const [isVisible, setIsVisible] = useState(true);
  const [totalSlotsLeft, setTotalSlotsLeft] = useState(50);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if dismissed in this session
    const dismissed = sessionStorage.getItem("promoBannerDismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    // Fetch lifetime slots
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          const total = Object.values(data.slots as Record<string, SlotInfo>).reduce(
            (sum, slot) => sum + slot.available,
            0
          );
          setTotalSlotsLeft(total);
          if (total <= 0) {
            setIsVisible(false);
          }
        }
      })
      .catch(console.error);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("promoBannerDismissed", "true");
  };

  if (!isVisible || isDismissed) return null;

  return (
    <div className="sticky top-0 left-0 right-0 z-50 bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 text-black">
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Main content */}
          <div className="flex items-center gap-6 flex-1 overflow-x-auto">
            {/* Lifetime Deal */}
            <Link
              href="/pricing#lifetime"
              className="flex items-center gap-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="font-bold">LIFETIME DEAL:</span>
              <span>Only {totalSlotsLeft}/50 spots left!</span>
              <span className="bg-black/20 px-2 py-0.5 rounded text-xs font-bold">
                Pay once, use FOREVER
              </span>
            </Link>

            {/* Separator */}
            <span className="hidden md:inline text-black/30">|</span>

            {/* Launch Promo */}
            <Link
              href="/pricing"
              className="hidden md:flex items-center gap-2 whitespace-nowrap hover:opacity-80 transition-opacity"
            >
              <Zap className="w-4 h-4" />
              <span className="font-semibold">50% OFF</span>
              <span className="text-black/80">first month on all plans</span>
            </Link>

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
            View Deals
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
