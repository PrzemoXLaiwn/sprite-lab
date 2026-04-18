// ===========================================
// SPRITELAB - PROMPT BUILDER v13.0
// ===========================================
// THIN ORCHESTRATOR — delegates to prompt-configs.ts (single source of truth)
//
// v13 changes:
//   - Removed all inline STYLE_PROMPTS, NEGATIVE_* blocks, ICON_SUBTYPES
//   - buildUltimatePrompt() now delegates to buildAssetPrompt() from prompt-configs.ts
//   - buildEnhancedPrompt() adds style-mix and color palette on top
//   - Model/guidance/steps come from STYLES_2D_FULL (rendering config)
//   - Prompt content comes from prompt-configs.ts (semantic config)
//   - Zero duplication between builder and config
//
// Call chain:
//   generation.ts → buildUltimatePrompt() → buildAssetPrompt() (prompt-configs.ts)
//                                           + STYLES_2D_FULL (styles-2d.ts) for model params

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";
import {
  buildAssetPrompt,
  CATEGORY_PROMPT_CONFIGS,
  type PromptBuildResult,
} from "../categories/prompt-configs";

// ===========================================
// COLOR PALETTES (used only by buildEnhancedPrompt)
// ===========================================
const COLOR_PALETTE_PROMPTS: Record<string, string> = {
  FANTASY_GOLD:   "golden yellow, royal purple, rich brown color palette",
  FOREST_GREEN:   "forest green, earth brown, natural color palette",
  ICE_BLUE:       "ice blue, frost white, cool cyan color palette",
  FIRE_RED:       "fire red, burning orange, molten gold color palette",
  DARK_SOULS:     "dark muted, desaturated brown, gritty gray color palette",
  NEON_CYBER:     "neon pink, electric cyan, purple glow color palette",
  PASTEL_DREAM:   "soft pastel, gentle pink, light blue color palette",
  OCEAN_DEEP:     "deep ocean blue, teal, aquamarine color palette",
  AUTUMN_HARVEST: "autumn orange, harvest brown, warm amber color palette",
  MONO_BW:        "black and white, grayscale, monochrome",
  RETRO_GAMEBOY:  "game boy green, 4-color palette, retro handheld",
  SUNSET_WARM:    "sunset orange, warm pink, golden yellow color palette",
};

// ===========================================
// STYLE ANCHORS — short rendering phrases appended to positive prompt
// These complement the semantic style from prompt-configs.ts with
// model-specific rendering cues from STYLES_2D_FULL.
// ===========================================
function getStyleAnchor(styleId: string): string {
  const style: StyleConfig | undefined = STYLES_2D_FULL[styleId];
  if (!style) return "";
  // Use styleCore (rendering cues) + styleMandatory (condensed enforcement).
  // styleMandatory is short (~10 words) and written specifically for FLUX.
  // We skip rendering/edges/styleEnforcement individually because prompt-enhancer
  // enforces a 100-word limit — adding all of them would push important phrases
  // past the cutoff. styleMandatory contains the critical enforcement in compact form.
  const parts = [
    style.styleCore,
    style.styleMandatory,
  ].filter(Boolean);
  return parts.join(", ");
}

function getStyleNegatives(styleId: string): string {
  const style: StyleConfig | undefined = STYLES_2D_FULL[styleId];
  return style?.negatives || "";
}

// ===========================================
// RESOLVE MODEL PARAMS from STYLES_2D_FULL
// ===========================================
function getModelParams(styleId: string): Pick<BuildPromptResult, "model" | "guidance" | "steps"> {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  return {
    model: style.model,
    guidance: style.guidance,
    steps: style.steps,
  };
}

// ===========================================
// QUALITY PRESET → qualityDetails key mapping
// ===========================================
type QualityPresetKey = "draft" | "normal" | "hd";

function getStyleQualityPolish(styleId: string, preset?: QualityPresetKey): string {
  if (!preset) return "";
  const style: StyleConfig | undefined = STYLES_2D_FULL[styleId];
  return style?.qualityDetails?.[preset] || "";
}

// ===========================================
// BRIDGE: convert prompt-configs result to BuildPromptResult
// ===========================================
function bridgeResult(
  configResult: PromptBuildResult,
  styleId: string,
  extraPositive?: string,
  extraNegative?: string,
  qualityPreset?: QualityPresetKey
): BuildPromptResult {
  const styleNegs = getStyleNegatives(styleId);

  // Style positive is now injected EARLY in buildAssetPrompt (position #1).
  // We only add styleMandatory here as enforcement suffix (short, ~10 words).
  // This keeps style in FLUX's high-weight zone (first 40 words).
  const style: StyleConfig | undefined = STYLES_2D_FULL[styleId];
  const enforcement = style?.styleMandatory || "";
  const qualityPolish = getStyleQualityPolish(styleId, qualityPreset);

  const fullPrompt = [configResult.fullPrompt, enforcement, qualityPolish, extraPositive]
    .filter(Boolean)
    .join(", ");

  const fullNegative = [configResult.negativePrompt, styleNegs, extraNegative]
    .filter(Boolean)
    .join(", ");

  return {
    prompt: dedupeJoin(fullPrompt),
    negativePrompt: dedupeJoin(fullNegative),
    ...getModelParams(styleId),
  };
}

// ===========================================
// DEDUPE HELPER — remove duplicate phrases
// ===========================================
function dedupeJoin(csv: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out.join(", ");
}

// ===========================================
// MAIN EXPORT — buildUltimatePrompt
// Signature unchanged for backward compatibility.
// Delegates to buildAssetPrompt() from prompt-configs.ts.
// ===========================================
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  view?: string,
  qualityPreset?: QualityPresetKey
): BuildPromptResult {
  try {
    // Delegate to prompt-configs.ts single source of truth
    const configResult = buildAssetPrompt({
      category: categoryId,
      subcategory: subcategoryId,
      style: styleId,
      view: view,
      userPrompt: userPrompt.trim(),
    });

    const result = bridgeResult(configResult, styleId, undefined, undefined, qualityPreset);

    if (process.env.NODE_ENV !== "production") {
      console.log(`[PromptBuilder] ${categoryId}/${subcategoryId} style=${styleId}${qualityPreset ? ` quality=${qualityPreset}` : ""}`);
    }

    return result;
  } catch {
    // Fallback for categories not yet in prompt-configs.ts
    // (ISOMETRIC, TILESETS, EFFECTS, PROJECTILES)
    console.warn(`[PromptBuilder] Fallback for ${categoryId}/${subcategoryId}`);
    return buildFallbackPrompt(userPrompt.trim(), categoryId, subcategoryId, styleId, qualityPreset);
  }
}

// Fallback for categories not yet covered by prompt-configs.ts
function buildFallbackPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  qualityPreset?: QualityPresetKey
): BuildPromptResult {
  const styleAnchor = getStyleAnchor(styleId);
  const styleNegs = getStyleNegatives(styleId);
  const qualityPolish = getStyleQualityPolish(styleId, qualityPreset);

  // Use CATEGORY_PROMPT_CONFIGS from the old system if available
  let objectType = "";
  let composition = "";
  let avoid = "";
  const categoryMap = (CATEGORY_PROMPT_CONFIGS as Record<string, Record<string, { objectType?: string; composition?: string; avoid?: string }>>)[categoryId];
  const config = categoryMap?.[subcategoryId];
  if (config) {
    objectType = config.objectType || "";
    composition = config.composition || "";
    avoid = config.avoid || "";
  }

  const prompt = dedupeJoin([
    "single isolated game asset, transparent background, centered",
    objectType,
    userPrompt,
    styleAnchor,
    qualityPolish,
    composition,
  ].filter(Boolean).join(", "));

  const negative = dedupeJoin([
    "multiple objects, background, scenery, cropped, blurry, watermark, text",
    avoid,
    styleNegs,
  ].filter(Boolean).join(", "));

  return {
    prompt,
    negativePrompt: negative,
    ...getModelParams(styleId),
  };
}

// ===========================================
// ENHANCED PROMPT — adds style-mix + color palette
// Signature unchanged for backward compatibility.
// ===========================================
export function buildEnhancedPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  options: {
    enableStyleMix?: boolean;
    style2Id?: string;
    style1Weight?: number;
    colorPaletteId?: string;
    view?: string;
    qualityPreset?: QualityPresetKey;
  } = {}
): BuildPromptResult {
  const { enableStyleMix, style2Id, style1Weight = 50, colorPaletteId, view, qualityPreset } = options;

  // Base prompt from config (with fallback for unsupported categories)
  let configResult: PromptBuildResult;
  try {
    configResult = buildAssetPrompt({
      category: categoryId,
      subcategory: subcategoryId,
      style: styleId,
      view: view,
      userPrompt: userPrompt.trim(),
      color: colorPaletteId && COLOR_PALETTE_PROMPTS[colorPaletteId]
        ? [COLOR_PALETTE_PROMPTS[colorPaletteId]]
        : undefined,
    });
  } catch {
    // Fallback — wrap the simple builder result
    const fallback = buildFallbackPrompt(userPrompt.trim(), categoryId, subcategoryId, styleId, qualityPreset);
    configResult = {
      fullPrompt: fallback.prompt,
      negativePrompt: fallback.negativePrompt,
      debug: { resolvedCategory: categoryId, resolvedSubcategory: subcategoryId, resolvedStyle: styleId, resolvedView: "DEFAULT", resolvedQuality: "MEDIUM" },
    };
  }

  // Style mixing: blend two style anchors
  let extraPositive = "";
  let extraNegative = "";

  if (enableStyleMix && style2Id && style2Id !== styleId) {
    const anchor1 = getStyleAnchor(styleId);
    const anchor2 = getStyleAnchor(style2Id);
    const neg2 = getStyleNegatives(style2Id);

    if (anchor2) {
      const short1 = anchor1.split(",")[0] || "";
      const short2 = anchor2.split(",")[0] || "";

      if (style1Weight >= 70) {
        extraPositive = `with subtle ${short2} influence`;
      } else if (style1Weight <= 30) {
        extraPositive = `${short2}, with subtle ${short1} influence`;
      } else {
        extraPositive = `hybrid style blending ${short1} with ${short2}, mixed art style`;
      }
    }
    if (neg2) {
      extraNegative = neg2;
    }
  }

  const result = bridgeResult(configResult, styleId, extraPositive, extraNegative, qualityPreset);

  if (process.env.NODE_ENV !== "production") {
    console.log(`[PromptBuilder Enhanced] ${categoryId}/${subcategoryId} style=${styleId}` +
      (enableStyleMix ? ` +mix=${style2Id} (${style1Weight}%)` : "") +
      (colorPaletteId ? ` palette=${colorPaletteId}` : "") +
      (qualityPreset ? ` quality=${qualityPreset}` : ""));
  }

  return result;
}

// ===========================================
// HELPER EXPORTS — signatures unchanged
// ===========================================
export function isIsometricMode(
  categoryId: string,
  _subcategoryId: string,
  styleId: string
): boolean {
  return categoryId === "ISOMETRIC" || styleId.startsWith("ISOMETRIC");
}

export function extractKeyDescriptors(userPrompt: string): string[] {
  return userPrompt.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
}
