"use client";

/**
 * The recipe: what you're making, as one readable line of slots
 * ("Pixel 16-bit · Hero · front view · A-pose · Standard") above the
 * description box. Each slot opens its own picker — the settings live where
 * they are read, not in a long form. Pickers open below the bar on desktop
 * and as a bottom sheet on phones.
 */

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Dices, Loader2, Sparkles, X } from "lucide-react";
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
  /** "panel": stacked for the Create page's left column (pickers open beside it on desktop). */
  layout?: "bar" | "panel";
}

function Slot({ id, label, value, open, auto, onOpen, wide }: { id: SlotId; label: string; value: string; open: boolean; auto: boolean; onOpen: (id: SlotId) => void; wide?: boolean }) {
  // Looks like a dropdown on purpose: label on top, value + chevron below
  return (
    <button type="button" onClick={() => onOpen(id)} aria-haspopup="dialog" aria-expanded={open} title={`Change ${label.toLowerCase()}`}
      className={`sl-select group relative flex min-h-[52px] items-center justify-between gap-3 px-3 py-1.5 text-left ${wide ? "w-full min-w-0" : "min-w-[112px]"}`}>
      <span className="flex flex-col leading-tight">
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#A7ADD4]">
          {label}
          {auto && <span className="h-1.5 w-1.5 rounded-full bg-[#00E436]" title="Set from your description" aria-label="set automatically" />}
        </span>
        <span className="truncate text-[14px] font-semibold text-[#FFF1E8]">{value}</span>
      </span>
      <ChevronDown className={`h-4 w-4 shrink-0 text-[#FFC857] transition-transform ${open ? "rotate-180" : "group-hover:translate-y-0.5"}`} aria-hidden />
    </button>
  );
}

function OptionList({ options, value, onPick }: { options: readonly Option[]; value: string; onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onPick(o.id)} aria-pressed={o.id === value}
          className="btn btn-secondary min-h-12 flex-col !items-start !justify-center !gap-0.5 px-3 py-2 text-left font-normal !whitespace-normal !leading-tight">
          <span className="text-[13.5px] font-semibold text-[#FFF1E8]">{o.label}</span>
          {o.desc && <span className="text-[12px] text-[#A7ADD4]">{o.desc}</span>}
        </button>
      ))}
    </div>
  );
}

export function RecipeBar(p: RecipeBarProps) {
  const panel = p.layout === "panel";
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
      className={`fixed inset-x-0 bottom-0 z-40 max-h-[70dvh] overflow-y-auto rounded-t-[16px] border-t border-[rgba(124,140,214,0.22)] bg-[linear-gradient(180deg,#1E2849,#192241)] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] lg:absolute lg:bottom-auto lg:max-h-[70vh] lg:rounded-[12px] lg:border ${
        panel ? "lg:fixed lg:inset-x-auto lg:left-[456px] lg:top-[76px] lg:w-[min(680px,calc(100vw-480px))]" : "lg:inset-x-0 lg:top-full lg:mt-2"}`}>
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
    <div ref={boxRef} className="sl-panel relative p-3 sm:p-4">
      {picker}
      <div className={`flex flex-col gap-3 ${panel ? "" : "lg:flex-row lg:items-stretch"}`}>
        <div className="sl-inset min-w-0 flex-1">
          <label htmlFor="generate-prompt" className="sr-only">Describe your sprite</label>
          <textarea id="generate-prompt" value={p.prompt} onChange={(e) => p.onPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); p.onSubmit(); } }}
            placeholder={p.placeholder} maxLength={500} rows={panel ? 3 : 2}
            className="block w-full resize-none bg-transparent px-3.5 pt-3 text-[15px] leading-relaxed text-[#FFF1E8] outline-none placeholder:text-[#8F96C4] focus-visible:outline-none" />
          <div className="flex items-center justify-between gap-2 px-1.5 pb-1.5">
            <button type="button" onClick={p.onSurprise} title="Fill in a random idea for this asset type"
              className="btn btn-ghost px-2.5 text-[12.5px]">
              <Dices className="h-4 w-4" aria-hidden /> Surprise me
            </button>
            <div className="flex items-center gap-1">
              {p.tools}
              <span className="pr-2 font-mono text-[12px] text-[#8A92BF]" aria-hidden>{p.prompt.length}/500</span>
            </div>
          </div>
        </div>
        <button type="button" onClick={p.onSubmit} disabled={!p.canSubmit || p.generating}
          className={`btn btn-primary h-14 shrink-0 gap-2 px-6 text-[15px] ${panel ? "w-full" : "lg:h-auto lg:min-h-[88px] lg:w-[180px] lg:flex-col lg:gap-1"}`}>
          {p.generating ? <><Loader2 className="h-5 w-5 animate-spin" aria-hidden /> <span>{p.loadingLabel}</span></>
            : <><Sparkles className="h-5 w-5" aria-hidden /> <span>Create sprite</span><span className={`text-[12.5px] font-medium opacity-80 ${panel ? "" : "lg:block"}`}>{p.costLabel}</span></>}
        </button>
      </div>
      <div className={panel ? "mt-3 grid grid-cols-2 gap-1.5" : "mt-3 flex flex-wrap items-center gap-1.5"} role="group" aria-label="Recipe">
        <Slot id="style" label="Style" value={style?.name ?? p.styleId} open={open === "style"} auto={p.isAuto("style")} onOpen={toggle} wide={panel} />
        <Slot id="type" label="Type" value={sub.label} open={open === "type"} auto={p.isAuto("type")} onOpen={toggle} wide={panel} />
        {p.views && <Slot id="view" label="View" value={viewLabel} open={open === "view"} auto={p.isAuto("view")} onOpen={toggle} wide={panel} />}
        {p.poses && <Slot id="pose" label="Pose" value={poseLabel} open={open === "pose"} auto={p.isAuto("pose")} onOpen={toggle} wide={panel} />}
        {!p.quality.disabled && <Slot id="quality" label="Quality" value={qualityLabel} open={open === "quality"} auto={false} onOpen={toggle} wide={panel} />}
      </div>

      {p.extras}
    </div>
  );
}
