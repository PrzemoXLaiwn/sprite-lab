"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, Clock, Sparkles } from "lucide-react";
import Link from "next/link";

interface SlotInfo {
  sold: number;
  max: number;
  available: number;
}

export function LifetimePromoPopup() {
  const [isVisible, setIsVisible] = useState(false);
  const [totalSlotsLeft, setTotalSlotsLeft] = useState(50);

  useEffect(() => {
    // Check if user dismissed popup recently (within 1 hour)
    const dismissedAt = localStorage.getItem("lifetimePopupDismissed");
    if (dismissedAt) {
      const hourAgo = Date.now() - 60 * 60 * 1000;
      if (parseInt(dismissedAt) > hourAgo) {
        return; // Don't show if dismissed within last hour
      }
    }

    // Fetch slots and show popup after delay
    const timer = setTimeout(() => {
      fetch("/api/lifetime-slots")
        .then((res) => res.json())
        .then((data) => {
          if (data.slots) {
            const total = Object.values(data.slots as Record<string, SlotInfo>).reduce(
              (sum, slot) => sum + slot.available,
              0
            );
            setTotalSlotsLeft(total);
            if (total > 0) {
              setIsVisible(true);
            }
          }
        })
        .catch(console.error);
    }, 5000); // Show after 5 seconds

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("lifetimePopupDismissed", Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 animate-in fade-in duration-300"
        onClick={handleDismiss}
      />

      {/* Popup */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90%] max-w-lg animate-in zoom-in-95 fade-in duration-300">
        <div className="relative bg-gradient-to-b from-gray-900 to-black border-2 border-yellow-500/50 rounded-2xl p-8 shadow-2xl shadow-yellow-500/20">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Glowing corners */}
          <div className="absolute top-0 left-0 w-20 h-20 bg-yellow-500/20 rounded-full blur-2xl" />
          <div className="absolute bottom-0 right-0 w-20 h-20 bg-orange-500/20 rounded-full blur-2xl" />

          {/* Content */}
          <div className="relative text-center">
            {/* Urgency badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-500/20 text-red-400 text-sm font-bold mb-4 animate-pulse border border-red-500/50">
              <AlertTriangle className="w-4 h-4" />
              LIMITED TIME OFFER
              <AlertTriangle className="w-4 h-4" />
            </div>

            {/* Main headline */}
            <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-white">
              <span className="bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
                LIFETIME ACCESS
              </span>
            </h2>
            <p className="text-white/80 mb-4">
              Pay once, get credits <span className="text-yellow-500 font-bold">FOREVER</span>
            </p>

            {/* Slots counter */}
            <div className="bg-black/50 rounded-xl p-4 mb-6 border border-yellow-500/30">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="w-5 h-5 text-yellow-500" />
                <span className="text-lg font-bold text-white">
                  Only <span className="text-yellow-500 text-2xl">{totalSlotsLeft}</span> spots left!
                </span>
              </div>
              <div className="h-3 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
                  style={{ width: `${((50 - totalSlotsLeft) / 50) * 100}%` }}
                />
              </div>
              <p className="text-xs text-white/50 mt-2">
                {50 - totalSlotsLeft} of 50 spots claimed
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-2 mb-6 text-sm">
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                No monthly fees
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Credits refresh monthly
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Up to 50% savings
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <Sparkles className="w-4 h-4 text-yellow-500" />
                Never expires
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-lg py-6 hover:opacity-90"
                asChild
              >
                <Link href="#pricing">
                  Claim Your Lifetime Spot
                </Link>
              </Button>
              <button
                onClick={handleDismiss}
                className="text-sm text-white/50 hover:text-white/80 transition-colors"
              >
                Maybe later
              </button>
            </div>

            {/* Urgency footer */}
            <p className="text-xs text-red-400 mt-4">
              Once these 50 spots are gone, lifetime deals will NEVER be offered again.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// Floating banner that sticks to bottom
export function LifetimePromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [totalSlotsLeft, setTotalSlotsLeft] = useState(50);

  useEffect(() => {
    // Show banner after scrolling past hero
    const handleScroll = () => {
      if (window.scrollY > 500) {
        setIsVisible(true);
      }
    };

    // Fetch slots
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          const total = Object.values(data.slots as Record<string, SlotInfo>).reduce(
            (sum, slot) => sum + slot.available,
            0
          );
          setTotalSlotsLeft(total);
        }
      })
      .catch(console.error);

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (!isVisible || totalSlotsLeft <= 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-r from-yellow-600 via-orange-500 to-red-500 text-black py-3 px-4 shadow-lg animate-in slide-in-from-bottom duration-500">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 animate-pulse" />
          <span className="font-bold">
            LIFETIME DEAL: Only {totalSlotsLeft} of 50 spots remaining!
          </span>
          <span className="hidden sm:inline text-black/80">
            Pay once, use forever. No monthly fees.
          </span>
        </div>
        <Button
          size="sm"
          className="bg-black text-white hover:bg-black/80 font-bold"
          asChild
        >
          <Link href="#pricing">
            Claim Now
          </Link>
        </Button>
      </div>
    </div>
  );
}
