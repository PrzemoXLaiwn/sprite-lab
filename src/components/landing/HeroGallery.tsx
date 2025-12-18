"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

interface FeaturedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  category: string;
}

// Fallback placeholder for loading state
const PlaceholderImage = ({ index }: { index: number }) => {
  const colors = ["#00ff88", "#00d4ff", "#c084fc", "#ff6b6b", "#ffd93d", "#ff88cc"];
  return (
    <div
      className="w-full h-full animate-pulse flex items-center justify-center"
      style={{ backgroundColor: `${colors[index % colors.length]}15` }}
    >
      <div
        className="w-8 h-8 rounded-lg animate-spin"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: `${colors[index % colors.length]}50`,
          borderTopColor: colors[index % colors.length],
        }}
      />
    </div>
  );
};

export function HeroGallery() {
  const [images, setImages] = useState<FeaturedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch("/api/featured-generations?limit=6");
        const data = await res.json();

        if (data.success && data.generations.length > 0) {
          setImages(data.generations);
        } else {
          setError(true);
        }
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchImages();
  }, []);

  // If no images or error, don't render the gallery
  if (error || (!loading && images.length === 0)) {
    return null;
  }

  return (
    <div className="mb-8 sm:mb-10 animate-slide-up" style={{ animationDelay: "250ms" }}>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 max-w-3xl mx-auto">
        {loading ? (
          // Loading placeholders
          [...Array(6)].map((_, i) => (
            <div
              key={i}
              className="relative aspect-square rounded-xl bg-[#0a0a0f]/80 border border-white/10 overflow-hidden"
            >
              <PlaceholderImage index={i} />
            </div>
          ))
        ) : (
          // Real images from database
          images.slice(0, 6).map((item, i) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-xl bg-[#0a0a0f]/80 border border-white/10 hover:border-[#00ff88]/50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#00ff88]/20 overflow-hidden"
            >
              <Image
                src={item.imageUrl}
                alt={item.prompt.slice(0, 50)}
                fill
                className="object-contain p-2 sm:p-3"
                loading={i < 3 ? "eager" : "lazy"}
                unoptimized // Supabase Storage images
              />
              {/* Hover label */}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2">
                <p className="text-[10px] sm:text-xs text-white font-medium truncate">{item.prompt.slice(0, 20)}</p>
                <p className="text-[8px] sm:text-[10px] text-[#00ff88]">{item.style}</p>
              </div>
            </div>
          ))
        )}
      </div>
      <p className="text-white/30 text-[10px] sm:text-xs mt-3">Real AI-generated sprites from our community</p>
    </div>
  );
}
