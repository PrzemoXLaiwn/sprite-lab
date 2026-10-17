// =============================================================================
// /pricing — server component. Plans, credit packs, what each action costs and
// the FAQ are rendered on the server from the same config the checkout routes
// charge from (src/lib/stripe.ts, src/config/animations.ts), so visitors and
// search engines get the full page in the first HTML. Visitor-specific bits
// (current plan, checkout buttons, lifetime availability, live stats) are
// client islands in pricing-client.tsx.
// =============================================================================

import Link from "next/link";
import { Check, ChevronDown, Coins, Shield, X } from "lucide-react";
import { CREDIT_PACKS, LIFETIME_DEALS, PLANS, isLaunchPromoActive } from "@/lib/stripe";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "@/config/animations";
import { featureCredits } from "@/config/economics";
import { CREDIT_PACK_CARDS, LIFETIME_CARDS, PLAN_CARDS, formatPence, type CreditPackCard, type LifetimeCard, type PlanCard } from "./pricing-data";
import {
  CurrentPlanBadge,
  CurrentPlanPill,
  LifetimeSection,
  MobileProCta,
  PackBuyButton,
  PlanAction,
  PricingProvider,
  PricingStats,
} from "./pricing-client";

// Static (no database, no session); hourly so the launch promo can switch off on time
export const revalidate = 3600;



/** Display cards with the numbers taken from the config Stripe charges from. */
function plans(): PlanCard[] {
  return PLAN_CARDS.map((card) => {
    const plan = PLANS[card.id];
    return { ...card, name: plan.name, price: plan.price, credits: plan.credits };
  });
}

function packs(): CreditPackCard[] {
  return CREDIT_PACK_CARDS.map((card) => {
    const pack = CREDIT_PACKS[card.key];
    return { ...card, name: pack.name, credits: pack.credits, bonus: pack.bonus, price: pack.price };
  });
}

function lifetimeDeals(): LifetimeCard[] {
  return LIFETIME_CARDS.map((card) => {
    const deal = LIFETIME_DEALS[card.key];
    return { ...card, name: deal.name, credits: deal.credits, price: deal.price / 100, originalPrice: deal.originalPrice / 100, maxSlots: deal.maxSlots };
  });
}

/** What each action costs, from the same constants the API routes charge. */
function costRows(): [string, string, string][] {
  const anim = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames} frames: ${animationCredits(o.frames, false)}`).join(" · ");
  const smooth = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames * 2} frames: ${animationCredits(o.frames, true)}`).join(" · ");
  const rot = (id: string) => ROTATIONS.find((r) => r.id === id)?.credits ?? 0;
  const charged = featureCredits();
  return [
    ["Sprite, Standard quality", String(charged.sprite), "Transparent PNG in any of the 12 styles"],
    ["Sprite, HD quality", String(charged.sprite_hd), "A second, more detailed image model"],
    ["Idle loop", String(RIG_CREDITS), "The sprite breathes or hovers; nothing is redrawn"],
    ["Animation (key poses)", anim, "Idle, walk, run, attack, jump, cast, hurt, fly or your own motion"],
    ["Animation, smooth", smooth, "Adds AI in-between frames"],
    ["4 directions", String(rot("rotate4")), "Front, right, back and left views"],
    ["8 directions", String(rot("rotate8")), "Every 45°, for top-down and isometric games"],
    ["4-direction walk", String(rot("walk4dir")), "RPG walk sheet: 4 rows × 4 steps"],
    ["Pixel-perfect upscale", "Free", "Nearest-neighbour, up to 4096 px"],
  ];
}

/** Inline links need a cue besides colour (Lighthouse) and a 24px target. */
const TEXT_LINK =
  "inline-flex min-h-6 items-center text-[#FFC857] underline decoration-[#FFC857]/80 underline-offset-[3px] transition-colors hover:text-white";

const FAQS = [
  {
    q: "What is a generation credit?",
    a: "Credits are spent each time you generate. A Standard sprite costs 1 credit and an HD sprite costs 3 — the cost is always shown on the Generate button before you spend anything.",
  },
  {
    q: "Will my price go up later?",
    a: "Your price stays the same as long as your subscription is active and we keep that plan available. If you cancel and resubscribe later, the price at that time applies.",
  },
  {
    q: "Can I use assets commercially?",
    a: "Yes. You own what you generate and can use it in games, apps or anything you sell — on any plan, with no attribution required.",
  },
  {
    q: "Do unused credits roll over?",
    a: "Subscription credits reset every month. Want credits that never expire? Buy a one-time credit pack instead.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel any time from your account — no contract. You keep your plan until the end of the billing period.",
  },
  {
    q: "Do paid plans get better quality?",
    a: "No — every plan, including Free, gets the same models, all 12 art styles and both Standard and HD quality. Plans differ in monthly credits and a few extra tools (background removal, AI upscale, variations).",
  },
  {
    q: "What happens if a generation fails?",
    a: "The credits are returned automatically. You are only charged for results you actually receive.",
  },
];

export default function PricingPage() {
  const planCards = plans();
  const packCards = packs();
  const promoActive = isLaunchPromoActive();
  const planNames = Object.fromEntries(planCards.map((p) => [p.id, p.name]));
  const pro = planCards.find((p) => p.id === "PRO");
  const proPrice = pro?.price ?? 0;
  const proCredits = pro?.credits ?? 0;
  const proPence = proCredits > 0 ? ((proPrice / proCredits) * 100).toFixed(1) : "0";

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };

  return (
    <PricingProvider>
      <div className="min-h-screen bg-[#131A31] text-[#FFF1E8]">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

        {/* ═══ HEADER ═══════════════════════════════════════════ */}
        <div className="relative border-b border-white/[0.06]">
          <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
          <div className="relative mx-auto max-w-[1200px] px-5 pb-8 pt-10 sm:pt-14 lg:px-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="mt-3 font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[44px]">
                  Plans &amp; credits
                </h1>
                <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-[#9AA1CC]">
                  Every plan gets all 12 styles in Standard and HD; plans differ in monthly credits and a few extra tools. Cancel anytime. New
                  accounts start with 10 free credits, no card required.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <CurrentPlanPill planNames={planNames} />
                <PricingStats />
              </div>
            </div>

            <nav aria-label="Pricing options" className="mt-6 flex flex-wrap gap-1 rounded-xl bg-white/[0.04] p-1 text-[13px] font-medium sm:inline-flex">
              {[
                ["#subscriptions", "Subscriptions"],
                ["#credit-packs", "Credit packs"],
                ["#costs", "Costs"],
              ].map(([href, label]) => (
                <a key={href} href={href} className="flex h-10 flex-1 items-center justify-center rounded-lg px-3 text-[#C8CCE8] transition-colors hover:bg-white/[0.08] hover:text-white sm:flex-none sm:px-5">
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-5 py-8 pb-[max(2rem,calc(6.5rem+env(safe-area-inset-bottom)))] sm:pb-8 lg:px-8">
          {/* ═══ SUBSCRIPTIONS ══════════════════════════════════ */}
          <section id="subscriptions" aria-labelledby="subscriptions-heading" className="scroll-mt-24">
            <h2 id="subscriptions-heading" className="text-[17px] font-semibold tracking-tight text-white">
              Monthly plans
            </h2>
            <p className="mt-1 text-[13px] text-[#9AA1CC]">Credits refresh every month. Prices in GBP.</p>
            <div className="mt-2 grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {planCards.map((plan) => (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border bg-[#212B4E] p-5 transition-colors ${
                    plan.featured ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"
                  }`}
                >
                  {plan.featured && <PopularPill>Most popular</PopularPill>}
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-[18px] font-semibold text-white">{plan.name}</h3>
                    <CurrentPlanBadge planId={plan.id} />
                  </div>
                  <p className="mt-1 text-[13px] text-[#9AA1CC]">{plan.description}</p>
                  <div className="mt-5 flex items-baseline gap-1.5">
                    <span className="font-sans text-[32px] font-semibold leading-none tracking-tight text-white tabular-nums">£{plan.price}</span>
                    <span className="font-mono text-[12px] text-[#9AA1CC]">/month</span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#FFF1E8]">
                      {plan.price > 0 ? `${plan.credits.toLocaleString("en-GB")} credits/mo` : `${plan.credits} credits to start`}
                    </span>
                    {plan.price > 0 && (
                      <span className="font-mono text-[11px] text-[#8A92BF]">{((plan.price / plan.credits) * 100).toFixed(1)}p/credit</span>
                    )}
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <FeatureItem key={feature}>{feature}</FeatureItem>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <PlanAction planId={plan.id} cta={plan.cta} featured={plan.featured} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* In flow under the cards, then sticks while the rest of the page scrolls. */}
          <MobileProCta price={proPrice} />

          {/* ═══ CREDIT PACKS ═══════════════════════════════════ */}
          <section id="credit-packs" aria-labelledby="packs-heading" className="mt-14 scroll-mt-24">
            <h2 id="packs-heading" className="text-[17px] font-semibold tracking-tight text-white">
              One-time credit packs
            </h2>
            <p className="mt-1 text-[13px] text-[#9AA1CC]">
              Pay once, no subscription. Credits never expire.
              {promoActive && " Launch bonus credits are included while the promo runs."}
            </p>
            <div className="mt-2 grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2 lg:grid-cols-4">
              {packCards.map((pack) => {
                const bonus = promoActive ? pack.bonus : 0;
                const total = pack.credits + bonus;
                return (
                  <div
                    key={pack.key}
                    className={`relative flex flex-col rounded-2xl border bg-[#212B4E] p-5 transition-colors ${
                      pack.featured ? "border-[#FFA300]/60" : "border-white/[0.08] hover:border-white/20"
                    }`}
                  >
                    {pack.featured && <PopularPill>Most popular</PopularPill>}
                    <div className="flex items-center gap-2">
                      <Coins className="h-4 w-4 text-[#FFA300]" aria-hidden="true" />
                      <h3 className="font-display text-[18px] font-semibold text-white">{pack.name}</h3>
                    </div>
                    <div className="mt-5 flex items-baseline gap-1.5">
                      <span className="font-sans text-[32px] font-semibold leading-none tracking-tight text-white tabular-nums">{formatPence(pack.price)}</span>
                      <span className="font-mono text-[12px] text-[#9AA1CC]">one-time</span>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[11px] text-[#FFF1E8]">
                        {total.toLocaleString("en-GB")} credits
                      </span>
                      {bonus > 0 && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-200">
                          incl. +{bonus} bonus
                        </span>
                      )}
                    </div>
                    <p className="mt-3 flex-1 font-mono text-[11px] text-[#8A92BF]">{(pack.price / total).toFixed(1)}p/credit</p>
                    <PackBuyButton packKey={pack.key} slug={pack.slug} name={pack.name} featured={Boolean(pack.featured)} />
                  </div>
                );
              })}
            </div>
          </section>

          <LifetimeSection deals={lifetimeDeals()} />

          {/* ═══ COSTS ══════════════════════════════════════════ */}
          <section id="costs" aria-labelledby="costs-heading" className="mt-14 scroll-mt-24">
            <h2 id="costs-heading" className="mt-3 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[32px]">
              What things cost
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-[#9AA1CC]">
              Every action has a fixed price in credits, shown on the button before you spend anything. If a generation fails, the credits
              go back to your balance.
            </p>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-white/[0.08]">
              <table className="w-full min-w-[560px] border-collapse text-left text-[14px] leading-snug">
                <thead className="bg-[#212B4E]">
                  <tr>
                    {["Action", "Credits", "What you get"].map((h) => (
                      <th key={h} scope="col" className="px-4 py-3 text-[11.5px] font-medium text-[#9AA1CC]">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {costRows().map(([action, credits, what]) => (
                    <tr key={action} className="border-t border-white/[0.06]">
                      <th scope="row" className="px-4 py-3 align-top font-medium text-[#FFF1E8]">
                        {action}
                      </th>
                      <td className="px-4 py-3 align-top font-mono text-[13px] text-[#FFC857]">{credits}</td>
                      <td className="px-4 py-3 align-top text-[#A7ADD4]">{what}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[14px] leading-7 text-[#9AA1CC]">
              New to SpriteLab?{" "}
              <Link href="/how-it-works" className={TEXT_LINK}>
                See how it works
              </Link>{" "}
              or try a sprite on the{" "}
              <Link href="/ai-sprite-generator" className={TEXT_LINK}>
                AI sprite generator
              </Link>{" "}
              without an account.
            </p>
          </section>

          {/* ═══ VALUE COMPARISON ═══════════════════════════════ */}
          <section className="mt-14">
            <h2 className="mt-3 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[32px]">Artist vs. SpriteLab</h2>
            <p className="mt-2 text-[15px] text-[#9AA1CC]">Two ways to get a full set of game assets.</p>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-white/[0.08] bg-[#212B4E] p-5">
                <h3 className="text-[15px] font-semibold text-white">Traditional artist</h3>
                <ul className="mt-4 space-y-2.5">
                  {["Quoted and paid per asset", "Days to weeks turnaround", "Each revision is another round", "Hand-crafted, unique style"].map((t) => (
                    <li key={t} className="flex items-start gap-2.5 text-[13px] text-[#C8CCE8]">
                      <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#8A92BF]" strokeWidth={2.5} aria-hidden="true" />
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6 border-t border-white/[0.06] pt-4">
                  <span className="font-sans text-[20px] font-semibold tracking-tight text-[#C8CCE8]">Best for final, signature art</span>
                  <p className="font-mono text-[11px] text-[#8A92BF]">prices vary by artist</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#FFA300]/60 bg-[#212B4E] p-5">
                <h3 className="text-[15px] font-semibold text-white">With SpriteLab Pro</h3>
                <ul className="mt-4 space-y-2.5">
                  <FeatureItem>{proPence}p per credit</FeatureItem>
                  <FeatureItem>Generation in seconds</FeatureItem>
                  <FeatureItem>Regenerate as often as your credits allow</FeatureItem>
                  <FeatureItem>
                    {proCredits} credits = £{proPrice}
                  </FeatureItem>
                </ul>
                <div className="mt-6 border-t border-white/[0.06] pt-4">
                  <span className="font-sans text-[28px] font-semibold tracking-tight text-white tabular-nums">£{proPrice}</span>
                  <span className="ml-1 font-mono text-[12px] text-[#9AA1CC]">/month</span>
                  <p className="font-mono text-[11px] text-[#8A92BF]">{proCredits} credits every month</p>
                </div>
              </div>
            </div>
          </section>

          {/* ═══ GUARANTEE ══════════════════════════════════════ */}
          <section className="mt-6 flex flex-col items-start gap-4 rounded-2xl border border-white/[0.08] bg-[#19223F] p-5 sm:flex-row sm:items-center">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#FFA300]/20 bg-[#FFA300]/[0.08]">
              <Shield className="h-5 w-5 text-[#FFA300]" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-white">7-day refund</h2>
              <p className="mt-0.5 text-[14px] leading-7 text-[#9AA1CC]">
                Not happy? Ask for a refund within 7 days of purchase if you&apos;ve used less than 10% of your credits.{" "}
                <Link href="/terms" className={TEXT_LINK}>
                  See the terms
                </Link>
                .
              </p>
            </div>
          </section>

          {/* ═══ FAQ ════════════════════════════════════════════ */}
          <section className="mx-auto mt-14 max-w-3xl">
            <h2 className="mt-3 font-display text-[26px] font-semibold leading-[1.1] tracking-[-0.01em] text-white sm:text-[32px]">Pricing questions</h2>
            <div className="mt-5 space-y-2">
              {FAQS.map((f) => (
                <details key={f.q} className="group overflow-hidden rounded-2xl border border-white/[0.08] bg-[#212B4E]">
                  <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#263260] [&::-webkit-details-marker]:hidden">
                    <span className="text-[15px] font-medium leading-snug text-white">{f.q}</span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#9AA1CC] transition-transform group-open:rotate-180" aria-hidden="true" />
                  </summary>
                  <p className="px-5 pb-5 text-[14px] leading-relaxed text-[#9AA1CC]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>

      </div>
    </PricingProvider>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-[14px] leading-snug text-[#C8CCE8]">
      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#FFA300]" strokeWidth={2.5} aria-hidden="true" />
      <span>{children}</span>
    </li>
  );
}

function PopularPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-corners absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap bg-[#FFA300] px-3 py-1 font-mono text-[11px] font-semibold text-black">
      {children}
    </span>
  );
}
