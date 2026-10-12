"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wand2 } from "lucide-react";
import type { FeaturedGeneration } from "@/lib/featured-generations";
import { HERO_PROMPT_EVENT } from "./HeroPrompt";
import { SectionHeader } from "./SectionHeader";

const CHECKER = {
  backgroundImage: "repeating-conic-gradient(#ffffff06 0% 25%, transparent 0% 50%)",
  backgroundSize: "14px 14px",
};

/**
 * Meshy-style "Explore" wall on the landing page: dense grid of sprites made
 * with SpriteLab, filterable by category. "Try this prompt" fills the hero
 * input so visitors can remix without an account.
 */
export function CommunityWall({ items }: { items: FeaturedGeneration[]; registerUrl?: string }) {
  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const i of items) counts.set(i.category, (counts.get(i.category) ?? 0) + 1);
    return ["All", ...[...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).map(([c]) => c)];
  }, [items]);
  const [active, setActive] = useState("All");
  // "All" is trimmed to full rows (2/3/4/6 columns all divide 12) so the
  // wall never ends on a ragged half-row.
  const visible = active === "All"
    ? items.slice(0, items.length >= 12 ? items.length - (items.length % 12) : items.length)
    : items.filter((i) => i.category === active);

  const tryPrompt = (item: FeaturedGeneration) => {
    window.dispatchEvent(
      new CustomEvent(HERO_PROMPT_EVENT, { detail: { prompt: item.prompt.slice(0, 200), pixel: item.styleId.includes("PIXEL") } })
    );
  };

  if (items.length === 0) return null;

  return (
    <section id="explore" className="relative mx-auto w-full max-w-[1200px] scroll-mt-16 px-5 pb-16 pt-16 sm:pb-20 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <SectionHeader
          align="left"
          eyebrow="explore"
          title="Made with SpriteLab"
          intro="Pick any sprite to reuse its prompt in the box above — no account needed."
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setActive(c)} aria-pressed={active === c}
              className={`h-10 rounded-full border px-4 font-mono text-[12px] transition-colors sm:h-9 ${
                active === c ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/12 text-white" : "border-white/[0.08] text-[#8B93A5] hover:border-white/20 hover:text-white"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((item, idx) => {
          const pixel = item.styleId.includes("PIXEL");
          return (
            <button key={item.id} type="button" onClick={() => tryPrompt(item)}
              aria-label={`Use this prompt: ${item.prompt.slice(0, 120)}`}
              className={`group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#12151C] text-left transition-colors hover:border-white/20 ${idx >= 8 ? "hidden sm:block" : ""}`} style={CHECKER}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.imageUrl} alt="" loading="lazy"
                className={`absolute inset-0 h-full w-full object-contain p-[10%] transition-transform duration-300 group-hover:scale-[1.06] ${pixel ? "pixel-perfect" : ""}`} />
              <span aria-hidden="true" className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="line-clamp-2 text-[12px] leading-snug text-white">{item.prompt}</span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate font-mono text-[10px] text-[#FFB27A]">{item.style}</span>
                  <span className="px-corners flex shrink-0 items-center gap-1 bg-white px-2 py-1 text-[11px] font-semibold text-black">
                    <Wand2 className="h-3 w-3" /> Try
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <Link href="/community"
          className="group inline-flex h-11 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] px-5 text-[14px] font-medium text-[#ECEEF3] transition hover:bg-white/[0.08]">
          Browse the community gallery <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
