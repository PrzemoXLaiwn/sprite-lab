"use client";

import { useState, useCallback, useRef, useEffect } from "react";
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
  ChevronDown,
  Wand2,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { triggerUpgradeModal } from "@/components/dashboard/UpgradeModal";

// =============================================================================
// GENERATOR DATA — real backend IDs only
// =============================================================================

const GENERATOR_CATEGORIES = [
  {
    label: "Items",
    icon: "💎",
    subcategories: [
      { categoryId: "WEAPONS",     subcategoryId: "SWORDS",      label: "Swords" },
      { categoryId: "WEAPONS",     subcategoryId: "AXES",        label: "Axes & Hammers" },
      { categoryId: "WEAPONS",     subcategoryId: "BOWS",        label: "Bows" },
      { categoryId: "WEAPONS",     subcategoryId: "STAFFS",      label: "Staffs & Wands" },
      { categoryId: "WEAPONS",     subcategoryId: "GUNS",        label: "Firearms" },
      { categoryId: "WEAPONS",     subcategoryId: "THROWING",    label: "Throwing Weapons" },
      { categoryId: "ARMOR",       subcategoryId: "HELMETS",     label: "Helmets" },
      { categoryId: "ARMOR",       subcategoryId: "CHEST_ARMOR", label: "Chest Armor" },
      { categoryId: "ARMOR",       subcategoryId: "SHIELDS",     label: "Shields" },
      { categoryId: "ARMOR",       subcategoryId: "ACCESSORIES", label: "Accessories" },
      { categoryId: "CONSUMABLES", subcategoryId: "POTIONS",     label: "Potions" },
      { categoryId: "CONSUMABLES", subcategoryId: "FOOD",        label: "Food" },
      { categoryId: "CONSUMABLES", subcategoryId: "SCROLLS",     label: "Scrolls" },
      { categoryId: "RESOURCES",   subcategoryId: "GEMS",        label: "Gems" },
      { categoryId: "RESOURCES",   subcategoryId: "ORES",        label: "Ores" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "KEYS",        label: "Keys" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "CONTAINERS",  label: "Containers" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "COLLECTIBLES",label: "Collectibles" },
    ],
  },
  {
    label: "Icons",
    icon: "🎮",
    subcategories: [
      { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS",  label: "Item Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "SKILL_ICONS", label: "Skill Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "STATUS_ICONS",label: "Status Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "ICONS_UI",    label: "UI Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BUTTONS",     label: "Buttons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BARS",        label: "Bars" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "FRAMES",      label: "Frames" },
    ],
  },
  {
    label: "Enemies",
    icon: "👾",
    subcategories: [
      { categoryId: "CHARACTERS",  subcategoryId: "ENEMIES",     label: "Enemies" },
      { categoryId: "CHARACTERS",  subcategoryId: "BOSSES",      label: "Bosses" },
      { categoryId: "CHARACTERS",  subcategoryId: "HEROES",      label: "Heroes" },
      { categoryId: "CHARACTERS",  subcategoryId: "NPCS",        label: "NPCs" },
      { categoryId: "CREATURES",   subcategoryId: "ANIMALS",     label: "Animals" },
      { categoryId: "CREATURES",   subcategoryId: "MYTHICAL",    label: "Mythical Beasts" },
      { categoryId: "CREATURES",   subcategoryId: "ELEMENTALS",  label: "Elementals" },
    ],
  },
] as const;

type CategoryGroup = (typeof GENERATOR_CATEGORIES)[number]["label"];
type SubcategoryEntry = {
  categoryId: string;
  subcategoryId: string;
  label: string;
};

const DEFAULT_SUBTYPE: Record<CategoryGroup, SubcategoryEntry> = {
  Items:   GENERATOR_CATEGORIES[0].subcategories[0],
  Icons:   GENERATOR_CATEGORIES[1].subcategories[0],
  Enemies: GENERATOR_CATEGORIES[2].subcategories[0],
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
  STATUS_ICONS: "e.g. poison icon, freeze icon, burn status, shield buff",
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
  const [activeGroup, setActiveGroup]     = useState<CategoryGroup>("Items");
  const [subtype, setSubtype]             = useState<SubcategoryEntry>(DEFAULT_SUBTYPE["Items"]);
  const [styleId, setStyleId]             = useState<StyleId>("PIXEL_ART_16");
  const [view, setView]                   = useState<ViewId>("none");
  const [detail, setDetail]               = useState<DetailId>("normal");
  const [prompt, setPrompt]               = useState("");
  const [seed, setSeed]                   = useState("");

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

      setHistory((prev) => [newResult, ...prev].slice(0, 10));
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
    seedRef.current = "";
    setSeed("");
    handleGenerate();
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
    <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Wand2 className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Generate Asset</h1>
        </div>
        <p className="text-muted-foreground text-sm ml-12">
          Pick a type, choose a style, describe your asset.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-6 lg:gap-8 items-start">

        {/* ================================================================
            LEFT COLUMN — Form
        ================================================================ */}
        <div className="space-y-5">

          {/* ── 1. Asset Type ─────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              1. Asset Type
            </p>
            <div className="flex gap-2">
              {GENERATOR_CATEGORIES.map((group) => (
                <button
                  key={group.label}
                  onClick={() => handleGroupChange(group.label as CategoryGroup)}
                  className={`
                    flex-1 py-3 px-3 rounded-lg border text-sm font-semibold transition-all
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
                className="
                  w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg
                  border border-border bg-background text-sm font-medium
                  hover:border-primary/50 transition-colors
                "
              >
                <span>{subtype.label}</span>
                <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${subtypeOpen ? "rotate-180" : ""}`} />
              </button>

              {subtypeOpen && (
                <div className="
                  absolute z-20 top-full mt-1.5 w-full bg-card border border-border
                  rounded-xl shadow-2xl max-h-60 overflow-y-auto
                ">
                  {currentGroup.subcategories.map((entry) => {
                    const isActive = subtype.subcategoryId === entry.subcategoryId && subtype.categoryId === entry.categoryId;
                    return (
                      <button
                        key={`${entry.categoryId}-${entry.subcategoryId}`}
                        onClick={() => handleSubtypeChange(entry)}
                        className={`
                          w-full text-left px-3.5 py-2.5 text-sm transition-colors
                          first:rounded-t-xl last:rounded-b-xl
                          ${isActive
                            ? "text-primary bg-primary/8 font-medium"
                            : "text-foreground hover:bg-muted/60"
                          }
                        `}
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
            <div className="grid grid-cols-3 gap-2">
              {STYLE_PRESETS.map((style) => {
                const isActive = styleId === style.id;
                return (
                  <button
                    key={style.id}
                    onClick={() => setStyleId(style.id)}
                    className={`
                      relative p-3 rounded-xl border text-left transition-all duration-150 group
                      ${isActive
                        ? "border-primary bg-primary/10 shadow-sm shadow-primary/20"
                        : "border-border bg-background hover:border-primary/40 hover:bg-primary/5"
                      }
                    `}
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
            <div className="grid grid-cols-2 gap-5">
              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  View
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VIEW_OPTIONS.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => setView(v.id as ViewId)}
                      className={`
                        px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                        ${view === v.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                        }
                      `}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                  Detail
                </p>
                <div className="flex gap-1.5">
                  {DETAIL_OPTIONS.map((d) => (
                    <button
                      key={d.id}
                      onClick={() => setDetail(d.id as DetailId)}
                      className={`
                        flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all
                        ${detail === d.id
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-foreground hover:border-primary/40"
                        }
                      `}
                      title={d.description}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Prompt ────────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
              Describe your {subtype.label.toLowerCase()}
            </p>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={placeholder}
                maxLength={200}
                rows={3}
                className="
                  w-full px-3.5 py-2.5 rounded-lg border border-border bg-background
                  text-sm resize-none outline-none focus:border-primary/60 focus:ring-1 focus:ring-primary/20
                  transition-all placeholder:text-muted-foreground/50
                "
              />
              {prompt.length > 150 && (
                <span className="absolute bottom-2.5 right-3 text-[10px] text-muted-foreground">
                  {prompt.length}/200
                </span>
              )}
            </div>

            {/* Seed row inline */}
            <div className="mt-3 flex items-center gap-2">
              <label className="text-xs text-muted-foreground shrink-0 font-medium">Seed:</label>
              <input
                type="number"
                min={0}
                max={2147483647}
                placeholder="Random"
                value={seed}
                onChange={(e) => { setSeed(e.target.value); seedRef.current = e.target.value; }}
                className="
                  flex-1 px-2.5 py-1.5 rounded-lg border border-border bg-background
                  text-xs outline-none focus:border-primary/60 transition-colors
                  placeholder:text-muted-foreground/50
                "
              />
            </div>
          </div>

          {/* ── Generate button ───────────────────────────────────────── */}
          <Button
            onClick={handleGenerate}
            disabled={!isFormValid || isGenerating}
            className="w-full h-13 text-base font-bold rounded-xl shadow-lg shadow-primary/20 transition-all"
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
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Result</p>
              {activeResult && (
                <span className="text-[10px] text-muted-foreground">
                  {activeResult.subtypeLabel} · {STYLE_PRESETS.find((s) => s.id === activeResult.styleId)?.name}
                </span>
              )}
            </div>

            {/* Checkerboard canvas */}
            <div
              className="relative aspect-square"
              style={{
                backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)",
                backgroundSize: "24px 24px",
              }}
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

            {/* Action row */}
            {activeResult && (
              <div className="px-4 py-3 border-t border-border space-y-3">
                {/* Seed row */}
                <button
                  onClick={handleCopySeed}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                >
                  {seedCopied
                    ? <Check className="w-3 h-3 text-green-500 shrink-0" />
                    : <Copy className="w-3 h-3 shrink-0" />
                  }
                  <span>Seed: {activeResult.seed}</span>
                  <span className="ml-auto text-[10px] opacity-60">{seedCopied ? "Copied!" : "Copy"}</span>
                </button>

                {/* Buttons */}
                <div className="flex gap-2">
                  <Button onClick={handleDownload} className="flex-1 font-semibold">
                    <Download className="w-4 h-4 mr-2" />
                    Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="px-3"
                  >
                    <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* ── Session history ───────────────────────────────────────── */}
          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3">
                This session
              </p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {history.map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedIndex(index)}
                    className={`
                      relative shrink-0 w-16 h-16 rounded-xl border overflow-hidden transition-all
                      ${selectedIndex === index
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                      }
                    `}
                    style={{
                      backgroundImage: "repeating-conic-gradient(#80808015 0% 25%, transparent 0% 50%)",
                      backgroundSize: "12px 12px",
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
