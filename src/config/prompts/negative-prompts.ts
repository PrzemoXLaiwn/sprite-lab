// ===========================================
// SPRITELAB CONFIG - NEGATIVE PROMPTS
// ===========================================
// Universal and specialized negative prompts for generation

import type { UniversalNegatives, IsometricBoost, IsometricNegatives } from "../types";

// ===========================================
// UNIVERSAL NEGATIVE PROMPTS
// ===========================================
// Used for ALL generations to ensure clean game assets

export const UNIVERSAL_NEGATIVES: UniversalNegatives = {
  // Critical: Force single object
  multiObject:
    "multiple objects, many items, collection, set, group, pile, stack, grid layout, sprite sheet, pattern of objects, 2 items, 3 items, several, many, repeated",

  // No backgrounds - CRITICAL for game sprites
  background:
    "any background, detailed background, scene, landscape, environment, room interior, outdoor scene, indoor scene, gradient background, textured background, ground shadow, floor visible, surface plane, colored background, white background, grey background, black background, decorative frame, ornate border, circular frame, square frame, artistic frame, platform, ground, grass, terrain",

  // Quality issues
  quality:
    "blurry, out of focus, low resolution, pixelated, jpeg artifacts, compression artifacts, noisy, grainy, poorly drawn, bad anatomy, deformed, disfigured, mutation, extra limbs",

  // Composition issues
  composition:
    "cropped, cut off, partial object, incomplete, half visible, edge cropping, bad framing, tilted, rotated wrong, upside down, off-center",

  // Technical issues
  technical:
    "text, watermark, signature, logo, username, copyright, border, frame, vignette, color banding, posterization",

  // Wrong content
  wrongContent:
    "photograph, real photo, stock image, 3D render, CGI, real life, photograph of screen",
};

// ===========================================
// ISOMETRIC BOOST PROMPTS
// ===========================================
// Special enhancement for isometric generation

export const ISOMETRIC_BOOST: IsometricBoost = {
  core: "isometric 2.5D view, dimetric projection at 26.57 degrees (2:1 pixel ratio), viewed from above and slightly to the side, strategy game art style",
  composition:
    "single isometric object, diamond-shaped footprint implied, two visible walls and roof top visible, grounded base, clean edges",
  lighting:
    "consistent top-left light source, soft shadow underneath, warm ambient lighting",
  quality:
    "high quality digital art, game-ready asset, professional game art, clean render",
  references:
    "style reference: Clash of Clans, Age of Empires, Civilization, Stardew Valley, strategy game asset",
};

// ===========================================
// ISOMETRIC NEGATIVE PROMPTS
// ===========================================
// Specific negatives for isometric generation to avoid common mistakes

export const ISOMETRIC_NEGATIVES: IsometricNegatives = {
  // Angle/perspective problems
  wrongAngle:
    "perspective view, one-point perspective, two-point perspective, vanishing point, flat top-down view, orthographic side view, front view, profile view, tilted angle, dutch angle, fisheye lens, wide angle distortion",

  // Wrong 3D style
  wrong3D:
    "photorealistic 3D render, realistic CGI, Blender render, Cinema 4D, realistic lighting, ray tracing, subsurface scattering, ambient occlusion heavy",

  // Common isometric mistakes
  mistakes:
    "inconsistent isometric angle, mixed projection, wrong shadow direction, shadow going wrong way, multiple light sources, floating object, not grounded, tilted base, rotated wrong",

  // Style issues
  styleIssues:
    "realistic proportions, human scale reference, photo reference, stock photo, photograph, real world photo",

  // Composition issues for isometric
  composition:
    "multiple buildings, city scene, landscape view, panorama, environment scene, background scenery, horizon line visible",
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get all universal negatives as a single string
 */
export function getUniversalNegativesString(): string {
  return Object.values(UNIVERSAL_NEGATIVES).join(", ");
}

/**
 * Get all isometric negatives as a single string
 */
export function getIsometricNegativesString(): string {
  return Object.values(ISOMETRIC_NEGATIVES).join(", ");
}

/**
 * Build negative prompt with appropriate negatives
 */
export function buildNegativePrompt(
  styleNegatives: string,
  subcategoryAvoid: string | undefined,
  isIsometric: boolean
): string {
  const parts: string[] = [];

  // Style-specific negatives FIRST
  parts.push(styleNegatives);

  // Subcategory-specific avoid list
  if (subcategoryAvoid) {
    parts.push(subcategoryAvoid);
  }

  // Isometric-specific negatives
  if (isIsometric) {
    parts.push(ISOMETRIC_NEGATIVES.wrongAngle);
    parts.push(ISOMETRIC_NEGATIVES.wrong3D);
    parts.push(ISOMETRIC_NEGATIVES.mistakes);
    parts.push(ISOMETRIC_NEGATIVES.styleIssues);
    parts.push(ISOMETRIC_NEGATIVES.composition);
  }

  // Universal negatives
  parts.push(UNIVERSAL_NEGATIVES.multiObject);
  parts.push(UNIVERSAL_NEGATIVES.background);
  parts.push(UNIVERSAL_NEGATIVES.quality);
  parts.push(UNIVERSAL_NEGATIVES.composition);
  parts.push(UNIVERSAL_NEGATIVES.technical);
  parts.push(UNIVERSAL_NEGATIVES.wrongContent);

  return parts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}
