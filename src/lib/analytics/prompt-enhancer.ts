import { prisma } from "@/lib/prisma";

/**
 * Prompt Enhancer - Applies learned fixes to prompts automatically
 * This module retrieves learned patterns from the database and applies them
 * to new generations to prevent known issues.
 */

interface EnhancementResult {
  enhancedPrompt: string;
  enhancedNegative: string;
  appliedFixes: string[];
  warnings: string[];
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
      console.log(`[PromptEnhancer] Found OptimizedPrompt v${optimizedPrompt.version}:`, {
        required: optimizedPrompt.requiredKeywords,
        avoid: optimizedPrompt.avoidKeywords,
      });

      // Apply required keywords
      if (optimizedPrompt.requiredKeywords) {
        try {
          const required = JSON.parse(optimizedPrompt.requiredKeywords) as string[];
          if (required.length > 0) {
            const promptLower = enhancedPrompt.toLowerCase();
            const missingRequired = required.filter(
              (kw) => kw && !promptLower.includes(kw.toLowerCase())
            );
            if (missingRequired.length > 0) {
              enhancedPrompt = `${enhancedPrompt}, ${missingRequired.join(", ")}`;
              appliedFixes.push(`Added required: ${missingRequired.join(", ")}`);
            }
          }
        } catch (e) {
          console.log(`[PromptEnhancer] Parse error for requiredKeywords:`, e);
        }
      }

      // Apply avoid keywords to negative prompt
      if (optimizedPrompt.avoidKeywords) {
        try {
          const avoid = JSON.parse(optimizedPrompt.avoidKeywords) as string[];
          if (avoid.length > 0) {
            const negativeLower = enhancedNegative.toLowerCase();
            const missingAvoid = avoid.filter(
              (kw) => kw && !negativeLower.includes(kw.toLowerCase())
            );
            if (missingAvoid.length > 0) {
              enhancedNegative = `${enhancedNegative}, ${missingAvoid.join(", ")}`;
              appliedFixes.push(`Added to negative: ${missingAvoid.join(", ")}`);
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

    for (const pattern of hallucinationPatterns) {
      if (pattern.preventionPrompt) {
        // Check if prevention already applied
        if (!enhancedPrompt.toLowerCase().includes(pattern.preventionPrompt.toLowerCase())) {
          enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
          appliedFixes.push(`Fix for ${pattern.hallucinationType}: ${pattern.preventionPrompt}`);
        }
      }

      // Check if user prompt contains known trigger keywords
      if (pattern.triggerKeywords) {
        try {
          const triggers = JSON.parse(pattern.triggerKeywords) as string[];
          const promptLower = userPrompt.toLowerCase();
          const foundTriggers = triggers.filter((t) => promptLower.includes(t));
          if (foundTriggers.length > 0) {
            warnings.push(
              `Warning: "${foundTriggers.join(", ")}" may cause ${pattern.hallucinationType}`
            );
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // 3. Also check broader category patterns (any subcategory) for common issues
    const broadPatterns = await prisma.hallucinationPattern.findMany({
      where: {
        categoryId,
        isActive: true,
        preventionPrompt: { not: null },
        occurrenceCount: { gte: 2 }, // Patterns that occurred at least twice
      },
      orderBy: { occurrenceCount: "desc" },
      take: 3,
    });

    for (const pattern of broadPatterns) {
      if (pattern.preventionPrompt) {
        if (!enhancedPrompt.toLowerCase().includes(pattern.preventionPrompt.toLowerCase())) {
          enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
          appliedFixes.push(`Broad category fix: ${pattern.preventionPrompt}`);
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
