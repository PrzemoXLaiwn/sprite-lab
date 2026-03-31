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

const PlaceholderImage = ({ index }: { index: number }) => {
  return (
    <div className="w-full h-full animate-pulse flex items-center justify-center bg-[#F97316]/[0.03]">
      <div
        className="w-6 h-6 rounded-lg animate-spin"
        style={{
          borderWidth: 2,
          borderStyle: "solid",
          borderColor: "rgba(249,115,22,0.15)",
          borderTopColor: "#F97316",
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

  if (error || (!loading && images.length === 0)) {
    return null;
  }

  return (
    <div className="animate-slide-up" style={{ animationDelay: "400ms" }}>
      {/* Gallery container with premium framing */}
      <div className="relative max-w-4xl mx-auto">
        {/* Ambient glow behind gallery */}
        <div className="absolute -inset-8 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.05)_0%,transparent_60%)] pointer-events-none" />

        <div className="relative p-4 sm:p-6 rounded-2xl bg-gradient-to-b from-[#121826]/80 to-[#0F1320]/60 border border-white/[0.06]">
          {/* Frame header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#F97316]/60" />
              <span className="text-[11px] text-white/25 uppercase tracking-wider font-medium">Live Generations</span>
            </div>
            <span className="text-[10px] text-white/15">Real community output</span>
          </div>

          {/* Image grid */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5 sm:gap-3">
            {loading ? (
              [...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-xl bg-[#182033]/60 border border-white/[0.04] overflow-hidden"
                >
                  <PlaceholderImage index={i} />
                </div>
              ))
            ) : (
              images.slice(0, 6).map((item, i) => (
                <div
                  key={item.id}
                  className="group relative aspect-square rounded-xl bg-[#182033]/40 border border-white/[0.06] hover:border-[#F97316]/30 transition-all duration-300 hover:scale-[1.04] overflow-hidden"
                >
                  {/* Subtle inner shadow for depth */}
                  <div className="absolute inset-0 rounded-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] pointer-events-none z-10" />

                  <Image
                    src={item.imageUrl}
                    alt={item.prompt.slice(0, 50)}
                    fill
                    className="object-contain p-2.5 sm:p-3 transition-transform duration-300 group-hover:scale-105"
                    loading={i < 3 ? "eager" : "lazy"}
                    unoptimized
                  />

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-xl flex flex-col justify-end p-2.5 z-20">
                    <p className="text-[10px] sm:text-[11px] text-white/90 font-medium truncate leading-tight">{item.prompt.slice(0, 30)}</p>
                    <p className="text-[9px] sm:text-[10px] text-[#F97316]/80 mt-0.5">{item.style}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
