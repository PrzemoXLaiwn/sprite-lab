"use client";

import { Zap, Shield, Download, Palette, Clock, Check } from "lucide-react";
import { ScrollAnimation } from "./ScrollAnimations";

const features = [
  {
    icon: Zap,
    title: "~5 second generation",
    desc: "Optimized AI pipeline — from prompt to PNG in seconds, not minutes.",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400/10",
    border: "hover:border-yellow-400/30",
  },
  {
    icon: Palette,
    title: "6 art styles",
    desc: "Pixel Art, Pixel HD, Vector, Anime, Hand Painted, Cartoon — pick what fits your game.",
    color: "text-pink-400",
    bgColor: "bg-pink-400/10",
    border: "hover:border-pink-400/30",
  },
  {
    icon: Download,
    title: "Transparent PNG",
    desc: "Every 2D asset exports with a transparent background, ready to drop into any engine.",
    color: "text-[#00ff88]",
    bgColor: "bg-[#00ff88]/10",
    border: "hover:border-[#00ff88]/30",
  },
  {
    icon: Shield,
    title: "Commercial rights",
    desc: "You own what you generate. Use it in your game, sell it, ship it — no attribution needed.",
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    border: "hover:border-blue-400/30",
  },
  {
    icon: Clock,
    title: "No subscription required",
    desc: "Buy credits when you need them. Free credits included on signup — no card required.",
    color: "text-orange-400",
    bgColor: "bg-orange-400/10",
    border: "hover:border-orange-400/30",
  },
  {
    icon: Check,
    title: "13+ asset categories",
    desc: "Weapons, armor, icons, enemies, potions, environment, tilesets and more.",
    color: "text-[#00d4ff]",
    bgColor: "bg-[#00d4ff]/10",
    border: "hover:border-[#00d4ff]/30",
  },
];

const trustBadges = [
  { icon: "🔒", text: "SSL Secured" },
  { icon: "⚡", text: "~5s Generation" },
  { icon: "💳", text: "Secure Payments" },
  { icon: "🎯", text: "No Watermarks" },
  { icon: "📦", text: "Instant Download" },
  { icon: "♾️", text: "Commercial Use" },
];

export function SocialProof() {
  return (
    <section className="py-16 sm:py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c084fc]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00ff88]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 relative z-10">
        <ScrollAnimation animation="fade-up">
          <div className="text-center mb-10 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 text-[#00ff88] text-xs sm:text-sm mb-4 sm:mb-6">
              <Check className="w-3.5 h-3.5" />
              <span>Built for Game Developers</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
              Everything Your Game <span className="text-gradient-animated">Actually Needs</span>
            </h2>
            <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base px-2">
              Fast, practical, commercial-ready. No fluff.
            </p>
          </div>
        </ScrollAnimation>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 mb-14 sm:mb-20">
          {features.map((f, i) => (
            <ScrollAnimation key={i} animation="fade-up" delay={i * 80}>
              <div
                className={`group relative p-5 sm:p-6 rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 ${f.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/20`}
              >
                <div className={`absolute inset-0 rounded-2xl ${f.bgColor} opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
                <div className="relative z-10">
                  <div className={`w-11 h-11 rounded-xl ${f.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <f.icon className={`w-5 h-5 ${f.color}`} />
                  </div>
                  <h3 className={`text-sm sm:text-base font-bold mb-1.5 ${f.color}`}>{f.title}</h3>
                  <p className="text-white/50 text-xs sm:text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>

        {/* Trust Badges */}
        <ScrollAnimation animation="fade-up" delay={200}>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {trustBadges.map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#00ff88]/30 hover:bg-white/10 transition-all cursor-default group"
              >
                <span className="text-base group-hover:scale-110 transition-transform">{badge.icon}</span>
                <span className="text-white/60 text-xs sm:text-sm font-medium group-hover:text-white/80 transition-colors">
                  {badge.text}
                </span>
              </div>
            ))}
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
