// ===========================================
// SPRITELAB CONFIG - TYPE DEFINITIONS
// ===========================================
// Single source of truth for all configuration types
// Used by both frontend (UI display) and backend (generation)

// ===========================================
// MODEL TYPES
// ===========================================

export type ModelType = "flux-dev" | "sdxl" | "flux-schnell";

// ===========================================
// CATEGORY TYPES
// ===========================================

/**
 * Subcategory for UI display (lightweight)
 */
export interface SubcategoryUI {
  id: string;
  name: string;
  examples: string[];
}

/**
 * Full subcategory with prompt guidance (for categories.ts compatibility)
 */
export interface SubcategoryFull extends SubcategoryUI {
  description: string;
  promptGuide: string;
  technicalRequirements: string;
}

/**
 * Category for UI display (lightweight)
 */
export interface CategoryUI {
  id: string;
  name: string;
  icon: string; // Lucide icon name or emoji
  description: string;
  supports3D: boolean;
  subcategories: SubcategoryUI[];
}

/**
 * Full category with prompt rules (for backend)
 */
export interface CategoryFull {
  id: string;
  name: string;
  icon: string;
  description: string;
  supports3D: boolean;
  subcategories: SubcategoryFull[];
  globalPromptRules: string;
  globalNegativePrompt: string;
}

/**
 * Subcategory prompt configuration for generation
 */
export interface SubcategoryPromptConfig {
  objectType: string;
  visualDesc: string;
  composition: string;
  avoid: string;
}

/**
 * Category with its prompt configurations
 */
export interface CategoryWithPrompts {
  category: CategoryUI;
  promptConfigs: Record<string, SubcategoryPromptConfig>;
  baseDescription: string;
}

// ===========================================
// STYLE TYPES
// ===========================================

/**
 * Style for UI display (lightweight)
 */
export interface StyleUI {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // Preview information for style selector
  preview?: {
    colors: string[]; // Gradient colors representing the style
    bestFor: string[]; // Best use cases
    example: string; // Example of what it creates
  };
}

/**
 * Full style configuration for generation
 */
export interface StyleConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;

  styleCore: string;
  rendering: string;
  colors: string;
  edges: string;

  // negatives dla modelu
  negatives: string;

  // ✅ NOWE: wzmocnienie stylu (opcjonalne, bo nie każdy styl musi mieć)
  styleEnforcement?: string;
  styleMandatory?: string;

  model: ModelType;
  guidance: number;
  steps: number;
}



/**
 * 3D style configuration
 */
export interface Style3DConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

/**
 * 3D model configuration
 */
export interface Model3DConfig {
  id: string;
  name: string;
  description: string;
  speed: string;
  quality: string;
  credits: number;
  time: string;
  formats: string[];
  recommended?: boolean;
  online?: boolean;
}

// ===========================================
// PROMPT TYPES
// ===========================================

/**
 * Universal negative prompts structure
 */
export interface UniversalNegatives {
  multiObject: string;
  background: string;
  quality: string;
  composition: string;
  technical: string;
  wrongContent: string;
  bodyParts: string;
}

/**
 * Isometric-specific boost prompts
 */
export interface IsometricBoost {
  core: string;
  composition: string;
  lighting: string;
  quality: string;
  references: string;
}

/**
 * Isometric-specific negative prompts
 */
export interface IsometricNegatives {
  wrongAngle: string;
  wrong3D: string;
  mistakes: string;
  styleIssues: string;
  composition: string;
}

/**
 * Random prompt template
 */
export interface RandomPromptTemplate {
  base: string[];
  modifiers: string[];
  styles: string[];
}

// ===========================================
// ID TYPES (for type safety)
// ===========================================

export type CategoryId =
  | "WEAPONS"
  | "ARMOR"
  | "CONSUMABLES"
  | "RESOURCES"
  | "QUEST_ITEMS"
  | "CHARACTERS"
  | "CREATURES"
  | "ENVIRONMENT"
  | "ISOMETRIC"
  | "TILESETS"
  | "UI_ELEMENTS"
  | "EFFECTS"
  | "PROJECTILES";

export type Style2DId =
  | "PIXEL_ART_16"
  | "PIXEL_ART_32"
  | "HAND_PAINTED"
  | "VECTOR_CLEAN"
  | "ANIME_GAME"
  | "CARTOON_WESTERN"
  | "DARK_SOULS"
  | "CHIBI_CUTE"
  | "ISOMETRIC"
  | "ISOMETRIC_PIXEL"
  | "ISOMETRIC_CARTOON"
  | "REALISTIC_PAINTED";

export type Style3DId =
  | "REALISTIC"
  | "STYLIZED"
  | "CARTOON"
  | "ANIME"
  | "LOW_POLY"
  | "HAND_PAINTED";

// ===========================================
// UTILITY TYPES
// ===========================================

/**
 * Build prompt result
 */
export interface BuildPromptResult {
  prompt: string;
  negativePrompt: string;
  model: ModelType;
  guidance: number;
  steps: number;
}

/**
 * Category lookup result
 */
export interface CategoryLookup {
  category: CategoryUI | null;
  subcategory: SubcategoryUI | null;
}
