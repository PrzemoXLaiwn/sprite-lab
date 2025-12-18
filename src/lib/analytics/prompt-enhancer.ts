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

  try {
    // 1. Get optimized prompt template with required/avoid keywords
    const optimizedPrompt = await prisma.optimizedPrompt.findFirst({
      where: {
        categoryId,
        subcategoryId,
        styleId,
        isActive: true,
      },
      orderBy: { version: "desc" },
    });

    if (optimizedPrompt) {
      // Apply required keywords
      if (optimizedPrompt.requiredKeywords) {
        try {
          const required = JSON.parse(optimizedPrompt.requiredKeywords) as string[];
          const promptLower = enhancedPrompt.toLowerCase();
          const missingRequired = required.filter(
            (kw) => kw && !promptLower.includes(kw.toLowerCase())
          );
          if (missingRequired.length > 0) {
            enhancedPrompt = `${enhancedPrompt}, ${missingRequired.join(", ")}`;
            appliedFixes.push(`Added required: ${missingRequired.join(", ")}`);
          }
        } catch { /* ignore parse errors */ }
      }

      // Apply avoid keywords to negative prompt
      if (optimizedPrompt.avoidKeywords) {
        try {
          const avoid = JSON.parse(optimizedPrompt.avoidKeywords) as string[];
          const negativeLower = enhancedNegative.toLowerCase();
          const missingAvoid = avoid.filter(
            (kw) => kw && !negativeLower.includes(kw.toLowerCase())
          );
          if (missingAvoid.length > 0) {
            enhancedNegative = `${enhancedNegative}, ${missingAvoid.join(", ")}`;
            appliedFixes.push(`Added to negative: ${missingAvoid.join(", ")}`);
          }
        } catch { /* ignore parse errors */ }
      }
    }

    // 2. Get hallucination patterns and apply prevention prompts
    const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
      where: {
        categoryId,
        subcategoryId,
        styleId,
        isActive: true,
        preventionPrompt: { not: null },
      },
      orderBy: { occurrenceCount: "desc" },
      take: 5, // Top 5 most common issues
    });

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

    // 3. Also check category-level patterns (without specific style)
    const categoryPatterns = await prisma.hallucinationPattern.findMany({
      where: {
        categoryId,
        subcategoryId,
        isActive: true,
        preventionPrompt: { not: null },
        occurrenceCount: { gte: 3 }, // Only well-established patterns
      },
      orderBy: { occurrenceCount: "desc" },
      take: 3,
    });

    for (const pattern of categoryPatterns) {
      if (pattern.preventionPrompt) {
        if (!enhancedPrompt.toLowerCase().includes(pattern.preventionPrompt.toLowerCase())) {
          enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
          appliedFixes.push(`Category fix: ${pattern.preventionPrompt}`);
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
