"use client";

// =============================================================================
// Client islands for /pricing. The page itself is a server component so plans,
// packs, costs and the FAQ are in the first HTML; only the parts that depend on
// the visitor (current plan, checkout navigation, lifetime availability, live
// stats) run in the browser.
// =============================================================================

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Image as ImageIcon, Infinity as InfinityIcon, Loader2, Users, Zap } from "lucide-react";
import { fetchUserPlan } from "./page.actions";
import { PLAN_CHECKOUT_SLUG, TOTAL_LIFETIME_SLOTS, type LifetimeCard, type LifetimeSlotInfo } from "./pricing-data";
import { track, FUNNEL } from "@/lib/analytics";

export const BTN_PRIMARY =
  "px-corners bg-[#FFA300] text-[#131A31] font-semibold hover:bg-[#FFB733] transition disabled:opacity-60 disabled:hover:bg-[#FFB733]";
export const BTN_SECONDARY =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-60";

interface PricingState {
  /** null = visitor (not signed in) or not loaded yet. */
  currentPlan: string | null;
  loadingPlan: string | null;
  startCheckout: (planId: string) => void;
}

const PricingContext = createContext<PricingState>({ currentPlan: null, loadingPlan: null, startCheckout: () => {} });

export function PricingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  useEffect(() => {
    track(FUNNEL.pricingView);
    fetchUserPlan()
      .then((r) => {
        if (r.success) setCurrentPlan(r.plan);
      })
      .catch(() => {});
  }, []);

  const startCheckout = (planId: string) => {
    if (planId === "FREE" || currentPlan === planId) return;
    setLoadingPlan(planId);
    track(FUNNEL.checkoutStart, { plan: planId });
    const slug = PLAN_CHECKOUT_SLUG[planId as keyof typeof PLAN_CHECKOUT_SLUG] ?? planId.toLowerCase();
    router.push(`/checkout/${slug}`);
  };

  return (
    <PricingContext.Provider value={{ currentPlan, loadingPlan, startCheckout }}>
      {children}
    </PricingContext.Provider>
  );
}

export function CurrentPlanPill({ planNames }: { planNames: Record<string, string> }) {
  const { currentPlan } = useContext(PricingContext);
  const name = currentPlan ? planNames[currentPlan] : undefined;
  if (!name) return null;
  return (
    <span className="rounded-full border border-[#FFA300]/25 bg-[#FFA300]/10 px-2.5 py-1 font-mono text-[11px] text-[#FFC857]">
      Current: {name}
    </span>
  );
}

export function CurrentPlanBadge({ planId }: { planId: string }) {
  const { currentPlan } = useContext(PricingContext);
  if (currentPlan !== planId) return null;
  return (
    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
      Current
    </span>
  );
}

export function PlanAction({ planId, cta, featured }: { planId: string; cta: string; featured: boolean }) {
  const { currentPlan, loadingPlan, startCheckout } = useContext(PricingContext);
  const signedIn = currentPlan !== null;

  if (signedIn && currentPlan === planId) {
    return (
      <div className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] font-medium text-[#9AA1CC]">
        <Check className="h-4 w-4" aria-hidden="true" /> Current plan
      </div>
    );
  }
  if (planId === "FREE") {
    return (
      <Link href={signedIn ? "/generate" : "/register"} className={`flex h-11 w-full items-center justify-center text-[14px] font-semibold ${BTN_SECONDARY}`}>
        {signedIn ? cta : "Start free"}
      </Link>
    );
  }
  const loading = loadingPlan === planId;
  return (
    <button
      type="button"
      onClick={() => startCheckout(planId)}
      disabled={loading}
      className={`flex h-11 w-full items-center justify-center text-[14px] ${featured ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`}`}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Opening checkout" /> : cta}
    </button>
  );
}

export function PackBuyButton({ packKey, slug, name, featured }: { packKey: string; slug: string; name: string; featured: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => {
        track(FUNNEL.checkoutStart, { plan: packKey, type: "credits" });
        router.push(`/checkout/credits/${slug}`);
      }}
      className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${featured ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`}`}
    >
      Buy {name}
    </button>
  );
}

/** Real user and asset counts; renders nothing until (and unless) they load. */
export function PricingStats() {
  const [stats, setStats] = useState({ assets: 0, users: 0 });
  useEffect(() => {
    fetch("/api/stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        setStats({
          assets: data.totalGenerations || 0,
          users: data.totalUsers || data.activeUsersWeek || 0,
        });
      })
      .catch(() => {});
  }, []);
  return (
    <>
      {stats.users > 0 && (
        <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C8CCE8]">
          <Users className="h-3 w-3 text-[#9AA1CC]" aria-hidden="true" />
          {stats.users.toLocaleString()}+ users
        </span>
      )}
      {stats.assets > 0 && (
        <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C8CCE8]">
          <ImageIcon className="h-3 w-3 text-[#9AA1CC]" aria-hidden="true" />
          {stats.assets.toLocaleString()} assets created
        </span>
      )}
    </>
  );
}

/** Lifetime deals: shown only while the server says sales are open (paused by default). */
export function LifetimeSection({ deals }: { deals: readonly LifetimeCard[] }) {
  const router = useRouter();
  const [on, setOn] = useState(false);
  const [slots, setSlots] = useState<Record<string, LifetimeSlotInfo>>({});

  useEffect(() => {
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) setSlots(data.slots);
        setOn(data.salesEnabled === true);
      })
      .catch(() => {});
  }, []);

  if (!on) return null;

  return (
    <section id="lifetime" aria-labelledby="lifetime-heading" className="mt-14 scroll-mt-24">
      <div className="mb-5 flex flex-col gap-1">
        <h2 id="lifetime-heading" className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-white">
          <InfinityIcon className="h-4 w-4 text-[#FFA300]" aria-hidden="true" /> Pay once, use forever
        </h2>
        <p className="text-[13px] text-[#9AA1CC]">{TOTAL_LIFETIME_SLOTS} lifetime slots in total. One payment, monthly credits forever.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-3">
        {deals.map((deal) => {
          const slot = slots[deal.key];
          const soldOut = !!slot && slot.available <= 0;
          return (
            <div
              key={deal.key}
              className={`relative flex flex-col rounded-2xl border bg-[#212B4E] p-5 transition-colors ${
                soldOut ? "border-white/[0.06] opacity-60" : deal.featured ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"
              }`}
            >
              {deal.featured && !soldOut && (
                <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FFA300] px-3 py-1 font-mono text-[11px] font-semibold text-black">
                  Best value
                </span>
              )}
              <h3 className="font-display text-[18px] font-semibold text-white">{deal.name}</h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="font-sans text-[32px] font-semibold leading-none tracking-tight text-white tabular-nums">£{deal.price}</span>
                <span className="font-mono text-[12px] text-[#8A92BF] line-through">£{deal.originalPrice}</span>
                <span className="font-mono text-[12px] text-[#9AA1CC]">one-time</span>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1.5">
                <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#FFF1E8]">
                  {deal.credits.toLocaleString()} credits/mo, forever
                </span>
              </div>
              <div className="mt-4 flex-1">
                {slot ? (
                  <>
                    <div className="mb-1.5 flex justify-between font-mono text-[11px]">
                      <span className="text-[#8A92BF]">{slot.sold} claimed</span>
                      <span className={soldOut ? "text-red-200" : "text-[#C8CCE8]"}>{soldOut ? "Sold out" : `${slot.available} of ${slot.max} left`}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div className="h-full rounded-full bg-[#FFA300]" style={{ width: `${Math.min(100, (slot.sold / slot.max) * 100)}%` }} />
                    </div>
                  </>
                ) : (
                  <p className="font-mono text-[11px] text-[#9AA1CC]">
                    {deal.maxSlots} slot{deal.maxSlots === 1 ? "" : "s"} total
                  </p>
                )}
              </div>
              {soldOut ? (
                <div className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-[13px] font-medium text-[#8A92BF]">
                  Sold out
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    track(FUNNEL.checkoutStart, { plan: deal.key, type: "lifetime" });
                    router.push(`/checkout/lifetime/${deal.slug}`);
                  }}
                  className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${deal.featured ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`}`}
                >
                  Claim lifetime
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-center text-[12px] text-[#8A92BF]">Lifetime deals are early-adopter pricing — not available forever.</p>
    </section>
  );
}

/**
 * Phone shortcut to Pro. It sits in normal flow just under the plan cards
 * (so it never covers a feature list) and then sticks to the bottom of the
 * screen — above the app tab bar when that bar is present. Hidden from `sm`
 * up, and for people already on Pro or Studio.
 */
export function MobileProCta({ price }: { price: number }) {
  const { currentPlan, loadingPlan, startCheckout } = useContext(PricingContext);
  if (currentPlan === "PRO" || currentPlan === "UNLIMITED") return null;
  const loading = loadingPlan === "PRO";
  return (
    <div className="sticky bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-30 mt-5 sm:hidden [.app-main_&]:bottom-[calc(3.75rem+env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={() => startCheckout("PRO")}
        disabled={loading}
        className={`flex h-12 w-full items-center justify-center gap-2 px-6 text-[15px] shadow-[0_10px_28px_-12px_rgba(0,0,0,0.85)] ${BTN_PRIMARY}`}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-label="Opening checkout" /> : <Zap className="h-4 w-4" aria-hidden="true" />}
        Get Pro · <span className="font-mono">£{price}/mo</span>
      </button>
    </div>
  );
}
