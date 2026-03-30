"use client";

import { useState, useCallback, useRef, Suspense } from "react";
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
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { ChevronDown } from "lucide-react";

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

const PALETTE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "warm", label: "Warm fantasy" },
  { id: "cold", label: "Cold / ice" },
  { id: "dark", label: "Dark & muted" },
  { id: "vibrant", label: "Vibrant" },
  { id: "earthy", label: "Earthy natural" },
  { id: "neon", label: "Neon / cyber" },
] as const;

type PaletteId = (typeof PALETTE_OPTIONS)[number]["id"];

const BG_OUTPUT_OPTIONS = [
  { id: "transparent", label: "Transparent" },
  { id: "dark", label: "Solid dark" },
  { id: "light", label: "Solid light" },
] as const;

type BgOutputId = (typeof BG_OUTPUT_OPTIONS)[number]["id"];

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
  const [bgOutput, setBgOutput]           = useState<BgOutputId>("transparent");
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
  const activeResult = history[selectedIndex] ?? null;
  const selectedSub  = selectedCategory.subcategories.find((s) => s.subcategoryId === selectedSubcategoryId) ?? selectedCategory.subcategories[0];
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;

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
          projectId:     projectId || undefined,
          folderId:      folderId || undefined,
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
  // RENDER — Meshy-style 3-panel layout
  // ==========================================================================
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Styled select component
  const Sel = ({ label, req, value, onChange, options }: {
    label: string; req?: boolean; value: string;
    onChange: (v: string) => void; options: { id: string; label: string }[];
  }) => (
    <div>
      <label className="block text-[10px] font-medium text-white/30 mb-1">
        {label}{req && <span className="text-[#FF6B2C]">*</span>}
      </label>
      <div className="relative">
        <select value={value} onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none px-3 py-2 pr-7 rounded-lg bg-[#141821] border border-white/6 text-[13px] text-white/80 outline-none focus:border-[#FF6B2C]/20 cursor-pointer">
          {options.map((o) => <option key={o.id} value={o.id} className="bg-[#141821]">{o.label}</option>)}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/15 pointer-events-none" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0c10] flex flex-col lg:flex-row">

      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL — Controls (fixed width, scrollable)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[300px] xl:w-[320px] lg:h-screen lg:overflow-y-auto lg:border-r border-white/5 bg-[#0d1017] shrink-0">
        <div className="p-4 space-y-4">

          {/* Panel header */}
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold text-white/80">New Asset</h2>
            <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded">1 credit</span>
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-[10px] font-medium text-white/30 mb-1">
              Prompt<span className="text-[#FF6B2C]">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-[#141821] border border-white/6 text-[13px] text-white/85 resize-none outline-none focus:border-[#FF6B2C]/20 placeholder:text-white/12 leading-relaxed"
            />
            {prompt.length === 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[
                  selectedSub.subcategoryId === "SWORDS" ? "fire sword with glowing runes" :
                  selectedSub.subcategoryId === "POTIONS" ? "red health potion, glowing" :
                  selectedSub.subcategoryId === "HEROES" ? "dark wizard with staff" :
                  selectedSub.subcategoryId === "ENEMIES" ? "skeleton warrior" :
                  selectedSub.subcategoryId === "HELMETS" ? "golden viking helmet" :
                  `${selectedSub.label.toLowerCase()} with detail`,
                ].map((ex) => (
                  <button key={ex} type="button" onClick={() => setPrompt(ex)}
                    className="px-1.5 py-0.5 text-[9px] rounded bg-white/4 text-white/20 hover:text-[#FF6B2C]/60 transition-all">
                    {ex}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Style + Category */}
          <Sel label="Style" req value={styleId} onChange={setStyleId}
            options={GENERATE_STYLES.map((s) => ({ id: s.id, label: s.name }))} />

          <Sel label="Category" req value={selectedCategory.id}
            onChange={(v) => { const c = GENERATE_CATEGORIES.find((x) => x.id === v); if (c) handleCategoryChange(c); }}
            options={GENERATE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }))} />

          <Sel label="Subcategory" req value={selectedSubcategoryId}
            onChange={(v) => { const s = selectedCategory.subcategories.find((x) => x.subcategoryId === v); if (s) handleSubcategoryChange(s); }}
            options={selectedCategory.subcategories.map((s) => ({ id: s.subcategoryId, label: s.label }))} />

          {/* View + Quality row */}
          <div className="grid grid-cols-2 gap-3">
            <Sel label="View" req value={view} onChange={(v) => setView(v as ViewId)}
              options={VIEW_OPTIONS.map((v) => ({ id: v.id, label: v.label }))} />
            <Sel label="Quality" req value={detail} onChange={(v) => setDetail(v as DetailId)}
              options={DETAIL_OPTIONS.map((d) => ({ id: d.id, label: d.label }))} />
          </div>

          {/* Palette + Background */}
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Palette" value={palette} onChange={(v) => setPalette(v as PaletteId)}
              options={PALETTE_OPTIONS.map((p) => ({ id: p.id, label: p.label }))} />
            <Sel label="Background" value={bgOutput} onChange={(v) => setBgOutput(v as BgOutputId)}
              options={BG_OUTPUT_OPTIONS.map((b) => ({ id: b.id, label: b.label }))} />
          </div>

          {/* Advanced */}
          <div className="border-t border-white/5 pt-3">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between text-[10px] font-medium text-white/25 hover:text-white/40 transition-colors">
              Advanced
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] text-white/25 shrink-0">Seed</label>
                  <input type="number" min={0} max={2147483647} placeholder="Random" value={seed}
                    onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                    className="flex-1 px-2 py-1.5 rounded bg-[#141821] border border-white/6 text-[11px] text-white/60 outline-none placeholder:text-white/12" />
                  {activeResult && (
                    <button onClick={handleLockSeed}
                      className={`text-[10px] px-2 py-1.5 rounded transition-all ${seedLocked ? "bg-[#FF6B2C]/10 text-[#FF6B2C]" : "text-white/20 hover:text-white/40 bg-white/4"}`}>
                      {seedLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Generate button */}
          <Button onClick={handleGenerate} disabled={!isFormValid || isGenerating}
            className="w-full h-11 text-[13px] font-semibold rounded-lg bg-linear-to-r from-[#FF6B2C] to-[#e55a1f] text-white border-0 transition-all hover:opacity-90"
            size="lg">
            {isGenerating
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Generating…</>
              : <>Generate</>}
          </Button>

          {status === "error" && errorMessage && (
            <div className="p-2.5 rounded-lg border border-red-500/15 bg-red-500/5">
              <p className="text-red-400 text-[11px]">{errorMessage}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER — Preview area (flexible)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] lg:min-h-screen p-4 lg:p-8">

        {/* Preview canvas */}
        <div className="w-full max-w-[520px] aspect-square rounded-xl border border-white/5 bg-[#11151b] overflow-hidden relative"
          style={activeBg.style as React.CSSProperties}>

          {activeResult && (
            <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
              className={`object-contain p-8 transition-opacity ${isGenerating ? "opacity-15" : "opacity-100"}`}
              unoptimized />
          )}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-[#FF6B2C]/15 border-t-[#FF6B2C] animate-spin" />
              <p className="text-[11px] text-white/20">Generating…</p>
            </div>
          )}
          {!activeResult && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-white/5" />
              <p className="text-[13px] font-medium text-white/15">What will you create today?</p>
              <p className="text-[11px] text-white/8">Fill in the details on the left and click Generate</p>
            </div>
          )}
        </div>

        {/* Actions below preview */}
        {activeResult && (
          <div className="w-full max-w-[520px] mt-3 flex items-center gap-2">
            <Button onClick={handleDownload} className="flex-1 h-9 text-[11px] font-medium bg-white/5 hover:bg-white/8 text-white/60 border-0 rounded-lg">
              <Download className="w-3.5 h-3.5 mr-1.5" />Download PNG
            </Button>
            <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}
              className="h-9 px-3 border-white/6 hover:bg-white/4 text-white/30 rounded-lg">
              <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
            </Button>
            <button onClick={handleCopySeed} className="h-9 px-3 text-[10px] text-white/15 hover:text-white/30 transition-colors">
              {seedCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}

        {/* BG toggle */}
        {activeResult && (
          <div className="flex gap-1 mt-2">
            {BG_MODES.map((mode) => (
              <button key={mode.id} onClick={() => setBgMode(mode.id)}
                className={`px-2 py-0.5 rounded text-[9px] transition-colors ${
                  bgMode === mode.id ? "text-[#FF6B2C] bg-[#FF6B2C]/8" : "text-white/15 hover:text-white/30"
                }`}>
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* Enhanced prompt */}
        {activeResult?.enhancedPrompt && (
          <p className="max-w-[520px] mt-3 text-[10px] text-white/15 text-center italic leading-relaxed">
            &ldquo;{activeResult.enhancedPrompt}&rdquo;
          </p>
        )}

        {/* Session history thumbnails */}
        {history.length > 1 && (
          <div className="max-w-[520px] w-full mt-6">
            <p className="text-[9px] text-white/15 uppercase tracking-wider mb-2">Session · {history.length}</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {history.map((item, index) => (
                <button key={item.id} onClick={() => setSelectedIndex(index)}
                  className={`relative w-12 h-12 rounded-lg shrink-0 overflow-hidden transition-all ${
                    selectedIndex === index ? "ring-1 ring-[#FF6B2C]/50" : "opacity-40 hover:opacity-80"
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
