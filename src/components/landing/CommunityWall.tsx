"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wand2 } from "lucide-react";
import type { FeaturedGeneration } from "@/lib/featured-generations";
import { PixelThumb } from "@/components/media/PixelThumb";
import { HERO_PROMPT_EVENT } from "./HeroPrompt";
import { SectionHeader } from "./SectionHeader";

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
    <section id="explore" className="relative mx-auto w-full max-w-6xl scroll-mt-16 px-4 pb-16 pt-16 sm:px-5 sm:pb-20">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
        <SectionHeader
          title="Sprites people made here"
          intro="Tap one to copy its prompt into the box above, then change it to fit your game."
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button key={c} type="button" onClick={() => setActive(c)} aria-pressed={active === c}
              className={`h-10 rounded-[6px] border px-3.5 text-[13px] font-medium transition-colors ${
                active === c ? "border-[#FFA300] bg-[#FFA300] text-[#131A31]" : "border-white/[0.12] text-[#C8CCE8] hover:border-white/25 hover:text-white"
              }`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-white/[0.09] bg-white/[0.09] sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((item, idx) => {
          const pixel = item.styleId.includes("PIXEL");
          return (
            <button key={item.id} type="button" onClick={() => tryPrompt(item)}
              aria-label={`Use this prompt: ${item.prompt.slice(0, 120)}`}
              className={`checker group relative aspect-square overflow-hidden text-left outline-offset-[-2px] ${idx >= 8 ? "hidden sm:block" : ""}`}>
              <PixelThumb
                src={item.imageUrl}
                alt=""
                aria-hidden
                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 184px"
                pixel={pixel}
                width={184}
                height={184}
                className="absolute inset-0 h-full w-full object-contain p-[10%]"
              />
              <span aria-hidden="true" className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/40 to-transparent p-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="line-clamp-2 text-[12px] leading-snug text-white">{item.prompt}</span>
                <span className="mt-2 flex items-center justify-between gap-2">
                  <span className="truncate text-[11px] text-[#FFC857]">{item.style}</span>
                  <span className="flex shrink-0 items-center gap-1 rounded-[4px] bg-[#FFA300] px-2 py-1 text-[11px] font-semibold text-[#131A31]">
                    <Wand2 className="h-3 w-3" /> Use prompt
                  </span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <Link href="/community"
          className="inline-flex h-11 items-center rounded-[8px] border border-white/[0.14] px-5 text-[14px] font-medium text-[#FFF1E8] transition hover:bg-white/[0.06]">
          Browse the full community gallery
        </Link>
      </div>
    </section>
  );
}
