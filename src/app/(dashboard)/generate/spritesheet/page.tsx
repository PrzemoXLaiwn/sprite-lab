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
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Palette,
  Layers,
  Wand2,
  Check,
  ChevronDown,
  RefreshCw,
  FileJson,
  ImageIcon,
} from "lucide-react";
import { triggerCreditsRefresh } from "@/components/dashboard/CreditsDisplay";
import {
  ALL_CATEGORIES,
  STYLES_2D_UI,
  ANIMATION_TYPES,
  COLOR_PALETTES,
} from "@/config";

// ===========================================
// TYPES
// ===========================================

interface GeneratedFrame {
  frameId: string;
  frameName: string;
  imageUrl: string;
  seed: number;
}

interface GenerationResult {
  success: boolean;
  frames: GeneratedFrame[];
  frameCount: number;
  baseSeed: number;
  creditsUsed: number;
  duration: string;
  animationType: { id: string; name: string };
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export default function SpriteSheetPage() {
  // Form state
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [styleId, setStyleId] = useState("PIXEL_ART_32");
  const [animationTypeId, setAnimationTypeId] = useState("WALK");
  const [prompt, setPrompt] = useState("");
  const [colorPaletteId, setColorPaletteId] = useState("");

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [showCategories, setShowCategories] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showPalettes, setShowPalettes] = useState(false);

  // Animation preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState(150); // ms per frame

  // Get current selections
  const currentCategory = ALL_CATEGORIES.find((c) => c.id === categoryId);
  const currentSubcategory = currentCategory?.subcategories.find(
    (s) => s.id === subcategoryId
  );
  const currentAnimationType = ANIMATION_TYPES.find(
    (a) => a.id === animationTypeId
  );
  const currentStyle = STYLES_2D_UI.find((s) => s.id === styleId);
  const currentPalette = COLOR_PALETTES.find((p) => p.id === colorPaletteId);

  // Animation preview effect
  useState(() => {
    if (!isPlaying || !result?.frames.length) return;

    const interval = setInterval(() => {
      setCurrentFrameIndex((prev) =>
        prev >= (result?.frames.length || 1) - 1 ? 0 : prev + 1
      );
    }, animationSpeed);

    return () => clearInterval(interval);
  });

  // Handle generation
  const handleGenerate = async () => {
    if (!categoryId || !subcategoryId || !prompt.trim()) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setIsPlaying(false);
    setCurrentFrameIndex(0);

    try {
      const response = await fetch("/api/generate-spritesheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          categoryId,
          subcategoryId,
          styleId,
          animationTypeId,
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

  // Download single frame
  const handleDownloadFrame = async (frame: GeneratedFrame) => {
    try {
      const response = await fetch(frame.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${animationTypeId.toLowerCase()}_${frame.frameId}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Download all frames as sprite sheet
  const handleDownloadSpriteSheet = async () => {
    if (!result?.frames.length) return;

    // Create canvas for sprite sheet
    const frameSize = 256;
    const cols = Math.ceil(Math.sqrt(result.frames.length));
    const rows = Math.ceil(result.frames.length / cols);

    const canvas = document.createElement("canvas");
    canvas.width = frameSize * cols;
    canvas.height = frameSize * rows;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Load and draw all frames
    const loadImage = (url: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
    };

    try {
      for (let i = 0; i < result.frames.length; i++) {
        const img = await loadImage(result.frames[i].imageUrl);
        const col = i % cols;
        const row = Math.floor(i / cols);
        ctx.drawImage(img, col * frameSize, row * frameSize, frameSize, frameSize);
      }

      // Download
      const dataUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `spritesheet_${animationTypeId.toLowerCase()}_${result.baseSeed}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error("Sprite sheet creation failed:", err);
    }
  };

  // Download JSON metadata
  const handleDownloadMetadata = () => {
    if (!result?.frames.length) return;

    const metadata = {
      animation: currentAnimationType?.name,
      frameCount: result.frames.length,
      frameRate: Math.round(1000 / animationSpeed),
      loop: true,
      frames: result.frames.map((f, i) => ({
        id: f.frameId,
        name: f.frameName,
        index: i,
        x: (i % Math.ceil(Math.sqrt(result.frames.length))) * 256,
        y: Math.floor(i / Math.ceil(Math.sqrt(result.frames.length))) * 256,
        width: 256,
        height: 256,
      })),
      spriteSheet: {
        width: Math.ceil(Math.sqrt(result.frames.length)) * 256,
        height: Math.ceil(result.frames.length / Math.ceil(Math.sqrt(result.frames.length))) * 256,
      },
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spritesheet_${animationTypeId.toLowerCase()}_metadata.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#030305] relative overflow-hidden">
      {/* Background */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="fixed top-20 left-10 w-96 h-96 bg-[#c084fc]/10 rounded-full blur-[120px] animate-glow-pulse pointer-events-none" />

      <div className="relative z-10 p-4 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link href="/generate">
            <Button variant="outline" className="mb-4 border-[#2a2a3d]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Generator
            </Button>
          </Link>
          <h1 className="text-3xl font-display font-black gradient-text neon-text mb-2">
            SPRITE SHEET GENERATOR
          </h1>
          <p className="text-[#a0a0b0]">
            Generate animation frames for your game characters
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Configuration */}
          <div className="space-y-6">
            {/* Animation Type */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">
                  1
                </div>
                <h3 className="font-semibold text-white">Animation Type</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {ANIMATION_TYPES.map((anim) => {
                  const isSelected = animationTypeId === anim.id;
                  return (
                    <button
                      key={anim.id}
                      onClick={() => setAnimationTypeId(anim.id)}
                      className={`p-3 rounded-xl text-center transition-all border ${
                        isSelected
                          ? "border-[#00ff88] bg-[#00ff88]/10"
                          : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                      }`}
                    >
                      <div className="text-2xl mb-1">{anim.emoji}</div>
                      <span
                        className={`text-xs font-medium block ${
                          isSelected ? "text-[#00ff88]" : "text-white"
                        }`}
                      >
                        {anim.name}
                      </span>
                      <span className="text-[10px] text-[#a0a0b0]">
                        {anim.frameCount} frames • {anim.creditsRequired} credits
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Category & Subcategory */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">
                  2
                </div>
                <h3 className="font-semibold text-white">Category & Type</h3>
              </div>

              {/* Category Dropdown */}
              <div className="relative mb-3">
                <button
                  onClick={() => setShowCategories(!showCategories)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] text-left"
                >
                  <span className="text-white">
                    {currentCategory ? (
                      <span className="flex items-center gap-2">
                        <span>{currentCategory.icon}</span>
                        <span>{currentCategory.name}</span>
                      </span>
                    ) : (
                      <span className="text-[#a0a0b0]">Select category...</span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-[#a0a0b0] transition-transform ${
                      showCategories ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {showCategories && (
                  <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] z-20 max-h-60 overflow-y-auto">
                    {ALL_CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => {
                          setCategoryId(cat.id);
                          setSubcategoryId("");
                          setShowCategories(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2a3d] text-left"
                      >
                        <span>{cat.icon}</span>
                        <span className="text-white text-sm">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Subcategory Grid */}
              {currentCategory && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {currentCategory.subcategories.slice(0, 12).map((sub) => {
                    const isSelected = subcategoryId === sub.id;
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSubcategoryId(sub.id)}
                        className={`p-2 rounded-lg text-center transition-all border ${
                          isSelected
                            ? "border-[#00ff88] bg-[#00ff88]/10"
                            : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                        }`}
                      >
                        <span
                          className={`text-xs ${
                            isSelected ? "text-[#00ff88]" : "text-white"
                          }`}
                        >
                          {sub.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Style & Palette */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">
                  3
                </div>
                <h3 className="font-semibold text-white">Style & Colors</h3>
              </div>

              {/* Style Selection */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                {STYLES_2D_UI.slice(0, 8).map((style) => {
                  const isSelected = styleId === style.id;
                  return (
                    <button
                      key={style.id}
                      onClick={() => setStyleId(style.id)}
                      className={`p-2 rounded-lg text-center transition-all border ${
                        isSelected
                          ? "border-[#00ff88] bg-[#00ff88]/10"
                          : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{style.emoji}</span>
                      <span
                        className={`text-[10px] ${
                          isSelected ? "text-[#00ff88]" : "text-white"
                        }`}
                      >
                        {style.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Color Palette */}
              <div className="relative">
                <button
                  onClick={() => setShowPalettes(!showPalettes)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-[#1a1a28] border border-[#2a2a3d]"
                >
                  <span className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#c084fc]" />
                    <span className="text-white text-sm">
                      {currentPalette ? currentPalette.name : "Default Colors"}
                    </span>
                  </span>
                  {currentPalette && (
                    <div className="flex gap-1">
                      {currentPalette.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-4 h-4 rounded-full border border-white/20"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </button>

                {showPalettes && (
                  <div className="absolute top-full left-0 right-0 mt-1 p-2 rounded-xl bg-[#1a1a28] border border-[#2a2a3d] z-20 max-h-60 overflow-y-auto">
                    <button
                      onClick={() => {
                        setColorPaletteId("");
                        setShowPalettes(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[#2a2a3d]"
                    >
                      <span className="text-white text-sm">Default Colors</span>
                    </button>
                    {COLOR_PALETTES.map((palette) => (
                      <button
                        key={palette.id}
                        onClick={() => {
                          setColorPaletteId(palette.id);
                          setShowPalettes(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#2a2a3d]"
                      >
                        <span className="flex items-center gap-2">
                          <span>{palette.emoji}</span>
                          <span className="text-white text-sm">{palette.name}</span>
                        </span>
                        <div className="flex gap-0.5">
                          {palette.colors.slice(0, 4).map((color, i) => (
                            <div
                              key={i}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Prompt */}
            <div className="glass-card rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#00ff88] to-[#00d4ff] flex items-center justify-center text-[#030305] font-bold text-sm">
                  4
                </div>
                <h3 className="font-semibold text-white">Describe Your Character</h3>
              </div>
              <Input
                placeholder="e.g., armored knight with blue cape, heroic warrior with glowing sword..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="h-14 input-gaming"
              />
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={loading || !categoryId || !subcategoryId || !prompt.trim()}
              className="w-full h-14 bg-gradient-to-r from-[#00ff88] to-[#00d4ff] hover:opacity-90 text-[#030305] font-display font-bold text-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating {currentAnimationType?.frameCount || 4} Frames...
                </>
              ) : (
                <>
                  <Layers className="w-5 h-5 mr-2" />
                  Generate Sprite Sheet ({currentAnimationType?.creditsRequired || 4}{" "}
                  credits)
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Right Column - Preview */}
          <div className="space-y-6">
            {/* Animation Preview */}
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#2a2a3d]">
                <h3 className="font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00ff88]" />
                  Animation Preview
                </h3>
              </div>

              <div className="aspect-square bg-[#0a0a0f] flex items-center justify-center relative">
                <div className="absolute inset-0 grid-pattern-dense opacity-30" />

                {loading ? (
                  <div className="text-center z-10">
                    <div className="relative w-24 h-24 mx-auto mb-4">
                      <div className="absolute inset-0 bg-[#00ff88] rounded-full blur-xl opacity-30 animate-pulse" />
                      <div className="relative w-full h-full rounded-full border-4 border-[#2a2a3d] border-t-[#00ff88] animate-spin" />
                      <Layers className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-[#00ff88]" />
                    </div>
                    <p className="font-display font-bold text-white">
                      Generating Frames...
                    </p>
                    <p className="text-sm text-[#a0a0b0]">
                      This may take 1-2 minutes
                    </p>
                  </div>
                ) : result?.frames.length ? (
                  <div className="relative z-10 p-8">
                    <img
                      src={result.frames[currentFrameIndex]?.imageUrl}
                      alt={`Frame ${currentFrameIndex + 1}`}
                      className="w-full h-full object-contain max-h-[400px]"
                      style={{ imageRendering: "pixelated" }}
                    />
                  </div>
                ) : (
                  <div className="text-center z-10 p-8">
                    <div className="w-32 h-32 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#00ff88]/20 to-[#00d4ff]/20 flex items-center justify-center border border-[#00ff88]/20">
                      <Layers className="w-16 h-16 text-[#00ff88]/50" />
                    </div>
                    <p className="text-[#a0a0b0]">
                      Your sprite sheet will appear here
                    </p>
                  </div>
                )}
              </div>

              {/* Playback Controls */}
              {result?.frames.length ? (
                <div className="p-4 border-t border-[#2a2a3d]">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        setCurrentFrameIndex((prev) =>
                          prev <= 0 ? result.frames.length - 1 : prev - 1
                        )
                      }
                      className="border-[#2a2a3d]"
                    >
                      <SkipBack className="w-4 h-4" />
                    </Button>

                    <Button
                      size="icon"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="w-12 h-12 bg-[#00ff88] hover:bg-[#00ff88]/80 text-[#030305]"
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </Button>

                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() =>
                        setCurrentFrameIndex((prev) =>
                          prev >= result.frames.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="border-[#2a2a3d]"
                    >
                      <SkipForward className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-sm text-[#a0a0b0]">
                    <span>
                      Frame {currentFrameIndex + 1}/{result.frames.length}
                    </span>
                    <span>•</span>
                    <span>{result.frames[currentFrameIndex]?.frameName}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {/* All Frames Grid */}
            {result?.frames.length ? (
              <div className="glass-card rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-white">
                    All Frames ({result.frames.length})
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadSpriteSheet}
                      className="border-[#00ff88] text-[#00ff88]"
                    >
                      <ImageIcon className="w-4 h-4 mr-1" />
                      PNG
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadMetadata}
                      className="border-[#c084fc] text-[#c084fc]"
                    >
                      <FileJson className="w-4 h-4 mr-1" />
                      JSON
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {result.frames.map((frame, index) => (
                    <button
                      key={frame.frameId}
                      onClick={() => setCurrentFrameIndex(index)}
                      className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        currentFrameIndex === index
                          ? "border-[#00ff88]"
                          : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                      }`}
                    >
                      <img
                        src={frame.imageUrl}
                        alt={frame.frameName}
                        className="w-full h-full object-contain bg-[#0a0a0f]"
                        style={{ imageRendering: "pixelated" }}
                      />
                    </button>
                  ))}
                </div>

                {/* Download Individual Frames */}
                <div className="mt-4 pt-4 border-t border-[#2a2a3d]">
                  <Button
                    variant="outline"
                    onClick={() => handleDownloadFrame(result.frames[currentFrameIndex])}
                    className="w-full border-[#2a2a3d]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Current Frame
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
