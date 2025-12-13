// ===========================================
// SPRITELAB CONFIG - PROMPT BUILDER
// ===========================================
// Main prompt building logic for sprite generation

import type { BuildPromptResult, StyleConfig, SubcategoryPromptConfig } from "../types";
import { STYLES_2D_FULL } from "../styles";
import { CATEGORY_PROMPT_CONFIGS, CATEGORY_BASE_DESCRIPTIONS } from "../categories";
import {
  UNIVERSAL_NEGATIVES,
  ISOMETRIC_BOOST,
  ISOMETRIC_NEGATIVES,
} from "./negative-prompts";

// ===========================================
// KEYWORD EXTRACTOR
// ===========================================
// Extracts important descriptive words from user prompt
// for emphasis and reinforcement in the final prompt

function extractKeyDescriptors(userPrompt: string): string[] {
  // Common words to ignore (articles, prepositions, etc.)
  const stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "as", "is", "was", "are", "were", "been",
    "be", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "must", "shall", "can", "need",
    "dare", "ought", "used", "i", "me", "my", "myself", "we", "our",
    "ours", "you", "your", "he", "him", "his", "she", "her", "it", "its",
    "they", "them", "their", "what", "which", "who", "whom", "this",
    "that", "these", "those", "am", "been", "being", "having", "doing",
    "make", "made", "want", "like", "just", "very", "really", "please",
    "sprite", "game", "asset", "image", "picture", "create", "generate",
  ]);

  // Important descriptive patterns to preserve
  const importantPatterns = [
    // Colors
    /\b(red|blue|green|yellow|orange|purple|pink|black|white|gold|silver|bronze|copper|dark|light|bright|neon|glowing|shiny|metallic|rusty|bloody|fiery|icy|frozen|crystal|emerald|ruby|sapphire|diamond)\b/gi,
    // Materials
    /\b(wooden|wood|metal|steel|iron|stone|rock|leather|cloth|silk|bone|crystal|glass|diamond|gold|silver|bronze|copper|obsidian|mythril|adamantine)\b/gi,
    // Styles/Aesthetics
    /\b(ancient|medieval|futuristic|sci-fi|fantasy|magical|enchanted|cursed|holy|demonic|angelic|divine|dark|evil|corrupted|blessed|legendary|epic|rare|common|unique|ornate|simple|elegant|crude|refined|polished|rough|smooth|jagged|twisted|straight|curved)\b/gi,
    // Elements
    /\b(fire|flame|burning|ice|frost|frozen|water|lightning|electric|thunder|earth|nature|wind|air|shadow|light|holy|dark|poison|acid|arcane|void|chaos|order)\b/gi,
    // Size/Shape
    /\b(large|big|huge|giant|massive|small|tiny|mini|long|short|wide|narrow|thick|thin|round|square|triangular|curved|straight|pointed|blunt|sharp)\b/gi,
    // Special attributes
    /\b(glowing|pulsing|animated|floating|hovering|spinning|dripping|smoking|steaming|sparkling|shimmering|translucent|transparent|opaque|solid|ethereal|ghostly)\b/gi,
  ];

  const keywords: Set<string> = new Set();

  // Extract words matching important patterns
  for (const pattern of importantPatterns) {
    const matches = userPrompt.match(pattern);
    if (matches) {
      matches.forEach((match) => keywords.add(match.toLowerCase()));
    }
  }

  // Also extract any remaining significant words (nouns, adjectives)
  const words = userPrompt.toLowerCase().split(/\s+/);
  for (const word of words) {
    const cleanWord = word.replace(/[^a-z]/g, "");
    if (
      cleanWord.length > 3 &&
      !stopWords.has(cleanWord) &&
      !keywords.has(cleanWord)
    ) {
      // Only add if it seems like a descriptor (not too common)
      if (cleanWord.length > 4) {
        keywords.add(cleanWord);
      }
    }
  }

  // Return top keywords (limit to avoid prompt bloat)
  return Array.from(keywords).slice(0, 8);
}

// ===========================================
// ISOMETRIC MODE DETECTION
// ===========================================

/**
 * Check if this generation should use isometric mode
 */
export function isIsometricMode(
  categoryId: string,
  subcategoryId: string,
  styleId: string
): boolean {
  // Isometric category
  if (categoryId === "ISOMETRIC") return true;
  // Isometric style selected
  if (styleId.startsWith("ISOMETRIC")) return true;
  // Isometric subcategory in Environment
  if (subcategoryId.startsWith("ISO_")) return true;
  return false;
}

// ===========================================
// ULTIMATE PROMPT BUILDER v4.0
// ===========================================
// Key improvement: Stronger emphasis on user prompt
// Uses repetition and weighting to ensure AI follows user instructions

export function buildUltimatePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): BuildPromptResult {
  // Get configurations
  const style: StyleConfig = STYLES_2D_FULL[styleId] || STYLES_2D_FULL.PIXEL_ART_16;
  const categoryConfig = CATEGORY_PROMPT_CONFIGS[categoryId];
  const subcategoryConfig: SubcategoryPromptConfig | undefined =
    categoryConfig?.[subcategoryId];
  const categoryBase =
    CATEGORY_BASE_DESCRIPTIONS[categoryId] || "game asset sprite";

  // Check if this is isometric mode
  const isIsometric = isIsometricMode(categoryId, subcategoryId, styleId);

  // Clean and prepare user prompt
  const cleanUserPrompt = userPrompt.trim();

  // Extract key descriptors from user prompt for emphasis
  const userKeywords = extractKeyDescriptors(cleanUserPrompt);

  // Build prompt parts in PRIORITY ORDER
  const promptParts: string[] = [];

  // ===========================================
  // ISOMETRIC SPECIAL HANDLING
  // ===========================================
  if (isIsometric) {
    // For isometric, start with strong isometric context
    promptParts.push(`((${ISOMETRIC_BOOST.core}))`);
    promptParts.push(`((${cleanUserPrompt}))`);
    promptParts.push(
      `${cleanUserPrompt} as ${subcategoryConfig?.objectType || "isometric game asset"}`
    );

    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
      promptParts.push(subcategoryConfig.composition);
    }

    promptParts.push(ISOMETRIC_BOOST.composition);
    promptParts.push(ISOMETRIC_BOOST.lighting);
    promptParts.push(categoryBase);

    // Style
    promptParts.push(style.styleCore);
    promptParts.push(style.rendering);
    promptParts.push(style.colors);

    promptParts.push(ISOMETRIC_BOOST.quality);
    promptParts.push(ISOMETRIC_BOOST.references);

    // Universal composition for isometric - softer shadow allowed
    promptParts.push(
      "centered composition, isolated object, transparent background, PNG with alpha channel, no background, game asset ready for import"
    );

    if (userKeywords.length > 0) {
      promptParts.push(`featuring ${userKeywords.join(", ")}`);
    }
  } else {
    // ===========================================
    // STANDARD (NON-ISOMETRIC) HANDLING
    // ===========================================

    // PART 1: STRONG USER INTENT OPENER
    promptParts.push(`((${cleanUserPrompt}))`);

    // PART 2: OBJECT TYPE WITH USER CONTEXT
    if (subcategoryConfig) {
      promptParts.push(
        `${cleanUserPrompt} as single ${subcategoryConfig.objectType}`
      );
    }

    // PART 3: VISUAL DESCRIPTION
    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.visualDesc);
    }

    // PART 4: CATEGORY CONTEXT
    promptParts.push(categoryBase);

    // PART 5: COMPOSITION GUIDANCE
    if (subcategoryConfig) {
      promptParts.push(subcategoryConfig.composition);
    }
    // Universal composition - CRITICAL for game dev: transparent/clean background
    promptParts.push(
      "centered composition, isolated object, transparent background, PNG with alpha channel, no background, cutout sprite, game asset ready for import"
    );

    // PART 6: ART STYLE
    promptParts.push(style.styleCore);
    promptParts.push(style.rendering);
    promptParts.push(style.colors);
    promptParts.push(style.edges);

    // PART 7: REINFORCE USER KEYWORDS (END)
    if (userKeywords.length > 0) {
      promptParts.push(`featuring ${userKeywords.join(", ")}`);
    }
  }

  // ===========================================
  // BUILD NEGATIVE PROMPT
  // ===========================================
  const negativeParts: string[] = [];

  // Style-specific negatives FIRST
  negativeParts.push(style.negatives);

  // Subcategory-specific avoid list
  if (subcategoryConfig?.avoid) {
    negativeParts.push(subcategoryConfig.avoid);
  }

  // ISOMETRIC-SPECIFIC NEGATIVES (CRITICAL)
  if (isIsometric) {
    negativeParts.push(ISOMETRIC_NEGATIVES.wrongAngle);
    negativeParts.push(ISOMETRIC_NEGATIVES.wrong3D);
    negativeParts.push(ISOMETRIC_NEGATIVES.mistakes);
    negativeParts.push(ISOMETRIC_NEGATIVES.styleIssues);
    negativeParts.push(ISOMETRIC_NEGATIVES.composition);
  }

  // Universal negatives
  negativeParts.push(UNIVERSAL_NEGATIVES.multiObject);
  negativeParts.push(UNIVERSAL_NEGATIVES.background);
  negativeParts.push(UNIVERSAL_NEGATIVES.quality);
  negativeParts.push(UNIVERSAL_NEGATIVES.composition);
  negativeParts.push(UNIVERSAL_NEGATIVES.technical);
  negativeParts.push(UNIVERSAL_NEGATIVES.wrongContent);

  // ===========================================
  // CLEAN & FORMAT
  // ===========================================
  const finalPrompt = promptParts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  const finalNegative = negativeParts
    .filter((p) => p && p.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // ===========================================
  // LOGGING
  // ===========================================
  console.log("\n" + "═".repeat(70));
  console.log(
    "🎮 ULTIMATE PROMPT BUILDER v4.0" + (isIsometric ? " [ISOMETRIC MODE]" : "")
  );
  console.log("═".repeat(70));
  console.log("📝 User Input:", userPrompt);
  console.log("📦 Category:", categoryId, "→", subcategoryId);
  console.log("🎨 Style:", style.name, isIsometric ? "🏰 ISOMETRIC ENHANCED" : "");
  console.log(
    "🤖 Model:",
    style.model,
    "| Guidance:",
    style.guidance,
    "| Steps:",
    style.steps
  );
  console.log("─".repeat(70));
  console.log("✅ FINAL PROMPT (" + finalPrompt.split(/\s+/).length + " words):");
  console.log(finalPrompt);
  console.log("─".repeat(70));
  console.log("❌ NEGATIVE (" + finalNegative.split(/\s+/).length + " words):");
  console.log(finalNegative.substring(0, 300) + "...");
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
// UTILITY EXPORTS
// ===========================================

export { extractKeyDescriptors };
