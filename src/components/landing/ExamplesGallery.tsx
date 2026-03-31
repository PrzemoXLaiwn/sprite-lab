"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Heart, Wand2, Copy, Check, ArrowRight } from "lucide-react";

interface FeaturedSprite {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  category: string;
  likes: number;
}

function SpriteCard({ sprite }: { sprite: FeaturedSprite }) {
  const [copied, setCopied] = useState(false);

  const handleCopyPrompt = (e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(sprite.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateUrl = `/generate?prompt=${encodeURIComponent(sprite.prompt)}`;

  return (
    <div className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-[#121826] to-[#0F1320] border border-white/[0.06] hover:border-[#F97316]/25 transition-all duration-300 hover:shadow-[0_8px_30px_rgba(249,115,22,0.06)]">
      {/* Image area */}
      <div className="aspect-square relative bg-[#0D111B]">
        {/* Checkerboard hint for transparency */}
        <div className="absolute inset-0 opacity-[0.015]" style={{
          backgroundImage: "linear-gradient(45deg, #fff 25%, transparent 25%), linear-gradient(-45deg, #fff 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #fff 75%), linear-gradient(-45deg, transparent 75%, #fff 75%)",
          backgroundSize: "16px 16px",
          backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px"
        }} />

        <Image
          src={sprite.imageUrl}
          alt={sprite.prompt.slice(0, 50)}
          fill
          className="object-contain p-5 transition-transform duration-300 group-hover:scale-[1.03]"
          unoptimized
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2.5 p-4">
          <Link
            href={generateUrl}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-[#F97316] text-white text-xs font-bold hover:bg-[#FB923C] transition-colors"
          >
            <Wand2 className="w-3.5 h-3.5" />
            Generate like this
          </Link>
          <button
            onClick={handleCopyPrompt}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors backdrop-blur-sm"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="p-3.5 border-t border-white/[0.04]">
        <p className="text-white/60 text-[12px] line-clamp-2 mb-2.5 leading-relaxed">
          &quot;{sprite.prompt}&quot;
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-white/30">
            <span className="px-2 py-0.5 rounded-md bg-[#F97316]/[0.08] border border-[#F97316]/[0.12] text-[#F97316]/70 font-medium">{sprite.style}</span>
            <span className="text-white/20">{sprite.category}</span>
          </div>
          {sprite.likes > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-pink-400/70">
              <Heart className="w-2.5 h-2.5" fill="currentColor" />
              {sprite.likes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function ExamplesGallery() {
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [sprites, setSprites] = useState<FeaturedSprite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const categories = ["All", "Characters", "Creatures", "Weapons", "Items", "Equipment"];

  useEffect(() => {
    async function fetchSprites() {
      setLoading(true);
      try {
        const categoryParam = activeCategory !== "All" ? `&category=${activeCategory}` : "";
        const res = await fetch(`/api/featured-generations?limit=12${categoryParam}`);
        const data = await res.json();

        if (data.success && data.generations.length > 0) {
          setSprites(data.generations);
          setError(false);
        } else {
          setSprites([]);
          setError(data.generations?.length === 0);
        }
      } catch {
        setError(true);
        setSprites([]);
      } finally {
        setLoading(false);
      }
    }

    fetchSprites();
  }, [activeCategory]);

  if (error && sprites.length === 0 && !loading) {
    return null;
  }

  return (
    <section id="gallery" className="relative py-24 sm:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-[#0D111B] to-[#0B0F19] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#F97316]/[0.08] border border-[#F97316]/[0.15] text-[#F97316] text-[12px] font-medium mb-6 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            Community Showcase
          </div>

          <h2 className="text-3xl sm:text-5xl font-bold mb-4">
            See what devs are <span className="text-[#F97316]">building</span>
          </h2>
          <p className="text-[#94A3B8] max-w-xl mx-auto text-base">
            Real game assets generated by our community. Hover any card to remix the prompt or generate something similar.
          </p>
        </div>

        {/* Category filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                activeCategory === category
                  ? "bg-[#F97316] text-white shadow-[0_2px_12px_rgba(249,115,22,0.25)]"
                  : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/70"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="rounded-2xl bg-[#121826]/60 border border-white/[0.04] overflow-hidden">
                <div className="aspect-square bg-[#0D111B] animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-white/[0.06] border-t-[#F97316]/50 animate-spin" />
                </div>
                <div className="p-3.5 border-t border-white/[0.04]">
                  <div className="h-3 w-3/4 rounded bg-white/[0.04] mb-2" />
                  <div className="h-2.5 w-1/2 rounded bg-white/[0.03]" />
                </div>
              </div>
            ))
          ) : sprites.length > 0 ? (
            sprites.map((sprite) => (
              <SpriteCard key={sprite.id} sprite={sprite} />
            ))
          ) : (
            <div className="col-span-full text-center py-16">
              <Sparkles className="w-10 h-10 text-white/15 mx-auto mb-4" />
              <p className="text-white/35 text-sm">No public sprites in this category yet.</p>
              <p className="text-white/20 text-[12px] mt-1">Be the first to share your creations!</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-14">
          <p className="text-white/30 text-[13px] mb-5">
            Hover any card to remix the prompt. Or start fresh with your own idea.
          </p>
          <Link
            href="/register"
            className="group sl-cta inline-flex items-center gap-2.5 px-7 py-3.5 rounded-xl font-semibold text-[15px] transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Start Generating Free
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </section>
  );
}
