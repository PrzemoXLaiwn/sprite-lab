"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, Zap, Crown, Infinity as InfinityIcon, Check, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

// =============================================================================
// UpgradeModal
// =============================================================================
// Surfaces the three subscription plans when a user runs out of credits.
//
// Migrated from a hand-rolled overlay to Radix Dialog so we get focus trap,
// Escape-to-close, click-outside, and proper aria roles for free. The custom
// version had none of those — keyboard users were stuck once the modal opened.
//
// Open triggers:
//   - `forceShow` prop (used by tests / external integrations)
//   - "show-upgrade-modal" CustomEvent → triggerUpgradeModal()
//   - Auto-poll: when /api/user/stats reports credits === 0 on a FREE plan
//                (only fires once per session — anti-nag)
// =============================================================================

interface UpgradeModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

const PLANS = [
  {
    name: "Starter",
    slug: "starter",
    price: 5,
    credits: 250,
    icon: Zap,
    color: "#FF6B2C",
    features: ["250 credits/month", "All art styles", "Background removal", "Commercial license"],
    popular: false,
  },
  {
    name: "Pro",
    slug: "pro",
    price: 12,
    credits: 500,
    icon: Crown,
    color: "#8b5cf6",
    features: ["500 credits/month", "Premium AI model", "Sprite sheets", "Image editing"],
    popular: true,
  },
  {
    name: "Studio",
    slug: "unlimited",
    price: 25,
    credits: 1200,
    icon: InfinityIcon,
    color: "#f59e0b",
    features: ["1200 credits/month", "Everything in Pro", "Priority support", "Early access"],
    popular: false,
  },
];

export function UpgradeModal({ forceShow, onClose }: UpgradeModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  useEffect(() => {
    if (forceShow) setIsVisible(true);
  }, [forceShow]);

  useEffect(() => {
    let cancelled = false;

    const checkCredits = async () => {
      if (cancelled || forceShow || hasShownThisSession) return;
      try {
        const res = await fetch("/api/user/stats");
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.credits === 0 && data.plan === "FREE" && !cancelled) {
          setIsVisible(true);
          setHasShownThisSession(true);
        }
      } catch (err) {
        console.error("[UpgradeModal] Stats check failed:", err);
      }
    };

    void checkCredits();

    const handleCreditsUpdate = () => {
      // Small delay so the new balance has hit the DB.
      setTimeout(checkCredits, 500);
    };

    // Listen for the manual trigger dispatched by triggerUpgradeModal().
    // /api/generate emits "show-upgrade-modal" on 402 — without this listener
    // the modal stayed shut at the exact moment of upgrade intent.
    const handleManualOpen = () => setIsVisible(true);

    window.addEventListener("credits-updated", handleCreditsUpdate);
    window.addEventListener("show-upgrade-modal", handleManualOpen);

    return () => {
      cancelled = true;
      window.removeEventListener("credits-updated", handleCreditsUpdate);
      window.removeEventListener("show-upgrade-modal", handleManualOpen);
    };
  }, [forceShow, hasShownThisSession]);

  const handleOpenChange = (open: boolean) => {
    setIsVisible(open);
    if (!open) onClose?.();
  };

  return (
    <Dialog.Root open={isVisible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1a1a2e] to-[#0f0f1a] shadow-2xl outline-none data-[state=open]:opacity-100 data-[state=closed]:opacity-0 transition-opacity duration-200"
          aria-describedby="upgrade-modal-description"
        >
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-30 pointer-events-none rounded-2xl overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-[#FF6B2C] rounded-full blur-[100px] animate-pulse" />
            <div
              className="absolute bottom-0 right-1/4 w-64 h-64 bg-[#8b5cf6] rounded-full blur-[100px] animate-pulse"
              style={{ animationDelay: "1s" }}
            />
          </div>

          {/* Close button */}
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute top-4 right-4 p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors z-10 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
            >
              <X className="w-5 h-5" />
            </button>
          </Dialog.Close>

          <div className="relative p-6 md:p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#ef4444] text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                You&apos;re out of credits!
              </div>
              <Dialog.Title asChild>
                <h2 className="text-3xl md:text-4xl font-display font-bold text-white mb-3">
                  Upgrade to Keep Creating
                </h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p id="upgrade-modal-description" className="text-white/60 max-w-md mx-auto">
                  Choose a plan that fits your needs. All plans include access to our latest AI models and features.
                </p>
              </Dialog.Description>
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
                        ? "bg-gradient-to-br from-[#8b5cf6]/20 to-transparent border-[#8b5cf6]/40"
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#FF6B2C] text-black text-xs font-bold">
                        MOST POPULAR
                      </div>
                    )}

                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                      style={{ backgroundColor: `${plan.color}20` }}
                    >
                      <Icon className="w-6 h-6" style={{ color: plan.color }} />
                    </div>

                    <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>

                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-bold text-white">£{plan.price}</span>
                      <span className="text-white/60">/mo</span>
                    </div>

                    <div
                      className="flex items-center gap-2 px-3 py-2 rounded-lg mb-4"
                      style={{ backgroundColor: `${plan.color}10`, borderColor: `${plan.color}30` }}
                    >
                      <Sparkles className="w-4 h-4" style={{ color: plan.color }} />
                      <span className="font-bold" style={{ color: plan.color }}>
                        {plan.credits} credits/mo
                      </span>
                    </div>

                    <ul className="space-y-2 mb-5">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-white/80">
                          <Check className="w-4 h-4 text-[#FF6B2C] shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Button
                      asChild
                      className={`w-full font-medium ${
                        plan.popular
                          ? "bg-gradient-to-r from-[#8b5cf6] to-[#FF6B2C] text-black hover:opacity-90"
                          : "bg-white/10 text-white border border-white/20 hover:bg-white/20"
                      }`}
                    >
                      <Link href={`/checkout/${plan.slug}`}>
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <p className="text-white/60 text-sm mb-2">Just need a few credits?</p>
              <Link
                href="/pricing#credit-packs"
                className="inline-flex items-center gap-2 text-[#FF6B2C] text-sm font-medium hover:underline"
              >
                View credit packs
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Trigger the modal from anywhere (the matching listener is in the
// useEffect above).
export function triggerUpgradeModal() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-upgrade-modal"));
  }
}
