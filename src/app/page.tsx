import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { ArrowRight, Check, Plus } from "lucide-react";
import { SectionHeader } from "@/components/landing/SectionHeader";
import { PricingSection } from "@/components/landing/PricingSection";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { SiteNav } from "@/components/layout/SiteNav";
import { CommunityWall } from "@/components/landing/CommunityWall";
import { TikTokCommunity } from "@/components/landing/TikTokCommunity";
import { ShowcaseRows } from "@/components/landing/ShowcaseRows";
import { GuideTabs } from "@/components/landing/GuideTabs";
import { Footer } from "@/components/layout/Footer";
import { GUIDE, PRICE_LIST, signupOffer, GUEST_TRIES } from "@/data/product-guide";
import { SHOWCASE, getFeaturedGenerationsSafe } from "@/lib/featured-generations";
import { HOME_FAQ } from "@/data/geo-content";

export const metadata: Metadata = {
  title: { absolute: "SpriteLab — AI Game Asset Generator for Indie Developers" },
  description: "Generate game-ready sprites, pixel art, sprite sheets and seamless tiles with AI. Transparent PNGs for Unity, Godot and GameMaker. 10 free credits.",
  keywords: ["AI game asset generator", "AI sprite generator", "AI pixel art generator", "sprite sheet generator", "sprite animation", "indie game development", "Unity sprites", "Godot sprites", "RPG sprites"],
  openGraph: {
    title: "SpriteLab — AI Game Asset Generator",
    description: "Game-ready sprites, pixel art and sprite-sheet animations from a text prompt. 12 art styles, transparent PNG, commercial use.",
    url: "https://www.sprite-lab.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab — AI Game Asset Generator",
    description: "Game-ready sprites and sprite-sheet animations for your indie game, from a text prompt.",
  },
  alternates: { canonical: "https://www.sprite-lab.com" },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Signed-in users can see the home page too (logo → home). The nav shows
  // "Open app" and the hero prompt sends them straight into the generator.
  const signedIn = Boolean(user);

  const params = await searchParams;
  const refCode = params.ref;
  const registerUrl = refCode ? `/register?ref=${refCode}` : "/register";

  // Explore wall: curated pipeline showcase first, then the most-liked public
  // community sprites (cached 5 min; never fails the render — falls back to
  // the showcase alone if the DB is unavailable).
  const community = await getFeaturedGenerationsSafe(36);
  const wall = curateWall([...SHOWCASE, ...community]);
  const offer = signupOffer();

  return (
    <main className="min-h-screen bg-[#0B0D12] text-white">

      {/* ═══ NAV ═════════════════════════════════════════════ */}
      <SiteNav registerUrl={registerUrl} anchorsOnHome signedIn={signedIn} />

      {/* ═══ HERO — prompt first (Meshy-style) ═══════════════ */}
      <section className="relative overflow-hidden pb-6 pt-28 sm:pt-36">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_20%,transparent_70%)]" />
        <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[960px] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,rgba(255,138,61,0.13)_0%,transparent_70%)]" />

        {/* Floating sprites — pixel flavour around the headline (desktop). Lazy so
            mobile (display:none) never fetches them and they are not preloaded
            ahead of the LCP headline. */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden="true">
          {[
            { src: "/showcase/knight.png", cls: "left-[7%] top-[30%] w-24 animate-float" },
            { src: "/showcase/health-potion.png", cls: "left-[15%] top-[62%] w-14 animate-float [animation-delay:1.2s]" },
            { src: "/showcase/fire-sword.png", cls: "right-[8%] top-[26%] w-24 animate-float [animation-delay:0.6s]" },
            { src: "/showcase/slime.png", cls: "right-[15%] top-[60%] w-16 animate-float [animation-delay:1.8s]" },
          ].map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s.src} src={s.src} alt="" loading="lazy" decoding="async" className={`pixel-perfect absolute opacity-80 ${s.cls}`} />
          ))}
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-5 text-center">
          <p className="font-mono text-[12px] text-[#FFB27A]">
            &gt; ai game asset generator for indie devs<span className="caret" />
          </p>
          <h1 className="mt-5 font-display text-[38px] font-semibold leading-[1.04] tracking-[-0.015em] text-white min-[400px]:text-[42px] sm:text-[64px] md:text-[76px]">
            Game sprites from
            <br />
            <span className="text-[#FF8A3D]">a single sentence</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-[16px] leading-relaxed text-[#8B93A5] sm:text-[17px]">
            Characters, creatures, weapons, items and tiles — transparent PNG on a real pixel grid, animated into sprite sheets, ready for Unity, Godot or GameMaker.
          </p>

          <div className="mt-9">
            <HeroPrompt registerUrl={registerUrl} signedIn={signedIn} />
          </div>

          <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11.5px] text-[#8B93A5]">
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" aria-hidden="true" />{GUEST_TRIES} free tries, no account</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" aria-hidden="true" />{offer.credits + offer.bonus} free credits on signup</li>
            <li className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" aria-hidden="true" />no card needed</li>
            <li className="hidden items-center gap-1.5 sm:flex"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" aria-hidden="true" />4 &amp; 8 directions</li>
            <li className="hidden items-center gap-1.5 sm:flex"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" aria-hidden="true" />commercial license</li>
          </ul>
          <p className="mt-4 text-[13px] text-[#8B93A5]">Used by <span className="font-semibold text-white">1,000+ indie game developers</span></p>
        </div>
      </section>

      {/* ═══ EXPLORE — community wall ═════════════════════════ */}
      <CommunityWall items={wall} registerUrl={registerUrl} />

      {/* ═══ WHAT YOU GET — real output ═════════════════════ */}
      <ShowcaseRows />

      {/* ═══ HOW IT WORKS — guide tabs ════════════════════════ */}
      <GuideTabs sections={GUIDE} prices={PRICE_LIST} />

      {/* ═══ COMMUNITY — TikTok ═══════════════════════════════ */}
      <TikTokCommunity />

      {/* ═══ PRICING ═════════════════════════════════════════ */}
      <PricingSection />

      {/* ═══ FAQ ══════════════════════════════════════════════ */}
      <section id="faq" className="relative scroll-mt-16 py-16 sm:py-20">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="mx-auto max-w-2xl px-5">
          <SectionHeader eyebrow="faq" title="Questions, answered" className="mb-12" />

          <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-[#0E1016]">
            {HOME_FAQ.map((faq, i) => (
              <details key={i} className="group px-5 sm:px-6" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[15px] font-medium leading-snug text-white">{faq.q}</h3>
                  <Plus className="h-4 w-4 shrink-0 text-[#8B93A5] transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="-mt-1 pb-5 pr-8 text-[14px] leading-relaxed text-[#8B93A5]">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
        {/* FAQPage structured data — the same Q&A that is visible above */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: HOME_FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
            }).replace(/</g, "\\u003c"),
          }}
        />
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════ */}
      <section className="relative overflow-hidden border-t border-white/[0.05] py-20 sm:py-28">
        <div className="pixel-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_10%,transparent_65%)]" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <div className="mb-10 flex items-end justify-center gap-3 sm:gap-6" aria-hidden="true">
            {["/showcase/knight.png", "/showcase/goblin-archer.png", "/showcase/slime.png", "/showcase/fire-sword.png", "/showcase/health-potion.png", "/showcase/ice-staff.png"].map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt="" loading="lazy"
                className={`pixel-perfect animate-float h-12 w-12 object-contain sm:h-16 sm:w-16 ${i % 2 ? "[animation-delay:0.8s]" : ""}`} />
            ))}
          </div>
          <h2 className="font-display text-[34px] font-semibold leading-[1.06] tracking-[-0.015em] text-white sm:text-[52px]">
            Your next sprite is
            <br />
            <span className="text-[#FF8A3D]">one sentence away.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[15px] leading-relaxed text-[#8B93A5]">
            Try it {GUEST_TRIES} times without an account. Sign up and get {offer.credits} free credits{offer.bonus ? ` + ${offer.bonus} launch bonus until ${offer.bonusUntil}` : ""} — no card.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href={registerUrl}
              className="px-corners inline-flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-7 text-[15px] font-semibold text-white transition hover:brightness-110 sm:w-auto">
              Start creating free <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link href="/how-it-works"
              className="inline-flex h-12 w-full items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-6 text-[15px] font-medium text-[#ECEEF3] transition hover:bg-white/[0.08] sm:w-auto">
              See how it works
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}

/**
 * Explore wall: curated showcase first, then community sprites — capped and
 * de-duplicated (near-identical prompts, too many of one category) so the
 * wall stays varied.
 */
function curateWall<T extends { imageUrl: string; prompt: string; category: string }>(items: T[], max = 18, perCategory = 6): T[] {
  const out: T[] = [];
  const urls = new Set<string>();
  const prompts = new Set<string>();
  const perCat = new Map<string, number>();
  for (const it of items) {
    const key = it.prompt.toLowerCase().replace(/[^a-z ]/g, "").split(/\s+/).filter(Boolean).slice(0, 4).join(" ");
    if (urls.has(it.imageUrl) || (key && prompts.has(key))) continue;
    if ((perCat.get(it.category) ?? 0) >= perCategory) continue;
    urls.add(it.imageUrl);
    if (key) prompts.add(key);
    perCat.set(it.category, (perCat.get(it.category) ?? 0) + 1);
    out.push(it);
    if (out.length >= max) break;
  }
  return out;
}
