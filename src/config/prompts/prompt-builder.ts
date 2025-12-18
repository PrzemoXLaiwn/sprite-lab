// ===========================================
// SPRITELAB CONFIG - PROMPT BUILDER (PRO v3.0)
// ===========================================
// PROFESSIONAL GAME-DEV QUALITY UPDATE:
// - PRO_QUALITY_BOOST for game-ready assets
// - Optimized for FLUX-dev with lower guidance
// - Stronger style enforcement with weighted prompts
// - Smart slot/grid detection for UI elements
// - Better prompt structure with style at BEGINNING and END
// - Pixel art specific handling to prevent smooth output
// - Industry-standard quality keywords

import type { BuildPromptResult, StyleConfig, SubcategoryPromptConfig } from "../types";
import { STYLES_2D_FULL, PRO_QUALITY_BOOST } from "../styles";
import { CATEGORY_PROMPT_CONFIGS, CATEGORY_BASE_DESCRIPTIONS } from "../categories";
import { buildCompleteNegativePrompt, ISOMETRIC_BOOST } from "./negative-prompts";

// ===========================================
// KEYWORD EXTRACTOR
// ===========================================
function extractKeyDescriptors(userPrompt: string): string[] {
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "i", "me", "my", "we", "our", "you", "your", "he", "him", "his",
    "she", "her", "it", "its", "they", "them", "their", "this", "that",
    "make", "made", "want", "like", "just", "very", "really", "please",
    "sprite", "game", "asset", "image", "picture", "create", "generate",
  ]);

  const importantPatterns = [
    /\b(red|blue|green|yellow|orange|purple|pink|black|white|gold|silver|bronze|copper|dark|light|bright|neon|glowing|shiny|metallic|rusty|bloody|fiery|icy|frozen|crystal|emerald|ruby|sapphire|diamond)\b/gi,
    /\b(wooden|wood|metal|steel|iron|stone|rock|leather|cloth|silk|bone|crystal|glass|diamond|gold|silver|bronze|copper|obsidian|mythril|adamantine)\b/gi,
    /\b(ancient|medieval|futuristic|sci-fi|fantasy|magical|enchanted|cursed|holy|demonic|angelic|divine|dark|evil|corrupted|blessed|legendary|epic|rare|common|unique|ornate|simple|elegant|crude|refined|polished|rough|smooth|jagged|twisted|straight|curved)\b/gi,
    /\b(fire|flame|burning|ice|frost|frozen|water|lightning|electric|thunder|earth|nature|wind|air|shadow|light|holy|dark|poison|acid|arcane|void|chaos|order)\b/gi,
    /\b(large|big|huge|giant|massive|small|tiny|mini|long|short|wide|narrow|thick|thin|round|square|triangular|curved|straight|pointed|blunt|sharp)\b/gi,
    /\b(glowing|pulsing|animated|floating|hovering|spinning|dripping|smoking|steaming|sparkling|shimmering|translucent|transparent|opaque|solid|ethereal|ghostly)\b/gi,
  ];

  const keywords: Set<string> = new Set();

  for (const pattern of importantPatterns) {
    const matches = userPrompt.match(pattern);
    if (matches) {
      matches.forEach((match) => keywords.add(match.toLowerCase()));
    }
  }

  const words = userPrompt.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (cleanWord.length > 4 && !stopWords.has(cleanWord) && !keywords.has(cleanWord)) {
      keywords.add(cleanWord);
    }
  }

  return Array.from(keywords).slice(0, 8);
}

// ===========================================
// ISOMETRIC MODE DETECTION
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

// ===========================================
// PIXEL ART STYLE DETECTION
// ===========================================
function isPixelArtStyle(styleId: string): boolean {
  return styleId.startsWith("PIXEL_ART") || styleId.includes("ISOMETRIC_PIXEL");
}

// ===========================================
// GAME ASSET PREFIXES (v3.0) - SINGLE OBJECT EMPHASIS
// ===========================================
// Adds game-specific context to prompts for better AI understanding
// CRITICAL: Emphasize SINGLE ISOLATED object to prevent sprite sheets
const GAME_ASSET_PREFIXES: Record<string, string> = {
  WEAPONS: "((SINGLE weapon icon)), ONE isolated weapon, single RPG equipment sprite, single loot drop weapon, one inventory item, NOT a sprite sheet, NOT multiple weapons",
  ARMOR: "((SINGLE armor icon)), ONE isolated armor piece, single RPG equipment sprite, single loot drop armor, one inventory item, NOT a sprite sheet",
  CONSUMABLES: "((SINGLE consumable icon)), ONE isolated item, single usable item sprite, one inventory pickup, NOT multiple items",
  RESOURCES: "((SINGLE resource icon)), ONE isolated material, single crafting material sprite, one gatherable item, NOT multiple resources",
  QUEST_ITEMS: "((SINGLE quest item icon)), ONE isolated artifact, single special item sprite, one unique collectible, NOT multiple items",
  CHARACTERS: "((SINGLE character sprite)), ONE isolated character, single playable character asset, one RPG character, NOT multiple characters",
  CREATURES: "((SINGLE creature sprite)), ONE isolated creature, single enemy asset, one monster sprite, NOT multiple creatures",
  ENVIRONMENT: "((SINGLE environment prop)), ONE isolated prop, single world decoration asset, one placeable object, NOT multiple props",
  ISOMETRIC: "((SINGLE isometric asset)), ONE isolated isometric object, single strategy game sprite, one 2.5D game object, NOT multiple objects",
  TILESETS: "game tileset texture, seamless tile asset, level design tile, tileable texture",
  UI_ELEMENTS: "((SINGLE UI element)), ONE isolated UI component, single interface graphic sprite, one HUD element, NOT multiple icons",
  EFFECTS: "((SINGLE VFX sprite)), ONE isolated visual effect, single particle effect, one effect frame, NOT animation sheet",
  PROJECTILES: "((SINGLE projectile sprite)), ONE isolated projectile, single ammunition asset, one flying object, NOT multiple projectiles",
};


// ===========================================
// !!! NEW: SMART SLOT/GRID DETECTION !!!
// ===========================================
// Detects when user wants slots/grid in UI elements and enhances prompt

interface SlotGridInfo {
  hasSlots: boolean;
  slotCount: number;
  cols: number;
  rows: number;
  gridDescription: string;
}

function detectSlotGrid(userPrompt: string, subcategoryId: string): SlotGridInfo {
  const lower = userPrompt.toLowerCase();
  
  // Default: no slots
  const noSlots: SlotGridInfo = {
    hasSlots: false,
    slotCount: 0,
    cols: 0,
    rows: 0,
    gridDescription: "",
  };

  // Only apply to UI-related subcategories
  const uiSubcategories = ["INVENTORY", "PANELS", "FRAMES"];
  if (!uiSubcategories.includes(subcategoryId) && 
      !lower.includes("inventory") && 
      !lower.includes("slot") && 
      !lower.includes("grid")) {
    return noSlots;
  }

  // Detect "X slots" pattern
  const slotMatch = lower.match(/(\d+)\s*slots?/);
  // Detect "XxY grid" pattern
  const gridMatch = lower.match(/(\d+)\s*[x×]\s*(\d+)\s*(?:grid|slots)?/);
  // Detect keywords that imply slots
  const impliesSlots = lower.includes("inventory panel") || 
                       lower.includes("item container") ||
                       lower.includes("equipment grid") ||
                       lower.includes("storage");

  let slotCount = 0;
  let cols = 0;
  let rows = 0;

  if (gridMatch) {
    // Explicit grid like "3x3 grid" or "4x2 slots"
    cols = parseInt(gridMatch[1]);
    rows = parseInt(gridMatch[2]);
    slotCount = cols * rows;
  } else if (slotMatch) {
    // "4 slots", "6 slots", etc.
    slotCount = parseInt(slotMatch[1]);
    // Calculate reasonable grid layout
    if (slotCount <= 2) {
      cols = slotCount;
      rows = 1;
    } else if (slotCount <= 4) {
      cols = 2;
      rows = Math.ceil(slotCount / 2);
    } else if (slotCount <= 9) {
      cols = 3;
      rows = Math.ceil(slotCount / 3);
    } else if (slotCount <= 16) {
      cols = 4;
      rows = Math.ceil(slotCount / 4);
    } else {
      cols = 5;
      rows = Math.ceil(slotCount / 5);
    }
  } else if (impliesSlots && !lower.includes("single slot")) {
    // Default grid for inventory panels without specific count
    slotCount = 4;
    cols = 2;
    rows = 2;
  }

  if (slotCount > 0) {
    return {
      hasSlots: true,
      slotCount,
      cols,
      rows,
      gridDescription: `containing a clearly visible ${cols}x${rows} grid layout with exactly ${slotCount} distinct empty square item slots arranged in organized rows, each slot is a bordered square cell with subtle inner shadow and distinct edges, slots are evenly spaced inside the panel frame`,
    };
  }

  return noSlots;
}

// ===========================================
// !!! NEW: STYLE STRENGTH BUILDER !!!
// ===========================================
// Creates STRONG style enforcement text based on style type

function buildStyleEnforcement(style: StyleConfig, isPixelArt: boolean): string {
  const parts: string[] = [];

  // If style has custom enforcement, use it
  if (style.styleEnforcement) {
    parts.push(style.styleEnforcement);
  }

  // For pixel art, add EXTRA strong enforcement
  if (isPixelArt) {
    parts.push("((pixel art style))");
    parts.push("((visible square pixels throughout the entire image))");
    parts.push("MUST show individual pixels");
    parts.push("pixelated edges on all shapes");
    parts.push("NO smooth gradients");
    parts.push("NO anti-aliasing");
    parts.push("retro video game pixel graphics");
  }

  // Add mandatory requirements
  if (style.styleMandatory) {
    parts.push(style.styleMandatory);
  }

  return parts.join(", ");
}

// ===========================================
// PRO QUALITY PROMPT BUILDER v6.0
// ===========================================
// Key improvements:
// - PRO_QUALITY_BOOST for game-ready assets
// - Style enforcement at BEGINNING and END of prompt
// - Smart slot/grid detection for UI
// - Stronger pixel art specific handling
// - Better negative prompts
// - Industry-standard quality keywords

export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  // Get configurations
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const categoryConfig = CATEGORY_PROMPT_CONFIGS[categoryId];
  const subcategoryConfig: SubcategoryPromptConfig | undefined = categoryConfig?.[subcategoryId];
  const categoryBase = CATEGORY_BASE_DESCRIPTIONS[categoryId] || "game asset sprite";

  // Detect modes
  const isIsometric = isIsometricMode(categoryId, subcategoryId, styleId);
  const isPixelArt = isPixelArtStyle(styleId);
  
  // Clean user prompt
  const cleanUserPrompt = userPrompt.trim();
  
  // Extract keywords for emphasis
  const userKeywords = extractKeyDescriptors(cleanUserPrompt);
  
  // !!! NEW: Detect slot/grid requirements !!!
  const slotInfo = detectSlotGrid(cleanUserPrompt, subcategoryId);

  // Build prompt parts
  const promptParts: string[] = [];

  // ===========================================
  // PART 0: GAME ASSET PREFIX (NEW!)
  // ===========================================
  // Add game-specific context FIRST so AI understands this is a game asset
  const gamePrefix = GAME_ASSET_PREFIXES[categoryId] || "game asset sprite, game item";
  promptParts.push(`((${gamePrefix}))`);

  // ===========================================
  // PART 1: STRONG STYLE OPENER (CRITICAL!)
  // ===========================================
  // Put style FIRST so AI knows the rendering style from the start
  if (isPixelArt) {
    // EXTRA STRONG pixel art opener
    promptParts.push(`((${style.styleCore}))`);
    promptParts.push("((pixel art with visible individual pixels))");
    promptParts.push(style.rendering);
  } else {
    promptParts.push(`((${style.styleCore}))`);
  }

  // ===========================================
  // ISOMETRIC SPECIAL HANDLING
  // ===========================================
  if (isIsometric) {
    promptParts.push(`((${ISOMETRIC_BOOST.core}))`);
    promptParts.push(`((${cleanUserPrompt}))`);
    promptParts.push(`${cleanUserPrompt} as ${subcategoryConfig?.objectType || "isometric game asset"}`);

    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
      promptParts.push(subcategoryConfig.composition);
    }

    promptParts.push(ISOMETRIC_BOOST.composition);
    promptParts.push(ISOMETRIC_BOOST.lighting);
    promptParts.push(categoryBase);
    promptParts.push(style.colors);
    promptParts.push(ISOMETRIC_BOOST.quality);
    promptParts.push(ISOMETRIC_BOOST.references);

    // PRO QUALITY: Game-ready asset requirements for isometric
    promptParts.push(PRO_QUALITY_BOOST.gameReady);
    promptParts.push(PRO_QUALITY_BOOST.composition);
    promptParts.push(PRO_QUALITY_BOOST.transparency);
    promptParts.push(PRO_QUALITY_BOOST.technical);

    if (userKeywords.length > 0) {
      promptParts.push(`featuring ${userKeywords.join(", ")}`);
    }
  } else {
    // ===========================================
    // STANDARD HANDLING
    // ===========================================

    // PART 2: USER INTENT (with double parentheses for emphasis)
    promptParts.push(`((${cleanUserPrompt}))`);

    // PART 3: OBJECT TYPE
    if (subcategoryConfig) {
      promptParts.push(`${cleanUserPrompt} as single ${subcategoryConfig.objectType}`);
    }

    // !!! NEW: SLOT/GRID ENHANCEMENT !!!
    if (slotInfo.hasSlots) {
      promptParts.push(slotInfo.gridDescription);
    }

    // PART 4: VISUAL DESCRIPTION
    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
    }

    // PART 5: CATEGORY CONTEXT
    promptParts.push(categoryBase);

    // PART 6: COMPOSITION
    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.composition);
    }

    // PRO QUALITY: Game-ready asset requirements
    promptParts.push(PRO_QUALITY_BOOST.gameReady);
    promptParts.push(PRO_QUALITY_BOOST.composition);
    promptParts.push(PRO_QUALITY_BOOST.transparency);

    // PART 7: STYLE DETAILS
    promptParts.push(style.colors);
    promptParts.push(style.edges);

    // PART 8: USER KEYWORDS REINFORCEMENT
    if (userKeywords.length > 0) {
      promptParts.push(`featuring ${userKeywords.join(", ")}`);
    }

    // ===========================================
    // PART 9: STYLE ENFORCEMENT CLOSER (CRITICAL!)
    // ===========================================
    // Put style requirements at END to reinforce
    const styleEnforcement = buildStyleEnforcement(style, isPixelArt);
    if (styleEnforcement) {
      promptParts.push(styleEnforcement);
    }

    // Extra pixel art closer
    if (isPixelArt) {
      promptParts.push("((strictly pixel art, visible pixels, no smooth rendering))");
    }

    // PRO QUALITY: Technical quality boost (at the end for reinforcement)
    promptParts.push(PRO_QUALITY_BOOST.technical);
  }

  // ===========================================
  // BUILD NEGATIVE PROMPT (ENHANCED v2.0)
  // ===========================================
  // Use new comprehensive negative prompt system
  const finalNegative = buildCompleteNegativePrompt(
    style.negatives,
    categoryId,
    styleId,
    subcategoryConfig?.avoid
  );

  // ===========================================
  // CLEAN & FORMAT
  // ===========================================
  const finalPrompt = promptParts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // ===========================================
  // LOGGING
  // ===========================================
  console.log("\n" + "═".repeat(70));
  console.log("🎮 ULTIMATE PROMPT BUILDER v5.0");
  console.log("═".repeat(70));
  console.log("📝 User Input:", userPrompt);
  console.log("📦 Category:", categoryId, "→", subcategoryId);
  console.log("🎨 Style:", style.name);
  console.log("🔧 Modes:", {
    isometric: isIsometric,
    pixelArt: isPixelArt,
    hasSlots: slotInfo.hasSlots,
    slotCount: slotInfo.slotCount,
  });
  console.log("🤖 Model:", style.model, "| Guidance:", style.guidance, "| Steps:", style.steps);
  console.log("─".repeat(70));
  console.log("✅ FINAL PROMPT (" + finalPrompt.split(/\s+/).length + " words):");
  console.log(finalPrompt);
  console.log("─".repeat(70));
  console.log("❌ NEGATIVE (" + finalNegative.split(/\s+/).length + " words):");
  console.log(finalNegative.substring(0, 400) + "...");
  console.log("═".repeat(70) + "\n");

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    model: style.model,
    guidance: style.guidance,
    steps: style.steps,
  };
}

// ===========================================
// ENHANCED PROMPT BUILDER WITH PREMIUM FEATURES
// ===========================================
// Supports: Style Mixing, Color Palette Lock

interface EnhancedPromptOptions {
  // Style mixing
  enableStyleMix?: boolean;
  style2Id?: string;
  style1Weight?: number; // 0-100, default 70

  // Color palette lock
  colorPaletteId?: string;
}

/**
 * Build prompt with premium features (style mixing, color palette)
 */
export function buildEnhancedPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  options: EnhancedPromptOptions = {}
): BuildPromptResult {
  const {
    enableStyleMix = false,
    style2Id,
    style1Weight = 70,
    colorPaletteId,
  } = options;

  // If no premium features, use standard builder
  if (!enableStyleMix && !colorPaletteId) {
    return buildUltimatePrompt(userPrompt, categoryId, subcategoryId, styleId);
  }

  // Get style configurations
  const style1: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const style2: StyleConfig | undefined = style2Id ? STYLES_2D_FULL[style2Id] : undefined;
  const categoryConfig = CATEGORY_PROMPT_CONFIGS[categoryId];
  const subcategoryConfig: SubcategoryPromptConfig | undefined = categoryConfig?.[subcategoryId];
  const categoryBase = CATEGORY_BASE_DESCRIPTIONS[categoryId] || "game asset sprite";

  // Detect modes
  const isIsometric = isIsometricMode(categoryId, subcategoryId, styleId);
  const isPixelArt = isPixelArtStyle(styleId) || (style2Id ? isPixelArtStyle(style2Id) : false);

  // Clean user prompt
  let cleanUserPrompt = userPrompt.trim();

  // Apply color palette to prompt if specified
  if (colorPaletteId) {
    // Import COLOR_PALETTES dynamically to avoid circular dependency
    const { COLOR_PALETTES } = require("../features/premium-features");
    const palette = COLOR_PALETTES.find((p: { id: string }) => p.id === colorPaletteId);
    if (palette) {
      cleanUserPrompt = `${cleanUserPrompt}, ${palette.promptModifier}, strictly using ${palette.name} color scheme`;
    }
  }

  // Extract keywords
  const userKeywords = extractKeyDescriptors(cleanUserPrompt);
  const slotInfo = detectSlotGrid(cleanUserPrompt, subcategoryId);

  // Build prompt parts
  const promptParts: string[] = [];

  // ===========================================
  // PART 0: GAME ASSET PREFIX (NEW!)
  // ===========================================
  // Add game-specific context for enhanced prompts too
  const gamePrefix = GAME_ASSET_PREFIXES[categoryId] || "game asset sprite, game item";
  promptParts.push(`((${gamePrefix}))`);

  // ===========================================
  // STYLE MIXING: Weighted style cores
  // ===========================================
  if (enableStyleMix && style2) {
    const style2Weight = 100 - style1Weight;
    const weight1 = (style1Weight / 100).toFixed(2);
    const weight2 = (style2Weight / 100).toFixed(2);

    // Add weighted style cores
    promptParts.push(`(${style1.styleCore}:${weight1})`);
    promptParts.push(`(${style2.styleCore}:${weight2})`);
    promptParts.push(`artistic blend of ${style1.name} and ${style2.name} styles`);

    // Mix rendering based on weight
    if (style1Weight >= 50) {
      promptParts.push(style1.rendering);
    } else {
      promptParts.push(style2.rendering);
    }

    // Pixel art specific
    if (isPixelArt) {
      promptParts.push("((pixel art with visible individual pixels))");
    }
  } else {
    // Standard style opener
    if (isPixelArt) {
      promptParts.push(`((${style1.styleCore}))`);
      promptParts.push("((pixel art with visible individual pixels))");
      promptParts.push(style1.rendering);
    } else {
      promptParts.push(`((${style1.styleCore}))`);
    }
  }

  // ===========================================
  // REST OF PROMPT (similar to standard)
  // ===========================================
  if (isIsometric) {
    promptParts.push(`((${ISOMETRIC_BOOST.core}))`);
    promptParts.push(`((${cleanUserPrompt}))`);
    promptParts.push(`${cleanUserPrompt} as ${subcategoryConfig?.objectType || "isometric game asset"}`);

    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
      promptParts.push(subcategoryConfig.composition);
    }

    promptParts.push(ISOMETRIC_BOOST.composition);
    promptParts.push(ISOMETRIC_BOOST.lighting);
    promptParts.push(categoryBase);

    // Mixed colors
    if (enableStyleMix && style2) {
      promptParts.push(`${style1.colors}, ${style2.colors}`);
    } else {
      promptParts.push(style1.colors);
    }

    promptParts.push(ISOMETRIC_BOOST.quality);
    promptParts.push(ISOMETRIC_BOOST.references);

    // PRO QUALITY: Game-ready asset requirements for isometric
    promptParts.push(PRO_QUALITY_BOOST.gameReady);
    promptParts.push(PRO_QUALITY_BOOST.composition);
    promptParts.push(PRO_QUALITY_BOOST.transparency);
    promptParts.push(PRO_QUALITY_BOOST.technical);
  } else {
    // Standard handling
    promptParts.push(`((${cleanUserPrompt}))`);

    if (subcategoryConfig) {
      promptParts.push(`${cleanUserPrompt} as single ${subcategoryConfig.objectType}`);
    }

    if (slotInfo.hasSlots) {
      promptParts.push(slotInfo.gridDescription);
    }

    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
    }

    promptParts.push(categoryBase);

    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.composition);
    }

    // PRO QUALITY: Game-ready asset requirements
    promptParts.push(PRO_QUALITY_BOOST.gameReady);
    promptParts.push(PRO_QUALITY_BOOST.composition);
    promptParts.push(PRO_QUALITY_BOOST.transparency);

    // Mixed colors and edges
    if (enableStyleMix && style2) {
      promptParts.push(`${style1.colors}, ${style2.colors}`);
      promptParts.push(style1Weight >= 50 ? style1.edges : style2.edges);
    } else {
      promptParts.push(style1.colors);
      promptParts.push(style1.edges);
    }

    if (userKeywords.length > 0) {
      promptParts.push(`featuring ${userKeywords.join(", ")}`);
    }

    // Style enforcement
    const styleEnforcement = buildStyleEnforcement(style1, isPixelArt);
    if (styleEnforcement) {
      promptParts.push(styleEnforcement);
    }

    if (isPixelArt) {
      promptParts.push("((strictly pixel art, visible pixels, no smooth rendering))");
    }

    // PRO QUALITY: Technical quality boost (at the end for reinforcement)
    promptParts.push(PRO_QUALITY_BOOST.technical);
  }

  // ===========================================
  // BUILD NEGATIVE PROMPT (ENHANCED v2.0 - for mixed styles)
  // ===========================================
  // Combine style negatives for mixed styles
  let combinedStyleNegatives = style1.negatives;
  if (enableStyleMix && style2) {
    combinedStyleNegatives = `${style1.negatives}, ${style2.negatives}`;
  }
  
  // Use new comprehensive negative prompt system
  const finalNegative = buildCompleteNegativePrompt(
    combinedStyleNegatives,
    categoryId,
    styleId,
    subcategoryConfig?.avoid
  );

  // ===========================================
  // CLEAN & FORMAT
  // ===========================================
  const finalPrompt = promptParts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // Determine which model/settings to use (dominant style)
  const dominantStyle = style1Weight >= 50 ? style1 : (style2 || style1);

  // Logging
  console.log("\n" + "═".repeat(70));
  console.log("🎮 ENHANCED PROMPT BUILDER (Premium Features)");
  console.log("═".repeat(70));
  console.log("📝 User Input:", userPrompt);
  console.log("📦 Category:", categoryId, "→", subcategoryId);
  console.log("🎨 Style:", style1.name, enableStyleMix && style2 ? `+ ${style2.name} (${style1Weight}/${100-style1Weight})` : "");
  console.log("🎨 Palette:", colorPaletteId || "Default");
  console.log("🔧 Modes:", { isometric: isIsometric, pixelArt: isPixelArt, styleMix: enableStyleMix });
  console.log("🤖 Model:", dominantStyle.model, "| Guidance:", dominantStyle.guidance, "| Steps:", dominantStyle.steps);
  console.log("─".repeat(70));
  console.log("✅ FINAL PROMPT (" + finalPrompt.split(/\s+/).length + " words):");
  console.log(finalPrompt.substring(0, 500) + "...");
  console.log("═".repeat(70) + "\n");

  return {
    prompt: finalPrompt,
    negativePrompt: finalNegative,
    model: dominantStyle.model,
    guidance: dominantStyle.guidance,
    steps: dominantStyle.steps,
  };
}

// ===========================================
// EXPORTS
// ===========================================
export { extractKeyDescriptors, detectSlotGrid };