import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import {
  ArrowRight,
  Zap,
  Palette,
  Download,
  Clock,
  Shield,
  Check,
  Layers,
  Crosshair,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { HeroPrompt } from "@/components/landing/HeroPrompt";
import { SiteNav } from "@/components/layout/SiteNav";
import { CommunityWall } from "@/components/landing/CommunityWall";
import { SHOWCASE, getFeaturedGenerationsSafe } from "@/lib/featured-generations";
import { HOME_FAQ } from "@/data/geo-content";
import { SEO_PAGES } from "@/data/seo-pages";

export const metadata: Metadata = {
  title: { absolute: "SpriteLab — AI Game Asset Generator for Indie Developers" },
  description: "Generate game-ready sprites, pixel art, sprite-sheet animations and seamless tiles with AI. Transparent PNG for Unity, Godot and GameMaker. 10 free credits, no card required.",
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
  const seen = new Set(SHOWCASE.map((s) => s.imageUrl));
  const wall = [...SHOWCASE, ...community.filter((c) => !seen.has(c.imageUrl))];

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
          <h1 className="mt-5 font-display text-[44px] font-semibold leading-[1.02] text-white sm:text-[64px] md:text-[76px]">
            Game sprites from
            <br />
            <span className="text-[#FF8A3D]">a single sentence</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-[#8B93A5] sm:text-[17px]">
            Characters, creatures, weapons, items and tiles — transparent PNG on a real pixel grid, animated into sprite sheets, ready for Unity, Godot or GameMaker.
          </p>

          <div className="mt-9">
            <HeroPrompt registerUrl={registerUrl} signedIn={signedIn} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-mono text-[11.5px] text-[#8B93A5]">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" />3 free tries, no account</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" />10 credits on signup</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" />transparent png</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[#FF8A3D]" />commercial license</span>
          </div>
        </div>
      </section>

      {/* ═══ EXPLORE — community wall ═════════════════════════ */}
      <CommunityWall items={wall} registerUrl={registerUrl} />

      {/* ═══ VALUE STRIP ═════════════════════════════════════ */}
      <section className="relative py-6 border-y border-white/[0.04] bg-[#0E1016]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: "Seconds", label: "Generation time", icon: Zap },
              { value: "12", label: "Art styles", icon: Palette },
              { value: "PNG", label: "Transparent export", icon: Download },
              { value: "100%", label: "Commercial rights", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 justify-center py-3">
                <div className="w-9 h-9 rounded-lg bg-[#FF8A3D]/[0.07] border border-[#FF8A3D]/[0.12] flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 text-[#FF8A3D]/80" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white/90">{stat.value}</div>
                  <div className="font-mono text-[11px] text-[#7A8294] uppercase tracking-wider">{stat.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════════ */}
      <section id="features" className="relative py-24 sm:py-32">
        {/* Subtle section glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.04)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] uppercase tracking-widest text-[#8B93A5] font-medium mb-5">
              <Sparkles className="w-3 h-3 text-[#FF8A3D]/60" /> Why SpriteLab
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold mb-4">
              Everything you need to
              <br />
              <span className="text-[#FF8A3D]">ship assets faster</span>
            </h2>
            <p className="text-[#8B93A5] text-base max-w-lg mx-auto">
              SpriteLab is an AI game asset generator built for indie game developers — not a general image generator. Every result is cleaned up to be used in a game.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                icon: Zap,
                title: "Generated in Seconds",
                desc: "Describe your asset, get a production-ready sprite in seconds. No design skills needed.",
                accent: "from-[#FF8A3D]/20 to-[#FF8A3D]/0",
              },
              {
                icon: Palette,
                title: "12 Art Styles",
                desc: "16-bit and HD pixel art, isometric, hand-painted, anime, chibi, dark fantasy, cartoon, vector and realistic.",
                accent: "from-[#8B5CF6]/20 to-[#8B5CF6]/0",
              },
              {
                icon: Download,
                title: "Transparent PNG Export",
                desc: "Every asset comes with a clean transparent background. Drag and drop into Unity, Godot, or any engine.",
                accent: "from-[#3B82F6]/20 to-[#3B82F6]/0",
              },
              {
                icon: Clock,
                title: "Sprite Animations",
                desc: "Idle, walk, attack, jump, fly or your own move — AI suggests motions for each sprite and exports a sprite sheet + GIF.",
                accent: "from-[#10B981]/20 to-[#10B981]/0",
              },
              {
                icon: Shield,
                title: "Full Commercial License",
                desc: "Complete ownership of every asset you generate. Use in any commercial project, no attribution required.",
                accent: "from-[#EAB308]/20 to-[#EAB308]/0",
              },
              {
                icon: Layers,
                title: "Project Organization",
                desc: "Generate for your game, accept the keepers — they sort into folders by type. Download the whole pack as a .zip.",
                accent: "from-[#EC4899]/20 to-[#EC4899]/0",
              },
            ].map((f, i) => (
              <div key={i} className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#0E1016] to-[#0F1320] border border-white/[0.06] hover:border-[#FF8A3D]/20 transition-all duration-300">
                {/* Subtle top gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-b ${f.accent} border border-white/[0.06] flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-[15px] font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#8B93A5] leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D12] via-[#0E1016] to-[#0B0D12] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] uppercase tracking-widest text-[#8B93A5] font-medium mb-5">
              <Target className="w-3 h-3 text-[#FF8A3D]/60" /> How it works
            </div>
            <h2 className="font-display text-3xl sm:text-5xl font-semibold mb-4">
              Three steps. <span className="text-[#FF8A3D]">That&apos;s it.</span>
            </h2>
            <p className="text-[#8B93A5] text-base max-w-md mx-auto">
              From idea to game-ready asset in under a minute.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                title: "Choose your asset type",
                desc: "Weapons, armor, potions, characters, creatures, icons — select what your game needs right now.",
                icon: Crosshair,
              },
              {
                step: "02",
                title: "Describe it in plain text",
                desc: "Write a short description. Specify colors, materials, style. The more detail, the better the output.",
                icon: Swords,
              },
              {
                step: "03",
                title: "Download and ship",
                desc: "Your asset generates in seconds. Transparent PNG, ready for Unity, Godot, or any game engine.",
                icon: Download,
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {/* Connecting line on desktop */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 right-0 w-6 h-px bg-gradient-to-r from-white/10 to-white/0 translate-x-full z-20" />
                )}

                <div className="relative p-7 rounded-2xl bg-gradient-to-b from-[#0E1016] to-[#0F1320] border border-white/[0.06] hover:border-[#FF8A3D]/15 transition-all duration-300 text-center h-full">
                  {/* Step number */}
                  <div className="w-12 h-12 rounded-2xl bg-[#FF8A3D]/[0.08] border border-[#FF8A3D]/20 text-[#FF8A3D] text-sm font-bold flex items-center justify-center mx-auto mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-2.5">{item.title}</h3>
                  <p className="text-[13px] text-[#8B93A5] leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link href={registerUrl}
              className="group sl-cta inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[15px] transition-all">
              Try it free — 10 credits
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ USE CASES ═══════════════════════════════════════ */}
      <section className="relative py-20 sm:py-28">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl sm:text-5xl font-semibold mb-4">
              Built for <span className="text-[#FF8A3D]">your</span> game
            </h2>
            <p className="text-[#8B93A5] text-base max-w-lg mx-auto">
              Whether you&apos;re building an RPG, roguelike, survival game, or mobile puzzler — SpriteLab generates assets that match your vision.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              {
                genre: "RPG & JRPG",
                items: "Swords, shields, armor sets, spell icons, character sprites, NPC portraits",
                style: "Pixel art, hand-painted, anime",
              },
              {
                genre: "Roguelike & Dungeon Crawler",
                items: "Dungeon tiles, monsters, loot drops, status effect icons, trap sprites",
                style: "Pixel art, dark fantasy",
              },
              {
                genre: "Survival & Crafting",
                items: "Tools, resources, food items, building materials, wildlife sprites",
                style: "Cartoon, vector, realistic",
              },
              {
                genre: "Mobile & Casual",
                items: "UI icons, power-ups, collectibles, character skins, achievement badges",
                style: "Cartoon, vector, anime",
              },
            ].map((uc, i) => (
              <div key={i} className="p-6 rounded-2xl bg-[#0E1016]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="font-mono text-[11px] font-semibold text-[#FF8A3D] uppercase tracking-wider mb-2">{uc.genre}</div>
                <p className="text-[14px] text-white/70 mb-3 leading-relaxed">{uc.items}</p>
                <p className="text-[12px] text-[#7A8294]">Best styles: {uc.style}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ═══ PRICING ═════════════════════════════════════════ */}
      <PricingSection />

      {/* ═══ FAQ ══════════════════════════════════════════════ */}
      <section id="faq" className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] font-mono text-[11px] uppercase tracking-widest text-[#8B93A5] font-medium mb-5">
              FAQ
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold">
              Common Questions
            </h2>
          </div>

          <div className="space-y-3">
            {HOME_FAQ.map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-[#0E1016]/60 border border-white/[0.05] hover:border-white/[0.08] transition-colors">
                <h3 className="text-[14px] font-semibold text-white/80 mb-2">{faq.q}</h3>
                <p className="text-[13px] text-[#8B93A5] leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>

          {/* Tools & guides — every landing page linked from the homepage */}
          <nav aria-label="Tools and guides" className="mt-12">
            <p className="mb-3 text-center font-mono text-[11px] uppercase tracking-widest text-[#7A8294]">tools &amp; guides</p>
            <div className="flex flex-wrap justify-center gap-2">
              {SEO_PAGES.map((p) => (
                <Link key={p.slug} href={`/${p.slug}`}
                  className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[12px] text-[#A6ADBB] transition-colors hover:border-white/20 hover:text-white">
                  {p.label}
                </Link>
              ))}
            </div>
          </nav>
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
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06)_0%,transparent_70%)]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-[#0E1016] to-[#0E1016] border border-white/[0.06] relative overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.08)_0%,transparent_70%)]" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-[radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.08)_0%,transparent_70%)]" />

            <h2 className="font-display text-3xl sm:text-5xl font-semibold mb-4">
              Your game deserves
              <br />
              <span className="text-[#FF8A3D]">better assets.</span>
            </h2>
            <p className="text-[#8B93A5] mb-10 text-base max-w-md mx-auto">
              Stop waiting on artists or fighting Photoshop. Describe what you need and ship your game faster. 10 free credits, no credit card.
            </p>
            <Link href={registerUrl}
              className="group sl-cta inline-flex items-center gap-2.5 px-10 py-4.5 rounded-xl font-bold text-[16px] transition-all">
              Start Creating Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-[12px] text-[#7A8294] mt-5">No credit card required. Generate your first asset in seconds.</p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer className="relative py-12 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="SpriteLab" width={22} height={22} loading="lazy" />
              <span className="font-bold text-sm tracking-tight">
                Sprite<span className="text-[#FF8A3D]">Lab</span>
              </span>
            </div>
            <div className="flex items-center gap-8 text-[12px] text-[#7A8294]">
              <Link href="/privacy" className="hover:text-[#8B93A5] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#8B93A5] transition-colors">Terms</Link>
              <Link href="/changelog" className="hover:text-[#8B93A5] transition-colors">Changelog</Link>
              <a href="mailto:support@sprite-lab.com" className="hover:text-[#8B93A5] transition-colors">Contact</a>
            </div>
            <p className="text-[11px] text-[#7A8294]">&copy; {new Date().getFullYear()} SpriteLab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
