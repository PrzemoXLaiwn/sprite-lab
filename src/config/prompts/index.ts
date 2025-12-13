// ===========================================
// SPRITELAB CONFIG - PROMPTS INDEX
// ===========================================
// Barrel export for all prompt-related configurations

// Negative prompts
export {
  UNIVERSAL_NEGATIVES,
  ISOMETRIC_BOOST,
  ISOMETRIC_NEGATIVES,
  getUniversalNegativesString,
  getIsometricNegativesString,
  buildNegativePrompt,
} from "./negative-prompts";

// Prompt builder
export {
  buildUltimatePrompt,
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
