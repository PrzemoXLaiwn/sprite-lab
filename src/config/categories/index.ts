// ===========================================
// SPRITELAB CONFIG - CATEGORIES INDEX
// ===========================================
// Barrel export for all category configurations

// Category definitions (UI)
export {
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
  ALL_CATEGORIES,
  CATEGORY_IDS,
} from "./all-categories";

// Prompt configurations (Backend)
export {
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
  CATEGORY_PROMPT_CONFIGS,
  CATEGORY_BASE_DESCRIPTIONS,
} from "./prompt-configs";

// Re-export types
export type {
  CategoryUI,
  SubcategoryUI,
  SubcategoryPromptConfig,
  CategoryId,
} from "../types";

// ===========================================
// HELPER FUNCTIONS
// ===========================================

import { ALL_CATEGORIES } from "./all-categories";
import { CATEGORY_PROMPT_CONFIGS } from "./prompt-configs";
import type { CategoryUI, SubcategoryUI, SubcategoryPromptConfig } from "../types";

/**
 * Get a category by ID
 */
export function getCategoryById(categoryId: string): CategoryUI | null {
  return ALL_CATEGORIES.find((c) => c.id === categoryId) || null;
}

/**
 * Get a subcategory by category ID and subcategory ID
 */
export function getSubcategoryById(
  categoryId: string,
  subcategoryId: string
): SubcategoryUI | null {
  const category = getCategoryById(categoryId);
  if (!category) return null;
  return category.subcategories.find((s) => s.id === subcategoryId) || null;
}

/**
 * Get subcategory prompt config
 */
export function getSubcategoryPromptConfig(
  categoryId: string,
  subcategoryId: string
): SubcategoryPromptConfig | null {
  const categoryConfig = CATEGORY_PROMPT_CONFIGS[categoryId];
  if (!categoryConfig) return null;
  return categoryConfig[subcategoryId] || null;
}

/**
 * Get all subcategories across all categories
 */
export function getAllSubcategories(): Array<{
  categoryId: string;
  categoryName: string;
  subcategory: SubcategoryUI;
}> {
  const result: Array<{
    categoryId: string;
    categoryName: string;
    subcategory: SubcategoryUI;
  }> = [];

  for (const category of ALL_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      result.push({
        categoryId: category.id,
        categoryName: category.name,
        subcategory,
      });
    }
  }

  return result;
}

/**
 * Check if category ID is valid
 */
export function isValidCategory(categoryId: string): boolean {
  return ALL_CATEGORIES.some((c) => c.id === categoryId);
}

/**
 * Check if subcategory ID is valid for a category
 */
export function isValidSubcategory(
  categoryId: string,
  subcategoryId: string
): boolean {
  const category = getCategoryById(categoryId);
  if (!category) return false;
  return category.subcategories.some((s) => s.id === subcategoryId);
}

/**
 * Check if category/subcategory is isometric
 */
export function isIsometricCategory(
  categoryId: string,
  subcategoryId?: string
): boolean {
  if (categoryId === "ISOMETRIC") return true;
  if (subcategoryId?.startsWith("ISO_")) return true;
  return false;
}

/**
 * Get categories that support 3D
 */
export function getCategories3D(): CategoryUI[] {
  return ALL_CATEGORIES.filter((c) => c.supports3D);
}

/**
 * Get categories that are 2D only
 */
export function getCategories2DOnly(): CategoryUI[] {
  return ALL_CATEGORIES.filter((c) => !c.supports3D);
}
