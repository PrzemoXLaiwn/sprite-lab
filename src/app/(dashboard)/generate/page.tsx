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
  // RENDER — Premium dark creative tool layout
  // ==========================================================================
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0c10]">

      {/* ── Page header ──────────────────────────────────────────── */}
      <div className="border-b border-white/5 bg-[#0d1017]">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-sm font-semibold text-white/90">Create Game Asset</h1>
            <p className="text-[11px] text-white/30 mt-0.5">
              {selectedCategory.label} → {selectedSub.label}
            </p>
          </div>
          {history.length > 0 && (
            <span className="text-[11px] text-white/25">{history.length} created</span>
          )}
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_460px] gap-5 items-start">

          {/* ════════════════════════════════════════════════════════
              LEFT — Generator controls
          ════════════════════════════════════════════════════════ */}
          <div className="space-y-3">

            {/* ── DESCRIBE ───────────────────────────────────────── */}
            <section className="rounded-lg border border-white/5 bg-[#11151b] p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Describe</h2>
                <span className={`text-[10px] font-medium ${promptQuality.color}`}>
                  {promptQuality.level !== "empty" ? promptQuality.label : ""}
                </span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                maxLength={500}
                rows={3}
                className="w-full px-3.5 py-3 rounded-md bg-[#0a0c10] border border-white/6 text-sm text-white/90 resize-none outline-none focus:border-[#FF6B2C]/40 transition-colors placeholder:text-white/15"
              />
              {prompt.length === 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
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
                    <button key={ex} type="button" onClick={() => setPrompt(ex)}
                      className="px-2 py-0.5 text-[10px] rounded bg-white/4 text-white/25 hover:text-[#FF6B2C]/70 hover:bg-[#FF6B2C]/8 transition-all">
                      {ex}
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-2.5">
                <PromptChips categoryId={selectedCategory.id} onChipClick={handleChipClick} />
              </div>
            </section>

            {/* ── STRUCTURE ──────────────────────────────────────── */}
            <section className="rounded-lg border border-white/5 bg-[#11151b] p-4">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Structure</h2>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-white/30 mb-1.5">Asset Type</p>
                  <CategorySelector selectedCategoryId={selectedCategory.id} onSelect={handleCategoryChange} />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-1.5">Category</p>
                  <SubcategoryChips subcategories={selectedCategory.subcategories} selectedId={selectedSubcategoryId} onSelect={handleSubcategoryChange} />
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-1.5">View</p>
                  <div className="flex gap-1">
                    {VIEW_OPTIONS.map((v) => (
                      <button key={v.id} onClick={() => setView(v.id as ViewId)} title={v.desc}
                        className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          view === v.id ? "bg-[#FF6B2C]/12 text-[#FF6B2C]" : "text-white/35 hover:text-white/55 hover:bg-white/4"
                        }`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── STYLE ──────────────────────────────────────────── */}
            <section className="rounded-lg border border-white/5 bg-[#11151b] p-4">
              <h2 className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-3">Style</h2>
              <StyleSelector selectedStyleId={styleId} onSelect={setStyleId} />
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-white/30">Quality</p>
                  <div className="flex gap-1">
                    {DETAIL_OPTIONS.map((d) => (
                      <button key={d.id} onClick={() => setDetail(d.id as DetailId)} title={d.description}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                          detail === d.id ? "bg-[#FF6B2C]/12 text-[#FF6B2C]" : "text-white/35 hover:text-white/55 hover:bg-white/4"
                        }`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* ── ADVANCED (collapsed) ────────────────────────────── */}
            <section className="rounded-lg border border-white/5 bg-[#11151b]">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs text-white/40 hover:text-white/60 transition-colors"
              >
                <span className="font-semibold uppercase tracking-wider">Advanced</span>
                <span className="text-[10px]">{showAdvanced ? "▲" : "▼"}</span>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 pt-1 border-t border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <label className="text-[11px] text-white/30 shrink-0 w-12">Seed</label>
                    <input
                      type="number" min={0} max={2147483647} placeholder="Random" value={seed}
                      onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                      className="flex-1 px-2.5 py-1.5 rounded-md bg-[#0a0c10] border border-white/6 text-xs text-white/80 outline-none focus:border-[#FF6B2C]/30 placeholder:text-white/15"
                    />
                    {activeResult && (
                      <button onClick={handleLockSeed}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                          seedLocked ? "bg-[#FF6B2C]/12 text-[#FF6B2C]" : "text-white/30 hover:text-white/50 hover:bg-white/4"
                        }`}>
                        {seedLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        {seedLocked ? "Locked" : "Lock"}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ── GENERATE ────────────────────────────────────────── */}
            <Button
              onClick={handleGenerate}
              disabled={!isFormValid || isGenerating}
              className="w-full h-12 text-sm font-bold rounded-lg bg-[#FF6B2C] hover:bg-[#FF6B2C]/90 text-white shadow-lg shadow-[#FF6B2C]/15 hover:shadow-[#FF6B2C]/30 transition-all border-0"
              size="lg"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating asset…</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate · 1 credit</>
              )}
            </Button>

            {status === "error" && errorMessage && (
              <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-sm">
                <p className="text-red-400 font-medium text-xs">{errorMessage}</p>
                {!noCredits && <p className="text-white/30 text-[10px] mt-1">No credits were charged.</p>}
              </div>
            )}
          </div>

          {/* ════════════════════════════════════════════════════════
              RIGHT — Preview + History
          ════════════════════════════════════════════════════════ */}
          <div className="space-y-3 lg:sticky lg:top-4">

            {/* ── Result ─────────────────────────────────────────── */}
            <div className="rounded-lg border border-white/5 bg-[#11151b] overflow-hidden">
              {/* BG toggle */}
              <div className="flex border-b border-white/5">
                {BG_MODES.map((mode) => (
                  <button key={mode.id} onClick={() => setBgMode(mode.id)}
                    className={`flex-1 py-2 text-[10px] font-medium transition-colors ${
                      bgMode === mode.id ? "text-[#FF6B2C] bg-[#FF6B2C]/5" : "text-white/25 hover:text-white/40"
                    }`}>
                    {mode.label}
                  </button>
                ))}
              </div>

              {/* Canvas */}
              <div className="relative aspect-square" style={activeBg.style as React.CSSProperties}>
                {activeResult && (
                  <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
                    className={`object-contain p-6 transition-opacity ${isGenerating ? "opacity-20" : "opacity-100"}`}
                    unoptimized />
                )}
                {isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-full border-2 border-[#FF6B2C]/20 border-t-[#FF6B2C] animate-spin" />
                    <p className="text-xs text-white/30">Creating…</p>
                  </div>
                )}
                {!activeResult && !isGenerating && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-lg bg-white/3 border border-white/5 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-white/10" />
                    </div>
                    <p className="text-xs text-white/15">Your asset will appear here</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              {activeResult && (
                <div className="px-4 py-3 border-t border-white/5 space-y-2.5">
                  {activeResult.enhancedPrompt && (
                    <div className="px-3 py-2 rounded-md bg-[#FF6B2C]/5 border border-[#FF6B2C]/10">
                      <p className="text-[10px] font-semibold text-[#FF6B2C]/80 mb-0.5">Enhanced prompt</p>
                      <p className="text-[11px] text-white/40 leading-relaxed">{activeResult.enhancedPrompt}</p>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <button onClick={handleCopySeed} className="flex items-center gap-1.5 text-[11px] text-white/25 hover:text-white/50 transition-colors">
                      {seedCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                      Seed: {activeResult.seed}
                    </button>
                    <button onClick={handleLockSeed}
                      className={`text-[10px] px-2 py-1 rounded transition-all ${seedLocked ? "text-[#FF6B2C] bg-[#FF6B2C]/10" : "text-white/25 hover:text-white/40"}`}>
                      {seedLocked ? "Locked" : "Lock seed"}
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleDownload} className="flex-1 h-9 text-xs font-semibold bg-white/6 hover:bg-white/10 text-white/80 border-0">
                      <Download className="w-3.5 h-3.5 mr-1.5" /> Download PNG
                    </Button>
                    <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}
                      className="h-9 px-3 border-white/6 hover:bg-white/5 text-white/40">
                      <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* ── History ─────────────────────────────────────────── */}
            {history.length > 0 && (
              <div className="rounded-lg border border-white/5 bg-[#11151b] p-3">
                <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider mb-2">
                  Session · {history.length}
                </p>
                <div className="grid grid-cols-6 gap-1.5">
                  {history.map((item, index) => (
                    <button key={item.id} onClick={() => setSelectedIndex(index)}
                      className={`relative aspect-square rounded overflow-hidden transition-all ${
                        selectedIndex === index ? "ring-1 ring-[#FF6B2C]/60" : "opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundImage: "repeating-conic-gradient(#80808010 0% 25%, transparent 0% 50%)", backgroundSize: "8px 8px" }}>
                      <Image src={item.imageUrl} alt={item.prompt} fill className="object-contain p-0.5" unoptimized loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
