import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Sparkles, Check, Zap, Palette, Download } from "lucide-react";

export const metadata: Metadata = {
  title: "Free AI Pixel Art Generator | Create Retro Game Sprites - SpriteLab",
  description:
    "Generate stunning pixel art sprites for your games in seconds. 8-bit, 16-bit, and 32-bit styles. Free to try, no art skills required. Perfect for indie game developers.",
  keywords: [
    "pixel art generator",
    "free pixel art maker",
    "AI pixel art",
    "retro game sprites",
    "8-bit sprite generator",
    "16-bit pixel art",
    "game pixel art",
    "pixel art characters",
    "pixel art weapons",
    "indie game art",
  ],
  openGraph: {
    title: "Free AI Pixel Art Generator - Create Game Sprites in Seconds",
    description:
      "Generate pixel art sprites for your games instantly. 8-bit, 16-bit, 32-bit styles. No art skills needed.",
    url: "https://www.sprite-lab.com/pixel-art-generator",
    type: "website",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/pixel-art-generator",
  },
};

const pixelStyles = [
  {
    name: "8-Bit Classic",
    description: "Retro NES/Game Boy style with limited colors",
    colors: "4-8 colors",
  },
  {
    name: "16-Bit SNES",
    description: "Super Nintendo era pixel art with more detail",
    colors: "16-32 colors",
  },
  {
    name: "32-Bit HD",
    description: "High-resolution pixel art for modern games",
    colors: "Full palette",
  },
];

const features = [
  {
    icon: Zap,
    title: "Instant Generation",
    description: "Get your pixel art sprite in under 30 seconds",
  },
  {
    icon: Palette,
    title: "Multiple Styles",
    description: "8-bit, 16-bit, 32-bit and custom palettes",
  },
  {
    icon: Download,
    title: "Ready to Use",
    description: "PNG format with transparent backgrounds",
  },
];

const useCases = [
  "RPG characters and NPCs",
  "Platformer heroes and enemies",
  "Weapons and equipment",
  "Items and power-ups",
  "Environment tiles",
  "UI icons and buttons",
];

export default function PixelArtGeneratorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center pt-20 pb-16 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00d4ff]/10 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <Image src="/logo.png" alt="SpriteLab" width={40} height={40} />
            <span className="font-display font-bold text-2xl">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Pixel Art Generator
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Create <span className="text-[#00ff88]">Pixel Art</span>
              <br />
              <span className="text-white/80">in Seconds</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
              Generate stunning 8-bit, 16-bit, and 32-bit pixel art sprites for your games.
              No art skills required. Just describe what you want.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
              >
                Start Creating Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/#try-it"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-lg"
              >
                Try Without Account
              </Link>
            </div>

            <p className="text-white/40 text-sm mt-6">
              5 free credits on signup • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Pixel Styles Section */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Choose Your <span className="text-[#00ff88]">Pixel Style</span>
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
            From classic retro to modern HD pixel art - we support all styles
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {pixelStyles.map((style) => (
              <div
                key={style.name}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#00ff88]/50 transition-colors"
              >
                <div className="w-full aspect-square bg-gradient-to-br from-[#00ff88]/10 to-transparent rounded-lg mb-4 flex items-center justify-center">
                  <div className="text-6xl">🎮</div>
                </div>
                <h3 className="text-xl font-bold mb-2">{style.name}</h3>
                <p className="text-white/60 text-sm mb-2">{style.description}</p>
                <span className="text-xs text-[#00ff88]">{style.colors}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white/[0.02]">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#00ff88]/10 flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-8 h-8 text-[#00ff88]" />
                </div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-white/60">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Perfect For <span className="text-[#00d4ff]">Any Game</span>
          </h2>
          <p className="text-white/60 text-center mb-12">
            Generate any type of pixel art asset you need
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {useCases.map((useCase) => (
              <div
                key={useCase}
                className="flex items-center gap-3 p-4 bg-white/5 rounded-lg"
              >
                <Check className="w-5 h-5 text-[#00ff88] flex-shrink-0" />
                <span>{useCase}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#00ff88]/10 via-transparent to-[#00d4ff]/10" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Start Creating <span className="text-[#00ff88]">Pixel Art</span> Today
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Join thousands of indie developers using SpriteLab to create amazing game assets
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
          >
            Get 5 Free Credits
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={24} height={24} />
            <span className="font-display font-bold">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>
          <div className="flex items-center gap-6 text-sm text-white/40">
            <Link href="/pricing" className="hover:text-white">
              Pricing
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
