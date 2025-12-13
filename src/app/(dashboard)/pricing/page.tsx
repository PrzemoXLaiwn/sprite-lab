"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Sparkles, Zap, Crown, Rocket, Loader2, CreditCard, Gift, Settings, Flame, Clock, Infinity } from "lucide-react";
import { fetchUserPlan } from "./page.actions";
import Link from "next/link";

// 🚀 LAUNCH PROMO CONFIG
const LAUNCH_PROMO = {
  enabled: true,
  discount: 50, // 50% off first month
  endDate: "2025-01-31",
};

// Plan names must match the keys in PLANS from stripe.ts
// Features listed here are ONLY those that are actually implemented
// Pricing in GBP (British Pounds)
const plans = [
  {
    name: "Spark",
    stripePlan: "FREE",
    icon: Sparkles,
    price: "£0",
    period: "forever",
    credits: "15 credits",
    description: "Test the magic",
    features: [
      "15 generation credits",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "Download PNG format",
      "7-day gallery storage",
    ],
    limitations: [
      "No background removal",
      "No image editing",
    ],
    popular: false,
    cta: "Current Plan",
    disabled: true,
  },
  {
    name: "Forge",
    stripePlan: "STARTER",
    icon: Flame,
    price: "£12",
    period: "per month",
    credits: "75 credits/mo",
    description: "For indie developers",
    features: [
      "75 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "Download PNG format",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
    ],
    limitations: [],
    popular: true,
    cta: "Start Forging",
    disabled: false,
  },
  {
    name: "Apex",
    stripePlan: "PRO",
    icon: Crown,
    price: "£39",
    period: "per month",
    credits: "250 credits/mo",
    description: "For game studios",
    features: [
      "250 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "Download PNG format",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
      "Priority support",
    ],
    limitations: [],
    popular: false,
    cta: "Reach Apex",
    disabled: false,
  },
  {
    name: "Titan",
    stripePlan: "UNLIMITED",
    icon: Rocket,
    price: "£99",
    period: "per month",
    credits: "750 credits/mo",
    description: "For power users",
    features: [
      "750 credits per month",
      "All asset categories",
      "All art styles",
      "High quality (1024x1024)",
      "Download PNG format",
      "Unlimited gallery storage",
      "Background removal",
      "Image editing tools",
      "Priority support",
      "Early access to features",
    ],
    limitations: [],
    popular: false,
    cta: "Go Titan",
    disabled: false,
  },
];

// Credit packs with volume discounts (GBP) + LAUNCH BONUSES
const creditPacks = [
  {
    name: "Ember",
    credits: 25,
    bonus: 5, // Launch bonus
    price: "£4.99",
    perCredit: "£0.20",
    popular: false,
  },
  {
    name: "Blaze",
    credits: 60,
    bonus: 15, // Launch bonus
    price: "£9.99",
    perCredit: "£0.17",
    popular: true,
    savings: "15%",
  },
  {
    name: "Inferno",
    credits: 150,
    bonus: 50, // Launch bonus
    price: "£19.99",
    perCredit: "£0.13",
    popular: false,
    savings: "35%",
  },
  {
    name: "Supernova",
    credits: 400,
    bonus: 150, // Launch bonus
    price: "£44.99",
    perCredit: "£0.11",
    popular: false,
    savings: "45%",
  },
];

// 💎 LIFETIME DEALS
const lifetimeDeals = [
  {
    name: "Forge Lifetime",
    credits: "75 credits/month forever",
    price: 149,
    originalPrice: 288,
    savings: "48%",
    planId: "STARTER_LIFETIME",
  },
  {
    name: "Apex Lifetime",
    credits: "250 credits/month forever",
    price: 349,
    originalPrice: 936,
    savings: "63%",
    popular: true,
    planId: "PRO_LIFETIME",
  },
  {
    name: "Titan Lifetime",
    credits: "750 credits/month forever",
    price: 599,
    originalPrice: 2376,
    savings: "75%",
    planId: "UNLIMITED_LIFETIME",
  },
];

// Plan order for comparison (higher index = better plan)
const PLAN_ORDER = ["FREE", "STARTER", "PRO", "UNLIMITED"];

// Map plan names to URL-friendly versions
const PLAN_URL_MAP: Record<string, string> = {
  STARTER: "forge",
  PRO: "apex",
  UNLIMITED: "titan",
};

// Map credit pack to URL-friendly versions
const CREDIT_URL_MAP: Record<number, string> = {
  25: "ember",
  60: "blaze",
  150: "inferno",
  400: "supernova",
};

export default function PricingPage() {
  const router = useRouter();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [loadingCredits, setLoadingCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("FREE");
  const [currentPlanName, setCurrentPlanName] = useState<string>("Spark");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserPlan();
  }, []);

  const loadUserPlan = async () => {
    const result = await fetchUserPlan();
    if (result.success) {
      setCurrentPlan(result.plan);
      setCurrentPlanName(result.planName);
    }
    setIsLoading(false);
  };

  // Check if a plan is the current plan
  const isCurrentPlan = (stripePlan: string) => {
    return currentPlan === stripePlan;
  };

  // Check if a plan is a downgrade from current
  const isDowngrade = (stripePlan: string) => {
    const currentIndex = PLAN_ORDER.indexOf(currentPlan);
    const planIndex = PLAN_ORDER.indexOf(stripePlan);
    return planIndex < currentIndex;
  };

  // Get button text based on plan status
  const getButtonText = (stripePlan: string, defaultCta: string) => {
    if (isCurrentPlan(stripePlan)) return "Current Plan";
    if (isDowngrade(stripePlan)) return "Downgrade";
    return defaultCta;
  };

  // Check if button should be disabled
  const isButtonDisabled = (stripePlan: string) => {
    return isCurrentPlan(stripePlan) || loadingPlan === stripePlan;
  };

  const handlePlanClick = (stripePlan: string) => {
    if (stripePlan === "FREE" || isCurrentPlan(stripePlan)) return;

    // Redirect to custom checkout page
    const urlName = PLAN_URL_MAP[stripePlan] || stripePlan.toLowerCase();
    router.push(`/checkout/${urlName}`);
  };

  const handleCreditPackClick = (credits: number) => {
    // Redirect to custom checkout page for credits
    const urlName = CREDIT_URL_MAP[credits] || credits.toString();
    router.push(`/checkout/credits/${urlName}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* 🚀 Launch Promo Banner */}
      {LAUNCH_PROMO.enabled && (
        <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-500/20 via-red-500/20 to-pink-500/20 border border-orange-500/30 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Rocket className="w-6 h-6 text-orange-500" />
            <span className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-pink-500 bg-clip-text text-transparent">
              LAUNCH SPECIAL
            </span>
            <Rocket className="w-6 h-6 text-pink-500" />
          </div>
          <p className="text-lg font-semibold text-white mb-1">
            {LAUNCH_PROMO.discount}% OFF your first month!
          </p>
          <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
            <Clock className="w-4 h-4" />
            Limited time offer
          </p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm mb-6">
          <CreditCard className="w-4 h-4" />
          <span>Secure payments powered by Stripe</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-white">
          Choose Your Plan
        </h1>
        <p className="text-lg text-white/60 max-w-2xl mx-auto">
          Generate unlimited game assets with AI. Choose a plan that fits your needs.
        </p>

        {/* Current Plan Badge */}
        {currentPlan !== "FREE" && (
          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm">
            <Crown className="w-4 h-4" />
            <span>You're on the <strong>{currentPlanName}</strong> plan</span>
            <Link href="/settings" className="ml-2 hover:text-purple-300 transition-colors">
              <Settings className="w-4 h-4" />
            </Link>
          </div>
        )}

        {error && (
          <div className="mt-4 p-4 rounded-xl bg-[#ff4444]/10 border border-[#ff4444]/30 text-[#ff4444] max-w-md mx-auto">
            <p className="text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Subscription Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
        {plans.map((plan) => {
          const Icon = plan.icon;
          const isCurrent = isCurrentPlan(plan.stripePlan);
          return (
            <Card
              key={plan.name}
              className={`relative ${
                isCurrent
                  ? "border-purple-500 shadow-lg ring-2 ring-purple-500 bg-purple-500/5"
                  : plan.popular
                  ? "border-primary shadow-lg ring-2 ring-primary"
                  : "border-border"
              }`}
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-purple-500 text-white px-3 py-1">
                    Current Plan
                  </Badge>
                </div>
              ) : plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-3 py-1">
                    Most Popular
                  </Badge>
                </div>
              )}

              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-5 h-5 text-primary" />
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                </div>
                <div className="mb-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/{plan.period}</span>
                </div>
                <div className="text-sm font-medium text-primary mb-2">
                  {plan.credits}
                </div>
                <CardDescription className="text-sm">
                  {plan.description}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Button
                  className={`w-full mb-6 ${
                    isCurrent
                      ? "bg-purple-500/20 text-purple-400 border-purple-500/30 cursor-default"
                      : plan.popular
                      ? "bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:shadow-xl hover:shadow-[#00ff88]/30"
                      : "border-white/20 hover:border-[#00ff88]/50 hover:bg-[#00ff88]/10"
                  }`}
                  variant={isCurrent ? "outline" : plan.popular ? "default" : "outline"}
                  disabled={isButtonDisabled(plan.stripePlan)}
                  onClick={() => handlePlanClick(plan.stripePlan)}
                >
                  {loadingPlan === plan.stripePlan ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : isCurrent ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    getButtonText(plan.stripePlan, plan.cta)
                  )}
                </Button>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}

                  {plan.limitations.length > 0 && (
                    <>
                      <div className="border-t border-border my-3" />
                      {plan.limitations.map((limitation, i) => (
                        <div key={i} className="flex items-start gap-2 opacity-60">
                          <span className="text-sm text-muted-foreground">
                            • {limitation}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* 💎 Lifetime Deals Section */}
      <div className="mt-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Limited Lifetime Deals
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Pay Once, Use Forever
          </h2>
          <p className="text-muted-foreground">
            One-time payment. No monthly fees. Credits refresh every month, forever.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {lifetimeDeals.map((deal) => (
            <Card
              key={deal.name}
              className={`relative ${
                deal.popular
                  ? "bg-gradient-to-b from-yellow-500/10 to-orange-500/10 border-yellow-500/50 shadow-lg shadow-yellow-500/10"
                  : "border-border hover:border-yellow-500/50"
              }`}
            >
              {deal.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold">
                    BEST VALUE
                  </Badge>
                </div>
              )}
              <CardContent className="pt-6">
                <Badge className="mb-4 bg-green-500/20 text-green-500 border-green-500/30">
                  Save {deal.savings}
                </Badge>
                <h4 className="text-xl font-bold mb-1">{deal.name}</h4>
                <p className="text-sm text-muted-foreground mb-4 flex items-center gap-1">
                  <Infinity className="w-4 h-4" />
                  {deal.credits}
                </p>
                <div className="mb-4">
                  <span className="text-lg text-muted-foreground line-through">£{deal.originalPrice}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-yellow-500">£{deal.price}</span>
                    <span className="text-muted-foreground text-sm">one-time</span>
                  </div>
                </div>
                <Button
                  className={`w-full ${
                    deal.popular
                      ? "bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold hover:opacity-90"
                      : "border-yellow-500/50 hover:bg-yellow-500/10"
                  }`}
                  variant={deal.popular ? "default" : "outline"}
                  asChild
                >
                  <Link href={`/checkout/lifetime/${deal.planId.toLowerCase()}`}>
                    Get Lifetime Access
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Credit Packs with Bonuses */}
      <div className="mt-16">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-500 text-sm font-medium mb-4">
            <Gift className="w-4 h-4" />
            Launch Bonus
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-2">
            Credit Packs + FREE Bonus
          </h2>
          <p className="text-muted-foreground">
            One-time purchase. Never expires. Get extra credits FREE during launch!
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {creditPacks.map((pack) => (
            <Card
              key={pack.credits}
              className={`relative ${
                pack.popular ? "border-orange-500 ring-2 ring-orange-500 bg-gradient-to-b from-orange-500/10 to-red-500/10" : ""
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                  <Badge className="bg-orange-500 text-white text-xs">
                    Popular
                  </Badge>
                </div>
              )}
              <CardContent className="pt-6">
                {pack.savings && (
                  <Badge className="mb-3 bg-green-600 hover:bg-green-600">
                    Save {pack.savings}
                  </Badge>
                )}
                <div className="text-center mb-4">
                  <p className="text-3xl font-bold mb-0">{pack.credits}</p>
                  <p className="text-green-500 font-semibold text-sm">+{pack.bonus} FREE</p>
                  <p className="text-xs text-muted-foreground">= {pack.credits + pack.bonus} total</p>
                </div>
                <div className="text-center mb-4">
                  <p className="text-2xl font-bold">{pack.price}</p>
                  <p className="text-xs text-muted-foreground">
                    {pack.perCredit} per credit
                  </p>
                </div>
                <Button
                  className={`w-full ${
                    pack.popular
                      ? "bg-gradient-to-r from-orange-500 to-red-500 text-white font-bold hover:shadow-xl hover:shadow-orange-500/30"
                      : "border-white/20 hover:border-orange-500/50 hover:bg-orange-500/10"
                  }`}
                  variant={pack.popular ? "default" : "outline"}
                  disabled={loadingCredits === pack.credits}
                  onClick={() => handleCreditPackClick(pack.credits)}
                >
                  {loadingCredits === pack.credits ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Gift className="w-4 h-4 mr-2" />
                      Buy Now
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="mt-16 max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-8">
          Frequently Asked Questions
        </h2>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">What is a generation credit?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                One credit = one AI image generation. Each time you generate an asset,
                it costs 1 credit. Credits reset monthly for subscription plans.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Can I use generated assets commercially?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Yes! All paid plans (Starter, Pro, Unlimited) include full commercial
                use rights. Free plan is for personal/testing use only.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Do unused credits roll over?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Subscription credits reset monthly. One-time credit packs never expire
                and can be used anytime.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Can I cancel anytime?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Absolutely! You can cancel your subscription at any time. You'll keep
                access until the end of your billing period.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
