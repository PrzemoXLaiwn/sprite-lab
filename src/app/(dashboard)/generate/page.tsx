"use client";

import { useState, useCallback, useRef, useEffect, Suspense } from "react";
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
  History,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { CategorySelector } from "@/components/generate/CategorySelector";
import { SubcategoryChips } from "@/components/generate/SubcategoryChips";
import { PromptChips } from "@/components/generate/PromptChips";
import { StyleSelector } from "@/components/generate/StyleSelector";

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

const DETAIL_OPTIONS = [
  { id: "draft",  label: "Fast",   description: "Quick, icon-safe" },
  { id: "normal", label: "Medium", description: "Balanced quality" },
  { id: "hd",     label: "HD",     description: "Max detail" },
] as const;

type DetailId = (typeof DETAIL_OPTIONS)[number]["id"];

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

function getPromptQuality(prompt: string): { level: "empty" | "short" | "ok" | "good"; label: string; color: string } {
  const words = prompt.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return { level: "empty", label: "Describe your asset above", color: "text-muted-foreground/40" };
  if (words < 3)   return { level: "short", label: "Too short — add color, material, details", color: "text-orange-400" };
  if (words < 7)   return { level: "ok",    label: "Good — more detail improves results", color: "text-yellow-400" };
  return               { level: "good",  label: "Detailed prompt — great results likely", color: "text-green-400" };
}

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
  prompt: string;
  enhancedPrompt?: string;
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

  // Pre-fill from URL params (e.g. from "Use this prompt" in gallery)
  const urlPrompt  = searchParams.get("prompt") ?? "";
  const urlStyleId = searchParams.get("styleId") ?? "";

  const [selectedCategory, setSelectedCategory] = useState<GenerateCategory>(GENERATE_CATEGORIES[0]);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState(GENERATE_CATEGORIES[0].subcategories[0].subcategoryId);
  const [styleId, setStyleId]             = useState(
    urlStyleId && (ALL_GENERATE_STYLE_IDS as readonly string[]).includes(urlStyleId) ? urlStyleId : "PIXEL_ART_16"
  );
  const [view, setView]                   = useState<ViewId>("none");
  const [detail, setDetail]               = useState<DetailId>("normal");
  const [prompt, setPrompt]               = useState(urlPrompt);
  const [seed, setSeed]                   = useState("");
  const [bgMode, setBgMode]               = useState<BgModeId>("checker");
  const [seedLocked, setSeedLocked]       = useState(false);

  const [status, setStatus]               = useState<"idle" | "generating" | "error">("idle");
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [noCredits, setNoCredits]         = useState(false);

  const [history, setHistory]             = useState<GeneratedResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [styleLocked, setStyleLocked]     = useState(false);
  const [seedCopied, setSeedCopied]       = useState(false);
  const seedRef                           = useRef("");

  const isGenerating = status === "generating";
  const activeResult = history[selectedIndex] ?? null;
  const selectedSub  = selectedCategory.subcategories.find((s) => s.subcategoryId === selectedSubcategoryId) ?? selectedCategory.subcategories[0];
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const promptQuality = getPromptQuality(prompt);
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;

  // Pre-fill from URL params
  useEffect(() => {
    const urlCatId = searchParams.get("categoryId");
    const urlSubId = searchParams.get("subcategoryId");
    if (!urlCatId || !urlSubId) return;
    const cat = GENERATE_CATEGORIES.find((c) => c.id === urlCatId);
    if (cat) {
      const sub = cat.subcategories.find((s) => s.subcategoryId === urlSubId);
      if (sub) {
        setSelectedCategory(cat);
        setSelectedSubcategoryId(sub.subcategoryId);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCategoryChange = (cat: GenerateCategory) => {
    setSelectedCategory(cat);
    setSelectedSubcategoryId(cat.subcategories[0].subcategoryId);
  };

  const handleSubcategoryChange = (sub: GenerateSubcategory) => {
    setSelectedSubcategoryId(sub.subcategoryId);
  };

  // Append chip word to prompt
  const handleChipClick = (chip: string) => {
    setPrompt((prev) => {
      const trimmed = prev.trimEnd();
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return prev;
      return trimmed ? trimmed + ", " + chip : chip;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (!isFormValid || isGenerating) return;

    setStatus("generating");
    setErrorMessage(null);
    setNoCredits(false);

    // Map frontend view IDs to backend view keys
    const viewMap: Record<string, string> = {
      none: "DEFAULT",
      side: "SIDE_VIEW",
      front: "FRONT",
      topdown: "TOP_DOWN",
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:        prompt.trim(),
          categoryId:    selectedSub.categoryId,
          subcategoryId: selectedSubcategoryId,
          styleId:       styleId,
          view:          viewMap[view] || "DEFAULT",
          qualityPreset: detail,
          seed:          seedRef.current.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 402 || data.noCredits) {
          setNoCredits(true);
          setStatus("error");
          setErrorMessage("You don't have enough credits to generate.");
          triggerUpgradeModal();
          return;
        }
        throw new Error(data.error ?? "Generation failed. Please try again.");
      }

      if (!data.imageUrl) throw new Error("Generation failed. Please try again.");

      const newResult: GeneratedResult = {
        id:            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl:      data.imageUrl,
        seed:          data.seed ?? 0,
        categoryId:    selectedSub.categoryId,
        subcategoryId: selectedSubcategoryId,
        styleId:       styleId,
        prompt:        prompt.trim(),
        enhancedPrompt: data.enhancedPrompt,
      };

      setHistory((prev) => [newResult, ...prev].slice(0, 12));
      setSelectedIndex(0);
      setStatus("idle");

      if (!styleLocked) setStyleLocked(true);
      triggerCreditsRefresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }, [isFormValid, isGenerating, view, prompt, selectedSub, selectedSubcategoryId, styleId, detail, styleLocked]);

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

  const handleDownload = async () => {
    if (!activeResult) return;
    try {
      const response = await fetch(activeResult.imageUrl);
      const blob     = await response.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = `spritelab-${activeResult.subcategoryId.toLowerCase()}-${activeResult.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      window.open(activeResult.imageUrl, "_blank");
    }
  };

  const handleCopySeed = () => {
    if (!activeResult) return;
    navigator.clipboard.writeText(String(activeResult.seed));
    setSeedCopied(true);
    setTimeout(() => setSeedCopied(false), 2000);
  };

  // ==========================================================================
  // RENDER
  // ==========================================================================
  return (
    <div className="min-h-screen p-3 sm:p-4 md:p-8 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-5 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Create Game Asset</h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-0.5">
            Pick a type, choose a style, describe what you need.
          </p>
        </div>
        {history.length > 0 && (
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {history.length} generated this session
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4 sm:gap-5 lg:gap-6 items-start">

        {/* ================================================================
            LEFT COLUMN — Form
        ================================================================ */}
        <div className="space-y-6">

          {/* ── Step 1: Category ─────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">1</span>
              <p className="text-sm font-semibold text-foreground">What are you creating?</p>
            </div>
            <CategorySelector
              selectedCategoryId={selectedCategory.id}
              onSelect={handleCategoryChange}
            />
            <div className="mt-4">
              <p className="text-[11px] text-muted-foreground/60 uppercase tracking-wider mb-2">Subcategory</p>
              <SubcategoryChips
                subcategories={selectedCategory.subcategories}
                selectedId={selectedSubcategoryId}
                onSelect={handleSubcategoryChange}
              />
            </div>
          </div>

          {/* ── Step 2: Style ────────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">2</span>
              <p className="text-sm font-semibold text-foreground">Choose art style</p>
            </div>
            <StyleSelector selectedStyleId={styleId} onSelect={setStyleId} />

            {/* View + Quality — inline row */}
            <div className="mt-4 pt-4 border-t border-border/50 flex flex-wrap gap-x-6 gap-y-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0">View</span>
                <div className="flex gap-1">
                  {VIEW_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id as ViewId)}
                      title={v.desc}
                      className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${view === v.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground/50 uppercase tracking-wider shrink-0">Quality</span>
                <div className="flex gap-1">
                  {DETAIL_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDetail(d.id as DetailId)}
                      title={d.description}
                      className={`px-2 py-1 rounded-md border text-[11px] font-medium transition-all ${detail === d.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 text-muted-foreground hover:border-primary/40 hover:text-foreground"}`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Step 3: Describe ──────────────────────────────────────── */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/15 text-primary text-xs font-bold">3</span>
                <p className="text-sm font-semibold text-foreground">Describe your {selectedSub.label.toLowerCase()}</p>
              </div>
              <span className={`text-[10px] font-medium ${promptQuality.color} transition-colors`}>
                {promptQuality.level !== "empty" ? promptQuality.label : ""}
              </span>
            </div>

            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                maxLength={200}
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-border bg-background text-sm resize-none outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/40"
              />
              {prompt.length > 150 && (
                <span className="absolute bottom-3 right-3.5 text-[10px] text-muted-foreground">
                  {prompt.length}/200
                </span>
              )}
            </div>

            {prompt.length === 0 && (
              <div className="mt-2 space-y-1.5">
                <p className="text-[10px] text-muted-foreground/40">
                  Try an example:
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    selectedSub.subcategoryId === "SWORDS" ? "fire sword with glowing runes" :
                    selectedSub.subcategoryId === "POTIONS" ? "red health potion, glowing" :
                    selectedSub.subcategoryId === "HEROES" ? "dark wizard with staff and pointed hat" :
                    selectedSub.subcategoryId === "ENEMIES" ? "skeleton warrior with rusty sword" :
                    selectedSub.subcategoryId === "HELMETS" ? "golden viking helmet with horns" :
                    selectedSub.subcategoryId === "GEMS" ? "glowing blue sapphire gem" :
                    selectedSub.subcategoryId === "ANIMALS" ? "fierce wolf, silver fur" :
                    `${selectedSub.label.toLowerCase()} with magical glow`,
                  ].map((ex) => (
                    <button
                      key={ex}
                      type="button"
                      onClick={() => setPrompt(ex)}
                      className="px-2 py-0.5 text-[10px] rounded border border-primary/20 bg-primary/5 text-primary/60 hover:bg-primary/10 hover:text-primary transition-all"
                    >
                      &quot;{ex}&quot;
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Contextual prompt chips */}
            <div className="mt-3">
              <PromptChips categoryId={selectedCategory.id} onChipClick={handleChipClick} />
            </div>

            {/* Seed row */}
            <div className="mt-4 pt-3 border-t border-border/50 flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 font-medium">Seed:</label>
              <input
                type="number"
                min={0}
                max={2147483647}
                placeholder="Random"
                value={seed}
                onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                className="flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/50"
              />
              {activeResult && (
                <button
                  onClick={handleLockSeed}
                  title={seedLocked ? "Unlock seed (randomize)" : "Lock this seed (same composition)"}
                  className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${seedLocked ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"}`}
                >
                  {seedLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  {seedLocked ? "Locked" : "Lock"}
                </button>
              )}
            </div>
          </div>

          {/* ── Generate button ───────────────────────────────────────── */}
          <div className="space-y-2">
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid || isGenerating}
              className="w-full h-11 text-sm font-bold rounded-xl shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating… ~5s
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate · ⚡ 1 credit
                </>
              )}
            </Button>
            {!isFormValid && prompt.length > 0 && prompt.length < 3 && (
              <p className="text-[10px] text-center text-muted-foreground/40">
                Add at least 3 characters to your description
              </p>
            )}
          </div>

          {/* ── Error ─────────────────────────────────────────────────── */}
          {status === "error" && errorMessage && (
            <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-sm space-y-1">
              <p className="text-destructive font-semibold">{errorMessage}</p>
              {!noCredits && (
                <p className="text-muted-foreground text-xs">No credits were charged.</p>
              )}
            </div>
          )}
        </div>

        {/* ================================================================
            RIGHT COLUMN — Result + History
        ================================================================ */}
        <div className="space-y-4 lg:sticky lg:top-6">

          {/* ── Result panel ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Result</p>
              {activeResult && (
                <span className="text-[10px] text-muted-foreground">
                  {GENERATE_CATEGORIES.flatMap((c) => c.subcategories).find((s) => s.subcategoryId === activeResult.subcategoryId)?.label ?? activeResult.subcategoryId} · {GENERATE_STYLES.find((s) => s.id === activeResult.styleId)?.name ?? activeResult.styleId}
                </span>
              )}
            </div>

            {/* Background preview toggle */}
            <div className="flex border-b border-border">
              {BG_MODES.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => setBgMode(mode.id)}
                  className={`flex-1 py-1.5 text-[10px] font-medium transition-colors ${bgMode === mode.id ? "bg-primary/10 text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            {/* Canvas */}
            <div
              className="relative aspect-square"
              style={activeBg.style as React.CSSProperties}
            >
              {activeResult && (
                <Image
                  src={activeResult.imageUrl}
                  alt={activeResult.prompt}
                  fill
                  className={`object-contain p-4 transition-opacity duration-200 ${isGenerating ? "opacity-30" : "opacity-100"}`}
                  unoptimized
                />
              )}

              {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                    <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">Creating your asset…</p>
                </div>
              )}

              {!activeResult && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                  <div className="flex gap-2">
                    {["⚔️", "🧪", "🧙"].map((e, i) => (
                      <div key={i} className="w-10 h-10 rounded-lg bg-white/[0.03] border border-white/[0.06] flex items-center justify-center text-lg opacity-30">
                        {e}
                      </div>
                    ))}
                  </div>
                  <div className="text-center space-y-0.5">
                    <p className="text-sm font-medium text-muted-foreground/30">Your asset will appear here</p>
                    <p className="text-[10px] text-muted-foreground/20">Choose a category and describe what you need</p>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            {activeResult && (
              <div className="px-4 py-3 border-t border-border space-y-3">
                {/* Enhanced prompt badge */}
                {activeResult.enhancedPrompt && (
                  <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">AI Enhanced</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      {activeResult.enhancedPrompt}
                    </p>
                  </div>
                )}

                {/* Seed row */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleCopySeed}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {seedCopied ? <Check className="w-3 h-3 text-green-500 shrink-0" /> : <Copy className="w-3 h-3 shrink-0" />}
                    <span>Seed: {activeResult.seed}</span>
                  </button>
                  <button
                    onClick={handleLockSeed}
                    className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border transition-all ${seedLocked ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-primary hover:border-primary/40"}`}
                  >
                    {seedLocked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
                    {seedLocked ? "Seed locked" : "Lock seed"}
                  </button>
                </div>

                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1 font-semibold">
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    title={seedLocked ? "Regenerate with same seed" : "Regenerate with new seed"}
                    className="px-3 gap-1.5"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                    {seedLocked && <Lock className="w-2.5 h-2.5 text-primary" />}
                  </Button>
                </div>

                {seedLocked && (
                  <p className="text-[10px] text-primary/70 text-center">
                    Seed locked — regenerating keeps the same composition
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Session history ───────────────────────────────────────── */}
          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                  This session ({history.length})
                </p>
              </div>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                {history.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`relative aspect-square rounded-lg border overflow-hidden transition-all ${selectedIndex === index ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-primary/50"}`}
                    style={{
                      backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)",
                      backgroundSize: "10px 10px",
                    }}
                    title={item.prompt}
                  >
                    <Image
                      src={item.imageUrl}
                      alt={item.prompt}
                      fill
                      className="object-contain p-0.5"
                      unoptimized
                      loading="lazy"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
