"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import type { FeaturedGeneration } from "@/lib/featured-generations";
import { HERO_PROMPT_EVENT } from "./HeroPrompt";

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

/**
 * Meshy-style "Explore" wall on the landing page: dense grid of sprites made
 * with SpriteLab, filterable by category. "Try this prompt" fills the hero
 * input so visitors can remix without an account.
 */
export function CommunityWall({ items, registerUrl }: { items: FeaturedGeneration[]; registerUrl: string }) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    return ["All", ...[...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([c]) => c)];
  }, [items]);
  const [active, setActive] = useState("All");
  const visible = active === "All" ? items : items.filter((i) => i.category === active);

  const tryPrompt = (item: FeaturedGeneration) => {
    window.dispatchEvent(
      new CustomEvent(HERO_PROMPT_EVENT, { detail: { prompt: item.prompt.slice(0, 200), pixel: item.styleId.includes("PIXEL") } })
    );
  };

  if (items.length === 0) return null;

  return (
    <section id="explore" className="relative mx-auto w-full max-w-[1400px] px-5 py-16 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{"// explore"}</p>
          <h2 className="mt-1 font-display text-[28px] font-semibold text-white sm:text-[34px]">Made with SpriteLab</h2>
          <p className="mt-1 text-[14px] text-[#8B93A5]">Hover any sprite to reuse its prompt — no account needed.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setActive(c)}
              className={`rounded-full border px-3 py-1.5 font-mono text-[12px] transition-colors ${
                active === c ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/12 text-white" : "border-white/[0.08] text-[#8B93A5] hover:border-white/20 hover:text-white"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {visible.map((item) => {
          const pixel = item.styleId.includes("PIXEL");
          return (
            <div key={item.id} className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12151C] transition-colors hover:border-white/20" style={CHECKER}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt={item.prompt.slice(0, 80)} loading="lazy"
                className={`absolute inset-0 h-full w-full object-contain p-[10%] transition-transform duration-300 group-hover:scale-[1.06] ${pixel ? "pixel-perfect" : ""}`} />
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <p className="line-clamp-2 text-[12px] leading-snug text-white">{item.prompt}</p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[#FFB27A]">{item.style}</span>
                  <button type="button" onClick={() => tryPrompt(item)}
                    className="px-corners flex items-center gap-1 bg-white px-2 py-1 text-[11px] font-semibold text-black">
                    <Wand2 className="h-3 w-3" /> Try
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Link href={registerUrl}
          className="rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 py-2.5 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08]">
          Sign up to explore the full community gallery →
        </Link>
      </div>
    </section>
  );
}
