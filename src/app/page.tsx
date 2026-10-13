import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { Plus } from "lucide-react";
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
    <main className="min-h-screen bg-[#131A31] text-white">

      {/* ═══ NAV ═════════════════════════════════════════════ */}
      <SiteNav registerUrl={registerUrl} anchorsOnHome signedIn={signedIn} />

      {/* ═══ HERO — prompt on the left, a real sprite on the workbench ═══ */}
      <section className="relative overflow-hidden border-b border-white/[0.06] pb-14 pt-24 sm:pt-32 lg:pb-20">
        <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-14">
          <div className="min-w-0">
            <h1 className="font-display text-[40px] font-semibold leading-[1.02] tracking-[-0.02em] text-[#FFF1E8] min-[400px]:text-[44px] sm:text-[60px] lg:text-[68px]">
              Type a character.
              <br />
              Get a sprite sheet.
            </h1>
            <p className="mt-5 max-w-[34rem] text-pretty text-[16px] leading-relaxed text-[#C8CCE8] sm:text-[17px]">
              SpriteLab draws game sprites from a sentence, animates them, turns them to face 4 or 8 directions and packs them for Unity, Godot or GameMaker. Transparent PNG, whole pixels, yours to sell.
            </p>

            <div className="mt-8">
              <HeroPrompt registerUrl={registerUrl} signedIn={signedIn} />
            </div>

            <p className="mt-5 text-[13.5px] leading-relaxed text-[#A7ADD4]">
              {GUEST_TRIES} tries without an account. Sign up for {offer.credits + offer.bonus} free credits, no card.
              <span className="hidden sm:inline"> Over 1,000 people have made an account so far.</span>
            </p>
          </div>

          <HeroWorkbench />
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
        <div className="mx-auto max-w-3xl px-4 sm:px-5">
          <SectionHeader eyebrow="faq" title="Questions people ask before signing up" className="mb-10" />

          <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-[#19223F]">
            {HOME_FAQ.map((faq, i) => (
              <details key={i} className="group px-5 sm:px-6" open={i === 0}>
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 [&::-webkit-details-marker]:hidden">
                  <h3 className="text-[15px] font-medium leading-snug text-white">{faq.q}</h3>
                  <Plus className="h-4 w-4 shrink-0 text-[#9AA1CC] transition-transform duration-200 group-open:rotate-45" aria-hidden="true" />
                </summary>
                <p className="-mt-1 pb-5 pr-8 text-[14px] leading-relaxed text-[#9AA1CC]">{faq.a}</p>
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

      {/* ═══ FINAL CTA — a row of real sprites on the checkerboard ═══ */}
      <section className="border-t border-white/[0.06] py-16 sm:py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-5 lg:grid-cols-[1fr_auto]">
          <div className="max-w-xl">
            <h2 className="font-display text-[32px] font-semibold leading-[1.06] tracking-[-0.015em] text-[#FFF1E8] sm:text-[46px]">
              Make the first sprite for your game now.
            </h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-[#C8CCE8]">
              Try it {GUEST_TRIES} times without an account. Sign up and get {offer.credits} free credits{offer.bonus ? `, plus ${offer.bonus} bonus credits until ${offer.bonusUntil}` : ""}. No card needed.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={registerUrl}
                className="px-corners inline-flex h-12 w-full items-center justify-center bg-[#FFA300] px-7 text-[15px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] sm:w-auto">
                Create a free account
              </Link>
              <Link href="/how-it-works"
                className="inline-flex h-12 w-full items-center justify-center rounded-[8px] border border-white/[0.14] px-6 text-[15px] font-medium text-[#FFF1E8] transition hover:bg-white/[0.06] sm:w-auto">
                Read how it works
              </Link>
            </div>
          </div>
          <div className="checker grid grid-cols-3 gap-px overflow-hidden rounded-[10px] border border-white/[0.09] sm:grid-cols-6 lg:grid-cols-3" aria-hidden="true">
            {["/showcase/knight.png", "/showcase/goblin-archer.png", "/showcase/slime.png", "/showcase/fire-sword.png", "/showcase/health-potion.png", "/showcase/ice-staff.png"].map((src) => (
              <div key={src} className="flex h-24 items-center justify-center sm:h-28 lg:h-28 lg:w-28">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" loading="lazy" className="pixel-perfect h-16 w-16 object-contain" />
              </div>
            ))}
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

/**
 * Hero visual: one real SpriteLab character shown the way it ends up in a
 * game project — an animated loop on a transparency checkerboard, the four
 * facing directions cut from its rotation sheet, and the engine formats it
 * exports to. No mock UI chrome, no invented numbers.
 */
const DIRECTIONS = ["Down", "Left", "Up", "Right"] as const;

function HeroWorkbench() {
  return (
    <figure className="relative min-w-0" aria-label="A knight sprite generated with SpriteLab: idle animation, four directions and engine export formats">
      <div className="overflow-hidden rounded-[10px] border border-white/[0.09] bg-[#19223F] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-4 py-2.5">
          <span className="text-[13px] font-medium text-[#FFF1E8]">Dark knight, idle loop</span>
          <span className="font-mono text-[12px] text-[#A7ADD4]">256 × 256 px</span>
        </div>
        <div className="checker relative flex aspect-[4/3] items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/showcase/anim-knight-idle.webp" alt="Animated pixel-art dark knight, idle loop" width={256} height={256}
            fetchPriority="high" className="pixel-perfect h-[78%] w-auto" />
        </div>
        <div className="grid grid-cols-4 border-t border-white/[0.07]">
          {DIRECTIONS.map((d, i) => (
            <div key={d} className={`flex flex-col items-center gap-1.5 px-1 pb-2.5 pt-2 ${i ? "border-l border-white/[0.07]" : ""}`}>
              <span
                role="img"
                aria-label={`Knight facing ${d.toLowerCase()}`}
                className="checker checker-sm pixel-perfect block h-14 w-14 rounded-[4px] sm:h-16 sm:w-16"
                style={{ backgroundImage: "url(/showcase/rotate-knight.png), " + CHECKER_LAYERS, backgroundSize: `400% 100%, 10px 10px, 10px 10px`, backgroundPosition: `${(i / 3) * 100}% 0, 0 0, 5px 5px` }}
              />
              <span className="text-[12px] text-[#A7ADD4]">{d}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.07] px-4 py-3">
          <span className="mr-1 text-[12.5px] text-[#A7ADD4]">Exports to</span>
          {["Unity", "Godot", "GameMaker", "PNG sheet"].map((e) => (
            <span key={e} className="rounded-[4px] border border-white/[0.1] bg-[#212B4E] px-2 py-1 text-[12px] font-medium text-[#FFF1E8]">{e}</span>
          ))}
        </div>
      </div>
    </figure>
  );
}

const CHECKER_LAYERS =
  "linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%), linear-gradient(45deg, #212B4E 25%, transparent 25%, transparent 75%, #212B4E 75%)";
