// ===========================================
// SPRITELAB - PROMPT BUILDER
// ===========================================

import { getCategoryById, type AssetCategory } from "./categories";
import { getStyleById, type ArtStyle } from "./styles";

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
function buildExclusions(negativePrompt: string | undefined): string {
  if (!negativePrompt) return "";

  // Convert negative prompt items to "NEVER X, NEVER Y" format
  const items = negativePrompt.split(",").map(s => s.trim()).filter(Boolean);

  // Take most important exclusions (limit to avoid prompt bloat)
  const topExclusions = items.slice(0, 8);

  return topExclusions.map(item => `NEVER ${item}`).join(", ");
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
    // PIXEL ART: Style emphasis at START and END, with strong exclusions
    // Format: [PIXEL ART EMPHASIS] + [what to draw] + [reinforcement] + [exclusions]
    const pixelEmphasis = styleId === "pixel-16"
      ? "IMPORTANT: 16-bit pixel art, each pixel must be clearly visible as a square, chunky blocky pixels like SNES games"
      : "IMPORTANT: 32-bit pixel art, visible pixel grid, retro PlayStation era sprite";

    promptParts = [
      pixelEmphasis,
      style.promptSuffix,
      qualityPrefix,
      category.promptPrefix,
      userPrompt.trim(),
      styleExclusions,
      "MUST have visible square pixels, jagged edges, limited color palette",
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
