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
    <div className="min-h-screen sl-atmo-bg flex flex-col lg:flex-row">

      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL — Controls (fixed width, scrollable)
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[320px] xl:w-[340px] lg:h-screen lg:overflow-y-auto lg:border-r border-white/[0.08] sl-panel-vivid sl-sidebar-sheen shrink-0">
        <div className="p-5 pb-8 space-y-6 relative z-10">

          {/* Panel header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <h2 className="text-[16px] font-bold text-white tracking-tight drop-shadow-[0_1px_8px_rgba(255,255,255,0.08)]">New Asset</h2>
            <span className="text-[11px] text-[#ffd8c7] bg-gradient-to-r from-[#FF6B2C]/35 to-[#ff8e5f]/25 px-3.5 py-1 rounded-full font-semibold border border-[#FF6B2C]/45 shadow-[0_0_14px_rgba(255,107,44,0.2)]">1 credit</span>
          </div>

          {/* ── PROMPT ────────────────────────────────────────── */}
          <div>
            <label className="block text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
              Prompt<span className="text-[#FF6B2C] ml-0.5">*</span>
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={placeholder}
              maxLength={500}
              rows={5}
              className="w-full px-4 py-3.5 rounded-xl bg-gradient-to-b from-[#171d28] to-[#141821] border-2 border-white/[0.08] text-[14px] text-white/90 resize-none outline-none focus:border-[#FF6B2C]/40 focus:shadow-[0_0_20px_rgba(255,107,44,0.1),inset_0_1px_0_rgba(0,0,0,0.2)] focus:from-[#1a2030] focus:to-[#161c26] placeholder:text-white/25 leading-relaxed transition-all duration-200 hover:border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15),inset_0_-1px_0_rgba(255,255,255,0.02)]"
            />
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
                    className="px-2.5 py-1.5 text-[10px] rounded-lg bg-gradient-to-b from-[#171d28] to-[#141821] text-white/40 hover:text-[#FF6B2C] hover:from-[#FF6B2C]/10 hover:to-[#FF6B2C]/5 transition-all duration-200 border border-white/[0.06] hover:border-[#FF6B2C]/25 font-medium shadow-[0_1px_2px_rgba(0,0,0,0.15)] hover:shadow-[0_2px_8px_rgba(255,107,44,0.08)] active:scale-[0.97] cursor-pointer">
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {prompt.length > 0 && (
              <div className="mt-1 text-right">
                <span className="text-[9px] text-white/15">{prompt.length}/500</span>
              </div>
            )}
          </div>

          {/* ── STRUCTURE ─────────────────────────────────────── */}
          <div className="pt-1 space-y-3">
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Structure</p>

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
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Output</p>

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
                  color: p.id === "warm" ? "#f97316" : p.id === "cold" ? "#3b82f6" : p.id === "dark" ? "#374151" : p.id === "vibrant" ? "#ec4899" : p.id === "earthy" ? "#92400e" : p.id === "neon" ? "#a855f7" : undefined,
                }))} />
              <Sel label="Background" value={bgOutput} onChange={(v) => setBgOutput(v as BgOutputId)}
                options={BG_OUTPUT_OPTIONS.map((b) => ({ id: b.id, label: b.label }))} />
            </div>
          </div>

          {/* ── ADVANCED ──────────────────────────────────────── */}
          <div className="pt-3 border-t border-white/[0.06]">
            <button onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between py-2 text-[10px] font-bold text-white/25 hover:text-white/50 transition-all duration-200 uppercase tracking-widest cursor-pointer">
              Advanced
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAdvanced ? "rotate-180 text-[#FF6B2C]" : ""}`} />
            </button>
            {showAdvanced && (
              <div className="mt-3 space-y-3 animate-scale-in">
                <div className="flex items-center gap-2.5">
                  <label className="text-[10px] text-white/25 font-bold uppercase tracking-wider shrink-0">Seed</label>
                  <input type="number" min={0} max={2147483647} placeholder="Random" value={seed}
                    onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; setSeedLocked(false); }}
                    className="flex-1 px-3.5 py-3 rounded-xl bg-gradient-to-b from-[#171d28] to-[#141821] border-2 border-white/[0.08] text-[12px] text-white/70 outline-none focus:border-[#FF6B2C]/40 focus:shadow-[0_0_20px_rgba(255,107,44,0.1)] placeholder:text-white/20 hover:border-white/15 transition-all duration-200 shadow-[inset_0_1px_0_rgba(0,0,0,0.15)]" />
                  {activeResult && (
                    <button onClick={handleLockSeed}
                      className={`px-3 py-3 rounded-xl text-[11px] font-medium transition-all duration-200 cursor-pointer ${seedLocked ? "bg-gradient-to-r from-[#FF6B2C]/15 to-[#FF6B2C]/5 text-[#FF6B2C] border-2 border-[#FF6B2C]/25 shadow-[0_0_10px_rgba(255,107,44,0.08)]" : "text-white/25 hover:text-white/50 bg-gradient-to-b from-[#171d28] to-[#141821] border-2 border-white/[0.08] hover:border-white/15"}`}>
                      {seedLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── GENERATE ──────────────────────────────────────── */}
          <div className="pt-3">
            <Button onClick={handleGenerate} disabled={!isFormValid || isGenerating}
              className="w-full h-14 text-[15px] font-bold rounded-xl sl-cta border border-[#ff9c75]/60 transition-all duration-200 shadow-[0_6px_20px_rgba(255,107,44,0.32),0_0_24px_rgba(255,107,44,0.18),inset_0_1px_0_rgba(255,255,255,0.24)] hover:shadow-[0_10px_30px_rgba(255,107,44,0.4),0_0_30px_rgba(255,107,44,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] disabled:opacity-35 disabled:shadow-none disabled:hover:translate-y-0"
              size="lg">
              {isGenerating
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating…</>
                : <>✦ Generate</>}
            </Button>
            {status === "error" && errorMessage && (
              <div className="mt-3 p-3 rounded-xl border border-red-500/20 bg-gradient-to-r from-red-500/10 to-red-500/5 shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                <p className="text-red-400 text-[11px] font-medium">{errorMessage}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER — Preview area (flexible)
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] lg:min-h-screen p-4 lg:p-10">

        {/* Preview canvas */}
        <div className="w-full max-w-[560px] aspect-square rounded-3xl border border-white/[0.1] bg-[#11151b] overflow-hidden relative shadow-[0_14px_46px_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.04),0_0_42px_rgba(255,107,44,0.08)]"
          style={activeBg.style as React.CSSProperties}>

          {activeResult && (
            <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
              className={`object-contain p-10 transition-opacity duration-300 ${isGenerating ? "opacity-10" : "opacity-100"}`}
              unoptimized />
          )}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-[#FF6B2C]/10 border-t-[#FF6B2C] animate-spin" />
              <p className="text-xs text-white/25 font-medium">Creating your asset…</p>
            </div>
          )}
          {!activeResult && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="w-18 h-18 rounded-2xl bg-gradient-to-b from-white/[0.04] to-white/[0.01] border border-white/[0.06] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] animate-float">
                <Sparkles className="w-7 h-7 text-[#FF6B2C]/20" />
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
              <Download className="w-3.5 h-3.5 mr-1.5" />Download PNG
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

        {/* Enhanced prompt */}
        {activeResult?.enhancedPrompt && (
          <p className="max-w-[520px] mt-3 text-[10px] text-white/15 text-center italic leading-relaxed">
            &ldquo;{activeResult.enhancedPrompt}&rdquo;
          </p>
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
