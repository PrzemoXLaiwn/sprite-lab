// ===========================================
// SPRITELAB - SIMPLIFIED PROMPT BUILDER v4.0
// ===========================================
// PHILOSOPHY: User prompt is KING. System only adds:
// 1. Style rendering (pixel art, anime, etc.)
// 2. "single isolated object" enforcement
// 3. "transparent background" for game assets
//
// NO MORE: Long prompts, category overrides, complex prefixes

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";

// ===========================================
// SIMPLE STYLE CORES - Just the visual style
// ===========================================
const STYLE_PROMPTS: Record<string, string> = {
  PIXEL_ART_16: "16-bit pixel art style, visible pixels, retro game sprite",
  PIXEL_ART_32: "32-bit HD pixel art style, detailed pixels, modern indie game sprite",
  HAND_PAINTED: "hand painted digital art style, painterly brush strokes",
  VECTOR_CLEAN: "clean vector art style, flat colors, smooth edges",
  ANIME_GAME: "anime game art style, cel shading, JRPG aesthetic",
  CHIBI_CUTE: "chibi kawaii style, cute big head small body",
  CARTOON_WESTERN: "western cartoon style, bold outlines, Cuphead aesthetic",
  DARK_SOULS: "dark fantasy style, gritty, souls-like aesthetic",
  ISOMETRIC: "isometric 2.5D view, 26.57 degree angle",
  ISOMETRIC_PIXEL: "isometric pixel art, retro RTS style",
  ISOMETRIC_CARTOON: "isometric cartoon style, colorful casual game",
  REALISTIC_PAINTED: "realistic digital painting, AAA game concept art quality",
};

// ===========================================
// SIMPLE NEGATIVE PROMPTS - Just the essentials
// ===========================================
const CORE_NEGATIVES = "multiple objects, many items, sprite sheet, grid, collection, blurry, low quality, watermark, text, signature";

const STYLE_NEGATIVES: Record<string, string> = {
  PIXEL_ART_16: "smooth gradients, anti-aliasing, realistic, 3D render, photograph",
  PIXEL_ART_32: "smooth gradients, anti-aliasing, realistic, 3D render",
  HAND_PAINTED: "pixel art, vector art, flat colors, 3D render",
  VECTOR_CLEAN: "textured, painterly, pixel art, realistic",
  ANIME_GAME: "western cartoon, realistic, pixel art, 3D render",
  CHIBI_CUTE: "realistic proportions, dark, scary, mature",
  CARTOON_WESTERN: "anime, realistic, pixel art, subtle",
  DARK_SOULS: "bright colors, cartoon, cute, chibi, clean",
  ISOMETRIC: "perspective view, top-down flat, side view, realistic 3D",
  ISOMETRIC_PIXEL: "smooth gradients, perspective view, realistic",
  ISOMETRIC_CARTOON: "realistic, dark, pixel art, perspective",
  REALISTIC_PAINTED: "cartoon, pixel art, flat colors, anime",
};

// ===========================================
// MAIN FUNCTION - SIMPLIFIED
// ===========================================
export function buildUltimatePrompt(
  userPrompt: string,
  _categoryId: string,
  _subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  const styleNegative = STYLE_NEGATIVES[styleId] || "";

  // Clean user input
  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD FINAL PROMPT - USER FIRST!
  // ===========================================
  // Structure: [USER PROMPT], [STYLE], [ISOLATION]
  const promptParts: string[] = [];

  // 1. USER PROMPT IS KING - exactly what they asked for
  promptParts.push(cleanPrompt);

  // 2. Add style
  promptParts.push(stylePrompt);

  // 3. Add isolation (CRITICAL - prevents sprite sheets)
  promptParts.push("single isolated object");
  promptParts.push("centered on transparent background");
  promptParts.push("game asset icon");

  // ===========================================
  // BUILD NEGATIVE PROMPT - SIMPLE
  // ===========================================
  const negativeParts: string[] = [CORE_NEGATIVES];
  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  // Final assembly
  const finalPrompt = promptParts.join(", ");
  const finalNegative = negativeParts.join(", ");

  // Logging
  console.log("\n" + "═".repeat(60));
  console.log("🎮 SIMPLE PROMPT BUILDER v4.0");
  console.log("═".repeat(60));
  console.log("📝 User wants:", cleanPrompt);
  console.log("🎨 Style:", style.name);
  console.log("─".repeat(60));
  console.log("✅ FINAL:", finalPrompt);
  console.log("❌ NEGATIVE:", finalNegative);
  console.log("═".repeat(60) + "\n");

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    model: style.model,
    guidance: style.guidance,
    steps: style.steps,
  };
}

// ===========================================
// ENHANCED PROMPT - DISABLED FOR NOW
// ===========================================
// Premium features temporarily disabled to fix core functionality

export function buildEnhancedPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: {
    enableStyleMix?: boolean;
    style2Id?: string;
    style1Weight?: number;
    colorPaletteId?: string;
  } = {}
): BuildPromptResult {
  // For now, just use the simple builder
  // Premium features will be re-enabled after core is fixed
  console.log("[EnhancedPrompt] Premium features temporarily disabled, using simple builder");
  return buildUltimatePrompt(userPrompt, categoryId, subcategoryId, styleId);
}

// ===========================================
// HELPER EXPORTS (for compatibility)
// ===========================================
export function isIsometricMode(
  categoryId: string,
  subcategoryId: string,
  styleId: string
): boolean {
  if (categoryId === "ISOMETRIC") return true;
  if (styleId.startsWith("ISOMETRIC")) return true;
  if (subcategoryId.startsWith("ISO_")) return true;
  return false;
}

export function extractKeyDescriptors(userPrompt: string): string[] {
  return userPrompt.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
}

export function detectSlotGrid(_userPrompt: string, _subcategoryId: string): { hasSlots: boolean; slotCount: number; cols: number; rows: number; gridDescription: string } {
  // Disabled for now - was causing issues
  return { hasSlots: false, slotCount: 0, cols: 0, rows: 0, gridDescription: "" };
}
