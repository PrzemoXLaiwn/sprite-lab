// ===========================================
// SPRITELAB CONFIG - NEGATIVE PROMPTS (PRO v3.0)
// ===========================================
// Professional game-dev quality negative prompts
// Optimized for clean, game-ready asset output

import type { UniversalNegatives, IsometricBoost, IsometricNegatives } from "../types";

// ===========================================
// UNIVERSAL NEGATIVE PROMPTS (PRO v3.0)
// ===========================================
// Used for ALL generations to ensure clean game assets

export const UNIVERSAL_NEGATIVES: UniversalNegatives = {
  // Critical: Force single object - game engines need isolated assets
  multiObject:
    "multiple objects, many items, collection, set of items, group of objects, pile, stack, grid layout, sprite sheet, pattern of objects, 2 items, 3 items, several, many, repeated objects, duplicates, rows, arrays, tiled, mosaic",

  // No backgrounds - CRITICAL for game sprites with alpha transparency
  background:
    "any background, detailed background, scene, landscape, environment, room interior, outdoor scene, indoor scene, gradient background, textured background, ground shadow, floor visible, surface plane, colored background, white background, grey background, black background, decorative frame, ornate border, circular frame, square frame, artistic frame, platform, ground, grass, terrain, sky, clouds, horizon, floor tiles, checkered floor, studio backdrop, photography backdrop",

  // Quality issues - ensure production quality
  quality:
    "blurry, out of focus, low resolution, jpeg artifacts, compression artifacts, noisy, grainy, poorly drawn, bad anatomy, deformed, disfigured, mutation, extra limbs, amateur, ugly, distorted, stretched, squished, low quality, worst quality, normal quality, low effort, rushed, sloppy, messy, smudged, smeared",

  // Composition issues - game assets need perfect framing
  composition:
    "cropped, cut off, partial object, incomplete, half visible, edge cropping, bad framing, tilted, rotated wrong, upside down, off-center, asymmetrical when should be symmetrical, unbalanced, awkward positioning, touching edges, bleeding off edge, clipped",

  // Technical issues - clean professional output
  technical:
    "text, watermark, signature, logo, username, copyright, border, frame, vignette, color banding, posterization, moire pattern, aliasing artifacts, render errors, glitches, noise grain, film grain, chromatic aberration, lens flare",

  // Wrong content - game art not photos
  wrongContent:
    "photograph, real photo, stock image, photorealistic 3D render, CGI movie quality, real life, photograph of screen, screenshot, webcam, phone photo, DSLR photo, camera image",

  // Body parts - CRITICAL for equipment/armor items (isolated equipment only)
  bodyParts:
    "human hands, human arms, human legs, human feet, human body, mannequin, body parts inside equipment, hands inside gloves, feet inside boots, head inside helmet, torso inside armor, person wearing equipment, worn on body, attached to body, limbs, fingers, toes, wrists, ankles, neck, shoulders with arms, deformed hands, deformed fingers, bodysuit, wearing, dressed, model, posed",
};

// ===========================================
// ISOMETRIC BOOST PROMPTS (PRO v3.0)
// ===========================================
// Professional isometric game asset enhancement

export const ISOMETRIC_BOOST: IsometricBoost = {
  core: "isometric 2.5D view, perfect dimetric projection at 26.57 degrees (2:1 pixel ratio), viewed from above and slightly to the side, professional strategy game art style, game-ready isometric asset",
  composition:
    "single isolated isometric object, diamond-shaped footprint implied, two visible walls and roof top clearly visible, properly grounded base, clean precise edges, perfect isometric angle maintained throughout",
  lighting:
    "consistent top-left light source at 45 degrees, soft drop shadow underneath, warm ambient fill lighting, professional game lighting",
  quality:
    "masterpiece quality, high detail, professional game art, production-ready asset, AAA mobile game quality, polished finish, crisp clean render",
  references:
    "professional quality like Clash of Clans, Age of Empires IV, Civilization VI, Stardew Valley, Hay Day, Township, premium strategy game asset",
};

// ===========================================
// ISOMETRIC NEGATIVE PROMPTS (PRO v3.0)
// ===========================================
// Enhanced negatives for isometric generation

export const ISOMETRIC_NEGATIVES: IsometricNegatives = {
  // Angle/perspective problems - isometric MUST be correct angle
  wrongAngle:
    "perspective view, one-point perspective, two-point perspective, three-point perspective, vanishing point visible, flat top-down view, orthographic side view, front view, profile view, tilted angle, dutch angle, fisheye lens, wide angle distortion, bird's eye view, worm's eye view, wrong camera angle",

  // Wrong 3D style - game art not CGI
  wrong3D:
    "photorealistic 3D render, realistic CGI, Blender render, Cinema 4D render, Maya render, realistic lighting, ray tracing, subsurface scattering, ambient occlusion heavy, PBR materials, realistic reflections, caustics",

  // Common isometric mistakes - precision is key
  mistakes:
    "inconsistent isometric angle, mixed projection, wrong shadow direction, shadow going wrong way, multiple light sources, floating object, not grounded, tilted base, rotated wrong, perspective distortion, skewed proportions, warped geometry",

  // Style issues
  styleIssues:
    "realistic proportions, human scale reference, photo reference, stock photo, photograph, real world photo, photorealistic textures, real materials",

  // Composition issues for isometric - single clean asset
  composition:
    "multiple buildings, city scene, landscape view, panorama, environment scene, background scenery, horizon line visible, multiple objects, scene composition, world map, level layout",
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
