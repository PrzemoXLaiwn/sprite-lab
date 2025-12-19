// ===========================================
// SPRITELAB - PROMPT BUILDER v10.0
// ===========================================
// SIMPLE & EFFECTIVE - like meshy.ai
//
// RULES:
// 1. User prompt FIRST (what they want)
// 2. Category context (what type of object)
// 3. Perspective (how to show it)
// 4. Style (pixel art, hand-painted, etc.)
// 5. Isolation (game asset, centered, clean)
//
// NEGATIVE PROMPT blocks unwanted stuff

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";

// ===========================================
// PERSPECTIVES - How to show each item type
// ===========================================
const PERSPECTIVES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS: "side view, horizontal, full blade visible from tip to handle",
    AXES: "side view, diagonal angle, full head and handle visible",
    POLEARMS: "vertical, full length from tip to bottom",
    BOWS: "front view, slight angle, full curve and string visible",
    STAFFS: "vertical, full length, top ornament visible",
    GUNS: "side profile, horizontal, full weapon visible",
    THROWING: "top-down flat view, full shape visible",
  },
  ARMOR: {
    HELMETS: "front 3/4 view, face opening visible, no head inside",
    CHEST_ARMOR: "front view, torso piece only, no body inside",
    SHIELDS: "front view, flat, emblem/design visible",
    GLOVES: "3/4 view, pair of gloves, no hands inside",
    BOOTS: "side view, pair of boots, no feet inside",
    ACCESSORIES: "front view, centered",
  },
  CONSUMABLES: {
    POTIONS: "front view, slight angle, full bottle visible",
    FOOD: "3/4 view, appetizing presentation",
    SCROLLS: "slight angle, rolled parchment visible",
  },
  RESOURCES: {
    GEMS: "front view, facets visible, sparkling",
    ORES: "3/4 view, raw chunk",
    WOOD_STONE: "3/4 view, raw material",
    PLANTS: "front view, full plant visible",
    MONSTER_PARTS: "3/4 view, detailed",
    MAGIC_MATERIALS: "front view, glowing",
  },
  CHARACTERS: {
    HEROES: "front 3/4 view, full body, heroic pose",
    ENEMIES: "front 3/4 view, full body, menacing pose",
    NPCS: "front 3/4 view, full body, neutral pose",
    BOSSES: "front view, full body, imposing stance",
  },
  CREATURES: {
    ANIMALS: "side 3/4 view, full body",
    MYTHICAL: "front 3/4 view, full body, majestic",
    PETS: "front view, full body, cute pose",
    ELEMENTALS: "front view, full form, energy visible",
  },
};

// ===========================================
// OBJECT DESCRIPTIONS - What the object IS
// ===========================================
const OBJECT_TYPES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS: "sword, bladed weapon",
    AXES: "axe, chopping weapon",
    POLEARMS: "polearm, long-shafted weapon",
    BOWS: "bow, ranged weapon with string",
    STAFFS: "magical staff",
    GUNS: "firearm, gun",
    THROWING: "throwing weapon",
  },
  ARMOR: {
    HELMETS: "helmet, head protection, empty inside",
    CHEST_ARMOR: "chest armor, torso protection, empty inside",
    SHIELDS: "shield, defensive equipment",
    GLOVES: "gauntlets, hand armor, empty inside",
    BOOTS: "boots, foot armor, empty inside",
    ACCESSORIES: "armor accessory",
  },
  CONSUMABLES: {
    POTIONS: "potion bottle, glass container with liquid",
    FOOD: "food item, edible",
    SCROLLS: "scroll, rolled parchment",
  },
  RESOURCES: {
    GEMS: "gemstone, precious crystal",
    ORES: "ore, raw mineral",
    WOOD_STONE: "raw material",
    PLANTS: "herb, magical plant",
    MONSTER_PARTS: "monster drop, creature part",
    MAGIC_MATERIALS: "magical material, enchanted essence",
  },
  CHARACTERS: {
    HEROES: "hero character, adventurer",
    ENEMIES: "enemy character, hostile",
    NPCS: "NPC, friendly character",
    BOSSES: "boss enemy, powerful foe",
  },
  CREATURES: {
    ANIMALS: "animal, creature",
    MYTHICAL: "mythical beast, legendary creature",
    PETS: "pet companion, cute creature",
    ELEMENTALS: "elemental being, magical entity",
  },
};

// ===========================================
// STYLE PROMPTS - Visual rendering style
// ===========================================
const STYLE_PROMPTS: Record<string, string> = {
  PIXEL_ART_16: "16-bit pixel art, retro SNES style, visible pixels, limited palette",
  PIXEL_ART_32: "32-bit HD pixel art, detailed pixels, indie game style",
  HAND_PAINTED: "hand-painted digital art, painterly brushstrokes",
  VECTOR_CLEAN: "clean vector art, flat colors, smooth edges, mobile game style",
  ANIME_GAME: "anime game art, cel shading, JRPG style",
  CHIBI_CUTE: "chibi kawaii style, cute big head, adorable",
  CARTOON_WESTERN: "western cartoon, bold outlines, Cuphead style",
  DARK_SOULS: "dark fantasy, gritty, weathered, souls-like",
  ISOMETRIC: "isometric 2.5D, 30 degree angle, strategy game style",
  ISOMETRIC_PIXEL: "isometric pixel art, retro RTS style",
  ISOMETRIC_CARTOON: "isometric cartoon, colorful casual game",
  REALISTIC_PAINTED: "realistic digital painting, detailed, concept art quality",
};

// ===========================================
// ISOLATION - Clean game asset presentation
// ===========================================
const ISOLATION_PROMPT = "single isolated game asset icon, centered, clean background, professional game art, high quality render";

// ===========================================
// NEGATIVE PROMPTS
// ===========================================
const NEGATIVE_CORE = [
  "multiple items, collection, many objects, sprite sheet, grid, duplicates",
  "background, scenery, environment, landscape, room",
  "blurry, low quality, watermark, text, signature",
  "cropped, cut off, partial, incomplete",
].join(", ");

const NEGATIVE_WEAPONS = "scabbard, sheath, holder, stand, hand holding, person wielding, combat scene";
const NEGATIVE_ARMOR = "body inside, person wearing, mannequin, human form, skin visible, face inside";

const STYLE_NEGATIVES: Record<string, string> = {
  PIXEL_ART_16: "smooth gradients, anti-aliasing, realistic, 3D render, photograph",
  PIXEL_ART_32: "smooth gradients, anti-aliasing, realistic, soft edges",
  HAND_PAINTED: "pixel art, vector, flat colors, 3D render",
  VECTOR_CLEAN: "textured, painterly, pixel art, realistic",
  ANIME_GAME: "western cartoon, realistic, pixel art",
  CHIBI_CUTE: "realistic proportions, dark, scary, detailed",
  CARTOON_WESTERN: "anime, realistic, pixel art, thin lines",
  DARK_SOULS: "bright colors, cartoon, cute, chibi, colorful",
  ISOMETRIC: "perspective view, top-down, side view, realistic 3D",
  ISOMETRIC_PIXEL: "smooth gradients, perspective, realistic",
  ISOMETRIC_CARTOON: "realistic, dark, pixel art, perspective",
  REALISTIC_PAINTED: "cartoon, pixel art, flat colors, anime",
};

// ===========================================
// MAIN FUNCTION - buildUltimatePrompt
// ===========================================
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;

  // Get components
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  const styleNegative = STYLE_NEGATIVES[styleId] || "";
  const perspective = PERSPECTIVES[categoryId]?.[subcategoryId] || "";
  const objectType = OBJECT_TYPES[categoryId]?.[subcategoryId] || "";

  // Clean user input
  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD POSITIVE PROMPT
  // ===========================================
  // Order: User description → Object type → Perspective → Style → Isolation
  const promptParts: string[] = [];

  // 1. User's description (MOST IMPORTANT)
  if (cleanPrompt) {
    promptParts.push(cleanPrompt);
  }

  // 2. Object type context
  if (objectType) {
    promptParts.push(objectType);
  }

  // 3. Perspective/view
  if (perspective) {
    promptParts.push(perspective);
  }

  // 4. Art style
  promptParts.push(stylePrompt);

  // 5. Isolation/presentation
  promptParts.push(ISOLATION_PROMPT);

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE];

  // Category-specific negatives
  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
  }

  // Style-specific negatives
  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  // ===========================================
  // FINAL OUTPUT
  // ===========================================
  const finalPrompt = promptParts.join(", ");
  const finalNegative = negativeParts.join(", ");

  // Log for debugging
  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v10.0");
  console.log("═".repeat(60));
  console.log("📝 Input:", cleanPrompt);
  console.log("📦 Category:", categoryId, "/", subcategoryId);
  console.log("🎨 Style:", styleId);
  console.log("─".repeat(60));
  console.log("✅ PROMPT:", finalPrompt);
  console.log("❌ NEGATIVE:", finalNegative);
  console.log("═".repeat(60) + "\n");

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    model: style.model,
    guidance: style.guidance,
    steps: style.steps,
  };
}

// ===========================================
// ENHANCED PROMPT (Premium - currently same as basic)
// ===========================================
export function buildEnhancedPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  _options: {
    enableStyleMix?: boolean;
    style2Id?: string;
    style1Weight?: number;
    colorPaletteId?: string;
  } = {}
): BuildPromptResult {
  // Premium features disabled - use standard builder
  return buildUltimatePrompt(userPrompt, categoryId, subcategoryId, styleId);
}

// ===========================================
// HELPER EXPORTS
// ===========================================
export function isIsometricMode(
  categoryId: string,
  _subcategoryId: string,
  styleId: string
): boolean {
  return categoryId === "ISOMETRIC" || styleId.startsWith("ISOMETRIC");
}

export function extractKeyDescriptors(userPrompt: string): string[] {
  return userPrompt.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
}

export function detectSlotGrid(): { hasSlots: boolean; slotCount: number; cols: number; rows: number; gridDescription: string } {
  return { hasSlots: false, slotCount: 0, cols: 0, rows: 0, gridDescription: "" };
}
