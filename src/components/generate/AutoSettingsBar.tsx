"use client";

import { X } from "lucide-react";
import { GENERATE_CATEGORIES } from "@/data/generate-categories";
import { GENERATE_STYLES } from "@/data/generate-styles";
import type { AutoChange, AutoControl, AutoValues } from "@/hooks/useAutoSettings";

type Option = { readonly id: string; readonly label: string };

export interface AutoSettingsLabels {
  view: readonly Option[];
  palette: readonly Option[];
  pose: readonly Option[];
}

function describe(control: AutoControl, v: Partial<AutoValues>, labels: AutoSettingsLabels): string {
  switch (control) {
    case "type": {
      const group = GENERATE_CATEGORIES.find((c) => c.id === v.groupId);
      const sub = group?.subcategories.find((s) => s.subcategoryId === v.subcategoryId);
      return [group?.label, sub?.label].filter(Boolean).join(" · ") || "Asset type";
    }
    case "style":
      return GENERATE_STYLES.find((s) => s.id === v.styleId)?.name ?? v.styleId ?? "Style";
    case "view": {
      const label = labels.view.find((o) => o.id === v.view)?.label ?? v.view ?? "";
      return v.view === "none" ? "Default view" : label;
    }
    case "palette":
      return v.palette === "auto" ? "Auto palette" : `${labels.palette.find((o) => o.id === v.palette)?.label ?? v.palette} palette`;
    case "pose":
      return v.pose === "auto" ? "Auto pose" : `${labels.pose.find((o) => o.id === v.pose)?.label ?? v.pose} pose`;
  }
}

/**
 * One fixed-height line under the prompt: the Auto switch and what it picked.
 * Chips scroll sideways instead of wrapping, so the panel never jumps.
 */
export function AutoSettingsBar({ enabled, onToggle, changes, onUndo, labels }: {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  changes: AutoChange[];
  onUndo: (control: AutoControl) => void;
  labels: AutoSettingsLabels;
}) {
  return (
    <div className="mt-1.5 flex min-h-10 items-center gap-1">
      <button type="button" role="switch" aria-checked={enabled} onClick={() => onToggle(!enabled)}
        title={enabled
          ? "Auto-settings on: asset type, style and view follow your prompt. Anything you pick by hand stays as you set it."
          : "Auto-settings off: settings only change when you pick them. Turning it on lets the prompt set them again."}
        className="-ml-1 flex min-h-10 shrink-0 items-center gap-1.5 rounded-lg px-1.5 text-[#A7ADD4] transition-colors hover:text-white">
        <span aria-hidden className={`relative h-5 w-9 rounded-full border transition-colors ${enabled ? "border-[#FFC85E]/60 bg-[linear-gradient(180deg,#FFBE45,#F28E00)] shadow-[0_0_12px_-3px_rgba(255,163,0,0.7)]" : "border-[rgba(124,140,214,0.25)] bg-[#111831] shadow-[inset_0_2px_4px_rgba(4,7,20,0.5)]"}`}>
          <span className={`absolute top-[2px] h-3.5 w-3.5 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.4)] transition-[left] duration-150 ${enabled ? "left-[18px]" : "left-[2px]"}`} />
        </span>
        <span className="text-[12.5px] font-semibold">Auto</span>
      </button>

      <div aria-live="polite" className="min-w-0 flex-1 overflow-x-auto pr-3 [mask-image:linear-gradient(to_right,#000_calc(100%-16px),transparent)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {!enabled ? (
          <p className="truncate text-[11.5px] text-[#8A92BF]">Off — settings change only when you pick them.</p>
        ) : changes.length === 0 ? (
          <p className="truncate text-[11.5px] text-[#8A92BF]">Type, style and view follow your prompt.</p>
        ) : (
          <div className="flex w-max items-center gap-1">
            <span className="sr-only">Detected:</span>
            {changes.map((ch) => {
              const label = describe(ch.control, ch.value, labels);
              const prev = describe(ch.control, ch.prev, labels);
              return (
                <button key={ch.control} type="button" onClick={() => onUndo(ch.control)}
                  title={`${ch.reason ? `From “${ch.reason}”. ` : ""}Click to undo (back to ${prev}).`}
                  aria-label={`Undo ${label}, back to ${prev}`}
                  className="group flex min-h-10 items-center lg:min-h-8">
                  <span className="auto-chip flex h-7 items-center gap-1 rounded-full border border-[#FFA300]/35 bg-[#FFA300]/[0.08] pl-2.5 pr-1.5 text-[11.5px] font-medium text-[#FFF1E8] transition-colors group-hover:border-[#FFA300]/70 group-hover:bg-[#FFA300]/[0.14]">
                    {label}
                    <X className="h-3 w-3 text-[#FFC857] opacity-70 group-hover:opacity-100" aria-hidden />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/** Small "auto" tag next to a field label while the value was set from the prompt. */
export function AutoBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="auto-chip ml-1.5 inline-flex h-4 items-center rounded bg-[#FFA300]/15 px-1 align-middle font-mono text-[9.5px] normal-case tracking-normal text-[#FFC857]"
      title="Set from your prompt">
      auto
    </span>
  );
}

/** Class for a control that auto-settings just changed (glow, or a static ring with reduced motion). */
export const autoFlash = (on: boolean) => (on ? " auto-flash" : "");
