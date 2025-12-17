"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Grid3x3,
  Layers,
  Mountain,
  Square,
  Leaf,
  Hexagon,
  RefreshCw,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import { STYLES_2D_UI, COLOR_PALETTES } from "@/config";

// ===========================================
// TYPES
// ===========================================

interface GenerationResult {
  success: boolean;
  id: string;
  imageUrl: string;
  seed: number;
  tileType: string;
  styleId: string;
  creditsUsed: number;
  creditsRemaining: number;
}

// Tile types
const TILE_TYPES = [
  {
    id: "GROUND",
    name: "Ground/Floor",
    icon: Mountain,
    description: "Top-down ground textures",
    examples: ["grass", "dirt", "stone", "sand", "snow", "cobblestone"],
  },
  {
    id: "WALL",
    name: "Wall",
    icon: Square,
    description: "Vertical wall surfaces",
    examples: ["brick", "stone wall", "wood planks", "metal"],
  },
  {
    id: "NATURE",
    name: "Nature",
    icon: Leaf,
    description: "Organic natural textures",
    examples: ["leaves", "moss", "water", "lava", "crystal"],
  },
  {
    id: "ABSTRACT",
    name: "Abstract/Pattern",
    icon: Hexagon,
    description: "Decorative patterns",
    examples: ["geometric", "runes", "tech circuit", "ornamental"],
  },
];

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function TileGeneratorPage() {
  // Form state
  const [description, setDescription] = useState("");
  const [tileType, setTileType] = useState("GROUND");
  const [styleId, setStyleId] = useState("PIXEL_ART_32");
  const [colorPaletteId, setColorPaletteId] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showTypes, setShowTypes] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);

  // Preview state
  const [tiledPreview, setTiledPreview] = useState(true);

  // Get current selections
  const currentType = TILE_TYPES.find((t) => t.id === tileType);
  const currentStyle = STYLES_2D_UI.find((s) => s.id === styleId);
  const currentPalette = COLOR_PALETTES.find((p) => p.id === colorPaletteId);

  // Handle generation
  const handleGenerate = async () => {
    if (!description.trim()) {
      setError("Please describe your tile texture");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/generate-tile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: description.trim(),
          tileType,
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

  // Download tile
  const handleDownload = async () => {
    if (!result?.imageUrl) return;

    try {
      const response = await fetch(result.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tile-${tileType.toLowerCase()}-${result.seed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Use example prompt
  const useExample = (example: string) => {
    setDescription(example);
  };

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#00ff88]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />
      <div
        className="fixed bottom-20 right-10 w-80 h-80 bg-[#00d4ff]/10 rounded-full blur-[100px] animate-glow-pulse pointer-events-none"
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00ff88] to-[#00d4ff] flex items-center justify-center">
              <Grid3x3 className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-black gradient-text neon-text">
                SEAMLESS TILE GENERATOR
              </h1>
              <p className="text-[#a0a0b0]">
                Create perfectly tileable textures for your games
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Column - Settings */}
          <div className="space-y-6">
            {/* Description Input */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#00ff88]" />
                Tile Description
              </h3>

              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., mossy stone floor, cracked cobblestone, lush grass..."
                className="input-gaming mb-4"
              />

              {/* Quick examples */}
              {currentType && (
                <div>
                  <p className="text-xs text-[#a0a0b0] mb-2">Quick examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {currentType.examples.map((example) => (
                      <button
                        key={example}
                        onClick={() => useExample(example)}
                        className="px-3 py-1 rounded-lg bg-[#1a1a28] text-xs text-[#a0a0b0] hover:text-white hover:bg-[#2a2a3d] transition-all"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tile Type Selection */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Grid3x3 className="w-5 h-5 text-[#00d4ff]" />
                Tile Type
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {TILE_TYPES.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setTileType(type.id)}
                      className={`p-4 rounded-xl border transition-all text-left ${
                        tileType === type.id
                          ? "bg-[#00d4ff]/20 border-[#00d4ff]"
                          : "bg-[#1a1a28] border-[#2a2a3d] hover:border-[#00d4ff]/50"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <IconComponent
                          className={`w-5 h-5 ${
                            tileType === type.id
                              ? "text-[#00d4ff]"
                              : "text-[#a0a0b0]"
                          }`}
                        />
                        <span
                          className={
                            tileType === type.id ? "text-white" : "text-[#e0e0e0]"
                          }
                        >
                          {type.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#a0a0b0]">{type.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Style Selection */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-[#c084fc]" />
                Art Style
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowStyles(!showStyles)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#c084fc]/50 transition-all flex items-center justify-between"
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
                            ? "bg-[#c084fc]/20 border border-[#c084fc]"
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
                          <Check className="w-5 h-5 text-[#c084fc]" />
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
                <Palette className="w-5 h-5 text-[#ffd93d]" />
                Color Palette
                <span className="text-xs text-[#a0a0b0] font-normal ml-2">
                  (Optional)
                </span>
              </h3>

              <div className="relative">
                <button
                  onClick={() => setShowPalettes(!showPalettes)}
                  className="w-full p-4 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] hover:border-[#ffd93d]/50 transition-all flex items-center justify-between"
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
                          ? "bg-[#ffd93d]/20 border border-[#ffd93d]"
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
                        <Check className="w-5 h-5 text-[#ffd93d] ml-auto" />
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
                            ? "bg-[#ffd93d]/20 border border-[#ffd93d]"
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
                          <Check className="w-5 h-5 text-[#ffd93d]" />
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
              disabled={loading || !description.trim()}
              className="w-full btn-primary h-14 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Tile...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Seamless Tile (1 Credit)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Preview Area */}
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Grid3x3 className="w-5 h-5 text-[#00ff88]" />
                  Tile Preview
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setTiledPreview(!tiledPreview)}
                    className={`px-3 py-1 rounded-lg text-sm transition-all ${
                      tiledPreview
                        ? "bg-[#00ff88]/20 text-[#00ff88] border border-[#00ff88]/30"
                        : "bg-[#1a1a28] text-[#a0a0b0] border border-[#2a2a3d]"
                    }`}
                  >
                    Tiled View
                  </button>
                  {result && (
                    <Button
                      onClick={handleDownload}
                      variant="outline"
                      size="sm"
                      className="border-[#00ff88] text-[#00ff88]"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              </div>

              {result ? (
                <div
                  className="relative rounded-xl overflow-hidden"
                  style={{
                    height: tiledPreview ? "400px" : "auto",
                  }}
                >
                  {tiledPreview ? (
                    // Tiled preview - shows 3x3 grid
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${result.imageUrl})`,
                        backgroundSize: "33.33% 33.33%",
                        backgroundRepeat: "repeat",
                      }}
                    />
                  ) : (
                    // Single tile preview
                    <div className="aspect-square bg-[#0a0a0f]">
                      <img
                        src={result.imageUrl}
                        alt="Generated tile"
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className="aspect-square flex items-center justify-center bg-[#0a0a0f] rounded-xl">
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 text-[#00ff88] animate-spin mx-auto mb-4" />
                    <p className="text-[#a0a0b0]">Creating seamless tile...</p>
                  </div>
                </div>
              ) : (
                <div className="aspect-square flex items-center justify-center bg-[#0a0a0f] rounded-xl border border-[#2a2a3d]">
                  <div className="text-center p-8">
                    <Grid3x3 className="w-16 h-16 text-[#2a2a3d] mx-auto mb-4" />
                    <p className="text-[#a0a0b0]">
                      Your seamless tile will appear here
                    </p>
                    <p className="text-xs text-[#a0a0b0] mt-2">
                      Perfect for game backgrounds and environments
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Info Card */}
            {result && (
              <div className="glass-card rounded-2xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">
                  Generation Details
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[#a0a0b0]">Type</p>
                    <p className="text-white font-medium">
                      {currentType?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Style</p>
                    <p className="text-white font-medium">
                      {currentStyle?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Seed</p>
                    <p className="text-white font-mono">{result.seed}</p>
                  </div>
                  <div>
                    <p className="text-[#a0a0b0]">Credits Used</p>
                    <p className="text-[#ffd93d] font-medium">
                      {result.creditsUsed} credit
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Tips */}
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-bold text-white mb-4">Tips</h3>
              <ul className="space-y-2 text-sm text-[#a0a0b0]">
                <li className="flex items-start gap-2">
                  <span className="text-[#00ff88]">•</span>
                  Be specific about surface type (e.g., "cracked stone" vs just "stone")
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00ff88]">•</span>
                  Add details like "weathered", "mossy", or "ancient" for more character
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00ff88]">•</span>
                  Use the tiled preview to check seamlessness before downloading
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#00ff88]">•</span>
                  Match your color palette to your game's aesthetic
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
