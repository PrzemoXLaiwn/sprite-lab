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
    <main className="min-h-screen bg-[#0a0c10] text-white">

      {/* ═══ NAV ═════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0c10]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={24} height={24} priority />
            <span className="font-bold text-[15px] tracking-tight text-white/90">
              Sprite<span className="text-[#FF6B2C]">Lab</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">Features</a>
            <a href="#pricing" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">Pricing</a>
            <a href="#faq" className="text-[13px] text-white/40 hover:text-white/70 transition-colors">FAQ</a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/40 hover:text-white/70 transition-colors px-3 py-2">
              Log in
            </Link>
            <Link href={registerUrl}
              className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-[#FF6B2C] text-white hover:bg-[#e55a1f] transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ═══ HERO ════════════════════════════════════════════ */}
      <section className="pt-28 sm:pt-36 pb-16 sm:pb-20">
        <div className="max-w-4xl mx-auto px-4 text-center">

          <p className="text-[13px] text-white/30 mb-6">
            For indie RPG, roguelike &amp; survival developers
          </p>

          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold mb-5 leading-[1.08] tracking-tight">
            Game Assets.
            <br />
            <span className="text-[#FF6B2C]">Ready in Seconds.</span>
          </h1>

          <p className="text-base sm:text-lg text-white/40 max-w-lg mx-auto mb-8 leading-relaxed">
            Weapons, potions, characters, icons and props.
            Pick a style, describe what you need, download transparent PNG.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
            <Link href={registerUrl}
              className="group flex items-center gap-2 px-7 py-3.5 rounded-lg bg-[#FF6B2C] text-white font-semibold text-[15px] hover:bg-[#e55a1f] transition-colors w-full sm:w-auto justify-center">
              Start Creating — 10 Free Credits
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
            <Link href="#features"
              className="flex items-center gap-2 px-5 py-3.5 rounded-lg border border-white/8 text-white/40 hover:text-white/60 hover:border-white/15 transition-colors text-sm">
              How it works
              <ChevronDown className="w-4 h-4" />
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/25 mb-14">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#FF6B2C]/50" />10 free credits</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#FF6B2C]/50" />No credit card</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#FF6B2C]/50" />Commercial license</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#FF6B2C]/50" />Transparent PNG</span>
          </div>

          <HeroGallery />
        </div>
      </section>

      {/* ═══ FEATURES ════════════════════════════════════════ */}
      <section id="features" className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              Why <span className="text-[#FF6B2C]">SpriteLab</span>?
            </h2>
            <p className="text-white/35 text-sm max-w-md mx-auto">
              Everything you need to create game-ready assets in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Zap, title: "5-Second Generation", desc: "Type what you need, get a game-ready asset in seconds." },
              { icon: Palette, title: "8 Art Styles", desc: "Pixel art, hand-painted, anime, dark fantasy, cartoon, vector, realistic." },
              { icon: Download, title: "Transparent PNG", desc: "Download ready-to-use assets with clean transparent backgrounds." },
              { icon: Clock, title: "Days → Minutes", desc: "Stop waiting for freelancers. Generate what you need, when you need it." },
              { icon: Shield, title: "Commercial License", desc: "Full ownership. Use in any game. No attribution required." },
              { icon: ArrowRight, title: "Project Folders", desc: "Organize assets by game project. AI creates folder structure for you." },
            ].map((f, i) => (
              <div key={i} className="p-5 rounded-xl bg-[#11151b] border border-white/5 hover:border-white/10 transition-colors">
                <f.icon className="w-5 h-5 text-[#FF6B2C]/70 mb-3" />
                <h3 className="text-sm font-semibold text-white/80 mb-1">{f.title}</h3>
                <p className="text-[13px] text-white/30 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ════════════════════════════════════ */}
      <section className="py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold mb-3">
              Three steps. That&apos;s it.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Pick asset type", desc: "Weapons, armor, potions, characters, icons — choose what your game needs." },
              { step: "02", title: "Describe it", desc: "Write a short description. The more specific the color, material, and style — the better." },
              { step: "03", title: "Download", desc: "Your asset generates in ~5 seconds. Transparent PNG, ready for Unity, Godot, or any engine." },
            ].map((item, i) => (
              <div key={i} className="text-center p-6 rounded-xl bg-[#11151b] border border-white/5">
                <div className="w-9 h-9 rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C] text-xs font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-sm font-semibold text-white/80 mb-2">{item.title}</h3>
                <p className="text-[13px] text-white/30 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link href={registerUrl}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#FF6B2C] text-white font-semibold hover:bg-[#e55a1f] transition-colors text-sm">
              Try it free — 10 credits
              <ArrowRight className="w-4 h-4" />
            </Link>
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
      <section id="faq" className="py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
            Questions
          </h2>

          <div className="space-y-3">
            {[
              { q: "Can I use assets commercially?", a: "Yes. Full ownership, no attribution required. Use in any commercial game." },
              { q: "What formats?", a: "PNG with transparent background for 2D. GLB, PLY, OBJ for 3D models." },
              { q: "How fast?", a: "2D assets in ~5 seconds. 3D models in 30-60 seconds." },
              { q: "Do credits expire?", a: "Free credits never expire. Paid plan credits refresh monthly." },
              { q: "What art styles?", a: "Pixel art (16-bit, HD), hand-painted, anime, dark fantasy, cartoon, vector, realistic." },
            ].map((faq, i) => (
              <div key={i} className="p-4 rounded-lg bg-[#11151b] border border-white/5">
                <h3 className="text-[13px] font-semibold text-white/70 mb-1">{faq.q}</h3>
                <p className="text-[13px] text-white/30 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══════════════════════════════════════ */}
      <section className="py-16 sm:py-24 border-t border-white/5">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-3">
            Your game needs assets.
          </h2>
          <p className="text-white/30 mb-8 text-sm">
            10 free credits. No card required. Start generating in 30 seconds.
          </p>
          <Link href={registerUrl}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-[#FF6B2C] text-white font-bold text-base hover:bg-[#e55a1f] transition-colors">
            Start Creating Free
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ═══ FOOTER ══════════════════════════════════════════ */}
      <footer className="py-10 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="SpriteLab" width={20} height={20} loading="lazy" />
              <span className="font-bold text-sm tracking-tight">
                Sprite<span className="text-[#FF6B2C]">Lab</span>
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-white/25">
              <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
              <Link href="/changelog" className="hover:text-white/50 transition-colors">Changelog</Link>
              <a href="mailto:support@sprite-lab.com" className="hover:text-white/50 transition-colors">Contact</a>
            </div>
            <p className="text-xs text-white/15">© 2026 SpriteLab</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
