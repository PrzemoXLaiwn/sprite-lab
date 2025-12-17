"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, Zap, Rocket, Gift, Clock, Sparkles, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { UpgradeButton } from "@/components/dashboard/UpgradeButton";

interface SlotInfo {
  sold: number;
  max: number;
  available: number;
}

// 🚀 LAUNCH PROMO CONFIG
const LAUNCH_PROMO = {
  enabled: true,
  discount: 50, // 50% off first month
  endDate: "2025-01-31", // Promo end date
};

// Features listed here are ONLY those that are actually implemented
// Pricing in GBP (British Pounds) - ULTRA COMPETITIVE!
const plans = [
  {
    name: "Spark",
    description: "Perfect for trying out",
    price: 0,
    period: "forever",
    credits: "5 credits",
    features: [
      { text: "5 generation credits", included: true },
      { text: "All asset categories", included: true },
      { text: "All art styles", included: true },
      { text: "Premium AI models", included: true },
      { text: "High quality (1024x1024)", included: true },
      { text: "3-day gallery storage", included: true },
      { text: "Background removal", included: false },
      { text: "Premium features", included: false },
    ],
    cta: "Start Free",
    ctaVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Forge",
    description: "For indie developers",
    price: 2.49,
    period: "/month",
    credits: "50 credits/month",
    planId: "STARTER" as const,
    features: [
      { text: "50 credits per month", included: true },
      { text: "All asset categories", included: true },
      { text: "All art styles", included: true },
      { text: "Premium AI models", included: true },
      { text: "High quality (1024x1024)", included: true },
      { text: "30-day gallery storage", included: true },
      { text: "Background removal", included: true },
      { text: "PNG download", included: true },
    ],
    cta: "Get Forge",
    ctaVariant: "default" as const,
    popular: true,
  },
  {
    name: "Apex",
    description: "For game studios",
    price: 5.99,
    period: "/month",
    credits: "150 credits/month",
    planId: "PRO" as const,
    features: [
      { text: "150 credits per month", included: true },
      { text: "Unlimited gallery storage", included: true },
      { text: "Sprite Sheet Generator", included: true },
      { text: "Style Mixing", included: true },
      { text: "Color Palette Lock", included: true },
      { text: "Background removal", included: true },
      { text: "Image editing tools", included: true },
      { text: "All premium features", included: true },
    ],
    cta: "Get Apex",
    ctaVariant: "default" as const,
    popular: false,
  },
  {
    name: "Titan",
    description: "For power users",
    price: 16.99,
    period: "/month",
    credits: "500 credits/month",
    planId: "UNLIMITED" as const,
    features: [
      { text: "500 credits per month", included: true },
      { text: "All premium features", included: true },
      { text: "Sprite Sheet Generator", included: true },
      { text: "Style Mixing", included: true },
      { text: "Color Palette Lock", included: true },
      { text: "Priority generation queue", included: true },
      { text: "Priority support", included: true },
      { text: "Early access to features", included: true },
    ],
    cta: "Go Titan",
    ctaVariant: "outline" as const,
    popular: false,
  },
];

// 💎 LIFETIME DEALS - ONLY 50 SLOTS TOTAL EVER!
// Prices must match stripe.ts LIFETIME_DEALS config!
const lifetimeDeals = [
  {
    name: "Forge Lifetime",
    credits: "50 credits/month forever",
    price: 49, // £49 (4900 pence in stripe.ts)
    originalPrice: 60, // £60 (~19.7 months of £2.49/mo)
    savings: "18%",
    planId: "STARTER_LIFETIME",
    maxSlots: 30,
  },
  {
    name: "Apex Lifetime",
    credits: "150 credits/month forever",
    price: 99, // £99 (9900 pence in stripe.ts)
    originalPrice: 144, // £144 (~16.5 months of £5.99/mo)
    savings: "31%",
    popular: true,
    planId: "PRO_LIFETIME",
    maxSlots: 15,
  },
  {
    name: "Titan Lifetime",
    credits: "500 credits/month forever",
    price: 249, // £249 (24900 pence in stripe.ts)
    originalPrice: 408, // £408 (~14.7 months of £16.99/mo)
    savings: "39%",
    planId: "UNLIMITED_LIFETIME",
    maxSlots: 5,
  },
];

// 🔥 CREDIT PACKS WITH BONUSES
const creditPacks = [
  { name: "Ember", credits: 25, bonus: 5, price: 1.19 },
  { name: "Blaze", credits: 75, bonus: 15, price: 2.99, popular: true },
  { name: "Inferno", credits: 200, bonus: 50, price: 7.99 },
  { name: "Supernova", credits: 500, bonus: 150, price: 19.99 },
];

export function PricingSection() {
  const [lifetimeSlots, setLifetimeSlots] = useState<Record<string, SlotInfo>>({});

  useEffect(() => {
    // Fetch available lifetime slots
    fetch("/api/lifetime-slots")
      .then((res) => res.json())
      .then((data) => {
        if (data.slots) {
          setLifetimeSlots(data.slots);
        }
      })
      .catch(console.error);
  }, []);

  const getPromoPrice = (price: number) => {
    if (!LAUNCH_PROMO.enabled || price === 0) return null;
    return Math.round(price * (1 - LAUNCH_PROMO.discount / 100));
  };

  const getSlotInfo = (planId: string) => {
    return lifetimeSlots[planId] || null;
  };

  return (
    <section id="pricing" className="py-16 sm:py-24 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        {/* 🚀 Launch Promo Banner */}
        {LAUNCH_PROMO.enabled && (
          <div className="mb-8 sm:mb-12 p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 border border-orange-500/30 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-orange-500" />
              <span className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
                LAUNCH SPECIAL
              </span>
              <Rocket className="w-5 h-5 sm:w-6 sm:h-6 text-pink-500" />
            </div>
            <p className="text-base sm:text-lg font-semibold text-white mb-1">
              {LAUNCH_PROMO.discount}% OFF your first month!
            </p>
            <p className="text-xs sm:text-sm text-muted-foreground flex items-center justify-center gap-1">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Limited time offer
            </p>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center mb-10 sm:mb-16">
          <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary text-xs sm:text-sm font-medium mb-3 sm:mb-4">
            <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Simple Pricing
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4">
            Pay Only for What You Use
          </h2>
          <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto px-2">
            Start free, upgrade when you need more. No hidden fees, cancel anytime.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto mb-12 sm:mb-20">
          {plans.map((plan) => {
            const promoPrice = getPromoPrice(plan.price);
            return (
              <div
                key={plan.name}
                className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all duration-300 ${
                  plan.popular
                    ? "bg-card border-primary shadow-lg shadow-primary/10 sm:scale-105 z-10"
                    : "bg-card/50 border-border hover:border-primary/50"
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-primary to-purple-500 text-xs">
                    Most Popular
                  </Badge>
                )}

                {/* Promo Badge for paid plans */}
                {LAUNCH_PROMO.enabled && plan.price > 0 && (
                  <Badge className="absolute -top-2.5 sm:-top-3 right-2 sm:right-4 bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs">
                    {LAUNCH_PROMO.discount}% OFF
                  </Badge>
                )}

                <div className="text-center mb-4 sm:mb-6">
                  <h3 className="text-lg sm:text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{plan.description}</p>

                  {/* Price with promo */}
                  <div className="flex items-baseline justify-center gap-1.5 sm:gap-2">
                    {promoPrice !== null ? (
                      <>
                        <span className="text-lg sm:text-2xl text-muted-foreground line-through">£{plan.price}</span>
                        <span className="text-2xl sm:text-4xl font-bold text-green-500">£{promoPrice}</span>
                      </>
                    ) : (
                      <span className="text-2xl sm:text-4xl font-bold">£{plan.price}</span>
                    )}
                    <span className="text-muted-foreground text-xs sm:text-base">{plan.period}</span>
                  </div>
                  {promoPrice !== null && (
                    <p className="text-[10px] sm:text-xs text-orange-500 mt-1">First month only</p>
                  )}
                  <p className="text-xs sm:text-sm text-primary font-medium mt-2">{plan.credits}</p>
                </div>

                <ul className="space-y-1.5 sm:space-y-2 mb-4 sm:mb-6">
                  {plan.features.slice(0, 6).map((feature, index) => (
                    <li key={index} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm">
                      {feature.included ? (
                        <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground/50 shrink-0" />
                      )}
                      <span className={feature.included ? "" : "text-muted-foreground/50"}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                {plan.name === "Spark" ? (
                  <Button
                    variant={plan.ctaVariant}
                    className="w-full text-sm"
                    size="sm"
                    asChild
                  >
                    <Link href="/register">{plan.cta}</Link>
                  </Button>
                ) : (
                  <UpgradeButton
                    plan={plan.planId!}
                    variant={plan.ctaVariant}
                    className={`w-full text-sm ${
                      plan.popular
                        ? "bg-gradient-to-r from-primary to-purple-500 hover:opacity-90"
                        : ""
                    }`}
                  >
                    {plan.cta}
                  </UpgradeButton>
                )}
              </div>
            );
          })}
        </div>

        {/* 💎 Lifetime Deals Section - AGGRESSIVE PROMO */}
        <div className="mb-12 sm:mb-20 relative">
          {/* Glowing background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-orange-500/10 to-red-500/10 rounded-2xl sm:rounded-3xl blur-xl" />

          <div className="relative text-center mb-6 sm:mb-10 p-4 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-yellow-500/50 bg-gradient-to-b from-yellow-500/5 to-orange-500/5">
            {/* Urgency Banner */}
            <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-full bg-red-500/20 text-red-400 text-xs sm:text-lg font-bold mb-3 sm:mb-4 animate-pulse border border-red-500/50">
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="hidden sm:inline">ONLY 50 LIFETIME SPOTS - NEVER OFFERED AGAIN!</span>
              <span className="sm:hidden">50 LIFETIME SPOTS ONLY!</span>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Pay Once, Use FOREVER
            </h3>
            <p className="text-sm sm:text-lg text-muted-foreground mb-2 px-2">
              One-time payment. No monthly fees. Credits refresh every month, <span className="text-yellow-500 font-bold">FOREVER</span>.
            </p>
            <p className="text-xs sm:text-sm text-red-400 font-semibold">
              When these 50 spots are gone, lifetime deals are GONE. No exceptions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
            {lifetimeDeals.map((deal) => {
              const slotInfo = getSlotInfo(deal.planId);
              const isSoldOut = slotInfo && slotInfo.available <= 0;
              const slotsLeft = slotInfo ? slotInfo.available : deal.maxSlots;

              return (
                <div
                  key={deal.name}
                  className={`relative p-4 sm:p-6 rounded-xl sm:rounded-2xl border transition-all ${
                    isSoldOut
                      ? "bg-card/30 border-border opacity-60"
                      : deal.popular
                      ? "bg-gradient-to-b from-yellow-500/10 to-orange-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                      : "bg-card/50 border-border hover:border-yellow-500/50"
                  }`}
                >
                  {deal.popular && !isSoldOut && (
                    <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xs">
                      BEST VALUE
                    </Badge>
                  )}

                  {isSoldOut ? (
                    <Badge className="absolute -top-2.5 sm:-top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white font-bold text-xs">
                      SOLD OUT
                    </Badge>
                  ) : (
                    <Badge className="mb-3 sm:mb-4 bg-red-500/20 text-red-400 border-red-500/30 animate-pulse text-xs">
                      Only {slotsLeft} left!
                    </Badge>
                  )}

                  {!isSoldOut && (
                    <Badge className="mb-3 sm:mb-4 ml-2 bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                      Save {deal.savings}
                    </Badge>
                  )}

                  <h4 className="text-lg sm:text-xl font-bold mb-1">{deal.name}</h4>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">{deal.credits}</p>

                  <div className="mb-3 sm:mb-4">
                    <span className="text-sm sm:text-lg text-muted-foreground line-through">£{deal.originalPrice}</span>
                    <div className="flex items-baseline gap-1">
                      <span className={`text-2xl sm:text-4xl font-bold ${isSoldOut ? "text-muted-foreground" : "text-yellow-500"}`}>
                        £{deal.price}
                      </span>
                      <span className="text-muted-foreground text-xs sm:text-base">one-time</span>
                    </div>
                  </div>

                  {/* Slots progress bar */}
                  {!isSoldOut && slotInfo && (
                    <div className="mb-3 sm:mb-4">
                      <div className="flex justify-between text-[10px] sm:text-xs mb-1">
                        <span className="text-muted-foreground">{slotInfo.sold} sold</span>
                        <span className="text-yellow-500">{slotsLeft} remaining</span>
                      </div>
                      <div className="h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-500 to-red-500 transition-all"
                          style={{ width: `${(slotInfo.sold / slotInfo.max) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    className={`w-full text-sm ${
                      isSoldOut
                        ? "bg-muted text-muted-foreground cursor-not-allowed"
                        : deal.popular
                        ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90"
                        : "border-yellow-500/50 hover:bg-yellow-500/10"
                    }`}
                    variant={deal.popular ? "default" : "outline"}
                    size="sm"
                    disabled={isSoldOut}
                    asChild={!isSoldOut}
                  >
                    {isSoldOut ? (
                      <span>Sold Out</span>
                    ) : (
                      <Link href={`/checkout/lifetime/${deal.planId.toLowerCase()}`}>
                        Claim Your Spot
                      </Link>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 🔥 Credit Packs with Bonuses */}
        <div className="mb-12 sm:mb-20">
          <div className="text-center mb-6 sm:mb-10">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-orange-500/10 text-orange-500 text-xs sm:text-sm font-medium mb-3 sm:mb-4">
              <Gift className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Launch Bonus
            </div>
            <h3 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2">
              Credit Packs + FREE Bonus
            </h3>
            <p className="text-sm sm:text-base text-muted-foreground px-2">
              One-time purchase. Never expires. Get extra credits FREE during launch!
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {creditPacks.map((pack) => (
              <div
                key={pack.name}
                className={`relative p-3 sm:p-5 rounded-lg sm:rounded-xl border text-center transition-all ${
                  pack.popular
                    ? "bg-gradient-to-b from-orange-500/10 to-red-500/10 border-orange-500/50"
                    : "bg-card/50 border-border hover:border-orange-500/50"
                }`}
              >
                {pack.popular && (
                  <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] sm:text-xs">
                    Popular
                  </Badge>
                )}

                <p className="text-xl sm:text-2xl font-bold mb-0">{pack.credits}</p>
                <p className="text-green-500 font-semibold text-xs sm:text-sm mb-1 sm:mb-2">
                  +{pack.bonus} FREE
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground mb-2 sm:mb-3">
                  = {pack.credits + pack.bonus} total
                </p>
                <p className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">£{pack.price}</p>

                <Button
                  size="sm"
                  className="w-full text-xs sm:text-sm"
                  variant={pack.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={`/checkout/credits/${pack.name.toLowerCase()}`}>
                    Buy Now
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Teaser */}
        <div className="mt-10 sm:mt-16 text-center">
          <p className="text-sm sm:text-base text-muted-foreground">
            Have questions?{" "}
            <a href="#faq" className="text-primary hover:underline">
              Check our FAQ
            </a>{" "}
            or{" "}
            <a href="mailto:support@sprite-lab.com" className="text-primary hover:underline">
              contact us
            </a>
          </p>
        </div>

        {/* Cost Comparison */}
        <div className="mt-12 sm:mt-20 p-4 sm:p-8 rounded-xl sm:rounded-2xl bg-card border border-border max-w-3xl mx-auto">
          <h3 className="text-lg sm:text-xl font-bold text-center mb-4 sm:mb-6">
            Compare the Cost
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6 text-center">
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50">
              <p className="text-xl sm:text-2xl font-bold text-red-500">£40-160</p>
              <p className="text-xs sm:text-sm text-muted-foreground">per asset from a freelancer</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-muted/50">
              <p className="text-xl sm:text-2xl font-bold text-yellow-500">2-8 hours</p>
              <p className="text-xs sm:text-sm text-muted-foreground">if you create it yourself</p>
            </div>
            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20">
              <p className="text-xl sm:text-2xl font-bold text-primary">£0.034</p>
              <p className="text-xs sm:text-sm text-muted-foreground">per asset with SpriteLab Titan</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
