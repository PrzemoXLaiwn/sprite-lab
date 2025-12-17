import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/**
 * Auto-Learning System
 * Automatically improves prompts based on analysis data
 */

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Generate improved prompt template based on analysis data
export async function generateOptimizedPrompt(
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<string | null> {
  // Get analysis data for this combination
  const analyses = await prisma.imageAnalysis.findMany({
    where: {
      generation: {
        categoryId,
        subcategoryId,
        styleId,
      },
    },
    orderBy: { promptAlignment: "desc" },
    take: 50,
    include: {
      generation: {
        select: { prompt: true, fullPrompt: true },
      },
    },
  });

  if (analyses.length < 10) {
    // Not enough data to learn from
    return null;
  }

  // Get hallucination patterns to avoid
  const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
    where: { categoryId, subcategoryId, styleId, isActive: true },
    orderBy: { occurrenceCount: "desc" },
    take: 10,
  });

  // Get best performing prompts
  const bestPrompts = analyses
    .filter((a) => a.promptAlignment >= 80 && !a.hasHallucination)
    .slice(0, 10);

  // Get worst performing prompts
  const worstPrompts = analyses
    .filter((a) => a.promptAlignment < 50 || a.hasHallucination)
    .slice(0, 10);

  if (bestPrompts.length < 3) {
    return null;
  }

  // Ask Claude to generate optimized template
  const prompt = `You are an expert at optimizing prompts for AI image generation, specifically for game assets.

CONTEXT:
- Category: ${categoryId}
- Subcategory: ${subcategoryId}
- Style: ${styleId}

BEST PERFORMING PROMPTS (high quality, no hallucinations):
${bestPrompts
  .map(
    (p, i) => `${i + 1}. Score: ${p.promptAlignment}% - "${p.generation?.fullPrompt || p.generation?.prompt}"`
  )
  .join("\n")}

WORST PERFORMING PROMPTS (low quality or hallucinations):
${worstPrompts
  .map(
    (p, i) =>
      `${i + 1}. Score: ${p.promptAlignment}% - "${p.generation?.fullPrompt || p.generation?.prompt}"
   Issues: ${p.hallucinationType || "low alignment"}, Missing: ${p.missingElements}`
  )
  .join("\n")}

KNOWN HALLUCINATION TRIGGERS TO AVOID:
${hallucinationPatterns
  .map((h) => `- ${h.hallucinationType}: ${h.triggerKeywords} (${h.occurrenceCount} occurrences)`)
  .join("\n")}

Based on this data, create an OPTIMIZED PROMPT TEMPLATE for this category/style combination.

Requirements:
1. Use {subject} as placeholder for the main subject
2. Include specific keywords that consistently produce good results
3. Avoid words/phrases that cause hallucinations
4. Be specific about style requirements
5. Keep it under 200 words

Also provide:
- required_keywords: words that should always be included
- avoid_keywords: words that cause issues

Respond in JSON format:
{
  "template": "your optimized prompt template with {subject} placeholder",
  "required_keywords": ["keyword1", "keyword2"],
  "avoid_keywords": ["bad1", "bad2"],
  "reasoning": "brief explanation of your choices"
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    });

    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return null;
    }

    const result = JSON.parse(textContent.text);

    // Get current version
    const currentVersion = await prisma.optimizedPrompt.findFirst({
      where: { categoryId, subcategoryId, styleId, isActive: true },
      orderBy: { version: "desc" },
    });

    const newVersion = (currentVersion?.version || 0) + 1;

    // Deactivate old version
    if (currentVersion) {
      await prisma.optimizedPrompt.update({
        where: { id: currentVersion.id },
        data: { isActive: false },
      });
    }

    // Create new optimized prompt
    await prisma.optimizedPrompt.create({
      data: {
        categoryId,
        subcategoryId,
        styleId,
        promptTemplate: result.template,
        requiredKeywords: JSON.stringify(result.required_keywords),
        avoidKeywords: JSON.stringify(result.avoid_keywords),
        version: newVersion,
        previousVersion: currentVersion?.id,
        isActive: true,
      },
    });

    return result.template;
  } catch (error) {
    console.error("Failed to generate optimized prompt:", error);
    return null;
  }
}

// Apply learned improvements to a user prompt
export async function enhancePrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<{
  enhancedPrompt: string;
  appliedFixes: string[];
  warnings: string[];
}> {
  const appliedFixes: string[] = [];
  const warnings: string[] = [];
  let enhancedPrompt = userPrompt;

  // Get optimized template if available
  const optimizedPrompt = await prisma.optimizedPrompt.findFirst({
    where: { categoryId, subcategoryId, styleId, isActive: true },
    orderBy: { version: "desc" },
  });

  // Get hallucination patterns to check against
  const hallucinationPatterns = await prisma.hallucinationPattern.findMany({
    where: { categoryId, subcategoryId, styleId, isActive: true },
    orderBy: { occurrenceCount: "desc" },
  });

  // Check for hallucination trigger words
  const promptLower = userPrompt.toLowerCase();
  for (const pattern of hallucinationPatterns) {
    const triggerWords = JSON.parse(pattern.triggerKeywords) as string[];
    const foundTriggers = triggerWords.filter((w) => promptLower.includes(w));

    if (foundTriggers.length > 0) {
      warnings.push(
        `Warning: "${foundTriggers.join(", ")}" may cause ${pattern.hallucinationType}`
      );

      // Apply prevention prompt if available
      if (pattern.preventionPrompt) {
        enhancedPrompt = `${enhancedPrompt}, ${pattern.preventionPrompt}`;
        appliedFixes.push(`Added fix for ${pattern.hallucinationType}`);
      }
    }
  }

  // If we have avoid keywords, check and warn
  if (optimizedPrompt?.avoidKeywords) {
    const avoidList = JSON.parse(optimizedPrompt.avoidKeywords) as string[];
    const foundAvoid = avoidList.filter((w) => promptLower.includes(w));
    if (foundAvoid.length > 0) {
      warnings.push(`Consider avoiding: ${foundAvoid.join(", ")}`);
    }
  }

  // Add required keywords if missing
  if (optimizedPrompt?.requiredKeywords) {
    const requiredList = JSON.parse(optimizedPrompt.requiredKeywords) as string[];
    const missingRequired = requiredList.filter(
      (w) => !promptLower.includes(w.toLowerCase())
    );
    if (missingRequired.length > 0) {
      enhancedPrompt = `${enhancedPrompt}, ${missingRequired.join(", ")}`;
      appliedFixes.push(`Added required keywords: ${missingRequired.join(", ")}`);
    }
  }

  return { enhancedPrompt, appliedFixes, warnings };
}

// Run auto-learning for combinations with enough data
export async function runAutoLearning(): Promise<{
  updated: number;
  skipped: number;
}> {
  let updated = 0;
  let skipped = 0;

  // Find combinations with enough analysis data
  const combinations = await prisma.imageAnalysis.groupBy({
    by: ["generationId"],
    _count: { id: true },
  });

  // Get unique category/style combinations from generations
  const generations = await prisma.generation.findMany({
    where: {
      id: { in: combinations.map((c) => c.generationId) },
    },
    select: {
      categoryId: true,
      subcategoryId: true,
      styleId: true,
    },
  });

  // Group by combination
  const uniqueCombos = new Map<string, { categoryId: string; subcategoryId: string; styleId: string }>();
  for (const gen of generations) {
    const key = `${gen.categoryId}:${gen.subcategoryId}:${gen.styleId}`;
    if (!uniqueCombos.has(key)) {
      uniqueCombos.set(key, gen);
    }
  }

  // Process each combination
  for (const [, combo] of uniqueCombos) {
    // Count analyses for this combo
    const analysisCount = await prisma.imageAnalysis.count({
      where: {
        generation: {
          categoryId: combo.categoryId,
          subcategoryId: combo.subcategoryId,
          styleId: combo.styleId,
        },
      },
    });

    if (analysisCount >= 20) {
      // Enough data to learn from
      const result = await generateOptimizedPrompt(
        combo.categoryId,
        combo.subcategoryId,
        combo.styleId
      );

      if (result) {
        updated++;
        console.log(
          `Updated prompt template for ${combo.categoryId}/${combo.subcategoryId}/${combo.styleId}`
        );
      } else {
        skipped++;
      }
    } else {
      skipped++;
    }
  }

  return { updated, skipped };
}

// Update hallucination prevention based on new data
export async function updateHallucinationPrevention(): Promise<number> {
  let updated = 0;

  // Get patterns with high occurrence but no prevention
  const patternsNeedingFix = await prisma.hallucinationPattern.findMany({
    where: {
      occurrenceCount: { gte: 5 },
      preventionPrompt: null,
    },
  });

  for (const pattern of patternsNeedingFix) {
    // Get examples of this hallucination
    const examples = await prisma.imageAnalysis.findMany({
      where: {
        hallucinationType: pattern.hallucinationType,
        generation: {
          categoryId: pattern.categoryId,
          subcategoryId: pattern.subcategoryId,
          styleId: pattern.styleId,
        },
      },
      take: 5,
      include: {
        generation: { select: { prompt: true } },
      },
    });

    if (examples.length < 3) continue;

    // Ask Claude to suggest prevention
    const prompt = `Analyze these AI image generation hallucinations and suggest a fix:

Hallucination Type: ${pattern.hallucinationType}
Category: ${pattern.categoryId} / ${pattern.subcategoryId}
Style: ${pattern.styleId}
Trigger Keywords: ${pattern.triggerKeywords}

Examples:
${examples
  .map(
    (e) => `- Prompt: "${e.generation?.prompt}"
  Missing: ${e.missingElements}
  Extra: ${e.extraElements}
  Suggestion: ${e.suggestedFix}`
  )
  .join("\n")}

Create a SHORT phrase (max 10 words) that can be added to prompts to prevent this hallucination.
The phrase should be specific and actionable.

Respond with ONLY the prevention phrase, nothing else.`;

    try {
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        messages: [{ role: "user", content: prompt }],
      });

      const textContent = response.content.find((c) => c.type === "text");
      if (textContent && textContent.type === "text") {
        const prevention = textContent.text.trim();

        await prisma.hallucinationPattern.update({
          where: { id: pattern.id },
          data: { preventionPrompt: prevention },
        });

        updated++;
      }
    } catch (error) {
      console.error(`Failed to generate prevention for pattern ${pattern.id}:`, error);
    }
  }

  return updated;
}

// Get learning statistics
export async function getLearningStats(): Promise<{
  optimizedPrompts: number;
  hallucinationPatterns: number;
  avgImprovement: number;
  mostCommonIssues: Array<{ type: string; count: number; hasFix: boolean }>;
}> {
  const [optimizedCount, patternCount, patterns] = await Promise.all([
    prisma.optimizedPrompt.count({ where: { isActive: true } }),
    prisma.hallucinationPattern.count({ where: { isActive: true } }),
    prisma.hallucinationPattern.findMany({
      where: { isActive: true },
      orderBy: { occurrenceCount: "desc" },
      take: 10,
    }),
  ]);

  // Calculate improvement (compare v1 vs latest)
  const promptsWithHistory = await prisma.optimizedPrompt.findMany({
    where: { isActive: true, version: { gt: 1 } },
    select: {
      avgQualityScore: true,
      previousVersion: true,
    },
  });

  let totalImprovement = 0;
  let comparisons = 0;

  for (const current of promptsWithHistory) {
    if (current.previousVersion) {
      const previous = await prisma.optimizedPrompt.findUnique({
        where: { id: current.previousVersion },
        select: { avgQualityScore: true },
      });
      if (previous) {
        totalImprovement += current.avgQualityScore - previous.avgQualityScore;
        comparisons++;
      }
    }
  }

  return {
    optimizedPrompts: optimizedCount,
    hallucinationPatterns: patternCount,
    avgImprovement: comparisons > 0 ? totalImprovement / comparisons : 0,
    mostCommonIssues: patterns.map((p) => ({
      type: p.hallucinationType,
      count: p.occurrenceCount,
      hasFix: !!p.preventionPrompt,
    })),
  };
}
