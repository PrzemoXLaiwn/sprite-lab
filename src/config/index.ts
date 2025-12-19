// ===========================================
// SPRITELAB CONFIG - MAIN INDEX
// ===========================================
// Single entry point for all configuration
// Import from '@/config' instead of individual files

// ===========================================
// TYPES
// ===========================================
export type {
  // Model types
  ModelType,

  // Category types
  CategoryUI,
  SubcategoryUI,
  SubcategoryFull,
  CategoryFull,
  SubcategoryPromptConfig,
  CategoryWithPrompts,
  CategoryId,

  // Style types
  StyleUI,
  StyleConfig,
  Style3DConfig,
  Model3DConfig,
  Style2DId,
  Style3DId,

  // Prompt types
  UniversalNegatives,
  IsometricBoost,
  IsometricNegatives,
  RandomPromptTemplate,
  BuildPromptResult,
  CategoryLookup,
} from "./types";

// ===========================================
// CATEGORIES
// ===========================================
export {
  // Individual categories
  WEAPONS,
  ARMOR,
  CONSUMABLES,
  RESOURCES,
  QUEST_ITEMS,
  CHARACTERS,
  CREATURES,
  ENVIRONMENT,
  ISOMETRIC,
  TILESETS,
  UI_ELEMENTS,
  EFFECTS,
  PROJECTILES,

  // All categories array
  ALL_CATEGORIES,
  CATEGORY_IDS,

  // Prompt configs
  CATEGORY_PROMPT_CONFIGS,
  CATEGORY_BASE_DESCRIPTIONS,

  // Individual prompt configs (if needed)
  WEAPONS_PROMPT_CONFIG,
  ARMOR_PROMPT_CONFIG,
  CONSUMABLES_PROMPT_CONFIG,
  RESOURCES_PROMPT_CONFIG,
  QUEST_ITEMS_PROMPT_CONFIG,
  CHARACTERS_PROMPT_CONFIG,
  CREATURES_PROMPT_CONFIG,
  ENVIRONMENT_PROMPT_CONFIG,
  ISOMETRIC_PROMPT_CONFIG,
  TILESETS_PROMPT_CONFIG,
  UI_ELEMENTS_PROMPT_CONFIG,
  EFFECTS_PROMPT_CONFIG,
  PROJECTILES_PROMPT_CONFIG,

  // Helper functions
  getCategoryById,
  getSubcategoryById,
  getSubcategoryPromptConfig,
  getAllSubcategories,
  isValidCategory,
  isValidSubcategory,
  isIsometricCategory,
  getCategories3D,
  getCategories2DOnly,
} from "./categories";

// ===========================================
// STYLES
// ===========================================
export {
  // 2D Styles
  STYLES_2D_FULL,
  STYLES_2D_UI,
  STYLE_2D_IDS,
  DEFAULT_STYLE_2D,

  // 3D Styles
  STYLES_3D,
  MODELS_3D,
  STYLE_3D_IDS,
  DEFAULT_STYLE_3D,
  DEFAULT_MODEL_3D,

  // Helper functions
  getStyle2DById,
  getStyle3DById,
  isValid2DStyle,
  isValid3DStyle,
  isIsometricStyle,
} from "./styles";

// ===========================================
// PROMPTS
// ===========================================
export {
  // Negative prompts
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

  // Prompt builder
  buildUltimatePrompt,
  buildEnhancedPrompt,
  isIsometricMode,
  extractKeyDescriptors,
} from "./prompts";

// ===========================================
// ICONS (Frontend only)
// ===========================================
export { ICON_MAP, getIconByName } from "./icons";

// ===========================================
// PREMIUM FEATURES
// ===========================================
export {
  // Animation/Sprite Sheet
  ANIMATION_TYPES,
  SPRITE_SHEET_DEFAULTS,
  FEATURE_COSTS,

  // Style Mixing
  STYLE_MIX_PRESETS,
  STYLE_COMPATIBILITY,

  // Color Palettes
  COLOR_PALETTES,

  // Asset Packs
  ASSET_PACKS,
} from "./features";

export type {
  AnimationType,
  AnimationFrame,
  StyleMixConfig,
  ColorPalette,
  SpriteSheetConfig,
  AssetPack,
  AssetPackItem,
} from "./features";

// ===========================================
// BUILDER (Advanced Mode)
// ===========================================
export {
  WEAPONS_BUILDER,
  ARMOR_BUILDER,
  buildPromptFromSelections,
  getBuilder,
  hasBuilder,
} from "./builder";

export type {
  BuilderOption,
  BuilderCategory,
  SubcategoryBuilder,
} from "./builder";
