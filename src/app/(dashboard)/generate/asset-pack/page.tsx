"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Sparkles,
  Download,
  Palette,
  Wand2,
  Check,
  ChevronDown,
  Package,
  Grid3x3,
  Sword,
  Shield,
  Gem,
  Leaf,
  Skull,
  Hammer,
  Wine,
  Coins,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { STYLES_2D_UI, ASSET_PACKS, COLOR_PALETTES } from "@/config";

// ===========================================
// TYPES
// ===========================================

interface GeneratedItem {
  id: string;
  name: string;
  imageUrl: string;
  category: string;
  subcategory: string;
  seed: number;
}

interface GenerationResult {
  success: boolean;
  pack: {
    id: string;
    name: string;
    itemCount: number;
  };
  items: GeneratedItem[];
  baseSeed: number;
  styleId: string;
  colorPaletteId?: string;
  creditsUsed: number;
  creditsRemaining: number;
}

// Pack icon mapping
const PACK_ICONS: Record<string, React.ReactNode> = {
  WARRIOR_LOADOUT: <Sword className="w-5 h-5" />,
  MAGE_ESSENTIALS: <Wand2 className="w-5 h-5" />,
  ROGUE_TOOLKIT: <Shield className="w-5 h-5" />,
  DUNGEON_LOOT: <Gem className="w-5 h-5" />,
  NATURE_ELEMENTS: <Leaf className="w-5 h-5" />,
  MEDIEVAL_FOOD: <Wine className="w-5 h-5" />,
  MONSTER_DROPS: <Skull className="w-5 h-5" />,
  CRAFTING_MATERIALS: <Hammer className="w-5 h-5" />,
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function AssetPackPage() {
  // Form state
  const [packId, setPackId] = useState("");
  const [styleId, setStyleId] = useState("");
  const [colorPaletteId, setColorPaletteId] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showPacks, setShowPacks] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);

  // Get current selections
  const currentPack = ASSET_PACKS.find((p) => p.id === packId);
  const currentStyle = STYLES_2D_UI.find((s) => s.id === styleId);
  const currentPalette = COLOR_PALETTES.find((p) => p.id === colorPaletteId);

  // Auto-set suggested style when pack changes
  const handlePackSelect = (id: string) => {
    setPackId(id);
    const pack = ASSET_PACKS.find((p) => p.id === id);
    if (pack && !styleId) {
      setStyleId(pack.suggestedStyle);
    }
    setShowPacks(false);
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!packId) {
      setError("Please select an asset pack");
      return;
    }

    if (!styleId) {
      setError("Please select an art style");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate-asset-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetPackId: packId,
          styleId,
          colorPaletteId: colorPaletteId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setResult(data);
      triggerCreditsRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  // Download single item
  const handleDownloadItem = async (item: GeneratedItem) => {
    try {
      const response = await fetch(item.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${item.name.toLowerCase().replace(/\s+/g, "-")}-${item.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Download all as zip (creates individual downloads for now)
  const handleDownloadAll = async () => {
    if (!result?.items.length) return;

    for (const item of result.items) {
      await handleDownloadItem(item);
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  };

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#c084fc]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div
        className="fixed bottom-20 right-10 w-80 h-80 bg-[#00ff88]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none"
        style={{ animationDelay: "1s" }}
      />

      <div className="relative z-10 p-4 lg:p-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/generate"
            className="inline-flex items-center gap-2 text-[#a0a0b0] hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Generator
          </Link>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
              <Package className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                ASSET PACK GENERATOR
              </h1>
              <p className="text-[#a0a0b0]">
                Generate themed sets of matching game assets
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Asset Pack Selection */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-[#c084fc]" />
                Select Asset Pack
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowPacks(!showPacks)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#c084fc]/50 transition-all flex items-center justify-between"
                >
                  {currentPack ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#c084fc]/20 flex items-center justify-center text-[#c084fc]">
                        {PACK_ICONS[currentPack.id] || <Package className="w-5 h-5" />}
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-white">
                          {currentPack.emoji} {currentPack.name}
                        </p>
                        <p className="text-xs text-[#a0a0b0]">
                          {currentPack.itemCount} items • {currentPack.creditsRequired} credits
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#a0a0b0]">Choose an asset pack...</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-[#a0a0b0] transition-transform ${
                      showPacks ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showPacks && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl p-2 z-50 max-h-[400px] overflow-y-auto">
                    {ASSET_PACKS.map((pack) => (
                      <button
                        key={pack.id}
                        onClick={() => handlePackSelect(pack.id)}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                          packId === pack.id
                            ? "bg-[#c084fc]/20 border border-[#c084fc]"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            packId === pack.id
                              ? "bg-[#c084fc]/30 text-[#c084fc]"
                              : "bg-[#1a1a28] text-[#a0a0b0]"
                          }`}
                        >
                          {PACK_ICONS[pack.id] || <Package className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 text-left">
                          <p
                            className={`font-medium ${
                              packId === pack.id ? "text-white" : "text-[#e0e0e0]"
                            }`}
                          >
                            {pack.emoji} {pack.name}
                          </p>
                          <p className="text-xs text-[#a0a0b0]">
                            {pack.description}
                          </p>
                          <p className="text-xs text-[#c084fc] mt-1">
                            {pack.itemCount} items • {pack.creditsRequired} credits
                          </p>
                        </div>
                        {packId === pack.id && (
                          <Check className="w-5 h-5 text-[#c084fc]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Pack preview */}
              {currentPack && (
                <div className="mt-4 p-4 rounded-xl bg-[#0a0a0f] border border-[#2a2a3d]">
                  <p className="text-sm text-[#a0a0b0] mb-2">Items included:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentPack.items.map((item) => (
                      <span
                        key={item.id}
                        className="px-2 py-1 rounded-lg bg-[#1a1a28] text-xs text-white"
                      >
                        {item.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Style Selection */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#00d4ff]" />
                Art Style
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowStyles(!showStyles)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#00d4ff]/50 transition-all flex items-center justify-between"
                >
                  {currentStyle ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{currentStyle.emoji}</span>
                      <div className="text-left">
                        <p className="font-medium text-white">{currentStyle.name}</p>
                        <p className="text-xs text-[#a0a0b0]">
                          {currentStyle.description}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <span className="text-[#a0a0b0]">Select art style...</span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-[#a0a0b0] transition-transform ${
                      showStyles ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showStyles && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl p-2 z-40 max-h-[300px] overflow-y-auto">
                    {STYLES_2D_UI.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setStyleId(style.id);
                          setShowStyles(false);
                        }}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                          styleId === style.id
                            ? "bg-[#00d4ff]/20 border border-[#00d4ff]"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <span className="text-2xl">{style.emoji}</span>
                        <div className="flex-1 text-left">
                          <p
                            className={
                              styleId === style.id ? "text-white" : "text-[#e0e0e0]"
                            }
                          >
                            {style.name}
                          </p>
                          <p className="text-xs text-[#a0a0b0]">
                            {style.description}
                          </p>
                        </div>
                        {styleId === style.id && (
                          <Check className="w-5 h-5 text-[#00d4ff]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Color Palette (Optional) */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#00ff88]" />
                Color Palette
                <span className="text-xs text-[#a0a0b0] font-normal ml-2">
                  (Optional)
                </span>
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowPalettes(!showPalettes)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#00ff88]/50 transition-all flex items-center justify-between"
                >
                  {currentPalette ? (
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-1">
                        {currentPalette.colors.slice(0, 4).map((color, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 border-[#030305]"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <p className="font-medium text-white">
                        {currentPalette.emoji} {currentPalette.name}
                      </p>
                    </div>
                  ) : (
                    <span className="text-[#a0a0b0]">
                      No palette (auto colors)
                    </span>
                  )}
                  <ChevronDown
                    className={`w-5 h-5 text-[#a0a0b0] transition-transform ${
                      showPalettes ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showPalettes && (
                  <div className="absolute top-full left-0 right-0 mt-2 glass-card rounded-xl p-2 z-30 max-h-[300px] overflow-y-auto">
                    <button
                      onClick={() => {
                        setColorPaletteId("");
                        setShowPalettes(false);
                      }}
                      className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                        !colorPaletteId
                          ? "bg-[#00ff88]/20 border border-[#00ff88]"
                          : "hover:bg-white/5"
                      }`}
                    >
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white text-xs">AUTO</span>
                      </div>
                      <p className={!colorPaletteId ? "text-white" : "text-[#e0e0e0]"}>
                        Automatic Colors
                      </p>
                      {!colorPaletteId && (
                        <Check className="w-5 h-5 text-[#00ff88] ml-auto" />
                      )}
                    </button>

                    {COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.id}
                        onClick={() => {
                          setColorPaletteId(palette.id);
                          setShowPalettes(false);
                        }}
                        className={`w-full p-3 rounded-lg flex items-center gap-3 transition-all ${
                          colorPaletteId === palette.id
                            ? "bg-[#00ff88]/20 border border-[#00ff88]"
                            : "hover:bg-white/5"
                        }`}
                      >
                        <div className="flex -space-x-1">
                          {palette.colors.slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="w-6 h-6 rounded-full border-2 border-[#030305]"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                        <div className="flex-1 text-left">
                          <p
                            className={
                              colorPaletteId === palette.id
                                ? "text-white"
                                : "text-[#e0e0e0]"
                            }
                          >
                            {palette.emoji} {palette.name}
                          </p>
                          <p className="text-xs text-[#a0a0b0]">
                            {palette.description}
                          </p>
                        </div>
                        {colorPaletteId === palette.id && (
                          <Check className="w-5 h-5 text-[#00ff88]" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !packId || !styleId}
              className="w-full btn-primary h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating {currentPack?.itemCount || 6} Assets...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Asset Pack ({currentPack?.creditsRequired || 6} Credits)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {/* Results Grid */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5 text-[#c084fc]" />
                  Generated Assets
                </h3>
                {result && (
                  <Button
                    onClick={handleDownloadAll}
                    variant="outline"
                    size="sm"
                    className="border-[#00ff88] text-[#00ff88]"
                  >
                    <Download className="w-4 h-4 mr-1" />
                    Download All
                  </Button>
                )}
              </div>

              {result ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {result.items.map((item) => (
                    <div
                      key={item.id}
                      className="group relative rounded-xl overflow-hidden bg-[#0a0a0f] border border-[#2a2a3d] hover:border-[#c084fc]/50 transition-all"
                    >
                      {/* Image */}
                      <div className="aspect-square p-2 relative">
                        <div className="absolute inset-0 grid-pattern-dense opacity-30" />
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain relative z-10"
                        />

                        {/* Hover overlay */}
                        <div className="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                          <Button
                            size="sm"
                            onClick={() => handleDownloadItem(item)}
                            className="bg-[#00ff88] hover:bg-[#00ff88]/80 text-black"
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Download
                          </Button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-2 border-t border-[#2a2a3d]">
                        <p className="text-xs font-medium text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-xs text-[#a0a0b0]">
                          {item.category}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : loading ? (
                <div className="py-20 text-center">
                  <Loader2 className="w-12 h-12 text-[#c084fc] animate-spin mx-auto mb-4" />
                  <p className="text-[#a0a0b0]">
                    Generating your asset pack...
                  </p>
                  <p className="text-xs text-[#a0a0b0] mt-2">
                    This may take a minute
                  </p>
                </div>
              ) : (
                <div className="py-20 text-center">
                  <Package className="w-16 h-16 text-[#2a2a3d] mx-auto mb-4" />
                  <p className="text-[#a0a0b0]">
                    Select an asset pack and click generate
                  </p>
                  <p className="text-xs text-[#a0a0b0] mt-2">
                    Your generated assets will appear here
                  </p>
                </div>
              )}
            </div>

            {/* Generation Info */}
            {result && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-[#ffd93d]" />
                  Generation Details
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#a0a0b0]">Pack</p>
                    <p className="text-white font-medium">{result.pack.name}</p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Items Generated</p>
                    <p className="text-white font-medium">{result.items.length}</p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Base Seed</p>
                    <p className="text-white font-mono">{result.baseSeed}</p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Credits Used</p>
                    <p className="text-[#ffd93d] font-medium">
                      {result.creditsUsed} credits
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
