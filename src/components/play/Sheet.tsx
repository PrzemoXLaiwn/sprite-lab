"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import type { DungeonSprite } from "@/lib/dungeon/store";
import { ELEMENT_DEFS, MAX_STARS, type Element } from "@/lib/dungeon/config";
import { Star } from "lucide-react";

/** Bottom sheet on phones, centred dialog from sm up. Esc and the backdrop close it. */
export function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0B1022]/75 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title}
        className={`flex max-h-[88vh] w-full flex-col rounded-t-[12px] border border-white/[0.1] bg-[#19223F] shadow-[0_-8px_0_0_rgba(0,0,0,0.25)] sm:rounded-[12px] ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-2.5">
          <h2 className="min-w-0 truncate font-display text-[18px] font-semibold text-[#FFF1E8]">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] text-[#C8CCE8] hover:bg-white/[0.06]">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  );
}

export function SpriteImg({ s, className }: { s: Pick<DungeonSprite, "imageUrl" | "name" | "pixel">; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- user sprites from storage, pixel styles stay nearest-neighbour
    <img src={s.imageUrl} alt={s.name} loading="lazy" draggable={false}
      className={`h-full w-full object-contain ${className ?? ""}`}
      style={s.pixel ? { imageRendering: "pixelated" } : undefined} />
  );
}

export function Stars({ n, size = 12 }: { n: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-[2px]" aria-label={`${n} of ${MAX_STARS} stars`}>
      {Array.from({ length: MAX_STARS }, (_, i) => (
        <Star key={i} aria-hidden style={{ width: size, height: size }} className={i < n ? "fill-[#FFA300] text-[#FFA300]" : "fill-transparent text-[#4A537B]"} />
      ))}
    </span>
  );
}

export function ElementTag({ e, small }: { e: Element; small?: boolean }) {
  const d = ELEMENT_DEFS[e];
  return (
    <span className={`inline-flex items-center gap-1 ${small ? "text-[11.5px]" : "text-[12.5px]"} text-[#C8CCE8]`}>
      <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: d.color }} aria-hidden />
      {d.label}
    </span>
  );
}
