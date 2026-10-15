"use client";

/**
 * The recipe: what you're making, as one readable line of slots
 * ("Pixel 16-bit · Hero · front view · A-pose · Standard") above the
 * description box. Each slot opens its own picker — the settings live where
 * they are read, not in a long form. Pickers open above the bar on desktop
 * and as a bottom sheet on phones.
 */

import { useEffect, useRef, useState } from "react";
import { Check, Dices, Loader2, Sparkles, X } from "lucide-react";
import type { GenerateCategory } from "@/data/generate-categories";
import type { GenerateStyle } from "@/data/generate-styles";

export type SlotId = "style" | "type" | "view" | "pose" | "quality";

interface Option { id: string; label: string; desc?: string }

export interface RecipeBarProps {
  prompt: string;
  onPrompt: (v: string) => void;
  placeholder: string;
  onSubmit: () => void;
  onSurprise: () => void;
  generating: boolean;
  canSubmit: boolean;
  cost: number;
  costLabel: string;
  loadingLabel: React.ReactNode;
  styles: GenerateStyle[];
  styleId: string;
  onStyle: (id: string) => void;
  isPixel: (id: string) => boolean;
  categories: GenerateCategory[];
  categoryId: string;
  onCategory: (c: GenerateCategory) => void;
  subcategoryId: string;
  onSubcategory: (id: string) => void;
  views?: { options: readonly Option[]; value: string; onChange: (id: string) => void };
  poses?: { options: readonly Option[]; value: string; onChange: (id: string) => void };
  quality: { options: readonly Option[]; value: string; onChange: (id: string) => void; credits: Record<string, number>; disabled?: boolean };
  /** Marks a slot the prompt set automatically. */
  isAuto: (slot: SlotId) => boolean;
  /** Under the description: auto-settings note, style reference, hints. */
  extras?: React.ReactNode;
  /** Small links on the right of the tool row (More options…). */
  tools?: React.ReactNode;
}

function Slot({ id, label, value, open, auto, onOpen }: { id: SlotId; label: string; value: string; open: boolean; auto: boolean; onOpen: (id: SlotId) => void }) {
  return (
    <button type="button" onClick={() => onOpen(id)} aria-haspopup="dialog" aria-expanded={open}
      className={`group inline-flex min-h-10 items-center gap-1.5 rounded-[7px] border px-2.5 text-left transition-colors ${
        open ? "border-[#FFA300] bg-[#FFA300]/[0.12]" : "border-white/[0.12] bg-[#212B4E] hover:border-white/30"
      }`}>
      <span className="text-[11.5px] text-[#A7ADD4]">{label}</span>
      <span className="text-[13.5px] font-semibold text-[#FFF1E8]">{value}</span>
      {auto && <span className="h-1.5 w-1.5 rounded-full bg-[#00E436]" title="Set from your description" aria-label="set automatically" />}
    </button>
  );
}

function OptionList({ options, value, onPick }: { options: readonly Option[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onPick(o.id)} aria-pressed={o.id === value}
          className={`flex min-h-12 flex-col items-start justify-center rounded-[8px] border px-3 py-2 text-left transition-colors ${
            o.id === value ? "border-[#FFA300] bg-[#FFA300]/[0.1]" : "border-white/[0.1] hover:border-white/30"
          }`}>
          <span className="text-[13.5px] font-semibold text-[#FFF1E8]">{o.label}</span>
          {o.desc && <span className="text-[12px] text-[#A7ADD4]">{o.desc}</span>}
        </button>
      ))}
    </div>
  );
}

export function RecipeBar(p: RecipeBarProps) {
  const [open, setOpen] = useState<SlotId | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const toggle = (id: SlotId) => setOpen((o) => (o === id ? null : id));

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!boxRef.current?.contains(e.target as Node)) setOpen(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const style = p.styles.find((s) => s.id === p.styleId);
  const category = p.categories.find((c) => c.id === p.categoryId) ?? p.categories[0];
  const sub = category.subcategories.find((s) => s.subcategoryId === p.subcategoryId) ?? category.subcategories[0];
  const viewLabel = p.views?.options.find((o) => o.id === p.views!.value)?.label ?? "";
  const poseLabel = p.poses?.options.find((o) => o.id === p.poses!.value)?.label ?? "";
  const qualityLabel = p.quality.options.find((o) => o.id === p.quality.value)?.label ?? "";
  const pick = (fn: (id: string) => void) => (id: string) => { fn(id); setOpen(null); };

  const picker = open && (
    <div role="dialog" aria-label={`Choose ${open}`}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto rounded-t-[16px] border-t border-white/[0.1] bg-[#1B2446] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] lg:absolute lg:inset-x-0 lg:bottom-full lg:mb-2 lg:max-h-[60vh] lg:rounded-[12px] lg:border">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-display text-[16px] font-semibold capitalize text-[#FFF1E8]">{open === "type" ? "Asset type" : open}</p>
        <button type="button" onClick={() => setOpen(null)} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-[8px] text-[#C8CCE8] hover:bg-white/[0.06]">
          <X className="h-4 w-4" />
        </button>
      </div>
      {open === "style" && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {p.styles.map((s) => {
            const active = s.id === p.styleId;
            return (
              <button key={s.id} type="button" onClick={() => pick(p.onStyle)(s.id)} aria-pressed={active} title={s.description}
                className={`group relative flex flex-col overflow-hidden rounded-[8px] border text-left transition-colors ${active ? "border-[#FFA300]" : "border-white/[0.1] hover:border-white/30"}`}>
                <span className="checker checker-sm relative block aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/styles/${s.id.toLowerCase()}.png`} alt="" loading="lazy" className={`absolute inset-0 h-full w-full object-contain p-1.5 ${p.isPixel(s.id) ? "pixel-perfect" : ""}`} />
                  {active && <span className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#FFA300]"><Check className="h-3 w-3 text-[#131A31]" strokeWidth={3} /></span>}
                </span>
                <span className="px-2 py-1.5">
                  <span className="block text-[12.5px] font-semibold leading-tight text-[#FFF1E8]">{s.name}</span>
                  <span className="block text-[11.5px] leading-tight text-[#A7ADD4]">{s.description}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open === "type" && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {p.categories.map((c) => {
              const Icon = c.icon;
              const active = c.id === p.categoryId;
              return (
                <button key={c.id} type="button" onClick={() => p.onCategory(c)} aria-pressed={active}
                  className={`flex min-h-10 items-center gap-1.5 rounded-[7px] border px-3 text-[13px] font-medium transition-colors ${active ? "border-[#FFA300] bg-[#FFA300]/[0.12] text-[#FFF1E8]" : "border-white/[0.1] text-[#C8CCE8] hover:border-white/30"}`}>
                  <Icon className="h-4 w-4" aria-hidden /> {c.label}
                </button>
              );
            })}
          </div>
          <OptionList options={category.subcategories.map((s) => ({ id: s.subcategoryId, label: s.label }))} value={p.subcategoryId} onPick={pick(p.onSubcategory)} />
        </div>
      )}
      {open === "view" && p.views && <OptionList options={p.views.options} value={p.views.value} onPick={pick(p.views.onChange)} />}
      {open === "pose" && p.poses && <OptionList options={p.poses.options} value={p.poses.value} onPick={pick(p.poses.onChange)} />}
      {open === "quality" && (
        <OptionList options={p.quality.options.map((o) => ({ ...o, label: `${o.label} · ${p.quality.credits[o.id]} cr` }))} value={p.quality.value} onPick={pick(p.quality.onChange)} />
      )}
    </div>
  );

  return (
    <div ref={boxRef} className="relative rounded-[12px] border border-white/[0.1] bg-[#19223F] p-3 sm:p-4">
      {picker}
      <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Recipe">
        <Slot id="style" label="Style" value={style?.name ?? p.styleId} open={open === "style"} auto={p.isAuto("style")} onOpen={toggle} />
        <Slot id="type" label="Type" value={sub.label} open={open === "type"} auto={p.isAuto("type")} onOpen={toggle} />
        {p.views && <Slot id="view" label="View" value={viewLabel} open={open === "view"} auto={p.isAuto("view")} onOpen={toggle} />}
        {p.poses && <Slot id="pose" label="Pose" value={poseLabel} open={open === "pose"} auto={p.isAuto("pose")} onOpen={toggle} />}
        {!p.quality.disabled && <Slot id="quality" label="Quality" value={qualityLabel} open={open === "quality"} auto={false} onOpen={toggle} />}
      </div>

      <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="min-w-0 flex-1 rounded-[10px] border border-white/[0.1] bg-[#131A31] transition-colors focus-within:border-[#FFA300]">
          <label htmlFor="generate-prompt" className="sr-only">Describe your sprite</label>
          <textarea id="generate-prompt" value={p.prompt} onChange={(e) => p.onPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.onSubmit(); } }}
            placeholder={p.placeholder} maxLength={500} rows={2}
            className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[15px] leading-relaxed text-[#FFF1E8] outline-none placeholder:text-[#8A92BF]" />
          <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
            <button type="button" onClick={p.onSurprise} title="Fill in a random idea for this asset type"
              className="flex min-h-10 items-center gap-1.5 rounded-[7px] px-2.5 text-[12.5px] font-medium text-[#A7ADD4] transition-colors hover:bg-white/[0.05] hover:text-white">
              <Dices className="h-4 w-4" aria-hidden /> Surprise me
            </button>
            <div className="flex items-center gap-1">
              {p.tools}
              <span className="pr-2 font-mono text-[12px] text-[#8A92BF]" aria-hidden>{p.prompt.length}/500</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={p.onSubmit} disabled={!p.canSubmit || p.generating}
          className="px-corners flex h-14 shrink-0 items-center justify-center gap-2 bg-[#FFA300] px-6 text-[15px] font-semibold text-[#131A31] transition hover:bg-[#FFB733] disabled:cursor-not-allowed disabled:opacity-50 lg:h-[88px] lg:w-[180px] lg:flex-col lg:gap-1">
          {p.generating ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span>{p.loadingLabel}</span></>
            : <><Sparkles className="h-5 w-5" aria-hidden /> <span>Create sprite</span><span className="text-[12.5px] font-medium opacity-80 lg:block">{p.costLabel}</span></>}
        </button>
      </div>
      {p.extras}
    </div>
  );
}
