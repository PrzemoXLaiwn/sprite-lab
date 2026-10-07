"use client";

/**
 * Shared chrome for the single-image tool pages (Remove BG, Upscale,
 * Variations, Edit). Visual siblings of GenerateWorkspace: a 380px control
 * panel on the left, a rounded canvas in the centre with a backdrop toggle
 * and an action bar underneath.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, ImageIcon, Loader2, MoveHorizontal } from "lucide-react";

// =============================================================================
// HELPERS
// =============================================================================

/** Minimal shape of a generation as returned by /api/generations. */
export interface ToolGeneration {
  id?: string;
  imageUrl?: string;
  prompt?: string;
  categoryId?: string;
  subcategoryId?: string;
  styleId?: string;
  [key: string]: unknown;
}

export const isPixelStyleId = (styleId?: string | null) =>
  !!styleId && styleId.toUpperCase().includes("PIXEL");

/** Seconds elapsed while `active` is true (0 otherwise). */
export function useElapsedSeconds(active: boolean) {
  const [tick, setTick] = useState<{ start: number; now: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const first = setTimeout(() => setTick({ start, now: start }), 0);
    const id = setInterval(() => setTick({ start, now: Date.now() }), 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);
  return active && tick ? Math.floor((tick.now - tick.start) / 1000) : 0;
}

// =============================================================================
// BACKDROPS
// =============================================================================

export const TOOL_BG_MODES = [
  { id: "checker", label: "Transparent", style: { backgroundColor: "#151922", backgroundImage: "repeating-conic-gradient(#ffffff0d 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" } },
  { id: "dark",    label: "Dark",        style: { background: "#111318" } },
  { id: "light",   label: "Light",       style: { background: "#f3f4f6" } },
  { id: "game",    label: "Game",        style: { background: "#1C2230", backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "32px 32px" } },
] as const;

export type ToolBgModeId = (typeof TOOL_BG_MODES)[number]["id"];

export function BackdropToggle({ value, onChange }: { value: ToolBgModeId; onChange: (id: ToolBgModeId) => void }) {
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.04] p-1">
      {TOOL_BG_MODES.map((mode) => (
        <button key={mode.id} type="button" onClick={() => onChange(mode.id)} title={`${mode.label} backdrop`} aria-label={`${mode.label} backdrop`}
          className={`h-7 w-7 rounded-lg border-2 transition-all ${value === mode.id ? "border-[#FF8A3D]" : "border-transparent hover:border-white/30"}`}
          style={{ ...(mode.style as React.CSSProperties), backgroundSize: "8px 8px" }} />
      ))}
    </div>
  );
}

export const bgStyle = (id: ToolBgModeId) =>
  (TOOL_BG_MODES.find((b) => b.id === id) ?? TOOL_BG_MODES[0]).style as React.CSSProperties;

// =============================================================================
// LAYOUT
// =============================================================================

export function ToolShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0D12] text-[#ECEEF3] lg:h-screen lg:flex-row lg:overflow-hidden">
      {children}
    </div>
  );
}

const TABS = [
  { id: "generate",  label: "Create",    href: "/generate" },
  { id: "animate",   label: "Animate",   href: "/animate" },
  { id: "remove-bg", label: "Remove BG", href: "/remove-bg" },
  { id: "upscale",   label: "Upscale",   href: "/upscale" },
] as const;

export type ToolTabId = (typeof TABS)[number]["id"];

/** Segmented tab row shared with the Generate workspace. */
export function ToolTabs({ active, generationId }: { active: ToolTabId; generationId?: string | null }) {
  return (
    <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1 text-[11.5px] font-medium">
      {TABS.map((t) =>
        t.id === active ? (
          <span key={t.id} className="rounded-lg bg-white/[0.1] px-2 py-1.5 text-center text-white shadow-sm">{t.label}</span>
        ) : (
          <Link key={t.id}
            href={generationId && t.id !== "generate" ? `${t.href}?id=${encodeURIComponent(generationId)}` : t.href}
            className="rounded-lg px-2 py-1.5 text-center text-[#8B93A5] transition-colors hover:text-white">
            {t.label}
          </Link>
        )
      )}
    </div>
  );
}

export function ToolPanel({ title, cost, tabs, backHref, children, footer }: {
  title: string;
  cost: number;
  tabs?: React.ReactNode;
  backHref?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <section className="flex w-full shrink-0 flex-col bg-[#0E1016] lg:w-[380px] lg:border-r lg:border-white/[0.06]">
      <div className="px-5 pb-3 pt-5">
        {backHref && (
          <Link href={backHref} className="mb-3 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#8B93A5] transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Assets
          </Link>
        )}
        <div className="flex items-center justify-between">
          <h1 className="font-display text-[18px] font-semibold text-white">{title}</h1>
          <span className="rounded-full border border-[#FF8A3D]/25 bg-[#FF8A3D]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#FFB27A]">
            {cost === 0 ? "free" : `${cost} credit${cost === 1 ? "" : "s"}`}
          </span>
        </div>
        {tabs}
      </div>
      <div className="flex-1 space-y-6 px-5 pb-6 pt-2 lg:min-h-0 lg:overflow-y-auto">{children}</div>
      <div className="border-t border-white/[0.06] bg-[#0E1016] p-4">{footer}</div>
    </section>
  );
}

export function Field({ label, action, hint, children }: { label: string; action?: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{label}</p>
        {action}
      </div>
      {children}
      {hint && <p className="mt-2 text-[11px] leading-snug text-[#8B93A5]">{hint}</p>}
    </div>
  );
}

/** Centre column: top bar + canvas + optional action bar. */
export function CanvasColumn({ topLeft, topRight, children, actions, below }: {
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  below?: React.ReactNode;
}) {
  return (
    <section className="relative flex flex-1 flex-col lg:min-h-0">
      <div className="flex min-h-[52px] items-center justify-between gap-3 px-5 py-3 lg:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">{topLeft}</div>
        {topRight}
      </div>
      <div className="flex flex-1 items-center justify-center px-5 pb-4 lg:min-h-0 lg:px-6">{children}</div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 px-5 pb-3">{actions}</div>}
      {below}
    </section>
  );
}

export function CanvasFrame({ bg, children, className }: { bg: ToolBgModeId; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-square w-full max-w-[min(68vh,680px)] overflow-hidden rounded-3xl border border-white/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] ${className ?? ""}`}
      style={bgStyle(bg)}>
      {children}
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[#C9CFDB]">{children}</span>;
}

// =============================================================================
// BUTTONS + NOTES
// =============================================================================

export function PrimaryButton({ onClick, disabled, loading, loadingLabel, icon, label, cost }: {
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  cost: number;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="px-corners flex h-12 w-full items-center justify-center gap-2 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
      {loading ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> {loadingLabel}</>
      ) : (
        <>{icon} {label} <span className="font-mono text-[13px] font-normal opacity-80">· {cost === 0 ? "free" : `${cost} credit${cost === 1 ? "" : "s"}`}</span></>
      )}
    </button>
  );
}

export function DownloadButton({ onClick, label = "Download PNG" }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90">
      <Download className="h-4 w-4" /> {label}
    </button>
  );
}

export function SecondaryButton({ onClick, href, children, title, disabled }: {
  onClick?: () => void; href?: string; children: React.ReactNode; title?: string; disabled?: boolean;
}) {
  const cls = "flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40";
  if (href) return <Link href={href} title={title} className={cls}>{children}</Link>;
  return <button type="button" onClick={onClick} title={title} disabled={disabled} className={cls}>{children}</button>;
}

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">{children}</p>;
}

export function InfoNote({ icon, children, tone = "neutral" }: { icon?: React.ReactNode; children: React.ReactNode; tone?: "neutral" | "success" }) {
  const toneCls = tone === "success"
    ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-100/90"
    : "border-white/[0.06] bg-white/[0.03] text-[#8B93A5]";
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed ${toneCls}`}>
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <div>{children}</div>
    </div>
  );
}

// =============================================================================
// SOURCE IMAGE (left panel)
// =============================================================================

/**
 * The source sprite card in the left panel. With an image: thumbnail + prompt
 * + "Change". Without: a dashed dropzone-style tile that points to Assets.
 */
export function SourceCard({ imageUrl, loading, prompt, pixel }: {
  imageUrl: string | null; loading: boolean; prompt?: string; pixel?: boolean;
}) {
  if (!imageUrl && !loading) {
    return (
      <Link href="/assets"
        className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.1] bg-[#151922] px-4 py-7 text-center transition-colors hover:border-[#FF8A3D]/50">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#1A1F2A] text-[#C9CFDB] transition-colors group-hover:text-[#FFB27A]">
          <ImageIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[13px] font-medium text-white">Pick a sprite to start</span>
          <span className="mt-1 block text-[11px] text-[#8B93A5]">Choose one of your recent sprites, or browse all assets</span>
        </span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#151922] p-2.5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.06]"
        style={{ backgroundImage: "repeating-conic-gradient(#ffffff0a 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }}>
        {loading ? (
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-[#FF8A3D]" />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="Source sprite" className={`h-full w-full object-contain p-1 ${pixel ? "pixel-perfect" : ""}`} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white">{loading ? "Loading sprite…" : prompt || "Source sprite"}</p>
        <Link href="/assets" className="mt-0.5 inline-block text-[11px] font-medium text-[#8B93A5] transition-colors hover:text-[#FFB27A]">
          Change image
        </Link>
      </div>
    </div>
  );
}

// =============================================================================
// RECENT ASSET PICKER (empty canvas)
// =============================================================================

/** Shown in the canvas when no sprite is selected: recent generations to pick from. */
export function RecentAssetPicker({ toolPath, title }: { toolPath: string; title: string }) {
  const router = useRouter();
  const [items, setItems] = useState<ToolGeneration[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/generations?limit=9")
      .then((r) => (r.ok ? r.json() : { generations: [] }))
      .then((d) => { if (!cancelled) setItems(Array.isArray(d.generations) ? d.generations : []); })
      .catch(() => { if (!cancelled) setItems([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
      <div className="pixel-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="font-display text-[20px] font-semibold text-white">{title}</p>
        <p className="mt-1.5 font-mono text-[12px] text-[#8B93A5]">&gt; pick a sprite to start<span className="caret ml-1 align-middle" aria-hidden /></p>
      </div>
      {items === null ? (
        <Loader2 className="relative h-6 w-6 animate-spin text-[#FF8A3D]" />
      ) : items.length === 0 ? (
        <div className="relative flex flex-col items-center gap-3">
          <p className="font-mono text-[12px] text-[#7A8294]">No sprites yet.</p>
          <Link href="/generate"
            className="px-corners bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2.5 text-[13px] font-semibold text-white hover:brightness-110">
            Create your first sprite
          </Link>
        </div>
      ) : (
        <>
          <div className="relative grid w-full max-w-md grid-cols-3 gap-2.5">
            {items.map((g) => (
              <button key={g.id} type="button" title={g.prompt}
                onClick={() => g.id && router.push(`${toolPath}?id=${encodeURIComponent(g.id)}`)}
                className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151922]/80 transition-all hover:border-[#FF8A3D]/50">
                {g.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={g.imageUrl} alt={g.prompt ?? ""} loading="lazy"
                    className={`absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-110 ${isPixelStyleId(g.styleId) ? "pixel-perfect" : ""}`} />
                )}
              </button>
            ))}
          </div>
          <Link href="/assets" className="relative font-mono text-[12px] text-[#8B93A5] transition-colors hover:text-white">Browse all assets →</Link>
        </>
      )}
    </div>
  );
}

// =============================================================================
// CANVAS CONTENT
// =============================================================================

export function ProcessingOverlay({ icon, title, seconds, hint }: { icon: React.ReactNode; title: string; seconds: number; hint: string }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#0B0D12]/55 px-6 backdrop-blur-[2px]">
      <div className="relative h-14 w-14">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FF8A3D]" />
        <span className="absolute inset-0 flex items-center justify-center text-[#FF8A3D]">{icon}</span>
      </div>
      <div className="text-center">
        <p className="text-[14px] font-medium text-white">{title}</p>
        <p className="mt-1 font-mono text-[12px] tabular-nums text-[#8B93A5]">{seconds}s · {hint}</p>
      </div>
    </div>
  );
}

export function CanvasImage({ src, alt, pixel, dim }: { src: string; alt: string; pixel?: boolean; dim?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} draggable={false}
      className={`absolute inset-0 h-full w-full select-none object-contain p-[8%] transition-opacity duration-300 ${pixel ? "pixel-perfect" : ""} ${dim ? "opacity-20" : "opacity-100"}`} />
  );
}

/** Drag-to-compare slider: `before` on the left, `after` on the right. */
export function BeforeAfter({ before, after, pixel, beforeLabel = "Before", afterLabel = "After" }: {
  before: string; after: string; pixel?: boolean; beforeLabel?: string; afterLabel?: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div className="absolute inset-0">
      <CanvasImage src={after} alt={afterLabel} pixel={pixel} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <CanvasImage src={before} alt={beforeLabel} pixel={pixel} />
      </div>
      <div className="pointer-events-none absolute inset-y-0 w-px bg-white/80 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" style={{ left: `${pos}%` }}>
        <span className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <MoveHorizontal className="h-4 w-4" />
        </span>
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{afterLabel}</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}

export function CanvasEmptyHint({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#151922] text-[#C9CFDB]">{icon}</span>
      <div>
        <p className="text-[15px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[12px] text-[#8B93A5]">{subtitle}</p>
      </div>
    </div>
  );
}

/** Segmented "Compare / Result" (or similar) switch for the top bar. */
export function Segmented<T extends string>({ value, options, onChange }: {
  value: T; options: { id: T; label: string }[]; onChange: (id: T) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ${value === o.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0D12]">
      <Loader2 className="h-8 w-8 animate-spin text-[#FF8A3D]" />
    </div>
  );
}
