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
// PERSPECTIVES - Optimal angles for game assets
// ===========================================
// Each perspective is optimized for game UI/inventory display
const PERSPECTIVES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS: "side profile view, horizontal orientation, complete blade from pommel to tip, clean silhouette",
    AXES: "side profile view, diagonal 45-degree angle, axe head and full handle visible, dynamic pose",
    POLEARMS: "slight diagonal view, full weapon length visible, spear tip prominent",
    BOWS: "front 3/4 view, bow curve and string clearly visible, arrow nocked optional",
    STAFFS: "vertical orientation, full staff visible, magical orb or crystal at top glowing",
    GUNS: "side profile view, horizontal, complete firearm from barrel to stock",
    THROWING: "front view flat, complete throwing weapon shape, balanced composition",
  },
  ARMOR: {
    HELMETS: "front 3/4 view, empty helmet floating, visor or face opening visible, no head inside",
    CHEST_ARMOR: "front view, armor piece only floating, no body inside, straps visible",
    SHIELDS: "front view, flat facing viewer, emblem and design clearly visible, handle on back",
    GLOVES: "3/4 view, single gauntlet or pair, no hands inside, floating",
    BOOTS: "side 3/4 view, single boot or pair, no feet inside, floating",
    ACCESSORIES: "front view, jewelry or accessory clearly visible, centered",
  },
  CONSUMABLES: {
    POTIONS: "front 3/4 view, glass bottle with liquid visible, cork or stopper, slight glow",
    FOOD: "3/4 view from above, appetizing presentation, fresh appearance",
    SCROLLS: "3/4 view, rolled parchment, magical seal or ribbon visible",
  },
  RESOURCES: {
    GEMS: "front view, crystal facets catching light, inner glow, sparkling",
    ORES: "3/4 view, raw ore chunk, crystalline structure visible, rough edges",
    WOOD_STONE: "3/4 view, raw material stack or piece, natural texture",
    PLANTS: "front view, complete plant or herb bundle, leaves and stems visible",
    MONSTER_PARTS: "3/4 view, trophy item, detailed texture, preserved",
    MAGIC_MATERIALS: "front view, ethereal glow, magical energy emanating",
  },
  CHARACTERS: {
    HEROES: "front 3/4 view, full body head to toe, heroic confident pose, standing",
    ENEMIES: "front 3/4 view, full body visible, menacing aggressive pose",
    NPCS: "front 3/4 view, full body, neutral friendly pose, approachable",
    BOSSES: "front view, full imposing body, powerful stance, intimidating",
  },
  CREATURES: {
    ANIMALS: "side 3/4 view, full body including tail, natural pose",
    MYTHICAL: "front 3/4 view, full majestic body, wings or features spread",
    PETS: "front view, full cute body, friendly playful pose",
    ELEMENTALS: "front view, full ethereal form, elemental energy visible",
  },
  // ENVIRONMENT - buildings, trees, props etc - MUST show complete structure with MARGIN
  ENVIRONMENT: {
    TREES: "front view, COMPLETE tree from ground roots to tree crown top, full trunk and all branches visible, entire tree fits in frame with space around it, zoomed out enough to show whole tree",
    PLANTS: "front view, complete plant visible from base to top, full foliage, entire plant in frame",
    ROCKS_TERRAIN: "front 3/4 view, complete rock formation visible, full structure from base to top",
    BUILDINGS: "front 3/4 view, COMPLETE BUILDING showing entire structure from ground foundation to chimney top, ZOOMED OUT to fit whole building with margin around edges, all walls visible, full roof visible, nothing cut off, small building centered in frame with empty space around it",
    PROPS: "front 3/4 view, complete prop object, full item visible with margin",
    ISO_BUILDINGS: "isometric 45-degree view, COMPLETE building from base foundation to roof top, zoomed out to show entire structure, full isometric building centered with margin",
    ISO_TERRAIN: "isometric 45-degree view, complete terrain piece, full tile visible",
    CONTAINERS: "front 3/4 view, complete container object, lid and body visible, full item",
  },
  // QUEST_ITEMS
  QUEST_ITEMS: {
    KEYS: "front view, complete key shape, handle and teeth visible",
    ARTIFACTS: "front 3/4 view, complete artifact, mystical glow",
    CHESTS: "front 3/4 view, complete chest with lid, decorative details",
    COLLECTIBLES: "front view, complete collectible item, shiny",
    MAPS: "front view flat, complete map or scroll, aged paper texture",
  },
};

// ===========================================
// OBJECT DESCRIPTIONS - Game asset object types
// ===========================================
// Detailed descriptions help AI understand what to generate
const OBJECT_TYPES: Record<string, Record<string, string>> = {
  WEAPONS: {
    SWORDS: "fantasy sword weapon, detailed blade with guard and pommel, game item",
    AXES: "battle axe weapon, curved blade head on wooden or metal handle, game item",
    POLEARMS: "polearm weapon like spear halberd or lance, long shaft with pointed or bladed tip",
    BOWS: "archery bow weapon, curved wooden or composite bow with taut string",
    STAFFS: "magical wizard staff, wooden or metal shaft with glowing crystal orb or gem at top",
    GUNS: "firearm weapon, detailed gun with barrel grip and trigger mechanism",
    THROWING: "throwing weapon like shuriken dagger or throwing star, balanced for throwing",
  },
  ARMOR: {
    HELMETS: "fantasy helmet headgear, protective head armor piece, empty equipment item not worn",
    CHEST_ARMOR: "chest armor piece like breastplate or chainmail, torso protection, empty equipment",
    SHIELDS: "defensive shield, round or kite shaped, with emblem or pattern design",
    GLOVES: "armored gauntlets or gloves, hand protection gear, empty equipment item",
    BOOTS: "armored boots or footwear, protective leg and foot gear, empty equipment",
    ACCESSORIES: "armor accessory like pauldrons belt or bracers, equipment piece",
  },
  CONSUMABLES: {
    POTIONS: "magic potion in glass bottle or vial, colored liquid with cork stopper",
    FOOD: "fantasy food item, cooked meal or ingredient, appetizing game item",
    SCROLLS: "magic scroll, rolled parchment with mystical writing, tied with ribbon or seal",
  },
  RESOURCES: {
    GEMS: "precious gemstone crystal, faceted jewel with inner glow, crafting material",
    ORES: "raw ore chunk, unrefined mineral with crystalline structure, mining material",
    WOOD_STONE: "raw crafting material, wood logs planks or stone blocks",
    PLANTS: "magical herb or plant, fantasy flora with special properties, alchemy ingredient",
    MONSTER_PARTS: "monster drop item, creature trophy like fang claw scale or horn",
    MAGIC_MATERIALS: "magical crafting material, enchanted essence or elemental fragment",
  },
  CHARACTERS: {
    HEROES: "hero character sprite, adventurer or protagonist, full body game character",
    ENEMIES: "enemy character sprite, hostile creature or villain, full body game character",
    NPCS: "NPC character sprite, friendly townsperson or quest giver, full body character",
    BOSSES: "boss enemy character, large powerful antagonist, imposing game character",
  },
  CREATURES: {
    ANIMALS: "fantasy animal creature, realistic or stylized beast, game creature",
    MYTHICAL: "mythical creature like dragon griffin or phoenix, legendary beast",
    PETS: "cute pet companion creature, friendly animal sidekick, adorable game creature",
    ELEMENTALS: "elemental being, creature made of fire water earth or air energy",
  },
  // ENVIRONMENT - complete structures, MUST show entire object with margin!
  ENVIRONMENT: {
    TREES: "complete fantasy tree, full trunk from ground base to treetop crown with all branches and leaves, entire tree visible, game environment asset, tree fits in frame",
    PLANTS: "complete plant or vegetation, full foliage visible from root to top, game environment prop",
    ROCKS_TERRAIN: "complete rock formation or terrain piece, full structure visible, game environment asset",
    BUILDINGS: "COMPLETE small fantasy building, entire structure from stone foundation to roof chimney, small cottage or house FULLY VISIBLE, building is SMALL in frame with empty space around it, like a game icon, NOT zoomed in, game environment asset building sprite",
    PROPS: "complete environment prop object, full item visible with space around it, game decoration asset",
    ISO_BUILDINGS: "complete isometric building tile, full structure from base to roof in isometric view, entire building visible, game tile asset",
    ISO_TERRAIN: "complete isometric terrain tile, full piece visible, isometric game asset",
    CONTAINERS: "complete container object like barrel crate or chest, full item with lid, entire object visible",
  },
  // QUEST_ITEMS
  QUEST_ITEMS: {
    KEYS: "fantasy key, ornate design, complete key shape, game item",
    ARTIFACTS: "magical artifact, ancient relic, glowing mysterious object, game quest item",
    CHESTS: "treasure chest, wooden with metal bands, complete chest shape, game item",
    COLLECTIBLES: "collectible game item, shiny valuable object, complete item",
    MAPS: "treasure map or ancient scroll, complete document, game item",
  },
};

// ===========================================
// STYLE PROMPTS - Visual rendering style
// ===========================================
// 🔥 CRITICAL: For pixel art, MUST include:
// 1. "pixel art" FIRST
// 2. Resolution/grid constraints
// 3. "visible pixels" / "pixelated" / "no anti-aliasing"
// 4. Retro game reference for style anchoring
const STYLE_PROMPTS: Record<string, string> = {
  // PIXEL ART - STRONG ENFORCEMENT! Must look like actual pixels!
  PIXEL_ART_16: "pixel art sprite, 16x16 pixel grid, visible square pixels, pixelated retro game sprite, 16-bit SNES style, no anti-aliasing, blocky pixels, limited color palette, crisp pixel edges",
  PIXEL_ART_32: "pixel art sprite, 32x32 pixel grid, visible pixels, pixelated indie game sprite, Celeste style pixel art, no anti-aliasing, crisp pixel edges, limited colors",
  // Other styles
  HAND_PAINTED: "hand-painted digital art, visible brush strokes, painterly style like Hollow Knight, artistic texture",
  VECTOR_CLEAN: "vector art, flat colors, clean edges, mobile game style, geometric shapes",
  ANIME_GAME: "anime game art, cel shading, JRPG style, clean lineart, vibrant colors",
  CHIBI_CUTE: "chibi kawaii style, cute big head small body, adorable, soft colors",
  CARTOON_WESTERN: "cartoon style, thick bold outlines, Cuphead rubber hose style, exaggerated shapes",
  DARK_SOULS: "dark fantasy art, gritty weathered, souls-like FromSoftware style, muted desaturated colors",
  ISOMETRIC: "isometric 2.5D view, 26.57 degree angle, strategy game style, clean cel shaded",
  ISOMETRIC_PIXEL: "pixel art isometric sprite, 16-bit RTS style, visible pixels, isometric pixel grid, no anti-aliasing",
  ISOMETRIC_CARTOON: "isometric cartoon style, casual mobile game, colorful friendly",
  REALISTIC_PAINTED: "digital painting, concept art style, realistic rendering, AAA game quality",
};

// ===========================================
// ISOLATION - Clean game asset presentation
// ===========================================
// SIMPLE is better! Research shows short prompts work best
const ISOLATION_PROMPT = "single sprite, centered, transparent background, complete object, not cropped";

// ===========================================
// NEGATIVE PROMPTS - Prevents common issues
// ===========================================
// Keep it SHORT - too many negatives confuse the model
const NEGATIVE_CORE = "multiple objects, background, scenery, cropped, cut off, blurry, watermark, text";

// Weapons should be standalone, not held or stored
const NEGATIVE_WEAPONS = "scabbard, sheath, holder, stand, hand holding, person wielding, combat scene, arm, hand, fingers gripping, battle";

// Armor should be empty equipment pieces, not worn
const NEGATIVE_ARMOR = "body inside, person wearing, mannequin, human form, skin visible, face inside helmet, body parts, worn on body";

// Environment/Buildings - MUST be complete, not cropped, show ENTIRE structure
const NEGATIVE_ENVIRONMENT = "cropped building, cut off roof, cut off foundation, partial structure, incomplete building, edge cropping, zoomed in too close, building extends beyond frame, roof cut off at top, walls cut off at sides, chimney cut off, building too large for frame, close-up view, macro shot, detailed close-up, partial view";

const STYLE_NEGATIVES: Record<string, string> = {
  // PIXEL ART negatives - AGGRESSIVE blocking of smooth/realistic rendering!
  PIXEL_ART_16: "smooth, anti-aliasing, realistic, 3D render, photograph, photorealistic, soft edges, blended colors, smooth shading, airbrushed, painted, high resolution, 4K, 8K, hyperrealistic, smooth textures, soft gradients, detailed, HD, ultra detailed, fine details, smooth lines, vector art, clean edges, polished",
  PIXEL_ART_32: "smooth, anti-aliasing, realistic, 3D render, photorealistic, soft edges, blended colors, smooth shading, airbrushed, painted, high resolution, 4K, HD, soft gradients, vector art, clean smooth edges",
  HAND_PAINTED: "pixel art, vector, flat colors, 3D render, pixelated, smooth digital",
  VECTOR_CLEAN: "textured, painterly, pixel art, realistic, detailed shading, pixelated",
  ANIME_GAME: "western cartoon, realistic, pixel art, pixelated, 3D render",
  CHIBI_CUTE: "realistic proportions, dark, scary, detailed anatomy, mature",
  CARTOON_WESTERN: "anime, realistic, pixel art, thin lines, soft shading, pixelated",
  DARK_SOULS: "bright colors, cartoon, cute, chibi, colorful, happy, vibrant",
  ISOMETRIC: "perspective view, top-down flat, side view, realistic 3D, wrong angle",
  ISOMETRIC_PIXEL: "smooth gradients, perspective, realistic, soft edges, anti-aliasing, smooth",
  ISOMETRIC_CARTOON: "realistic, dark, pixel art, perspective, gritty, pixelated",
  REALISTIC_PAINTED: "cartoon, pixel art, flat colors, anime, pixelated, simple",
};

// ===========================================
// MAIN FUNCTION - buildUltimatePrompt
// ===========================================
// RESEARCH KEY FINDING: For pixel art, style MUST be FIRST in prompt!
// Source: https://civitai.com/models/277680/pixel-art-diffusion-xl
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;

  // Check if this is a pixel art style (needs special handling)
  const isPixelArt = styleId.includes("PIXEL");

  // Use simple STYLE_PROMPTS - research shows SHORT prompts work better!
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;

  // Use detailed negatives from style config if available
  const styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  // For pixel art: skip complex perspective/objectType - keep it SIMPLE
  const perspective = isPixelArt ? "" : (PERSPECTIVES[categoryId]?.[subcategoryId] || "");
  const objectType = isPixelArt ? "" : (OBJECT_TYPES[categoryId]?.[subcategoryId] || "");

  // Clean user input
  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD POSITIVE PROMPT
  // ===========================================
  // CRITICAL: For pixel art, STYLE must be FIRST!
  const promptParts: string[] = [];

  if (isPixelArt) {
    // PIXEL ART ORDER: Style → User description → Simple isolation
    // "pixel art" MUST be first word for best results!
    promptParts.push(stylePrompt);
    if (cleanPrompt) {
      promptParts.push(cleanPrompt);
    }
    promptParts.push(ISOLATION_PROMPT);
  } else {
    // OTHER STYLES: User description → Object type → Perspective → Style → Isolation
    if (cleanPrompt) {
      promptParts.push(cleanPrompt);
    }
    if (objectType) {
      promptParts.push(objectType);
    }
    if (perspective) {
      promptParts.push(perspective);
    }
    promptParts.push(stylePrompt);
    promptParts.push(ISOLATION_PROMPT);
  }

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE];

  // Category-specific negatives
  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
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
// COLOR PALETTE PROMPTS (matching IDs from premium-features.ts)
// ===========================================
const COLOR_PALETTE_PROMPTS: Record<string, string> = {
  // From premium-features.ts COLOR_PALETTES
  FANTASY_GOLD: "golden yellow, royal purple, rich brown color palette, fantasy medieval colors",
  FOREST_GREEN: "forest green, earth brown, natural color palette, woodland colors",
  ICE_BLUE: "ice blue, frost white, cool cyan color palette, frozen arctic colors",
  FIRE_RED: "fire red, burning orange, molten gold color palette, flame inferno colors",
  DARK_SOULS: "dark muted, desaturated brown, gritty gray color palette, souls-like dark colors",
  NEON_CYBER: "neon pink, electric cyan, purple glow color palette, cyberpunk neon colors",
  PASTEL_DREAM: "soft pastel, gentle pink, light blue color palette, dreamy kawaii colors",
  OCEAN_DEEP: "deep ocean blue, teal, aquamarine color palette, underwater sea colors",
  AUTUMN_HARVEST: "autumn orange, harvest brown, warm amber color palette, fall season colors",
  MONO_BW: "black and white, grayscale, monochrome color palette, no color",
  RETRO_GAMEBOY: "game boy green, 4-color palette, retro handheld, classic green LCD colors",
  SUNSET_WARM: "sunset orange, warm pink, golden yellow color palette, evening sky colors",
};

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

  // Get base style
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;

  // Check if this is a pixel art style
  const isPixelArt = styleId.includes("PIXEL");

  // Use simple STYLE_PROMPTS - research shows SHORT prompts work better!
  let stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;

  // Use detailed negatives from style config if available
  let styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  // For pixel art: skip complex perspective/objectType - keep it SIMPLE
  const perspective = isPixelArt ? "" : (PERSPECTIVES[categoryId]?.[subcategoryId] || "");
  const objectType = isPixelArt ? "" : (OBJECT_TYPES[categoryId]?.[subcategoryId] || "");

  // ===========================================
  // STYLE MIXING (blend two styles)
  // ===========================================
  if (enableStyleMix && style2Id && style2Id !== styleId) {
    const style2Prompt = STYLE_PROMPTS[style2Id] || "";
    const style2Negative = STYLE_NEGATIVES[style2Id] || "";

    if (style2Prompt) {
      // Blend prompts based on weight
      // Higher weight = more of style 1
      if (style1Weight >= 70) {
        // Mostly style 1, hint of style 2
        stylePrompt = `${stylePrompt}, with subtle ${style2Prompt.split(",")[0]} influence`;
      } else if (style1Weight <= 30) {
        // Mostly style 2, hint of style 1
        stylePrompt = `${style2Prompt}, with subtle ${stylePrompt.split(",")[0]} influence`;
      } else {
        // Balanced mix
        stylePrompt = `hybrid style blending ${stylePrompt.split(",")[0]} with ${style2Prompt.split(",")[0]}, mixed art style`;
      }

      // Combine negatives (avoid conflicts)
      styleNegative = `${styleNegative}, ${style2Negative}`.replace(/,\s*,/g, ",");
    }
  }

  // ===========================================
  // COLOR PALETTE LOCK
  // ===========================================
  let colorPrompt = "";
  if (colorPaletteId && COLOR_PALETTE_PROMPTS[colorPaletteId]) {
    colorPrompt = COLOR_PALETTE_PROMPTS[colorPaletteId];
  }

  // Clean user input
  const cleanPrompt = userPrompt.trim();

  // ===========================================
  // BUILD POSITIVE PROMPT
  // ===========================================
  // CRITICAL: For pixel art, STYLE must be FIRST!
  const promptParts: string[] = [];

  if (isPixelArt) {
    // PIXEL ART ORDER: Style → User description → Color → Isolation
    promptParts.push(stylePrompt);
    if (cleanPrompt) {
      promptParts.push(cleanPrompt);
    }
    if (colorPrompt) {
      promptParts.push(colorPrompt);
    }
    promptParts.push(ISOLATION_PROMPT);
  } else {
    // OTHER STYLES: User description → Object type → Perspective → Style → Color → Isolation
    if (cleanPrompt) {
      promptParts.push(cleanPrompt);
    }
    if (objectType) {
      promptParts.push(objectType);
    }
    if (perspective) {
      promptParts.push(perspective);
    }
    promptParts.push(stylePrompt);
    if (colorPrompt) {
      promptParts.push(colorPrompt);
    }
    promptParts.push(ISOLATION_PROMPT);
  }

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE];

  // Category-specific negatives
  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
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
  const finalPrompt = promptParts.join(", ");
  const finalNegative = negativeParts.join(", ");

  // Log for debugging
  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v10.0 (ENHANCED)");
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
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    model: style.model,
    guidance: style.guidance,
    steps: style.steps,
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

export function detectSlotGrid(): { hasSlots: boolean; slotCount: number; cols: number; rows: number; gridDescription: string } {
  return { hasSlots: false, slotCount: 0, cols: 0, rows: 0, gridDescription: "" };
}
