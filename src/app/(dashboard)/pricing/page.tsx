"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Zap,
  Loader2,
  Clock,
  Users,
  Shield,
  ChevronDown,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Coins,
  X,
} from "lucide-react";
import { fetchUserPlan, fetchLaunchPromoStatus } from "./page.actions";
import {
  PLAN_CARDS,
  PLAN_CHECKOUT_SLUG,
  CREDIT_PACK_CARDS,
  LIFETIME_CARDS,
  TOTAL_LIFETIME_SLOTS,
  formatPence,
  type LifetimeSlotInfo,
} from "./pricing-data";
import { track, FUNNEL } from "@/lib/analytics";

// ===========================================
// CONFIGURATION
// ===========================================

// Disabled by default. Re-enable only when there is a real promo with a
// fixed end date and accurate slot counts — a permanently-renewing 2-day
// timer + hardcoded "23 of 100 claimed" reads as fake to savvy users and
// erodes trust. To enable, set `enabled: true`, replace `endDate` with a
// real ISO date, and wire `claimedSlots` to /api/lifetime-slots.
const PROMO_CONFIG = {
  enabled: false,
  endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  totalSlots: 100,
  claimedSlots: 0,
};

const faqs = [
  {
    q: "What is a generation credit?",
    a: "Credits are spent each time you generate. A Standard sprite costs 1 credit and an HD sprite costs 3 — the cost is always shown on the Generate button before you spend anything.",
  },
  {
    q: "What does the discounted pricing mean?",
    a: "Launch pricing is what you pay for as long as your subscription is active and we keep that plan available. If you cancel and resubscribe later, the current price applies. For a guaranteed price-for-life, pick a Lifetime deal instead.",
  },
  {
    q: "Can I use assets commercially?",
    a: "Absolutely! All paid plans include full commercial rights. Use your assets in games, apps, or any project you sell. Free plan is for testing only.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Subscription credits reset monthly. Want credits that never expire? Check out the one-time credit packs.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes! Cancel with one click anytime. No contracts, no hidden fees. You'll keep access until your billing period ends.",
  },
  {
    q: "What's the quality like?",
    a: "We use state-of-the-art AI models. Pro and Studio plans get access to our premium models for the highest quality game-ready assets.",
  },
];

type Tab = "subscriptions" | "packs" | "lifetime";

const TABS: { id: Tab; label: string; hash: string }[] = [
  { id: "subscriptions", label: "Subscriptions", hash: "#subscriptions" },
  { id: "packs", label: "Credit packs", hash: "#credit-packs" },
  { id: "lifetime", label: "Lifetime", hash: "#lifetime" },
];

function tabFromHash(hash: string): Tab | null {
  return TABS.find((t) => t.hash === hash)?.id ?? null;
}

// Shared class strings (pixel × dev design language)
const BTN_PRIMARY =
  "px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-white font-semibold hover:brightness-110 transition disabled:opacity-60 disabled:hover:brightness-100";
const BTN_SECONDARY =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] hover:bg-white/[0.08] hover:text-white transition-colors disabled:opacity-60";
const SECTION_LABEL = "font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]";

// ===========================================
// COUNTDOWN TIMER HOOK
// ===========================================

function useCountdown(endDate: Date) {
  const calculateTimeLeft = useCallback(() => {
    const difference = endDate.getTime() - Date.now();
    if (difference <= 0) {
      return { hours: 0, minutes: 0, seconds: 0 };
    }
    return {
      hours: Math.floor(difference / (1000 * 60 * 60)),
      minutes: Math.floor((difference / (1000 * 60)) % 60),
      seconds: Math.floor((difference / 1000) % 60),
    };
  }, [endDate]);

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearInterval(timer);
  }, [calculateTimeLeft]);

  return timeLeft;
}

// ===========================================
// COMPONENTS
// ===========================================

function CountdownTimer({ endDate }: { endDate: Date }) {
  const { hours, minutes, seconds } = useCountdown(endDate);
  return (
    <div className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-white">
      {[hours, minutes, seconds].map((v, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="text-[#7A8294]">:</span>}
          <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5">{String(v).padStart(2, "0")}</span>
        </span>
      ))}
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#151922]">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#1A1F2A]"
      >
        <span className="text-[14px] font-medium text-white">{question}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-[#8B93A5] transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && <div className="px-5 pb-4 text-[13px] leading-relaxed text-[#C9CFDB]">{answer}</div>}
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] text-[#C9CFDB]">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FF8A3D]" strokeWidth={2.5} />
      <span>{children}</span>
    </li>
  );
}

function PopularPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FF8A3D] px-3 py-1 font-mono text-[11px] font-semibold text-black">
      {children}
    </span>
  );
}

// ===========================================
// MAIN PAGE
// ===========================================

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [promoActive, setPromoActive] = useState(false);
  const [lifetimeSlots, setLifetimeSlots] = useState<Record<string, LifetimeSlotInfo>>({});
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeUsers: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    const loadUserPlan = async () => {
      const result = await fetchUserPlan();
      if (result.success) {
        setCurrentPlan(result.plan);
      }
      setIsLoading(false);
    };

    loadUserPlan();
    track(FUNNEL.pricingView);

    // Credit-pack bonuses are only shown when the server will actually grant them.
    fetchLaunchPromoStatus()
      .then((r) => setPromoActive(r.active))
      .catch(() => {});

    // Real lifetime availability (sold-out state + remaining slots).
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) setLifetimeSlots(data.slots);
      })
      .catch(() => {});

    // Fetch real stats from database
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        setStats({
          totalAssets: data.totalGenerations || 0,
          activeUsers: data.activeUsersWeek || 0, // Users active in last 7 days
          totalUsers: data.totalUsers || 0,
        });
      })
      .catch(() => {
        // Fallback to old endpoint
        fetch("/api/stats/total-generations")
          .then((res) => res.json())
          .then((data) => {
            if (data.total) {
              setStats((prev) => ({ ...prev, totalAssets: data.total }));
            }
          })
          .catch(() => {});
      });
  }, []);

  // Deep links: /pricing#credit-packs (used by the upgrade modal), #lifetime.
  useEffect(() => {
    const sync = () => {
      const fromHash = tabFromHash(window.location.hash);
      if (fromHash) setTab(fromHash);
    };
    const initial = setTimeout(sync, 0);
    window.addEventListener("hashchange", sync);
    return () => {
      clearTimeout(initial);
      window.removeEventListener("hashchange", sync);
    };
  }, []);

  const selectTab = (next: Tab) => {
    setTab(next);
    const hash = TABS.find((t) => t.id === next)?.hash ?? "";
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
  };

  const handlePlanClick = (stripePlan: string) => {
    if (stripePlan === "FREE" || currentPlan === stripePlan) return;
    setLoadingPlan(stripePlan);
    track(FUNNEL.checkoutStart, { plan: stripePlan });
    const urlName = PLAN_CHECKOUT_SLUG[stripePlan as keyof typeof PLAN_CHECKOUT_SLUG] || stripePlan.toLowerCase();
    router.push(`/checkout/${urlName}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0B0D12]">
        <Loader2 className="h-6 w-6 animate-spin text-[#FF8A3D]" />
      </div>
    );
  }

  const userCount = stats.totalUsers > 0 ? stats.totalUsers : stats.activeUsers;
  const currentPlanName = PLAN_CARDS.find((p) => p.id === currentPlan)?.name;

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#ECEEF3]">
      {/* Urgency banner — disabled unless a real, fixed-date promo is configured */}
      {PROMO_CONFIG.enabled && (
        <div className="border-b border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.06]">
          <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-center gap-3 px-5 py-2.5 text-[13px] text-[#FFB27A] lg:px-8">
            <Clock className="h-4 w-4" />
            <span className="font-medium">Launch sale ends in</span>
            <CountdownTimer endDate={PROMO_CONFIG.endDate} />
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══════════════════════════════════════════ */}
      <div className="relative border-b border-white/[0.06]">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="relative mx-auto max-w-[1200px] px-5 pb-6 pt-8 lg:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className={SECTION_LABEL}>Pricing</p>
              <h1 className="mt-2 font-display text-[26px] font-semibold tracking-tight text-white sm:text-[28px]">
                Plans &amp; credits
              </h1>
              <p className="mt-1.5 max-w-xl text-[13px] text-[#8B93A5]">
                No hidden fees. Cancel anytime. Early-adopter pricing — or pay once with a Lifetime deal.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {currentPlanName && (
                <span className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2.5 py-1 font-mono text-[11px] text-[#FFB27A]">
                  Current: {currentPlanName}
                </span>
              )}
              {userCount > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C9CFDB]">
                  <Users className="h-3 w-3 text-[#8B93A5]" />
                  {userCount.toLocaleString()}+ users
                </span>
              )}
              {stats.totalAssets > 0 && (
                <span className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#C9CFDB]">
                  <ImageIcon className="h-3 w-3 text-[#8B93A5]" />
                  {stats.totalAssets.toLocaleString()} assets created
                </span>
              )}
            </div>
          </div>

          {/* Segmented toggle */}
          <div role="tablist" aria-label="Pricing options" className="mt-6 inline-grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 text-[13px] font-medium">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => selectTab(t.id)}
                className={`rounded-lg px-3 py-1.5 transition-colors sm:px-4 ${
                  tab === t.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 py-8 lg:px-8">
        {/* ═══ SUBSCRIPTIONS ══════════════════════════════════ */}
        {tab === "subscriptions" && (
          <section id="subscriptions" aria-label="Subscription plans">
            <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_CARDS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                const isPopular = plan.featured;
                const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;
                const isLoadingThis = loadingPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-2xl border bg-[#151922] p-5 transition-colors ${
                      isPopular ? "border-[#FF8A3D]/60" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {isPopular && <PopularPill>Most popular</PopularPill>}

                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-[18px] font-semibold text-white">{plan.name}</h3>
                      {isCurrent && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-[#8B93A5]">{plan.description}</p>

                    <div className="mt-5">
                      <div className="flex items-baseline gap-1.5">
                        <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{plan.price}</span>
                        <span className="font-mono text-[12px] text-[#8B93A5]">/month</span>
                      </div>
                      {plan.oldPrice && (
                        <div className="mt-2 flex items-center gap-2 font-mono text-[11px]">
                          <span className="text-[#7A8294] line-through">£{plan.oldPrice}</span>
                          <span className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2 py-0.5 text-[#FFB27A]">-{discount}%</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#ECEEF3]">
                        {plan.credits.toLocaleString()} credits/mo
                      </span>
                      {plan.price > 0 && (
                        <span className="font-mono text-[11px] text-[#7A8294]">
                          {((plan.price / plan.credits) * 100).toFixed(1)}p/credit
                        </span>
                      )}
                    </div>

                    <ul className="mt-5 flex-1 space-y-2.5">
                      {plan.features.map((feature) => (
                        <FeatureItem key={feature}>{feature}</FeatureItem>
                      ))}
                    </ul>

                    <div className="mt-6">
                      {isCurrent ? (
                        <div className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] text-[13px] font-medium text-[#8B93A5]">
                          <Check className="h-4 w-4" /> Current plan
                        </div>
                      ) : plan.id === "FREE" ? (
                        <Link href="/generate" className={`flex h-11 w-full items-center justify-center text-[13px] font-medium ${BTN_SECONDARY}`}>
                          {plan.cta}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handlePlanClick(plan.id)}
                          disabled={isLoadingThis}
                          className={`flex h-11 w-full items-center justify-center text-[14px] ${
                            isPopular ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`
                          }`}
                        >
                          {isLoadingThis ? <Loader2 className="h-4 w-4 animate-spin" /> : plan.cta}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-center text-[12px] text-[#7A8294]">
              Need more without a subscription?{" "}
              <button type="button" onClick={() => selectTab("packs")} className="text-[#FFB27A] hover:underline">
                Buy a credit pack
              </button>
            </p>
          </section>
        )}

        {/* ═══ CREDIT PACKS ═══════════════════════════════════ */}
        {tab === "packs" && (
          <section id="credit-packs" aria-label="Credit packs">
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="text-[17px] font-semibold tracking-tight text-white">One-time credit packs</h2>
              <p className="text-[13px] text-[#8B93A5]">
                Pay once, no subscription. Credits never expire.
                {promoActive && " Launch bonus credits are included while the promo runs."}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {CREDIT_PACK_CARDS.map((pack) => {
                const bonus = promoActive ? pack.bonus : 0;
                const total = pack.credits + bonus;
                return (
                  <div
                    key={pack.key}
                    className={`relative flex flex-col rounded-2xl border bg-[#151922] p-5 transition-colors ${
                      pack.featured ? "border-[#FF8A3D]/60" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {pack.featured && <PopularPill>Most popular</PopularPill>}
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-[#FF8A3D]" />
                      <h3 className="font-display text-[18px] font-semibold text-white">{pack.name}</h3>
                    </div>
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">{formatPence(pack.price)}</span>
                      <span className="font-mono text-[12px] text-[#8B93A5]">one-time</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#ECEEF3]">
                        {total.toLocaleString()} credits
                      </span>
                      {bonus > 0 && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                          incl. +{bonus} bonus
                        </span>
                      )}
                    </div>
                    <p className="mt-3 flex-1 font-mono text-[11px] text-[#7A8294]">
                      {(pack.price / total).toFixed(1)}p/credit
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        track(FUNNEL.checkoutStart, { plan: pack.key, type: "credits" });
                        router.push(`/checkout/credits/${pack.slug}`);
                      }}
                      className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${
                        pack.featured ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`
                      }`}
                    >
                      Buy {pack.name}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ═══ LIFETIME ═══════════════════════════════════════ */}
        {tab === "lifetime" && (
          <section id="lifetime" aria-label="Lifetime deals">
            <div className="mb-5 flex flex-col gap-1">
              <h2 className="flex items-center gap-2 text-[17px] font-semibold tracking-tight text-white">
                <InfinityIcon className="h-4 w-4 text-[#FF8A3D]" /> Pay once, use forever
              </h2>
              <p className="text-[13px] text-[#8B93A5]">
                {TOTAL_LIFETIME_SLOTS} lifetime slots in total. One payment, monthly credits forever.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 pt-3 md:grid-cols-3">
              {LIFETIME_CARDS.map((deal) => {
                const slot = lifetimeSlots[deal.key];
                const soldOut = !!slot && slot.available <= 0;
                return (
                  <div
                    key={deal.key}
                    className={`relative flex flex-col rounded-2xl border bg-[#151922] p-5 transition-colors ${
                      soldOut
                        ? "border-white/[0.06] opacity-60"
                        : deal.featured
                          ? "border-[#FF8A3D]/60"
                          : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {deal.featured && !soldOut && <PopularPill>Best value</PopularPill>}
                    <h3 className="font-display text-[18px] font-semibold text-white">{deal.name}</h3>
                    <div className="mt-5 flex items-baseline gap-2">
                      <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{deal.price}</span>
                      <span className="font-mono text-[12px] text-[#7A8294] line-through">£{deal.originalPrice}</span>
                      <span className="font-mono text-[12px] text-[#8B93A5]">one-time</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#ECEEF3]">
                        {deal.credits.toLocaleString()} credits/mo, forever
                      </span>
                    </div>
                    <div className="mt-4 flex-1">
                      {slot ? (
                        <>
                          <div className="mb-1.5 flex justify-between font-mono text-[11px]">
                            <span className="text-[#7A8294]">{slot.sold} claimed</span>
                            <span className={soldOut ? "text-red-200" : "text-[#C9CFDB]"}>
                              {soldOut ? "Sold out" : `${slot.available} of ${slot.max} left`}
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                            <div className="h-full rounded-full bg-[#FF8A3D]" style={{ width: `${Math.min(100, (slot.sold / slot.max) * 100)}%` }} />
                          </div>
                        </>
                      ) : (
                        <p className="font-mono text-[11px] text-[#8B93A5]">
                          {deal.maxSlots} slot{deal.maxSlots === 1 ? "" : "s"} total
                        </p>
                      )}
                    </div>
                    {soldOut ? (
                      <div className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-[13px] font-medium text-[#7A8294]">
                        Sold out
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          track(FUNNEL.checkoutStart, { plan: deal.key, type: "lifetime" });
                          router.push(`/checkout/lifetime/${deal.slug}`);
                        }}
                        className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${
                          deal.featured ? BTN_PRIMARY : `${BTN_SECONDARY} font-semibold`
                        }`}
                      >
                        Claim lifetime
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-center text-[12px] text-[#7A8294]">
              Lifetime deals are early-adopter pricing — not available forever.
            </p>
          </section>
        )}

        {/* ═══ VALUE COMPARISON ═══════════════════════════════ */}
        <section className="mt-14">
          <p className={SECTION_LABEL}>Why it&apos;s worth it</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-white">Artist vs. SpriteLab</h2>
          <p className="mt-1 text-[13px] text-[#8B93A5]">Compare the cost of hiring an artist vs. using SpriteLab.</p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-[#151922] p-5">
              <h3 className="text-[15px] font-semibold text-white">Traditional artist</h3>
              <ul className="mt-4 space-y-2.5">
                {["£50-200 per sprite", "Days to weeks turnaround", "Limited revisions", "800 sprites = £40,000+"].map((t) => (
                  <li key={t} className="flex items-start gap-2.5 text-[13px] text-[#C9CFDB]">
                    <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7A8294]" strokeWidth={2.5} />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <span className="font-sans tracking-tight tabular-nums text-[28px] font-semibold text-[#C9CFDB]">£40,000+</span>
                <p className="font-mono text-[11px] text-[#7A8294]">for 800 game assets</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[#FF8A3D]/60 bg-[#151922] p-5">
              <h3 className="text-[15px] font-semibold text-white">With SpriteLab Pro</h3>
              <ul className="mt-4 space-y-2.5">
                <FeatureItem>~2.4p per credit</FeatureItem>
                <FeatureItem>Generation in seconds</FeatureItem>
                <FeatureItem>Regenerate as often as your credits allow</FeatureItem>
                <FeatureItem>500 credits = £12</FeatureItem>
              </ul>
              <div className="mt-6 border-t border-white/[0.06] pt-4">
                <span className="font-sans tracking-tight tabular-nums text-[28px] font-semibold text-white">£12</span>
                <span className="ml-1 font-mono text-[12px] text-[#8B93A5]">/month</span>
                <p className="font-mono text-[11px] text-[#7A8294]">500 credits + Premium AI</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ GUARANTEE ══════════════════════════════════════ */}
        <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#0E1016] p-5 sm:flex-row sm:items-center">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FF8A3D]/20 bg-[#FF8A3D]/[0.08]">
            <Shield className="h-5 w-5 text-[#FF8A3D]" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">7-day money-back guarantee</h2>
            <p className="mt-0.5 text-[13px] text-[#8B93A5]">
              Not satisfied? Get a full refund within 7 days. No questions asked.
            </p>
          </div>
        </section>

        {/* ═══ FAQ ════════════════════════════════════════════ */}
        <section className="mx-auto mt-14 max-w-3xl">
          <p className={SECTION_LABEL}>FAQ</p>
          <h2 className="mt-2 text-[20px] font-semibold tracking-tight text-white">Frequently asked questions</h2>
          <div className="mt-5 space-y-2">
            {faqs.map((faq) => (
              <FAQItem key={faq.q} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </section>
      </div>

      {/* ═══ FLOATING CTA (mobile) ═══════════════════════════ */}
      {currentPlan !== "PRO" && (
        <div className="fixed bottom-16 left-1/2 z-30 -translate-x-1/2 sm:hidden">
          <button
            type="button"
            onClick={() => handlePlanClick("PRO")}
            className={`flex items-center gap-2 whitespace-nowrap px-6 py-3 text-[14px] ${BTN_PRIMARY}`}
          >
            <Zap className="h-4 w-4" />
            Get Pro · <span className="font-mono">£12/mo</span>
          </button>
        </div>
      )}

      {/* Bottom padding for mobile CTA */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
