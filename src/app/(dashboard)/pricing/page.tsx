"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  Rocket,
  Loader2,
  Clock,
  Users,
  TrendingUp,
  Star,
  Shield,
  ChevronDown,
  Flame,
  Image as ImageIcon,
  Cpu,
  Gift
} from "lucide-react";
import { fetchUserPlan } from "./page.actions";

// ===========================================
// CONFIGURATION
// ===========================================

const PROMO_CONFIG = {
  enabled: true,
  endDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
  totalSlots: 100,
  claimedSlots: 23,
};

const plans = [
  {
    id: "free",
    name: "Free",
    stripePlan: "FREE",
    icon: Sparkles,
    price: 0,
    oldPrice: null,
    credits: 5,
    bonusCredits: 0,
    description: "Try it free",
    features: [
      "5 generation credits",
      "All asset categories",
      "Fast AI model",
      "PNG downloads",
    ],
    cta: "Current Plan",
    featured: false,
  },
  {
    id: "starter",
    name: "Starter",
    stripePlan: "STARTER",
    icon: Flame,
    price: 5,
    oldPrice: 15,
    credits: 250,
    bonusCredits: 0,
    description: "Perfect for indie devs",
    features: [
      "250 credits/month",
      "All art styles",
      "Fast AI model",
      "Background removal",
      "30-day storage",
      "Commercial license",
    ],
    cta: "Get Started",
    featured: false,
  },
  {
    id: "pro",
    name: "Pro",
    stripePlan: "PRO",
    icon: Crown,
    price: 12,
    oldPrice: 35,
    credits: 500,
    bonusCredits: 0,
    description: "For serious creators",
    features: [
      "500 credits/month",
      "Premium AI model",
      "Best quality output",
      "Sprite sheets",
      "Image editing",
      "Unlimited storage",
      "Commercial license",
    ],
    cta: "Go Pro",
    featured: true,
  },
  {
    id: "studio",
    name: "Studio",
    stripePlan: "UNLIMITED",
    icon: Rocket,
    price: 25,
    oldPrice: 75,
    credits: 1200,
    bonusCredits: 0,
    description: "For teams & studios",
    features: [
      "1200 credits/month",
      "Everything in Pro",
      "Priority support",
      "Early access",
      "Custom styles",
      "API access (soon)",
    ],
    cta: "Go Studio",
    featured: false,
  },
];

const PLAN_URL_MAP: Record<string, string> = {
  STARTER: "starter",
  PRO: "pro",
  UNLIMITED: "studio",
};

const faqs = [
  {
    q: "What is a generation credit?",
    a: "One credit = one AI-generated image. Each time you create a sprite, character, or any game asset, it uses 1 credit. It's that simple!",
  },
  {
    q: "Can I use assets commercially?",
    a: "Absolutely! All paid plans include full commercial rights. Use your assets in games, apps, or any project you sell. Free plan is for testing only.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Subscription credits reset monthly. Want credits that never expire? Check out our one-time credit packs below!",
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
    <div className="flex items-center gap-1 font-mono">
      <div className="bg-black/30 px-2 py-1 rounded text-lg font-bold min-w-[2.5rem] text-center">
        {String(hours).padStart(2, "0")}
      </div>
      <span className="text-white/60">:</span>
      <div className="bg-black/30 px-2 py-1 rounded text-lg font-bold min-w-[2.5rem] text-center">
        {String(minutes).padStart(2, "0")}
      </div>
      <span className="text-white/60">:</span>
      <div className="bg-black/30 px-2 py-1 rounded text-lg font-bold min-w-[2.5rem] text-center">
        {String(seconds).padStart(2, "0")}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, value, label }: { icon: React.ElementType; value: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <Icon className="w-5 h-5 text-[#00ff88]" />
      <div>
        <div className="font-bold text-white">{value}</div>
        <div className="text-xs text-white/60">{label}</div>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
      >
        <span className="font-medium text-white">{question}</span>
        <ChevronDown className={`w-5 h-5 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-white/70 text-sm">
          {answer}
        </div>
      )}
    </div>
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
  const [stats, setStats] = useState({
    totalAssets: 0,
    activeUsers: 0,
    totalUsers: 0,
  });

  useEffect(() => {
    loadUserPlan();
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

  const loadUserPlan = async () => {
    const result = await fetchUserPlan();
    if (result.success) {
      setCurrentPlan(result.plan);
    }
    setIsLoading(false);
  };

  const handlePlanClick = (stripePlan: string) => {
    if (stripePlan === "FREE" || currentPlan === stripePlan) return;
    setLoadingPlan(stripePlan);
    const urlName = PLAN_URL_MAP[stripePlan] || stripePlan.toLowerCase();
    router.push(`/checkout/${urlName}`);
  };

  const slotsRemaining = PROMO_CONFIG.totalSlots - PROMO_CONFIG.claimedSlots;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* ============================================ */}
      {/* URGENCY BANNER */}
      {/* ============================================ */}
      {PROMO_CONFIG.enabled && (
        <div className="bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 text-white py-3">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-bold">LAUNCH SALE ENDS IN:</span>
            </div>
            <CountdownTimer endDate={PROMO_CONFIG.endDate} />
            <div className="flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full">
              <Zap className="w-4 h-4" />
              <span className="font-bold">UP TO 70% OFF</span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================ */}
      {/* SOCIAL PROOF BAR */}
      {/* ============================================ */}
      <div className="bg-[#0f0f18] border-b border-white/10 py-3">
        <div className="max-w-6xl mx-auto px-4 flex flex-wrap items-center justify-center gap-4 sm:gap-8">
          <StatCard icon={Users} value={`${stats.totalUsers > 0 ? stats.totalUsers.toLocaleString() : stats.activeUsers.toLocaleString()}+`} label="Registered Users" />
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <StatCard icon={ImageIcon} value={stats.totalAssets.toLocaleString()} label="Assets Created" />
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <StatCard icon={Star} value="4.9/5" label="User Rating" />
          <div className="hidden sm:block w-px h-8 bg-white/10" />
          <StatCard icon={Cpu} value="<3s" label="Generation Speed" />
        </div>
      </div>

      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div className="pt-12 pb-8 text-center px-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm mb-6">
          <Gift className="w-4 h-4" />
          <span>First {slotsRemaining} users get 50% OFF forever!</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-white/60 max-w-2xl mx-auto">
          No hidden fees. No surprises. Cancel anytime.
        </p>
      </div>

      {/* ============================================ */}
      {/* PRICING CARDS */}
      {/* ============================================ */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan === plan.stripePlan;
            const isPopular = plan.featured;
            const discount = plan.oldPrice ? Math.round((1 - plan.price / plan.oldPrice) * 100) : 0;

            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-6 transition-all duration-300 ${
                  isPopular
                    ? "bg-gradient-to-b from-[#00ff88]/20 to-[#00d4ff]/10 border-2 border-[#00ff88] shadow-xl shadow-[#00ff88]/20 scale-105 z-10"
                    : "bg-[#12121a] border border-white/10 hover:border-white/20"
                }`}
              >
                {/* Popular Badge */}
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                      <Crown className="w-4 h-4" />
                      MOST POPULAR
                    </div>
                  </div>
                )}

                {/* Current Plan Badge */}
                {isCurrent && !isPopular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <div className="bg-purple-500 text-white px-4 py-1 rounded-full text-sm font-bold">
                      CURRENT PLAN
                    </div>
                  </div>
                )}

                {/* Plan Header */}
                <div className="text-center mb-6 pt-2">
                  <div className={`inline-flex p-3 rounded-xl mb-3 ${isPopular ? "bg-[#00ff88]/20" : "bg-white/5"}`}>
                    <Icon className={`w-6 h-6 ${isPopular ? "text-[#00ff88]" : "text-white/60"}`} />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-sm text-white/50">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="text-center mb-6">
                  {plan.oldPrice && (
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className="text-white/40 line-through text-lg">${plan.oldPrice}</span>
                      <span className="bg-red-500/20 text-red-400 px-2 py-0.5 rounded text-xs font-bold">
                        -{discount}%
                      </span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold text-white">${plan.price}</span>
                    <span className="text-white/50">/mo</span>
                  </div>
                  <div className="mt-2">
                    <span className="text-sm text-[#00ff88] font-medium">
                      {plan.credits + plan.bonusCredits} credits/month
                    </span>
                    {plan.bonusCredits > 0 && (
                      <span className="ml-2 text-xs text-yellow-400 font-medium">
                        (+{plan.bonusCredits} bonus!)
                      </span>
                    )}
                  </div>
                  {plan.price > 0 && (
                    <div className="mt-1 text-xs text-white/40">
                      ${(plan.price / (plan.credits + plan.bonusCredits) * 100).toFixed(1)}¢ per credit
                    </div>
                  )}
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 shrink-0 mt-0.5 ${isPopular ? "text-[#00ff88]" : "text-white/40"}`} />
                      <span className="text-white/80">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <Button
                  onClick={() => handlePlanClick(plan.stripePlan)}
                  disabled={isCurrent || loadingPlan === plan.stripePlan}
                  className={`w-full py-6 text-base font-bold transition-all ${
                    isCurrent
                      ? "bg-purple-500/20 text-purple-400 border border-purple-500/30 cursor-default"
                      : isPopular
                      ? "bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black hover:shadow-lg hover:shadow-[#00ff88]/30 hover:scale-105"
                      : "bg-white/10 text-white hover:bg-white/20 border border-white/10"
                  }`}
                >
                  {loadingPlan === plan.stripePlan ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isCurrent ? (
                    <>
                      <Check className="w-5 h-5 mr-2" />
                      Current Plan
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================ */}
      {/* VALUE COMPARISON */}
      {/* ============================================ */}
      <div className="bg-[#0f0f18] py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-4">
            Why SpriteLab is Worth It
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-2xl mx-auto">
            Compare the cost of hiring an artist vs. using SpriteLab
          </p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Traditional Way */}
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-red-400 mb-4">Traditional Artist</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-white/70">
                  <span className="text-red-400">✕</span>
                  $50-200 per sprite
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <span className="text-red-400">✕</span>
                  Days to weeks turnaround
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <span className="text-red-400">✕</span>
                  Limited revisions
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <span className="text-red-400">✕</span>
                  800 sprites = $40,000+
                </li>
              </ul>
              <div className="mt-6 text-center">
                <span className="text-3xl font-bold text-red-400">$40,000+</span>
                <p className="text-white/50 text-sm">for 800 game assets</p>
              </div>
            </div>

            {/* SpriteLab Way */}
            <div className="bg-[#00ff88]/10 border border-[#00ff88]/30 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-[#00ff88] mb-4">With SpriteLab Pro</h3>
              <ul className="space-y-3">
                <li className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00ff88]" />
                  ~2.4¢ per sprite
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00ff88]" />
                  Instant generation (&lt;3 sec)
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00ff88]" />
                  Unlimited regenerations
                </li>
                <li className="flex items-center gap-2 text-white/70">
                  <Check className="w-4 h-4 text-[#00ff88]" />
                  500 sprites = $12
                </li>
              </ul>
              <div className="mt-6 text-center">
                <span className="text-3xl font-bold text-[#00ff88]">$12/mo</span>
                <p className="text-white/50 text-sm">500 credits + Premium AI</p>
              </div>
            </div>
          </div>

          <div className="text-center mt-8">
            <p className="text-2xl font-bold text-white">
              Save up to <span className="text-[#00ff88]">99.9%</span> on game art
            </p>
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* GUARANTEE */}
      {/* ============================================ */}
      <div className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex p-4 rounded-full bg-[#00ff88]/10 mb-6">
            <Shield className="w-12 h-12 text-[#00ff88]" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            7-Day Money-Back Guarantee
          </h2>
          <p className="text-white/60 text-lg">
            Not satisfied? Get a full refund within 7 days. No questions asked.
            We're confident you'll love SpriteLab.
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* FAQ */}
      {/* ============================================ */}
      <div className="bg-[#0f0f18] py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <FAQItem key={i} question={faq.q} answer={faq.a} />
            ))}
          </div>
        </div>
      </div>

      {/* ============================================ */}
      {/* FLOATING CTA */}
      {/* ============================================ */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:hidden">
        <Button
          onClick={() => handlePlanClick("PRO")}
          className="bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold px-8 py-6 rounded-full shadow-lg shadow-[#00ff88]/30"
        >
          <Zap className="w-5 h-5 mr-2" />
          Get Pro - $12/mo
        </Button>
      </div>

      {/* Bottom padding for mobile CTA */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
