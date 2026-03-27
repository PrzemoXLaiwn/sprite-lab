import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Palette,
  Download,
  Clock,
  Shield,
  ChevronDown,
  Check,
  Cuboid,
  ImageIcon,
  Star,
  Play,
} from "lucide-react";
import { PricingSection } from "@/components/landing/PricingSection";
import { TryItNow } from "@/components/landing/TryItNow";
import { ExamplesGallery } from "@/components/landing/ExamplesGallery";
import { HeroGallery } from "@/components/landing/HeroGallery";

export const metadata: Metadata = {
  title: "SpriteLab - AI Game Asset Generator | Create Sprites in Seconds",
  description: "Generate game-ready sprites, icons, and 2D/3D assets with AI. Pixel art, anime, dark fantasy styles. Perfect for indie game developers. Free to try, no credit card required.",
  keywords: ["game assets", "sprite generator", "AI art", "pixel art", "indie game development", "game icons", "2D assets", "Unity assets", "Godot sprites"],
  openGraph: {
    title: "SpriteLab - AI Game Asset Generator",
    description: "Create stunning game sprites in seconds with AI. 10+ art styles, transparent backgrounds, commercial license included.",
    url: "https://www.sprite-lab.com",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SpriteLab - AI Game Asset Generator",
    description: "Create stunning game sprites in seconds with AI. Perfect for indie developers.",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com",
  },
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  // Get referral code from URL params
  const params = await searchParams;
  const refCode = params.ref;
  const registerUrl = refCode ? `/register?ref=${refCode}` : "/register";

  return (
    <main className="min-h-screen bg-[#030305] text-white overflow-x-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        {/* Grid pattern overlay */}
        <div className="absolute inset-0 grid-pattern opacity-20" />

        {/* Vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_0%,_rgba(3,3,5,0.4)_70%,_rgba(3,3,5,0.8)_100%)]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#030305]/60 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
            <div className="relative">
              <div className="absolute inset-0 bg-[#00ff88]/30 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
              <Image src="/logo.png" alt="SpriteLab" width={28} height={28} className="relative sm:w-8 sm:h-8" priority />
            </div>
            <span className="font-display font-bold text-base sm:text-lg tracking-tight">
              Sprite<span className="text-[#00ff88] text-glow">Lab</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-white/50 hover:text-[#00ff88] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#00ff88] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">Features</a>
            <a href="#pricing" className="text-sm text-white/50 hover:text-[#00ff88] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#00ff88] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">Pricing</a>
            <a href="#faq" className="text-sm text-white/50 hover:text-[#00ff88] transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-[#00ff88] after:scale-x-0 hover:after:scale-x-100 after:transition-transform after:origin-left">FAQ</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-xs sm:text-sm text-white/60 hover:text-white transition-colors px-2 sm:px-4 py-2">
              Log in
            </Link>
            <Link
              href={registerUrl}
              className="text-xs sm:text-sm font-semibold px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black hover:shadow-lg hover:shadow-[#00ff88]/25 transition-all hover:-translate-y-0.5"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">

          {/* Target audience badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/8 text-white/50 text-xs sm:text-sm mb-8">
            For indie RPG, roguelike &amp; survival developers
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black mb-5 sm:mb-6 leading-[1.1] tracking-tight">
            Game Assets.
            <br />
            <span className="bg-gradient-to-r from-[#00ff88] via-[#00d4ff] to-[#c084fc] bg-clip-text text-transparent">
              Ready in Seconds.
            </span>
          </h1>

          {/* Subheadline */}
          <p className="text-base sm:text-lg text-white/50 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed">
            Weapons, potions, characters, icons and props.
            Pixel art to dark fantasy — pick a style, describe what you need, download transparent PNG.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 sm:mb-14">
            <Link
              href={registerUrl}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#00ff88] text-black font-bold text-base transition-all hover:bg-[#00ff88]/90 shadow-lg shadow-[#00ff88]/20 hover:shadow-[#00ff88]/40 w-full sm:w-auto justify-center"
            >
              Start Creating — 10 Free Credits
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="#features"
              className="flex items-center gap-2 px-6 py-3.5 rounded-xl border border-white/10 hover:border-white/20 transition-colors text-white/60 hover:text-white text-sm"
            >
              See how it works
              <ChevronDown className="w-4 h-4" />
            </Link>
          </div>

          {/* Trust row — minimal */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/30 mb-12 sm:mb-16">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#00ff88]/60" /> 10 free credits</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#00ff88]/60" /> No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#00ff88]/60" /> Commercial license</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#00ff88]/60" /> Transparent PNG</span>
          </div>

          {/* Hero asset showcase — real generated assets, not emojis */}
          <HeroGallery />

        </div>

        {/* Scroll indicator */}
        <a href="#features" className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 hover:text-white/60 transition-colors group">
          <span className="text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">Scroll</span>
          <ChevronDown className="w-6 h-6 animate-bounce" />
        </a>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 sm:py-24 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] bg-[#00ff88]/5 rounded-full blur-[100px] sm:blur-[200px] -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[200px] sm:w-[400px] h-[200px] sm:h-[400px] bg-[#c084fc]/5 rounded-full blur-[75px] sm:blur-[150px] translate-x-1/4 translate-y-1/4" />
        </div>

        <div className="max-w-6xl mx-auto px-3 sm:px-4 relative z-10">
          <div className="text-center mb-10 sm:mb-16">
              <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs sm:text-sm mb-4 sm:mb-6">
                <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Powerful Features</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
                Why Choose <span className="text-gradient-animated">SpriteLab</span>?
              </h2>
              <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base px-2">
                Everything you need to create game-ready assets in minutes
              </p>
            </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {[
              { icon: Zap, title: "Lightning Fast", desc: "Generate assets in 5-10 seconds with our optimized AI pipeline", color: "text-yellow-400", bg: "bg-yellow-400/10", borderColor: "group-hover:border-yellow-400/40" },
              { icon: Palette, title: "Multiple Styles", desc: "Pixel art, realistic, anime, cartoon, and more artistic styles", color: "text-pink-400", bg: "bg-pink-400/10", borderColor: "group-hover:border-pink-400/40" },
              { icon: Download, title: "Ready to Use", desc: "PNG with transparent background, optimized for games", color: "text-green-400", bg: "bg-green-400/10", borderColor: "group-hover:border-green-400/40" },
              { icon: Cuboid, title: "2D & 3D Assets", desc: "Sprites and 3D models in GLB, PLY, OBJ formats", color: "text-[#c084fc]", bg: "bg-[#c084fc]/10", borderColor: "group-hover:border-[#c084fc]/40" },
              { icon: Clock, title: "Save Hours", desc: "What took days now takes minutes - focus on your game", color: "text-orange-400", bg: "bg-orange-400/10", borderColor: "group-hover:border-orange-400/40" },
              { icon: Shield, title: "Commercial Use", desc: "Full ownership and rights to all generated assets", color: "text-blue-400", bg: "bg-blue-400/10", borderColor: "group-hover:border-blue-400/40" },
            ].map((f, i) => (
              <div
                  key={i}
                  className={`group relative p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 ${f.borderColor} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
                >
                {/* Subtle glow on hover */}
                <div className={`absolute inset-0 rounded-xl sm:rounded-2xl ${f.bg} opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />

                  <div className="relative z-10">
                    <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl ${f.bg} flex items-center justify-center mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <f.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${f.color}`} />
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 group-hover:text-white transition-colors">{f.title}</h3>
                    <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
            ))}
          </div>

          {/* Game Engines */}
          <div className="mt-16 sm:mt-24 text-center">
            <p className="text-white/40 text-xs sm:text-sm mb-6 sm:mb-8 uppercase tracking-wider">Trusted by developers using</p>
            <div className="flex items-center justify-center gap-4 sm:gap-10 md:gap-16 flex-wrap">
              {[
                { name: "Unity", icon: "🎮" },
                { name: "Godot", icon: "🤖" },
                { name: "Unreal", icon: "🔥" },
                { name: "Roblox", icon: "🧱" },
                { name: "GameMaker", icon: "🎯" },
                { name: "Blender", icon: "🎨" },
              ].map((engine) => (
                <div key={engine.name} className="flex items-center gap-1.5 sm:gap-2 text-white/30 hover:text-white/70 transition-colors cursor-default group">
                  <span className="text-base sm:text-xl opacity-50 group-hover:opacity-100 transition-opacity">{engine.icon}</span>
                  <span className="font-medium text-xs sm:text-base">{engine.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>


      {/* How It Works */}
      <section id="how-it-works" className="py-16 sm:py-24 relative">
        <div className="max-w-5xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs sm:text-sm mb-4 sm:mb-6">
              <Zap className="w-3.5 h-3.5" />
              <span>Simple as 1-2-3</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              How It <span className="text-[#00d4ff]">Works</span>
            </h2>
            <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base">
              From idea to downloadable game asset in under 10 seconds.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 relative">
            {/* Connector line desktop */}
            <div className="hidden md:block absolute top-10 left-[calc(33%-20px)] right-[calc(33%-20px)] h-px bg-gradient-to-r from-[#00ff88]/40 via-[#00d4ff]/40 to-[#c084fc]/40" />

            {[
              {
                step: "01",
                color: "#00ff88",
                icon: "🎮",
                title: "Pick asset type",
                desc: "Choose from weapons, enemies, icons, potions, armor and more. Pick a subtype to be precise.",
              },
              {
                step: "02",
                color: "#00d4ff",
                icon: "✏️",
                title: "Describe it",
                desc: "Write a short description: what it looks like, what material, what style. The more specific, the better.",
              },
              {
                step: "03",
                color: "#c084fc",
                icon: "⚡",
                title: "Download PNG",
                desc: "Your asset generates in ~5 seconds. Transparent background, ready to drop into Unity, Godot, or any engine.",
              },
            ].map((item, i) => (
              <div key={i} className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-[#0a0a0f]/80 border border-white/10 hover:border-white/20 transition-all">
                {/* Step badge */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold mb-4 border"
                  style={{ borderColor: item.color + "50", backgroundColor: item.color + "15", color: item.color }}
                >
                  {item.step}
                </div>
                <div className="text-4xl mb-4">{item.icon}</div>
                <h3 className="text-base sm:text-lg font-bold mb-2">{item.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10 sm:mt-12">
            <Link
              href={registerUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold hover:scale-105 transition-all shadow-lg shadow-[#00ff88]/20"
            >
              Try it free — 5 credits included
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Examples Gallery */}
      <ExamplesGallery />

      {/* Try It Now - Guest Generation */}
      <TryItNow />

      {/* Pricing Section - with Launch Promos, Lifetime Deals, Credit Packs */}
      <PricingSection />

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 relative">
        <div className="max-w-3xl mx-auto px-3 sm:px-4">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#00d4ff]/10 border border-[#00d4ff]/20 text-[#00d4ff] text-xs sm:text-sm mb-4 sm:mb-6">
              <span>❓</span>
              <span>Got Questions?</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Frequently Asked <span className="text-[#00d4ff]">Questions</span>
            </h2>
          </div>

          <div className="space-y-3 sm:space-y-4">
            {[
              { q: "Can I use generated assets commercially?", a: "Yes! All assets you generate are yours to use in commercial projects with no attribution required. You have full ownership rights.", icon: "💼" },
              { q: "What formats are supported?", a: "2D assets export as PNG with transparent backgrounds. 3D models export as GLB, PLY, and OBJ formats compatible with all major game engines.", icon: "📁" },
              { q: "How long does generation take?", a: "2D sprites generate in about 5 seconds. 3D models take 30-60 seconds depending on complexity. Our AI is optimized for speed.", icon: "⚡" },
              { q: "Do credits expire?", a: "Credits on paid plans refresh monthly. Free tier credits never expire - use them whenever you're ready!", icon: "🎫" },
            ].map((faq, i) => (
              <div
                key={i}
                className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 hover:border-[#00d4ff]/30 transition-all duration-300"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-[#00d4ff]/10 flex items-center justify-center flex-shrink-0 text-base sm:text-lg group-hover:scale-110 transition-transform">
                    {faq.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1.5 sm:mb-2 text-sm sm:text-base group-hover:text-[#00d4ff] transition-colors">{faq.q}</h3>
                    <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{faq.a}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 text-center">
          <div className="relative p-6 sm:p-12 md:p-16 rounded-2xl sm:rounded-3xl overflow-hidden">
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/20 via-[#00d4ff]/20 to-[#c084fc]/20 animate-gradient" style={{ backgroundSize: "200% 200%" }} />
            <div className="absolute inset-0 bg-[#0a0a0f]/60 backdrop-blur-sm" />

            {/* Border */}
            <div className="absolute inset-0 rounded-2xl sm:rounded-3xl border border-white/10" />

            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-16 sm:w-24 h-16 sm:h-24 border-l-2 border-t-2 border-[#00ff88]/40 rounded-tl-2xl sm:rounded-tl-3xl" />
            <div className="absolute bottom-0 right-0 w-16 sm:w-24 h-16 sm:h-24 border-r-2 border-b-2 border-[#c084fc]/40 rounded-br-2xl sm:rounded-br-3xl" />

            {/* Content */}
            <div className="relative z-10">
              {/* Coreling */}
              <div className="flex justify-center mb-4 sm:mb-6">
                <div className="relative animate-float-sway" style={{ animationDuration: "4s" }}>
                  <div className="absolute inset-0 bg-[#00ff88]/30 rounded-full blur-2xl scale-125" />
                  <Image
                    src="/coreling-happy.png"
                    alt="Happy Coreling"
                    width={80}
                    height={80}
                    className="relative drop-shadow-2xl w-[70px] h-[70px] sm:w-[100px] sm:h-[100px]"
                    loading="lazy"
                  />
                </div>
              </div>

              <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
                Your game needs assets.<span className="text-gradient-animated"> We make them.</span>
              </h2>
              <p className="text-white/60 mb-6 sm:mb-10 max-w-xl mx-auto text-sm sm:text-lg px-2">
                5 free credits on signup. No card required. Start generating in 30 seconds.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Link
                  href={registerUrl}
                  className="group relative inline-flex items-center gap-2 px-6 sm:px-8 py-3 sm:py-4 rounded-xl bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-bold text-base sm:text-lg transition-all hover:scale-105 shadow-xl shadow-[#00ff88]/30 hover:shadow-[#00ff88]/50 overflow-hidden w-full sm:w-auto justify-center"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Start Creating Free
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00d4ff] to-[#c084fc] opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>

                <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#00ff88]" />
                  <span>No credit card required</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 sm:py-16 border-t border-white/5 relative">
        {/* Subtle gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#00ff88]/5 to-transparent pointer-events-none" />

        <div className="max-w-6xl mx-auto px-3 sm:px-4 relative z-10">
          <div className="flex flex-col items-center gap-6 sm:gap-8 md:flex-row md:justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 bg-[#00ff88]/20 rounded-lg blur-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                <Image src="/logo.png" alt="SpriteLab" width={24} height={24} className="relative sm:w-7 sm:h-7" loading="lazy" />
              </div>
              <span className="font-display font-bold tracking-tight text-base sm:text-lg">
                Sprite<span className="text-[#00ff88]">Lab</span>
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center gap-4 sm:gap-8 text-xs sm:text-sm text-white/40 flex-wrap justify-center">
              <Link href="/privacy" className="hover:text-[#00ff88] transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-[#00ff88] transition-colors">Terms</Link>
              <Link href="/changelog" className="hover:text-[#00ff88] transition-colors">Changelog</Link>
              <a href="mailto:support@sprite-lab.com" className="hover:text-[#00ff88] transition-colors">Contact</a>
            </div>

            {/* Copyright */}
            <p className="text-xs sm:text-sm text-white/30">
              © 2026 SpriteLab. All rights reserved.
            </p>
          </div>

          {/* Bottom text */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-white/5 text-center">
            <p className="text-[10px] sm:text-xs text-white/20">
              Made with 💚 for game developers worldwide
            </p>
          </div>
        </div>
      </footer>

    </main>
  );
}
