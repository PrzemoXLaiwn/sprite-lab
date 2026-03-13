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
  ChevronDown,
  Wand2,
  History,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";

// =============================================================================
// GENERATOR DATA
// =============================================================================

const GENERATOR_CATEGORIES = [
  {
    label: "Items",
    icon: "💎",
    subcategories: [
      { categoryId: "WEAPONS",     subcategoryId: "SWORDS",      label: "Swords",           chips: ["iron", "golden", "rusted", "crystal", "shadow", "fire", "ancient", "enchanted"] },
      { categoryId: "WEAPONS",     subcategoryId: "AXES",        label: "Axes & Hammers",   chips: ["battle axe", "war hammer", "bone handle", "runic", "double-headed", "stone"] },
      { categoryId: "WEAPONS",     subcategoryId: "BOWS",        label: "Bows",             chips: ["longbow", "golden", "elvish", "recurve", "crossbow", "magical", "silver"] },
      { categoryId: "WEAPONS",     subcategoryId: "STAFFS",      label: "Staffs & Wands",   chips: ["crystal orb", "fire", "ice", "wooden", "golden", "arcane", "shadow"] },
      { categoryId: "WEAPONS",     subcategoryId: "GUNS",        label: "Firearms",         chips: ["flintlock", "steampunk", "golden", "ornate", "double barrel", "laser"] },
      { categoryId: "WEAPONS",     subcategoryId: "THROWING",    label: "Throwing Weapons", chips: ["shuriken", "kunai", "boomerang", "throwing knife", "chakram", "dart"] },
      { categoryId: "ARMOR",       subcategoryId: "HELMETS",     label: "Helmets",          chips: ["knight", "viking", "horned", "golden", "demon", "wizard hat", "crown"] },
      { categoryId: "ARMOR",       subcategoryId: "CHEST_ARMOR", label: "Chest Armor",      chips: ["plate", "chainmail", "leather", "golden", "rune-engraved", "dark", "elven"] },
      { categoryId: "ARMOR",       subcategoryId: "SHIELDS",     label: "Shields",          chips: ["tower shield", "round", "buckler", "lion crest", "spiked", "wooden", "golden"] },
      { categoryId: "ARMOR",       subcategoryId: "ACCESSORIES", label: "Accessories",      chips: ["amulet", "ring", "bracelet", "cape", "belt", "earring", "brooch"] },
      { categoryId: "CONSUMABLES", subcategoryId: "POTIONS",     label: "Potions",          chips: ["health", "mana", "poison", "strength", "glowing", "blue", "red", "golden"] },
      { categoryId: "CONSUMABLES", subcategoryId: "FOOD",        label: "Food",             chips: ["roasted chicken", "apple", "bread", "cheese", "pie", "mushroom", "meat"] },
      { categoryId: "CONSUMABLES", subcategoryId: "SCROLLS",     label: "Scrolls",          chips: ["ancient", "glowing runes", "spell", "fire", "ice", "rolled up", "sealed"] },
      { categoryId: "RESOURCES",   subcategoryId: "GEMS",        label: "Gems",             chips: ["ruby", "sapphire", "emerald", "diamond", "amethyst", "cut", "raw", "glowing"] },
      { categoryId: "RESOURCES",   subcategoryId: "ORES",        label: "Ores",             chips: ["iron", "gold", "copper", "mythril", "obsidian", "raw chunk", "crystal"] },
      { categoryId: "QUEST_ITEMS", subcategoryId: "KEYS",        label: "Keys",             chips: ["golden", "skeleton", "ornate", "crystal", "ancient", "rusted", "glowing"] },
      { categoryId: "QUEST_ITEMS", subcategoryId: "CONTAINERS",  label: "Containers",       chips: ["treasure chest", "wooden crate", "locked", "gold trim", "ancient", "small"] },
      { categoryId: "QUEST_ITEMS", subcategoryId: "COLLECTIBLES",label: "Collectibles",     chips: ["gold coin", "medal", "trophy", "badge", "gem", "crown", "artifact"] },
    ],
  },
  {
    label: "Icons",
    icon: "🎮",
    subcategories: [
      { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS",  label: "Item Icons",   chips: ["coin stack", "potion", "sword", "gem", "key", "shield", "arrow", "gold bars"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "SKILL_ICONS", label: "Skill Icons",  chips: ["fireball", "heal", "lightning", "ice spike", "shield buff", "dark magic", "arrow"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "STATUS_ICONS",label: "Status Icons", chips: ["poison", "burn", "freeze", "stun", "bleed", "curse", "shield buff", "haste"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "ICONS_UI",    label: "UI Icons",     chips: ["settings", "inventory", "map", "quest", "menu", "shop", "chat", "close"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BUTTONS",     label: "Buttons",      chips: ["play", "close", "menu", "wooden", "stone", "golden", "glowing", "round"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BARS",        label: "Bars",         chips: ["health", "mana", "stamina", "XP", "red", "blue", "green", "segmented"] },
      { categoryId: "UI_ELEMENTS", subcategoryId: "FRAMES",      label: "Frames",       chips: ["ornate gold", "wooden", "stone", "dark", "elegant", "dialog box", "tooltip"] },
    ],
  },
  {
    label: "Enemies",
    icon: "👾",
    subcategories: [
      { categoryId: "CHARACTERS",  subcategoryId: "ENEMIES",   label: "Enemies",        chips: ["goblin", "skeleton", "zombie", "orc", "bandit", "slime", "bat", "spider"] },
      { categoryId: "CHARACTERS",  subcategoryId: "BOSSES",    label: "Bosses",          chips: ["demon lord", "dragon", "lich king", "giant", "golem", "vampire", "hydra"] },
      { categoryId: "CHARACTERS",  subcategoryId: "HEROES",    label: "Heroes",          chips: ["knight", "mage", "rogue", "archer", "paladin", "warrior", "wizard"] },
      { categoryId: "CHARACTERS",  subcategoryId: "NPCS",      label: "NPCs",            chips: ["blacksmith", "merchant", "guard", "villager", "innkeeper", "sage", "alchemist"] },
      { categoryId: "CREATURES",   subcategoryId: "ANIMALS",   label: "Animals",         chips: ["wolf", "bear", "eagle", "deer", "fox", "snake", "crow", "horse"] },
      { categoryId: "CREATURES",   subcategoryId: "MYTHICAL",  label: "Mythical Beasts", chips: ["dragon", "phoenix", "unicorn", "griffin", "hydra", "basilisk", "wyvern"] },
      { categoryId: "CREATURES",   subcategoryId: "ELEMENTALS",label: "Elementals",      chips: ["fire", "ice", "lightning", "earth", "shadow", "water", "wind", "void"] },
    ],
  },
] as const;

type CategoryGroup = (typeof GENERATOR_CATEGORIES)[number]["label"];
type SubcategoryEntry = {
  categoryId: string;
  subcategoryId: string;
  label: string;
  chips: readonly string[];
};

const DEFAULT_SUBTYPE: Record<CategoryGroup, SubcategoryEntry> = {
  Items:   GENERATOR_CATEGORIES[0].subcategories[0] as SubcategoryEntry,
  Icons:   GENERATOR_CATEGORIES[1].subcategories[0] as SubcategoryEntry,
  Enemies: GENERATOR_CATEGORIES[2].subcategories[0] as SubcategoryEntry,
};

// =============================================================================
// STYLES
// =============================================================================

const STYLE_PRESETS = [
  { id: "PIXEL_ART_16",    name: "Pixel Art",    emoji: "🎮", description: "Classic retro 16-bit" },
  { id: "PIXEL_ART_32",    name: "Pixel HD",     emoji: "👾", description: "Modern indie pixel" },
  { id: "VECTOR_CLEAN",    name: "Vector",       emoji: "🔷", description: "Clean mobile style" },
  { id: "ANIME_GAME",      name: "Anime",        emoji: "🌸", description: "JRPG / Gacha" },
  { id: "HAND_PAINTED",    name: "Hand Painted", emoji: "🖌️", description: "Hollow Knight style" },
  { id: "CARTOON_WESTERN", name: "Cartoon",      emoji: "🎨", description: "Expressive cartoon" },
] as const;

type StyleId = (typeof STYLE_PRESETS)[number]["id"];

// =============================================================================
// VIEW + DETAIL
// =============================================================================

const VIEW_OPTIONS = [
  { id: "none",    label: "Default",   prefix: "" },
  { id: "side",    label: "Side View", prefix: "side view, " },
  { id: "front",   label: "Front",     prefix: "front-facing, " },
  { id: "topdown", label: "Top-Down",  prefix: "top-down view, " },
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

// =============================================================================
// PLACEHOLDER MAP
// =============================================================================

const SUBTYPE_PLACEHOLDERS: Record<string, string> = {
  SWORDS:       "e.g. iron sword with red gem in the hilt",
  AXES:         "e.g. bone-handled battle axe with runes",
  BOWS:         "e.g. golden recurve bow with silver tips",
  STAFFS:       "e.g. crystal staff with glowing purple orb",
  GUNS:         "e.g. steampunk flintlock pistol",
  THROWING:     "e.g. star-shaped shuriken with red glow",
  HELMETS:      "e.g. knight helmet with plume",
  CHEST_ARMOR:  "e.g. golden plate armor with rune engravings",
  SHIELDS:      "e.g. tower shield with lion crest",
  ACCESSORIES:  "e.g. silver amulet with blue gem",
  POTIONS:      "e.g. glowing red health potion in glass bottle",
  FOOD:         "e.g. roasted chicken leg",
  SCROLLS:      "e.g. ancient scroll with glowing runes",
  GEMS:         "e.g. large cut ruby, deep red",
  ORES:         "e.g. raw gold ore chunk",
  KEYS:         "e.g. ornate golden skeleton key",
  CONTAINERS:   "e.g. wooden treasure chest with gold trim",
  COLLECTIBLES: "e.g. silver medal with crown engraving",
  ITEM_ICONS:   "e.g. coin stack icon, golden",
  SKILL_ICONS:  "e.g. fireball spell icon, orange flames",
  STATUS_ICONS: "e.g. poison status, green skull symbol",
  ICONS_UI:     "e.g. settings gear icon",
  BUTTONS:      "e.g. medieval wooden play button",
  BARS:         "e.g. health bar, red with black border",
  FRAMES:       "e.g. ornate gold dialog frame",
  ENEMIES:      "e.g. skeleton archer with cracked bones",
  BOSSES:       "e.g. demon lord with wings and horns",
  HEROES:       "e.g. female warrior with silver armor",
  NPCS:         "e.g. friendly blacksmith with leather apron",
  ANIMALS:      "e.g. grey wolf with glowing eyes",
  MYTHICAL:     "e.g. red dragon, large wings spread",
  ELEMENTALS:   "e.g. fire elemental, swirling flame body",
};

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
  subtypeLabel: string;
  styleId: StyleId;
  prompt: string;
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
  const urlStyleId = (searchParams.get("styleId") ?? "") as StyleId | "";

  const [activeGroup, setActiveGroup]     = useState<CategoryGroup>("Items");
  const [subtype, setSubtype]             = useState<SubcategoryEntry>(DEFAULT_SUBTYPE["Items"]);
  const [styleId, setStyleId]             = useState<StyleId>(
    urlStyleId && STYLE_PRESETS.some((s) => s.id === urlStyleId) ? urlStyleId : "PIXEL_ART_16"
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
  const [subtypeOpen, setSubtypeOpen]     = useState(false);
  const subtypeRef                        = useRef<HTMLDivElement>(null);
  const seedRef                           = useRef("");

  const isGenerating = status === "generating";
  const activeResult = history[selectedIndex] ?? null;
  const currentGroup = GENERATOR_CATEGORIES.find((g) => g.label === activeGroup)!;
  const placeholder  = SUBTYPE_PLACEHOLDERS[subtype.subcategoryId] ?? "Describe your asset...";
  const isFormValid  = prompt.trim().length >= 3;
  const promptQuality = getPromptQuality(prompt);
  const activeBg = BG_MODES.find((b) => b.id === bgMode)!;

  // Pre-fill subtype from URL params
  useEffect(() => {
    const urlCatId = searchParams.get("categoryId");
    const urlSubId = searchParams.get("subcategoryId");
    if (!urlCatId || !urlSubId) return;
    for (const group of GENERATOR_CATEGORIES) {
      const found = group.subcategories.find(
        (s) => s.categoryId === urlCatId && s.subcategoryId === urlSubId
      );
      if (found) {
        setActiveGroup(group.label as CategoryGroup);
        setSubtype(found as SubcategoryEntry);
        break;
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close subtype dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (subtypeRef.current && !subtypeRef.current.contains(e.target as Node)) {
        setSubtypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleGroupChange = (group: CategoryGroup) => {
    setActiveGroup(group);
    setSubtype(DEFAULT_SUBTYPE[group]);
    setSubtypeOpen(false);
  };

  const handleSubtypeChange = (entry: SubcategoryEntry) => {
    setSubtype(entry);
    setSubtypeOpen(false);
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

    const viewOption  = VIEW_OPTIONS.find((v) => v.id === view)!;
    const finalPrompt = viewOption.prefix + prompt.trim();

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt:        finalPrompt,
          categoryId:    subtype.categoryId,
          subcategoryId: subtype.subcategoryId,
          styleId:       styleId,
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
        categoryId:    subtype.categoryId,
        subcategoryId: subtype.subcategoryId,
        subtypeLabel:  subtype.label,
        styleId:       styleId,
        prompt:        prompt.trim(),
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
  }, [isFormValid, isGenerating, view, prompt, subtype, styleId, detail, styleLocked]);

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
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Generate Asset</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Pick a type, choose a style, describe your asset.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] gap-4 sm:gap-6 lg:gap-8 items-start">

        {/* ================================================================
            LEFT COLUMN — Form
        ================================================================ */}
        <div className="space-y-4">

          {/* ── 1. Asset Type ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              1. Asset Type
            </p>
            <div className="flex gap-1.5 sm:gap-2">
              {GENERATOR_CATEGORIES.map((group) => (
                <button
                  key={group.label}
                  onClick={() => handleGroupChange(group.label as CategoryGroup)}
                  className={`
                    flex-1 py-2.5 sm:py-3 px-2 sm:px-3 rounded-lg border text-xs sm:text-sm font-semibold transition-all
                    flex items-center justify-center gap-2
                    ${activeGroup === group.label
                      ? "border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20"
                      : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
                    }
                  `}
                >
                  <span className="text-base">{group.icon}</span>
                  <span>{group.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── 2. Subtype ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              2. Subtype
            </p>
            <div ref={subtypeRef} className="relative">
              <button
                onClick={() => setSubtypeOpen((o) => !o)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm font-medium hover:border-primary/50 transition-colors"
              >
                <span>{subtype.label}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${subtypeOpen ? "rotate-180" : ""}`} />
              </button>

              {subtypeOpen && (
                <div className="absolute z-20 top-full mt-1.5 w-full bg-card border border-border rounded-xl shadow-2xl max-h-60 overflow-y-auto">
                  {currentGroup.subcategories.map((entry) => {
                    const isActive = subtype.subcategoryId === entry.subcategoryId && subtype.categoryId === entry.categoryId;
                    return (
                      <button
                        key={`${entry.categoryId}-${entry.subcategoryId}`}
                        onClick={() => handleSubtypeChange(entry as SubcategoryEntry)}
                        className={`w-full text-left px-3.5 py-2.5 text-sm transition-colors first:rounded-t-xl last:rounded-b-xl ${isActive ? "text-primary bg-primary/8 font-medium" : "text-foreground hover:bg-muted/60"}`}
                      >
                        {entry.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── 3. Style ──────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              3. Style
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {STYLE_PRESETS.map((style) => {
                const isActive = styleId === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setStyleId(style.id)}
                    className={`relative p-3 rounded-xl border text-left transition-all duration-150 ${isActive ? "border-primary bg-primary/10 shadow-sm shadow-primary/20" : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"}`}
                  >
                    {styleLocked && isActive && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3 h-3 text-primary/50" />
                      </div>
                    )}
                    <div className="text-2xl mb-1.5 leading-none">{style.emoji}</div>
                    <div className={`text-xs font-semibold leading-tight ${isActive ? "text-primary" : ""}`}>{style.name}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{style.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 4. View + Detail ──────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">View</p>
                <div className="flex flex-wrap gap-1.5">
                  {VIEW_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id as ViewId)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${view === v.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/40"}`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Detail</p>
                <div className="flex gap-1.5">
                  {DETAIL_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDetail(d.id as DetailId)}
                      className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${detail === d.id ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-foreground hover:border-primary/40"}`}
                      title={d.description}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Prompt + Chips + Quality ───────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Describe your {subtype.label.toLowerCase()}
              </p>
              {/* Prompt quality indicator */}
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
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-background text-sm resize-none outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/50"
              />
              {prompt.length > 150 && (
                <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground">
                  {prompt.length}/200
                </span>
              )}
            </div>

            {/* Quality indicator bar (shows when prompt is short/empty) */}
            {(promptQuality.level === "empty" || promptQuality.level === "short") && prompt.length === 0 && (
              <p className="text-[11px] text-muted-foreground/50 mt-2">
                Tip: describe color, material, and style for best results
              </p>
            )}

            {/* Quick chips */}
            {subtype.chips && subtype.chips.length > 0 && (
              <div className="mt-3">
                <p className="text-[10px] text-muted-foreground/60 mb-1.5 uppercase tracking-wider">Quick add</p>
                <div className="flex flex-wrap gap-1.5">
                  {subtype.chips.slice(0, 8).map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChipClick(chip)}
                      className="px-2 py-1 rounded-md border border-border bg-background text-[11px] text-muted-foreground hover:border-primary/50 hover:text-primary hover:bg-primary/5 transition-all"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Seed row */}
            <div className="mt-3 flex items-center gap-2">
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
          <Button
            onClick={handleGenerate}
            disabled={!isFormValid || isGenerating}
            className="w-full h-12 text-base font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
            size="lg"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Generate · ⚡ 1 credit
              </>
            )}
          </Button>

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
                  {activeResult.subtypeLabel} · {STYLE_PRESETS.find((s) => s.id === activeResult.styleId)?.name}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground/30">
                  <Sparkles className="w-14 h-14" />
                  <p className="text-sm font-medium">Your asset will appear here</p>
                </div>
              )}
            </div>

            {/* Actions */}
            {activeResult && (
              <div className="px-4 py-3 border-t border-border space-y-3">
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
