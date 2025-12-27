import { prisma } from "@/lib/prisma";

/**
 * Prompt Enhancer - Applies learned fixes to prompts automatically
 * This module retrieves learned patterns from the database and applies them
 * to new generations to prevent known issues.
 *
 * 🔥 CRITICAL: FLUX works best with 50-80 words!
 * - Keep prompts SHORT and SPECIFIC
 * - Extract only actual keywords, not full sentences
 * - Main object + style + key details + quality
 */

// Maximum words to add from learned fixes (FLUX optimal: 50-80 total words)
const MAX_ADDITIONAL_WORDS = 30;
const MAX_PROMPT_WORDS = 100; // Hard limit for final prompt

interface EnhancementResult {
  enhancedPrompt: string;
  enhancedNegative: string;
  appliedFixes: string[];
  warnings: string[];
}

/**
 * Extract actual keywords from a string that might contain full sentences
 * "Add 'pixel art' and 'retro style' to prompt" → ["pixel art", "retro style"]
 */
function extractKeywordsFromText(text: string): string[] {
  const keywords: string[] = [];

  // Extract quoted phrases first (most valuable)
  const quotedMatches = text.match(/['"]([^'"]+)['"]/g);
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const clean = match.replace(/['"]/g, "").trim();
      // Only keep short phrases (1-5 words) that look like actual keywords
      if (clean && clean.split(/\s+/).length <= 5 && !clean.includes("to ") && !clean.includes("for ")) {
        keywords.push(clean);
      }
    }
  }

  // If text is already short (1-4 words), treat it as a keyword
  const words = text.trim().split(/\s+/);
  if (words.length <= 4 && !text.includes("Add ") && !text.includes("Use ") && !text.includes("Specify ")) {
    keywords.push(text.trim());
  }

  return keywords.filter((kw, idx, arr) => arr.indexOf(kw) === idx); // dedupe
}

/**
 * Smart keyword extraction from database field
 * Handles both JSON arrays and plain text
 */
function parseAndExtractKeywords(jsonString: string): string[] {
  if (!jsonString) return [];

  try {
    const parsed = JSON.parse(jsonString) as string[];
    const allKeywords: string[] = [];

    for (const item of parsed) {
      // Extract actual keywords from each item (which might be a sentence)
      const extracted = extractKeywordsFromText(item);
      allKeywords.push(...extracted);
    }

    // Dedupe and limit
    return [...new Set(allKeywords)].slice(0, 10);
  } catch {
    // Not JSON, try direct extraction
    return extractKeywordsFromText(jsonString);
  }
}

/**
 * Enhance a prompt with learned fixes from the AI quality system
 * Call this BEFORE generating an image to apply all learned improvements
 */
export async function enhancePromptWithLearnedFixes(
  userPrompt: string,
  negativePrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<EnhancementResult> {
  const appliedFixes: string[] = [];
  const warnings: string[] = [];
  let enhancedPrompt = userPrompt;
  let enhancedNegative = negativePrompt;

  console.log(`[PromptEnhancer] Looking for fixes: ${categoryId}/${subcategoryId}/${styleId}`);

  try {
    // 1. Get optimized prompt - try exact match first, then fallback to category+subcategory
    let optimizedPrompt = await prisma.optimizedPrompt.findFirst({
      where: {
        categoryId,
        subcategoryId,
        styleId,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    // Fallback: try without specific style
    if (!optimizedPrompt) {
      optimizedPrompt = await prisma.optimizedPrompt.findFirst({
        where: {
          categoryId,
          subcategoryId,
          isActive: true,
        },
        orderBy: [{ version: "desc" }, { updatedAt: "desc" }],
      });
      if (optimizedPrompt) {
        console.log(`[PromptEnhancer] Using category fallback (no style-specific match)`);
      }
    }

    if (optimizedPrompt) {
      console.log(`[PromptEnhancer] Found OptimizedPrompt v${optimizedPrompt.version}`);

      // 🔥 NEW: Smart keyword extraction - only get actual keywords, not sentences!
      if (optimizedPrompt.requiredKeywords) {
        const extractedKeywords = parseAndExtractKeywords(optimizedPrompt.requiredKeywords);
        console.log(`[PromptEnhancer] Extracted ${extractedKeywords.length} keywords from requiredKeywords`);

        if (extractedKeywords.length > 0) {
          const promptLower = enhancedPrompt.toLowerCase();
          // Only add keywords not already in prompt
          const missingKeywords = extractedKeywords.filter(
            (kw) => kw && kw.length > 2 && !promptLower.includes(kw.toLowerCase())
          );

          // Limit how many we add (keep prompts SHORT!)
          const keywordsToAdd = missingKeywords.slice(0, 5);

          if (keywordsToAdd.length > 0) {
            enhancedPrompt = `${enhancedPrompt}, ${keywordsToAdd.join(", ")}`;
            appliedFixes.push(`Added: ${keywordsToAdd.join(", ")}`);
          }
        }
      }

      // Apply avoid keywords to negative prompt (these can be longer)
      if (optimizedPrompt.avoidKeywords) {
        try {
          const avoid = JSON.parse(optimizedPrompt.avoidKeywords) as string[];
          if (avoid.length > 0) {
            const negativeLower = enhancedNegative.toLowerCase();
            // Filter to only short actual keywords (1-3 words)
            const validAvoid = avoid.filter(
              (kw) => kw && kw.split(/\s+/).length <= 3 && !negativeLower.includes(kw.toLowerCase())
            );
            const avoidToAdd = validAvoid.slice(0, 15); // Limit negative keywords too

            if (avoidToAdd.length > 0) {
              enhancedNegative = `${enhancedNegative}, ${avoidToAdd.join(", ")}`;
              appliedFixes.push(`Negative: +${avoidToAdd.length} terms`);
            }
          }
        } catch (e) {
          console.log(`[PromptEnhancer] Parse error for avoidKeywords:`, e);
        }
      }
    } else {
      console.log(`[PromptEnhancer] No OptimizedPrompt found for ${categoryId}/${subcategoryId}`);
    }

    // 2. Get hallucination patterns - try exact match first, then broader
    let hallucinationPatterns = await prisma.hallucinationPattern.findMany({
      where: {
        categoryId,
        subcategoryId,
        styleId,
        isActive: true,
        preventionPrompt: { not: null },
      },
      orderBy: { occurrenceCount: "desc" },
      take: 5,
    });

    // Fallback: get patterns for ANY style in this category/subcategory
    if (hallucinationPatterns.length === 0) {
      hallucinationPatterns = await prisma.hallucinationPattern.findMany({
        where: {
          categoryId,
          subcategoryId,
          isActive: true,
          preventionPrompt: { not: null },
        },
        orderBy: { occurrenceCount: "desc" },
        take: 5,
      });
      if (hallucinationPatterns.length > 0) {
        console.log(`[PromptEnhancer] Using ${hallucinationPatterns.length} category-level hallucination patterns`);
      }
    }

    console.log(`[PromptEnhancer] Found ${hallucinationPatterns.length} hallucination patterns`);

    // 🔥 Collect only SHORT prevention keywords (max 2 from patterns)
    let patternsAdded = 0;
    const MAX_PATTERN_FIXES = 2;

    for (const pattern of hallucinationPatterns) {
      if (patternsAdded >= MAX_PATTERN_FIXES) break;

      if (pattern.preventionPrompt) {
        // Only use short prevention prompts (max 5 words)
        const words = pattern.preventionPrompt.trim().split(/\s+/);
        if (words.length <= 5) {
          if (!enhancedPrompt.toLowerCase().includes(pattern.preventionPrompt.toLowerCase())) {
            enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
            appliedFixes.push(`Fix: ${pattern.preventionPrompt}`);
            patternsAdded++;
          }
        } else {
          // Try to extract keywords from longer prevention prompts
          const extracted = extractKeywordsFromText(pattern.preventionPrompt);
          if (extracted.length > 0 && extracted[0]) {
            const keyword = extracted[0];
            if (!enhancedPrompt.toLowerCase().includes(keyword.toLowerCase())) {
              enhancedPrompt = `${enhancedPrompt}, ${keyword}`;
              appliedFixes.push(`Fix: ${keyword}`);
              patternsAdded++;
            }
          }
        }
      }

      // Check if user prompt contains known trigger keywords (for warnings only)
      if (pattern.triggerKeywords) {
        try {
          const triggers = JSON.parse(pattern.triggerKeywords) as string[];
          const promptLower = userPrompt.toLowerCase();
          const foundTriggers = triggers.filter((t) => t.length > 3 && promptLower.includes(t.toLowerCase()));
          if (foundTriggers.length > 0) {
            warnings.push(`Potential issue: ${pattern.hallucinationType}`);
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // 3. Skip broad patterns - they add too much noise
    // Only use them if we haven't added anything yet
    if (patternsAdded === 0) {
      const broadPatterns = await prisma.hallucinationPattern.findMany({
        where: {
          categoryId,
          isActive: true,
          preventionPrompt: { not: null },
          occurrenceCount: { gte: 3 }, // Only very common patterns
        },
        orderBy: { occurrenceCount: "desc" },
        take: 1, // Just 1 most common
      });

      for (const pattern of broadPatterns) {
        if (pattern.preventionPrompt) {
          const words = pattern.preventionPrompt.trim().split(/\s+/);
          if (words.length <= 4) {
            if (!enhancedPrompt.toLowerCase().includes(pattern.preventionPrompt.toLowerCase())) {
              enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
              appliedFixes.push(`Common fix: ${pattern.preventionPrompt}`);
            }
          }
        }
      }
    }

  } catch (error) {
    console.error("[PromptEnhancer] Error applying learned fixes:", error);
    // Return original prompts if enhancement fails
  }

  // Log applied fixes
  if (appliedFixes.length > 0) {
    console.log(`[PromptEnhancer] Applied ${appliedFixes.length} learned fixes:`);
    appliedFixes.forEach((fix) => console.log(`  - ${fix}`));
  }

  // 🔥 FLUX OPTIMIZATION: Limit by WORDS not characters!
  // FLUX sweet spot: 50-80 words, max ~100 words
  const promptWords = enhancedPrompt.split(/\s+/);
  const negativeWords = enhancedNegative.split(/\s+/);

  console.log(`[PromptEnhancer] Pre-limit: ${promptWords.length} words, ${enhancedPrompt.length} chars`);

  // Limit prompt to MAX_PROMPT_WORDS (100 words)
  if (promptWords.length > MAX_PROMPT_WORDS) {
    console.log(`[PromptEnhancer] ⚠️ Prompt too long (${promptWords.length} words), limiting to ${MAX_PROMPT_WORDS}`);
    enhancedPrompt = promptWords.slice(0, MAX_PROMPT_WORDS).join(" ");
    // Clean up trailing comma if present
    enhancedPrompt = enhancedPrompt.replace(/,\s*$/, "");
  }

  // Limit negative prompt to 60 words (less important, can be shorter)
  const MAX_NEGATIVE_WORDS = 60;
  if (negativeWords.length > MAX_NEGATIVE_WORDS) {
    console.log(`[PromptEnhancer] ⚠️ Negative too long (${negativeWords.length} words), limiting to ${MAX_NEGATIVE_WORDS}`);
    enhancedNegative = negativeWords.slice(0, MAX_NEGATIVE_WORDS).join(" ");
    enhancedNegative = enhancedNegative.replace(/,\s*$/, "");
  }

  // Final stats
  const finalWords = enhancedPrompt.split(/\s+/).length;
  console.log(`[PromptEnhancer] ✅ Final: ${finalWords} words, ${enhancedPrompt.length} chars`);

  return {
    enhancedPrompt,
    enhancedNegative,
    appliedFixes,
    warnings,
  };
}

/**
 * Get statistics about learned patterns for a category
 */
export async function getLearnedPatternsStats(
  categoryId: string,
  subcategoryId: string,
  styleId?: string
): Promise<{
  totalPatterns: number;
  fixedPatterns: number;
  topIssues: Array<{ type: string; count: number; hasFix: boolean }>;
}> {
  const where = {
    categoryId,
    subcategoryId,
    ...(styleId && { styleId }),
    isActive: true,
  };

  const patterns = await prisma.hallucinationPattern.findMany({
    where,
    orderBy: { occurrenceCount: "desc" },
  });

  return {
    totalPatterns: patterns.length,
    fixedPatterns: patterns.filter((p) => p.preventionPrompt).length,
    topIssues: patterns.slice(0, 5).map((p) => ({
      type: p.hallucinationType,
      count: p.occurrenceCount,
      hasFix: !!p.preventionPrompt,
    })),
  };
}
