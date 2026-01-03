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

  // Quality prefixes - adjusted for pixel art (remove "clean" which might cause smoothing)
  const qualityPrefix = isPixelArt
    ? ["game-ready sprite", "single object", "centered composition"].join(", ")
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

  // For pixel art, add explicit exclusions into the prompt itself
  // Since Runware doesn't support negativePrompt, we emphasize what we DON'T want
  const pixelArtExclusions = isPixelArt
    ? "NOT smooth, NOT blurry, NOT gradient, NOT anti-aliased, strictly pixelated"
    : "";

  // Build final prompt - style comes FIRST for pixel art to emphasize it
  const promptParts = isPixelArt
    ? [
        style.promptSuffix, // Style FIRST for pixel art
        qualityPrefix,
        category.promptPrefix,
        userPrompt.trim(),
        pixelArtExclusions,
        backgroundSuffix,
      ]
    : [
        qualityPrefix,
        category.promptPrefix,
        userPrompt.trim(),
        style.promptSuffix,
        backgroundSuffix,
      ];

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
