"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Coins, Infinity as InfinityIcon } from "lucide-react";
import {
  PLAN_CARDS,
  PLAN_CHECKOUT_SLUG,
  CREDIT_PACK_CARDS,
  LIFETIME_CARDS,
  TOTAL_LIFETIME_SLOTS,
  formatPence,
  type LifetimeSlotInfo,
} from "@/app/(public-app)/pricing/pricing-data";
import { fetchLaunchPromoStatus } from "@/app/(public-app)/pricing/page.actions";
import { SectionHeader } from "./SectionHeader";

// Display data comes from pricing-data.ts, a client-safe mirror of
// src/lib/stripe.ts (the source of truth for what is actually charged).
// Credit-pack bonuses are shown only while the server-side launch promo
// (isLaunchPromoActive) is active — the same check the checkout uses.

type Tab = "subscriptions" | "packs" | "lifetime";

const TABS: { id: Tab; label: string }[] = [
  { id: "subscriptions", label: "Subscriptions" },
  { id: "packs", label: "Credit packs" },
  { id: "lifetime", label: "Lifetime" },
];

const BTN_PRIMARY =
  "px-corners bg-[#FFA300] text-[#131A31] font-semibold hover:bg-[#FFB733] transition";
const BTN_SECONDARY =
  "rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C8CCE8] font-semibold hover:bg-white/[0.08] hover:text-white transition-colors";
const CARD = "relative flex flex-col rounded-2xl border bg-[#212B4E] p-5 transition-colors";
const CHIP = "rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#FFF1E8]";

function PopularPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FFA300] px-3 py-1 font-mono text-[11px] font-semibold text-black">
      {children}
    </span>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[13px] text-[#C8CCE8]">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFA300]" strokeWidth={2.5} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

export function PricingSection() {
  const [tab, setTab] = useState<Tab>("subscriptions");
  const [promoActive, setPromoActive] = useState(false);
  const [lifetimeSlots, setLifetimeSlots] = useState<Record<string, LifetimeSlotInfo>>({});
  const [lifetimeOn, setLifetimeOn] = useState(false);

  useEffect(() => {
    fetchLaunchPromoStatus()
      .then((r) => setPromoActive(r.active))
      .catch(() => {});

    // Fetch available lifetime slots
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          setLifetimeSlots(data.slots);
        }
        setLifetimeOn(data.salesEnabled === true);
      })
      .catch(console.error);
  }, []);

  const studio = PLAN_CARDS.find((p) => p.id === "UNLIMITED");
  const studioPerCredit = studio ? (studio.price / studio.credits).toFixed(3) : null;

  return (
    <section id="pricing" className="relative scroll-mt-16 py-16 sm:py-20">
      <div className="mx-auto max-w-[1200px] px-5 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <SectionHeader
            eyebrow="pricing"
            title="Simple pricing, paid in credits"
            intro="Every generation has a fixed credit price, shown before you click. Start free — subscribe or buy a pack when you need more. Cancel anytime."
          />

          <div role="tablist" aria-label="Pricing options" className="mt-8 inline-grid grid-cols-3 gap-1 rounded-xl bg-white/[0.04] p-1 text-[13px] font-medium">
            {TABS.filter((t) => t.id !== "lifetime" || lifetimeOn).map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`h-10 rounded-lg px-3 transition-colors sm:px-5 ${
                  tab === t.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#9AA1CC] hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-10">
          {/* Subscriptions */}
          {tab === "subscriptions" && (
            <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {PLAN_CARDS.map((plan) => (
                <div
                  key={plan.id}
                  className={`${CARD} ${plan.featured ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"}`}
                >
                  {plan.featured && <PopularPill>Most popular</PopularPill>}
                  <h3 className="font-display text-[18px] font-semibold text-white">{plan.name}</h3>
                  <p className="mt-1 text-[13px] text-[#9AA1CC]">{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{plan.price}</span>
                    <span className="font-mono text-[12px] text-[#9AA1CC]">{plan.price === 0 ? "forever" : "/month"}</span>
                  </div>
                  <div className="mt-4">
                    <span className={CHIP}>
                      {plan.credits.toLocaleString()} credits{plan.price === 0 ? "" : "/mo"}
                    </span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((f) => (
                      <FeatureItem key={f}>{f}</FeatureItem>
                    ))}
                  </ul>
                  {plan.id === "FREE" ? (
                    <Link href="/register" className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${BTN_SECONDARY}`}>
                      Start free
                    </Link>
                  ) : (
                    <Link
                      href={`/checkout/${PLAN_CHECKOUT_SLUG[plan.id]}`}
                      className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${plan.featured ? BTN_PRIMARY : BTN_SECONDARY}`}
                    >
                      {plan.cta}
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Credit packs */}
          {tab === "packs" && (
            <>
              <p className="mb-5 text-center text-[13px] text-[#9AA1CC]">
                One-time purchase. Credits never expire.
                {promoActive && " Launch bonus credits included while the promo runs."}
              </p>
              <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
                {CREDIT_PACK_CARDS.map((pack) => {
                  const bonus = promoActive ? pack.bonus : 0;
                  return (
                    <div
                      key={pack.key}
                      className={`${CARD} ${pack.featured ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"}`}
                    >
                      {pack.featured && <PopularPill>Most popular</PopularPill>}
                      <div className="flex items-center gap-2">
                        <Coins className="h-4 w-4 text-[#FFA300]" />
                        <h3 className="font-display text-[18px] font-semibold text-white">{pack.name}</h3>
                      </div>
                      <div className="mt-5 flex items-baseline gap-1.5">
                        <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">{formatPence(pack.price)}</span>
                        <span className="font-mono text-[12px] text-[#9AA1CC]">one-time</span>
                      </div>
                      <div className="mt-4 flex flex-1 flex-wrap items-start gap-1.5">
                        <span className={CHIP}>{(pack.credits + bonus).toLocaleString()} credits</span>
                        {bonus > 0 && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                            incl. +{bonus} bonus
                          </span>
                        )}
                      </div>
                      <Link
                        href={`/checkout/credits/${pack.slug}`}
                        className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${pack.featured ? BTN_PRIMARY : BTN_SECONDARY}`}
                      >
                        Buy {pack.name}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Lifetime */}
          {tab === "lifetime" && lifetimeOn && (
            <>
              <p className="mb-5 flex items-center justify-center gap-1.5 text-center text-[13px] text-[#9AA1CC]">
                <InfinityIcon className="h-4 w-4 text-[#FFA300]" />
                Pay once, credits every month forever — {TOTAL_LIFETIME_SLOTS} lifetime slots in total.
              </p>
              <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-4 pt-3 md:grid-cols-3">
                {LIFETIME_CARDS.map((deal) => {
                  const slot = lifetimeSlots[deal.key];
                  const soldOut = !!slot && slot.available <= 0;
                  const savings = Math.round((1 - deal.price / deal.originalPrice) * 100);
                  return (
                    <div
                      key={deal.key}
                      className={`${CARD} ${
                        soldOut
                          ? "border-white/[0.06] opacity-60"
                          : deal.featured
                            ? "border-[#FFA300]/60"
                            : "border-white/[0.08] hover:border-white/20"
                      }`}
                    >
                      {deal.featured && !soldOut && <PopularPill>Best value</PopularPill>}
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-display text-[18px] font-semibold text-white">{deal.name}</h3>
                        {!soldOut && (
                          <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2 py-0.5 font-mono text-[11px] text-emerald-200">
                            Save {savings}%
                          </span>
                        )}
                      </div>
                      <div className="mt-5 flex items-baseline gap-2">
                        <span className="font-sans tracking-tight tabular-nums text-[32px] font-semibold leading-none text-white">£{deal.price}</span>
                        <span className="font-mono text-[12px] text-[#8A92BF] line-through">£{deal.originalPrice}</span>
                        <span className="font-mono text-[12px] text-[#9AA1CC]">one-time</span>
                      </div>
                      <div className="mt-4">
                        <span className={CHIP}>{deal.credits.toLocaleString()} credits/mo, forever</span>
                      </div>
                      <div className="mt-4 flex-1">
                        {slot ? (
                          <>
                            <div className="mb-1.5 flex justify-between font-mono text-[11px]">
                              <span className="text-[#8A92BF]">{slot.sold} claimed</span>
                              <span className={soldOut ? "text-red-200" : "text-[#C8CCE8]"}>
                                {soldOut ? "Sold out" : `${slot.available} of ${slot.max} left`}
                              </span>
                            </div>
                            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-[#FFA300] transition-all"
                                style={{ width: `${Math.min(100, (slot.sold / slot.max) * 100)}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <p className="font-mono text-[11px] text-[#9AA1CC]">{deal.maxSlots} slots total</p>
                        )}
                      </div>
                      {soldOut ? (
                        <div className="mt-6 flex h-11 w-full items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-[13px] font-medium text-[#8A92BF]">
                          Sold out
                        </div>
                      ) : (
                        <Link
                          href={`/checkout/lifetime/${deal.slug}`}
                          className={`mt-6 flex h-11 w-full items-center justify-center text-[14px] ${deal.featured ? BTN_PRIMARY : BTN_SECONDARY}`}
                        >
                          Claim your spot
                        </Link>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Cost comparison */}
        <div className="mx-auto mt-14 max-w-[960px] rounded-2xl border border-white/[0.08] bg-[#19223F] p-5 sm:p-6">
          <h3 className="text-center font-display text-[18px] font-semibold text-white">Compare the cost</h3>
          <div className="mt-5 grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
            <div className="rounded-xl border border-white/[0.06] bg-[#212B4E] p-4">
              <p className="font-sans tracking-tight tabular-nums text-[22px] font-semibold text-[#C8CCE8]">£40–160</p>
              <p className="mt-1 text-[12px] text-[#9AA1CC]">per asset from a freelancer</p>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-[#212B4E] p-4">
              <p className="font-sans tracking-tight tabular-nums text-[22px] font-semibold text-[#C8CCE8]">2–8 hours</p>
              <p className="mt-1 text-[12px] text-[#9AA1CC]">if you create it yourself</p>
            </div>
            {studioPerCredit && (
              <div className="rounded-xl border border-[#FFA300]/40 bg-[#FFA300]/[0.06] p-4">
                <p className="font-sans tracking-tight tabular-nums text-[22px] font-semibold text-white">£{studioPerCredit}</p>
                <p className="mt-1 text-[12px] text-[#9AA1CC]">per credit with SpriteLab Studio</p>
              </div>
            )}
          </div>
        </div>

        {/* FAQ teaser */}
        <p className="mt-8 text-center text-[13px] text-[#9AA1CC]">
          Have questions?{" "}
          <a href="#faq" className="text-[#FFC857] underline-offset-4 hover:underline">
            Check our FAQ
          </a>{" "}
          or{" "}
          <a href="mailto:spritelab.contact@gmail.com" className="text-[#FFC857] underline-offset-4 hover:underline">
            contact us
          </a>
          .
        </p>
      </div>
    </section>
  );
}
