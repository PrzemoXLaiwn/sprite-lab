// ===========================================
// SPRITELAB - PROMPT BUILDER v12.0
// ===========================================
// CHANGE LOG v12.0 (from v11.0):
//
//   FIX 3 — Wire CATEGORY_PROMPT_CONFIGS into live builder.
//            objectType, visualDesc, composition, and avoid from
//            prompt-configs.ts are now used in every generation.
//            The weaker inline OBJECT_TYPES / PERSPECTIVES tables
//            are removed — prompt-configs.ts is the single source.
//
//   FIX 4 — STATUS_ICONS subtype supported end-to-end.
//            SKILL_ICONS, STATUS_ICONS, ITEM_ICONS, ICONS_UI now
//            receive icon-specific visualDesc in the positive prompt
//            ("flat symbolic icon, readable at small size, ...").
//
//   KEPT from v11.0:
//     — Prompt order: objectType → user prompt → style → composition
//     — Anti-embellishment negative block
//     — Per-category negative blocks
//     — Slimmer style tokens
//
// FINAL POSITIVE PROMPT ORDER:
//   1. config.objectType    (from prompt-configs.ts — anatomy identity)
//   2. userPrompt           (user's literal description)
//   3. config.visualDesc    (injected for UI_ELEMENTS subtypes only —
//                            provides icon visual language the user never writes)
//   4. stylePrompt          (rendering style, 4 tokens)
//   5. config.composition   (orientation / framing)
//   6. ISOLATION_PROMPT     (single object, transparent bg)
//
// FINAL NEGATIVE PROMPT ORDER:
//   1. NEGATIVE_CORE
//   2. NEGATIVE_EMBELLISHMENT
//   3. category block (WEAPONS / ARMOR / ICONS / ITEMS / CHARACTERS / ENV)
//   4. config.avoid         (from prompt-configs.ts — subtype-specific avoids)
//   5. style negatives

import type { BuildPromptResult, StyleConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";
import { CATEGORY_PROMPT_CONFIGS } from "../categories";

// ===========================================
// STYLE PROMPTS — short, 4-token anchors
// ===========================================
const STYLE_PROMPTS: Record<string, string> = {
  PIXEL_ART_16:     "pixel art, 16-bit style, visible square pixels, no anti-aliasing",
  PIXEL_ART_32:     "pixel art, 32-bit style, visible pixels, pixelated, no anti-aliasing",
  HAND_PAINTED:     "hand-painted digital art, visible brush strokes, painterly, Hollow Knight style",
  VECTOR_CLEAN:     "vector art, flat colors, clean smooth edges, mobile game style",
  ANIME_GAME:       "anime game art, cel shading, JRPG style, clean lineart",
  CHIBI_CUTE:       "chibi kawaii style, cute big head small body, soft pastel colors",
  CARTOON_WESTERN:  "western cartoon style, thick bold outlines, Cuphead rubber hose style",
  DARK_SOULS:       "dark fantasy art, gritty weathered, souls-like style, muted desaturated colors",
  ISOMETRIC:        "isometric 2.5D view, 26.57 degree angle, strategy game style",
  ISOMETRIC_PIXEL:  "pixel art isometric, 16-bit RTS style, visible pixels, isometric grid",
  ISOMETRIC_CARTOON:"isometric cartoon style, casual mobile game, colorful",
  REALISTIC_PAINTED:"digital painting, realistic rendering, AAA game concept art",
};

// ===========================================
// ISOLATION — always last in positive prompt
// ===========================================
const ISOLATION_PROMPT =
  "single object, centered, transparent background, complete not cropped";

// ===========================================
// NEGATIVE PROMPTS
// ===========================================

// Base — applies to everything
const NEGATIVE_CORE =
  "multiple objects, background, scenery, cropped, cut off, blurry, " +
  "watermark, text, signature, logo, frame border, game UI overlay";

// Anti-embellishment — blocks AI-added fantasy not written by the user
const NEGATIVE_EMBELLISHMENT =
  "magical glow added by AI, energy aura, fantasy embellishment not described, " +
  "glowing blade not requested, fire flames not requested, lightning not requested, " +
  "extra gems not mentioned, extra runes not mentioned, extra decorations not described, " +
  "magical sparkles not requested, enchantment effects not requested, " +
  "particle effects not described, light rays not requested";

// Category-specific blocks
const NEGATIVE_WEAPONS =
  "hand holding, hands gripping, person wielding, combat scene, battle, " +
  "scabbard, sheath, weapon stand, arm, fingers, " +
  "weapon sprite sheet, weapon collection, multiple weapons, weapon set, " +
  "glowing blade unless described, magical aura unless described, " +
  "fire on blade unless described, ice coating unless described, " +
  "runes unless described, enchanted glow unless described";

const NEGATIVE_ARMOR =
  "body inside, person wearing, mannequin, human form, skin, " +
  "face inside helmet, torso visible, character model";

const NEGATIVE_ICONS =
  // Core icon contamination: sheets, collections, backgrounds
  "icon collection, icon sheet, icon grid, multiple icons, icon set, icon pack, " +
  "background behind icon, drop shadow unless requested, " +
  "UI frame overlay, health bar, text label, tooltip, game HUD chrome, " +
  "frame around icon unless requested, border unless requested, " +
  // Illustration contamination: the main problem for status/skill icons
  "scene or illustration, landscape, environment, atmospheric lighting, " +
  "character in action, character casting spell, hands visible, spell caster, " +
  "3D depth shading, perspective receding, vanishing point, " +
  "multiple elements competing, busy composition, " +
  "realistic texture detail, photorealistic, " +
  // For status icons specifically: wrong object type
  "potion bottle as status icon, particle cloud as status icon, " +
  "creature as status icon, explosion as status icon";

const NEGATIVE_ITEMS =
  "magical aura unless described, glow effects unless specified, " +
  "multiple items, item collection, item set, extra bottles, extra copies, " +
  "placed on surface, table background, inventory context, shelf context";

const NEGATIVE_CHARACTERS =
  "background scene, environment landscape, room interior, outdoor scenery, " +
  "multiple characters, crowd, group, party, companion beside subject";

const NEGATIVE_ENVIRONMENT =
  "cropped building, cut off roof, partial structure, incomplete building, " +
  "building extends beyond frame, zoomed too close, close-up detail view";

// Style negatives
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
  CARTOON_WESTERN: "anime, realistic, pixel art, thin lines, soft shading",
  DARK_SOULS:    "bright colors, cartoon, cute, chibi, clean pristine, anime, vibrant, pastel",
  ISOMETRIC:     "perspective view, top-down flat, side view, realistic 3D, wrong angle",
  ISOMETRIC_PIXEL: "smooth gradients, perspective, realistic, soft edges, anti-aliasing",
  ISOMETRIC_CARTOON: "realistic, dark, pixel art, perspective, gritty",
  REALISTIC_PAINTED: "cartoon, pixel art, flat colors, anime, simple shapes",
};

// ===========================================
// ICON SUBTYPES — which UI_ELEMENTS subtypes
// get visualDesc injected (icon visual language)
// ===========================================
const ICON_SUBTYPES = new Set([
  "SKILL_ICONS",
  "STATUS_ICONS",
  "ITEM_ICONS",
  "ICONS_UI",
]);

// ===========================================
// MAIN FUNCTION — buildUltimatePrompt
// ===========================================
export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const stylePrompt   = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  const styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  // Pull the rich per-subcategory config
  const config = CATEGORY_PROMPT_CONFIGS[categoryId]?.[subcategoryId];

  const cleanPrompt = userPrompt.trim();

  // Whether to inject visualDesc in the positive prompt.
  // For icon subtypes: YES — the user writes "poison icon" (2 words) and
  // the model needs visual language framing it cannot infer from that alone.
  // For weapons/items/characters: NO — the user's description already
  // specifies what the object looks like, and visualDesc would bloat/override.
  const isIconSubtype =
    categoryId === "UI_ELEMENTS" && ICON_SUBTYPES.has(subcategoryId);

  // ===========================================
  // BUILD POSITIVE PROMPT
  // Order: objectType → userPrompt → [visualDesc for icons] →
  //        style → composition → isolation
  // ===========================================
  const promptParts: string[] = [];

  // 1. Object anchor — anatomy / type identity
  if (config?.objectType) {
    promptParts.push(config.objectType);
  }

  // 2. User's literal description
  if (cleanPrompt) {
    promptParts.push(cleanPrompt);
  }

  // 3. Visual descriptor — icons only
  //    Provides "flat symbolic icon, readable at small size" framing
  //    that the user never writes themselves
  if (isIconSubtype && config?.visualDesc) {
    promptParts.push(config.visualDesc);
  }

  // 4. Style rendering rules
  promptParts.push(stylePrompt);

  // 5. Composition / framing
  if (config?.composition) {
    promptParts.push(config.composition);
  }

  // 6. Isolation
  promptParts.push(ISOLATION_PROMPT);

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // Order: core → embellishment → category block →
  //        config.avoid → style negatives
  // ===========================================
  const negativeParts: string[] = [NEGATIVE_CORE, NEGATIVE_EMBELLISHMENT];

  if (categoryId === "WEAPONS") {
    negativeParts.push(NEGATIVE_WEAPONS);
  } else if (categoryId === "ARMOR") {
    negativeParts.push(NEGATIVE_ARMOR);
  } else if (categoryId === "UI_ELEMENTS") {
    negativeParts.push(NEGATIVE_ICONS);
  } else if (
    categoryId === "CONSUMABLES" ||
    categoryId === "RESOURCES" ||
    categoryId === "QUEST_ITEMS"
  ) {
    negativeParts.push(NEGATIVE_ITEMS);
  } else if (categoryId === "CHARACTERS" || categoryId === "CREATURES") {
    negativeParts.push(NEGATIVE_CHARACTERS);
  } else if (categoryId === "ENVIRONMENT") {
    negativeParts.push(NEGATIVE_ENVIRONMENT);
  }

  // Subtype-specific avoid list from prompt-configs.ts
  if (config?.avoid) {
    negativeParts.push(config.avoid);
  }

  // Style negatives
  if (styleNegative) {
    negativeParts.push(styleNegative);
  }

  // ===========================================
  // FINAL OUTPUT
  // ===========================================
  const finalPrompt   = promptParts.filter(Boolean).join(", ");
  const finalNegative = negativeParts.filter(Boolean).join(", ");

  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v12.0");
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
  let stylePrompt   = STYLE_PROMPTS[styleId] || STYLE_PROMPTS.PIXEL_ART_16;
  let styleNegative = style.negatives || STYLE_NEGATIVES[styleId] || "";

  const config = CATEGORY_PROMPT_CONFIGS[categoryId]?.[subcategoryId];

  const isIconSubtype =
    categoryId === "UI_ELEMENTS" && ICON_SUBTYPES.has(subcategoryId);

  // ===========================================
  // STYLE MIXING
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
  // COLOR PALETTE
  // ===========================================
  const COLOR_PALETTE_PROMPTS: Record<string, string> = {
    FANTASY_GOLD:   "golden yellow, royal purple, rich brown color palette",
    FOREST_GREEN:   "forest green, earth brown, natural color palette",
    ICE_BLUE:       "ice blue, frost white, cool cyan color palette",
    FIRE_RED:       "fire red, burning orange, molten gold color palette",
    DARK_SOULS:     "dark muted, desaturated brown, gritty gray color palette",
    NEON_CYBER:     "neon pink, electric cyan, purple glow color palette",
    PASTEL_DREAM:   "soft pastel, gentle pink, light blue color palette",
    OCEAN_DEEP:     "deep ocean blue, teal, aquamarine color palette",
    AUTUMN_HARVEST: "autumn orange, harvest brown, warm amber color palette",
    MONO_BW:        "black and white, grayscale, monochrome",
    RETRO_GAMEBOY:  "game boy green, 4-color palette, retro handheld",
    SUNSET_WARM:    "sunset orange, warm pink, golden yellow color palette",
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

  if (config?.objectType)                      promptParts.push(config.objectType);
  if (cleanPrompt)                             promptParts.push(cleanPrompt);
  if (isIconSubtype && config?.visualDesc)     promptParts.push(config.visualDesc);
  promptParts.push(stylePrompt);
  if (colorPrompt)                             promptParts.push(colorPrompt);
  if (config?.composition)                     promptParts.push(config.composition);
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
  } else if (
    categoryId === "CONSUMABLES" ||
    categoryId === "RESOURCES" ||
    categoryId === "QUEST_ITEMS"
  ) {
    negativeParts.push(NEGATIVE_ITEMS);
  } else if (categoryId === "CHARACTERS" || categoryId === "CREATURES") {
    negativeParts.push(NEGATIVE_CHARACTERS);
  } else if (categoryId === "ENVIRONMENT") {
    negativeParts.push(NEGATIVE_ENVIRONMENT);
  }

  if (config?.avoid)     negativeParts.push(config.avoid);
  if (styleNegative)     negativeParts.push(styleNegative);

  // ===========================================
  // FINAL OUTPUT
  // ===========================================
  const finalPrompt   = promptParts.filter(Boolean).join(", ");
  const finalNegative = negativeParts.filter(Boolean).join(", ");

  console.log("\n" + "═".repeat(60));
  console.log("🎮 PROMPT BUILDER v12.0 (ENHANCED)");
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
// HELPER EXPORTS — signatures unchanged
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
