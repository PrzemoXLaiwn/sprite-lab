"use client";

/**
 * "My generations" panel shared by Create, Animate and Edit (Meshy-style).
 *
 * - Desktop (xl, ≥1280px): a right-hand column next to the canvas.
 * - Smaller screens: a bottom sheet opened by <HistoryButton />.
 *
 * Lists only the signed-in user's generations (GET /api/generations scopes by
 * the session user), with prompt search and a per-tool type filter. Clicking
 * a tile hands the item to the tool, which loads it back with its settings.
 */

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { History, Loader2, Search, X } from "lucide-react";
import {
  TOOL_HISTORY_FILTERS,
  animationSheetGeometry,
  classifyGeneration,
  cleanGenerationPrompt,
  historyBadge,
  normalizeHistoryQuery,
  parseAnimationPrompt,
  type HistoryFilterId,
  type WorkspaceTool,
} from "@/lib/workspace/history";

export interface HistoryItem {
  id: string;
  prompt: string;
  imageUrl: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  createdAt: string;
  seed?: number | null;
}

const PAGE_SIZE = 24;
const WIDE_QUERY = "(min-width: 1280px)";

const isPixel = (styleId?: string | null) => !!styleId && styleId.toUpperCase().includes("PIXEL");

/** Inventory slot frames: the kind of item reads at a glance, like item rarity in an RPG. */
const SLOT_FRAME: Record<string, string> = {
  sprite: "border-[#3A4673]",
  animation: "border-[#00E436]/70",
  edit: "border-[#29ADFF]/70",
};

const EMPTY_TEXT: Record<HistoryFilterId, string> = {
  "all-images": "Nothing here yet. Everything you make shows up here.",
  sprites: "No sprites yet. Sprites you create show up here.",
  animations: "No animations yet. Animate a sprite and it shows up here.",
  edits: "No edits yet. Sprites you change with Edit show up here.",
};

const PANEL_TITLE: Record<WorkspaceTool, string> = {
  create: "Inventory",
  animate: "My animations",
  edit: "My edits",
};

// =============================================================================
// TRIGGER
// =============================================================================

/** Opens the history sheet below xl (the column is always visible from xl up). */
export function HistoryButton({ onClick, className }: { onClick: () => void; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-haspopup="dialog"
      className={`flex h-10 shrink-0 items-center gap-1.5 rounded-[8px] border border-white/[0.1] px-3 text-[13px] font-medium text-[#C8CCE8] transition hover:bg-white/[0.06] hover:text-white xl:hidden ${className ?? ""}`}>
      <History className="h-4 w-4" aria-hidden /> Inventory
    </button>
  );
}

// =============================================================================
// DATA
// =============================================================================

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia(WIDE_QUERY);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);
  return wide;
}

type LoadState = "idle" | "loading" | "ready" | "error" | "signed-out";

function useHistoryItems(enabled: boolean, filter: HistoryFilterId, query: string, refreshKey: unknown) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<LoadState>("idle");
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  const url = useCallback((offset: number) => {
    const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), kind: filter });
    if (query) q.set("q", query);
    return `/api/generations?${q.toString()}`;
  }, [filter, query]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState("loading");
    fetch(url(0), { signal: controller.signal })
      .then(async (res) => {
        if (res.status === 401) { setState("signed-out"); setItems([]); return; }
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json();
        setItems(Array.isArray(data.generations) ? data.generations.filter((g: HistoryItem) => g?.id && g?.imageUrl) : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
        setState("ready");
      })
      .catch((e) => { if (e?.name !== "AbortError") setState("error"); });
    return () => controller.abort();
  }, [enabled, url, refreshKey, retry]);

  const loadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(url(items.length));
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const next: HistoryItem[] = Array.isArray(data.generations) ? data.generations : [];
      setItems((prev) => {
        const seen = new Set(prev.map((p) => p.id));
        return [...prev, ...next.filter((g) => g?.id && g?.imageUrl && !seen.has(g.id))];
      });
      if (typeof data.total === "number") setTotal(data.total);
    } catch {
      /* keep what we have; the button stays for another try */
    } finally {
      setLoadingMore(false);
    }
  };

  return { items, total, state, loadMore, loadingMore, reload: () => setRetry((n) => n + 1) };
}

// =============================================================================
// THUMBNAILS
// =============================================================================

const sizeCache = new Map<string, { width: number; height: number }>();

/** First frame of an animation sheet; plays through the frames on hover / focus. */
function AnimationThumb({ item, playing }: { item: HistoryItem; playing: boolean }) {
  const parsed = parseAnimationPrompt(item.prompt);
  const [size, setSize] = useState(() => sizeCache.get(item.imageUrl) ?? null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (size) return;
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      const s = { width: img.naturalWidth, height: img.naturalHeight };
      sizeCache.set(item.imageUrl, s);
      if (!cancelled) setSize(s);
    };
    img.src = item.imageUrl;
    return () => { cancelled = true; };
  }, [item.imageUrl, size]);

  const geo = parsed && size ? animationSheetGeometry(parsed, size.width, size.height) : null;
  const frameCount = geo?.frameCount ?? 0;

  useEffect(() => {
    if (!playing || frameCount < 2) return;
    const id = setInterval(() => setTick((t) => t + 1), 125);
    return () => clearInterval(id);
  }, [playing, frameCount]);
  const frame = playing && frameCount > 1 ? tick % frameCount : 0;

  if (!geo) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={item.imageUrl} alt="" loading="lazy" decoding="async"
      className={`absolute inset-0 h-full w-full object-contain p-2 ${isPixel(item.styleId) ? "pixel-perfect" : ""}`} />;
  }
  const col = frame % geo.cols;
  const row = Math.floor(frame / geo.cols);
  return (
    <span className="absolute inset-0 flex items-center justify-center p-2" aria-hidden>
      <span className={`block max-h-full max-w-full ${isPixel(item.styleId) ? "pixel-perfect" : ""}`}
        style={{
          aspectRatio: `${geo.frameWidth} / ${geo.frameHeight}`,
          width: geo.frameWidth >= geo.frameHeight ? "100%" : "auto",
          height: geo.frameWidth >= geo.frameHeight ? "auto" : "100%",
          backgroundImage: `url("${item.imageUrl.replace(/"/g, "%22")}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: `${geo.cols * 100}% ${geo.rows * 100}%`,
          backgroundPosition: `${geo.cols > 1 ? (col / (geo.cols - 1)) * 100 : 0}% ${geo.rows > 1 ? (row / (geo.rows - 1)) * 100 : 0}%`,
        }} />
    </span>
  );
}

function HistoryTile({ item, active, onSelect }: { item: HistoryItem; active: boolean; onSelect: (item: HistoryItem) => void }) {
  const [hover, setHover] = useState(false);
  const kind = classifyGeneration(item);
  const badge = historyBadge(item);
  const title = cleanGenerationPrompt(item.prompt) || "Untitled";
  return (
    <button type="button" onClick={() => onSelect(item)} title={item.prompt}
      aria-label={`Open ${badge ? `${badge.toLowerCase()} ` : ""}“${title}”`} aria-current={active || undefined}
      onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}
      onFocus={() => setHover(true)} onBlur={() => setHover(false)}
      className={`checker checker-sm group relative aspect-square w-full overflow-hidden rounded-[6px] border-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.35)] transition-colors ${
        active ? "border-[#FFA300]" : `${SLOT_FRAME[kind] ?? SLOT_FRAME.sprite} hover:border-[#FFA300]/70`
      }`}>
      {kind === "animation" ? (
        <AnimationThumb item={item} playing={hover} />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={item.imageUrl} alt="" loading="lazy" decoding="async"
          className={`absolute inset-0 h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105 ${isPixel(item.styleId) ? "pixel-perfect" : ""}`} />
      )}
      {badge && (
        <span className="pointer-events-none absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate rounded-[4px] bg-[#131A31]/85 px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight text-[#FFF1E8]">
          {badge}
        </span>
      )}
    </button>
  );
}

// =============================================================================
// PANEL
// =============================================================================

function PanelBody({ tool, filter, setFilter, query, setQuery, data, activeIds, onSelect, columns }: {
  tool: WorkspaceTool;
  filter: HistoryFilterId;
  setFilter: (f: HistoryFilterId) => void;
  query: string;
  setQuery: (q: string) => void;
  data: ReturnType<typeof useHistoryItems>;
  activeIds: (string | null | undefined)[];
  onSelect: (item: HistoryItem) => void;
  columns: "two" | "three";
}) {
  const searchId = useId();
  const filters = TOOL_HISTORY_FILTERS[tool];
  const { items, total, state, loadMore, loadingMore, reload } = data;
  return (
    <>
      <div className="space-y-2 px-4 pb-3">
        <label htmlFor={searchId} className="sr-only">Search my generations</label>
        <div className="flex h-10 items-center gap-2 rounded-[8px] border border-white/[0.1] bg-[#131A31] px-3 focus-within:border-[#FFA300]">
          <Search className="h-4 w-4 shrink-0 text-[#8A92BF]" aria-hidden />
          <input id={searchId} type="text" role="searchbox" enterKeyHint="search" value={query} onChange={(e) => setQuery(e.target.value)} maxLength={80}
            placeholder="Search your sprites" autoComplete="off"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-white outline-none placeholder:text-[#8A92BF]" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Clear search"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-lg text-[#9AA1CC] hover:text-white">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {filters.length > 1 && (
          <div role="group" aria-label="Type" className="flex gap-1 rounded-[8px] border border-white/[0.08] p-0.5">
            {filters.map((f) => (
              <button key={f.id} type="button" onClick={() => setFilter(f.id)} aria-pressed={filter === f.id}
                className={`min-h-9 flex-1 rounded-[6px] px-2 text-[12.5px] font-medium transition-colors ${
                  filter === f.id ? "bg-[#FFA300] text-[#131A31]" : "text-[#C8CCE8] hover:text-white"
                }`}>
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4" aria-busy={state === "loading" || undefined}>
        {state === "loading" && items.length === 0 ? (
          <div className={`grid gap-2 ${columns === "three" ? "grid-cols-3" : "grid-cols-2"}`} aria-label="Loading your generations">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-square animate-pulse rounded-[6px] border-2 border-[#263260] bg-white/[0.03]" />)}
          </div>
        ) : state === "signed-out" ? (
          <p className="py-6 text-center text-[12.5px] text-[#9AA1CC]">Sign in to see your generations.</p>
        ) : state === "error" ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <p className="text-[12.5px] text-[#9AA1CC]">Couldn&apos;t load your history.</p>
            <button type="button" onClick={reload}
              className="flex h-10 items-center rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[13px] font-medium text-[#C8CCE8] hover:text-white">
              Try again
            </button>
          </div>
        ) : items.length === 0 && state === "ready" ? (
          <p className="py-6 text-center text-[12.5px] leading-relaxed text-[#9AA1CC]">
            {normalizeHistoryQuery(query) ? <>Nothing matches “{normalizeHistoryQuery(query)}”.</> : EMPTY_TEXT[filter]}
          </p>
        ) : (
          <>
            <div className={`grid gap-1.5 transition-opacity ${columns === "three" ? "grid-cols-3" : "grid-cols-2"} ${state === "loading" ? "opacity-60" : ""}`}>
              {items.map((item) => (
                <HistoryTile key={item.id} item={item} active={activeIds.includes(item.id)} onSelect={onSelect} />
              ))}
            </div>
            {items.length < total && (
              <button type="button" onClick={loadMore} disabled={loadingMore}
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.04] text-[13px] font-medium text-[#C8CCE8] hover:text-white disabled:opacity-60">
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />} Load more
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function HistoryPanel({ tool, activeIds = [], open, onOpenChange, onSelect, refreshKey }: {
  tool: WorkspaceTool;
  /** Items to highlight (current source sprite / result). */
  activeIds?: (string | null | undefined)[];
  /** Bottom sheet state (below xl). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (item: HistoryItem) => void;
  /** Change it (e.g. to the latest result id) to refetch after a new generation. */
  refreshKey?: unknown;
}) {
  const wide = useIsWide();
  const [filter, setFilter] = useState<HistoryFilterId>(TOOL_HISTORY_FILTERS[tool][0].id);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebounced(normalizeHistoryQuery(query)), 250);
    return () => clearTimeout(t);
  }, [query]);

  const sheetOpen = open && !wide;
  const data = useHistoryItems(wide || open, filter, debounced, refreshKey);

  const select = (item: HistoryItem) => {
    onSelect(item);
    onOpenChange(false);
  };

  // Sheet: Escape closes, the page behind doesn't scroll, focus moves in
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [sheetOpen, onOpenChange]);

  const bodyProps = { tool, filter, setFilter, query, setQuery, data, activeIds, onSelect: select };
  const title = PANEL_TITLE[tool];

  return (
    <>
      <aside aria-label={title} className="hidden w-[288px] shrink-0 flex-col border-l border-white/[0.06] bg-[#19223F] xl:flex xl:min-h-0">
        <div className="flex items-center justify-between px-4 pb-3 pt-5">
          <p className="font-display text-[17px] font-semibold text-[#FFF1E8]">{title}</p>
          <Link href="/assets" className="inline-flex min-h-10 items-center text-[12.5px] text-[#A7ADD4] underline-offset-2 hover:text-white hover:underline">All assets</Link>
        </div>
        {wide && <PanelBody {...bodyProps} columns="two" />}
      </aside>

      {sheetOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <button type="button" aria-label="Close history" tabIndex={-1} onClick={() => onOpenChange(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-[2px]" />
          <div className="absolute inset-x-0 bottom-0 flex max-h-[85dvh] flex-col rounded-t-3xl border-t border-white/[0.08] bg-[#19223F] pb-[env(safe-area-inset-bottom)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.8)] md:inset-x-auto md:right-4 md:bottom-4 md:w-[420px] md:rounded-3xl md:border">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-white/[0.12] md:hidden" aria-hidden />
            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-2 md:pt-4">
              <p className="font-display text-[16px] font-semibold text-white">{title}</p>
              <div className="flex items-center gap-1">
                <Link href="/assets" className="inline-flex min-h-10 items-center px-2 text-[12.5px] text-[#A7ADD4] hover:text-white">All assets</Link>
                <button ref={closeRef} type="button" onClick={() => onOpenChange(false)} aria-label="Close history"
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-[#C8CCE8] hover:bg-white/[0.06] hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <PanelBody {...bodyProps} columns="three" />
          </div>
        </div>
      )}
    </>
  );
}
