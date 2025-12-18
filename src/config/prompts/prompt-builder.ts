// ===========================================
// SPRITELAB - PROMPT BUILDER v5.0
// ===========================================
// USER PROMPT IS KING - system adds style and weapon context
// Category adds WHAT the weapon looks like (sword = blade + hilt)
// Style adds HOW it's rendered (pixel art, anime, etc.)

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";

// ===========================================
// WEAPON DESCRIPTIONS - What each weapon IS
// ===========================================
const WEAPON_CONTEXT: Record<string, string> = {
  // SWORDS - klasyczny miecz fantasy
  SWORDS: "medieval fantasy sword with metal blade, crossguard, wrapped handle, pommel",

  // AXES - klasyczny topór bojowy
  AXES: "battle axe with metal axe head, sharp blade edge, wooden handle shaft",

  // POLEARMS - włócznia z grotem
  POLEARMS: "spear with long wooden shaft, metal spearhead point at the end",

  // BOWS - łuk bez strzały
  BOWS: "wooden bow with curved limbs, taut bowstring, no arrow",

  // STAFFS - magiczna laska z kryształem
  STAFFS: "wizard staff with wooden shaft, magical crystal orb on top, mystical glow",

  // GUNS - realistyczna broń palna
  GUNS: "firearm gun with barrel, trigger, grip handle, realistic military style",

  // THROWING - shuriken/kunai ninja
  THROWING: "ninja throwing weapon, shuriken star or kunai knife, sharp metal",
};

// ===========================================
// OTHER CATEGORY CONTEXT
// ===========================================
const CATEGORY_CONTEXT: Record<string, Record<string, string>> = {
  ARMOR: {
    HELMETS: "helmet armor piece, protective headgear, empty inside (no head)",
    CHEST_ARMOR: "chest armor breastplate, torso protection, empty (no body inside)",
    SHIELDS: "shield, defensive equipment, front view",
    GLOVES: "gauntlet gloves, hand armor, empty (no hands inside)",
    BOOTS: "armored boots, foot protection, empty (no feet inside)",
    ACCESSORIES: "armor accessory, belt cape ring amulet",
  },
  CONSUMABLES: {
    POTIONS: "potion bottle, glass flask with colored liquid, cork stopper",
    FOOD: "food item, edible, appetizing",
    SCROLLS: "magic scroll, rolled parchment, wax seal",
  },
  RESOURCES: {
    GEMS: "gemstone, cut precious gem, faceted crystal",
    ORES: "ore chunk, raw mineral, metallic veins in rock",
    WOOD_STONE: "raw material, wood log or stone chunk",
    PLANTS: "magical herb plant, glowing leaves",
    MONSTER_PARTS: "monster drop, creature part like scale fang claw",
    MAGIC_MATERIALS: "magical essence, glowing orb or crystal",
  },
  CHARACTERS: {
    HEROES: "hero character, full body, adventurer",
    ENEMIES: "enemy character, full body, hostile",
    NPCS: "NPC character, full body, friendly",
    BOSSES: "boss enemy, large imposing, powerful",
  },
  CREATURES: {
    ANIMALS: "animal creature, full body",
    MYTHICAL: "mythical beast, dragon phoenix unicorn",
    PETS: "cute pet companion, small friendly",
    ELEMENTALS: "elemental being, made of fire water earth air",
  },
};

// ===========================================
// STYLE RENDERING - How it LOOKS
// ===========================================
const STYLE_PROMPTS: Record<string, string> = {
  PIXEL_ART_16: "16-bit pixel art, visible square pixels, retro SNES style, limited color palette",
  PIXEL_ART_32: "32-bit HD pixel art, detailed pixels, modern indie game style",
  HAND_PAINTED: "hand painted digital art, visible brush strokes, painterly style",
  VECTOR_CLEAN: "clean vector art, flat colors, smooth edges, mobile game style",
  ANIME_GAME: "anime game art, cel shading, JRPG style, clean lines",
  CHIBI_CUTE: "chibi kawaii style, cute big head small body, adorable",
  CARTOON_WESTERN: "western cartoon style, bold outlines, Cuphead aesthetic",
  DARK_SOULS: "dark fantasy style, gritty weathered, souls-like aesthetic, muted colors",
  ISOMETRIC: "isometric 2.5D view, 26.57 degree angle, strategy game style",
  ISOMETRIC_PIXEL: "isometric pixel art, retro RTS style, visible pixels",
  ISOMETRIC_CARTOON: "isometric cartoon style, colorful casual game",
  REALISTIC_PAINTED: "realistic digital painting, AAA game concept art quality",
};

// ===========================================
// NEGATIVE PROMPTS
// ===========================================
const CORE_NEGATIVES = "multiple objects, many items, sprite sheet, grid, collection, blurry, low quality, watermark, text, signature, background, scenery";

const STYLE_NEGATIVES: Record<string, string> = {
  PIXEL_ART_16: "smooth gradients, anti-aliasing, realistic, 3D render, photograph, soft edges",
  PIXEL_ART_32: "smooth gradients, anti-aliasing, realistic, 3D render, soft edges",
  HAND_PAINTED: "pixel art, vector art, flat colors, 3D render, sharp edges",
  VECTOR_CLEAN: "textured, painterly, pixel art, realistic, rough edges",
  ANIME_GAME: "western cartoon, realistic, pixel art, 3D render",
  CHIBI_CUTE: "realistic proportions, dark, scary, mature, detailed",
  CARTOON_WESTERN: "anime, realistic, pixel art, subtle, thin lines",
  DARK_SOULS: "bright colors, cartoon, cute, chibi, clean, colorful",
  ISOMETRIC: "perspective view, top-down flat, side view, realistic 3D",
  ISOMETRIC_PIXEL: "smooth gradients, perspective view, realistic, soft",
  ISOMETRIC_CARTOON: "realistic, dark, pixel art, perspective view",
  REALISTIC_PAINTED: "cartoon, pixel art, flat colors, anime, simple",
};

const WEAPON_NEGATIVES = "multiple weapons, weapon collection, sprite sheet, hand holding, person wielding, combat scene, broken";
const ARMOR_NEGATIVES = "body inside, person wearing, human form, mannequin, skin visible";

// ===========================================
// MAIN FUNCTION
// ===========================================
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const stylePrompt = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  const styleNegative = STYLE_NEGATIVES[styleId] || "";

  const cleanPrompt = userPrompt.trim();
  const promptParts: string[] = [];
  const negativeParts: string[] = [CORE_NEGATIVES];

  // 1. USER PROMPT FIRST - what they asked for
  promptParts.push(cleanPrompt);

  // 2. Add WEAPON context if it's a weapon
  if (categoryId === "WEAPONS" && WEAPON_CONTEXT[subcategoryId]) {
    promptParts.push(WEAPON_CONTEXT[subcategoryId]);
    negativeParts.push(WEAPON_NEGATIVES);
  }
  // 3. Add other category context
  else if (CATEGORY_CONTEXT[categoryId]?.[subcategoryId]) {
    promptParts.push(CATEGORY_CONTEXT[categoryId][subcategoryId]);
    if (categoryId === "ARMOR") {
      negativeParts.push(ARMOR_NEGATIVES);
    }
  }

  // 4. Add STYLE - how it's rendered
  promptParts.push(stylePrompt);

  // 5. Add isolation keywords
  promptParts.push("single isolated object");
  promptParts.push("centered on transparent background");
  promptParts.push("game asset icon");

  // 6. Style-specific negatives
  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  const finalPrompt = promptParts.join(", ");
  const finalNegative = negativeParts.join(", ");

  // Logging
  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v5.0");
  console.log("═".repeat(60));
  console.log("📝 User wants:", cleanPrompt);
  console.log("📦 Category:", categoryId, "/", subcategoryId);
  console.log("🎨 Style:", style.name);
  console.log("─".repeat(60));
  console.log("✅ FINAL:", finalPrompt);
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
// ENHANCED PROMPT - DISABLED FOR NOW
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
  // Premium features disabled - use simple builder
  console.log("[EnhancedPrompt] Premium features temporarily disabled");
  return buildUltimatePrompt(userPrompt, categoryId, subcategoryId, styleId);
}

// ===========================================
// HELPER EXPORTS
// ===========================================
export function isIsometricMode(
  categoryId: string,
  subcategoryId: string,
  styleId: string
): boolean {
  if (categoryId === "ISOMETRIC") return true;
  if (styleId.startsWith("ISOMETRIC")) return true;
  if (subcategoryId.startsWith("ISO_")) return true;
  return false;
}

export function extractKeyDescriptors(userPrompt: string): string[] {
  return userPrompt.split(/\s+/).filter(w => w.length > 3).slice(0, 5);
}

export function detectSlotGrid(_userPrompt: string, _subcategoryId: string): { hasSlots: boolean; slotCount: number; cols: number; rows: number; gridDescription: string } {
  return { hasSlots: false, slotCount: 0, cols: 0, rows: 0, gridDescription: "" };
}
