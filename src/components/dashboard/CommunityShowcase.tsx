"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ArrowRight, Heart, Sparkles } from "lucide-react";
import { CHECKERBOARD, isPixelStyleId } from "@/components/community/shared";

interface CommunityGeneration {
  id: string;
  imageUrl: string;
  prompt: string;
  categoryId: string;
  styleId?: string | null;
  likes: number;
  createdAt: string;
  user: {
    username: string | null;
    avatarUrl: string | null;
  } | null;
}

function Header({ showLink }: { showLink: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-[#FF8A3D]" />
        <h3 className="text-[14px] font-semibold text-white">Community creations</h3>
      </div>
      {showLink && (
        <Link
          href="/community"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-[12px] font-medium text-[#8B93A5] transition-colors hover:bg-white/[0.05] hover:text-white"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function CommunityShowcase() {
  const [generations, setGenerations] = useState<CommunityGeneration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGenerations = async () => {
      try {
        const response = await fetch("/api/community/recent?limit=6");
        if (response.ok) {
          const data = await response.json();
          setGenerations(data.generations || []);
        }
      } catch (err) {
        console.error("Failed to fetch community generations:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGenerations();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
        <Header showLink={false} />
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-white/[0.04]" />
          ))}
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
        <Header showLink={false} />
        <div className="flex flex-col items-center py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04]">
            <Sparkles className="h-5 w-5 text-[#8B93A5]" />
          </div>
          <p className="text-[13px] text-[#8B93A5]">Be the first to share your creations!</p>
          <Link
            href="/community"
            className="mt-4 flex h-9 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3.5 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08]"
          >
            Visit Explore
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-[#0E1016] p-5">
      <Header showLink />

      <div className="grid grid-cols-3 gap-2">
        {generations.slice(0, 6).map((gen) => (
          <Link
            key={gen.id}
            href="/community"
            title={gen.prompt}
            className="group relative aspect-square overflow-hidden rounded-xl border border-white/[0.06] bg-[#151922] transition-colors hover:border-white/20"
            style={CHECKERBOARD}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={gen.imageUrl}
              alt={gen.prompt}
              className={`h-full w-full object-contain p-[10%] transition-transform duration-300 group-hover:scale-105 ${isPixelStyleId(gen.styleId) ? "pixel-perfect" : ""}`}
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
              <div className="absolute inset-x-0 bottom-0 p-2">
                <p className="mb-1 line-clamp-2 text-[10.5px] leading-tight text-white">{gen.prompt}</p>
                {gen.likes > 0 && (
                  <div className="flex items-center gap-1 text-[#ECEEF3]">
                    <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
                    <span className="font-mono text-[10px] tabular-nums">{gen.likes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator badge */}
            {gen.user?.username && (
              <span className="absolute left-1.5 top-1.5 max-w-[85%] truncate rounded-full border border-white/[0.08] bg-black/50 px-1.5 py-0.5 font-mono text-[9px] text-[#C9CFDB] backdrop-blur-sm">
                @{gen.user.username}
              </span>
            )}
          </Link>
        ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-[#7A8294]">Get inspired by what others are creating</p>
    </div>
  );
}
