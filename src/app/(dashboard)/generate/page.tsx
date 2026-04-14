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
  ZoomIn,
  X,
  Wand2,
  Clock,
  ImageIcon,
  Upload,
  Eraser,
} from "lucide-react";
import { GeneratorErrorBoundary } from "@/components/ErrorBoundary";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS, type GenerateCategory, type GenerateSubcategory } from "@/data/generate-categories";
import { GENERATE_STYLES, ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";
import { ChevronDown, Eye, Zap as ZapIcon, Palette as PaletteIcon } from "lucide-react";
import { FancySelect, type FancyOption } from "@/components/generate/FancySelect";

// =============================================================================
// GENERATOR DATA
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

const BG_MODES = [
  { id: "checker", label: "Transparent", style: { backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)", backgroundSize: "24px 24px" } },
  { id: "dark",    label: "Dark",        style: { background: "#111827" } },
  { id: "light",   label: "Light",       style: { background: "#f3f4f6" } },
  { id: "game",    label: "Game",        style: { background: "#1e293b", backgroundImage: "repeating-conic-gradient(#ffffff08 0% 25%, transparent 0% 50%)", backgroundSize: "32px 32px" } },
] as const;

type BgModeId = (typeof BG_MODES)[number]["id"];

// =============================================================================
// SMART PROMPT CHIPS per subcategory
// =============================================================================

const SMART_CHIPS: Record<string, string[]> = {
  SWORDS:        ["fire sword with glowing runes", "crystal ice blade", "ancient cursed katana", "holy golden longsword"],
  AXES:          ["bone-handled battle axe", "dwarven war hammer", "double-bladed axe with runes"],
  POLEARMS:      ["golden trident with glowing tips", "dark spear with skull", "jade halberd"],
  BOWS:          ["elven longbow with vines", "dark crossbow with skulls", "golden recurve bow"],
  STAFFS:        ["crystal staff with purple orb", "ancient wooden staff with eye", "ice wizard wand"],
  GUNS:          ["steampunk flintlock pistol", "crystal energy blaster", "ancient dwarven cannon"],
  THROWING:      ["star-shaped shuriken with glow", "enchanted throwing daggers", "poison dart set"],
  HELMETS:       ["golden viking helmet", "dark knight helm with horns", "crystal crown helmet"],
  CHEST_ARMOR:   ["golden plate armor with runes", "leather ranger vest", "shadow assassin cloak"],
  SHIELDS:       ["tower shield with lion crest", "round wooden shield", "crystal barrier shield"],
  GLOVES:        ["iron gauntlets with spikes", "leather archer gloves", "magic rune gloves"],
  BOOTS:         ["leather boots with silver buckles", "heavy iron war boots", "elven leaf boots"],
  ACCESSORIES:   ["silver amulet with blue gem", "golden ring of fire", "enchanted belt"],
  POTIONS:       ["red health potion, glowing", "blue mana elixir", "green poison vial, bubbling"],
  FOOD:          ["roasted chicken leg", "enchanted golden apple", "mushroom stew in bowl"],
  SCROLLS:       ["ancient scroll with glowing runes", "fire spell scroll", "map scroll with seal"],
  GEMS:          ["large cut ruby, deep red", "emerald with inner glow", "diamond cluster"],
  ORES:          ["raw gold ore chunk", "glowing mithril ore", "dark obsidian shard"],
  WOOD_STONE:    ["oak log with bark texture", "enchanted crystal stone", "petrified wood"],
  PLANTS:        ["glowing blue herb", "red healing mushroom", "ancient tree sapling"],
  MONSTER_PARTS: ["dragon scale, iridescent", "troll horn with moss", "phoenix feather"],
  MAGIC_MATERIALS: ["purple soul gem, glowing", "ethereal essence orb", "void crystal shard"],
  HEROES:        ["female warrior with silver armor", "dark wizard with staff", "ranger with bow and hood"],
  ENEMIES:       ["skeleton warrior with sword", "goblin archer", "shadow demon assassin"],
  NPCS:          ["friendly blacksmith with apron", "mysterious merchant", "old wizard shopkeeper"],
  BOSSES:        ["demon lord with wings", "ancient dragon king", "lich with crown"],
  ANIMALS:       ["grey wolf with glowing eyes", "armored war horse", "giant spider"],
  MYTHICAL:      ["red dragon, wings spread", "golden phoenix rising", "frost hydra"],
  PETS:          ["baby dragon companion, cute", "fairy cat with wings", "crystal fox cub"],
  ELEMENTALS:    ["fire elemental, swirling flames", "ice golem with crystals", "lightning spirit"],
  ITEM_ICONS:    ["coin stack icon, golden", "heart icon, red", "key icon, ornate"],
  SKILL_ICONS:   ["fireball spell icon", "shield buff icon", "healing wave icon"],
  STATUS_ICONS:  ["poison status, green skull", "frozen status, ice crystal", "burn status, flames"],
  ICONS_UI:      ["settings gear icon", "play button, golden", "chest icon with glow"],
  BUTTONS:       ["medieval wooden play button", "stone menu button", "crystal UI button"],
  BARS:          ["health bar, red gradient", "mana bar, blue glow", "XP bar, golden"],
  FRAMES:        ["ornate gold dialog frame", "stone inventory frame", "wooden panel border"],
  TREES_PLANTS:  ["ancient oak tree, large canopy", "glowing mushroom cluster", "dead twisted tree"],
  ROCKS_TERRAIN: ["mossy boulder with crystals", "lava rock formation", "ice crystal formation"],
  BUILDINGS:     ["small medieval tavern", "wizard tower, tall", "ruined stone temple"],
  PROPS:         ["wooden barrel with iron bands", "treasure chest, ornate", "campfire with logs"],
  DUNGEON:       ["stone door with skull", "iron cage with chains", "altar with candles"],
  KEYS:          ["ornate golden skeleton key", "crystal key with glow", "rusty iron dungeon key"],
  ARTIFACTS:     ["ancient glowing orb", "cursed mirror", "legendary crown with gems"],
  CONTAINERS:    ["wooden treasure chest", "magic pouch with runes", "iron strongbox"],
  COLLECTIBLES:  ["silver medal with crown", "ancient coin, worn", "enchanted star fragment"],
};

// =============================================================================
// GENERATION PROGRESS STAGES
// =============================================================================

type GenerationStage = "preparing" | "enhancing" | "generating" | "removing_bg" | "uploading" | "done";

const STAGE_INFO: Record<GenerationStage, { label: string; icon: typeof Wand2; progress: number }> = {
  preparing:    { label: "Building prompt...",       icon: Wand2,     progress: 10 },
  enhancing:    { label: "Enhancing with AI...",     icon: Sparkles,  progress: 20 },
  generating:   { label: "Generating sprite...",     icon: ImageIcon, progress: 50 },
  removing_bg:  { label: "Removing background...",   icon: Eraser,    progress: 75 },
  uploading:    { label: "Saving to cloud...",       icon: Upload,    progress: 90 },
  done:         { label: "Done!",                    icon: Check,     progress: 100 },
};

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
  duration?: string;
}

// =============================================================================
// PROMPT QUALITY HELPERS
// =============================================================================

function getPromptQuality(prompt: string): { level: "weak" | "ok" | "good" | "great"; tip: string } {
  const words = prompt.trim().split(/\s+/).length;
  if (words < 2) return { level: "weak", tip: "Add more detail for better results" };
  if (words < 4) return { level: "ok", tip: "Try adding material, color, or effect details" };
  if (words < 7) return { level: "good", tip: "Nice prompt! Add specific visual details for perfection" };
  return { level: "great", tip: "Detailed prompt — expect great results!" };
}

const QUALITY_COLORS = {
  weak: "bg-red-500/20 text-red-400 border-red-500/30",
  ok: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  great: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const QUALITY_BAR = {
  weak: "w-1/4 bg-red-500",
  ok: "w-2/4 bg-yellow-500",
  good: "w-3/4 bg-blue-500",
  great: "w-full bg-emerald-500",
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default function GeneratePage() {
  return (
    <GeneratorErrorBoundary>
      <Suspense fallback={<div className="min-h-screen p-8 max-w-6xl mx-auto flex items-center justify-center"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>}>
        <GeneratePageInner />
      </Suspense>
    </GeneratorErrorBoundary>
  );
}

function GeneratePageInner() {
  const searchParams = useSearchParams();

  // Pre-fill from URL params
  const urlPrompt    = searchParams.get("prompt") ?? "";
  const urlStyleId   = searchParams.get("styleId") ?? "";
  const urlCatId     = searchParams.get("categoryId") ?? "";
  const urlSubId     = searchParams.get("subcategoryId") ?? "";
  const urlView      = searchParams.get("view") ?? "";
  const urlProjectId = searchParams.get("projectId") ?? "";
  const urlFolderId  = searchParams.get("folderId") ?? "";
  const initCat = GENERATE_CATEGORIES.find(c => c.id === urlCatId) ?? GENERATE_CATEGORIES[0];
  const initSubId = (urlSubId && initCat.subcategories.some(s => s.subcategoryId === urlSubId))
    ? urlSubId : initCat.subcategories[0].subcategoryId;
  const viewFromUrl = ({"TOP_DOWN": "topdown", "SIDE_VIEW": "side", "FRONT": "front", "DEFAULT": "none"} as Record<string, string>)[urlView] || "none";

  // ── State ──────────────────────────────────────────────────────────────────
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
  const [palette, setPalette]             = useState<PaletteId>("auto");
  const [bgOutput, setBgOutput]           = useState<BgOutputId>("transparent");
  const [bgMode, setBgMode]              = useState<BgModeId>("checker");
  const [seedLocked, setSeedLocked]       = useState(false);

  const [status, setStatus]               = useState<"idle" | "generating" | "error">("idle");
  const [genStage, setGenStage]           = useState<GenerationStage>("preparing");
  const [genStartTime, setGenStartTime]   = useState(0);
  const [genElapsed, setGenElapsed]       = useState(0);
  const [errorMessage, setErrorMessage]   = useState<string | null>(null);
  const [, setNoCredits]                  = useState(false);

  const [history, setHistory]             = useState<GeneratedResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [styleLocked, setStyleLocked]     = useState(false);
  const [seedCopied, setSeedCopied]       = useState(false);
  const [showZoom, setShowZoom]           = useState(false);
  const seedRef                           = useRef("");
  const promptRef                         = useRef<HTMLTextAreaElement>(null);
  const timerRef                          = useRef<ReturnType<typeof setInterval>>(undefined);

  const isGenerating = status === "generating";
  const activeResult = history[selectedIndex] ?? null;
  const selectedSub  = selectedCategory.subcategories.find((s) => s.subcategoryId === selectedSubcategoryId) ?? selectedCategory.subcategories[0];
  const placeholder  = SUBTYPE_PLACEHOLDERS[selectedSubcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;
  const promptQuality = prompt.trim().length >= 2 ? getPromptQuality(prompt) : null;

  // Chips for current subcategory
  const chips = SMART_CHIPS[selectedSubcategoryId] ?? [`${selectedSub.label.toLowerCase()} with detail`];

  // ── Timer for elapsed time ─────────────────────────────────────────────────
  useEffect(() => {
    if (isGenerating) {
      setGenStartTime(Date.now());
      setGenElapsed(0);
      timerRef.current = setInterval(() => {
        setGenElapsed(Date.now() - (genStartTime || Date.now()));
      }, 100);
      return () => clearInterval(timerRef.current);
    } else {
      clearInterval(timerRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating]);

  // ── Simulate progress stages ───────────────────────────────────────────────
  useEffect(() => {
    if (!isGenerating) return;
    setGenStage("preparing");
    const t1 = setTimeout(() => setGenStage("enhancing"), 400);
    const t2 = setTimeout(() => setGenStage("generating"), 1200);
    const t3 = setTimeout(() => setGenStage("removing_bg"), 6000);
    const t4 = setTimeout(() => setGenStage("uploading"), 10000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [isGenerating]);

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to generate
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (isFormValid && !isGenerating) handleGenerate();
      }
      // Escape to close zoom
      if (e.key === "Escape" && showZoom) {
        setShowZoom(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormValid, isGenerating, showZoom]);

  // ── Handlers ───────────────────────────────────────────────────────────────
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
    setGenStage("preparing");
    setErrorMessage(null);
    setNoCredits(false);

    const viewMap: Record<string, string> = {
      none: "DEFAULT", side: "SIDE_VIEW", front: "FRONT", topdown: "TOP_DOWN",
    };

    const paletteMap: Record<string, string | undefined> = {
      auto: undefined, warm: "FANTASY_GOLD", cold: "ICE_BLUE",
      dark: "DARK_SOULS", vibrant: "NEON_CYBER", earthy: "AUTUMN_HARVEST", neon: "NEON_CYBER",
    };

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:         prompt.trim(),
          categoryId:     selectedSub.categoryId,
          subcategoryId:  selectedSubcategoryId,
          styleId,
          view:           viewMap[view] || "DEFAULT",
          qualityPreset:  detail,
          seed:           seedRef.current.trim() || undefined,
          projectId:      projectId || undefined,
          folderId:       folderId || undefined,
          colorPaletteId: paletteMap[palette],
          backgroundType: bgOutput,
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

      setGenStage("done");

      // Preload image before showing to avoid flicker
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        img.onload = () => resolve();
        img.onerror = () => resolve(); // Still show even if preload fails
        img.src = data.imageUrl;
        // Timeout fallback - don't block UI for more than 3s
        setTimeout(resolve, 3000);
      });

      const newResult: GeneratedResult = {
        id:            `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        imageUrl:      data.imageUrl,
        seed:          data.seed ?? 0,
        categoryId:    selectedSub.categoryId,
        subcategoryId: selectedSubcategoryId,
        styleId,
        prompt:        prompt.trim(),
        enhancedPrompt: data.enhancedPrompt,
        duration:      data.duration,
      };

      setHistory((prev) => [newResult, ...prev].slice(0, 24));
      setSelectedIndex(0);
      setStatus("idle");

      if (!styleLocked) setStyleLocked(true);
      triggerCreditsRefresh();
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  }, [isFormValid, isGenerating, view, prompt, selectedSub, selectedSubcategoryId, styleId, detail, styleLocked, palette, bgOutput, projectId, folderId]);

  const handleRegenerate = () => {
    if (seedLocked && activeResult) {
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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

  const stageInfo = STAGE_INFO[genStage];
  const StageIcon = stageInfo.icon;

  return (
    <div className="min-h-screen bg-[#0B0F19] flex flex-col lg:flex-row">

      {/* ═══════════════════════════════════════════════════════════
          LEFT PANEL — Controls
      ═══════════════════════════════════════════════════════════ */}
      <div className="w-full lg:w-[320px] xl:w-[340px] lg:h-screen lg:overflow-y-auto lg:border-r border-[#263046] bg-[#121826] shrink-0">
        <div className="p-5 pb-8 space-y-6 relative z-10">

          {/* Panel header */}
          <div className="flex items-center justify-between pb-4 border-b border-[#263046]">
            <h2 className="text-[16px] font-bold text-slate-100 tracking-tight">New Asset</h2>
            <span className="text-[11px] text-[#ffd8c7] bg-[#F97316]/15 px-3.5 py-1 rounded-md font-semibold border border-[#F97316]/30 shadow-[0_0_12px_rgba(249,115,22,0.15)]">1 credit</span>
          </div>

          {/* ── PROMPT ────────────────────────────────────────── */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Prompt<span className="text-[#F97316] ml-0.5">*</span>
            </label>
            <div className="relative">
              <textarea
                ref={promptRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    if (isFormValid && !isGenerating) handleGenerate();
                  }
                }}
                placeholder={placeholder}
                maxLength={500}
                rows={4}
                className="w-full px-4 py-3.5 rounded-lg bg-[#182033] border border-[#263046] text-[14px] text-slate-100 resize-none outline-none focus:border-[#F97316]/40 focus:shadow-[0_0_12px_rgba(249,115,22,0.1)] placeholder:text-slate-600 leading-relaxed transition-all duration-200 hover:border-[#263046]/80"
              />
              {/* Prompt quality indicator */}
              {promptQuality && prompt.trim().length >= 2 && (
                <div className="mt-1.5 flex items-center gap-2">
                  <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${QUALITY_BAR[promptQuality.level]}`} />
                  </div>
                  <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${QUALITY_COLORS[promptQuality.level]}`}>
                    {promptQuality.level.toUpperCase()}
                  </span>
                </div>
              )}
              {promptQuality && prompt.trim().length >= 2 && (
                <p className="mt-1 text-[9px] text-slate-600">{promptQuality.tip}</p>
              )}
            </div>

            {/* Smart prompt chips */}
            {prompt.length === 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {chips.slice(0, 3).map((ex) => (
                  <button key={ex} type="button" onClick={() => setPrompt(ex)}
                    className="px-2.5 py-1.5 text-[10px] rounded-md bg-[#1A2235] text-slate-500 hover:text-[#F97316] hover:bg-[#F97316]/10 transition-all duration-200 border border-[#263046] hover:border-[#F97316]/30 font-medium cursor-pointer">
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {prompt.length > 0 && (
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[9px] text-slate-700">Ctrl+Enter to generate</span>
                <span className="text-[9px] text-slate-600">{prompt.length}/500</span>
              </div>
            )}
          </div>

          {/* ── STRUCTURE ─────────────────────────────────────── */}
          <div className="pt-1 space-y-3">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Structure</p>

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
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Output</p>

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
              </div>
            )}
          </div>

          {/* ── GENERATE BUTTON ───────────────────────────────── */}
          <div className="pt-3">
            <Button onClick={handleGenerate} disabled={!isFormValid || isGenerating}
              className="w-full h-14 text-[15px] font-bold rounded-xl bg-gradient-to-r from-[#F97316] to-[#EA580C] hover:from-[#FB923C] hover:to-[#F97316] text-white border border-[#F97316]/40 transition-all duration-300 shadow-[0_4px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_6px_28px_rgba(249,115,22,0.45)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-35 disabled:shadow-none disabled:hover:scale-100 group relative overflow-hidden"
              size="lg">
              {/* Shimmer effect */}
              {!isGenerating && isFormValid && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              )}
              {isGenerating
                ? <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Generating...</>
                : <><Sparkles className="w-5 h-5 mr-2" />Generate</>}
            </Button>

            {/* Generation progress */}
            {isGenerating && (
              <div className="mt-3 p-3 rounded-xl bg-[#182033] border border-[#263046] space-y-2.5">
                <div className="flex items-center gap-2">
                  <StageIcon className="w-3.5 h-3.5 text-[#F97316] animate-pulse" />
                  <span className="text-[11px] text-white/60 font-medium">{stageInfo.label}</span>
                  <span className="ml-auto text-[10px] text-white/20 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {(genElapsed / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#F97316] to-[#FB923C] transition-all duration-700 ease-out"
                    style={{ width: `${stageInfo.progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Error display with retry */}
            {status === "error" && errorMessage && (
              <div className="mt-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                <p className="text-red-400 text-[11px] font-medium">{errorMessage}</p>
                <button onClick={handleGenerate} disabled={!isFormValid}
                  className="mt-2 text-[10px] text-red-400/60 hover:text-red-400 transition-colors cursor-pointer underline underline-offset-2">
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          CENTER — Preview area
      ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] lg:min-h-screen p-4 lg:p-10 relative overflow-hidden">
        {/* Animated logo background */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <img src="/logo-animated.gif" alt="" aria-hidden="true"
            className="absolute w-full h-full object-cover opacity-[0.15] select-none blur-[1px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0F19] via-[#0B0F19]/70 to-[#0B0F19]" />
        </div>

        {/* Preview canvas */}
        <div
          className={`w-full max-w-[560px] aspect-square rounded-2xl border overflow-hidden relative transition-all duration-500 ${
            activeResult && !isGenerating
              ? "border-[#F97316]/20 shadow-[0_8px_40px_rgba(249,115,22,0.1)]"
              : "border-[#263046] shadow-[0_8px_24px_rgba(0,0,0,0.3)]"
          } ${activeResult ? "cursor-zoom-in" : ""}`}
          style={activeBg.style as React.CSSProperties}
          onClick={() => { if (activeResult && !isGenerating) setShowZoom(true); }}
        >
          {activeResult && (
            <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
              className={`object-contain p-8 transition-all duration-500 ${isGenerating ? "opacity-10 scale-95 blur-sm" : "opacity-100 scale-100"}`}
              unoptimized />
          )}

          {/* Generation progress overlay */}
          {isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              {/* Animated rings */}
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 rounded-full border-2 border-[#F97316]/5 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-[#F97316]/10 animate-ping" style={{ animationDelay: "0.3s" }} />
                <div className="absolute inset-4 rounded-full border-2 border-[#F97316]/20 border-t-[#F97316] animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <StageIcon className="w-6 h-6 text-[#F97316]/60" />
                </div>
              </div>
              <div className="text-center">
                <p className="text-[13px] text-white/40 font-medium">{stageInfo.label}</p>
                <p className="text-[10px] text-white/15 mt-1 font-mono">{(genElapsed / 1000).toFixed(1)}s elapsed</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!activeResult && !isGenerating && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1A2235] to-[#141821] border border-[#263046] flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
                <Sparkles className="w-8 h-8 text-[#F97316]/15" />
              </div>
              <div className="text-center max-w-[280px]">
                <p className="text-[15px] font-semibold text-white/20">Ready to create</p>
                <p className="text-[12px] text-white/10 mt-2 leading-relaxed">
                  Describe your game asset, choose a style, and hit Generate
                </p>
                <p className="text-[10px] text-[#F97316]/30 mt-3 font-medium">Ctrl+Enter to generate instantly</p>
              </div>
            </div>
          )}

          {/* Zoom indicator */}
          {activeResult && !isGenerating && (
            <div className="absolute top-3 right-3 p-2 rounded-lg bg-black/30 backdrop-blur-sm opacity-0 hover:opacity-100 transition-opacity">
              <ZoomIn className="w-4 h-4 text-white/50" />
            </div>
          )}
        </div>

        {/* Actions below preview */}
        {activeResult && !isGenerating && (
          <div className="w-full max-w-[560px] mt-4 flex items-center gap-2">
            <Button onClick={handleDownload} className="flex-1 h-11 text-[12px] font-semibold bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/[0.08] hover:border-white/[0.15] rounded-xl transition-all duration-200 shadow-[0_2px_8px_rgba(0,0,0,0.2)]">
              <Download className="w-4 h-4 mr-2" />Download PNG
            </Button>
            <Button variant="outline" onClick={handleRegenerate} disabled={isGenerating}
              className="h-11 px-4 border-white/[0.08] hover:border-[#F97316]/30 hover:bg-[#F97316]/5 text-white/40 hover:text-[#F97316] rounded-xl transition-all duration-200" title="Regenerate">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <button onClick={handleCopySeed} className="h-11 px-3 text-white/20 hover:text-white/50 transition-all duration-200 cursor-pointer" title={`Seed: ${activeResult.seed}`}>
              {seedCopied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        )}

        {/* BG toggle */}
        {activeResult && !isGenerating && (
          <div className="flex gap-1.5 mt-3">
            {BG_MODES.map((mode) => (
              <button key={mode.id} onClick={() => setBgMode(mode.id)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all duration-200 cursor-pointer ${
                  bgMode === mode.id ? "text-[#FF6B2C] bg-[#FF6B2C]/10 border border-[#FF6B2C]/20" : "text-white/25 hover:text-white/45 hover:bg-white/[0.04] border border-transparent"
                }`}>
                {mode.label}
              </button>
            ))}
          </div>
        )}

        {/* Generation info */}
        {activeResult && !isGenerating && (
          <div className="max-w-[560px] w-full mt-4 flex items-center justify-center gap-4 text-[10px] text-white/15">
            {activeResult.duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{activeResult.duration}
              </span>
            )}
            <span>Seed: {activeResult.seed}</span>
            <span>{GENERATE_STYLES.find(s => s.id === activeResult.styleId)?.name}</span>
          </div>
        )}

        {/* Enhanced prompt */}
        {activeResult?.enhancedPrompt && !isGenerating && (
          <p className="max-w-[520px] mt-2 text-[10px] text-white/15 text-center italic leading-relaxed">
            AI enhanced: &ldquo;{activeResult.enhancedPrompt}&rdquo;
          </p>
        )}

        {/* Session history thumbnails */}
        {history.length > 1 && (
          <div className="max-w-[560px] w-full mt-6">
            <p className="text-[9px] text-white/20 uppercase tracking-widest mb-2.5 font-bold">Session history · {history.length}</p>
            <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin">
              {history.map((item, index) => (
                <button key={item.id} onClick={() => setSelectedIndex(index)}
                  className={`relative w-14 h-14 rounded-xl shrink-0 overflow-hidden transition-all duration-200 cursor-pointer group ${
                    selectedIndex === index
                      ? "ring-2 ring-[#FF6B2C]/50 shadow-[0_0_16px_rgba(255,107,44,0.2)] scale-110"
                      : "opacity-40 hover:opacity-80 hover:scale-105"
                  }`}
                  style={{ backgroundImage: "repeating-conic-gradient(#80808008 0% 25%, transparent 0% 50%)", backgroundSize: "6px 6px" }}>
                  <Image src={item.imageUrl} alt="" fill className="object-contain p-0.5" unoptimized loading="lazy" />
                  {/* Style badge on hover */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm py-0.5 text-[7px] text-white/60 text-center opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                    {GENERATE_STYLES.find(s => s.id === item.styleId)?.name?.split(" ")[0]}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════
          ZOOM MODAL
      ═══════════════════════════════════════════════════════════ */}
      {showZoom && activeResult && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowZoom(false)}>
          <button className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/60 hover:text-white cursor-pointer z-10"
            onClick={() => setShowZoom(false)}>
            <X className="w-6 h-6" />
          </button>
          <div className="relative w-full max-w-[90vmin] aspect-square"
            style={activeBg.style as React.CSSProperties}>
            <Image src={activeResult.imageUrl} alt={activeResult.prompt} fill
              className="object-contain p-8" unoptimized />
          </div>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 text-white/40 text-[11px]">
            <span>{activeResult.prompt}</span>
            <span>·</span>
            <span>Seed: {activeResult.seed}</span>
            <span>·</span>
            <button onClick={(e) => { e.stopPropagation(); handleDownload(); }}
              className="text-[#F97316] hover:text-[#FB923C] transition-colors cursor-pointer flex items-center gap-1">
              <Download className="w-3.5 h-3.5" />Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
