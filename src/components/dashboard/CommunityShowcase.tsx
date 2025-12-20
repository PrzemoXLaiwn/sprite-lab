"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Users, ArrowRight, Heart, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CommunityGeneration {
  id: string;
  imageUrl: string;
  prompt: string;
  categoryId: string;
  likes: number;
  createdAt: string;
  user: {
    username: string | null;
    avatarUrl: string | null;
  } | null;
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
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#ffd93d]" />
          <h3 className="font-semibold text-white">Community Creations</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[#ffd93d] animate-spin" />
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-[#ffd93d]" />
          <h3 className="font-semibold text-white">Community Creations</h3>
        </div>
        <div className="text-center py-6">
          <Sparkles className="w-10 h-10 text-[#ffd93d]/30 mx-auto mb-3" />
          <p className="text-sm text-[#a0a0b0] mb-4">
            Be the first to share your creations!
          </p>
          <Button asChild size="sm" variant="outline" className="border-[#ffd93d]/30 hover:bg-[#ffd93d]/10">
            <Link href="/community">
              Visit Community
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#ffd93d]" />
          <h3 className="font-semibold text-white">Community Creations</h3>
        </div>
        <Button asChild size="sm" variant="ghost" className="text-[#a0a0b0] hover:text-white">
          <Link href="/community">
            View All
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {generations.slice(0, 6).map((gen) => (
          <div
            key={gen.id}
            className="relative aspect-square rounded-lg overflow-hidden border border-[#2a2a3d] hover:border-[#ffd93d]/50 transition-all group cursor-pointer"
          >
            <img
              src={gen.imageUrl}
              alt={gen.prompt}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              loading="lazy"
            />

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#030305] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-2">
                <p className="text-[10px] text-white line-clamp-2 leading-tight mb-1">
                  {gen.prompt}
                </p>
                {gen.likes > 0 && (
                  <div className="flex items-center gap-1 text-[#ff4444]">
                    <Heart className="w-3 h-3 fill-current" />
                    <span className="text-[10px]">{gen.likes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Creator badge */}
            {gen.user?.username && (
              <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-[#030305]/80 text-[8px] text-[#a0a0b0]">
                @{gen.user.username}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-[#606070] mt-3 text-center">
        Get inspired by what others are creating
      </p>
    </div>
  );
}
