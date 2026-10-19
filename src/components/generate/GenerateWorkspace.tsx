"use client";

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react";
import { STYLE_MATCH_CREDITS } from "@/config/tool-prices";
import { supportsRotation } from "@/config/animations";
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
  ChevronDown,
  Eye,
  X,
  Film,
  Paintbrush,
  PartyPopper,
  Compass,
  Pencil,
  Eraser,
  Maximize2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import {
  Field, Chip, ToolTabs, ErrorNote, IconButton, Elapsed, SECONDARY_BTN, saveBlobAs, creditLabel,
} from "@/components/tools/ToolWorkspace";
import { SpriteStage, STAGE_SCENES, zoomLabel, type StageSceneId } from "@/components/generate/SpriteStage";
import { RecipeBar } from "@/components/generate/RecipeBar";
import { UploadSpriteButton, UploadSpriteCard } from "@/components/generate/UploadSprite";
import { track, FUNNEL } from "@/lib/analytics";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { SHOWCASE, isPixelShowcase } from "@/data/showcase";
import { useAutoSettings } from "@/hooks/useAutoSettings";
import { AutoSettingsBar, AutoBadge, autoFlash } from "@/components/generate/AutoSettingsBar";
import { useCreateSession, type CreateRestore } from "@/components/generate/useCreateSession";
import { HistoryButton, HistoryPanel } from "@/components/workspace/HistoryPanel";
import { ContinueBanner, RestoredNote } from "@/components/workspace/ContinueBanner";
import { fetchImage } from "@/lib/cors-image";

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
  { id: "normal", label: "Standard", description: "Fast & clean · ~8s" },
  { id: "hd",     label: "HD",       description: "Best detail & accuracy · ~25s" },
] as const;

const DETAIL_CREDITS: Record<DetailId, number> = { normal: 1, hd: 3 };
const DETAIL_SECONDS: Record<DetailId, number> = { normal: 8, hd: 25 };

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
  // Style reference: new sprites are drawn in this sprite's exact art style
  const [styleRef, setStyleRef]           = useState<{ id: string; imageUrl: string } | null>(null);
  const [seed, setSeed]                   = useState("");
  const [palette, setPalette]              = useState<PaletteId>("auto");
  const [pose, setPose]                    = useState<PoseId>("auto");
  // Stage scene (remembered per browser) and side-by-side comparison
  const [scene, setScene]                 = useState<StageSceneId>("checker");
  const [compare, setCompare]             = useState(false);
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("sl:stage-scene");
      if (saved && STAGE_SCENES.some((x) => x.id === saved)) setScene(saved as StageSceneId);
    } catch { /* storage unavailable */ }
  }, []);
  const chooseScene = (id: StageSceneId) => {
    setScene(id);
    try { window.localStorage.setItem("sl:stage-scene", id); } catch { /* storage unavailable */ }
  };
  const [seedLocked, setSeedLocked]       = useState(false);

  const [status, setStatus]               = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);

  const [history, setHistory]             = useState<GeneratedResult[]>(initialHistory);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [styleLocked, setStyleLocked]     = useState(false);
  const [seedCopied, setSeedCopied]       = useState(false);
  const seedRef                           = useRef("");

  // Auto-settings: the prompt picks asset type, style, view, palette and pose.
  // Never overrides a control set by hand (or by a shared link) this session.
  const auto = useAutoSettings({
    prompt,
    values: { groupId: selectedCategory.id, subcategoryId: selectedSubcategoryId, styleId, view, palette, pose },
    apply: (p) => {
      const cat = p.groupId ? GENERATE_CATEGORIES.find((c) => c.id === p.groupId) : undefined;
      if (cat) setSelectedCategory(cat);
      if (p.subcategoryId) setSelectedSubcategoryId(p.subcategoryId);
      if (p.styleId) setStyleId(p.styleId);
      if (p.view) setView(p.view as ViewId);
      if (p.palette) setPalette(p.palette as PaletteId);
      if (p.pose) setPose(p.pose as PoseId);
    },
    initiallyUserSet: urlPrompt
      ? [...(urlCatId || urlSubId ? ["type" as const] : []), ...(urlStyleId ? ["style" as const] : []), ...(urlView ? ["view" as const] : [])]
      : [],
  });

  // Continue where you left off: draft / ?result= restore + history panel (see useCreateSession)
  const [historyOpen, setHistoryOpen] = useState(false);
  const applySession = useCallback((p: CreateRestore) => {
    const f = p.form ?? {};
    const sub = f.subcategoryId;
    const hasSub = (c: GenerateCategory) => !!sub && c.subcategories.some((s) => s.subcategoryId === sub);
    const group = GENERATE_CATEGORIES.find((c) => c.id === f.groupId && (!sub || hasSub(c))) ?? GENERATE_CATEGORIES.find(hasSub);
    if (group) {
      setSelectedCategory(group);
      setSelectedSubcategoryId(hasSub(group) ? sub! : group.subcategories[0].subcategoryId);
    }
    if (f.styleId && (ALL_GENERATE_STYLE_IDS as readonly string[]).includes(f.styleId)) setStyleId(f.styleId);
    if (VIEW_OPTIONS.some((o) => o.id === f.view)) setView(f.view as ViewId);
    if (DETAIL_OPTIONS.some((o) => o.id === f.detail)) setDetail(f.detail as DetailId);
    if (PALETTE_OPTIONS.some((o) => o.id === f.palette)) setPalette(f.palette as PaletteId);
    if (POSE_OPTIONS.some((o) => o.id === f.pose)) setPose(f.pose as PoseId);
    if (typeof f.prompt === "string") setPrompt(f.prompt);
    if (p.results) setHistory(p.results);
    if (typeof p.selectedIndex === "number") setSelectedIndex(p.selectedIndex);
  }, []);
  const session = useCreateSession({
    state: { prompt, groupId: selectedCategory.id, subcategoryId: selectedSubcategoryId, styleId, view, detail, palette, pose },
    results: history, selectedIndex, projectId, apply: applySession,
  });

  const isGenerating = status === "generating";
  const activeResult = history[selectedIndex] ?? null;
  const selectedSub  = selectedCategory.subcategories.find((s) => s.subcategoryId === selectedSubcategoryId) ?? selectedCategory.subcategories[0];
  // Camera view only changes the result for figures and world objects — items,
  // icons and tiles always come out front-on, so the selector is hidden there.
  const viewApplies = VIEW_CATEGORIES.has(selectedSub.categoryId);
  const effectiveView: ViewId = viewApplies ? view : "none";
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;

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
          styleReferenceId: styleRef?.id,
          seed:           seedRef.current.trim() || undefined,
          // Project mode does NOT file the sprite on generation — the user
          // reviews it first and Accept files it (POST /api/projects/:id/assets).
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 402 || data.noCredits) {
          setStatus("error");
          const needed = styleRef ? STYLE_MATCH_CREDITS : DETAIL_CREDITS[detail];
          setErrorMessage(`Not enough credits — this needs ${creditLabel(needed)}.${!styleRef && detail === "hd" ? " Switch to Standard (1 credit) or top up." : " Top up to keep creating."}`);
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
  }, [isFormValid, isGenerating, effectiveView, pose, prompt, selectedSub, selectedSubcategoryId, styleId, detail, palette, styleLocked, projectId, history.length, styleRef]);

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
    track(FUNNEL.assetDownload, { kind: "sprite", format: `png_${size}` });
    try {
      const response = await fetchImage(activeResult.imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const filename = `${buildBaseFilename(size)}.png`;

      // Native size (1024) — skip the resize round-trip.
      if (size === 1024) {
        saveBlobAs(blob, filename);
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
      saveBlobAs(resizedBlob, filename);
    } catch {
      window.open(activeResult.imageUrl, "_blank", "noopener");
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
    track(FUNNEL.assetDownload, { kind: "sprite", format: "png_native" });
    try {
      const blob = await (await fetchImage(activeResult.imageUrl)).blob();
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
      saveBlobAs(outBlob, `${buildBaseFilename(size)}.png`);
    } catch {
      window.open(activeResult.imageUrl, "_blank", "noopener");
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
    const blob = new Blob([JSON.stringify(sidecar, null, 2)], { type: "application/json" });
    saveBlobAs(blob, `${buildBaseFilename(1024)}.json`);
  };

  const handleCopySeed = () => {
    if (!activeResult) return;
    (navigator.clipboard?.writeText(String(activeResult.seed)) ?? Promise.reject(new Error("no clipboard")))
      .then(() => {
        setSeedCopied(true);
        setTimeout(() => setSeedCopied(false), 2000);
      })
      .catch(() => {});
  };

  // ==========================================================================
  // RENDER — workspace (Meshy / Tripo style): controls · canvas · history
  // ==========================================================================
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sizesOpen, setSizesOpen] = useState(false);
  // Stage zoom: steps away from "fit" (whole pixels for pixel art); back to fit for every new sprite
  const [zoom, setZoom] = useState(0);
  const [fitK, setFitK] = useState<number | null>(null);
  const activeImage = activeResult?.imageUrl;
  useEffect(() => { setZoom(0); }, [activeImage]);
  const isWelcome = searchParams.get("welcome") === "1";
  const checkoutSuccess = searchParams.get("success") === "true";
  const checkoutPlan = searchParams.get("plan");
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(isWelcome || checkoutSuccess);

  // First-run onboarding: pre-fill an example prompt so the user can hit
  // Generate immediately. Without this nudge new signups stare at an empty
  // form and bounce.
  useEffect(() => {
    try {
      if (window.localStorage.getItem("spritelab_seen_first_run")) return;
      window.localStorage.setItem("spritelab_seen_first_run", "1");
    } catch {
      return; // storage blocked — skip the onboarding nudge
    }
    if (!urlPrompt && !prompt) {
      const placeholderExample = SUBTYPE_PLACEHOLDERS[selectedSub.subcategoryId];
      setPrompt((placeholderExample ?? "").replace(/^e\.g\.\s*/i, "") || `${selectedSub.label.toLowerCase()} with detail`);
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Other sizes" menu: close on outside click / Escape.
  const sizesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!sizesOpen) return;
    const onDown = (e: PointerEvent) => {
      if (!sizesRef.current?.contains(e.target as Node)) setSizesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setSizesOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [sizesOpen]);

  // On stacked (mobile) layouts the canvas sits below the form — bring it
  // into view when a generation starts so the user sees progress.
  const canvasRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (isGenerating && window.innerWidth < 1024) {
      canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isGenerating]);

  const cost = styleRef ? STYLE_MATCH_CREDITS : DETAIL_CREDITS[detail];
  const isCreature = selectedCategory.id === "CHARACTERS" || selectedCategory.id === "CREATURES";
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

  const planName = checkoutPlan ? (CHECKOUT_PLAN_NAMES[checkoutPlan.toLowerCase()] ?? null) : null;
  const defaultSubId = selectedCategory.subcategories[0].subcategoryId;
  // How many "More options" differ from their defaults (shown on the closed toggle)
  const advancedSet = [palette !== "auto", isCreature && pose !== "auto", seed.trim() !== "", selectedSubcategoryId !== defaultSubId].filter(Boolean).length;

  return (
    <div className="flex min-h-screen flex-col bg-[#131A31] text-[#FFF1E8] lg:h-screen lg:flex-row lg:overflow-hidden">

      {/* ═══ MAIN — header · stage · actions · recipe ═══════════════════ */}
      <section aria-label="Create a sprite" className="flex min-w-0 flex-1 flex-col lg:min-h-0">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <h1 className="font-display text-[20px] font-semibold text-[#FFF1E8]">Create</h1>
          <div className="min-w-0 flex-1 basis-[260px] [&>div]:mt-0"><ToolTabs active="generate" generationId={activeResult?.generationId} /></div>
          <div className="flex flex-wrap items-center gap-1.5">
            <UploadSpriteButton />
            <HistoryButton onClick={() => setHistoryOpen(true)} />
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* LEFT — upload or describe, then the recipe */}
          <aside aria-label="Make a sprite" className="space-y-3 px-4 pt-3 sm:px-5 lg:w-[368px] lg:shrink-0 lg:overflow-y-auto lg:border-r lg:border-white/[0.06] lg:px-4 lg:pb-24">
            <UploadSpriteCard />
          {(showWelcomeBanner || (!projectId && !showWelcomeBanner) || session.restoredNote || projectId) && (
            <div className="space-y-2 empty:hidden">
              {showWelcomeBanner && (
                <div role="status" className="flex items-start gap-2.5 rounded-[10px] border border-[#FFA300]/30 bg-[#FFA300]/[0.08] py-2.5 pl-3 pr-1.5">
                  <PartyPopper className="mt-0.5 h-4 w-4 shrink-0 text-[#FFA300]" aria-hidden />
                  <p className="min-w-0 flex-1 text-[13px] leading-snug text-[#FFF1E8]">
                    {checkoutSuccess
                      ? <>Payment confirmed{planName ? ` — your ${planName} plan is active` : ""}. Your credits are ready to use.</>
                      : <>Welcome to SpriteLab! Your free credits are ready. We filled in an example, so just press <b className="font-semibold text-white">Create sprite</b>.</>}
                  </p>
                  <button type="button" aria-label="Dismiss message" onClick={() => setShowWelcomeBanner(false)}
                    className="-my-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] text-[#C8CCE8] transition-colors hover:bg-white/[0.06] hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
              {!showWelcomeBanner && !projectId && <ContinueBanner current="create" />}
              {session.restoredNote && <RestoredNote onStartFresh={session.startFresh} onDismiss={session.dismissRestoredNote} />}
              {projectId && (
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-[10px] border border-[#FFA300]/30 bg-[#FFA300]/[0.06] px-3 py-2">
                  {projectError ? (
                    <p role="alert" className="text-[12.5px] text-red-200">
                      {projectError} <Link href="/projects" className="font-semibold text-[#FFC857] hover:text-white">Open projects</Link>
                    </p>
                  ) : (
                    <>
                      <p className="min-w-0 text-[13px] text-[#C8CCE8]">Project <Link href={`/projects/${encodeURIComponent(projectId)}`} className="font-semibold text-[#FFF1E8] underline-offset-2 hover:underline">{project?.name ?? "Loading…"}</Link></p>
                      <label className="flex items-center gap-2 text-[12.5px] text-[#A7ADD4]">
                        Accept into
                        <select value={targetFolderId} onChange={(e) => setTargetFolderId(e.target.value)} disabled={!project}
                          className="h-9 rounded-[7px] border border-white/[0.1] bg-[#212B4E] px-2 text-[12.5px] text-white outline-none focus:border-[#FFA300] disabled:opacity-60">
                          <option value="">Auto-sort by type</option>
                          {project?.folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                        </select>
                      </label>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
  
            {/* Recipe */}
          <div>
            <RecipeBar
              layout="panel"
              prompt={prompt} onPrompt={setPrompt} placeholder={placeholder}
              onSubmit={handleGenerate} onSurprise={surpriseMe}
              generating={isGenerating} canSubmit={isFormValid} cost={cost} costLabel={creditLabel(cost)}
              loadingLabel={<>Creating… <Elapsed /></>}
              styles={GENERATE_STYLES} styleId={styleId} onStyle={setStyleId} isPixel={isPixelStyle}
              categories={GENERATE_CATEGORIES} categoryId={selectedCategory.id} onCategory={handleCategoryChange}
              subcategoryId={selectedSubcategoryId}
              onSubcategory={(id) => { const s = selectedCategory.subcategories.find((x) => x.subcategoryId === id); if (s) handleSubcategoryChange(s); }}
              views={viewApplies ? { options: VIEW_OPTIONS, value: view, onChange: (id) => setView(id as ViewId) } : undefined}
              poses={isCreature ? { options: POSE_OPTIONS, value: pose, onChange: (id) => setPose(id as PoseId) } : undefined}
              quality={{ options: DETAIL_OPTIONS.map((d) => ({ id: d.id, label: d.label, desc: d.description })), value: detail, onChange: (id) => setDetail(id as DetailId), credits: DETAIL_CREDITS, disabled: !!styleRef }}
              isAuto={(slot) => slot !== "quality" && auto.isAuto(slot)}
              tools={
                <button type="button" onClick={() => setShowAdvanced((v) => !v)} aria-expanded={showAdvanced} aria-controls="generate-more-options"
                  className="btn btn-ghost gap-1 px-2.5 text-[12.5px]">
                  More{advancedSet > 0 ? ` · ${advancedSet}` : ""} <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} aria-hidden />
                </button>
              }
              extras={
                <div className="mt-2 space-y-2 empty:hidden">
                  {styleRef && (
                    <div className="flex items-center gap-2.5 rounded-[10px] border border-[#FFA300]/40 bg-[#FFA300]/[0.06] p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={styleRef.imageUrl} alt="" className="pixel-perfect h-10 w-10 shrink-0 rounded-[6px] bg-[#131A31] object-contain p-0.5" />
                      <span className="min-w-0 flex-1 text-[12.5px] text-[#FFF1E8]">Matching this sprite&apos;s style <span className="text-[#A7ADD4]">· {STYLE_MATCH_CREDITS} credits per sprite</span></span>
                      <button type="button" onClick={() => setStyleRef(null)} aria-label="Stop matching this style"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[7px] text-[#A7ADD4] hover:bg-white/[0.06] hover:text-white"><X className="h-4 w-4" /></button>
                    </div>
                  )}
                  {promptQuality && promptQuality.level !== "good" && (
                    <p className={`px-1 text-[12.5px] ${promptQuality.level === "ok" ? "text-amber-200/85" : "text-rose-200/85"}`}>{promptQuality.hint}</p>
                  )}
                  <AutoSettingsBar enabled={auto.enabled} onToggle={auto.setEnabled} changes={auto.changes} onUndo={auto.undo}
                    labels={{ view: VIEW_OPTIONS, palette: PALETTE_OPTIONS, pose: POSE_OPTIONS }} />
                  {viewConflict && detectedView && detectedViewLabel && (
                    <button type="button" onClick={() => setView(detectedView)}
                      className="flex w-full items-start gap-2 rounded-[8px] border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-left text-[12.5px] text-amber-100/90 hover:bg-amber-400/[0.1]">
                      <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
                      <span>Your description mentions a <b>{detectedViewLabel}</b> view. Tap to set the view to match.</span>
                    </button>
                  )}
                  {showAdvanced && (
                    <div id="generate-more-options" className="grid gap-4 rounded-[10px] border border-white/[0.08] p-3 sm:grid-cols-2">
                      <Field label={<>Color palette<AutoBadge show={auto.isAuto("palette")} /></>} hint={palette === "auto" ? "Auto lets the style choose the colours." : PALETTE_OPTIONS.find((p) => p.id === palette)?.label}>
                        <div className={`flex flex-wrap gap-1${autoFlash(auto.isFlashing("palette"))}`}>
                          {PALETTE_OPTIONS.map((p) => {
                            const active = p.id === palette;
                            return p.id === "auto" ? (
                              <button key={p.id} type="button" onClick={() => setPalette(p.id)} aria-pressed={active}
                                className={`flex h-10 items-center rounded-[7px] border-2 px-3 text-[12px] font-medium text-[#C8CCE8] ${active ? "border-white bg-white/[0.08]" : "border-transparent bg-white/[0.06] hover:border-white/40"}`}>Auto</button>
                            ) : (
                              <button key={p.id} type="button" onClick={() => setPalette(p.id)} title={p.label} aria-label={`${p.label} palette`} aria-pressed={active}
                                className="group flex h-10 w-10 items-center justify-center rounded-[7px]">
                                <span aria-hidden className={`block h-7 w-7 rounded-[5px] border-2 ${active ? "border-white" : "border-transparent group-hover:border-white/40"}`} style={{ background: PALETTE_SWATCH[p.id] }} />
                              </button>
                            );
                          })}
                        </div>
                      </Field>
                      <Field label="Seed" labelFor="generate-seed"
                        hint={seedDriftWarning
                          ? <span className="text-amber-200/90">Seed is locked but you changed <b>{seedDriftWarning.join(", ")}</b>, so the result will differ.</span>
                          : "Same seed + same settings = the same sprite. Leave empty for a new one each time."}>
                        <div className="flex gap-2">
                          <input id="generate-seed" type="number" inputMode="numeric" min={0} max={2147483647} placeholder="Random" value={seed}
                            onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                            className="h-10 min-w-0 flex-1 rounded-[8px] border border-white/[0.1] bg-[#131A31] px-3 text-[13px] text-white outline-none placeholder:text-[#8A92BF] focus:border-[#FFA300]" />
                          {activeResult && (
                            <button type="button" onClick={handleLockSeed} aria-pressed={seedLocked} aria-label={seedLocked ? "Unlock the seed" : "Reuse the seed of the current sprite"}
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[8px] border ${seedLocked ? "border-[#FFA300]/50 bg-[#FFA300]/10 text-[#FFC857]" : "border-white/[0.1] text-[#A7ADD4] hover:text-white"}`}>
                              {seedLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                            </button>
                          )}
                        </div>
                      </Field>
                    </div>
                  )}
                  {status === "error" && errorMessage && <ErrorNote>{errorMessage}</ErrorNote>}
                </div>
              }
            />
          </div>
            </aside>

          {/* CENTER — the stage, then what to do next */}
          <div className="flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-y-auto">
          {/* Canvas toolbar: scene, compare, zoom */}
          <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 sm:px-5">
            <div role="group" aria-label="Scene" className="sl-track max-w-full overflow-x-auto">
              {STAGE_SCENES.map((s) => (
                <button key={s.id} type="button" onClick={() => chooseScene(s.id)} aria-pressed={scene === s.id} title={`${s.label} scene`}
                  className="sl-seg sl-seg-solid shrink-0">
                  {s.label}
                </button>
              ))}
            </div>
            {history.length > 1 && (
              <button type="button" onClick={() => setCompare((v) => !v)} aria-pressed={compare} title="Stand the previous sprite next to this one, at the same scale"
                className="btn btn-secondary">
                Compare
              </button>
            )}
            {activeResult && (
              <div role="group" aria-label="Zoom" className="sl-track ml-auto items-center">
                <button type="button" onClick={() => setZoom((z) => Math.max(-3, z - 1))} disabled={zoom <= -3 || (fitK !== null && fitK + zoom <= 1)} aria-label="Zoom out"
                  className="sl-seg w-9 px-0 disabled:pointer-events-none disabled:opacity-40"><ZoomOut className="h-4 w-4" /></button>
                <span className="min-w-[3.25rem] text-center font-mono text-[12px] text-[#FFF1E8]" aria-live="polite">{zoomLabel(zoom, activeResult ? isPixelStyle(activeResult.styleId) : false, fitK)}</span>
                <button type="button" onClick={() => setZoom((z) => Math.min(8, z + 1))} disabled={zoom >= 8} aria-label="Zoom in"
                  className="sl-seg w-9 px-0 disabled:pointer-events-none disabled:opacity-40"><ZoomIn className="h-4 w-4" /></button>
                <button type="button" onClick={() => setZoom(0)} disabled={zoom === 0} title="Fit the sprite to the stage"
                  className="sl-seg disabled:pointer-events-none disabled:opacity-40">Fit</button>
              </div>
            )}
          </div>
            {/* Stage */}
          <div ref={canvasRef as React.RefObject<HTMLDivElement>} className="relative mx-4 mt-2 aspect-[4/3] sm:mx-5 lg:aspect-auto lg:min-h-[360px] lg:flex-1">
            <SpriteStage imageUrl={activeResult?.imageUrl ?? null} pixel={activeResult ? isPixelStyle(activeResult.styleId) : false}
              compareUrl={compare ? history[selectedIndex + 1]?.imageUrl ?? history[0]?.imageUrl : null}
              comparePixel={compare ? isPixelStyle((history[selectedIndex + 1] ?? history[0])?.styleId ?? "") : false}
              scene={scene} dim={isGenerating} alt={activeResult?.prompt ?? ""} zoom={zoom} onFit={setFitK}>
              {activeResult && (
                <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-wrap gap-1">
                  <Chip>{styleName(activeResult.styleId)}</Chip>
                  <Chip>{activeResult.qualityPreset === "hd" ? "HD" : "Standard"}</Chip>
                  {activeResult.resolvedView && activeResult.resolvedView !== "DEFAULT" && <Chip>{VIEW_LABEL_BY_KEY[activeResult.resolvedView] ?? activeResult.resolvedView} view</Chip>}
                </div>
              )}
              {isGenerating && <GenerateProgress expectedSeconds={DETAIL_SECONDS[detail]} />}
              {!activeResult && !isGenerating && (
                <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-3 p-4 pt-[8%] sm:gap-4">
                  <p className="rounded-[8px] bg-[#131A31]/80 px-3 py-1.5 text-center font-display text-[18px] font-semibold text-[#FFF1E8] sm:text-[22px]">What goes on stage first?</p>
                  <div className="grid w-full max-w-[300px] grid-cols-3 gap-2 sm:max-w-md">
                    {SHOWCASE.slice(0, 6).map((ex) => (
                      <button key={ex.id} type="button" onClick={() => applyExample(ex)} title={`Use: ${ex.prompt}`} aria-label={`Use example: ${ex.prompt}`}
                        className="checker checker-sm relative aspect-square overflow-hidden rounded-[8px] border border-white/[0.12] transition-colors hover:border-[#FFA300]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={ex.imageUrl} alt="" decoding="async" className={`absolute inset-0 h-full w-full object-contain p-2.5 ${isPixelShowcase(ex) ? "pixel-perfect" : ""}`} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SpriteStage>
          </div>
  
            {/* Under the stage: project review, actions, notes */}
          <div className="px-4 pb-24 pt-2 sm:px-5 lg:pb-4">
            {activeResult?.projectStatus && (
              <div aria-live="polite" className="mb-2 flex flex-wrap items-center gap-2">
                {activeResult.projectStatus === "accepted" ? (
                  <>
                    <span className="flex min-h-10 items-center gap-2 rounded-[8px] border border-emerald-400/30 bg-emerald-500/[0.08] px-3 text-[13px] font-medium text-emerald-200">
                      <Check className="h-4 w-4 shrink-0" aria-hidden /> Added to {activeResult.acceptedFolderName ?? "the project"}
                    </span>
                    <button type="button" onClick={() => declineResult(activeResult)} className="h-10 rounded-[8px] px-3 text-[13px] font-medium text-[#A7ADD4] hover:text-white">Undo</button>
                  </>
                ) : activeResult.projectStatus === "declined" ? (
                  <>
                    <span className="flex min-h-10 items-center gap-2 rounded-[8px] border border-white/[0.1] px-3 text-[13px] text-[#A7ADD4]">
                      <X className="h-4 w-4 shrink-0" aria-hidden /> Declined, not added to the project
                    </span>
                    <button type="button" onClick={() => acceptResult(activeResult)} className="h-10 rounded-[8px] px-3 text-[13px] font-medium text-[#FFC857] hover:text-white">Accept instead</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => acceptResult(activeResult)} disabled={activeResult.projectStatus === "accepting"}
                      className="flex h-10 min-w-[120px] items-center justify-center gap-2 rounded-[8px] bg-[#00E436] px-4 text-[13.5px] font-semibold text-[#131A31] transition hover:brightness-110 disabled:opacity-60">
                      {activeResult.projectStatus === "accepting" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Check className="h-4 w-4" aria-hidden />} Accept
                    </button>
                    <button type="button" onClick={() => declineResult(activeResult)} disabled={activeResult.projectStatus === "accepting"}
                      className="flex h-10 items-center gap-2 rounded-[8px] border border-white/[0.14] px-4 text-[13.5px] font-medium text-[#C8CCE8] hover:text-white disabled:opacity-60">
                      <X className="h-4 w-4" aria-hidden /> Decline
                    </button>
                    {pendingResults.length > 1 && (
                      <button type="button" onClick={acceptAllPending} className="h-10 rounded-[8px] px-3 text-[13px] font-medium text-[#A7ADD4] hover:text-white">Accept all ({pendingResults.length})</button>
                    )}
                  </>
                )}
              </div>
            )}
  
            {activeResult && (() => {
              const gid = activeResult.generationId ? encodeURIComponent(activeResult.generationId) : null;
              const canTurn = supportsRotation(activeResult.categoryId);
              return (
              // Everything you can do next with this sprite, in three groups: move it, change it, take it
              <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-2">
                <ActionGroup title="Animate it">
                  {gid && (
                    <Link href={`/animate?id=${gid}`}
                      className="btn btn-primary">
                      <Film className="h-4 w-4" aria-hidden /> Animate · sprite sheet
                    </Link>
                  )}
                  {gid && canTurn && (
                    <Link href={`/animate?id=${gid}&do=rotate4`} title="The same sprite from the front, sides and back" className={SECONDARY_BTN}>
                      <Compass className="h-4 w-4" aria-hidden /> Directions
                    </Link>
                  )}
                </ActionGroup>
                <ActionGroup title="Change it">
                  {gid && (
                    <Link href={`/edit?id=${gid}`} title="Change colours, clothes or details by describing them" className={SECONDARY_BTN}>
                      <Pencil className="h-4 w-4" aria-hidden /> Edit
                    </Link>
                  )}
                  {activeResult.generationId && styleRef?.id !== activeResult.generationId && (
                    <button type="button" title={`Make new sprites in this exact style (${STYLE_MATCH_CREDITS} credits each)`}
                      onClick={() => setStyleRef({ id: activeResult.generationId!, imageUrl: activeResult.imageUrl })} className={SECONDARY_BTN}>
                      <Paintbrush className="h-4 w-4" aria-hidden /> Match style
                    </button>
                  )}
                  {gid && (
                    <Link href={`/remove-bg?id=${gid}`} title="Clean up the background" className={SECONDARY_BTN}>
                      <Eraser className="h-4 w-4" aria-hidden /> Remove BG
                    </Link>
                  )}
                  {gid && (
                    <Link href={`/upscale?id=${gid}`} title="Bigger, sharper copy" className={SECONDARY_BTN}>
                      <Maximize2 className="h-4 w-4" aria-hidden /> Upscale
                    </Link>
                  )}
                  <IconButton label="Generate again with the same settings" onClick={handleRegenerate} disabled={isGenerating || !isFormValid}>
                    <RefreshCw className={`h-4 w-4 ${isGenerating ? "animate-spin" : ""}`} />
                  </IconButton>
                </ActionGroup>
                <ActionGroup title="Download">
                  <button type="button" onClick={isPixelStyle(activeResult.styleId) ? downloadNative : handleDownload}
                    title={isPixelStyle(activeResult.styleId) ? "Download at the sprite's real pixel size (engine-ready)" : "Download as a 1024px PNG"}
                    className="btn btn-light">
                    <Download className="h-4 w-4" aria-hidden /> PNG
                  </button>
                  <div className="relative" ref={sizesRef}>
                    <button type="button" onClick={() => setSizesOpen((v) => !v)} aria-haspopup="menu" aria-expanded={sizesOpen} className={SECONDARY_BTN}>
                      Sizes <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sizesOpen ? "rotate-180" : ""}`} aria-hidden />
                    </button>
                    {sizesOpen && (
                      <div role="menu" aria-label="Download sizes" className="absolute bottom-12 right-0 z-20 w-56 rounded-[10px] border border-white/[0.1] bg-[#1B2446] p-1.5 shadow-2xl">
                        {isPixelStyle(activeResult.styleId) && (
                          <button type="button" role="menuitem" onClick={() => { setSizesOpen(false); downloadNative(); }}
                            className="flex min-h-10 w-full items-center justify-between rounded-[7px] px-3 text-[13px] text-white hover:bg-white/[0.06]">
                            Real pixel size <span className="text-[11.5px] text-[#00E436]">engine-ready</span>
                          </button>
                        )}
                        {[32, 64, 128, 256, 512, 1024].map((size) => (
                          <button key={size} type="button" role="menuitem" onClick={() => { setSizesOpen(false); downloadAtSize(size); }}
                            className="flex min-h-10 w-full items-center rounded-[7px] px-3 font-mono text-[13px] text-[#C8CCE8] hover:bg-white/[0.06] hover:text-white">
                            {size} × {size} px
                          </button>
                        ))}
                        <button type="button" role="menuitem" onClick={() => { setSizesOpen(false); handleDownloadMetadata(); }}
                          className="mt-1 flex min-h-10 w-full items-center rounded-[7px] border-t border-white/[0.06] px-3 text-[12.5px] text-[#A7ADD4] hover:bg-white/[0.06] hover:text-white">
                          Settings file (.json)
                        </button>
                      </div>
                    )}
                  </div>
                  <IconButton label={seedCopied ? "Seed copied" : `Copy seed ${activeResult.seed}`} onClick={handleCopySeed}>
                    {seedCopied ? <Check className="h-4 w-4 text-[#00E436]" /> : <Copy className="h-4 w-4" />}
                  </IconButton>
                </ActionGroup>
              </div>
              );
            })()}
  
            {activeResult && ((activeResult.warnings?.length ?? 0) > 0 || activeResult.translatedPrompt) && (
              <div className="mt-2 space-y-1.5">
                {activeResult.warnings?.map((w, i) => /use Animate/i.test(w) && activeResult.generationId ? (
                  // The prompt asked for a sheet: make the next step impossible to miss
                  <div key={i} className="flex flex-col gap-2 rounded-[10px] border border-[#FFA300]/45 bg-[#FFA300]/[0.08] p-3 sm:flex-row sm:items-center">
                    <p className="min-w-0 flex-1 text-[13.5px] leading-snug text-[#FFF1E8]">{w}</p>
                    <Link href={`/animate?id=${encodeURIComponent(activeResult.generationId)}`}
                      className="btn btn-primary h-11 shrink-0 text-[14px]">
                      <Film className="h-4 w-4" aria-hidden /> Make the sprite sheet
                    </Link>
                  </div>
                ) : (
                  <p key={i} className="flex items-start gap-2 rounded-[8px] border border-amber-400/20 bg-amber-400/[0.05] px-3 py-2 text-[12.5px] text-amber-100/90">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden /> <span className="flex-1">{w}</span>
                    {/use Animate/i.test(w) && activeResult.generationId && (
                      <Link href={`/animate?id=${encodeURIComponent(activeResult.generationId)}`} className="-my-2 inline-flex min-h-9 shrink-0 items-center font-semibold text-[#FFC857] hover:text-white">Animate it</Link>
                    )}
                  </p>
                ))}
                {activeResult.translatedPrompt && (
                  <p className="flex items-center gap-2 rounded-[8px] bg-white/[0.04] py-1 pl-3 pr-1 text-[12.5px] text-[#A7ADD4]">
                    <span className="font-semibold text-[#C8CCE8]" title="Translated to English">EN</span>
                    <span className="min-w-0 flex-1 truncate" title={activeResult.translatedPrompt}>{activeResult.translatedPrompt}</span>
                    <button type="button" onClick={() => activeResult.translatedPrompt && setPrompt(activeResult.translatedPrompt)} title="Put the English version in the prompt box"
                      className="min-h-10 shrink-0 rounded-[7px] px-3 font-semibold text-[#FFC857] hover:bg-white/[0.04] hover:text-white">Use</button>
                  </p>
                )}
              </div>
            )}
  
            {history.length > 0 && (
              <div role="group" aria-label="This session" className="mt-2 flex gap-1.5 overflow-x-auto pb-1 xl:hidden">
                {history.map((item, index) => (
                  <HistoryThumb key={item.id} item={item} active={selectedIndex === index} pixel={isPixelStyle(item.styleId)}
                    onClick={() => setSelectedIndex(index)} className="h-14 w-14 shrink-0" />
                ))}
              </div>
            )}
          </div>
  
          </div>
        </div>
      </section>

      {/* ═══ RIGHT — inventory (column from xl, bottom sheet below) ═══ */}
      <HistoryPanel tool="create" open={historyOpen} onOpenChange={setHistoryOpen} onSelect={session.openFromHistory}
        activeIds={[session.activeGenerationId]} refreshKey={history[0]?.generationId} />
    </div>
  );
}

// =============================================================================
// SMALL PRESENTATIONAL HELPERS
// =============================================================================

const CHECKOUT_PLAN_NAMES: Record<string, string> = { starter: "Starter", pro: "Pro", unlimited: "Studio", studio: "Studio", lifetime: "Lifetime" };

const PROGRESS_STAGES: [number, string][] = [
  [3, "Preparing the prompt…"],
  [8, "Sending to the model…"],
  [18, "Drawing your sprite…"],
  [30, "Cleaning up the background…"],
  [60, "Almost there — the model is busy…"],
];

/**
 * Canvas overlay while a sprite generates. Owns its timer so the ticking
 * clock re-renders only this overlay, not the whole workspace.
 */
function GenerateProgress({ expectedSeconds }: { expectedSeconds: number }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setMs(Date.now() - start), 250);
    return () => clearInterval(id);
  }, []);
  const seconds = Math.floor(ms / 1000);
  const stage = PROGRESS_STAGES.find(([until]) => seconds < until)?.[1] ?? "Hang tight — this one is taking a while…";
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[#131A31]/40 px-6 backdrop-blur-[2px]">
      <div className="relative h-14 w-14" aria-hidden>
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-[#FFA300]" />
        <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-[#FFA300]" />
      </div>
      <div className="text-center">
        <p role="status" className="text-[14px] font-medium text-white">{stage}</p>
        <p className="mt-1 font-mono text-[12px] tabular-nums text-[#9AA1CC]">{seconds}s · usually ~{expectedSeconds}s</p>
      </div>
      <div className="h-1 w-48 overflow-hidden rounded-full bg-white/[0.08]" aria-hidden>
        <div className="h-full bg-[#FFA300] transition-[width] duration-300 ease-linear"
          style={{ width: `${Math.min(95, (ms / (expectedSeconds * 1000)) * 90)}%` }} />
      </div>
    </div>
  );
}

function HistoryThumb({ item, active, pixel, onClick, className }: {
  item: GeneratedResult; active: boolean; pixel: boolean; onClick: () => void; className?: string;
}) {
  const reviewState = item.projectStatus === "accepted" ? " (accepted)" : item.projectStatus === "pending" ? " (awaiting review)" : item.projectStatus === "declined" ? " (declined)" : "";
  return (
    <button type="button" onClick={onClick} title={item.prompt} aria-label={`${item.prompt}${reviewState}`} aria-pressed={active}
      className={`checker checker-sm sl-thumb relative overflow-hidden ${active ? "" : "opacity-80 hover:opacity-100"} ${className ?? ""}`}>
      <Image src={item.imageUrl} alt="" fill unoptimized loading="lazy" sizes="120px" className={`object-contain p-1.5 ${pixel ? "pixel-perfect" : ""} ${item.projectStatus === "declined" ? "opacity-30" : ""}`} />
      {item.projectStatus === "accepted" && (
        <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400" aria-hidden>
          <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
        </span>
      )}
      {item.projectStatus === "pending" && (
        <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-[#FFA300]" aria-hidden />
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

/** One labelled cluster of next-step actions under the stage. */
function ActionGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-label={title} className="sl-panel min-w-0 p-2.5">
      <h3 className="sl-label px-0.5 pb-2">{title}</h3>
      <div className="flex flex-wrap items-center gap-1.5">{children}</div>
    </section>
  );
}
