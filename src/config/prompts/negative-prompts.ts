// ===========================================
// SPRITELAB CONFIG - NEGATIVE PROMPTS (v2.0)
// ===========================================
// Enhanced negative prompts for game asset generation
// Prevents common issues: backgrounds, multiple objects, body parts, etc.

// ===========================================
// ISOMETRIC BOOST (positive prompts for isometric)
// ===========================================
export const ISOMETRIC_BOOST = {
  core: "strict 26.57-degree isometric projection, 2:1 pixel ratio dimetric view, mathematically correct isometric angle",
  composition: "single isolated isometric object, centered on transparent background, proper isometric grid alignment, consistent angle throughout",
  lighting: "consistent top-left lighting at 45 degrees, soft ambient light, clear material definition, subtle shadows underneath",
  quality: "clean professional isometric render, mobile game quality, strategy game asset standard",
  references: "like Clash of Clans, Age of Empires, Stardew Valley, Hay Day isometric style",
};

// ===========================================
// UNIVERSAL NEGATIVES (for all game assets)
// ===========================================
export const UNIVERSAL_NEGATIVES = {
  // Background and context issues
  background: "complex background, detailed background, scenery, landscape, environment scene, room interior, outdoor setting, contextual background, sky, ground, floor, walls, furniture in background, decorative background elements",

  // Multiple objects issues - CRITICAL for preventing sprite sheets
  multiObject: "multiple objects, many items, collection set, group of items, pile of items, stack of objects, scattered objects, several pieces, duplicate items, repeated objects, array of items, sprite sheet, spritesheet, sprite grid, animation frames, animation sheet, frame sequence, multiple frames, item collection, weapon collection, weapon set, armor set, item set, grid of items, items grid, multiple weapons, multiple swords, multiple axes, many swords, sword collection, variety of weapons, assortment, asset pack, icon pack, icon set, tileset of items",
  
  // Context of use issues
  context: "character holding, hand holding, person using, worn by character, equipped on body, in use, action scene, combat scene, character interaction, being wielded, mounted on character",
  
  // UI and frame issues
  ui: "UI frame, interface border, game HUD overlay, health bar, menu overlay, button element, text overlay, watermark, logo, copyright mark, game interface elements",
  
  // Quality issues
  quality: "low resolution, blurry, noisy, jpeg artifacts, compression artifacts, grainy, poor quality, low detail, pixelated (for non-pixel styles), fuzzy, out of focus",
  
  // Composition issues
  composition: "cropped, cut off, partial view, incomplete object, edge of frame, zoomed too close, zoomed too far, off-center badly, awkward framing, poor composition",
  
  // Technical issues
  technical: "wrong aspect ratio, distorted proportions, stretched, squashed, warped, deformed, malformed, broken geometry, glitched",
  
  // Unwanted content
  wrongContent: "text, letters, numbers, words, labels, signs, writing, typography, captions, subtitles, watermark text",
  
  // Body parts (critical for equipment/armor)
  bodyParts: "human body, person, face, head, hands, arms, legs, torso, skin, body parts visible, mannequin, human figure, character body, neck, shoulders with body, fingers, eyes, mouth, nose",
};

// ===========================================
// PIXEL ART SPECIFIC NEGATIVES
// ===========================================
export const PIXEL_ART_NEGATIVES = {
  // Anti-smooth enforcement
  antiSmooth: "smooth rendering, soft edges, gradient shading, anti-aliased, anti-aliasing, blurred edges, soft focus, smooth gradients, airbrush effect, soft brush strokes, feathered edges, smooth transitions",
  
  // Wrong style prevention
  wrongStyle: "photorealistic, realistic rendering, oil painting, watercolor, digital painting, 3D render, high detail photo, modern digital art, vector art, illustration, concept art, hand-painted",
  
  // Wrong technique prevention
  wrongTechnique: "smooth shading, realistic lighting, complex shadows, soft lighting, ambient occlusion, ray tracing, subsurface scattering, global illumination, realistic materials",
};

// ===========================================
// ISOMETRIC SPECIFIC NEGATIVES
// ===========================================
export const ISOMETRIC_NEGATIVES = {
  // Wrong angle prevention
  wrongAngle: "perspective view, vanishing point, one point perspective, two point perspective, three point perspective, front view, side view, top-down flat, bird's eye view, tilted angle, dutch angle, fisheye lens, wide angle lens",
  
  // Wrong 3D style prevention
  wrong3D: "full 3D render, realistic 3D, photorealistic 3D, ray traced 3D, physically based rendering, unreal engine render, unity render, cinema 4d style",
  
  // Geometric mistakes
  mistakes: "inconsistent angles, mixed perspectives, wrong projection, distorted geometry, warped shapes, incorrect isometric angle, perspective distortion, converging lines",
  
  // Style issues
  styleIssues: "realistic textures, photorealistic materials, complex lighting, ambient occlusion, subsurface scattering, realistic shadows, film grain, depth of field",
  
  // Composition issues
  composition: "multiple buildings forming complex, city scene, landscape view, aerial photograph, ground level view, street view, panorama, wide scene",
};

// ===========================================
// GAME ASSET SPECIFIC NEGATIVES
// ===========================================
export const GAME_ASSET_NEGATIVES = {
  // Not game-ready
  notGameReady: "concept art sketch, rough draft, unfinished, work in progress, study piece, practice drawing, thumbnail sketch, loose sketch, incomplete render",
  
  // Wrong format
  wrongFormat: "portrait orientation for items, landscape for characters, wrong framing, poor composition, bad crop, awkward angle, unusual perspective",
  
  // Not isolated
  notIsolated: "connected to other objects, part of larger scene, integrated into environment, attached to surface, mounted on wall, placed on table, in container",
  
  // Scene context
  sceneContext: "room scene, outdoor scene, interior view, exterior view, environmental context, location setting, place context, situational context",
};

// ===========================================
// CATEGORY SPECIFIC NEGATIVES
// ===========================================

// For ARMOR category - prevent body parts
export const ARMOR_NEGATIVES = {
  bodyInside: "body inside armor, person wearing, human wearing, character wearing, torso visible, arms visible, legs visible, head inside helmet, face visible inside, skin showing, body parts, human form, mannequin body",
  wornContext: "being worn, equipped on character, character model, full body character, warrior wearing, knight in armor, soldier equipped",
};

// For WEAPONS category - prevent hands/wielding AND sprite sheets
export const WEAPONS_NEGATIVES = {
  handsHolding: "hand holding, hands gripping, character wielding, person holding, warrior with weapon, fighter equipped, being held, in hand, gripped",
  combatContext: "combat scene, battle, fighting, attacking, striking, swinging, action pose, mid-attack, weapon in use",
  // CRITICAL: Prevent weapon sprite sheets
  spriteSheet: "weapon sprite sheet, weapon collection, weapon set, multiple weapons, many weapons, weapon grid, weapon array, weapon assortment, sword collection, many swords, multiple swords, different swords, sword variety, blade collection, arsenal display, weapon showcase, weapon pack, icon pack, sprite pack",
};

// For UI_ELEMENTS category - prevent filled content
export const UI_NEGATIVES = {
  filledContent: "items inside slots, filled inventory, equipped items, content in frame, populated UI, items in grid, full inventory, equipped gear",
  characterUI: "character portrait, character stats, character equipment screen, character model, player character, avatar",
};

// For CHARACTERS/CREATURES - prevent scenes
export const CHARACTER_NEGATIVES = {
  sceneContext: "background scene, environment, location, setting, landscape behind, room interior, outdoor area, dungeon scene, forest scene",
  multipleCharacters: "multiple characters, group, party, team, crowd, several people, many creatures, horde, swarm",
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

/**
 * Get combined negative prompts for a specific category
 */
export function getCategoryNegatives(categoryId: string): string {
  const parts: string[] = [];
  
  // Always add universal negatives
  parts.push(UNIVERSAL_NEGATIVES.background);
  parts.push(UNIVERSAL_NEGATIVES.multiObject);
  parts.push(UNIVERSAL_NEGATIVES.context);
  parts.push(UNIVERSAL_NEGATIVES.ui);
  parts.push(UNIVERSAL_NEGATIVES.quality);
  parts.push(UNIVERSAL_NEGATIVES.composition);
  parts.push(UNIVERSAL_NEGATIVES.technical);
  parts.push(UNIVERSAL_NEGATIVES.wrongContent);
  
  // Add category-specific negatives
  switch (categoryId) {
    case "ARMOR":
      parts.push(UNIVERSAL_NEGATIVES.bodyParts);
      parts.push(ARMOR_NEGATIVES.bodyInside);
      parts.push(ARMOR_NEGATIVES.wornContext);
      break;
      
    case "WEAPONS":
      parts.push(WEAPONS_NEGATIVES.handsHolding);
      parts.push(WEAPONS_NEGATIVES.combatContext);
      parts.push(WEAPONS_NEGATIVES.spriteSheet);
      break;
      
    case "UI_ELEMENTS":
      parts.push(UI_NEGATIVES.filledContent);
      parts.push(UI_NEGATIVES.characterUI);
      break;
      
    case "CHARACTERS":
    case "CREATURES":
      parts.push(CHARACTER_NEGATIVES.sceneContext);
      parts.push(CHARACTER_NEGATIVES.multipleCharacters);
      break;
      
    case "ENVIRONMENT":
    case "ISOMETRIC":
      // Less strict on background for environment
      break;
      
    default:
      // Default: add body parts negative for most categories
      if (!["CHARACTERS", "CREATURES", "ENVIRONMENT"].includes(categoryId)) {
        parts.push(UNIVERSAL_NEGATIVES.bodyParts);
      }
  }
  
  // Add game asset negatives
  parts.push(GAME_ASSET_NEGATIVES.notGameReady);
  parts.push(GAME_ASSET_NEGATIVES.notIsolated);
  
  return parts.join(", ");
}

/**
 * Get style-specific negative prompts
 */
export function getStyleNegatives(styleId: string): string {
  const parts: string[] = [];
  
  // Pixel art styles
  if (styleId.includes("PIXEL")) {
    parts.push(PIXEL_ART_NEGATIVES.antiSmooth);
    parts.push(PIXEL_ART_NEGATIVES.wrongStyle);
    parts.push(PIXEL_ART_NEGATIVES.wrongTechnique);
  }
  
  // Isometric styles
  if (styleId.includes("ISOMETRIC") || styleId === "ISOMETRIC") {
    parts.push(ISOMETRIC_NEGATIVES.wrongAngle);
    parts.push(ISOMETRIC_NEGATIVES.wrong3D);
    parts.push(ISOMETRIC_NEGATIVES.mistakes);
    parts.push(ISOMETRIC_NEGATIVES.styleIssues);
    parts.push(ISOMETRIC_NEGATIVES.composition);
  }
  
  return parts.join(", ");
}

/**
 * Build complete negative prompt
 */
export function buildCompleteNegativePrompt(
  styleNegatives: string,
  categoryId: string,
  styleId: string,
  subcategoryAvoid?: string
): string {
  const parts: string[] = [];
  
  // 1. Style-specific negatives (from style config)
  if (styleNegatives) {
    parts.push(styleNegatives);
  }
  
  // 2. Enhanced style negatives (pixel art, isometric)
  const enhancedStyleNegatives = getStyleNegatives(styleId);
  if (enhancedStyleNegatives) {
    parts.push(enhancedStyleNegatives);
  }
  
  // 3. Subcategory avoid list
  if (subcategoryAvoid) {
    parts.push(subcategoryAvoid);
  }
  
  // 4. Category-specific negatives
  const categoryNegatives = getCategoryNegatives(categoryId);
  parts.push(categoryNegatives);
  
  // Clean and return
  return parts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
}
