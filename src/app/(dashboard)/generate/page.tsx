"use client";

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Download,
  Loader2,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Lock,
  Unlock,
  Info,
  Lightbulb,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { track, FUNNEL } from "@/lib/analytics";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { ChevronDown, Eye, Zap as ZapIcon, Palette as PaletteIcon } from "lucide-react";
import { FancySelect, type FancyOption } from "@/components/generate/FancySelect";

// =============================================================================
// GENERATOR DATA (imported from src/data/)
// =============================================================================

// =============================================================================
// VIEW + DETAIL
// =============================================================================

const VIEW_OPTIONS = [
  { id: "none",    label: "Default",   desc: "3/4 angle" },
  { id: "side",    label: "Side",      desc: "Profile right" },
  { id: "front",   label: "Front",     desc: "Facing viewer" },
  { id: "topdown", label: "Top-Down",  desc: "From above" },
] as const;

type ViewId = (typeof VIEW_OPTIONS)[number]["id"];

// =============================================================================
// CLIENT-SIDE VIEW DETECTOR
// Mirrors src/config/categories/prompt-configs.ts detectViewFromPrompt so the
// UI can warn users about view conflicts live — before they hit Generate.
// =============================================================================

const CLIENT_VIEW_PATTERNS: Array<{ view: Exclude<ViewId, "none">; pattern: RegExp }> = [
  { view: "topdown", pattern: /\b(top[\s-]?down(?:\s+view)?|bird'?s?[\s-]?eye(?:\s+view)?|from\s+above|overhead(?:\s+view)?|aerial\s+view|flat\s+lay|z\s+g[oó]ry|widok\s+z\s+g[oó]ry|z\s+lotu\s+ptaka|od\s+g[oó]ry|odg[oó]ry|perspektywa\s+z\s+g[oó]ry)\b/i },
  { view: "side",    pattern: /\b(side[\s-]?view|side\s+profile|from\s+the\s+side|platformer\s+view|widok\s+z\s+boku|z\s+boku|z\s+profilu|profilu|profil\s+boczny)\b/i },
  { view: "front",   pattern: /\b(front[\s-]?view|front[\s-]?facing|facing\s+(?:forward|viewer)|frontal\s+view|head[\s-]?on|straight[\s-]?on|widok\s+z\s+przodu|z\s+przodu|od\s+przodu|na\s+wprost|frontalnie|frontalny)\b/i },
];

function detectViewInText(text: string): Exclude<ViewId, "none"> | null {
  if (!text) return null;
  for (const { view, pattern } of CLIENT_VIEW_PATTERNS) {
    if (pattern.test(text)) return view;
  }
  return null;
}

const DETAIL_OPTIONS = [
  { id: "draft",  label: "Fast",   description: "Quick, icon-safe" },
  { id: "normal", label: "Medium", description: "Balanced quality" },
  { id: "hd",     label: "HD",     description: "Max detail" },
] as const;

type DetailId = (typeof DETAIL_OPTIONS)[number]["id"];

// IDs match the backend keys in src/config/prompts/prompt-builder.ts
// (COLOR_PALETTE_PROMPTS). Earlier the form used UI-only labels like
// "warm" / "neon" / "cold" that the prompt builder had no map for, so
// every palette pick was silently dropped at the prompt-build step.
const PALETTE_OPTIONS = [
  { id: "auto",           label: "Auto" },
  { id: "FANTASY_GOLD",   label: "Fantasy gold" },
  { id: "ICE_BLUE",       label: "Ice / cool" },
  { id: "DARK_SOULS",     label: "Dark & muted" },
  { id: "FIRE_RED",       label: "Fire / vibrant" },
  { id: "FOREST_GREEN",   label: "Earthy / forest" },
  { id: "NEON_CYBER",     label: "Neon / cyber" },
  { id: "PASTEL_DREAM",   label: "Pastel" },
  { id: "OCEAN_DEEP",     label: "Ocean deep" },
  { id: "AUTUMN_HARVEST", label: "Autumn" },
  { id: "MONO_BW",        label: "Black & white" },
  { id: "RETRO_GAMEBOY",  label: "Game Boy green" },
  { id: "SUNSET_WARM",    label: "Sunset" },
] as const;

type PaletteId = (typeof PALETTE_OPTIONS)[number]["id"];

// Background preview modes
const BG_MODES = [
  { id: "checker", label: "Transparent", style: { backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" } },
  { id: "dark",    label: "Dark",        style: { background: "#111827" } },
  { id: "light",   label: "Light",       style: { background: "#f3f4f6" } },
  { id: "game",    label: "Game",        style: { background: "#1e293b", backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "32px 32px" } },
] as const;

type BgModeId = (typeof BG_MODES)[number]["id"];

// SUBTYPE_PLACEHOLDERS imported from @/data/generate-categories

// =============================================================================
// PROMPT QUALITY INDICATOR
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

interface GeneratedResult {
  id: string;
  imageUrl: string;
  seed: number;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  /** Form view at the moment of generation (used for seed-lock validity). */
  view: string;
  /** Palette ID at the moment of generation. */
  palette: string;
  prompt: string;
  translatedPrompt?: string;
  enhancedPrompt?: string;
  /** The complete prompt string that was actually sent to FLUX — useful
      for debugging "why did the model produce X". */
  fullPrompt?: string;
  /** Service-side warnings (bg-removal failure, view conflict, model downgrade). */
  warnings?: string[];
  /** Runware model that actually generated the image. */
  modelUsed?: string;
  /** Prompt enhancements applied by the analytics layer. */
  appliedOptimizations?: string[];
  /** Final view after server-side conflict resolution. */
  resolvedView?: string;
  /** Quality preset that was actually used (for credit cost display). */
  qualityPreset?: "draft" | "normal" | "hd";
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 max-w-6xl mx-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <GeneratePageInner />
    </Suspense>
  );
}

function GeneratePageInner() {
  const searchParams = useSearchParams();

  // Pre-fill from URL params (from gallery, projects, or direct links)
  const urlPrompt    = searchParams.get("prompt") ?? "";
  const urlStyleId   = searchParams.get("styleId") ?? "";
  const urlCatId     = searchParams.get("categoryId") ?? "";
  const urlSubId     = searchParams.get("subcategoryId") ?? "";
  const urlView      = searchParams.get("view") ?? "";
  const urlProjectId = searchParams.get("projectId") ?? "";
  const urlFolderId  = searchParams.get("folderId") ?? "";
  // Resolve initial category from URL
  const initCat = GENERATE_CATEGORIES.find(c => c.id === urlCatId) ?? GENERATE_CATEGORIES[0];
  const initSubId = (urlSubId && initCat.subcategories.some(s => s.subcategoryId === urlSubId))
    ? urlSubId : initCat.subcategories[0].subcategoryId;

  const viewFromUrl = ({"TOP_DOWN": "topdown", "SIDE_VIEW": "side", "FRONT": "front", "DEFAULT": "none"} as Record<string, string>)[urlView] || "none";

  const [selectedCategory, setSelectedCategory] = useState<GenerateCategory>(initCat);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(initSubId);
  const [styleId, setStyleId]             = useState(
    urlStyleId && (ALL_GENERATE_STYLE_IDS as readonly string[]).includes(urlStyleId) ? urlStyleId : "PIXEL_ART_16"
  );
  const [view, setView]                   = useState<ViewId>(viewFromUrl as ViewId || "none");
  const [projectId] = useState(urlProjectId);
  const [folderId] = useState(urlFolderId);
  const [detail, setDetail]               = useState<DetailId>("normal");
  const [prompt, setPrompt]               = useState(urlPrompt);
  const [seed, setSeed]                   = useState("");
  const [palette, setPalette]              = useState<PaletteId>("auto");
  const [bgMode, setBgMode]               = useState<BgModeId>("checker");
  const [seedLocked, setSeedLocked]       = useState(false);

  const [status, setStatus]               = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [, setNoCredits]                  = useState(false);

  const [history, setHistory]             = useState<GeneratedResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [styleLocked, setStyleLocked]     = useState(false);
  const [seedCopied, setSeedCopied]       = useState(false);
  const seedRef                           = useRef("");

  const isGenerating = status === "generating";

  // Live progress timer — without it the user has no signal how long the
  // request has been running, and a 30s wait feels like a 2-minute hang.
  const [elapsedMs, setElapsedMs] = useState(0);
  useEffect(() => {
    if (!isGenerating) {
      setElapsedMs(0);
      return;
    }
    const start = Date.now();
    const id = setInterval(() => setElapsedMs(Date.now() - start), 200);
    return () => clearInterval(id);
  }, [isGenerating]);

  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const progressStage =
    elapsedSeconds < 3 ? "Preparing the prompt…" :
    elapsedSeconds < 8 ? "Sending to the model…" :
    elapsedSeconds < 18 ? "Generating pixels…" :
    elapsedSeconds < 30 ? "Removing background…" :
    elapsedSeconds < 60 ? "Almost there — model is busy…" :
    "Hang tight, this one is taking a while…";
  const activeResult = history[selectedIndex] ?? null;
  const selectedSub  = selectedCategory.subcategories.find((s) => s.subcategoryId === selectedSubcategoryId) ?? selectedCategory.subcategories[0];
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;

  // Live view detection — warns user when prompt contains a view keyword that
  // differs from the UI selector. Backend honors the prompt (user text wins),
  // but we surface it here so the state of the selector isn't confusing.
  const detectedView = useMemo(() => detectViewInText(prompt), [prompt]);
  const viewConflict = detectedView !== null && detectedView !== view;
  const detectedViewLabel = detectedView
    ? VIEW_OPTIONS.find((v) => v.id === detectedView)?.label ?? detectedView
    : null;

  // Prompt quality signal — nudges users toward richer descriptions so they
  // don't submit 1-word prompts and churn on bad results.
  const promptQuality = useMemo(() => {
    const trimmed = prompt.trim();
    if (trimmed.length === 0) return null;
    const words = trimmed.split(/\s+/).filter(w => w.length > 1);
    const vagueWords = /\b(cool|epic|awesome|nice|great|good|amazing|best)\b/i.test(trimmed);
    if (words.length < 3) return { level: "weak" as const, hint: "Too short — add material, color or mood." };
    if (vagueWords) return { level: "weak" as const, hint: "Avoid vague words — describe the actual look." };
    if (words.length < 5) return { level: "ok" as const, hint: "OK — add one more detail for richer output." };
    return { level: "good" as const, hint: "Looks solid." };
  }, [prompt]);

  // Seed-lock validity: a locked seed only reproduces the previous render
  // when the inputs that shaped it are also unchanged. If the user locked
  // the seed and then changed style / view / quality / palette / category,
  // the next regeneration uses the same seed against a different prompt,
  // which is NOT reproduction. Surfaces a warning so they're not surprised.
  const seedDriftWarning = useMemo(() => {
    if (!seedLocked || !activeResult) return null;
    const drift: string[] = [];
    if (activeResult.styleId !== styleId) drift.push("style");
    if (activeResult.view !== view) drift.push("view");
    if (activeResult.qualityPreset && activeResult.qualityPreset !== detail) drift.push("quality");
    if (activeResult.palette !== palette) drift.push("palette");
    if (activeResult.subcategoryId !== selectedSubcategoryId) drift.push("type");
    if (activeResult.prompt !== prompt.trim()) drift.push("prompt");
    return drift.length > 0 ? drift : null;
  }, [seedLocked, activeResult, styleId, view, detail, palette, selectedSubcategoryId, prompt]);

  const handleCategoryChange = (cat: GenerateCategory) => {
    setSelectedCategory(cat);
    setSelectedSubcategoryId(cat.subcategories[0].subcategoryId);
  };

  const handleSubcategoryChange = (sub: GenerateSubcategory) => {
    setSelectedSubcategoryId(sub.subcategoryId);
  };

  const handleGenerate = useCallback(async () => {
    if (!isFormValid || isGenerating) return;

    setStatus("generating");
    setErrorMessage(null);
    setNoCredits(false);

    const isFirstAttempt = history.length === 0;
    track(FUNNEL.generationAttempt, { styleId, categoryId: selectedSub.categoryId, qualityPreset: detail });
    if (isFirstAttempt) track(FUNNEL.firstGenerationAttempt, { styleId });

    // Map frontend view IDs to backend view keys
    const viewMap: Record<string, string> = {
      none: "DEFAULT",
      side: "SIDE_VIEW",
      front: "FRONT",
      topdown: "TOP_DOWN",
    };

    // Hard cap on a single generation attempt. Without this, a hung Runware
    // websocket leaves users staring at the spinner indefinitely — a top
    // reason new users churn after one try.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          prompt:         prompt.trim(),
          categoryId:     selectedSub.categoryId,
          subcategoryId:  selectedSubcategoryId,
          styleId:        styleId,
          view:           viewMap[view] || "DEFAULT",
          qualityPreset:  detail,
          // Palette: "auto" means "let the style decide" — leaving the field
          // unset on the server side. Any other value is a backend palette
          // ID (FANTASY_GOLD, NEON_CYBER, …) that the prompt builder maps
          // to actual colour tokens.
          colorPaletteId: palette === "auto" ? undefined : palette,
          seed:           seedRef.current.trim() || undefined,
          projectId:      projectId || undefined,
          folderId:       folderId || undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 402 || data.noCredits) {
          setNoCredits(true);
          setStatus("error");
          setErrorMessage("You don't have enough credits to generate.");
          triggerUpgradeModal();
          return;
        }
        const code: string | undefined = data?.code;
        const fallback =
          code === "USER_BOOTSTRAP_FAILED"
            ? "We couldn't load your account. Please refresh the page and try again."
            : code === "TRANSLATION_UNAVAILABLE"
            ? "We couldn't translate your prompt right now. Please type the description in English and try again."
            : code === "PROVIDER_TIMEOUT"
            ? "The image service took too long. Please try again."
            : code === "PROVIDER_ERROR"
            ? "The image service rejected this request. Try a slightly different prompt — avoid graphic violence, gore, or copyrighted character names."
            : code === "VALIDATION_ERROR"
            ? "Some of the inputs are invalid. Please check the prompt and selectors."
            : response.status === 429
            ? "You're going a bit fast — please wait a moment and try again."
            : response.status >= 500
            ? "Our generator is having a hiccup. Please try again in a few seconds."
            : "Generation failed. Please try again.";
        throw new Error(data.error || fallback);
      }

      if (!data.imageUrl) throw new Error("Generation completed but no image was returned. Please try again.");

      const newResult: GeneratedResult = {
        id:               `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl:         data.imageUrl,
        seed:             data.seed ?? 0,
        categoryId:       selectedSub.categoryId,
        subcategoryId:    selectedSubcategoryId,
        styleId:          styleId,
        view:             view,
        palette:          palette,
        prompt:           prompt.trim(),
        translatedPrompt: data.translatedPrompt,
        enhancedPrompt:   data.enhancedPrompt,
        fullPrompt:       typeof data.fullPrompt === "string" ? data.fullPrompt : undefined,
        warnings:         Array.isArray(data.warnings) ? data.warnings : undefined,
        modelUsed:        typeof data.modelUsed === "string" ? data.modelUsed : undefined,
        appliedOptimizations: Array.isArray(data.appliedOptimizations) ? data.appliedOptimizations : undefined,
        resolvedView:     typeof data.resolvedView === "string" ? data.resolvedView : undefined,
        qualityPreset:    detail,
      };

      setHistory((prev) => [newResult, ...prev].slice(0, 12));
      setSelectedIndex(0);
      setStatus("idle");

      track(FUNNEL.generationSuccess, { styleId, categoryId: selectedSub.categoryId });
      if (isFirstAttempt) track(FUNNEL.firstGenerationSuccess, { styleId });

      if (!styleLocked) setStyleLocked(true);
      triggerCreditsRefresh();
    } catch (err) {
      setStatus("error");
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      const msg = isAbort
        ? "Generation timed out after 90 seconds. The service may be busy — please try again."
        : err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setErrorMessage(msg);
      track(FUNNEL.generationError, { reason: isAbort ? "timeout" : "api_error", styleId });
    } finally {
      clearTimeout(timeoutId);
    }
  }, [isFormValid, isGenerating, view, prompt, selectedSub, selectedSubcategoryId, styleId, detail, palette, styleLocked, projectId, folderId, history.length]);

  const handleRegenerate = () => {
    if (seedLocked && activeResult) {
      // Keep same seed
      seedRef.current = String(activeResult.seed);
      setSeed(String(activeResult.seed));
    } else {
      seedRef.current = "";
      setSeed("");
    }
    handleGenerate();
  };

  const handleLockSeed = () => {
    if (!activeResult) return;
    if (seedLocked) {
      setSeedLocked(false);
      setSeed("");
      seedRef.current = "";
    } else {
      setSeedLocked(true);
      setSeed(String(activeResult.seed));
      seedRef.current = String(activeResult.seed);
    }
  };

  // Slugify a string into a filename-safe token. Preserves ASCII letters,
  // digits and hyphens; collapses everything else.
  const slugify = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "asset";

  const buildBaseFilename = (size: number) => {
    if (!activeResult) return `spritelab-asset-${size}`;
    const promptSlug = slugify(activeResult.prompt);
    const styleSlug = slugify(activeResult.styleId.replace(/_/g, "-"));
    const subSlug = slugify(activeResult.subcategoryId.replace(/_/g, "-"));
    return `spritelab-${subSlug}-${promptSlug}-${styleSlug}-${size}-${activeResult.seed}`;
  };

  // Whether to use nearest-neighbor scaling — pixel-art styles must, otherwise
  // the downscaled output looks blurry and defeats the pixel-snap pipeline.
  const isPixelStyle = (styleId: string) =>
    /^PIXEL_/.test(styleId) || styleId === "ISOMETRIC_PIXEL";

  /**
   * Resize a fetched image blob in the browser via a canvas, then
   * trigger a download. Uses nearest-neighbor for pixel-art styles
   * (image-smoothing disabled) so resized sprites stay crisp; uses
   * the browser's default scaler for other styles.
   */
  const downloadAtSize = async (size: number) => {
    if (!activeResult) return;
    try {
      const response = await fetch(activeResult.imageUrl);
      const blob = await response.blob();
      const filename = `${buildBaseFilename(size)}.png`;

      // Native size (1024) — skip the resize round-trip.
      if (size === 1024) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas-2d-unavailable");
      ctx.imageSmoothingEnabled = !isPixelStyle(activeResult.styleId);
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, size, size);

      const resizedBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("canvas-toblob-failed"))),
          "image/png"
        );
      });
      const url = URL.createObjectURL(resizedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(activeResult.imageUrl, "_blank");
    }
  };

  const handleDownload = () => downloadAtSize(1024);

  /**
   * Download a JSON sidecar with everything a game-engine importer cares
   * about: prompt, seed, style, model, dimensions, generation parameters.
   * Drop the sidecar next to the PNG in your project and you can
   * regenerate the same asset deterministically.
   */
  const handleDownloadMetadata = () => {
    if (!activeResult) return;
    const sidecar = {
      generator: "SpriteLab",
      version: 1,
      generatedAt: new Date().toISOString(),
      prompt: activeResult.prompt,
      translatedPrompt: activeResult.translatedPrompt,
      enhancedPrompt: activeResult.enhancedPrompt,
      seed: activeResult.seed,
      style: activeResult.styleId,
      category: activeResult.categoryId,
      subcategory: activeResult.subcategoryId,
      view: activeResult.view,
      resolvedView: activeResult.resolvedView,
      palette: activeResult.palette,
      qualityPreset: activeResult.qualityPreset,
      model: activeResult.modelUsed,
      appliedOptimizations: activeResult.appliedOptimizations,
      warnings: activeResult.warnings,
      sourceUrl: activeResult.imageUrl,
    };
    const blob = new Blob([JSON.stringify(sidecar, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${buildBaseFilename(1024)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopySeed = () => {
    if (!activeResult) return;
    navigator.clipboard.writeText(String(activeResult.seed));
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2000);
  };

  // ==========================================================================
  // RENDER — Meshy-style 3-panel layout
  // ==========================================================================
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showPromptTips, setShowPromptTips] = useState(false);
  const isWelcome = searchParams.get("welcome") === "1";
  const checkoutSuccess = searchParams.get("success") === "true";
  const checkoutPlan = searchParams.get("plan");
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isWelcome || checkoutSuccess);

  // First-run onboarding: open the prompt-tips drawer and pre-fill an example
  // prompt so the user can hit Generate immediately. Without this nudge new
  // signups stare at an empty form and bounce.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("spritelab_seen_first_run");
    if (seen) return;
    setShowPromptTips(true);
    if (!urlPrompt && !prompt) {
      // Pull the example from SUBTYPE_PLACEHOLDERS so it tracks the user's
      // selected subcategory rather than falling back to "fire sword" for
      // every subtype outside a hardcoded 5-item allowlist.
      const placeholderExample = SUBTYPE_PLACEHOLDERS[selectedSub.subcategoryId];
      const fallback = `${selectedSub.label.toLowerCase()} with detail`;
      setPrompt(placeholderExample || fallback);
    }
    window.localStorage.setItem("spritelab_seen_first_run", "1");
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polished select component
  const Sel = ({ label, req, value, onChange, options }: {
    label: string; req?: boolean; value: string;
    onChange: (v: string) => void; options: { id: string; label: string }[];
  }) => (
    <div>
      <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
        {label}{req && <span className="text-[#FF6B2C] ml-0.5">*</span>}
      </label>
      <div className="relative group">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3.5 py-3 pr-8 rounded-xl bg-gradient-to-b from-[#171d28] to-[#141821] border-2 border-white/[0.08] text-[13px] text-white/80 font-medium outline-none focus:border-[#FF6B2C]/40 focus:shadow-[0_0_20px_rgba(255,107,44,0.1)] cursor-pointer transition-all duration-200 hover:border-white/15 hover:from-[#1a2030] hover:to-[#161c26] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          {options.map((o) => <option key={o.id} value={o.id} className="bg-[#141821] text-white/80">{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none group-hover:text-white/30 transition-colors" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col lg:flex-row">

      {showWelcomeBanner && (
        <div className="fixed top-0 left-0 right-0 z-[60] bg-gradient-to-r from-[#F97316] to-[#FF8B4D] text-black px-4 py-2.5 flex items-center justify-center gap-3 text-sm font-semibold shadow-lg">
          {checkoutSuccess ? (
            <span>🎉 Payment confirmed{checkoutPlan ? ` — ${checkoutPlan} plan active` : ""}. Your credits are loaded — start creating!</span>
          ) : (
            <span>👋 Welcome to SpriteLab! 10 free credits ready. We&apos;ve filled in an example prompt — click <b>Generate</b> to see what you can make.</span>
          )}
          <button
            type="button"
            aria-label="Dismiss"
            onClick={() => setShowWelcomeBanner(false)}
            className="ml-2 px-2 py-0.5 rounded bg-black/15 hover:bg-black/25 text-xs font-bold transition-colors"
          >
            ✕
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL — Controls (fixed width, scrollable)
      ═══════════════════════════════════════════════════════════ */}
      <div className={`w-full lg:w-[320px] xl:w-[340px] lg:h-screen lg:overflow-y-auto lg:border-r border-[#263046] bg-[#121826] shrink-0 ${showWelcomeBanner ? "lg:pt-10" : ""}`}>
        <div className="p-5 pb-8 space-y-6 relative z-10">

          {/* Panel header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#263046]">
            <h2 className="text-[16px] font-bold text-slate-100 tracking-tight">New Asset</h2>
            <span className="text-[11px] text-[#ffd8c7] bg-[#F97316]/15 px-3.5 py-1 rounded-md font-semibold border border-[#F97316]/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]">
              {detail === "hd" ? "2 credits" : "1 credit"}
            </span>
          </div>

          {/* ── PROMPT ────────────────────────────────────────── */}
          <div>
            <div className="flex items-baseline justify-between mb-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Prompt<span className="text-[#F97316] ml-0.5">*</span>
              </label>
              <button type="button" onClick={() => setShowPromptTips((v) => !v)}
                className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-wider text-slate-600 hover:text-[#F97316] transition-colors cursor-pointer">
                <Lightbulb className="w-3 h-3" />
                {showPromptTips ? "Hide tips" : "How to prompt"}
              </button>
            </div>

            {/* How-to-prompt helper — collapsible */}
            {showPromptTips && (
              <div className="mb-2.5 p-3 rounded-lg bg-[#F97316]/[0.04] border border-[#F97316]/15 space-y-1.5 animate-scale-in">
                <p className="text-[10px] font-bold text-[#F97316] uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="w-3 h-3" /> Write for best results
                </p>
                <ul className="space-y-1 text-[11px] text-slate-300/80 leading-relaxed">
                  <li><span className="text-emerald-400">✓</span> Describe <b>only the object</b>: material, color, mood, detail.</li>
                  <li><span className="text-emerald-400">✓</span> Example: <i className="text-slate-100">&ldquo;golden viking helmet, battle-worn, rune engravings&rdquo;</i></li>
                  <li><span className="text-rose-400">✗</span> Don&apos;t repeat style / category / view — they&apos;re in the selectors below.</li>
                  <li><span className="text-rose-400">✗</span> Avoid vague words: &ldquo;cool&rdquo;, &ldquo;epic&rdquo;, &ldquo;awesome&rdquo;.</li>
                </ul>
              </div>
            )}

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              rows={5}
              className="w-full px-4 py-3.5 rounded-lg bg-[#182033] border border-[#263046] text-[14px] text-slate-100 resize-none outline-none focus:border-[#F97316]/40 focus:shadow-[0_0_12px_rgba(249,115,22,0.1)] placeholder:text-slate-600 leading-relaxed transition-all duration-200 hover:border-[#263046]/80"
            />

            {/* Live view-conflict banner — most common prompt mistake */}
            {viewConflict && detectedView && detectedViewLabel && (
              <div className="mt-2 p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 flex items-start gap-2 animate-scale-in">
                <Eye className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-amber-100 leading-snug">
                    You typed a view in your prompt — we&apos;ll use <b>{detectedViewLabel}</b>.
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <button type="button" onClick={() => setView(detectedView)}
                      className="text-[10px] font-semibold text-amber-200 hover:text-amber-100 underline underline-offset-2 cursor-pointer">
                      Sync View selector
                    </button>
                    <span className="text-[10px] text-amber-200/40">·</span>
                    <span className="text-[10px] text-amber-200/60">
                      Or select <b>{detectedViewLabel}</b> in View below and remove it from the prompt.
                    </span>
                  </div>
                </div>
              </div>
            )}

            {prompt.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {[
                  selectedSub.subcategoryId === "SWORDS" ? "fire sword with glowing runes" :
                  selectedSub.subcategoryId === "POTIONS" ? "red health potion, glowing" :
                  selectedSub.subcategoryId === "HEROES" ? "dark wizard with staff" :
                  selectedSub.subcategoryId === "ENEMIES" ? "skeleton warrior" :
                  selectedSub.subcategoryId === "HELMETS" ? "golden viking helmet" :
                  `${selectedSub.label.toLowerCase()} with detail`,
                ].map((ex) => (
                  <button key={ex} type="button" onClick={() => setPrompt(ex)}
                    className="px-2.5 py-1.5 text-[10px] rounded-md bg-[#1A2235] text-slate-500 hover:text-[#F97316] hover:bg-[#F97316]/10 transition-all duration-200 border border-[#263046] hover:border-[#F97316]/30 font-medium cursor-pointer">
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {prompt.length > 0 && (
              <div className="mt-1 flex items-center justify-between gap-2">
                {promptQuality && (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                      promptQuality.level === "good" ? "bg-emerald-400" :
                      promptQuality.level === "ok"   ? "bg-amber-400"   :
                                                      "bg-rose-400"
                    }`} />
                    <span className={`text-[9px] truncate ${
                      promptQuality.level === "good" ? "text-emerald-400/70" :
                      promptQuality.level === "ok"   ? "text-amber-400/70"   :
                                                      "text-rose-400/70"
                    }`}>{promptQuality.hint}</span>
                  </div>
                )}
                <span className="text-[9px] text-slate-600 shrink-0">{prompt.length}/500</span>
              </div>
            )}
          </div>

          {/* ── STRUCTURE ─────────────────────────────────────── */}
          <div className="pt-1 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Structure</p>
              <p className="text-[10px] text-slate-600/80 mt-0.5 leading-snug">What to generate — art style + object type.</p>
            </div>

            <FancySelect label="Style" required value={styleId} onChange={setStyleId}
              columns={2}
              options={GENERATE_STYLES.map((s) => ({
                id: s.id,
                label: s.name,
                description: s.description,
                icon: PaletteIcon,
              }))} />

            <div className="grid grid-cols-2 gap-2.5">
              <FancySelect label="Category" required value={selectedCategory.id}
                onChange={(v) => { const c = GENERATE_CATEGORIES.find((x) => x.id === v); if (c) handleCategoryChange(c); }}
                options={GENERATE_CATEGORIES.map((c) => ({
                  id: c.id,
                  label: c.label,
                  icon: c.icon,
                } as FancyOption))} />
              <FancySelect label="Type" required value={selectedSubcategoryId}
                onChange={(v) => { const s = selectedCategory.subcategories.find((x) => x.subcategoryId === v); if (s) handleSubcategoryChange(s); }}
                options={selectedCategory.subcategories.map((s) => ({
                  id: s.subcategoryId,
                  label: s.label,
                }))} />
            </div>
          </div>

          {/* ── OUTPUT ────────────────────────────────────────── */}
          <div className="pt-1 space-y-3">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Output</p>
              <p className="text-[10px] text-slate-600/80 mt-0.5 leading-snug">How it&apos;s framed — camera angle, detail level, colors.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <FancySelect label="View" required value={view}
                onChange={(v) => setView(v as ViewId)}
                options={VIEW_OPTIONS.map((v) => ({
                  id: v.id,
                  label: v.label,
                  description: v.desc,
                  icon: Eye,
                }))} />
              <FancySelect label="Quality" required value={detail}
                onChange={(v) => setDetail(v as DetailId)}
                options={DETAIL_OPTIONS.map((d) => ({
                  id: d.id,
                  label: d.label,
                  description: d.description,
                  icon: ZapIcon,
                }))} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <FancySelect label="Palette" value={palette}
                onChange={(v) => setPalette(v as PaletteId)}
                options={PALETTE_OPTIONS.map((p) => ({
                  id: p.id,
                  label: p.label,
                  color:
                    p.id === "FANTASY_GOLD"   ? "#eab308" :
                    p.id === "ICE_BLUE"       ? "#3b82f6" :
                    p.id === "DARK_SOULS"     ? "#374151" :
                    p.id === "FIRE_RED"       ? "#ef4444" :
                    p.id === "FOREST_GREEN"   ? "#16a34a" :
                    p.id === "NEON_CYBER"     ? "#a855f7" :
                    p.id === "PASTEL_DREAM"   ? "#f9a8d4" :
                    p.id === "OCEAN_DEEP"     ? "#0e7490" :
                    p.id === "AUTUMN_HARVEST" ? "#92400e" :
                    p.id === "MONO_BW"        ? "#9ca3af" :
                    p.id === "RETRO_GAMEBOY"  ? "#86efac" :
                    p.id === "SUNSET_WARM"    ? "#f97316" :
                    undefined,
                }))} />
              {/* Removed: hard-coded "Background" selector (Transparent / Solid
                  dark / Solid light). It was UI theatre — selecting "Solid
                  dark" did not change the API request, so the user got a
                  transparent PNG either way. The output is always transparent
                  via background removal; the canvas preview toggle below the
                  result lets the user check how the sprite looks on dark/light
                  backdrops. */}
            </div>
          </div>

          {/* ── ADVANCED ──────────────────────────────────────── */}
          <div className="pt-3 border-t border-[#263046]">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-all duration-200 uppercase tracking-widest cursor-pointer">
              Advanced
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? "rotate-180 text-[#F97316]" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2.5">
                  <label className="text-[10px] text-slate-600 font-bold uppercase tracking-wider shrink-0">Seed</label>
                  <input type="number" min={0} max={2147483647} placeholder="Random" value={seed}
                    onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                    className="flex-1 px-3.5 py-3 rounded-lg bg-[#182033] border border-[#263046] text-[12px] text-slate-300 outline-none focus:border-[#F97316]/40 focus:shadow-[0_0_12px_rgba(249,115,22,0.1)] placeholder:text-slate-600 hover:border-[#263046]/80 transition-all duration-200" />
                  {activeResult && (
                    <button onClick={handleLockSeed}
                      className={`px-3 py-3 rounded-lg text-[11px] font-medium transition-all duration-200 cursor-pointer ${seedLocked ? "bg-[#F97316]/15 text-[#F97316] border border-[#F97316]/30 shadow-[0_0_8px_rgba(249,115,22,0.1)]" : "text-slate-600 hover:text-slate-400 bg-[#182033] border border-[#263046] hover:border-[#263046]/80"}`}>
                      {seedLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
                {seedDriftWarning && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/25">
                    <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <p className="text-[10px] text-amber-100/80 leading-snug">
                      Seed locked, but you changed <b>{seedDriftWarning.join(", ")}</b>.
                      The same seed will produce a different image — that&apos;s not reproduction.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── GENERATE ──────────────────────────────────────── */}
          <div className="pt-3">
            <Button onClick={handleGenerate} disabled={!isFormValid || isGenerating}
              className="w-full h-14 text-[15px] font-bold rounded-md bg-[#F97316] hover:bg-[#FB923C] text-white border border-[#F97316]/40 transition-all duration-200 shadow-[0_4px_12px_rgba(249,115,22,0.25)] hover:shadow-[0_6px_16px_rgba(249,115,22,0.35)] disabled:opacity-35 disabled:shadow-none disabled:hover:translate-y-0"
              size="lg">
              {isGenerating
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating…</>
                : <>✦ Generate</>}
            </Button>
            {status === "error" && errorMessage && (
              <div className="mt-3 p-3 rounded-md border border-red-500/20 bg-red-500/5 shadow-[0_0_12px_rgba(239,68,68,0.05)]">
                <p className="text-red-400 text-[11px] font-medium">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER — Preview area (flexible)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] lg:min-h-screen p-4 lg:p-10 relative overflow-hidden">
        {/* Animated logo background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <img src="/logo-animated.gif" alt="" aria-hidden="true"
            className="absolute w-full h-full object-cover opacity-[0.15] select-none blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-[#0B0F19]/70 to-[#0B0F19]" />
        </div>

        {/* Preview canvas */}
        <div className="w-full max-w-[560px] aspect-square rounded-lg border border-[#263046] bg-[#182033] overflow-hidden relative shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          style={activeBg.style as React.CSSProperties}>

          {activeResult && (
            <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
              className={`object-contain p-10 transition-opacity duration-300 ${isGenerating ? "opacity-10" : "opacity-100"}`}
              unoptimized />
          )}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#F97316]/10 border-t-[#F97316] animate-spin" />
              <div className="text-center">
                <p className="text-sm text-slate-200/80 font-medium">{progressStage}</p>
                <p className="text-[11px] text-slate-500 mt-1.5 tabular-nums">{elapsedSeconds}s elapsed · usually ~10s</p>
              </div>
              <div className="w-40 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#F97316] to-[#FF8B4D] transition-[width] duration-300 ease-linear"
                  style={{ width: `${Math.min(95, (elapsedMs / 200))}%` }}
                />
              </div>
            </div>
          )}
          {!activeResult && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="w-18 h-18 rounded-lg bg-[#1A2235] border border-[#263046] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-float">
                <Sparkles className="w-7 h-7 text-[#F97316]/20" />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-white/25">What will you create today?</p>
                <p className="text-[11px] text-white/12 mt-1.5">Describe your asset and click Generate</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions below preview */}
        {activeResult && (
          <div className="w-full max-w-[520px] mt-3 flex items-center gap-2">
            <Button onClick={handleDownload} className="flex-1 h-10 text-[11px] font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white/80 border border-white/[0.06] hover:border-white/[0.1] rounded-xl transition-all duration-200 shadow-[0_2px_4px_rgba(0,0,0,0.15)]">
              <Download className="w-3.5 h-3.5 mr-1.5" />Download PNG · 1024
            </Button>
            <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}
              className="h-10 px-3.5 border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.06] text-white/30 hover:text-white/60 rounded-xl transition-all duration-200">
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            </Button>
            <button onClick={handleCopySeed} className="h-10 px-3 text-[10px] text-white/15 hover:text-white/40 transition-all duration-200 cursor-pointer">
              {seedCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}

        {/* Game-engine size variants — power-of-2 PNGs at common sprite
            resolutions. Pixel-art styles use nearest-neighbor; everything
            else uses high-quality bilinear. Plus a JSON metadata sidecar
            for deterministic re-generation. */}
        {activeResult && (
          <div className="w-full max-w-[520px] mt-2">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <p className="text-[9px] uppercase tracking-widest text-white/30 font-bold">
                Export size
              </p>
              <button
                onClick={handleDownloadMetadata}
                className="text-[9px] uppercase tracking-widest text-white/30 hover:text-[#FF6B2C] font-semibold transition-colors cursor-pointer"
                title="Download generation metadata (prompt, seed, style) as JSON"
              >
                + JSON metadata
              </button>
            </div>
            <div className="flex gap-1 flex-wrap">
              {[32, 64, 128, 256, 512, 1024].map((size) => (
                <button
                  key={size}
                  onClick={() => downloadAtSize(size)}
                  className={`px-2.5 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-200 cursor-pointer border ${
                    size === 1024
                      ? "bg-[#FF6B2C]/10 border-[#FF6B2C]/30 text-[#FF6B2C] hover:bg-[#FF6B2C]/15"
                      : "bg-white/[0.03] border-white/[0.06] text-white/45 hover:text-white/80 hover:bg-white/[0.06] hover:border-white/[0.1]"
                  }`}
                  title={`Download PNG at ${size}×${size}px${
                    isPixelStyle(activeResult.styleId) ? " (nearest-neighbor)" : ""
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>
        )}

        {/* BG toggle */}
        {activeResult && (
          <div className="flex gap-1 mt-2">
            {BG_MODES.map((mode) => (
              <button key={mode.id} onClick={() => setBgMode(mode.id)}
                className={`px-2.5 py-1 rounded-md text-[9px] font-medium transition-all duration-200 cursor-pointer ${
                  bgMode === mode.id ? "text-[#FF6B2C] bg-[#FF6B2C]/10 shadow-[0_0_8px_rgba(255,107,44,0.08)]" : "text-white/20 hover:text-white/40 hover:bg-white/[0.04]"
                }`}>
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* Service warnings — non-blocking issues the pipeline wants the
            user to know about (background-removal failure, model downgrade
            on free tier, view conflict between prompt and selector, etc.). */}
        {activeResult?.warnings && activeResult.warnings.length > 0 && (
          <div className="max-w-[520px] w-full mt-3 space-y-1.5">
            {activeResult.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/[0.06] border border-amber-500/25 text-[11px] text-amber-100/90 leading-snug"
              >
                <Info className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Translated prompt — offer to replace the textarea so the user
            doesn't pay for translation again on every regenerate. */}
        {activeResult?.translatedPrompt && (
          <div className="max-w-[520px] w-full mt-3 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-start gap-2">
              <span className="text-white/20 uppercase tracking-widest text-[9px] mt-1 shrink-0">EN</span>
              <p className="text-[11px] text-white/55 leading-relaxed flex-1">
                {activeResult.translatedPrompt}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (activeResult?.translatedPrompt) {
                    setPrompt(activeResult.translatedPrompt);
                  }
                }}
                className="text-[10px] font-semibold text-[#F97316] hover:text-[#FFA866] transition-colors shrink-0 mt-0.5"
                title="Replace your prompt with the English translation"
              >
                Use this →
              </button>
            </div>
          </div>
        )}

        {/* Prompt enhancement trail — preview of what FLUX actually saw. */}
        {activeResult?.enhancedPrompt && (
          <div className="max-w-[520px] w-full mt-2 px-3 py-1.5 text-[10px] text-white/25 italic text-center">
            &ldquo;{activeResult.enhancedPrompt}&rdquo;
          </div>
        )}

        {/* Model + applied optimizations metadata — small footer line so
            users know what produced the image and what was tweaked. */}
        {activeResult && (activeResult.modelUsed || (activeResult.appliedOptimizations?.length ?? 0) > 0) && (
          <div className="max-w-[520px] w-full mt-2 flex flex-wrap items-center gap-1.5 justify-center text-[9px] text-white/25">
            {activeResult.modelUsed && (
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.04] uppercase tracking-wider">
                {activeResult.modelUsed}
              </span>
            )}
            {activeResult.resolvedView && activeResult.resolvedView !== "DEFAULT" && (
              <span className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.04]">
                view: {activeResult.resolvedView.toLowerCase().replace("_", " ")}
              </span>
            )}
            {activeResult.appliedOptimizations?.map((opt) => (
              <span key={opt} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.04]">
                {opt}
              </span>
            ))}
          </div>
        )}

        {/* Full prompt details — collapsed by default. Surfaces the actual
            string that hit FLUX, plus the negative prompt snippet, so users
            can debug "why did the model produce X" instead of guessing. */}
        {activeResult?.fullPrompt && (
          <details className="max-w-[520px] w-full mt-2 group">
            <summary className="cursor-pointer text-[9px] uppercase tracking-widest text-white/30 hover:text-[#FF6B2C] font-bold transition-colors list-none flex items-center justify-center gap-1.5 select-none">
              <span className="group-open:rotate-90 transition-transform inline-block">▸</span>
              View full prompt sent to FLUX
            </summary>
            <pre className="mt-2 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-[10px] leading-relaxed text-white/55 whitespace-pre-wrap break-words font-mono max-h-48 overflow-y-auto">
              {activeResult.fullPrompt}
            </pre>
          </details>
        )}

        {/* Session history thumbnails */}
        {history.length > 1 && (
          <div className="max-w-[520px] w-full mt-6">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2 font-bold">Session · {history.length}</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {history.map((item, index) => (
                <button key={item.id} onClick={() => setSelectedIndex(index)}
                  className={`relative w-13 h-13 rounded-xl shrink-0 overflow-hidden transition-all duration-200 cursor-pointer ${
                    selectedIndex === index ? "ring-2 ring-[#FF6B2C]/50 shadow-[0_0_12px_rgba(255,107,44,0.15)] scale-105" : "opacity-40 hover:opacity-80 hover:scale-105"
                  }`}
                  style={{ backgroundImage: "repeating-conic-gradient(#80808008 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }}>
                  <Image src={item.imageUrl} alt="" fill className="object-contain p-0.5" unoptimized loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
