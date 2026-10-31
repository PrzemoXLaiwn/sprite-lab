"use client";

// Small shared pieces for the ST Packs studio: status chips, formatters and
// the status → chip mapping used by both the job header and the tiles.

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { StJobStatus } from "@/config/st-packs";
import type { ExpressionSnapshot } from "@/lib/st-packs/types";

// ── Formatters ───────────────────────────────────────────────────────────────

export const formatUsd = (n: number): string => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

/** `8130` → "8.1s", `72500` → "1m 13s". */
export function formatMs(ms: number | undefined | null): string {
  if (!ms || ms <= 0) return "0s";
  const s = ms / 1000;
  if (s < 60) return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${Math.round(s - m * 60)}s`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const labelTitle = (label: string): string => label.charAt(0).toUpperCase() + label.slice(1);

export const SIZE_LABEL = (w: number, h: number) => `${w}×${h}`;

/** Wall-clock "now", refreshed every second while `active`. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!active) return;
    const first = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);
  return now;
}

// ── Status chips ─────────────────────────────────────────────────────────────

export type ChipTone = "neutral" | "running" | "ok" | "warn" | "bad";

const TONE_CLS: Record<ChipTone, string> = {
  neutral: "border-white/[0.1] bg-white/[0.04] text-[#A7ADD4]",
  running: "border-[#FFA300]/30 bg-[#FFA300]/10 text-[#FFC857]",
  ok: "border-[#00E436]/30 bg-[#00E436]/10 text-[#8CF5A6]",
  warn: "border-amber-400/30 bg-amber-400/10 text-amber-200",
  bad: "border-red-400/30 bg-red-400/10 text-red-200",
};

export function StatusChip({ tone, children, title }: { tone: ChipTone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title}
      className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[10.5px] font-semibold leading-4 ${TONE_CLS[tone]}`}>
      {tone === "running" && <Loader2 className="h-3 w-3 animate-spin" aria-hidden />}
      {children}
    </span>
  );
}

export function jobStage(status: StJobStatus): { label: string; tone: ChipTone } {
  switch (status) {
    case "running": return { label: "running", tone: "running" };
    case "done": return { label: "done", tone: "ok" };
    case "partial": return { label: "partial", tone: "warn" };
    case "failed": return { label: "failed", tone: "bad" };
    case "cancelled": return { label: "cancelled", tone: "neutral" };
    case "base_ready": return { label: "base ready", tone: "neutral" };
    default: return { label: "draft", tone: "neutral" };
  }
}

export function expressionStage(e: Pick<ExpressionSnapshot, "status" | "flagged">): { label: string; tone: ChipTone } {
  switch (e.status) {
    case "failed": return { label: "failed", tone: "bad" };
    case "done": return e.flagged ? { label: "flagged", tone: "warn" } : { label: "done", tone: "ok" };
    case "queued": return { label: "queued", tone: "neutral" };
    case "editing": return { label: "editing", tone: "running" };
    case "edited":
    case "video_submitted":
    case "video_ready": return { label: "video", tone: "running" };
    case "processing": return { label: "processing", tone: "running" };
    default: return { label: e.status, tone: "neutral" };
  }
}

export const isExpressionBusy = (status: ExpressionSnapshot["status"]) => status !== "done" && status !== "failed";

/** Native select / input inside an `sl-inset` slot. */
export const FIELD_CLS =
  "w-full min-h-10 bg-transparent px-3 py-2 text-[13px] text-[#FFF1E8] placeholder:text-[#6F77A6] outline-none disabled:cursor-not-allowed disabled:opacity-50";

/** Chevron for native selects (inline style: a data URI with spaces can't live in a class name). */
const CHEVRON_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A7ADD4' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'><path d='m6 9 6 6 6-6'/></svg>\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.75rem center",
  backgroundSize: "12px 12px",
};

export function SelectSlot({ id, value, onChange, disabled, ariaLabel, children }: {
  id?: string; value: string; onChange: (v: string) => void; disabled?: boolean; ariaLabel?: string; children: React.ReactNode;
}) {
  return (
    <div className="sl-inset">
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-label={ariaLabel}
        style={CHEVRON_STYLE} className={`${FIELD_CLS} appearance-none pr-8`}>
        {children}
      </select>
    </div>
  );
}

export function CheckRow({ checked, onChange, disabled, children, title }: {
  checked: boolean; onChange?: (v: boolean) => void; disabled?: boolean; children: React.ReactNode; title?: string;
}) {
  return (
    <label title={title}
      className={`flex min-h-10 items-center gap-2.5 rounded-lg px-2 text-[12.5px] text-[#C8CCE8] ${disabled ? "opacity-60" : "cursor-pointer hover:bg-white/[0.04]"}`}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded accent-[#FFA300]" />
      <span className="min-w-0">{children}</span>
    </label>
  );
}
