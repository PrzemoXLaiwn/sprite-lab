"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Zap, Play } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export function HeroSection() {
  // Example generated assets to showcase
  const exampleAssets = [
    { emoji: "⚔️", label: "Sword", delay: "0s" },
    { emoji: "🛡️", label: "Shield", delay: "0.5s" },
    { emoji: "💎", label: "Gem", delay: "1s" },
    { emoji: "🧪", label: "Potion", delay: "1.5s" },
    { emoji: "🗝️", label: "Key", delay: "2s" },
    { emoji: "📜", label: "Scroll", delay: "2.5s" },
  ];

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-pattern opacity-50" />
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          {/* Badge */}
          <Badge 
            variant="secondary" 
            className="mb-6 px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Now in Beta - Get 5 Free Credits
          </Badge>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
            Generate Game Sprites
            <span className="block gradient-text">In Seconds, Not Hours</span>
          </h1>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            Create pixel art icons, sprites, and UI elements for your games using AI.
            Perfect for indie developers, game jammers, and Roblox creators.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button 
              size="xl" 
              className="bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 animate-pulse-glow"
              asChild
            >
              <Link href="/register">
                Start Creating Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
            </Button>
            <Button size="xl" variant="outline" className="group">
              <Play className="w-5 h-5 mr-2 group-hover:text-primary transition-colors" />
              Watch Demo
            </Button>
          </div>

          {/* Social Proof */}
          <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground mb-16">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span>~5s generation time</span>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="font-semibold text-foreground">500+</span>
              <span>assets generated</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-foreground">£0.02</span>
              <span>per asset</span>
            </div>
          </div>

          {/* Floating Asset Examples */}
          <div className="relative h-32 sm:h-40">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex items-center gap-4 sm:gap-8">
                {exampleAssets.map((asset, index) => (
                  <div
                    key={asset.label}
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-card border border-border flex items-center justify-center text-2xl sm:text-3xl shadow-lg animate-float"
                    style={{ 
                      animationDelay: asset.delay,
                      animationDuration: `${3 + index * 0.2}s`
                    }}
                  >
                    {asset.emoji}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt Example */}
          <div className="max-w-xl mx-auto mt-8">
            <div className="glass rounded-2xl p-4 sm:p-6">
              <div className="flex items-center gap-3 text-left">
                <Image
                  src="/logo.png"
                  alt="SpriteLab"
                  width={40}
                  height={40}
                  className="shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Try a prompt like:</p>
                  <p className="text-sm sm:text-base font-medium truncate">
                    &quot;golden sword with ruby gems, pixel art RPG style&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-2">
          <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
        </div>
      </div>
    </section>
  );
}
