// ===========================================
// SPRITELAB CONFIG - STYLES INDEX
// ===========================================
// Barrel export for all style configurations

// 2D Styles
export {
  STYLES_2D_FULL,
  STYLES_2D_UI,
  STYLE_2D_IDS,
  DEFAULT_STYLE_2D,
  PRO_QUALITY_BOOST,
  getProQualityBoost,
} from "./styles-2d";

// 3D Styles
export {
  STYLES_3D,
  MODELS_3D,
  STYLE_3D_IDS,
  DEFAULT_STYLE_3D,
  DEFAULT_MODEL_3D,
  QUALITY_3D_PRESETS,
  DEFAULT_QUALITY_3D,
} from "./styles-3d";

// Re-export types
export type { StyleConfig, StyleUI, Style3DConfig, Model3DConfig } from "../types";

// ===========================================
// HELPER FUNCTIONS
// ===========================================

import { STYLES_2D_FULL } from "./styles-2d";
import { STYLES_3D } from "./styles-3d";
import type { StyleConfig, Style3DConfig } from "../types";

/**
 * Get a 2D style by ID
 */
export function getStyle2DById(styleId: string): StyleConfig | null {
  return STYLES_2D_FULL[styleId] || null;
}

/**
 * Get a 3D style by ID
 */
export function getStyle3DById(styleId: string): Style3DConfig | null {
  return STYLES_3D.find((s) => s.id === styleId) || null;
}

/**
 * Check if a style ID is valid for 2D
 */
export function isValid2DStyle(styleId: string): boolean {
  return styleId in STYLES_2D_FULL;
}

/**
 * Check if a style ID is valid for 3D
 */
export function isValid3DStyle(styleId: string): boolean {
  return STYLES_3D.some((s) => s.id === styleId);
}

/**
 * Check if style is isometric
 */
export function isIsometricStyle(styleId: string): boolean {
  return styleId.startsWith("ISOMETRIC");
}
