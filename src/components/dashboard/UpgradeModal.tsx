"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Zap, Check, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { PLAN_FEATURES } from "@/config/plan-features";

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
    // Skip the credits line (shown separately) — first 3 remaining features
    features: PLAN_FEATURES.STARTER.slice(1, 4),
    popular: false,
  },
  {
    name: "Pro",
    slug: "pro",
    price: 12,
    credits: 500,
    features: PLAN_FEATURES.PRO.slice(1, 4),
    popular: true,
  },
  {
    name: "Studio",
    slug: "unlimited",
    price: 25,
    credits: 1200,
    features: PLAN_FEATURES.UNLIMITED.slice(1, 4),
    popular: false,
  },
];

export function UpgradeModal({ forceShow, onClose }: UpgradeModalProps) {
  const [isVisible, setIsVisible] = useState(Boolean(forceShow));
  const [hasShownThisSession, setHasShownThisSession] = useState(false);

  // Open when `forceShow` flips to true (state adjusted during render instead
  // of in an effect — avoids a cascading re-render).
  const [prevForceShow, setPrevForceShow] = useState(forceShow);
  if (forceShow !== prevForceShow) {
    setPrevForceShow(forceShow);
    if (forceShow) setIsVisible(true);
  }

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

  // Links navigate away but the modal lives in the dashboard layout, so close
  // it explicitly or it stays open over the destination page.
  const closeOnNavigate = () => handleOpenChange(false);

  return (
    <Dialog.Root open={isVisible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#0E1016] text-[#ECEEF3] shadow-2xl outline-none transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100"
          aria-describedby="upgrade-modal-description"
        >
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              className="absolute right-4 top-4 z-10 rounded-lg p-2 text-[#8B93A5] transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF8A3D]/50"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          <div className="p-5 sm:p-7">
            {/* Header */}
            <div className="pr-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-red-200">
                <Zap className="h-3 w-3" />
                You&apos;re out of credits
              </span>
              <Dialog.Title asChild>
                <h2 className="mt-3 font-display text-[24px] font-semibold tracking-tight text-white">
                  Upgrade to keep creating
                </h2>
              </Dialog.Title>
              <Dialog.Description asChild>
                <p id="upgrade-modal-description" className="mt-1 max-w-md text-[13px] text-[#8B93A5]">
                  Choose a plan that fits your needs. All plans include access to our latest AI models and features.
                </p>
              </Dialog.Description>
            </div>

            {/* Plans */}
            <div className="mt-6 grid gap-3 pt-2 md:grid-cols-3">
              {PLANS.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative flex flex-col rounded-2xl border bg-[#151922] p-4 transition-colors ${
                    plan.popular ? "border-[#FF8A3D]/60" : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {plan.popular && (
                    <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FF8A3D] px-3 py-1 font-mono text-[11px] font-semibold text-black">
                      Most popular
                    </span>
                  )}

                  <h3 className="font-display text-[17px] font-semibold text-white">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="font-sans tracking-tight tabular-nums text-[28px] font-semibold leading-none text-white">£{plan.price}</span>
                    <span className="font-mono text-[12px] text-[#8B93A5]">/month</span>
                  </div>
                  <span className="mt-3 w-fit rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#ECEEF3]">
                    {plan.credits.toLocaleString()} credits/mo
                  </span>

                  <ul className="mt-4 flex-1 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-[13px] text-[#C9CFDB]">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF8A3D]" strokeWidth={2.5} />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={`/checkout/${plan.slug}`}
                    onClick={closeOnNavigate}
                    className={`mt-5 flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-semibold ${
                      plan.popular
                        ? "px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white transition hover:brightness-110"
                        : "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition-colors hover:bg-white/[0.08] hover:text-white"
                    }`}
                  >
                    Get {plan.name}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-col items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row">
              <p className="text-[13px] text-[#8B93A5]">Just need a few credits? One-time packs, no subscription.</p>
              <Link
                href="/pricing#credit-packs"
                onClick={closeOnNavigate}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#FFB27A] hover:underline"
              >
                View credit packs
                <ArrowRight className="h-3.5 w-3.5" />
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
