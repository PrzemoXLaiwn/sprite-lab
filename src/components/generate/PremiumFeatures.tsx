"use client";

import { useState } from "react";
import {
  Sparkles,
  Film,
  Palette,
  Blend,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  Zap,
} from "lucide-react";
import {
  ANIMATION_TYPES,
  COLOR_PALETTES,
  STYLES_2D_UI,
  STYLE_COMPATIBILITY,
  STYLE_MIX_PRESETS,
} from "@/config";

// ===========================================
// TYPES
// ===========================================

interface PremiumFeaturesProps {
  // Current selections
  styleId: string;

  // Animation Sheet
  enableSpriteSheet: boolean;
  onSpriteSheetChange: (enabled: boolean) => void;
  animationTypeId: string;
  onAnimationTypeChange: (id: string) => void;

  // Style Mixing
  enableStyleMix: boolean;
  onStyleMixChange: (enabled: boolean) => void;
  style2Id: string;
  onStyle2Change: (id: string) => void;
  style1Weight: number;
  onStyle1WeightChange: (weight: number) => void;

  // Color Palette
  colorPaletteId: string;
  onColorPaletteChange: (id: string) => void;
}

// ===========================================
// MAIN COMPONENT
// ===========================================

export function PremiumFeatures({
  styleId,
  enableSpriteSheet,
  onSpriteSheetChange,
  animationTypeId,
  onAnimationTypeChange,
  enableStyleMix,
  onStyleMixChange,
  style2Id,
  onStyle2Change,
  style1Weight,
  onStyle1WeightChange,
  colorPaletteId,
  onColorPaletteChange,
}: PremiumFeaturesProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Get compatible styles for mixing
  const compatibleStyles = STYLE_COMPATIBILITY[styleId] || [];
  const currentStyle = STYLES_2D_UI.find(s => s.id === styleId);

  // Calculate credits for sprite sheet
  const selectedAnimation = ANIMATION_TYPES.find(a => a.id === animationTypeId);
  const spriteSheetCredits = selectedAnimation?.creditsRequired || 0;

  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#c084fc] to-[#00d4ff] flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <h3 className="font-semibold text-white">Premium Features</h3>
          <p className="text-xs text-[#a0a0b0]">Unique tools for pro game devs</p>
        </div>
      </div>

      {/* Feature Cards */}
      <div className="space-y-3">

        {/* 1. SPRITE SHEET / ANIMATION */}
        <div className={`rounded-xl border transition-all ${
          enableSpriteSheet
            ? "border-[#c084fc] bg-[#c084fc]/10"
            : "border-[#2a2a3d] hover:border-[#c084fc]/50"
        }`}>
          {/* Header */}
          <button
            onClick={() => toggleSection("spritesheet")}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                enableSpriteSheet ? "bg-[#c084fc] text-white" : "bg-[#1a1a28] text-[#c084fc]"
              }`}>
                <Film className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`font-medium block ${enableSpriteSheet ? "text-[#c084fc]" : "text-white"}`}>
                  Animation Sprite Sheet
                </span>
                <span className="text-xs text-[#a0a0b0]">
                  Generate walk, idle, attack cycles
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {enableSpriteSheet && spriteSheetCredits > 0 && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#c084fc]/20 text-[#c084fc]">
                  {spriteSheetCredits} credits
                </span>
              )}
              {expandedSection === "spritesheet" ? (
                <ChevronUp className="w-5 h-5 text-[#a0a0b0]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#a0a0b0]" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === "spritesheet" && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a3d] pt-3">
              {/* Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSpriteSheet}
                  onChange={(e) => onSpriteSheetChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  enableSpriteSheet ? "bg-[#c084fc]" : "bg-[#2a2a3d]"
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    enableSpriteSheet ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`} />
                </div>
                <span className="text-sm text-white">Enable Sprite Sheet Generation</span>
              </label>

              {/* Animation Types */}
              {enableSpriteSheet && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {ANIMATION_TYPES.map((anim) => (
                    <button
                      key={anim.id}
                      onClick={() => onAnimationTypeChange(anim.id)}
                      className={`p-3 rounded-lg text-center transition-all border ${
                        animationTypeId === anim.id
                          ? "border-[#c084fc] bg-[#c084fc]/20"
                          : "border-[#2a2a3d] hover:border-[#c084fc]/50"
                      }`}
                    >
                      <div className="text-xl mb-1">{anim.emoji}</div>
                      <span className={`text-xs font-medium block ${
                        animationTypeId === anim.id ? "text-[#c084fc]" : "text-white"
                      }`}>
                        {anim.name}
                      </span>
                      <span className="text-[10px] text-[#a0a0b0] block">
                        {anim.frameCount} frames
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {/* Info */}
              {enableSpriteSheet && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-[#0a0a0f] text-xs text-[#a0a0b0]">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#c084fc]" />
                  <span>
                    Each frame costs 1 credit. You'll receive individual PNG files ready for Unity/Godot sprite sheets.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 2. STYLE MIXING */}
        <div className={`rounded-xl border transition-all ${
          enableStyleMix
            ? "border-[#00d4ff] bg-[#00d4ff]/10"
            : "border-[#2a2a3d] hover:border-[#00d4ff]/50"
        }`}>
          {/* Header */}
          <button
            onClick={() => toggleSection("stylemix")}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                enableStyleMix ? "bg-[#00d4ff] text-[#030305]" : "bg-[#1a1a28] text-[#00d4ff]"
              }`}>
                <Blend className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`font-medium block ${enableStyleMix ? "text-[#00d4ff]" : "text-white"}`}>
                  Style Mixing
                </span>
                <span className="text-xs text-[#a0a0b0]">
                  Blend two art styles together
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {enableStyleMix && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#00ff88]/20 text-[#00ff88]">
                  FREE
                </span>
              )}
              {expandedSection === "stylemix" ? (
                <ChevronUp className="w-5 h-5 text-[#a0a0b0]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#a0a0b0]" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === "stylemix" && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a3d] pt-3">
              {/* Toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableStyleMix}
                  onChange={(e) => onStyleMixChange(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full transition-colors ${
                  enableStyleMix ? "bg-[#00d4ff]" : "bg-[#2a2a3d]"
                }`}>
                  <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                    enableStyleMix ? "translate-x-5" : "translate-x-0.5"
                  } mt-0.5`} />
                </div>
                <span className="text-sm text-white">Enable Style Mixing</span>
              </label>

              {enableStyleMix && (
                <>
                  {/* Current Style Info */}
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#0a0a0f]">
                    <span className="text-lg">{currentStyle?.emoji}</span>
                    <span className="text-sm text-white">{currentStyle?.name}</span>
                    <span className="text-xs text-[#a0a0b0]">(Primary)</span>
                  </div>

                  {/* Second Style Selection */}
                  <div>
                    <label className="text-xs text-[#a0a0b0] mb-2 block">Mix with:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {compatibleStyles.length > 0 ? (
                        compatibleStyles.map((compatStyleId) => {
                          const compatStyle = STYLES_2D_UI.find(s => s.id === compatStyleId);
                          if (!compatStyle) return null;
                          return (
                            <button
                              key={compatStyleId}
                              onClick={() => onStyle2Change(compatStyleId)}
                              className={`p-2 rounded-lg text-center transition-all border ${
                                style2Id === compatStyleId
                                  ? "border-[#00d4ff] bg-[#00d4ff]/20"
                                  : "border-[#2a2a3d] hover:border-[#00d4ff]/50"
                              }`}
                            >
                              <div className="text-lg mb-1">{compatStyle.emoji}</div>
                              <span className={`text-[10px] font-medium block ${
                                style2Id === compatStyleId ? "text-[#00d4ff]" : "text-white"
                              }`}>
                                {compatStyle.name}
                              </span>
                            </button>
                          );
                        })
                      ) : (
                        <div className="col-span-3 text-xs text-[#a0a0b0] text-center py-4">
                          No compatible styles for {currentStyle?.name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Weight Slider */}
                  {style2Id && (
                    <div>
                      <div className="flex justify-between text-xs text-[#a0a0b0] mb-2">
                        <span>{currentStyle?.name} ({style1Weight}%)</span>
                        <span>{STYLES_2D_UI.find(s => s.id === style2Id)?.name} ({100 - style1Weight}%)</span>
                      </div>
                      <input
                        type="range"
                        min="20"
                        max="80"
                        value={style1Weight}
                        onChange={(e) => onStyle1WeightChange(Number(e.target.value))}
                        className="w-full h-2 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, #00d4ff ${style1Weight}%, #c084fc ${style1Weight}%)`
                        }}
                      />
                      {/* Presets */}
                      <div className="flex gap-2 mt-2">
                        {STYLE_MIX_PRESETS.map((preset) => (
                          <button
                            key={preset.name}
                            onClick={() => onStyle1WeightChange(preset.style1)}
                            className={`text-xs px-2 py-1 rounded transition-all ${
                              style1Weight === preset.style1
                                ? "bg-[#00d4ff] text-[#030305]"
                                : "bg-[#1a1a28] text-[#a0a0b0] hover:text-white"
                            }`}
                          >
                            {preset.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* 3. COLOR PALETTE LOCK */}
        <div className={`rounded-xl border transition-all ${
          colorPaletteId
            ? "border-[#00ff88] bg-[#00ff88]/10"
            : "border-[#2a2a3d] hover:border-[#00ff88]/50"
        }`}>
          {/* Header */}
          <button
            onClick={() => toggleSection("palette")}
            className="w-full p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                colorPaletteId ? "bg-[#00ff88] text-[#030305]" : "bg-[#1a1a28] text-[#00ff88]"
              }`}>
                <Palette className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`font-medium block ${colorPaletteId ? "text-[#00ff88]" : "text-white"}`}>
                  Color Palette Lock
                </span>
                <span className="text-xs text-[#a0a0b0]">
                  Consistent colors across all assets
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {colorPaletteId && (
                <span className="text-xs px-2 py-1 rounded-full bg-[#00ff88]/20 text-[#00ff88]">
                  FREE
                </span>
              )}
              {expandedSection === "palette" ? (
                <ChevronUp className="w-5 h-5 text-[#a0a0b0]" />
              ) : (
                <ChevronDown className="w-5 h-5 text-[#a0a0b0]" />
              )}
            </div>
          </button>

          {/* Expanded Content */}
          {expandedSection === "palette" && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#2a2a3d] pt-3">
              {/* Palette Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* None option */}
                <button
                  onClick={() => onColorPaletteChange("")}
                  className={`p-3 rounded-lg text-center transition-all border ${
                    !colorPaletteId
                      ? "border-[#00ff88] bg-[#00ff88]/20"
                      : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                  }`}
                >
                  <div className="text-xl mb-1">🎨</div>
                  <span className={`text-xs font-medium block ${!colorPaletteId ? "text-[#00ff88]" : "text-white"}`}>
                    Auto Colors
                  </span>
                  <span className="text-[10px] text-[#a0a0b0] block">AI decides</span>
                </button>

                {COLOR_PALETTES.map((palette) => (
                  <button
                    key={palette.id}
                    onClick={() => onColorPaletteChange(palette.id)}
                    className={`p-3 rounded-lg text-center transition-all border ${
                      colorPaletteId === palette.id
                        ? "border-[#00ff88] bg-[#00ff88]/20"
                        : "border-[#2a2a3d] hover:border-[#00ff88]/50"
                    }`}
                  >
                    <div className="text-xl mb-1">{palette.emoji}</div>
                    <span className={`text-xs font-medium block ${
                      colorPaletteId === palette.id ? "text-[#00ff88]" : "text-white"
                    }`}>
                      {palette.name}
                    </span>
                    {/* Color Preview */}
                    <div className="flex justify-center gap-0.5 mt-1">
                      {palette.colors.slice(0, 4).map((color, i) => (
                        <div
                          key={i}
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </button>
                ))}
              </div>

              {/* Selected Palette Preview */}
              {colorPaletteId && (
                <div className="p-3 rounded-lg bg-[#0a0a0f]">
                  {(() => {
                    const palette = COLOR_PALETTES.find(p => p.id === colorPaletteId);
                    if (!palette) return null;
                    return (
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-white">
                            {palette.emoji} {palette.name}
                          </span>
                          <span className="text-xs text-[#a0a0b0]">{palette.description}</span>
                        </div>
                        <div className="flex gap-1">
                          {palette.colors.map((color, i) => (
                            <div
                              key={i}
                              className="flex-1 h-8 rounded"
                              style={{ backgroundColor: color }}
                              title={color}
                            />
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              {/* Info */}
              <div className="flex items-start gap-2 p-2 rounded-lg bg-[#0a0a0f] text-xs text-[#a0a0b0]">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-[#00ff88]" />
                <span>
                  Lock your color palette to create cohesive game assets. All sprites will use these colors.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {(enableSpriteSheet || enableStyleMix || colorPaletteId) && (
        <div className="p-3 rounded-lg bg-gradient-to-r from-[#c084fc]/10 to-[#00ff88]/10 border border-[#c084fc]/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#c084fc]" />
            <span className="text-sm font-medium text-white">Active Features</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {enableSpriteSheet && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#c084fc]/20 text-[#c084fc] flex items-center gap-1">
                <Check className="w-3 h-3" />
                Sprite Sheet ({spriteSheetCredits} credits)
              </span>
            )}
            {enableStyleMix && style2Id && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#00d4ff]/20 text-[#00d4ff] flex items-center gap-1">
                <Check className="w-3 h-3" />
                Style Mix
              </span>
            )}
            {colorPaletteId && (
              <span className="text-xs px-2 py-1 rounded-full bg-[#00ff88]/20 text-[#00ff88] flex items-center gap-1">
                <Check className="w-3 h-3" />
                {COLOR_PALETTES.find(p => p.id === colorPaletteId)?.name} Palette
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
