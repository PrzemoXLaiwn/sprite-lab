"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Zap, Check, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { PLAN_FEATURES, PLAN_MONTHLY_CREDITS, PLAN_MONTHLY_PRICE_GBP } from "@/config/plan-features";
import {
  STARTER_FIRST_MONTH_OFFER,
  STARTER_UPSELL_STORAGE_KEY,
  lowBalanceUpsellDue,
  starterUpsellContent,
  type UpsellReason,
} from "@/config/starter-first-month";
import { chooseUpgradeView, shortfallCopy, type UpgradeView } from "@/config/credit-shortfall";
import { track, FUNNEL } from "@/lib/analytics";

// =============================================================================
// UpgradeModal
// =============================================================================
// Three views, one dialog:
//   - Shortfall: a 402 while credits remain. Says what it costs and what you
//     have, and leads with the £2.99 pack. Starter (the commercial licence)
//     is the second link.
//   - Starter upsell for a logged-in free account that has never subscribed,
//     when the balance is actually empty. Shown after a generation leaves
//     fewer than 3 credits (once this session and at most once per 24h), and
//     when a generation is refused at 0 credits.
//   - The three-plan list for everyone else, opened by the same
//     "show-upgrade-modal" event.
// =============================================================================

interface UpgradeModalProps {
  forceShow?: boolean;
  onClose?: () => void;
}

interface UpsellAudience {
  eligible: boolean;
  offerEnabled: boolean;
  credits: number;
}

export interface UpgradePrompt {
  /** What the refused action costs, when the caller knows. */
  cost?: number;
}

interface ShortfallState {
  cost: number | null;
  balance: number;
  offerEnabled: boolean;
}

const PLANS = [
  {
    name: "Starter",
    slug: "starter",
    price: PLAN_MONTHLY_PRICE_GBP.STARTER,
    credits: PLAN_MONTHLY_CREDITS.STARTER,
    // Credits, what carries over from Free, and the commercial licence.
    // AI upscale is Pro and up, and AI editing is already on Free.
    features: PLAN_FEATURES.STARTER.slice(0, 3),
    popular: false,
  },
  {
    name: "Pro",
    slug: "pro",
    price: PLAN_MONTHLY_PRICE_GBP.PRO,
    credits: PLAN_MONTHLY_CREDITS.PRO,
    features: PLAN_FEATURES.PRO.slice(1, 4),
    popular: false,
  },
  {
    name: "Studio",
    slug: "unlimited",
    price: PLAN_MONTHLY_PRICE_GBP.UNLIMITED,
    credits: PLAN_MONTHLY_CREDITS.UNLIMITED,
    features: PLAN_FEATURES.UNLIMITED.slice(1, 4),
    popular: false,
  },
];

async function loadUpsellAudience(): Promise<UpsellAudience | null> {
  try {
    const res = await fetch("/api/user/stats");
    if (!res.ok) return null;
    const data = await res.json();
    const credits = typeof data.credits === "number" ? data.credits : Number(data.credits);
    const upsell = data.starterUpsell ?? {};
    return {
      eligible: upsell.eligible === true,
      offerEnabled: upsell.offerEnabled === true,
      credits: Number.isFinite(credits) ? credits : Number.POSITIVE_INFINITY,
    };
  } catch (err) {
    console.error("[UpgradeModal] Stats check failed:", err);
    return null;
  }
}

function readUpsellShownAt(): number | null {
  try {
    const raw = window.localStorage.getItem(STARTER_UPSELL_STORAGE_KEY);
    if (!raw) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function rememberUpsellShown(now = Date.now()): void {
  try {
    window.localStorage.setItem(STARTER_UPSELL_STORAGE_KEY, String(now));
  } catch {
    /* private mode / blocked storage */
  }
}

export function UpgradeModal({ forceShow, onClose }: UpgradeModalProps) {
  const [isVisible, setIsVisible] = useState(Boolean(forceShow));
  const [mode, setMode] = useState<UpgradeView>("plans");
  const [reason, setReason] = useState<UpsellReason>("no_credits");
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [shortfall, setShortfall] = useState<ShortfallState | null>(null);

  // Open when `forceShow` flips to true (state adjusted during render instead
  // of in an effect — avoids a cascading re-render).
  const [prevForceShow, setPrevForceShow] = useState(forceShow);
  if (forceShow !== prevForceShow) {
    setPrevForceShow(forceShow);
    if (forceShow) {
      setMode("plans");
      setIsVisible(true);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let shownLowThisSession = false;
    let lowTimer = 0;
    let lowCheckRunning = false;
    let lowCheckAgain = false;

    const openStarter = (nextReason: UpsellReason, nextOfferEnabled: boolean) => {
      setReason(nextReason);
      setOfferEnabled(nextOfferEnabled);
      setShortfall(null);
      setMode("starter");
      setIsVisible(true);
      shownLowThisSession = true;
      rememberUpsellShown();
      const offer = nextOfferEnabled ? STARTER_FIRST_MONTH_OFFER : "standard";
      track(FUNNEL.upgradeModalShown, { mode: "starter", reason: nextReason, offer });
      track(FUNNEL.upsellShown, { reason: nextReason, offer });
      if (nextReason === "no_credits") track(FUNNEL.creditsExhausted, { balance: 0 });
    };

    const openShortfall = (next: ShortfallState) => {
      setShortfall(next);
      setOfferEnabled(next.offerEnabled);
      setMode("shortfall");
      setIsVisible(true);
      track(FUNNEL.upgradeModalShown, {
        mode: "shortfall",
        reason: "shortfall",
        cost: next.cost,
        balance: next.balance,
      });
      track(FUNNEL.upsellShown, { reason: "shortfall", offer: "PACK_75" });
    };

    const openPlans = (balance: number | null) => {
      setShortfall(null);
      setMode("plans");
      setIsVisible(true);
      track(FUNNEL.upgradeModalShown, { mode: "plans", reason: "no_credits", balance });
      if (balance === 0) track(FUNNEL.creditsExhausted, { balance: 0 });
    };

    // Debounced so a burst of generations is judged on the balance after the
    // last one, once the debit has reached the database.
    const checkLowBalance = async () => {
      if (lowCheckRunning) {
        lowCheckAgain = true;
        return;
      }
      lowCheckRunning = true;
      try {
        do {
          lowCheckAgain = false;
          if (cancelled || shownLowThisSession) return;
          const audience = await loadUpsellAudience();
          if (cancelled || shownLowThisSession || !audience?.eligible) return;
          if (
            !lowBalanceUpsellDue({
              credits: audience.credits,
              now: Date.now(),
              lastShownAt: readUpsellShownAt(),
              shownThisSession: shownLowThisSession,
            })
          ) {
            continue;
          }
          openStarter("low_balance", audience.offerEnabled);
        } while (lowCheckAgain && !cancelled);
      } finally {
        lowCheckRunning = false;
      }
    };

    const onCreditsUpdated = () => {
      window.clearTimeout(lowTimer);
      lowTimer = window.setTimeout(() => {
        void checkLowBalance();
      }, 500);
    };

    // 402. Credits still on the account → cost and the £2.99 pack.
    // Empty balance → Starter for a free account that has never subscribed,
    // otherwise the plan list.
    const onNoCredits = (event: Event) => {
      const detail = (event as CustomEvent<UpgradePrompt>).detail;
      const cost = typeof detail?.cost === "number" && Number.isInteger(detail.cost) && detail.cost > 0 ? detail.cost : null;
      void (async () => {
        const audience = await loadUpsellAudience();
        if (cancelled) return;
        const balance = audience && Number.isFinite(audience.credits) ? audience.credits : null;
        const view = chooseUpgradeView({
          balance,
          cost,
          starterEligible: audience?.eligible === true,
        });
        if (view === "shortfall" && balance != null) {
          openShortfall({ cost, balance, offerEnabled: audience?.offerEnabled === true });
          return;
        }
        if (view === "starter") {
          openStarter("no_credits", audience?.offerEnabled === true);
          return;
        }
        openPlans(balance);
      })();
    };

    window.addEventListener("credits-updated", onCreditsUpdated);
    window.addEventListener("show-upgrade-modal", onNoCredits);

    return () => {
      cancelled = true;
      window.clearTimeout(lowTimer);
      window.removeEventListener("credits-updated", onCreditsUpdated);
      window.removeEventListener("show-upgrade-modal", onNoCredits);
    };
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsVisible(open);
    if (!open) onClose?.();
  };

  // Links navigate away but the modal lives in the dashboard layout, so close
  // it explicitly or it stays open over the destination page.
  const closeOnNavigate = () => handleOpenChange(false);

  const onUpsellClick = () => {
    track(FUNNEL.upsellClick, {
      reason,
      offer: offerEnabled ? STARTER_FIRST_MONTH_OFFER : "standard",
    });
    track(FUNNEL.upgradeModalClicked, { mode: "starter", reason });
    track(FUNNEL.checkoutStart, { plan: "STARTER", source: "upgrade_modal" });
    closeOnNavigate();
  };

  const onShortfallPackClick = () => {
    track(FUNNEL.upsellClick, { reason: "shortfall", offer: "PACK_75" });
    track(FUNNEL.upgradeModalClicked, { mode: "shortfall", target: "PACK_75" });
    track(FUNNEL.checkoutStart, { plan: "PACK_75", type: "credits", source: "upgrade_modal" });
    closeOnNavigate();
  };

  const onShortfallStarterClick = () => {
    track(FUNNEL.upgradeModalClicked, { mode: "shortfall", target: "STARTER" });
    track(FUNNEL.checkoutStart, { plan: "STARTER", source: "upgrade_modal" });
    closeOnNavigate();
  };

  const upsell = starterUpsellContent(offerEnabled, reason);
  const gap = shortfall ? shortfallCopy({ cost: shortfall.cost, balance: shortfall.balance, offerEnabled: shortfall.offerEnabled }) : null;

  return (
    <Dialog.Root open={isVisible} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100" />
        <Dialog.Content
          className={`fixed left-1/2 top-1/2 z-[101] max-h-[90vh] w-[95vw] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-white/[0.08] bg-[#19223F] text-[#FFF1E8] shadow-2xl outline-none transition-opacity duration-200 data-[state=closed]:opacity-0 data-[state=open]:opacity-100 ${
            mode === "plans" ? "max-w-3xl" : "max-w-md"
          }`}
          aria-describedby="upgrade-modal-description"
        >
          <Dialog.Close asChild>
            <button
              aria-label="Close"
              type="button"
              className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-[#9AA1CC] transition-colors hover:bg-white/[0.06] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FFA300]/50"
            >
              <X className="h-4 w-4" />
            </button>
          </Dialog.Close>

          {mode === "shortfall" && gap ? (
            <div className="p-5 sm:p-7">
              <div className="pr-10">
                <Dialog.Title asChild>
                  <h2 className="font-display text-[24px] font-semibold tracking-tight text-white">{gap.title}</h2>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <div id="upgrade-modal-description" className="mt-2 space-y-2">
                    <p className="text-[15px] font-medium text-white">{gap.detail}</p>
                    <p className="text-[13px] leading-relaxed text-[#C8CCE8]">{gap.packNote}</p>
                  </div>
                </Dialog.Description>
              </div>
              <Link
                href={gap.packHref}
                onClick={onShortfallPackClick}
                className="px-corners mt-6 flex h-11 w-full items-center justify-center gap-1.5 bg-[#FFA300] text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
              >
                {gap.packCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={gap.starterHref}
                onClick={onShortfallStarterClick}
                className="mt-3 flex min-h-11 w-full flex-col items-center justify-center py-1 text-[13px] font-medium text-[#C8CCE8] hover:text-white"
              >
                <span>{gap.starterCta}</span>
                <span className="text-[12px] text-[#9AA1CC]">{gap.starterPrice}</span>
              </Link>
              <Link href={gap.plansHref} onClick={closeOnNavigate} className="flex h-10 w-full items-center justify-center text-[13px] text-[#9AA1CC] hover:text-white">
                See all plans
              </Link>
            </div>
          ) : mode === "starter" ? (
            <div className="p-5 sm:p-7">
              <div className="pr-10">
                <Dialog.Title asChild>
                  <h2 className="font-display text-[24px] font-semibold tracking-tight text-white">
                    {upsell.title}
                  </h2>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <div id="upgrade-modal-description" className="mt-2 space-y-2">
                    <p className="text-[14px] leading-relaxed text-[#C8CCE8]">
                      <span className="font-semibold text-white">Starter</span>
                      {" · "}
                      {upsell.creditsLine}
                    </p>
                    <p className="text-[15px] font-medium text-white">{upsell.priceLine}</p>
                  </div>
                </Dialog.Description>
              </div>

              <Link
                href={upsell.checkoutHref}
                onClick={onUpsellClick}
                className="px-corners mt-6 flex h-11 w-full items-center justify-center gap-1.5 bg-[#FFA300] text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]"
              >
                {upsell.cta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={upsell.pricingHref}
                onClick={closeOnNavigate}
                className="mt-2 flex h-10 w-full items-center justify-center text-[13px] font-medium text-[#C8CCE8] hover:text-white"
              >
                {upsell.seeAllPlans}
              </Link>
            </div>
          ) : (
            <div className="p-5 sm:p-7">
              <div className="pr-10">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-red-200">
                  <Zap className="h-3 w-3" />
                  Not enough credits
                </span>
                <Dialog.Title asChild>
                  <h2 className="mt-3 font-display text-[24px] font-semibold tracking-tight text-white">
                    Upgrade to keep creating
                  </h2>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p id="upgrade-modal-description" className="mt-1 max-w-md text-[13px] text-[#9AA1CC]">
                    Monthly plans refill your credits every month. Just need a few? Grab a one-time pack below.
                  </p>
                </Dialog.Description>
              </div>

              <div className="mt-6 grid gap-3 pt-2 md:grid-cols-3">
                {PLANS.map((plan) => (
                  <div
                    key={plan.name}
                    className={`relative flex flex-col rounded-2xl border bg-[#212B4E] p-4 transition-colors ${
                      plan.popular ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {plan.popular && (
                      <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FFA300] px-3 py-1 font-mono text-[11px] font-semibold text-black">
                        Most popular
                      </span>
                    )}

                    <h3 className="font-display text-[17px] font-semibold text-white">{plan.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1.5">
                      <span className="font-sans tracking-tight tabular-nums text-[28px] font-semibold leading-none text-white">£{plan.price}</span>
                      <span className="font-mono text-[12px] text-[#9AA1CC]">/month</span>
                    </div>
                    <span className="mt-3 w-fit rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#FFF1E8]">
                      {plan.credits.toLocaleString("en-GB")} credits/mo
                    </span>

                    <ul className="mt-4 flex-1 space-y-2">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-[13px] text-[#C8CCE8]">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFA300]" strokeWidth={2.5} />
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href={`/checkout/${plan.slug}`}
                      onClick={() => {
                        track(FUNNEL.checkoutStart, { plan: plan.slug, source: "upgrade_modal" });
                        track(FUNNEL.upgradeModalClicked, { mode: "plans", target: plan.slug });
                        closeOnNavigate();
                      }}
                      className={`mt-5 flex h-10 w-full items-center justify-center gap-1.5 text-[13px] font-semibold ${
                        plan.popular
                          ? "px-corners bg-[#FFA300] text-[#131A31] transition hover:bg-[#FFB733]"
                          : "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] transition-colors hover:bg-white/[0.08] hover:text-white"
                      }`}
                    >
                      Get {plan.name}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ))}
              </div>

              <div className="mt-5 flex flex-col items-start justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center">
                <p className="text-[13px] text-[#9AA1CC]">Just need a few credits? Blaze is 75 credits, one time, £2.99. A pack does not include a commercial licence.</p>
                <Link
                  href="/checkout/credits/blaze"
                  onClick={() => {
                    track(FUNNEL.checkoutStart, { plan: "PACK_75", type: "credits", source: "upgrade_modal" });
                    track(FUNNEL.upgradeModalClicked, { mode: "plans", target: "PACK_75" });
                    closeOnNavigate();
                  }}
                  className="inline-flex h-10 shrink-0 items-center gap-1.5 text-[13px] font-medium text-[#FFC857] hover:underline"
                >
                  Get Blaze · £2.99
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Trigger the modal from anywhere (the matching listener is in the
// useEffect above). Used when a generation is refused for lack of credits.
export function triggerUpgradeModal(prompt?: UpgradePrompt) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("show-upgrade-modal", { detail: prompt }));
  }
}
