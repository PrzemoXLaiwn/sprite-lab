import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Sparkles, Check, Sword, Shield, Wand2 } from "lucide-react";

export const metadata: Metadata = {
  title: "AI Game Weapon Generator | Create Swords, Guns & Magic Items - SpriteLab",
  description:
    "Generate unique game weapons instantly with AI. Swords, axes, guns, staffs, shields and more. Multiple art styles. Free to try. Perfect for RPGs, action games, and MMOs.",
  keywords: [
    "game weapon generator",
    "AI weapon sprites",
    "sword generator",
    "gun sprite maker",
    "RPG weapon art",
    "fantasy weapons",
    "sci-fi weapons",
    "game item generator",
    "weapon sprites",
    "equipment generator",
  ],
  openGraph: {
    title: "AI Game Weapon Generator - Create Unique Weapons Instantly",
    description:
      "Generate swords, guns, staffs, shields and more for your games. Multiple styles, instant results.",
    url: "https://www.sprite-lab.com/game-weapon-generator",
    type: "website",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/game-weapon-generator",
  },
};

const weaponTypes = [
  {
    icon: "⚔️",
    name: "Melee Weapons",
    items: ["Swords", "Axes", "Hammers", "Daggers", "Spears"],
  },
  {
    icon: "🔫",
    name: "Ranged Weapons",
    items: ["Bows", "Crossbows", "Guns", "Rifles", "Lasers"],
  },
  {
    icon: "✨",
    name: "Magic Weapons",
    items: ["Staffs", "Wands", "Orbs", "Tomes", "Runes"],
  },
  {
    icon: "🛡️",
    name: "Defensive Gear",
    items: ["Shields", "Armor", "Helmets", "Gauntlets", "Boots"],
  },
];

const styles = [
  "Pixel Art - Retro game style",
  "Dark Fantasy - Grimdark aesthetic",
  "Anime - Japanese game art",
  "Hand Painted - Painterly look",
  "Sci-Fi - Futuristic weapons",
  "Cartoon - Fun, colorful style",
];

export default function GameWeaponGeneratorPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Hero */}
      <section className="relative min-h-[80vh] flex items-center justify-center pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#ff6b6b]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff6b6b]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <Link href="/" className="flex items-center justify-center gap-2 mb-8">
            <Image src="/logo.png" alt="SpriteLab" width={40} height={40} />
            <span className="font-display font-bold text-2xl">
              Sprite<span className="text-[#00ff88]">Lab</span>
            </span>
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#ff6b6b]/10 border border-[#ff6b6b]/20 text-[#ff6b6b] text-sm font-medium mb-6">
              <Sword className="w-4 h-4" />
              AI Weapon Generator
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Generate <span className="text-[#ff6b6b]">Epic Weapons</span>
              <br />
              <span className="text-white/80">for Your Game</span>
            </h1>

            <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
              Create unique swords, guns, staffs, shields and more. Any style, any fantasy.
              Just describe your weapon and watch the magic happen.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#ff6b6b] to-[#ffd93d] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
              >
                Create Weapons Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/#try-it"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-lg"
              >
                Try It Now
              </Link>
            </div>

            <p className="text-white/40 text-sm mt-6">
              5 free credits • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Weapon Types */}
      <section className="py-20 relative">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Every <span className="text-[#ff6b6b]">Weapon Type</span> You Need
          </h2>
          <p className="text-white/60 text-center mb-12 max-w-xl mx-auto">
            From medieval swords to futuristic laser guns - we&apos;ve got you covered
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {weaponTypes.map((type) => (
              <div
                key={type.name}
                className="bg-white/5 border border-white/10 rounded-xl p-6 hover:border-[#ff6b6b]/50 transition-colors"
              >
                <div className="text-4xl mb-4">{type.icon}</div>
                <h3 className="text-xl font-bold mb-3">{type.name}</h3>
                <ul className="space-y-1">
                  {type.items.map((item) => (
                    <li key={item} className="text-white/60 text-sm flex items-center gap-2">
                      <span className="w-1 h-1 bg-[#ff6b6b] rounded-full" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Styles */}
      <section className="py-20 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            Multiple <span className="text-[#00d4ff]">Art Styles</span>
          </h2>
          <p className="text-white/60 text-center mb-12">
            Match your game&apos;s aesthetic perfectly
          </p>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {styles.map((style) => (
              <div
                key={style}
                className="flex items-center gap-3 p-4 bg-white/5 rounded-lg"
              >
                <Check className="w-5 h-5 text-[#00ff88] flex-shrink-0" />
                <span className="text-sm">{style}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            How It <span className="text-[#00ff88]">Works</span>
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4 text-[#00ff88] font-bold text-xl">
                1
              </div>
              <h3 className="font-bold mb-2">Describe Your Weapon</h3>
              <p className="text-white/60 text-sm">
                &quot;A flaming sword with dragon engravings&quot;
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4 text-[#00ff88] font-bold text-xl">
                2
              </div>
              <h3 className="font-bold mb-2">Choose Style</h3>
              <p className="text-white/60 text-sm">
                Pick from pixel art, dark fantasy, anime, and more
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-[#00ff88]/20 flex items-center justify-center mx-auto mb-4 text-[#00ff88] font-bold text-xl">
                3
              </div>
              <h3 className="font-bold mb-2">Download & Use</h3>
              <p className="text-white/60 text-sm">
                Get your weapon PNG ready for your game engine
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#ff6b6b]/10 via-transparent to-[#ffd93d]/10" />
        <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Forge Your <span className="text-[#ff6b6b]">Arsenal</span> Today
          </h2>
          <p className="text-white/60 mb-8 max-w-xl mx-auto">
            Stop searching for weapon assets. Generate exactly what you need in seconds.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-[#ff6b6b] to-[#ffd93d] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-lg"
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
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
