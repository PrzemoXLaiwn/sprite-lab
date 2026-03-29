import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { ArrowRight, Sparkles, Check, Users, Crown, Wand2 } from "lucide-react";

export const metadata: Metadata = {
  title: "AI RPG Character Creator | Generate Heroes, NPCs & Monsters - SpriteLab",
  description:
    "Create unique RPG characters with AI. Heroes, villains, NPCs, monsters, and bosses. Multiple fantasy and sci-fi styles. Free to try. Perfect for indie RPG developers.",
  keywords: [
    "RPG character generator",
    "AI character creator",
    "game character sprites",
    "hero generator",
    "NPC generator",
    "monster generator",
    "fantasy characters",
    "RPG sprites",
    "character art",
    "game characters",
  ],
  openGraph: {
    title: "AI RPG Character Creator - Generate Heroes, NPCs & Monsters",
    description:
      "Create unique RPG characters instantly. Heroes, villains, NPCs, monsters in any style.",
    url: "https://www.sprite-lab.com/rpg-character-creator",
    type: "website",
  },
  alternates: {
    canonical: "https://www.sprite-lab.com/rpg-character-creator",
  },
};

const characterTypes = [
  {
    emoji: "⚔️",
    name: "Warriors",
    examples: "Knights, Barbarians, Samurai, Gladiators",
  },
  {
    emoji: "🧙",
    name: "Mages",
    examples: "Wizards, Sorcerers, Witches, Druids",
  },
  {
    emoji: "🏹",
    name: "Rangers",
    examples: "Archers, Hunters, Scouts, Assassins",
  },
  {
    emoji: "👹",
    name: "Monsters",
    examples: "Dragons, Demons, Undead, Beasts",
  },
  {
    emoji: "🧝",
    name: "NPCs",
    examples: "Merchants, Villagers, Guards, Royalty",
  },
  {
    emoji: "👑",
    name: "Bosses",
    examples: "Dark Lords, Ancient Dragons, Liches",
  },
];

const features = [
  "Full body character sprites",
  "Portrait/face close-ups",
  "Multiple poses and expressions",
  "Consistent style across characters",
  "Transparent backgrounds",
  "High resolution (1024x1024)",
];

export default function RPGCharacterCreatorPage() {
  return (
    <main className="min-h-screen bg-[#11151b] text-white overflow-x-hidden">
      {/* Hero */}
      <section className="relative min-h-[60vh] sm:min-h-[80vh] flex items-center justify-center pt-20 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#8b5cf6]/5 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-[#8b5cf6]/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-96 h-48 sm:h-96 bg-[#FF6B2C]/10 rounded-full blur-3xl" />

        <div className="max-w-6xl mx-auto px-3 sm:px-4 relative z-10">
          <Link href="/" className="flex items-center justify-center gap-2 mb-5 sm:mb-8">
            <Image src="/logo.png" alt="SpriteLab" width={40} height={40} />
            <span className="font-display font-bold text-2xl">
              Sprite<span className="text-[#FF6B2C]">Lab</span>
            </span>
          </Link>

          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#8b5cf6]/10 border border-[#8b5cf6]/20 text-[#8b5cf6] text-xs sm:text-sm font-medium mb-6">
              <Users className="w-4 h-4" />
              AI Character Generator
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              Create <span className="text-[#8b5cf6]">RPG Characters</span>
              <br />
              <span className="text-white/80">in Seconds</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-10">
              Generate unique heroes, villains, NPCs, and monsters for your RPG.
              Any class, any race, any fantasy style. Just describe your character.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#8b5cf6] to-[#FF6B2C] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-base sm:text-lg"
              >
                Create Characters Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/#try-it"
                className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 bg-white/5 border border-white/10 text-white font-semibold rounded-lg hover:bg-white/10 transition-colors text-base sm:text-lg"
              >
                Try Without Account
              </Link>
            </div>

            <p className="text-white/40 text-xs sm:text-sm mt-6">
              5 free credits • No credit card required
            </p>
          </div>
        </div>
      </section>

      {/* Character Types */}
      <section className="py-12 sm:py-20 relative">
        <div className="max-w-6xl mx-auto px-3 sm:px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
            Any <span className="text-[#8b5cf6]">Character Type</span>
          </h2>
          <p className="text-sm sm:text-base text-white/60 text-center mb-8 sm:mb-12 max-w-xl mx-auto">
            From legendary heroes to terrifying monsters
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
            {characterTypes.map((type) => (
              <div
                key={type.name}
                className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-6 hover:border-[#8b5cf6]/50 transition-colors"
              >
                <div className="text-3xl sm:text-4xl mb-4">{type.emoji}</div>
                <h3 className="text-lg sm:text-xl font-bold mb-2">{type.name}</h3>
                <p className="text-white/60 text-xs sm:text-sm">{type.examples}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-20 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-4">
            Game-Ready <span className="text-[#FF6B2C]">Characters</span>
          </h2>
          <p className="text-sm sm:text-base text-white/60 text-center mb-8 sm:mb-12">
            Everything you need to bring your RPG to life
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {features.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-3 p-3 sm:p-4 bg-white/5 rounded-lg"
              >
                <Check className="w-5 h-5 text-[#FF6B2C] flex-shrink-0" />
                <span className="text-xs sm:text-sm">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Example Prompts */}
      <section className="py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-3 sm:px-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-8 sm:mb-12">
            Example <span className="text-[#FF6B2C]">Prompts</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
            {[
              "A wise elven mage with silver hair and glowing staff",
              "Fierce orc warrior with battle scars and iron armor",
              "Young thief with hood, daggers, and mischievous smile",
              "Ancient dragon boss with purple scales and crown",
              "Friendly merchant gnome with oversized backpack",
              "Dark knight in cursed black armor, red glowing eyes",
            ].map((prompt) => (
              <div
                key={prompt}
                className="p-3 sm:p-4 bg-white/5 border border-white/10 rounded-lg"
              >
                <p className="text-white/80 italic text-sm sm:text-base">&quot;{prompt}&quot;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#8b5cf6]/10 via-transparent to-[#FF6B2C]/10" />
        <div className="max-w-4xl mx-auto px-3 sm:px-4 text-center relative z-10">
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-6">
            Build Your <span className="text-[#8b5cf6]">Party</span> Today
          </h2>
          <p className="text-sm sm:text-base text-white/60 mb-8 max-w-xl mx-auto">
            Stop searching for character assets. Create exactly what your RPG needs.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center justify-center gap-2 px-5 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-[#8b5cf6] to-[#FF6B2C] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity text-base sm:text-lg"
          >
            Get 5 Free Credits
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SpriteLab" width={24} height={24} />
            <span className="font-display font-bold">
              Sprite<span className="text-[#FF6B2C]">Lab</span>
            </span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-white/40">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
