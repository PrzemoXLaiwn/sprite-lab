"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Sparkles, Zap, Crown, Infinity, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

interface UpgradeModalProps {
  // Can be triggered externally
  forceShow?: boolean;
  onClose?: () => void;
}

const PLANS = [
  {
    name: "Starter",
    price: 9,
    credits: 100,
    icon: Zap,
    color: "#00ff88",
    features: ["100 credits/month", "All generation types", "Basic support"],
    popular: false,
  },
  {
    name: "Pro",
    price: 19,
    credits: 300,
    icon: Crown,
    color: "#c084fc",
    features: ["300 credits/month", "Priority generation", "No watermarks", "Email support"],
    popular: true,
  },
  {
    name: "Unlimited",
    price: 49,
    credits: 1000,
    icon: Infinity,
    color: "#ffd93d",
    features: ["1000 credits/month", "Fastest generation", "API access", "Priority support"],
    popular: false,
  },
];

export function UpgradeModal({ forceShow, onClose }: UpgradeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  const checkCredits = useCallback(async () => {
    // Don't auto-check if force showing or already shown
    if (forceShow || hasShownThisSession) return;

    try {
      const response = await fetch("/api/user/stats");
      if (response.ok) {
        const data = await response.json();
        if (data.credits === 0 && data.plan === "FREE") {
          setIsVisible(true);
          setHasShownThisSession(true);
        }
      }
    } catch (error) {
      console.error("Failed to check credits:", error);
    }
  }, [forceShow, hasShownThisSession]);

  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
    }
  }, [forceShow]);

  useEffect(() => {
    // Check on mount and listen for credit updates
    checkCredits();

    const handleCreditsUpdate = () => {
      // Small delay to let the credits update
      setTimeout(checkCredits, 500);
    };

    window.addEventListener("credits-updated", handleCreditsUpdate);
    return () => window.removeEventListener("credits-updated", handleCreditsUpdate);
  }, [checkCredits]);

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] transition-opacity duration-300"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[101] w-[95vw] max-w-3xl transition-all duration-300">
        <div className="relative bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#00ff88] rounded-full blur-[100px] animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#c084fc] rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="relative p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff4444]/20 border border-[#ff4444]/40 text-[#ff4444] text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                You&apos;re out of credits!
              </div>
              <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                Upgrade to Keep Creating
              </h2>
              <p className="text-white/60 max-w-md mx-auto">
                Choose a plan that fits your needs. All plans include access to our latest AI models and features.
              </p>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {PLANS.map((plan) => {
                const Icon = plan.icon;
                return (
                  <div
                    key={plan.name}
                    className={`relative p-5 rounded-xl border transition-all duration-300 hover:scale-[1.02] ${
                      plan.popular
                        ? "bg-gradient-to-br from-[#c084fc]/20 to-transparent border-[#c084fc]/40"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {/* Popular badge */}
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#c084fc] to-[#00d4ff] text-black text-xs font-bold">
                        MOST POPULAR
                      </div>
                    )}

                    {/* Icon */}
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${plan.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: plan.color }} />
                    </div>

                    {/* Plan name */}
                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>

                    {/* Price */}
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold text-white">${plan.price}</span>
                      <span className="text-white/40">/mo</span>
                    </div>

                    {/* Credits highlight */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                      style={{ backgroundColor: `${plan.color}10`, borderColor: `${plan.color}30` }}
                    >
                      <Sparkles className="w-4 h-4" style={{ color: plan.color }} />
                      <span className="font-bold" style={{ color: plan.color }}>
                        {plan.credits} credits/mo
                      </span>
                    </div>

                    {/* Features */}
                    <ul className="space-y-2 mb-5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/70">
                          <Check className="w-4 h-4 text-[#00ff88]" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    {/* CTA */}
                    <Link href={`/checkout/${plan.name.toLowerCase()}`}>
                      <Button
                        className={`w-full font-medium ${
                          plan.popular
                            ? "bg-gradient-to-r from-[#c084fc] to-[#00d4ff] text-black hover:opacity-90"
                            : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                        }`}
                      >
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>
                );
              })}
            </div>

            {/* Credit packs alternative */}
            <div className="text-center">
              <p className="text-white/40 text-sm mb-2">Just need a few credits?</p>
              <Link
                href="/pricing#credit-packs"
                className="inline-flex items-center gap-2 text-[#00ff88] text-sm font-medium hover:underline"
              >
                View credit packs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Export a function to trigger the modal from anywhere
export function triggerUpgradeModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-upgrade-modal"));
  }
}
