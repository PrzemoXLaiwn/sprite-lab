"use client";

/**
 * Shared chrome for the tool pages (Generate, Animate, Remove BG, Upscale,
 * Variations, Edit): a 380px control panel on the left, a rounded canvas in
 * the centre with a backdrop toggle and an action bar underneath.
 *
 * Every tool uses these pieces so buttons, chips, notes, empty / loading /
 * error states look and read the same everywhere.
 */

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Download, ImageIcon, Loader2, MoveHorizontal } from "lucide-react";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { fetchImage } from "@/lib/cors-image";

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

export const creditLabel = (cost: number) => (cost === 0 ? "free" : `${cost} credit${cost === 1 ? "" : "s"}`);

/** Seconds elapsed while `active` is true (0 otherwise). */
export function useElapsedSeconds(active: boolean) {
  const [tick, setTick] = useState<{ start: number; now: number } | null>(null);
  useEffect(() => {
    if (!active) return;
    const start = Date.now();
    const first = setTimeout(() => setTick({ start, now: start }), 0);
    const id = setInterval(() => setTick({ start, now: Date.now() }), 500);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [active]);
  return active && tick ? Math.floor((tick.now - tick.start) / 1000) : 0;
}

/**
 * Live "12s" counter. Lives in its own tiny component so the ticking timer
 * re-renders only this text, not the whole tool page.
 */
export function Elapsed() {
  const seconds = useElapsedSeconds(true);
  return <span className="font-mono tabular-nums">{seconds}s</span>;
}

/**
 * Loads the source sprite of a tool page (`?id=`). Pages are keyed on the id,
 * so this runs once per sprite.
 */
export function useSourceGeneration(generationId: string | null) {
  const [state, setState] = useState<{ source: ToolGeneration | null; loading: boolean; error: string }>({
    source: null,
    loading: Boolean(generationId),
    error: "",
  });
  useEffect(() => {
    if (!generationId) return;
    let cancelled = false;
    (async () => {
      let message = "Couldn't load this sprite. Check your connection and refresh the page.";
      try {
        const res = await fetch(`/api/generations/${encodeURIComponent(generationId)}`);
        if (res.status === 404) message = "This sprite doesn't exist any more — pick another one.";
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!data?.generation?.imageUrl) throw new Error();
        if (!cancelled) setState({ source: data.generation, loading: false, error: "" });
      } catch {
        if (!cancelled) setState({ source: null, loading: false, error: message });
      }
    })();
    return () => { cancelled = true; };
  }, [generationId]);
  return state;
}

/**
 * Turns a failed tool request into one clear sentence. Opens the upgrade
 * dialog when the user is out of credits.
 */
export function toolErrorMessage(res: Response, data: { error?: unknown; noCredits?: boolean } | null, fallback: string): string {
  const serverMsg = typeof data?.error === "string" && data.error.trim() ? data.error.trim() : null;
  if (res.status === 402 || data?.noCredits) {
    triggerUpgradeModal();
    return serverMsg ?? "You don't have enough credits for this.";
  }
  if (serverMsg) return serverMsg;
  if (res.status === 401) return "Your session has expired. Refresh the page and sign in again.";
  if (res.status === 429) return "You're going a bit fast — wait a few seconds and try again.";
  if (res.status >= 500) return `${fallback} The service had a hiccup — please try again.`;
  return fallback;
}

/**
 * Saves a remote image under `filename`. Falls back to opening it in a new tab
 * when the browser can't fetch it (CORS / offline).
 */
export async function downloadImage(url: string, filename: string): Promise<void> {
  try {
    const res = await fetchImage(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    saveBlobAs(await res.blob(), filename);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

/** Triggers a browser download of a Blob. */
export function saveBlobAs(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking synchronously cancels the download in Safari / Firefox.
  setTimeout(() => URL.revokeObjectURL(href), 1500);
}

// =============================================================================
// BACKDROPS
// =============================================================================

export const TOOL_BG_MODES = [
  { id: "checker", label: "Transparent", style: { backgroundColor: "#212B4E", backgroundImage: "repeating-conic-gradient(#ffffff0d 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" } },
  { id: "dark",    label: "Dark",        style: { background: "#111318" } },
  { id: "light",   label: "Light",       style: { background: "#f3f4f6" } },
  { id: "game",    label: "Game",        style: { background: "#1C2230", backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "32px 32px" } },
] as const;

export type ToolBgModeId = (typeof TOOL_BG_MODES)[number]["id"];

/** Four swatches that change the canvas background (tap area 40px on touch). */
export function BackdropToggle({ value, onChange }: { value: ToolBgModeId; onChange: (id: ToolBgModeId) => void }) {
  return (
    <div role="group" aria-label="Canvas background" className="flex shrink-0 items-center rounded-xl bg-white/[0.04] max-sm:bg-transparent sm:p-0.5 lg:gap-0.5 lg:p-1">
      {TOOL_BG_MODES.map((mode) => {
        const active = value === mode.id;
        return (
          <button key={mode.id} type="button" onClick={() => onChange(mode.id)}
            title={`${mode.label} background`} aria-label={`${mode.label} background`} aria-pressed={active}
            className="group flex h-10 w-10 items-center justify-center rounded-lg lg:h-7 lg:w-7">
            <span aria-hidden
              className={`block h-7 w-7 rounded-lg border-2 transition-colors ${active ? "border-[#FFA300]" : "border-white/[0.06] group-hover:border-white/30"}`}
              style={{ ...(mode.style as React.CSSProperties), backgroundSize: "8px 8px" }} />
          </button>
        );
      })}
    </div>
  );
}

export const bgStyle = (id: ToolBgModeId) =>
  (TOOL_BG_MODES.find((b) => b.id === id) ?? TOOL_BG_MODES[0]).style as React.CSSProperties;

// =============================================================================
// LAYOUT
// =============================================================================

export function ToolShell({ children }: { children: React.ReactNode }) {
  // Stacked (phone / tablet) layouts: a client navigation from a scrolled page
  // (e.g. Create's next steps → Animate) keeps the old scroll position and
  // opens mid-page. Start a tool at its top.
  useEffect(() => {
    if (window.innerWidth < 1024 && window.scrollY > 0) window.scrollTo(0, 0);
  }, []);
  return (
    <div className="flex min-h-screen flex-col bg-[#131A31] text-[#FFF1E8] lg:h-screen lg:flex-row lg:overflow-hidden">
      {children}
    </div>
  );
}

const TABS = [
  { id: "generate",  label: "Create",    href: "/generate" },
  { id: "animate",   label: "Animate",   href: "/animate" },
  { id: "edit",      label: "Edit",      href: "/edit" },
  { id: "remove-bg", label: "Remove BG", href: "/remove-bg" },
  { id: "upscale",   label: "Upscale",   href: "/upscale" },
] as const;

export type ToolTabId = (typeof TABS)[number]["id"];

/** Segmented tab row shared by every tool. Carries the current sprite along. */
export function ToolTabs({ active, generationId }: { active: ToolTabId; generationId?: string | null }) {
  return (
    <nav aria-label="Tools" className="sl-track mt-4 overflow-x-auto [scrollbar-width:none]">
      {TABS.map((t) =>
        t.id === active ? (
          <span key={t.id} aria-current="page"
            className="sl-seg flex-1 shrink-0">
            {t.label}
          </span>
        ) : (
          <Link key={t.id}
            href={generationId && t.id !== "generate" ? `${t.href}?id=${encodeURIComponent(generationId)}` : t.href}
            className="sl-seg flex-1 shrink-0">
            {t.label}
          </Link>
        )
      )}
    </nav>
  );
}

/** Small pill that always shows what the next run costs. */
export function CostBadge({ cost }: { cost: number }) {
  return (
    <span title="Cost of one run" className="shrink-0 rounded-full border border-[#FFA300]/25 bg-[#FFA300]/10 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#FFC857]">
      {creditLabel(cost)}
    </span>
  );
}

/**
 * Footer of the control panel (the main action button). On stacked phone /
 * tablet layouts it sticks just above the tab bar while the user scrolls the
 * settings, so the button is always one tap away; from lg up the panel is a
 * full-height column and the footer simply sits at its bottom.
 */
export const PANEL_FOOTER =
  "sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-white/[0.06] bg-[#19223F] px-4 pb-3 pt-3 shadow-[0_-16px_32px_-16px_rgba(0,0,0,0.75)] md:bottom-0 lg:static lg:p-4 lg:shadow-none";

export function ToolPanel({ title, cost, tabs, backHref, headerAction, children, footer, className }: {
  title: string;
  cost: number;
  tabs?: React.ReactNode;
  backHref?: string;
  /** Extra control next to the cost badge (e.g. the History button on small screens). */
  headerAction?: React.ReactNode;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={`${title} settings`}
      className={`flex w-full shrink-0 flex-col bg-[#19223F] lg:w-[380px] lg:border-r lg:border-white/[0.06] ${className ?? ""}`}>
      <div className="px-5 pb-3 pt-5">
        {backHref && (
          <Link href={backHref} className="mb-2 inline-flex min-h-10 items-center gap-1.5 lg:mb-3 lg:min-h-8 rounded-lg text-[12px] font-medium text-[#9AA1CC] transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to assets
          </Link>
        )}
        <div className="flex items-center justify-between gap-3">
          <h1 className="min-w-0 font-display text-[19px] font-semibold tracking-tight text-white">{title}</h1>
          <div className="flex shrink-0 items-center gap-2">
            {headerAction}
            <CostBadge cost={cost} />
          </div>
        </div>
        {tabs}
      </div>
      <div className="flex-1 space-y-6 px-5 pb-6 pt-2 lg:min-h-0 lg:overflow-y-auto">{children}</div>
      <div className={PANEL_FOOTER}>{footer}</div>
    </section>
  );
}

/**
 * A labelled block in the control panel. The label names the whole group for
 * screen readers; pass `labelFor` when the block holds a single input so the
 * label becomes a real <label>.
 */
export function Field({ label, action, hint, labelFor, children }: {
  label: React.ReactNode;
  action?: React.ReactNode;
  hint?: React.ReactNode;
  labelFor?: string;
  children: React.ReactNode;
}) {
  const id = useId();
  const labelCls = "text-[12.5px] font-semibold text-[#C8CCE8]";
  return (
    <div role={labelFor ? undefined : "group"} aria-labelledby={labelFor ? undefined : id}>
      <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
        {labelFor
          ? <label id={id} htmlFor={labelFor} className={labelCls}>{label}</label>
          : <p id={id} className={labelCls}>{label}</p>}
        {action}
      </div>
      {children}
      {hint && <p className="mt-2 text-[11.5px] leading-snug text-[#9AA1CC]">{hint}</p>}
    </div>
  );
}

/** Footer line under the main button: time estimate, output, shortcut. */
export function FooterHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-center font-mono text-[11px] text-[#8A92BF]">{children}</p>;
}

/** Centre column: top bar + canvas + optional action bar. */
export function CanvasColumn({ topLeft, topRight, children, actions, below, sectionRef }: {
  topLeft?: React.ReactNode;
  topRight?: React.ReactNode;
  children: React.ReactNode;
  actions?: React.ReactNode;
  below?: React.ReactNode;
  sectionRef?: React.Ref<HTMLElement>;
}) {
  return (
    <section ref={sectionRef} aria-label="Preview" className="relative flex min-w-0 flex-1 scroll-mt-14 flex-col lg:min-h-0 lg:overflow-y-auto">
      <div className="flex min-h-[52px] flex-wrap items-center justify-between gap-x-3 gap-y-2 px-4 py-3 sm:px-5 lg:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">{topLeft}</div>
        {topRight && <div className="ml-auto flex flex-wrap items-center justify-end gap-2 max-sm:w-full max-sm:flex-nowrap">{topRight}</div>}
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-4 sm:px-5 lg:min-h-[320px] lg:px-6">{children}</div>
      {actions && <div className="flex flex-wrap items-center justify-center gap-2 px-4 pb-3 sm:px-5">{actions}</div>}
      {below}
    </section>
  );
}

export function CanvasFrame({ bg, children, className }: { bg: ToolBgModeId; children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative aspect-square w-full max-w-[min(68vh,680px)] overflow-hidden rounded-3xl lg:h-full lg:max-h-[680px] lg:w-auto lg:max-w-full border border-white/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] ${className ?? ""}`}
      style={bgStyle(bg)}>
      {children}
    </div>
  );
}

export function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] leading-none text-[#C8CCE8]">{children}</span>;
}

/** Placeholder text in the canvas top bar before there is a result. */
export function TopBarHint({ children }: { children: React.ReactNode }) {
  return <span className="text-[12px] text-[#8A92BF]">{children}</span>;
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
    <button type="button" onClick={onClick} disabled={disabled} aria-busy={loading || undefined}
      className="btn btn-primary h-12 w-full text-[15px]">
      {loading ? (
        <><Loader2 className="h-4 w-4 shrink-0 animate-spin" /> {loadingLabel}</>
      ) : (
        <>{icon} {label} <span className="font-mono text-[13px] font-normal opacity-85">· {creditLabel(cost)}</span></>
      )}
    </button>
  );
}

export function DownloadButton({ onClick, label = "Download PNG", busy }: { onClick: () => void; label?: string; busy?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={busy}
      className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90 disabled:opacity-60">
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} {label}
    </button>
  );
}

/** Secondary action: layered navy surface, orange edge on hover (see .btn-secondary in globals.css). */
export const SECONDARY_BTN = "btn btn-secondary";

export function SecondaryButton({ onClick, href, children, title, disabled, ariaLabel }: {
  onClick?: () => void; href?: string; children: React.ReactNode; title?: string; disabled?: boolean; ariaLabel?: string;
}) {
  if (href) return <Link href={href} title={title} aria-label={ariaLabel} className={SECONDARY_BTN}>{children}</Link>;
  return <button type="button" onClick={onClick} title={title} aria-label={ariaLabel} disabled={disabled} className={SECONDARY_BTN}>{children}</button>;
}

/** Square icon-only button; `label` is both tooltip and accessible name. */
export function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled}
      className="btn btn-secondary btn-icon">
      {children}
    </button>
  );
}

/** Red note under the main button. Mentions of plans get a link to pricing. */
export function ErrorNote({ children }: { children: React.ReactNode }) {
  const mentionsPlans = typeof children === "string" && /\b(plans?|upgrade)\b/i.test(children);
  return (
    <div role="alert" className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[12px] leading-snug text-red-200">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0 text-red-300" />
      <span className="min-w-0 flex-1">
        {children}
        {mentionsPlans && (
          <>
            {" "}
            <Link href="/pricing" className="font-semibold text-[#FFC857] underline-offset-2 hover:underline">See plans →</Link>
          </>
        )}
      </span>
    </div>
  );
}

export function InfoNote({ icon, children, tone = "neutral" }: { icon?: React.ReactNode; children: React.ReactNode; tone?: "neutral" | "success" | "warning" }) {
  const toneCls = tone === "success"
    ? "border-emerald-400/20 bg-emerald-400/[0.05] text-emerald-100/90"
    : tone === "warning"
    ? "border-amber-400/20 bg-amber-400/[0.05] text-amber-100/90"
    : "border-white/[0.06] bg-white/[0.03] text-[#A7ADD4]";
  return (
    <div role={tone === "success" ? "status" : undefined}
      className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 text-[11.5px] leading-relaxed ${toneCls}`}>
      {icon && <span className="mt-0.5 shrink-0" aria-hidden>{icon}</span>}
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Rounded option card used for modes / presets (aria-pressed toggle). */
export function OptionCard({ active, onClick, disabled, title, children, className }: {
  active: boolean; onClick: () => void; disabled?: boolean; title?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active} title={title}
      className={`rounded-xl border text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
        active ? "border-[#FFA300] bg-[#FFA300]/[0.07] ring-2 ring-[#FFA300]/25" : "border-white/[0.08] bg-[#212B4E] hover:border-white/20"
      } ${className ?? "px-3 py-2.5"}`}>
      {children}
    </button>
  );
}

/** Small rounded chip that fills a text box with an example. */
export function SuggestionChip({ active, onClick, disabled, children }: { active?: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-pressed={active}
      className={`min-h-9 rounded-full border px-3 py-1.5 text-left text-[12px] font-medium leading-snug transition-colors disabled:opacity-50 lg:min-h-8 ${
        active
          ? "border-[#FFA300]/60 bg-[#FFA300]/[0.12] text-white"
          : "border-white/[0.08] text-[#A7ADD4] hover:border-white/20 hover:text-white"
      }`}>
      {children}
    </button>
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
        className="group flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/[0.1] bg-[#212B4E] px-4 py-7 text-center transition-colors hover:border-[#FFA300]/50">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#263260] text-[#C8CCE8] transition-colors group-hover:text-[#FFC857]">
          <ImageIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-[13px] font-medium text-white">Pick a sprite to start</span>
          <span className="mt-1 block text-[11.5px] text-[#9AA1CC]">Choose one of your recent sprites, or browse all assets</span>
        </span>
      </Link>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#212B4E] p-2.5">
      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-white/[0.06]"
        style={{ backgroundImage: "repeating-conic-gradient(#ffffff0a 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }}>
        {loading ? (
          <Loader2 className="absolute inset-0 m-auto h-5 w-5 animate-spin text-[#FFA300]" />
        ) : imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className={`h-full w-full object-contain p-1 ${pixel ? "pixel-perfect" : ""}`} />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-medium text-white" title={prompt}>{loading ? "Loading sprite…" : prompt || "Your sprite"}</p>
        <Link href="/assets" className="mt-0.5 inline-flex min-h-9 items-center text-[12px] font-medium lg:min-h-7 lg:text-[11.5px] text-[#9AA1CC] transition-colors hover:text-[#FFC857]">
          Change sprite
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
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/generations?limit=9")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((d) => { if (!cancelled) setItems(Array.isArray(d.generations) ? d.generations.filter((g: ToolGeneration) => g.id && g.imageUrl) : []); })
      .catch(() => { if (!cancelled) { setFailed(true); setItems([]); } });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-5 sm:gap-6 sm:p-8">
      <div className="pixel-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative text-center">
        <p className="font-display text-[18px] font-semibold text-white sm:text-[20px]">{title}</p>
        <p className="mt-1 text-[13px] text-[#A7ADD4]">Pick a sprite to start</p>
      </div>
      {items === null ? (
        <Loader2 className="relative h-6 w-6 animate-spin text-[#FFA300]" aria-label="Loading your sprites" />
      ) : items.length === 0 ? (
        <div className="relative flex flex-col items-center gap-3 text-center">
          <p className="max-w-[260px] text-[12.5px] text-[#9AA1CC]">
            {failed ? "Couldn't load your sprites. Refresh the page to try again." : "You haven't made any sprites yet."}
          </p>
          {!failed && (
            <Link href="/generate"
              className="px-corners flex h-10 items-center bg-[#FFA300] px-4 text-[13px] font-semibold text-[#131A31] hover:bg-[#FFB733]">
              Create your first sprite
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="relative grid w-full max-w-[260px] grid-cols-3 gap-2 sm:max-w-md sm:gap-2.5">
            {items.map((g, i) => (
              <button key={g.id} type="button" title={g.prompt} aria-label={`Use ${g.prompt ? `“${g.prompt}”` : "this sprite"}`}
                onClick={() => g.id && router.push(`${toolPath}?id=${encodeURIComponent(g.id)}`)}
                className={`group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#212B4E]/80 transition-colors hover:border-[#FFA300]/50 ${i >= 6 ? "max-sm:hidden" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={g.imageUrl} alt="" loading="lazy" decoding="async"
                  className={`absolute inset-0 h-full w-full object-contain p-2.5 transition-transform duration-300 group-hover:scale-110 sm:p-3 ${isPixelStyleId(g.styleId) ? "pixel-perfect" : ""}`} />
              </button>
            ))}
          </div>
          <Link href="/assets" className="relative inline-flex min-h-8 items-center font-mono text-[12px] text-[#9AA1CC] transition-colors hover:text-white">Browse all assets →</Link>
        </>
      )}
    </div>
  );
}

// =============================================================================
// CANVAS CONTENT
// =============================================================================

/**
 * Spinner overlay on the canvas. `timed` shows a live seconds counter next to
 * the hint ("12s · usually 20–40s").
 */
export function ProcessingOverlay({ icon, title, hint, timed = false }: { icon: React.ReactNode; title: string; hint?: string; timed?: boolean }) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-[#131A31]/55 px-6 backdrop-blur-[2px]">
      <div className="relative h-14 w-14" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FFA300]" />
        <span className="absolute inset-0 flex items-center justify-center text-[#FFA300]">{icon}</span>
      </div>
      <div className="text-center">
        <p role="status" className="text-[14px] font-medium text-white">{title}</p>
        {(timed || hint) && (
          <p className="mt-1 font-mono text-[12px] tabular-nums text-[#9AA1CC]">
            {timed && <Elapsed />}{timed && hint ? " · " : ""}{hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function CanvasImage({ src, alt, pixel, dim }: { src: string; alt: string; pixel?: boolean; dim?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} draggable={false} decoding="async"
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
        <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg">
          <MoveHorizontal className="h-4 w-4" />
        </span>
      </div>
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{beforeLabel}</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 font-mono text-[11px] text-white backdrop-blur">{afterLabel}</span>
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))}
        aria-label={`Compare ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()}`}
        aria-valuetext={`${pos}% ${beforeLabel.toLowerCase()}`}
        className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0" />
    </div>
  );
}

export function CanvasEmptyHint({ icon, title, subtitle, action }: { icon: React.ReactNode; title: string; subtitle: string; action?: React.ReactNode }) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#212B4E] text-[#C8CCE8]" aria-hidden>{icon}</span>
      <div>
        <p className="text-[15px] font-semibold text-white">{title}</p>
        <p className="mt-1 text-[12.5px] text-[#9AA1CC]">{subtitle}</p>
      </div>
      {action}
    </div>
  );
}

/** Shown in the canvas when the `?id=` sprite couldn't be loaded. */
export function SourceMissing({ icon, message }: { icon: React.ReactNode; message?: string }) {
  return (
    <CanvasEmptyHint icon={icon} title="Couldn't load this sprite"
      subtitle={message || "Pick another one from your assets."}
      action={<Link href="/assets" className={`${SECONDARY_BTN} mt-1`}>Open assets</Link>} />
  );
}

/** Segmented "Compare / Result" (or similar) switch for the top bar. */
export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T; options: { id: T; label: string }[]; onChange: (id: T) => void; label?: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-1 rounded-xl bg-white/[0.04] p-1 max-sm:mr-auto">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={`min-h-9 rounded-lg px-2.5 text-[12.5px] font-medium transition-colors sm:px-3 sm:text-[12px] lg:min-h-7 ${value === o.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#9AA1CC] hover:text-white"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PageFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#131A31]" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-[#FFA300]" />
    </div>
  );
}
