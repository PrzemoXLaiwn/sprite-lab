import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  Zap,
  Palette,
  Download,
  Clock,
  Shield,
  ChevronDown,
  Check,
  Layers,
  Crosshair,
  Sparkles,
  Gamepad2,
  Swords,
  Target,
} from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { TryItNow } from "@/components/landing/TryItNow";
import { ExamplesGallery } from "@/components/landing/ExamplesGallery";
import { HeroGallery } from "@/components/landing/HeroGallery";

export const metadata: Metadata = {
  title: "SpriteLab — Game Asset Generator for Indie Developers",
  description: "Generate game-ready sprites, weapons, characters and icons in seconds. Pixel art, dark fantasy, anime styles. 10 free credits, no card required.",
  keywords: ["game assets", "sprite generator", "pixel art", "indie game development", "game icons", "2D assets", "RPG sprites"],
  openGraph: {
    title: "SpriteLab — Game Asset Generator",
    description: "Create game-ready sprites in seconds. 8 art styles, transparent PNG, commercial license.",
    url: "https://www.sprite-lab.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab — Game Asset Generator",
    description: "Create game-ready sprites in seconds for your indie game.",
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
  if (user) redirect("/generate");

  const params = await searchParams;
  const refCode = params.ref;
  const registerUrl = refCode ? `/register?ref=${refCode}` : "/register";

  return (
    <main className="min-h-screen bg-[#0B0F19] text-white">

      {/* ═══ NAV ═════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0B0F19]/85 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="SpriteLab" width={28} height={28} priority unoptimized />
            <span className="font-bold text-[16px] tracking-tight text-white/90">
              Sprite<span className="text-[#F97316]">Lab</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">Features</a>
            <a href="#gallery" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">Gallery</a>
            <a href="#pricing" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">Pricing</a>
            <a href="#faq" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/50 hover:text-white/80 transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href={registerUrl}
              className="sl-cta text-[13px] font-semibold px-5 py-2.5 rounded-lg transition-all">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════════ */}
      <section className="relative pt-32 sm:pt-40 pb-20 sm:pb-28 overflow-hidden">
        {/* Background atmosphere */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08)_0%,transparent_70%)]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.04)_0%,transparent_70%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        </div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">

          {/* Top badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F97316]/[0.08] border border-[#F97316]/20 mb-8 animate-slide-up">
            <Gamepad2 className="w-3.5 h-3.5 text-[#F97316]" />
            <span className="text-[12px] font-medium text-[#F97316]/90 tracking-wide uppercase">Built for indie game developers</span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-7xl md:text-[80px] font-bold mb-6 leading-[1.05] tracking-tight animate-slide-up" style={{ animationDelay: "80ms" }}>
            Generate Game Assets
            <br />
            <span className="bg-gradient-to-r from-[#F97316] via-[#FB923C] to-[#F97316] bg-clip-text text-transparent">Ready in Seconds</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[#94A3B8] max-w-2xl mx-auto mb-10 leading-relaxed animate-slide-up" style={{ animationDelay: "160ms" }}>
            Weapons, characters, potions, icons, and props — in pixel art, dark fantasy, anime, and more.
            <br className="hidden sm:block" />
            Describe it. Generate it. Download transparent PNG. Ship your game.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-slide-up" style={{ animationDelay: "240ms" }}>
            <Link href={registerUrl}
              className="group sl-cta flex items-center gap-2.5 px-8 py-4 rounded-xl font-bold text-[16px] transition-all w-full sm:w-auto justify-center">
              Start Creating — 10 Free Credits
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#gallery"
              className="flex items-center gap-2 px-6 py-4 rounded-xl border border-white/[0.08] text-white/50 hover:text-white/80 hover:border-white/[0.15] hover:bg-white/[0.02] transition-all text-[15px] font-medium w-full sm:w-auto justify-center">
              See examples
              <ChevronDown className="w-4 h-4" />
            </a>
          </div>

          {/* Trust points */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[13px] text-[#94A3B8]/70 mb-16 animate-slide-up" style={{ animationDelay: "320ms" }}>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F97316]/60" />10 free credits</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F97316]/60" />No credit card required</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F97316]/60" />Commercial license</span>
            <span className="flex items-center gap-2"><Check className="w-4 h-4 text-[#F97316]/60" />Transparent PNG</span>
          </div>

          {/* Hero Gallery */}
          <HeroGallery />
        </div>
      </section>

      {/* ═══ VALUE STRIP ═════════════════════════════════════ */}
      <section className="relative py-6 border-y border-white/[0.04] bg-[#0D111B]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {[
              { value: "~5s", label: "Generation time", icon: Zap },
              { value: "8+", label: "Art styles", icon: Palette },
              { value: "PNG", label: "Transparent export", icon: Download },
              { value: "100%", label: "Commercial rights", icon: Shield },
            ].map((stat, i) => (
              <div key={i} className="flex items-center gap-3 justify-center py-3">
                <div className="w-9 h-9 rounded-lg bg-[#F97316]/[0.07] border border-[#F97316]/[0.12] flex items-center justify-center flex-shrink-0">
                  <stat.icon className="w-4 h-4 text-[#F97316]/80" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-white/90">{stat.value}</div>
                  <div className="text-[11px] text-white/30 uppercase tracking-wider">{stat.label}</div>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] uppercase tracking-widest text-white/40 font-medium mb-5">
              <Sparkles className="w-3 h-3 text-[#F97316]/60" /> Why SpriteLab
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Everything you need to
              <br />
              <span className="text-[#F97316]">ship assets faster</span>
            </h2>
            <p className="text-[#94A3B8] text-base max-w-lg mx-auto">
              Purpose-built for indie devs who need quality game assets without the freelancer wait times or learning curve.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {[
              {
                icon: Zap,
                title: "5-Second Generation",
                desc: "Describe your asset, get a production-ready sprite in seconds. No design skills needed.",
                accent: "from-[#F97316]/20 to-[#F97316]/0",
              },
              {
                icon: Palette,
                title: "8 Art Styles",
                desc: "Pixel art, HD pixel, hand-painted, anime, dark fantasy, cartoon, vector, and realistic.",
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
                title: "Days to Minutes",
                desc: "Stop waiting weeks for freelancer deliveries. Generate exactly what you need, iterate in real-time.",
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
                desc: "Group assets by game project. AI auto-categorizes into weapons, characters, items, and more.",
                accent: "from-[#EC4899]/20 to-[#EC4899]/0",
              },
            ].map((f, i) => (
              <div key={i} className="group relative p-6 rounded-2xl bg-gradient-to-b from-[#121826] to-[#0F1320] border border-white/[0.06] hover:border-[#F97316]/20 transition-all duration-300">
                {/* Subtle top gradient accent */}
                <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-b ${f.accent} border border-white/[0.06] flex items-center justify-center mb-4`}>
                  <f.icon className="w-5 h-5 text-white/70" />
                </div>
                <h3 className="text-[15px] font-semibold text-white/90 mb-2">{f.title}</h3>
                <p className="text-[13px] text-[#94A3B8]/70 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-[#0D111B] to-[#0B0F19] pointer-events-none" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] uppercase tracking-widest text-white/40 font-medium mb-5">
              <Target className="w-3 h-3 text-[#F97316]/60" /> How it works
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Three steps. <span className="text-[#F97316]">That&apos;s it.</span>
            </h2>
            <p className="text-[#94A3B8] text-base max-w-md mx-auto">
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
                desc: "Your asset generates in ~5 seconds. Transparent PNG, ready for Unity, Godot, or any game engine.",
                icon: Download,
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                {/* Connecting line on desktop */}
                {i < 2 && (
                  <div className="hidden md:block absolute top-12 right-0 w-6 h-px bg-gradient-to-r from-white/10 to-white/0 translate-x-full z-20" />
                )}

                <div className="relative p-7 rounded-2xl bg-gradient-to-b from-[#121826] to-[#0F1320] border border-white/[0.06] hover:border-[#F97316]/15 transition-all duration-300 text-center h-full">
                  {/* Step number */}
                  <div className="w-12 h-12 rounded-2xl bg-[#F97316]/[0.08] border border-[#F97316]/20 text-[#F97316] text-sm font-bold flex items-center justify-center mx-auto mb-5">
                    {item.step}
                  </div>
                  <h3 className="text-[15px] font-semibold text-white/90 mb-2.5">{item.title}</h3>
                  <p className="text-[13px] text-[#94A3B8]/60 leading-relaxed">{item.desc}</p>
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
            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Built for <span className="text-[#F97316]">your</span> game
            </h2>
            <p className="text-[#94A3B8] text-base max-w-lg mx-auto">
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
              <div key={i} className="p-6 rounded-2xl bg-[#121826]/60 border border-white/[0.05] hover:border-white/[0.1] transition-all">
                <div className="text-[11px] font-semibold text-[#F97316] uppercase tracking-wider mb-2">{uc.genre}</div>
                <p className="text-[14px] text-white/70 mb-3 leading-relaxed">{uc.items}</p>
                <p className="text-[12px] text-white/30">Best styles: {uc.style}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ EXAMPLES ════════════════════════════════════════ */}
      <ExamplesGallery />

      {/* ═══ TRY IT ══════════════════════════════════════════ */}
      <TryItNow />

      {/* ═══ PRICING ═════════════════════════════════════════ */}
      <PricingSection />

      {/* ═══ FAQ ══════════════════════════════════════════════ */}
      <section id="faq" className="relative py-24 sm:py-32">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[11px] uppercase tracking-widest text-white/40 font-medium mb-5">
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold">
              Common Questions
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                q: "Can I use generated assets in commercial games?",
                a: "Yes. You get full ownership of every asset you generate. Use them in any commercial project — Steam, App Store, itch.io, anywhere. No attribution required.",
              },
              {
                q: "What file formats do you support?",
                a: "2D assets export as PNG with transparent backgrounds. 3D models export as GLB, PLY, and OBJ. All formats are game-engine ready.",
              },
              {
                q: "How fast is generation?",
                a: "2D sprites generate in approximately 5 seconds. 3D models take 30-60 seconds depending on complexity.",
              },
              {
                q: "Do my credits expire?",
                a: "Free credits never expire. Paid subscription credits refresh monthly. Credit pack purchases never expire.",
              },
              {
                q: "What art styles are available?",
                a: "Eight styles: Pixel Art (16-bit), HD Pixel Art, Hand-Painted, Anime, Dark Fantasy, Cartoon, Vector, and Realistic.",
              },
              {
                q: "Can I use SpriteLab with Unity / Godot / Unreal?",
                a: "Yes. All assets export as standard transparent PNG files that work in any game engine, framework, or design tool.",
              },
            ].map((faq, i) => (
              <div key={i} className="p-5 rounded-xl bg-[#121826]/60 border border-white/[0.05] hover:border-white/[0.08] transition-colors">
                <h3 className="text-[14px] font-semibold text-white/80 mb-2">{faq.q}</h3>
                <p className="text-[13px] text-[#94A3B8]/60 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════ */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.06)_0%,transparent_70%)]" />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="p-10 sm:p-14 rounded-3xl bg-gradient-to-b from-[#121826] to-[#0D111B] border border-white/[0.06] relative overflow-hidden">
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-20 h-20 bg-[radial-gradient(ellipse_at_top_left,rgba(249,115,22,0.08)_0%,transparent_70%)]" />
            <div className="absolute bottom-0 right-0 w-20 h-20 bg-[radial-gradient(ellipse_at_bottom_right,rgba(249,115,22,0.08)_0%,transparent_70%)]" />

            <h2 className="text-3xl sm:text-5xl font-bold mb-4">
              Your game deserves
              <br />
              <span className="text-[#F97316]">better assets.</span>
            </h2>
            <p className="text-[#94A3B8] mb-10 text-base max-w-md mx-auto">
              Join thousands of indie developers using SpriteLab to build their games faster. 10 free credits, no credit card, start generating in 30 seconds.
            </p>
            <Link href={registerUrl}
              className="group sl-cta inline-flex items-center gap-2.5 px-10 py-4.5 rounded-xl font-bold text-[16px] transition-all">
              Start Creating Free
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <p className="text-[12px] text-white/20 mt-5">No credit card required. Generate your first asset in seconds.</p>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer className="relative py-12 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="SpriteLab" width={22} height={22} loading="lazy" unoptimized />
              <span className="font-bold text-sm tracking-tight">
                Sprite<span className="text-[#F97316]">Lab</span>
              </span>
            </div>
            <div className="flex items-center gap-8 text-[12px] text-white/25">
              <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
              <Link href="/changelog" className="hover:text-white/50 transition-colors">Changelog</Link>
              <a href="mailto:support@sprite-lab.com" className="hover:text-white/50 transition-colors">Contact</a>
            </div>
            <p className="text-[11px] text-white/15">&copy; 2026 SpriteLab. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
