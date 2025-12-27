"use client";

import { useState, useEffect, useCallback } from "react";
import { Gift, X, Sparkles, Flame, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { triggerCreditsRefresh } from "./CreditsDisplay";

interface DailyBonusData {
  currentStreak: number;
  totalBonusCredits: number;
  canClaim: boolean;
  lastClaimedAt: string | null;
  nextBonus: {
    credits: number;
    newStreak: number;
    milestone: string | null;
  } | null;
  streakWillReset: boolean;
  bonusStructure: {
    daily: number;
    streak3: number;
    streak7: number;
    streak14: number;
    streak30: number;
  };
}

interface ClaimResult {
  success: boolean;
  creditsAwarded: number;
  newStreak: number;
  totalCredits: number;
  milestone: string | null;
  message: string;
  nextMilestone: { days: number; bonus: number } | null;
}

export function DailyBonusPopup() {
  const [bonusData, setBonusData] = useState<DailyBonusData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<ClaimResult | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const fetchBonusStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/daily-bonus");
      if (response.ok) {
        const data = await response.json();
        setBonusData(data);
        // 🔥 FIX: Show immediately if user can claim (removed 500ms delay)
        if (data.canClaim) {
          setIsVisible(true);
        }
      }
    } catch (error) {
      console.error("Failed to fetch daily bonus:", error);
    }
  }, []);

  useEffect(() => {
    // 🔥 FIX: Check immediately, no artificial delay
    // Just wait for DOM to be ready (next tick)
    const checkBonus = () => {
      const onboardingComplete = localStorage.getItem("spritelab_onboarding_complete");
      if (onboardingComplete === "true") {
        fetchBonusStatus();
      }
    };

    // Use requestAnimationFrame for smoother initialization
    // This ensures DOM is ready but doesn't add artificial delays
    requestAnimationFrame(() => {
      requestAnimationFrame(checkBonus);
    });
  }, [fetchBonusStatus]);

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);

    try {
      const response = await fetch("/api/daily-bonus", {
        method: "POST",
      });
      const data = await response.json();

      if (data.success) {
        setClaimResult(data);
        setShowConfetti(true);
        triggerCreditsRefresh();

        // Auto-close after 4 seconds
        setTimeout(() => {
          handleClose();
        }, 4000);
      }
    } catch (error) {
      console.error("Failed to claim bonus:", error);
    } finally {
      setIsClaiming(false);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      setBonusData(null);
      setClaimResult(null);
      setShowConfetti(false);
    }, 300);
  };

  if (!bonusData?.canClaim && !claimResult) return null;

  const streakDays = claimResult?.newStreak ?? bonusData?.nextBonus?.newStreak ?? 1;
  const isMilestone = claimResult?.milestone || bonusData?.nextBonus?.milestone;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={handleClose}
      />

      {/* Popup */}
      <div
        className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[90vw] max-w-md transition-all duration-300 ${
          isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
        }`}
      >
        <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-2xl border border-[#00ff88]/30 overflow-hidden shadow-2xl">
          {/* Glow effects */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#00ff88]/10 via-transparent to-[#ffd93d]/10 pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-40 bg-[#00ff88]/20 rounded-full blur-3xl" />

          {/* Confetti */}
          {showConfetti && (
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              {[...Array(30)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 rounded-full animate-confetti"
                  style={{
                    left: `${Math.random() * 100}%`,
                    backgroundColor: ["#00ff88", "#00d4ff", "#ffd93d", "#ff6b6b", "#c084fc"][i % 5],
                    animationDelay: `${Math.random() * 1}s`,
                    animationDuration: `${2 + Math.random() * 2}s`,
                  }}
                />
              ))}
            </div>
          )}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative p-6 pt-8 text-center">
            {/* Icon */}
            <div className="relative mx-auto w-24 h-24 mb-4">
              <div className={`absolute inset-0 rounded-full blur-xl opacity-60 animate-pulse ${
                isMilestone ? "bg-gradient-to-r from-[#ffd93d] to-[#ff6b6b]" : "bg-[#00ff88]"
              }`} />
              <div className={`relative w-full h-full rounded-full flex items-center justify-center ${
                isMilestone
                  ? "bg-gradient-to-br from-[#ffd93d] to-[#ff6b6b]"
                  : "bg-gradient-to-br from-[#00ff88] to-[#00d4ff]"
              } ${claimResult ? "animate-bounce-slow" : ""}`}>
                {isMilestone ? (
                  <Flame className="w-12 h-12 text-white" />
                ) : (
                  <Gift className="w-12 h-12 text-white" />
                )}
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-[#ffd93d] animate-bounce" />
            </div>

            {/* Title */}
            <h2 className="text-2xl font-display font-bold text-white mb-2">
              {claimResult
                ? (claimResult.milestone || "Daily Bonus Claimed!")
                : (bonusData?.nextBonus?.milestone || "Daily Login Bonus!")}
            </h2>

            {/* Streak badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#ff6b6b]/20 to-[#ffd93d]/20 border border-[#ffd93d]/30 mb-4">
              <Flame className="w-4 h-4 text-[#ffd93d]" />
              <span className="text-[#ffd93d] font-bold">{streakDays} Day Streak!</span>
            </div>

            {/* Credits display */}
            {claimResult ? (
              <div className="mb-6">
                <span className="text-6xl font-display font-bold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-transparent bg-clip-text">
                  +{claimResult.creditsAwarded}
                </span>
                <span className="text-lg text-white/60 ml-2">credits</span>
                <p className="text-white/70 mt-2">{claimResult.message}</p>

                {/* Next milestone preview */}
                {claimResult.nextMilestone && (
                  <div className="mt-4 p-3 rounded-lg bg-white/5 border border-white/10">
                    <div className="flex items-center justify-center gap-2 text-sm text-white/60">
                      <Calendar className="w-4 h-4" />
                      <span>Next milestone:</span>
                      <span className="text-[#ffd93d] font-bold">Day {claimResult.nextMilestone.days}</span>
                      <ChevronRight className="w-4 h-4" />
                      <span className="text-[#00ff88] font-bold">+{claimResult.nextMilestone.bonus} bonus</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6">
                <span className="text-5xl font-display font-bold bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-transparent bg-clip-text">
                  +{bonusData?.nextBonus?.credits || 1}
                </span>
                <span className="text-lg text-white/60 ml-2">credits</span>

                {/* Streak warning */}
                {bonusData?.streakWillReset && (
                  <div className="mt-3 p-2 rounded-lg bg-[#ff6b6b]/10 border border-[#ff6b6b]/30">
                    <p className="text-sm text-[#ff6b6b]">
                      Your {bonusData.currentStreak}-day streak will reset if you don&apos;t claim!
                    </p>
                  </div>
                )}

                {/* Bonus structure preview */}
                <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
                  {[
                    { day: 3, bonus: bonusData?.bonusStructure.streak3 || 2 },
                    { day: 7, bonus: bonusData?.bonusStructure.streak7 || 5 },
                    { day: 14, bonus: bonusData?.bonusStructure.streak14 || 10 },
                    { day: 30, bonus: bonusData?.bonusStructure.streak30 || 20 },
                  ].map(({ day, bonus }) => (
                    <div
                      key={day}
                      className={`p-2 rounded-lg ${
                        streakDays >= day
                          ? "bg-[#00ff88]/20 border border-[#00ff88]/40"
                          : "bg-white/5 border border-white/10"
                      }`}
                    >
                      <div className={streakDays >= day ? "text-[#00ff88]" : "text-white/40"}>
                        Day {day}
                      </div>
                      <div className={`font-bold ${streakDays >= day ? "text-white" : "text-white/60"}`}>
                        +{bonus}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CTA Button */}
            {claimResult ? (
              <Button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold py-6 rounded-xl hover:opacity-90 transition-opacity"
              >
                Awesome! Keep the streak going!
              </Button>
            ) : (
              <Button
                onClick={handleClaim}
                disabled={isClaiming}
                className="w-full bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold py-6 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isClaiming ? "Claiming..." : "Claim Daily Bonus!"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes confetti {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti 3s ease-out forwards;
        }
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 1s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}