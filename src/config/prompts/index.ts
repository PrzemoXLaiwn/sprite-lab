// ===========================================
// SPRITELAB CONFIG - PROMPTS INDEX
// ===========================================
// Barrel export for all prompt-related configurations

// Negative prompts
export {
  UNIVERSAL_NEGATIVES,
  ISOMETRIC_BOOST,
  ISOMETRIC_NEGATIVES,
  PIXEL_ART_NEGATIVES,
  GAME_ASSET_NEGATIVES,
  ARMOR_NEGATIVES,
  WEAPONS_NEGATIVES,
  UI_NEGATIVES,
  CHARACTER_NEGATIVES,
  getCategoryNegatives,
  getStyleNegatives,
  buildCompleteNegativePrompt,
} from "./negative-prompts";

// Prompt builder
export {
  buildUltimatePrompt,
  buildEnhancedPrompt,
  isIsometricMode,
  extractKeyDescriptors,
} from "./prompt-builder";

// Re-export types
export type {
  UniversalNegatives,
  IsometricBoost,
  IsometricNegatives,
  BuildPromptResult,
} from "../types";
