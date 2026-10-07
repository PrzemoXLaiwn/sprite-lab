"use client";

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
  Dices,
  ChevronDown,
  Eye,
  X,
  Film,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { track, FUNNEL } from "@/lib/analytics";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { SHOWCASE, isPixelShowcase } from "@/data/showcase";

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

const VIEW_CATEGORIES = new Set(["CHARACTERS", "CREATURES", "ENVIRONMENT"]);

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

// Must match CREDIT_COSTS in src/lib/services/generation.ts
const DETAIL_OPTIONS = [
  { id: "normal", label: "Standard", description: "1 credit · ~8s · clean sprite" },
  { id: "hd",     label: "HD",       description: "3 credits · ~25s · best detail & prompt accuracy" },
] as const;

const DETAIL_CREDITS: Record<DetailId, number> = { normal: 1, hd: 3 };
const DETAIL_ETA: Record<DetailId, string> = { normal: "~8 seconds", hd: "~25 seconds" };

type DetailId = (typeof DETAIL_OPTIONS)[number]["id"];

// IDs match the backend keys in src/config/prompts/prompt-builder.ts
// (COLOR_PALETTE_PROMPTS). Earlier the form used UI-only labels like
// "warm" / "neon" / "cold" that the prompt builder had no map for, so
// every palette pick was silently dropped at the prompt-build step.
// Pose picker — only meaningful for character / creature subcategories.
// "auto" defaults to A-pose (game-rigging friendly). Maps to AssetPose
// in src/config/categories/prompt-configs.ts.
const POSE_OPTIONS = [
  { id: "auto",    label: "Auto",    desc: "Default A-pose" },
  { id: "a-pose",  label: "A-pose",  desc: "Rigging stance" },
  { id: "t-pose",  label: "T-pose",  desc: "Spine / Unity rig" },
  { id: "dynamic", label: "Dynamic", desc: "Action / key art" },
] as const;

type PoseId = (typeof POSE_OPTIONS)[number]["id"];

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

export interface GeneratedResult {
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
  /** DB id of the saved generation (needed to accept it into a project). */
  generationId?: string;
  /** Project review state when generating for a project. */
  projectStatus?: "pending" | "accepting" | "accepted" | "declined";
  /** Folder the sprite was filed into after Accept. */
  acceptedFolderName?: string;
}

interface ProjectContext {
  id: string;
  name: string;
  folders: { id: string; name: string; category: string }[];
}

// =============================================================================
// WORKSPACE COMPONENT
// =============================================================================

/**
 * The generate workspace. `initialHistory` lets a dev-only preview render the
 * result state without calling the API.
 */
export function GenerateWorkspace({ initialHistory = [] }: { initialHistory?: GeneratedResult[] }) {
  return (
    <Suspense fallback={<div className="min-h-screen p-8 max-w-6xl mx-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
      <GeneratePageInner initialHistory={initialHistory} />
    </Suspense>
  );
}

function GeneratePageInner({ initialHistory }: { initialHistory: GeneratedResult[] }) {
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
  // Target folder for Accept: "" = auto-sort (default). The folder the user
  // came from is only a hint — it wins when the sprite's type fits it, so a
  // potion generated from "Player Character" still lands in Potions.
  const [targetFolderId, setTargetFolderId] = useState("");
  const [project, setProject] = useState<ProjectContext | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);

  // Project mode: load the project (name + folders) for the banner/selector.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    fetch(`/api/projects/${encodeURIComponent(projectId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "Project not found." : "Couldn't load the project.");
        const data = await res.json();
        if (cancelled) return;
        setProject({
          id: data.project.id,
          name: data.project.name,
          folders: (data.project.folders ?? []).map((f: { id: string; name: string; category: string }) => ({
            id: f.id, name: f.name, category: f.category,
          })),
        });
      })
      .catch((e: Error) => { if (!cancelled) setProjectError(e.message); });
    return () => { cancelled = true; };
  }, [projectId]);
  const [detail, setDetail]               = useState<DetailId>("normal");
  const [prompt, setPrompt]               = useState(urlPrompt);
  const [seed, setSeed]                   = useState("");
  const [palette, setPalette]              = useState<PaletteId>("auto");
  const [pose, setPose]                    = useState<PoseId>("auto");
  const [batchSize, setBatchSize]          = useState<1 | 2 | 4>(1);
  const [bgMode, setBgMode]               = useState<BgModeId>("checker");
  const [seedLocked, setSeedLocked]       = useState(false);

  const [status, setStatus]               = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [, setNoCredits]                  = useState(false);

  const [history, setHistory]             = useState<GeneratedResult[]>(initialHistory);
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
  // Camera view only changes the result for figures and world objects — items,
  // icons and tiles always come out front-on, so the selector is hidden there.
  const viewApplies = VIEW_CATEGORIES.has(selectedSub.categoryId);
  const effectiveView: ViewId = viewApplies ? view : "none";
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;

  // Live view detection — warns user when prompt contains a view keyword that
  // differs from the UI selector. Backend honors the prompt (user text wins),
  // but we surface it here so the state of the selector isn't confusing.
  const detectedView = useMemo(() => detectViewInText(prompt), [prompt]);
  const viewConflict = viewApplies && detectedView !== null && detectedView !== view;
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

  // Keep the address bar in sync with the settings, so a refresh or a shared
  // link reopens the same setup. replaceState: no navigation, no re-render.
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams;
    q.set("categoryId", selectedCategory.id); // the picker group; the type is in subcategoryId
    q.set("subcategoryId", selectedSubcategoryId);
    q.set("styleId", styleId);
    const viewParam = ({ topdown: "TOP_DOWN", side: "SIDE_VIEW", front: "FRONT" } as Record<string, string>)[effectiveView];
    if (viewParam) q.set("view", viewParam);
    else q.delete("view");
    q.delete("prompt"); // the prompt lives in the box, not in history
    const next = `${url.pathname}?${q.toString()}${url.hash}`;
    if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [selectedCategory.id, selectedSubcategoryId, styleId, effectiveView]);

  const handleCategoryChange = (cat: GenerateCategory) => {
    setSelectedCategory(cat);
    setSelectedSubcategoryId(cat.subcategories[0].subcategoryId);
    // A view picked for characters shouldn't silently carry over
    setView("none");
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
          view:           viewMap[effectiveView] || "DEFAULT",
          qualityPreset:  detail,
          // Palette: "auto" means "let the style decide" — leaving the field
          // unset on the server side. Any other value is a backend palette
          // ID (FANTASY_GOLD, NEON_CYBER, …) that the prompt builder maps
          // to actual colour tokens.
          colorPaletteId: palette === "auto" ? undefined : palette,
          pose,
          seed:           seedRef.current.trim() || undefined,
          // Project mode does NOT file the sprite on generation — the user
          // reviews it first and Accept files it (POST /api/projects/:id/assets).
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
        view:             effectiveView,
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
        generationId:     typeof data.generationId === "string" ? data.generationId : undefined,
        projectStatus:    projectId && typeof data.generationId === "string" ? "pending" : undefined,
      };

      setHistory((prev) => [newResult, ...prev].slice(0, 24));
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
  }, [isFormValid, isGenerating, effectiveView, pose, prompt, selectedSub, selectedSubcategoryId, styleId, detail, palette, styleLocked, projectId, history.length]);

  // ── Project review: Accept files the sprite into the project, Decline just
  // leaves it out (it stays in My Assets). Both are reversible here.
  const updateResult = (id: string, patch: Partial<GeneratedResult>) =>
    setHistory((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const acceptResult = async (result: GeneratedResult) => {
    if (!projectId || !result.generationId) return;
    updateResult(result.id, { projectStatus: "accepting" });
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationId: result.generationId,
          ...(targetFolderId ? { folderId: targetFolderId } : urlFolderId ? { folderHint: urlFolderId } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't add to project");
      updateResult(result.id, { projectStatus: "accepted", acceptedFolderName: data.folderName ?? "Unsorted" });
      if (data.createdFolder && data.folderId) {
        // Show the new folder in the selector too
        setProject((p) => (p && !p.folders.some((f) => f.id === data.folderId)
          ? { ...p, folders: [...p.folders, { id: data.folderId, name: data.folderName, category: result.categoryId ?? "" }] }
          : p));
      }
    } catch (e) {
      updateResult(result.id, { projectStatus: "pending" });
      setErrorMessage(e instanceof Error ? e.message : "Couldn't add to project");
      setStatus("error");
    }
  };

  const declineResult = async (result: GeneratedResult) => {
    if (!projectId) return;
    // If it had been accepted, take it back out of the project.
    if (result.projectStatus === "accepted" && result.generationId) {
      await fetch(`/api/projects/${encodeURIComponent(projectId)}/assets`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generationId: result.generationId }),
      }).catch(() => {});
    }
    updateResult(result.id, { projectStatus: "declined", acceptedFolderName: undefined });
  };

  const pendingResults = history.filter((r) => r.projectStatus === "pending");
  const acceptAllPending = async () => {
    for (const r of pendingResults) await acceptResult(r);
  };

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
   * Pixel-art sprites are stored upscaled by an integer factor. Find that
   * factor (largest f where every f×f block is one colour) and download the
   * sprite at its true art-pixel resolution — the size game engines want.
   */
  const downloadNative = async () => {
    if (!activeResult) return;
    try {
      const blob = await (await fetch(activeResult.imageUrl)).blob();
      const bitmap = await createImageBitmap(blob);
      const probe = document.createElement("canvas");
      probe.width = bitmap.width;
      probe.height = bitmap.height;
      const pctx = probe.getContext("2d", { willReadFrequently: true });
      if (!pctx) throw new Error("canvas-2d-unavailable");
      pctx.drawImage(bitmap, 0, 0);
      const { data, width, height } = pctx.getImageData(0, 0, bitmap.width, bitmap.height);
      const px = (x: number, y: number) => {
        const i = (y * width + x) * 4;
        return (data[i] << 24) ^ (data[i + 1] << 16) ^ (data[i + 2] << 8) ^ data[i + 3];
      };
      const uniform = (f: number) => {
        for (let by = 0; by < height; by += f) {
          for (let bx = 0; bx < width; bx += f) {
            const c = px(bx, by);
            if (px(Math.min(bx + f - 1, width - 1), by) !== c) return false;
            if (px(bx, Math.min(by + f - 1, height - 1)) !== c) return false;
            if (px(Math.min(bx + f - 1, width - 1), Math.min(by + f - 1, height - 1)) !== c) return false;
          }
        }
        return true;
      };
      let factor = 1;
      for (let f = 64; f >= 2; f--) {
        if (width % f === 0 && height % f === 0 && uniform(f)) { factor = f; break; }
      }
      const size = Math.round(width / factor);
      const out = document.createElement("canvas");
      out.width = size;
      out.height = Math.round(height / factor);
      const octx = out.getContext("2d");
      if (!octx) throw new Error("canvas-2d-unavailable");
      octx.imageSmoothingEnabled = false;
      octx.drawImage(bitmap, 0, 0, out.width, out.height);
      const outBlob = await new Promise<Blob>((resolve, reject) =>
        out.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas-toblob-failed"))), "image/png")
      );
      const url = URL.createObjectURL(outBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${buildBaseFilename(size)}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(activeResult.imageUrl, "_blank");
    }
  };

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
  // RENDER — workspace (Meshy / Tripo style): controls · canvas · history
  // ==========================================================================
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllStyles, setShowAllStyles] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  const isWelcome = searchParams.get("welcome") === "1";
  const checkoutSuccess = searchParams.get("success") === "true";
  const checkoutPlan = searchParams.get("plan");
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isWelcome || checkoutSuccess);

  // First-run onboarding: pre-fill an example prompt so the user can hit
  // Generate immediately. Without this nudge new signups stare at an empty
  // form and bounce.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem("spritelab_seen_first_run");
    if (seen) return;
    if (!urlPrompt && !prompt) {
      const placeholderExample = SUBTYPE_PLACEHOLDERS[selectedSub.subcategoryId];
      setPrompt(placeholderExample || `${selectedSub.label.toLowerCase()} with detail`);
    }
    window.localStorage.setItem("spritelab_seen_first_run", "1");
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On stacked (mobile) layouts the canvas sits below the form — bring it
  // into view when a generation starts so the user sees progress.
  const canvasRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isGenerating && window.innerWidth < 1024) {
      canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isGenerating]);

  const cost = DETAIL_CREDITS[detail];
  const isCreature = selectedCategory.id === "CHARACTERS" || selectedCategory.id === "CREATURES";
  const firstStyles = GENERATE_STYLES.slice(0, 6);
  const visibleStyles = showAllStyles || firstStyles.some((s) => s.id === styleId)
    ? (showAllStyles ? GENERATE_STYLES : firstStyles)
    : [...firstStyles.slice(0, 5), GENERATE_STYLES.find((s) => s.id === styleId)!];
  const styleName = (id: string) => GENERATE_STYLES.find((s) => s.id === id)?.name ?? id;

  const surpriseMe = () => {
    const pool = SURPRISE_PROMPTS[selectedCategory.id] ?? SURPRISE_PROMPTS.DEFAULT;
    let next = pool[Math.floor(Math.random() * pool.length)];
    if (next === prompt && pool.length > 1) next = pool[(pool.indexOf(next) + 1) % pool.length];
    setPrompt(next);
  };

  const applyExample = (ex: { prompt: string; styleId: string; categoryId: string }) => {
    setPrompt(ex.prompt.replace(/,\s*side view$/i, ""));
    if ((ALL_GENERATE_STYLE_IDS as readonly string[]).includes(ex.styleId)) setStyleId(ex.styleId);
    const cat = GENERATE_CATEGORIES.find((c) => c.id === ex.categoryId);
    if (cat) handleCategoryChange(cat);
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#0B0D12] text-[#ECEEF3] lg:h-screen lg:flex-row lg:overflow-hidden">

      {showWelcomeBanner && (
        <div className="fixed left-0 right-0 top-0 z-[60] flex items-center justify-center gap-3 bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] px-4 py-2.5 text-sm font-semibold text-black shadow-lg">
          {checkoutSuccess ? (
            <span>🎉 Payment confirmed{checkoutPlan ? ` — ${checkoutPlan} plan active` : ""}. Your credits are loaded — start creating!</span>
          ) : (
            <span>👋 Welcome to SpriteLab! 10 free credits are ready — we filled in an example, just press <b>Generate</b>.</span>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => setShowWelcomeBanner(false)}
            className="ml-2 rounded bg-black/15 px-2 py-0.5 text-xs font-bold transition-colors hover:bg-black/25">✕</button>
        </div>
      )}

      {/* ═══ LEFT — controls ═══════════════════════════════════════════ */}
      <section className={`flex w-full shrink-0 flex-col bg-[#0E1016] lg:w-[380px] lg:border-r lg:border-white/[0.06] ${showWelcomeBanner ? "lg:pt-10" : ""}`}>
        <div className="px-5 pb-3 pt-5">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-[20px] font-semibold text-white">Create a sprite</h1>
            <span className="px-corners bg-[#FF8A3D]/15 px-2.5 py-1 font-mono text-[11px] font-semibold text-[#FFB27A]">
              {cost} credit{cost === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1 font-mono text-[11px] font-medium">
            <span className="rounded-lg bg-white/[0.09] px-2 py-1.5 text-center text-white shadow-sm">Create</span>
            <Link href={activeResult?.generationId ? `/animate?id=${encodeURIComponent(activeResult.generationId)}` : "/animate"} className="rounded-lg px-2 py-1.5 text-center text-[#8B93A5] transition-colors hover:text-white">Animate</Link>
            <Link href="/remove-bg" className="rounded-lg px-2 py-1.5 text-center text-[#8B93A5] transition-colors hover:text-white">Remove BG</Link>
            <Link href="/upscale" className="rounded-lg px-2 py-1.5 text-center text-[#8B93A5] transition-colors hover:text-white">Upscale</Link>
          </div>

          {/* Project mode banner — results get Accept / Decline */}
          {projectId && (
            <div className="mt-4 rounded-xl border border-[#FF8A3D]/30 bg-[#FF8A3D]/[0.06] p-3">
              {projectError ? (
                <p className="text-[12px] text-red-200">{projectError}</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-[12px] text-[#C9CFDB]">
                      <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-[#FFB27A]">project</span>{" "}
                      <span className="font-semibold text-white">{project?.name ?? "Loading…"}</span>
                    </p>
                    <Link href={`/projects/${encodeURIComponent(projectId)}`} className="shrink-0 text-[11px] text-[#FFB27A] hover:text-white">
                      Open →
                    </Link>
                  </div>
                  <label className="mt-2 block">
                    <span className="sr-only">Folder for accepted sprites</span>
                    <select value={targetFolderId} onChange={(e) => setTargetFolderId(e.target.value)} disabled={!project}
                      className="w-full rounded-lg border border-white/[0.08] bg-[#151922] px-2.5 py-2 text-[12px] text-white outline-none focus:border-[#FF8A3D]/50">
                      <option value="">Accept into: auto-sort (recommended)</option>
                      {project?.folders.map((f) => <option key={f.id} value={f.id}>Accept into: {f.name}</option>)}
                    </select>
                  </label>
                  <p className="mt-1.5 text-[11px] leading-snug text-[#8B93A5]">
                    Review each sprite — <b className="text-emerald-300">Accept</b> files it into the right folder by type (a new folder is made if needed), <b className="text-[#C9CFDB]">Decline</b> keeps it out.
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6 px-5 pb-6 pt-2 lg:min-h-0 lg:overflow-y-auto">

          {/* Prompt */}
          <div>
            <div className="rounded-2xl border border-white/[0.08] bg-[#151922] transition-colors focus-within:border-[#FF8A3D]/50">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleGenerate(); }
                }}
                placeholder={placeholder}
                maxLength={500}
                rows={4}
                className="w-full resize-none bg-transparent px-4 pt-3.5 text-[14px] leading-relaxed text-white outline-none placeholder:text-[#7A8294]"
              />
              <div className="flex items-center justify-between px-2.5 pb-2.5">
                <button type="button" onClick={surpriseMe}
                  className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-medium text-[#9BA3B4] transition-colors hover:bg-white/[0.05] hover:text-white">
                  <Dices className="h-3.5 w-3.5" /> Surprise me
                </button>
                <span className="pr-1.5 text-[11px] tabular-nums text-[#7A8294]">{prompt.length}/500</span>
              </div>
            </div>
            {promptQuality && promptQuality.level !== "good" && (
              <p className={`mt-2 px-1 text-[11px] ${promptQuality.level === "ok" ? "text-amber-300/80" : "text-rose-300/80"}`}>
                {promptQuality.hint}
              </p>
            )}
            {viewConflict && detectedView && detectedViewLabel && (
              <button type="button" onClick={() => setView(detectedView)}
                className="mt-2 flex w-full items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-left text-[11px] text-amber-100/90 hover:bg-amber-400/[0.1]">
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" />
                <span>Your prompt mentions <b>{detectedViewLabel}</b> — click to set the View to match.</span>
              </button>
            )}
          </div>

          {/* Style */}
          <Field label="Style" action={
            <button type="button" onClick={() => setShowAllStyles((v) => !v)}
              className="text-[11px] font-medium text-[#9BA3B4] hover:text-white">
              {showAllStyles ? "Show less" : `All styles (${GENERATE_STYLES.length})`}
            </button>
          }>
            <div className="grid grid-cols-3 gap-2">
              {visibleStyles.map((s) => {
                const active = s.id === styleId;
                return (
                  <button key={s.id} type="button" onClick={() => setStyleId(s.id)} title={s.description}
                    className={`group relative aspect-square overflow-hidden rounded-xl border bg-[#151922] transition-all ${
                      active ? "border-[#FF8A3D] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.06] hover:border-white/20"
                    }`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/styles/${s.id.toLowerCase()}.png`} alt="" loading="lazy"
                      className={`absolute inset-0 h-full w-full object-contain p-2 pb-5 transition-transform duration-300 group-hover:scale-105 ${isPixelStyle(s.id) ? "pixel-perfect" : ""}`} />
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-1.5 pb-1.5 pt-4 text-center text-[10.5px] font-medium leading-tight text-white">
                      {s.name}
                    </span>
                    {active && <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF8A3D]"><Check className="h-2.5 w-2.5 text-black" strokeWidth={3} /></span>}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Asset type */}
          <Field label="Asset type">
            <div className="flex flex-wrap gap-1.5">
              {GENERATE_CATEGORIES.map((c) => {
                const active = c.id === selectedCategory.id;
                const Icon = c.icon;
                return (
                  <button key={c.id} type="button" onClick={() => handleCategoryChange(c)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                      active ? "border-[#FF8A3D]/60 bg-[#FF8A3D]/12 text-white" : "border-white/[0.08] text-[#9BA3B4] hover:border-white/20 hover:text-white"
                    }`}>
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-[#FF8A3D]" : ""}`} /> {c.label}
                  </button>
                );
              })}
            </div>
          </Field>

          {/* View */}
          {viewApplies && <Field label="Camera view">
            <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
              {VIEW_OPTIONS.map((v) => (
                <button key={v.id} type="button" onClick={() => setView(v.id)} title={v.desc}
                  className={`rounded-lg py-1.5 text-[12px] font-medium transition-colors ${
                    view === v.id ? "bg-white/[0.1] text-white shadow-sm" : "text-[#8B93A5] hover:text-white"
                  }`}>
                  {v.label}
                </button>
              ))}
            </div>
          </Field>}

          {/* Quality */}
          <Field label="Quality">
            <div className="grid grid-cols-2 gap-2">
              {DETAIL_OPTIONS.map((d) => {
                const active = d.id === detail;
                return (
                  <button key={d.id} type="button" onClick={() => setDetail(d.id)}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      active ? "border-[#FF8A3D]/70 bg-[#FF8A3D]/[0.08]" : "border-white/[0.08] hover:border-white/20"
                    }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-semibold text-white">{d.label}</span>
                      <span className={`font-mono text-[11px] font-semibold ${active ? "text-[#FFB27A]" : "text-[#8B93A5]"}`}>
                        {DETAIL_CREDITS[d.id]} cr
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-[#8B93A5]">{d.id === "hd" ? "Best detail & accuracy · ~25s" : "Fast & clean · ~8s"}</p>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* More options */}
          <div className="rounded-2xl border border-white/[0.06]">
            <button type="button" onClick={() => setShowAdvanced((v) => !v)}
              className="flex w-full items-center justify-between px-4 py-3 text-[12px] font-medium text-[#9BA3B4] hover:text-white">
              More options
              <ChevronDown className={`h-4 w-4 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="space-y-5 border-t border-white/[0.06] px-4 pb-4 pt-4">
                <Field label="Color palette">
                  <div className="flex flex-wrap gap-2">
                    {PALETTE_OPTIONS.map((p) => {
                      const active = p.id === palette;
                      return (
                        <button key={p.id} type="button" onClick={() => setPalette(p.id)} title={p.label}
                          className={`h-7 rounded-full border-2 transition-all ${p.id === "auto" ? "px-2.5 text-[11px] font-medium text-[#C9CFDB]" : "w-7"} ${
                            active ? "border-white scale-110" : "border-transparent hover:border-white/40"
                          }`}
                          style={p.id === "auto" ? { background: "rgba(255,255,255,0.06)" } : { background: PALETTE_SWATCH[p.id] }}>
                          {p.id === "auto" ? "Auto" : null}
                        </button>
                      );
                    })}
                  </div>
                </Field>

                <Field label="Type">
                  <select value={selectedSubcategoryId}
                    onChange={(e) => { const s = selectedCategory.subcategories.find((x) => x.subcategoryId === e.target.value); if (s) handleSubcategoryChange(s); }}
                    className="w-full rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 text-[13px] text-white outline-none focus:border-[#FF8A3D]/50">
                    {selectedCategory.subcategories.map((s) => <option key={s.subcategoryId} value={s.subcategoryId}>{s.label}</option>)}
                  </select>
                </Field>

                {isCreature && (
                  <Field label="Pose">
                    <div className="grid grid-cols-4 gap-1 rounded-xl bg-white/[0.04] p-1">
                      {POSE_OPTIONS.map((p) => (
                        <button key={p.id} type="button" onClick={() => setPose(p.id)} title={p.desc}
                          className={`rounded-lg py-1.5 text-[11.5px] font-medium transition-colors ${
                            pose === p.id ? "bg-white/[0.1] text-white" : "text-[#8B93A5] hover:text-white"
                          }`}>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </Field>
                )}

                <Field label="Seed">
                  <div className="flex gap-2">
                    <input type="number" min={0} max={2147483647} placeholder="Random" value={seed}
                      onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                      className="flex-1 rounded-xl border border-white/[0.08] bg-[#151922] px-3 py-2.5 text-[13px] text-white outline-none placeholder:text-[#7A8294] focus:border-[#FF8A3D]/50" />
                    {activeResult && (
                      <button type="button" onClick={handleLockSeed} title={seedLocked ? "Unlock seed" : "Lock seed of the current result"}
                        className={`rounded-xl border px-3 transition-colors ${seedLocked ? "border-[#FF8A3D]/50 bg-[#FF8A3D]/10 text-[#FFB27A]" : "border-white/[0.08] text-[#8B93A5] hover:text-white"}`}>
                        {seedLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                      </button>
                    )}
                  </div>
                  {seedDriftWarning && (
                    <p className="mt-2 text-[11px] leading-snug text-amber-200/80">
                      Seed is locked but you changed <b>{seedDriftWarning.join(", ")}</b> — the result will differ.
                    </p>
                  )}
                </Field>
              </div>
            )}
          </div>
        </div>

        {/* Generate */}
        <div className="border-t border-white/[0.06] bg-[#0E1016] p-4">
          <button type="button" onClick={handleGenerate} disabled={!isFormValid || isGenerating}
            className="px-corners group relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            {isGenerating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Generating… {elapsedSeconds}s</>
            ) : (
              <><Sparkles className="h-4 w-4" /> Generate <span className="font-normal opacity-80">· {cost} credit{cost === 1 ? "" : "s"}</span></>
            )}
          </button>
          <p className="mt-2 text-center font-mono text-[10.5px] text-[#7A8294]">{DETAIL_ETA[detail]} · ctrl+enter</p>
          {status === "error" && errorMessage && (
            <p className="mt-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2 text-[12px] text-red-300">{errorMessage}</p>
          )}
        </div>
      </section>

      {/* ═══ CENTER — canvas ═══════════════════════════════════════════ */}
      <section ref={canvasRef} className="relative flex flex-1 scroll-mt-14 flex-col lg:min-h-0">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 lg:px-6">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px]">
            {activeResult ? (
              <>
                <Chip>{styleName(activeResult.styleId)}</Chip>
                <Chip>{activeResult.qualityPreset === "hd" ? "HD" : "Standard"}</Chip>
                {activeResult.resolvedView && activeResult.resolvedView !== "DEFAULT" && (
                  <Chip>{VIEW_LABEL_BY_KEY[activeResult.resolvedView] ?? activeResult.resolvedView} view</Chip>
                )}
                <Chip>seed {activeResult.seed}</Chip>
              </>
            ) : (
              <span className="text-[12px] text-[#7A8294]">Your sprite will appear here</span>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1 rounded-xl bg-white/[0.04] p-1">
            {BG_MODES.map((mode) => (
              <button key={mode.id} type="button" onClick={() => setBgMode(mode.id)} title={`${mode.label} backdrop`}
                className={`h-7 w-7 rounded-lg border-2 transition-all ${bgMode === mode.id ? "border-[#FF8A3D]" : "border-transparent hover:border-white/30"}`}
                style={{ ...(mode.style as React.CSSProperties), backgroundSize: "8px 8px" }} />
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex flex-1 items-center justify-center px-5 pb-4 lg:min-h-0 lg:px-6">
          <div className="relative aspect-square w-full max-w-[min(68vh,680px)] overflow-hidden rounded-3xl border border-white/[0.06] shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
            style={activeBg.style as React.CSSProperties}>
            {activeResult && (
              <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill unoptimized
                className={`object-contain p-[8%] transition-opacity duration-300 ${isPixelStyle(activeResult.styleId) ? "pixel-perfect" : ""} ${isGenerating ? "opacity-15" : "opacity-100"}`} />
            )}

            {isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#0B0D12]/40 px-6 backdrop-blur-[2px]">
                <div className="relative h-14 w-14">
                  <div className="absolute inset-0 rounded-full border-2 border-white/10" />
                  <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FF8A3D]" />
                  <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-[#FF8A3D]" />
                </div>
                <div className="text-center">
                  <p className="text-[14px] font-medium text-white">{progressStage}</p>
                  <p className="mt-1 text-[12px] tabular-nums text-[#8B93A5]">{elapsedSeconds}s · usually {detail === "hd" ? "~25" : "~8"}s</p>
                </div>
                <div className="h-1 w-48 overflow-hidden rounded-full bg-white/[0.08]">
                  <div className="h-full bg-gradient-to-r from-[#FF7A1A] to-[#FF9F43] transition-[width] duration-300 ease-linear"
                    style={{ width: `${Math.min(95, (elapsedMs / ((detail === "hd" ? 25 : 8) * 1000)) * 90)}%` }} />
                </div>
              </div>
            )}

            {!activeResult && !isGenerating && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8">
                <div className="text-center">
                  <p className="font-display text-[24px] font-semibold text-white">What will you create?<span className="caret" /></p>
                  <p className="mt-1.5 text-[13px] text-[#8B93A5]">Describe it on the left, or start from an example</p>
                </div>
                <div className="grid w-full max-w-md grid-cols-3 gap-2.5">
                  {SHOWCASE.slice(0, 6).map((ex) => (
                    <button key={ex.id} type="button" onClick={() => applyExample(ex)} title={`Use: ${ex.prompt}`}
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/[0.06] bg-[#151922]/80 transition-all hover:border-[#FF8A3D]/50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ex.imageUrl} alt={ex.prompt}
                        className={`absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-300 group-hover:scale-110 ${isPixelShowcase(ex) ? "pixel-perfect" : ""}`} />
                      <span className="absolute inset-x-0 bottom-0 translate-y-full bg-black/75 px-2 py-1 text-[10px] text-white transition-transform group-hover:translate-y-0">
                        {ex.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Project review bar */}
        {activeResult?.projectStatus && (
          <div className="mx-auto mb-2 flex w-full max-w-[680px] flex-wrap items-center justify-center gap-2 px-5">
            {activeResult.projectStatus === "accepted" ? (
              <>
                <span className="flex h-10 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/[0.08] px-4 text-[13px] font-medium text-emerald-200">
                  <Check className="h-4 w-4" /> Added to {activeResult.acceptedFolderName ?? "project"}
                </span>
                <button type="button" onClick={() => declineResult(activeResult)}
                  className="h-10 rounded-xl px-3 text-[12px] text-[#8B93A5] hover:text-white">Undo</button>
              </>
            ) : activeResult.projectStatus === "declined" ? (
              <>
                <span className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-[13px] text-[#8B93A5]">
                  <X className="h-4 w-4" /> Declined — kept out of the project
                </span>
                <button type="button" onClick={() => acceptResult(activeResult)}
                  className="h-10 rounded-xl px-3 text-[12px] text-[#FFB27A] hover:text-white">Accept instead</button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => acceptResult(activeResult)} disabled={activeResult.projectStatus === "accepting"}
                  className="flex h-11 min-w-[140px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 text-[14px] font-semibold text-black transition hover:bg-emerald-400 disabled:opacity-60">
                  {activeResult.projectStatus === "accepting" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Accept
                </button>
                <button type="button" onClick={() => declineResult(activeResult)} disabled={activeResult.projectStatus === "accepting"}
                  className="flex h-11 min-w-[120px] items-center justify-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.04] px-5 text-[14px] font-medium text-[#C9CFDB] transition hover:bg-white/[0.08] disabled:opacity-60">
                  <X className="h-4 w-4" /> Decline
                </button>
                {pendingResults.length > 1 && (
                  <button type="button" onClick={acceptAllPending}
                    className="h-11 rounded-xl px-3 text-[12px] text-[#8B93A5] hover:text-white">
                    Accept all ({pendingResults.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Action bar */}
        {activeResult && (
          <div className="flex flex-wrap items-center justify-center gap-2 px-5 pb-3">
            <button type="button" onClick={isPixelStyle(activeResult.styleId) ? downloadNative : handleDownload}
              className="flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-[13px] font-semibold text-black transition hover:bg-white/90">
              <Download className="h-4 w-4" /> Download PNG
            </button>
            <div className="relative">
              <button type="button" onClick={() => setSizesOpen((v) => !v)}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-[13px] text-[#C9CFDB] transition hover:bg-white/[0.08]">
                Sizes <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sizesOpen ? "rotate-180" : ""}`} />
              </button>
              {sizesOpen && (
                <div className="absolute bottom-12 left-1/2 z-20 w-52 -translate-x-1/2 rounded-xl border border-white/[0.08] bg-[#161A22] p-1.5 shadow-2xl">
                  {isPixelStyle(activeResult.styleId) && (
                    <button type="button" onClick={() => { setSizesOpen(false); downloadNative(); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] text-white hover:bg-white/[0.06]">
                      Native pixel size <span className="text-[10px] text-emerald-300">engine-ready</span>
                    </button>
                  )}
                  {[32, 64, 128, 256, 512, 1024].map((size) => (
                    <button key={size} type="button" onClick={() => { setSizesOpen(false); downloadAtSize(size); }}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-[12px] text-[#C9CFDB] hover:bg-white/[0.06]">
                      {size} × {size}px
                    </button>
                  ))}
                  <button type="button" onClick={() => { setSizesOpen(false); handleDownloadMetadata(); }}
                    className="mt-1 flex w-full items-center rounded-lg border-t border-white/[0.06] px-3 py-2 text-[12px] text-[#8B93A5] hover:bg-white/[0.06]">
                    Metadata (.json)
                  </button>
                </div>
              )}
            </div>
            {activeResult.generationId && (
              <Link href={`/animate?id=${encodeURIComponent(activeResult.generationId)}`}
                className="flex h-10 items-center gap-1.5 rounded-xl border border-[#FF8A3D]/40 bg-[#FF8A3D]/10 px-3 text-[13px] font-medium text-[#FFB27A] transition hover:bg-[#FF8A3D]/20">
                <Film className="h-4 w-4" /> Animate
              </Link>
            )}
            <IconButton title="Regenerate with the same settings" onClick={handleRegenerate} disabled={isGenerating}>
              <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
            </IconButton>
            <IconButton title="Copy seed" onClick={handleCopySeed}>
              {seedCopied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </IconButton>
          </div>
        )}

        {/* Notes: warnings / translation */}
        {activeResult && ((activeResult.warnings?.length ?? 0) > 0 || activeResult.translatedPrompt) && (
          <div className="mx-auto w-full max-w-[680px] space-y-1.5 px-5 pb-3">
            {activeResult.warnings?.map((w, i) => (
              <p key={i} className="flex items-start gap-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[11.5px] text-amber-100/90">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" /> {w}
              </p>
            ))}
            {activeResult.translatedPrompt && (
              <p className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-[11.5px] text-[#9BA3B4]">
                <span className="font-semibold text-[#C9CFDB]">EN</span>
                <span className="flex-1 truncate">{activeResult.translatedPrompt}</span>
                <button type="button" onClick={() => activeResult.translatedPrompt && setPrompt(activeResult.translatedPrompt)}
                  className="shrink-0 font-semibold text-[#FFB27A] hover:text-[#FFD0A8]">Use</button>
              </p>
            )}
          </div>
        )}

        {/* History strip (when there's no right panel) */}
        {history.length > 0 && (
          <div className="flex gap-2 overflow-x-auto px-5 pb-5 2xl:hidden">
            {history.map((item, index) => (
              <HistoryThumb key={item.id} item={item} active={selectedIndex === index} pixel={isPixelStyle(item.styleId)}
                onClick={() => setSelectedIndex(index)} className="h-16 w-16 shrink-0" />
            ))}
          </div>
        )}
      </section>

      {/* ═══ RIGHT — session history (wide screens) ═════════════════════ */}
      <aside className="hidden w-[248px] shrink-0 flex-col border-l border-white/[0.06] bg-[#0E1016] 2xl:flex">
        <div className="flex items-center justify-between px-4 py-4">
          <p className="text-[13px] font-semibold text-white">This session</p>
          <Link href="/assets" className="text-[11px] text-[#8B93A5] hover:text-white">All assets →</Link>
        </div>
        {history.length === 0 ? (
          <p className="px-4 text-[12px] leading-relaxed text-[#7A8294]">Generations appear here. Everything is also saved to your Assets.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-4">
            {history.map((item, index) => (
              <HistoryThumb key={item.id} item={item} active={selectedIndex === index} pixel={isPixelStyle(item.styleId)}
                onClick={() => setSelectedIndex(index)} className="aspect-square w-full" />
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}

// =============================================================================
// SMALL PRESENTATIONAL HELPERS
// =============================================================================

function Field({ label, action, children }: { label: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#8B93A5]">{label}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 font-mono text-[10.5px] text-[#C9CFDB]">{children}</span>;
}

function IconButton({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} disabled={disabled}
      className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.1] bg-white/[0.04] text-[#C9CFDB] transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40">
      {children}
    </button>
  );
}

function HistoryThumb({ item, active, pixel, onClick, className }: {
  item: GeneratedResult; active: boolean; pixel: boolean; onClick: () => void; className?: string;
}) {
  return (
    <button type="button" onClick={onClick} title={item.prompt}
      className={`relative overflow-hidden rounded-xl border bg-[#151922] transition-all ${
        active ? "border-[#FF8A3D] ring-2 ring-[#FF8A3D]/25" : "border-white/[0.06] opacity-70 hover:opacity-100"
      } ${className ?? ""}`}
      style={{ backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "10px 10px" }}>
      <Image src={item.imageUrl} alt="" fill unoptimized loading="lazy" className={`object-contain p-1.5 ${pixel ? "pixel-perfect" : ""} ${item.projectStatus === "declined" ? "opacity-30" : ""}`} />
      {item.projectStatus === "accepted" && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400" aria-label="Accepted">
          <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
        </span>
      )}
      {item.projectStatus === "pending" && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#FF8A3D]" aria-label="Awaiting review" />
      )}
    </button>
  );
}

const VIEW_LABEL_BY_KEY: Record<string, string> = { SIDE_VIEW: "Side", FRONT: "Front", TOP_DOWN: "Top-down" };

const PALETTE_SWATCH: Record<string, string> = {
  FANTASY_GOLD: "linear-gradient(135deg,#FFD700,#4B0082)",
  ICE_BLUE: "linear-gradient(135deg,#E0F7FF,#3B82F6)",
  DARK_SOULS: "linear-gradient(135deg,#6B7280,#111827)",
  FIRE_RED: "linear-gradient(135deg,#FDE047,#DC2626)",
  FOREST_GREEN: "linear-gradient(135deg,#86EFAC,#166534)",
  NEON_CYBER: "linear-gradient(135deg,#F0ABFC,#06B6D4)",
  PASTEL_DREAM: "linear-gradient(135deg,#FBCFE8,#C4B5FD)",
  OCEAN_DEEP: "linear-gradient(135deg,#22D3EE,#1E3A8A)",
  AUTUMN_HARVEST: "linear-gradient(135deg,#FB923C,#7C2D12)",
  MONO_BW: "linear-gradient(135deg,#FFFFFF,#111111)",
  RETRO_GAMEBOY: "linear-gradient(135deg,#9BBC0F,#0F380F)",
  SUNSET_WARM: "linear-gradient(135deg,#FDBA74,#BE185D)",
};

const SURPRISE_PROMPTS: Record<string, string[]> = {
  WEAPONS: ["frost greatsword with glowing blue runes", "ancient bronze axe with a leather grip", "elven longbow carved from silver wood", "rusty pirate cutlass", "staff topped with a floating purple crystal"],
  ARMOR: ["golden viking helmet with horns", "dragon scale chestplate", "round wooden shield with an iron rim", "enchanted leather boots with wings"],
  CONSUMABLES: ["red health potion in a round flask", "glowing blue mana elixir", "roasted chicken leg", "ancient scroll tied with a red ribbon"],
  CHARACTERS: ["dwarf blacksmith with a big hammer", "elf ranger with a green hood", "knight in silver armor with a red cape", "witch with a crooked hat and a broom"],
  CREATURES: ["green slime with big eyes", "fire-breathing baby dragon", "skeleton warrior with a rusty sword", "giant spider with glowing eyes"],
  DEFAULT: ["treasure chest overflowing with gold", "magic crystal on a stone pedestal", "wooden signpost with two arrows", "glowing campfire with logs"],
};
