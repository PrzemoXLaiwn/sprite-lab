"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb, Sparkles, Film, FolderOpen, Coins } from "lucide-react";
import type { GuideSection, GuideId } from "@/data/product-guide";
import { SectionHeader } from "./SectionHeader";

const ICONS: Record<GuideId, typeof Sparkles> = { generate: Sparkles, animate: Film, projects: FolderOpen, credits: Coins };

/**
 * Homepage "how it works" — one tab per part of the app, plain-language
 * steps, tips worth trying and the full price list. Content comes from
 * src/data/product-guide.ts (server) so costs always match billing.
 */
export function GuideTabs({ sections, prices }: { sections: GuideSection[]; prices: { item: string; cost: string; note?: string }[] }) {
  const [active, setActive] = useState<GuideId>(sections[0].id);
  const s = sections.find((x) => x.id === active) ?? sections[0];

  return (
    <section id="how-it-works" className="relative mx-auto w-full max-w-6xl scroll-mt-16 px-4 py-16 sm:px-5 sm:py-20">
      <SectionHeader
        title="How SpriteLab works"
        intro="What each part of the app does, what is worth trying, and what it costs in credits."
      />

      <div role="tablist" aria-label="Guide" className="mt-8 grid w-full max-w-xl grid-cols-4 gap-1 rounded-[10px] border border-white/[0.09] bg-[#19223F] p-1">
        {sections.map((x) => {
          const Icon = ICONS[x.id];
          const on = x.id === active;
          return (
            <button key={x.id} id={`guide-tab-${x.id}`} role="tab" aria-selected={on} aria-controls={`guide-${x.id}`} tabIndex={on ? 0 : -1} type="button" onClick={() => setActive(x.id)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                const i = sections.findIndex((y) => y.id === x.id);
                const next = sections[(i + (e.key === "ArrowRight" ? 1 : sections.length - 1)) % sections.length];
                setActive(next.id);
                document.getElementById(`guide-tab-${next.id}`)?.focus();
              }}
              className={`flex min-h-12 flex-col items-center justify-center gap-1 whitespace-nowrap rounded-[7px] px-1 py-2 text-[13px] font-medium transition-colors sm:flex-row sm:gap-1.5 sm:px-3 sm:py-2.5 ${
                on ? "bg-[#FFA300] text-[#131A31]" : "text-[#C8CCE8] hover:bg-white/[0.05] hover:text-white"
              }`}>
              <Icon className="h-4 w-4" aria-hidden="true" />{x.tab}
            </button>
          );
        })}
      </div>

      <div id={`guide-${s.id}`} role="tabpanel" aria-labelledby={`guide-tab-${s.id}`} className="mt-8 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <div className="rounded-[10px] border border-white/[0.09] bg-[#19223F] p-5 sm:p-8">
          <h3 className="text-balance font-display text-[22px] font-semibold leading-[1.15] text-white sm:text-[26px]">{s.title}</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[#9AA1CC]">{s.lead}</p>
          <ol className="mt-7 space-y-5">
            {s.steps.map((step, i) => (
              <li key={step.title} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#212B4E] font-display text-[15px] font-semibold text-[#FFC857]">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-white">{step.title}</p>
                  <p className="mt-0.5 text-[14px] leading-relaxed text-[#9AA1CC]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <Link href={s.href} className="px-corners mt-8 inline-flex h-11 items-center gap-2 bg-[#FFA300] px-5 text-[14px] font-semibold text-[#131A31] transition hover:bg-[#FFB733]">
            {s.cta} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="rounded-[10px] border border-white/[0.09] bg-[#19223F] p-5 sm:p-8">
          {s.id === "credits" ? (
            <>
              <p className="text-[14px] text-[#9AA1CC] font-semibold">{"Price list"}</p>
              <ul className="mt-4 divide-y divide-white/[0.05]">
                {prices.map((p) => (
                  <li key={p.item} className="flex items-baseline justify-between gap-4 py-2.5">
                    <span className="text-[13.5px] text-[#C8CCE8]">
                      {p.item}
                      {p.note && <span className="block text-[13px] text-[#8A92BF]">{p.note}</span>}
                    </span>
                    <span className={`shrink-0 font-mono text-[13px] ${p.cost === "free" ? "text-emerald-300" : "text-white"}`}>{p.cost}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="flex items-center gap-1.5 text-[14px] text-[#9AA1CC] font-semibold">
                <Lightbulb className="h-3.5 w-3.5 text-[#FFA300]" aria-hidden="true" /> worth trying
              </p>
              <ul className="mt-4 space-y-3.5">
                {s.tips.map((t) => (
                  <li key={t} className="flex gap-2.5 text-[14px] leading-relaxed text-[#C8CCE8]">
                    <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-[1px] bg-[#FFA300]" />{t}
                  </li>
                ))}
              </ul>
            </>
          )}
          <Link href={`/how-it-works#${s.id}`} className="group mt-6 inline-flex min-h-10 items-center gap-1.5 text-[13px] text-[#A7ADD4] transition hover:text-white">
            Read the full guide <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
