"use client";

import { Star, Users, Zap, TrendingUp, Shield, Heart } from "lucide-react";
import { ScrollAnimation, CountUp } from "./ScrollAnimations";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Indie Game Developer",
    avatar: "🎮",
    content: "SpriteLab saved me weeks of work! The quality is incredible and the speed is unmatched. Perfect for rapid prototyping.",
    rating: 5,
    game: "Pixel Quest RPG",
  },
  {
    name: "Sarah Martinez",
    role: "Game Studio Lead",
    avatar: "🎨",
    content: "We use SpriteLab for all our 2D assets now. The consistency and style options are exactly what we needed.",
    rating: 5,
    game: "Neon Warriors",
  },
  {
    name: "Mike Johnson",
    role: "Solo Developer",
    avatar: "⚔️",
    content: "As a programmer with zero art skills, SpriteLab is a game-changer. I can finally bring my ideas to life!",
    rating: 5,
    game: "Dungeon Crawler X",
  },
];

const stats = [
  {
    icon: Users,
    value: 10000,
    suffix: "+",
    label: "Active Developers",
    color: "text-[#00ff88]",
    bgColor: "bg-[#00ff88]/10",
  },
  {
    icon: Zap,
    value: 500000,
    suffix: "+",
    label: "Assets Generated",
    color: "text-[#00d4ff]",
    bgColor: "bg-[#00d4ff]/10",
  },
  {
    icon: TrendingUp,
    value: 98,
    suffix: "%",
    label: "Satisfaction Rate",
    color: "text-[#c084fc]",
    bgColor: "bg-[#c084fc]/10",
  },
  {
    icon: Shield,
    value: 100,
    suffix: "%",
    label: "Commercial License",
    color: "text-[#ffd93d]",
    bgColor: "bg-[#ffd93d]/10",
  },
];

const trustBadges = [
  { icon: "🔒", text: "SSL Secured" },
  { icon: "⚡", text: "Lightning Fast" },
  { icon: "💳", text: "Secure Payments" },
  { icon: "🎯", text: "No Watermarks" },
  { icon: "📦", text: "Instant Download" },
  { icon: "♾️", text: "Unlimited Use" },
];

export function SocialProof() {
  return (
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c084fc]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[#00ff88]/5 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-6xl mx-auto px-4 relative z-10">
        {/* Stats Section */}
        <ScrollAnimation animation="fade-up">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#c084fc]/10 border border-[#c084fc]/20 text-[#c084fc] text-sm mb-6">
              <Heart className="w-4 h-4" />
              <span>Trusted by Developers Worldwide</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Join Thousands of <span className="text-gradient-animated">Happy Creators</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto">
              See why game developers love SpriteLab for their asset creation needs
            </p>
          </div>
        </ScrollAnimation>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, index) => (
            <ScrollAnimation
              key={index}
              animation="scale"
              delay={index * 100}
            >
              <div className="group relative p-6 rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 hover:border-white/20 transition-all duration-300 hover:-translate-y-1">
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-2xl ${stat.bgColor} opacity-0 group-hover:opacity-100 transition-opacity blur-xl`} />
                
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                  <div className={`text-3xl font-bold mb-1 ${stat.color}`}>
                    <CountUp end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-white/50 text-sm">{stat.label}</div>
                </div>
              </div>
            </ScrollAnimation>
          ))}
        </div>

        {/* Testimonials */}
        <ScrollAnimation animation="fade-up">
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {testimonials.map((testimonial, index) => (
              <div
                key={index}
                className="group relative p-6 rounded-2xl bg-[#0a0a0f]/80 backdrop-blur-sm border border-white/10 hover:border-[#00ff88]/30 transition-all duration-300 hover:-translate-y-1"
              >
                {/* Subtle glow on hover */}
                <div className="absolute inset-0 rounded-2xl bg-[#00ff88]/5 opacity-0 group-hover:opacity-100 transition-opacity blur-xl" />
                
                <div className="relative z-10">
                  {/* Rating */}
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#ffd93d] text-[#ffd93d]" />
                    ))}
                  </div>

                  {/* Content */}
                  <p className="text-white/70 text-sm leading-relaxed mb-6">
                    "{testimonial.content}"
                  </p>

                  {/* Author */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-xl">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.name}</div>
                      <div className="text-white/40 text-xs">{testimonial.role}</div>
                      <div className="text-[#00ff88] text-xs mt-0.5">{testimonial.game}</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollAnimation>

        {/* Trust Badges */}
        <ScrollAnimation animation="fade-up" delay={200}>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {trustBadges.map((badge, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 hover:border-[#00ff88]/30 hover:bg-white/10 transition-all cursor-default group"
              >
                <span className="text-lg group-hover:scale-110 transition-transform">{badge.icon}</span>
                <span className="text-white/60 text-sm font-medium group-hover:text-white/80 transition-colors">
                  {badge.text}
                </span>
              </div>
            ))}
          </div>
        </ScrollAnimation>

        {/* Live Activity Indicator */}
        <ScrollAnimation animation="scale" delay={300}>
          <div className="mt-12 flex items-center justify-center gap-3 text-sm">
            <div className="relative">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <div className="absolute inset-0 w-2 h-2 rounded-full bg-[#00ff88] animate-ping" />
            </div>
            <span className="text-white/50">
              <CountUp end={47} /> developers creating assets right now
            </span>
          </div>
        </ScrollAnimation>
      </div>
    </section>
  );
}
