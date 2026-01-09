// ===========================================
// SPRITELAB - PROMPT BUILDER
// ===========================================

import { getCategoryById, type AssetCategory } from "./categories";
import { getStyleById, type ArtStyle } from "./styles";

// Global negative prompts for common quality issues
const GLOBAL_NEGATIVES = "blurry, low quality, distorted, malformed, extra limbs, multiple subjects when single requested, watermarks, text overlays, signatures, deformed, ugly, bad anatomy, disfigured";

interface PromptBuildParams {
  categoryId: string;
  styleId: string;
  userPrompt: string;
}

interface BuiltPrompt {
  prompt: string;
  negativePrompt?: string;
  category: AssetCategory;
  style: ArtStyle;
}

/**
 * Convert negativePrompt to exclusions that work in positive prompt
 * Since Runware/FLUX doesn't support negative prompts, we embed them as exclusions
 */
function buildExclusions(negativePrompt: string | undefined, includeGlobal: boolean = true): string {
  const allNegatives: string[] = [];

  // Add global negatives first
  if (includeGlobal) {
    allNegatives.push(...GLOBAL_NEGATIVES.split(",").map(s => s.trim()).filter(Boolean));
  }

  // Add style-specific negatives
  if (negativePrompt) {
    allNegatives.push(...negativePrompt.split(",").map(s => s.trim()).filter(Boolean));
  }

  // Remove duplicates and take most important exclusions (limit to avoid prompt bloat)
  const uniqueExclusions = [...new Set(allNegatives)].slice(0, 12);

  return uniqueExclusions.map(item => `NEVER ${item}`).join(", ");
}

export function buildPrompt(params: PromptBuildParams): BuiltPrompt {
  const { categoryId, styleId, userPrompt } = params;

  const category = getCategoryById(categoryId);
  const style = getStyleById(styleId);

  if (!category) {
    throw new Error(`Invalid category: ${categoryId}`);
  }
  if (!style) {
    throw new Error(`Invalid style: ${styleId}`);
  }

  // Check if it's a pixel art style - needs special handling
  const isPixelArt = styleId.startsWith("pixel");
  const isCartoon = styleId === "cartoon";

  // Build exclusions from negativePrompt (since Runware doesn't support negative prompts)
  const styleExclusions = buildExclusions(style.negativePrompt);

  // Quality prefixes - adjusted for pixel art (remove "clean" which might cause smoothing)
  const qualityPrefix = isPixelArt
    ? "retro video game sprite, single object, centered"
    : [
        "high quality",
        "game-ready asset",
        "clean design",
        "professional",
        "single object",
        "centered composition",
      ].join(", ");

  // Background suffix - transparent for most assets
  const backgroundSuffix =
    "isolated on transparent background, no background, PNG ready";

  // Build final prompt based on style type
  let promptParts: string[];

  if (isPixelArt) {
    // PIXEL ART: Triple enforcement - START, MIDDLE, END
    // Research shows FLUX needs repeated emphasis for style compliance
    const pixelEmphasis = styleId === "pixel-16"
      ? "PIXEL ART ONLY, 16x16 chunky pixel tiles, old school NES/Game Boy graphics, absolutely NO smooth rendering"
      : "PIXEL ART ONLY, 32x32 chunky pixel tiles, retro arcade graphics, absolutely NO smooth rendering";

    const pixelMiddle = "visible square pixel blocks, hard pixelated edges, retro video game sprite";

    const pixelReinforcement = styleId === "pixel-16"
      ? "ENFORCE: visible pixels, jagged edges, 16 colors max, NO anti-aliasing, NO gradients, chunky blocky pixels"
      : "ENFORCE: visible pixels, pixelated edges, limited palette, NO anti-aliasing, NO smooth textures, blocky pixels";

    promptParts = [
      pixelEmphasis,
      style.promptSuffix,
      pixelMiddle,
      category.promptPrefix,
      userPrompt.trim(),
      pixelReinforcement,
      styleExclusions,
      backgroundSuffix,
    ];
  } else if (isCartoon) {
    // CARTOON: Emphasize smooth, non-pixelated look
    promptParts = [
      "IMPORTANT: Smooth cartoon illustration, NOT pixel art, completely smooth lines",
      qualityPrefix,
      category.promptPrefix,
      userPrompt.trim(),
      style.promptSuffix,
      styleExclusions,
      backgroundSuffix,
    ];
  } else {
    // OTHER STYLES: Standard order with exclusions
    promptParts = [
      qualityPrefix,
      category.promptPrefix,
      userPrompt.trim(),
      style.promptSuffix,
      styleExclusions,
      backgroundSuffix,
    ];
  }

  const prompt = promptParts.filter(Boolean).join(", ");

  return {
    prompt,
    negativePrompt: style.negativePrompt,
    category,
    style,
  };
}

// Shorter version for display
export function getPromptPreview(prompt: string, maxLength: number = 100): string {
  if (prompt.length <= maxLength) return prompt;
  return prompt.substring(0, maxLength) + "...";
}
