// ===========================================
// SPRITELAB - PROMPT BUILDER v11.0
// ===========================================
// CHANGE LOG v11.0:
//   FIX 1 — Prompt reorder: user intent is now position 2 (was position 9+
//            for pixel art). Object anchor restored for ALL styles including
//            pixel art. Style block slimmed to 3-4 tokens (was 6+ synonyms).
//
//   FIX 2 — Stronger negative prompts: anti-embellishment block added,
//            weapon/icon/item-specific negatives expanded. Hallucinated glow,
//            aura, extra gems, extra decorations now blocked by default.
//
// PROMPT ORDER (all styles):
//   1. object anchor   — what the object IS and its anatomy
//   2. user concept    — user's literal description
//   3. style block     — rendering rules
//   4. composition     — orientation / framing
//   5. isolation       — transparent bg, single object

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";

// ===========================================
// PERSPECTIVES - Optimal angles for game assets
// ===========================================
const PERSPECTIVES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS:   "side profile view, horizontal orientation, full blade tip to pommel",
    AXES:     "side profile view, 45-degree diagonal, full axe head and handle",
    POLEARMS: "diagonal view, full weapon length visible, tip prominent",
    BOWS:     "front 3/4 view, bow curve and string visible",
    STAFFS:   "vertical orientation, full staff from base to top",
    GUNS:     "side profile, horizontal, barrel to stock complete",
    THROWING: "front view flat, complete throwing weapon shape",
  },
  ARMOR: {
    HELMETS:     "front 3/4 view, empty helmet floating, visor visible",
    CHEST_ARMOR: "front view, armor piece floating, no body inside",
    SHIELDS:     "front view, flat facing viewer, emblem visible",
    GLOVES:      "3/4 view, single gauntlet, no hands inside",
    BOOTS:       "side 3/4 view, single boot, no feet inside",
    ACCESSORIES: "front view, accessory centered, clearly visible",
  },
  CONSUMABLES: {
    POTIONS: "front 3/4 view, bottle with liquid visible, cork stopper",
    FOOD:    "3/4 view from above, appetizing presentation",
    SCROLLS: "3/4 view, rolled parchment, seal visible",
  },
  RESOURCES: {
    GEMS:           "front view, crystal facets catching light, sparkling",
    ORES:           "3/4 view, raw ore chunk, rough edges",
    WOOD_STONE:     "3/4 view, raw material stack, natural texture",
    PLANTS:         "front view, complete plant, leaves and stems visible",
    MONSTER_PARTS:  "3/4 view, trophy item, detailed texture",
    MAGIC_MATERIALS:"front view, ethereal material, centered",
  },
  CHARACTERS: {
    HEROES:  "front 3/4 view, full body head to toe, standing pose",
    ENEMIES: "front 3/4 view, full body, menacing pose",
    NPCS:    "front 3/4 view, full body, neutral friendly pose",
    BOSSES:  "front view, full imposing body, powerful stance",
  },
  CREATURES: {
    ANIMALS:   "side 3/4 view, full body including tail",
    MYTHICAL:  "front 3/4 view, full body, wings or features spread",
    PETS:      "front view, full cute body, friendly pose",
    ELEMENTALS:"front view, full ethereal form",
  },
  ENVIRONMENT: {
    TREES:         "front view, complete tree from ground to crown top, entire tree in frame",
    PLANTS:        "front view, complete plant from base to top",
    ROCKS_TERRAIN: "front 3/4 view, complete rock formation",
    BUILDINGS:     "front 3/4 view, COMPLETE building from foundation to roof, entire structure in frame with margin",
    PROPS:         "front 3/4 view, complete prop, full item visible",
    ISO_BUILDINGS: "isometric 45-degree view, complete building base to roof",
    ISO_TERRAIN:   "isometric 45-degree view, complete terrain piece",
    CONTAINERS:    "front 3/4 view, complete container, lid and body visible",
  },
  QUEST_ITEMS: {
    KEYS:        "front view, complete key, handle and teeth visible",
    ARTIFACTS:   "front 3/4 view, complete artifact",
    CHESTS:      "front 3/4 view, chest with lid, decorative details",
    COLLECTIBLES:"front view, complete collectible, shiny",
    MAPS:        "front view flat, complete map or scroll",
    CONTAINERS:  "front 3/4 view, complete container object",
  },
};

// ===========================================
// OBJECT ANCHORS - Anatomy-level identity lock
// ===========================================
// Placed BEFORE the user prompt so the model knows what structure to build.
// Intentionally plain — no "magical/fantasy" adjectives that compete with
// user-specified materials.
const OBJECT_TYPES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS:   "sword weapon, blade with crossguard and pommel",
    AXES:     "axe weapon, blade head on handle",
    POLEARMS: "polearm weapon, long shaft with bladed tip",
    BOWS:     "bow weapon, curved limb with taut bowstring",
    STAFFS:   "staff weapon, long shaft with topper",
    GUNS:     "firearm weapon, barrel grip trigger mechanism",
    THROWING: "throwing weapon, balanced projectile shape",
  },
  ARMOR: {
    HELMETS:     "helmet headgear, protective head armor piece, empty equipment",
    CHEST_ARMOR: "chest armor, torso protection piece, empty equipment",
    SHIELDS:     "defensive shield, round or kite shaped",
    GLOVES:      "armored gauntlets, hand protection, empty equipment",
    BOOTS:       "armored boots, protective footwear, empty equipment",
    ACCESSORIES: "armor accessory, equipment piece",
  },
  CONSUMABLES: {
    POTIONS: "potion, glass bottle with colored liquid and cork stopper",
    FOOD:    "food item, cooked meal or ingredient",
    SCROLLS: "scroll, rolled parchment tied with ribbon",
  },
  RESOURCES: {
    GEMS:           "precious gemstone, faceted crystal jewel",
    ORES:           "raw ore chunk, unrefined mineral",
    WOOD_STONE:     "raw crafting material, wood or stone",
    PLANTS:         "herb or plant, fantasy flora",
    MONSTER_PARTS:  "monster drop, creature trophy",
    MAGIC_MATERIALS:"crafting material, elemental fragment",
  },
  CHARACTERS: {
    HEROES:  "hero character, adventurer full body",
    ENEMIES: "enemy character, hostile creature full body",
    NPCS:    "NPC character, townsperson full body",
    BOSSES:  "boss enemy, large powerful character full body",
  },
  CREATURES: {
    ANIMALS:   "animal creature, beast full body",
    MYTHICAL:  "mythical creature, legendary beast",
    PETS:      "pet companion, friendly creature full body",
    ELEMENTALS:"elemental being, creature of pure energy",
  },
  ENVIRONMENT: {
    TREES:         "complete tree, full trunk from ground to crown",
    PLANTS:        "complete plant, full foliage from root to top",
    ROCKS_TERRAIN: "complete rock formation, full structure",
    BUILDINGS:     "complete small building, entire structure foundation to roof",
    PROPS:         "environment prop, complete object",
    ISO_BUILDINGS: "complete isometric building tile",
    ISO_TERRAIN:   "complete isometric terrain tile",
    CONTAINERS:    "container object, barrel or crate or chest complete",
  },
  QUEST_ITEMS: {
    KEYS:        "key, ornate handle and teeth",
    ARTIFACTS:   "magical artifact, ancient relic",
    CHESTS:      "treasure chest, wooden with metal bands",
    COLLECTIBLES:"collectible item, shiny valuable",
    MAPS:        "treasure map or ancient scroll",
    CONTAINERS:  "container, lid and body complete",
  },
  UI_ELEMENTS: {
    ITEM_ICONS: "item icon, small square game icon",
    SKILL_ICONS:"skill icon, ability symbol",
    ICONS_UI:   "UI icon, interface symbol",
    BUTTONS:    "UI button, interactive element",
    BARS:       "progress bar, health or resource bar",
    FRAMES:     "UI frame, decorative border",
    PANELS:     "UI panel, interface container",
    SLOTS:      "inventory slot, item grid cell",
  },
};

// ===========================================
// STYLE PROMPTS
// ===========================================
// v11.0: Slimmed down from 6+ synonym tokens to 3-4 essential tokens.
// Pixel art: ONLY the most discriminative terms kept.
// The full styleCore from STYLES_2D_FULL is used in style block below,
// these constants are the short "style anchor" that goes in position 3.
const STYLE_PROMPTS: Record<string, string> = {
  PIXEL_ART_16:    "pixel art, 16-bit style, visible square pixels, no anti-aliasing",
  PIXEL_ART_32:    "pixel art, 32-bit style, visible pixels, pixelated, no anti-aliasing",
  HAND_PAINTED:    "hand-painted digital art, visible brush strokes, painterly, Hollow Knight style",
  VECTOR_CLEAN:    "vector art, flat colors, clean smooth edges, mobile game style",
  ANIME_GAME:      "anime game art, cel shading, JRPG style, clean lineart",
  CHIBI_CUTE:      "chibi kawaii style, cute big head small body, soft pastel colors",
  CARTOON_WESTERN: "western cartoon style, thick bold outlines, Cuphead rubber hose style",
  DARK_SOULS:      "dark fantasy art, gritty weathered, souls-like style, muted desaturated colors",
  ISOMETRIC:       "isometric 2.5D view, 26.57 degree angle, strategy game style",
  ISOMETRIC_PIXEL: "pixel art isometric, 16-bit RTS style, visible pixels, isometric grid",
  ISOMETRIC_CARTOON:"isometric cartoon style, casual mobile game, colorful",
  REALISTIC_PAINTED:"digital painting, realistic rendering, AAA game concept art",
};

// ===========================================
// ISOLATION - Single game asset presentation
// ===========================================
const ISOLATION_PROMPT = "single object, centered, transparent background, complete not cropped";

// ===========================================
// NEGATIVE PROMPTS
// ===========================================
// v11.0 changes:
//   — NEGATIVE_CORE: added glow/aura/embellishment terms to base block
//   — NEGATIVE_EMBELLISHMENT: NEW block for hallucinated fantasy additions
//   — NEGATIVE_WEAPONS: expanded to block unwanted magic effects on plain weapons
//   — NEGATIVE_ICONS: NEW block for icon-specific issues
//   — NEGATIVE_ITEMS: NEW block for consumables/resources
// ===========================================

// Base negatives for ALL assets
const NEGATIVE_CORE =
  "multiple objects, background, scenery, cropped, cut off, blurry, watermark, text, " +
  "signature, logo, frame border, game UI overlay";

// Anti-embellishment: blocks hallucinated fantasy additions not requested by user.
// Applied to all non-character asset types by default.
const NEGATIVE_EMBELLISHMENT =
  "magical glow added by AI, energy aura, fantasy embellishment not described, " +
  "glowing blade not requested, fire flames not requested, lightning not requested, " +
  "extra gems not mentioned, extra runes not mentioned, extra decorations not described, " +
  "magical sparkles not requested, enchantment effects not requested, " +
  "particle effects not described, light rays not requested";

// Weapons: no hands, no combat context, no sheet, no added magic
const NEGATIVE_WEAPONS =
  "hand holding, hands gripping, person wielding, combat scene, battle, " +
  "scabbard, sheath, weapon stand, arm, fingers, " +
  "weapon sprite sheet, weapon collection, multiple weapons, weapon set, " +
  "glowing blade unless described, magical aura unless described, " +
  "fire on blade unless described, ice coating unless described, " +
  "runes unless described, enchanted glow unless described";

// Armor: no body inside, not worn
const NEGATIVE_ARMOR =
  "body inside, person wearing, mannequin, human form, skin, " +
  "face inside helmet, torso visible, character model";

// Icons (UI_ELEMENTS): clean isolated single icon
const NEGATIVE_ICONS =
  "icon collection, icon sheet, icon grid, multiple icons, icon set, icon pack, " +
  "background behind icon, drop shadow unless requested, bevel unless requested, " +
  "UI frame overlay, health bar, text label, tooltip, game HUD chrome, " +
  "frame around icon unless requested, border unless requested";

// Items/Consumables: no aura, no collection, no context
const NEGATIVE_ITEMS =
  "magical aura unless described, glow effects unless specified, " +
  "multiple items, item collection, item set, extra bottles, extra copies, " +
  "placed on surface, table background, inventory context, shelf context";

// Characters/Creatures: no scene, no crowd
const NEGATIVE_CHARACTERS =
  "background scene, environment landscape, room interior, outdoor scenery, " +
  "multiple characters, crowd, group, party, companion beside subject";

// Environment: must show complete structure
const NEGATIVE_ENVIRONMENT =
  "cropped building, cut off roof, partial structure, incomplete building, " +
  "building extends beyond frame, zoomed too close, close-up detail view";

// Style negatives per style (pixel art needs smooth blocking)
const STYLE_NEGATIVES: Record<string, string> = {
  PIXEL_ART_16:
    "smooth, anti-aliasing, soft edges, blended colors, smooth shading, " +
    "realistic, 3D render, photograph, photorealistic, " +
    "high resolution, 4K, 8K, HD, ultra detailed, " +
    "vector art, painted, gradient, polished",
  PIXEL_ART_32:
    "smooth, anti-aliasing, soft edges, blended colors, smooth shading, " +
    "realistic, 3D render, photorealistic, " +
    "high resolution, 4K, HD, soft gradients, vector art, polished, gradient",
  HAND_PAINTED:  "pixel art, vector, flat colors, 3D render, smooth digital, photorealistic",
  VECTOR_CLEAN:  "textured, painterly, pixel art, realistic, detailed shading, hand-drawn, rough",
  ANIME_GAME:    "western cartoon, realistic, pixel art, 3D render, painterly",
  CHIBI_CUTE:    "realistic proportions, dark, scary, detailed anatomy, mature",
  CARTOON_WESTERN:"anime, realistic, pixel art, thin lines, soft shading",
  DARK_SOULS:    "bright colors, cartoon, cute, chibi, clean pristine, anime, vibrant, pastel",
  ISOMETRIC:     "perspective view, top-down flat, side view, realistic 3D, wrong angle",
  ISOMETRIC_PIXEL:"smooth gradients, perspective, realistic, soft edges, anti-aliasing",
  ISOMETRIC_CARTOON:"realistic, dark, pixel art, perspective, gritty",
  REALISTIC_PAINTED:"cartoon, pixel art, flat colors, anime, simple shapes",
};

// ===========================================
// MAIN FUNCTION — buildUltimatePrompt
// ===========================================
// v11.0 prompt order:
//   1. objectAnchor  — anatomy identity (e.g. "sword weapon, blade with crossguard and pommel")
//   2. cleanPrompt   — user's literal description (e.g. "iron sword with diamond handle")
//   3. stylePrompt   — rendering style (4 tokens max)
//   4. perspective   — orientation / framing
//   5. ISOLATION     — single object, transparent bg
//
// Previously (v10.0): style was position 1 for pixel art, user prompt at ~position 9.
// Now:                style is position 3 for ALL styles. User prompt is always position 2.
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;

  const isPixelArt  = styleId.includes("PIXEL");
  const isIsometric = styleId.includes("ISOMETRIC") || categoryId === "ISOMETRIC";

  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  const styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  // Object anchor: always used now (pixel art no longer skipped — FIX 1)
  const objectAnchor = OBJECT_TYPES[categoryId]?.[subcategoryId] || "";
  const perspective  = PERSPECTIVES[categoryId]?.[subcategoryId] || "";

  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD POSITIVE PROMPT
  // ===========================================
  // Order: objectAnchor → userPrompt → style → perspective → isolation
  // Isometric keeps the same order; pixel art no longer front-loads the
  // style block at the expense of user intent.
  const promptParts: string[] = [];

  if (objectAnchor) {
    promptParts.push(objectAnchor);
  }

  if (cleanPrompt) {
    promptParts.push(cleanPrompt);
  }

  promptParts.push(stylePrompt);

  if (perspective) {
    promptParts.push(perspective);
  }

  promptParts.push(ISOLATION_PROMPT);

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE, NEGATIVE_EMBELLISHMENT];

  // Category-specific negatives
  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
  } else if (categoryId === "UI_ELEMENTS") {
    negativeParts.push(NEGATIVE_ICONS);
  } else if (categoryId === "CONSUMABLES" || categoryId === "RESOURCES" || categoryId === "QUEST_ITEMS") {
    negativeParts.push(NEGATIVE_ITEMS);
  } else if (categoryId === "CHARACTERS" || categoryId === "CREATURES") {
    negativeParts.push(NEGATIVE_CHARACTERS);
  } else if (categoryId === "ENVIRONMENT") {
    negativeParts.push(NEGATIVE_ENVIRONMENT);
  }

  // Style-specific negatives
  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  // ===========================================
  // FINAL OUTPUT
  // ===========================================
  const finalPrompt   = promptParts.filter(Boolean).join(", ");
  const finalNegative = negativeParts.filter(Boolean).join(", ");

  // Debug log
  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v11.0");
  console.log("═".repeat(60));
  console.log("📝 Input:", cleanPrompt);
  console.log("📦 Category:", categoryId, "/", subcategoryId);
  console.log("🎨 Style:", styleId);
  console.log("─".repeat(60));
  console.log("✅ PROMPT:", finalPrompt);
  console.log("❌ NEGATIVE:", finalNegative);
  console.log("═".repeat(60) + "\n");

  return {
    prompt:         finalPrompt,
    negativePrompt: finalNegative,
    model:          style.model,
    guidance:       style.guidance,
    steps:          style.steps,
  };
}

// ===========================================
// ENHANCED PROMPT (Premium Features)
// ===========================================
export function buildEnhancedPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  options: {
    enableStyleMix?: boolean;
    style2Id?: string;
    style1Weight?: number;
    colorPaletteId?: string;
  } = {}
): BuildPromptResult {
  const { enableStyleMix, style2Id, style1Weight = 50, colorPaletteId } = options;

  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;

  const isPixelArt = styleId.includes("PIXEL");

  let stylePrompt   = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  let styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  const objectAnchor = OBJECT_TYPES[categoryId]?.[subcategoryId] || "";
  const perspective  = PERSPECTIVES[categoryId]?.[subcategoryId] || "";

  // ===========================================
  // STYLE MIXING (blend two styles)
  // ===========================================
  if (enableStyleMix && style2Id && style2Id !== styleId) {
    const style2Prompt   = STYLE_PROMPTS[style2Id] || "";
    const style2Negative = STYLE_NEGATIVES[style2Id] || "";

    if (style2Prompt) {
      if (style1Weight >= 70) {
        stylePrompt = `${stylePrompt}, with subtle ${style2Prompt.split(",")[0]} influence`;
      } else if (style1Weight <= 30) {
        stylePrompt = `${style2Prompt}, with subtle ${stylePrompt.split(",")[0]} influence`;
      } else {
        stylePrompt = `hybrid style blending ${stylePrompt.split(",")[0]} with ${style2Prompt.split(",")[0]}, mixed art style`;
      }
      styleNegative = `${styleNegative}, ${style2Negative}`.replace(/,\s*,/g, ",");
    }
  }

  // ===========================================
  // COLOR PALETTE LOCK
  // ===========================================
  const COLOR_PALETTE_PROMPTS: Record<string, string> = {
    FANTASY_GOLD:    "golden yellow, royal purple, rich brown color palette",
    FOREST_GREEN:    "forest green, earth brown, natural color palette",
    ICE_BLUE:        "ice blue, frost white, cool cyan color palette",
    FIRE_RED:        "fire red, burning orange, molten gold color palette",
    DARK_SOULS:      "dark muted, desaturated brown, gritty gray color palette",
    NEON_CYBER:      "neon pink, electric cyan, purple glow color palette",
    PASTEL_DREAM:    "soft pastel, gentle pink, light blue color palette",
    OCEAN_DEEP:      "deep ocean blue, teal, aquamarine color palette",
    AUTUMN_HARVEST:  "autumn orange, harvest brown, warm amber color palette",
    MONO_BW:         "black and white, grayscale, monochrome",
    RETRO_GAMEBOY:   "game boy green, 4-color palette, retro handheld",
    SUNSET_WARM:     "sunset orange, warm pink, golden yellow color palette",
  };

  const colorPrompt =
    colorPaletteId && COLOR_PALETTE_PROMPTS[colorPaletteId]
      ? COLOR_PALETTE_PROMPTS[colorPaletteId]
      : "";

  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD POSITIVE PROMPT (same order as buildUltimatePrompt)
  // ===========================================
  const promptParts: string[] = [];

  if (objectAnchor) promptParts.push(objectAnchor);
  if (cleanPrompt)  promptParts.push(cleanPrompt);
  promptParts.push(stylePrompt);
  if (colorPrompt)  promptParts.push(colorPrompt);
  if (perspective)  promptParts.push(perspective);
  promptParts.push(ISOLATION_PROMPT);

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE, NEGATIVE_EMBELLISHMENT];

  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
  } else if (categoryId === "UI_ELEMENTS") {
    negativeParts.push(NEGATIVE_ICONS);
  } else if (categoryId === "CONSUMABLES" || categoryId === "RESOURCES" || categoryId === "QUEST_ITEMS") {
    negativeParts.push(NEGATIVE_ITEMS);
  } else if (categoryId === "CHARACTERS" || categoryId === "CREATURES") {
    negativeParts.push(NEGATIVE_CHARACTERS);
  } else if (categoryId === "ENVIRONMENT") {
    negativeParts.push(NEGATIVE_ENVIRONMENT);
  }

  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  // ===========================================
  // FINAL OUTPUT
  // ===========================================
  const finalPrompt   = promptParts.filter(Boolean).join(", ");
  const finalNegative = negativeParts.filter(Boolean).join(", ");

  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v11.0 (ENHANCED)");
  console.log("═".repeat(60));
  console.log("📝 Input:", cleanPrompt);
  console.log("📦 Category:", categoryId, "/", subcategoryId);
  console.log("🎨 Style:", styleId, enableStyleMix ? `+ ${style2Id} (${style1Weight}%)` : "");
  console.log("🎨 Palette:", colorPaletteId || "auto");
  console.log("─".repeat(60));
  console.log("✅ PROMPT:", finalPrompt);
  console.log("❌ NEGATIVE:", finalNegative);
  console.log("═".repeat(60) + "\n");

  return {
    prompt:         finalPrompt,
    negativePrompt: finalNegative,
    model:          style.model,
    guidance:       style.guidance,
    steps:          style.steps,
  };
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

export function detectSlotGrid(): {
  hasSlots: boolean;
  slotCount: number;
  cols: number;
  rows: number;
  gridDescription: string;
} {
  return { hasSlots: false, slotCount: 0, cols: 0, rows: 0, gridDescription: "" };
}
