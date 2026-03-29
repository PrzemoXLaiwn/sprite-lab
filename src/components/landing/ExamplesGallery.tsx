"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, Heart, Wand2, Copy, Check } from "lucide-react";

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
    <div className="group relative bg-[#11151b]/80 border border-white/10 rounded-xl overflow-hidden hover:border-[#FF6B2C]/50 transition-all duration-300 hover:scale-[1.02]">
      {/* Image */}
      <div className="aspect-square relative bg-gradient-to-br from-white/5 to-white/0">
        <Image
          src={sprite.imageUrl}
          alt={sprite.prompt.slice(0, 50)}
          fill
          className="object-contain p-4"
          unoptimized
        />

        {/* Hover overlay with actions */}
        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-2 p-3">
          <Link
            href={generateUrl}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#FF6B2C] text-black text-xs font-bold hover:bg-[#FF6B2C] transition-colors"
          >
            <Wand2 className="w-3 h-3" />
            Generate like this
          </Link>
          <button
            onClick={handleCopyPrompt}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors"
          >
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied!" : "Copy prompt"}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="p-3 border-t border-white/5 bg-black/40">
        <p className="text-white/70 text-xs line-clamp-2 mb-2 leading-relaxed">
          &quot;{sprite.prompt}&quot;
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] text-white/40">
            <span className="px-1.5 py-0.5 rounded bg-white/10">{sprite.style}</span>
            <span>{sprite.category}</span>
          </div>
          {sprite.likes > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-pink-400">
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
    <section id="gallery" className="py-16 sm:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#FF6B2C]/5 to-transparent" />

      <div className="max-w-6xl mx-auto px-3 sm:px-4 relative z-10">
        <div className="text-center mb-8 sm:mb-12">
          <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-[#FF6B2C]/10 border border-[#FF6B2C]/20 text-[#FF6B2C] text-xs sm:text-sm font-medium mb-4 sm:mb-6">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Created with SpriteLab
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mb-3 sm:mb-4">
            See What <span className="text-[#FF6B2C]">Others</span> Created
          </h2>
          <p className="text-white/60 max-w-xl mx-auto text-sm sm:text-base px-2">
            Real assets generated by our community. Hover any card to remix the prompt.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 mb-6 sm:mb-8 px-1">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium transition-all ${
                activeCategory === category
                  ? "bg-[#FF6B2C] text-black"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {loading ? (
            [...Array(8)].map((_, i) => (
              <div key={i} className="relative bg-[#11151b]/80 border border-white/10 rounded-xl overflow-hidden">
                <div className="aspect-square relative bg-gradient-to-br from-white/5 to-white/0 animate-pulse">
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#FF6B2C] animate-spin" />
                  </div>
                </div>
              </div>
            ))
          ) : sprites.length > 0 ? (
            sprites.map((sprite) => (
              <SpriteCard key={sprite.id} sprite={sprite} />
            ))
          ) : (
            <div className="col-span-full text-center py-12">
              <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
              <p className="text-white/40">No public sprites in this category yet.</p>
              <p className="text-white/30 text-sm mt-1">Be the first to share your creations!</p>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <p className="text-white/40 text-sm mb-4">
            Hover any card to remix the prompt instantly
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#FF6B2C] to-[#FF6B2C] text-black font-semibold rounded-lg hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" />
            Start Generating Free
          </Link>
        </div>
      </div>
    </section>
  );
}
