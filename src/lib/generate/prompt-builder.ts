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

  // Quality prefixes - always at the start
  const qualityPrefix = [
    "high quality",
    "game-ready asset",
    "clean design",
    "professional",
    "single object",
    "centered composition",
  ].join(", ");

  // Background suffix - transparent for most assets
  const backgroundSuffix =
    "isolated on transparent background, no background, PNG ready, clean edges";

  // Build final prompt
  const promptParts = [
    qualityPrefix,
    category.promptPrefix,
    userPrompt.trim(),
    style.promptSuffix,
    backgroundSuffix,
  ];

  const prompt = promptParts.filter(Boolean).join(", ");

  return {
    prompt,
    category,
    style,
  };
}

// Shorter version for display
export function getPromptPreview(prompt: string, maxLength: number = 100): string {
  if (prompt.length <= maxLength) return prompt;
  return prompt.substring(0, maxLength) + "...";
}
