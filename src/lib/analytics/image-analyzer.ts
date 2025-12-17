import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

/**
 * Automatic Image Analysis System
 * Uses Claude Vision to analyze generated images and detect:
 * - Quality issues
 * - Style mismatches
 * - Hallucinations (missing/wrong elements)
 * - Prompt alignment
 */

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Analysis result interface
interface AnalysisResult {
  // Detected content
  detectedObjects: string[];
  detectedStyle: string;
  detectedColors: string[];
  detectedMood: string;

  // Scores
  qualityScore: number;
  styleAccuracy: number;
  promptAlignment: number;
  confidenceScore: number;

  // Hallucination detection
  hasHallucination: boolean;
  hallucinationType?: string;
  hallucinationDetails?: Record<string, unknown>;

  // Elements comparison
  requestedElements: string[];
  missingElements: string[];
  extraElements: string[];

  // Improvement suggestions
  suggestedFix?: string;

  // Raw data
  rawAnalysis: Record<string, unknown>;
}

// Analyze a single image
export async function analyzeImage(
  imageUrl: string,
  prompt: string,
  categoryId: string,
  subcategoryId: string,
  styleId: string
): Promise<AnalysisResult> {
  // Build the analysis prompt
  const analysisPrompt = `You are an expert game asset quality analyst. Analyze this generated game asset image and compare it to what was requested.

REQUESTED:
- Category: ${categoryId}
- Subcategory: ${subcategoryId}
- Style: ${styleId}
- User prompt: "${prompt}"

Analyze the image and provide a JSON response with these fields:

{
  "detected": {
    "objects": ["list", "of", "objects", "in", "image"],
    "style": "detected art style (pixel-art, anime, realistic, cartoon, etc.)",
    "colors": ["#hex", "colors", "found"],
    "mood": "overall mood/atmosphere"
  },
  "scores": {
    "quality": 0-100 (technical quality, clarity, no artifacts),
    "styleAccuracy": 0-100 (how well it matches the requested style),
    "promptAlignment": 0-100 (how well it matches what was requested)
  },
  "hallucination": {
    "detected": true/false,
    "type": "missing_element|wrong_element|style_mismatch|extra_element|null",
    "details": "specific description of what's wrong or null"
  },
  "elements": {
    "requested": ["elements", "user", "asked", "for"],
    "missing": ["elements", "that", "should", "be", "there"],
    "extra": ["unwanted", "elements", "that", "appeared"]
  },
  "suggestion": "How to improve the prompt to get better results (or null if good)",
  "confidence": 0-100 (how confident you are in this analysis)
}

IMPORTANT:
- Be strict about style matching (pixel art should look like pixel art)
- Check if ALL requested elements are present
- Flag any unexpected elements as hallucinations
- Suggest specific prompt improvements if issues found

Respond ONLY with valid JSON, no other text.`;

  try {
    // Call Claude Vision API
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "url",
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: analysisPrompt,
            },
          ],
        },
      ],
    });

    // Extract text response
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from Claude");
    }

    // Parse JSON response
    const analysis = JSON.parse(textContent.text);

    return {
      detectedObjects: analysis.detected?.objects || [],
      detectedStyle: analysis.detected?.style || "unknown",
      detectedColors: analysis.detected?.colors || [],
      detectedMood: analysis.detected?.mood || "neutral",

      qualityScore: analysis.scores?.quality || 0,
      styleAccuracy: analysis.scores?.styleAccuracy || 0,
      promptAlignment: analysis.scores?.promptAlignment || 0,
      confidenceScore: analysis.confidence || 0,

      hasHallucination: analysis.hallucination?.detected || false,
      hallucinationType: analysis.hallucination?.type || undefined,
      hallucinationDetails: analysis.hallucination?.details
        ? { details: analysis.hallucination.details }
        : undefined,

      requestedElements: analysis.elements?.requested || [],
      missingElements: analysis.elements?.missing || [],
      extraElements: analysis.elements?.extra || [],

      suggestedFix: analysis.suggestion || undefined,

      rawAnalysis: analysis,
    };
  } catch (error) {
    console.error("Image analysis failed:", error);
    throw error;
  }
}

// Process a single analysis job
export async function processAnalysisJob(jobId: string): Promise<void> {
  // Get and lock the job
  const job = await prisma.analysisJob.update({
    where: { id: jobId, status: "pending" },
    data: {
      status: "processing",
      startedAt: new Date(),
    },
  });

  if (!job) {
    console.log(`Job ${jobId} not found or already processing`);
    return;
  }

  try {
    // Get the generation
    const generation = await prisma.generation.findUnique({
      where: { id: job.generationId },
    });

    if (!generation) {
      throw new Error("Generation not found");
    }

    // Run analysis
    const result = await analyzeImage(
      generation.imageUrl,
      generation.prompt,
      generation.categoryId,
      generation.subcategoryId,
      generation.styleId
    );

    // Store analysis result
    await prisma.imageAnalysis.upsert({
      where: { generationId: generation.id },
      update: {
        detectedObjects: JSON.stringify(result.detectedObjects),
        detectedStyle: result.detectedStyle,
        detectedColors: JSON.stringify(result.detectedColors),
        detectedMood: result.detectedMood,
        qualityScore: result.qualityScore,
        styleAccuracy: result.styleAccuracy,
        promptAlignment: result.promptAlignment,
        hasHallucination: result.hasHallucination,
        hallucinationType: result.hallucinationType,
        hallucinationDetails: result.hallucinationDetails
          ? JSON.stringify(result.hallucinationDetails)
          : null,
        requestedElements: JSON.stringify(result.requestedElements),
        missingElements: JSON.stringify(result.missingElements),
        extraElements: JSON.stringify(result.extraElements),
        suggestedFix: result.suggestedFix,
        confidenceScore: result.confidenceScore,
        rawAnalysis: JSON.stringify(result.rawAnalysis),
        modelUsed: "claude-sonnet-4-20250514",
        analysisCost: 0.003, // Approximate cost per analysis
      },
      create: {
        generationId: generation.id,
        detectedObjects: JSON.stringify(result.detectedObjects),
        detectedStyle: result.detectedStyle,
        detectedColors: JSON.stringify(result.detectedColors),
        detectedMood: result.detectedMood,
        qualityScore: result.qualityScore,
        styleAccuracy: result.styleAccuracy,
        promptAlignment: result.promptAlignment,
        hasHallucination: result.hasHallucination,
        hallucinationType: result.hallucinationType,
        hallucinationDetails: result.hallucinationDetails
          ? JSON.stringify(result.hallucinationDetails)
          : null,
        requestedElements: JSON.stringify(result.requestedElements),
        missingElements: JSON.stringify(result.missingElements),
        extraElements: JSON.stringify(result.extraElements),
        suggestedFix: result.suggestedFix,
        confidenceScore: result.confidenceScore,
        rawAnalysis: JSON.stringify(result.rawAnalysis),
        modelUsed: "claude-sonnet-4-20250514",
        analysisCost: 0.003,
      },
    });

    // If hallucination detected, track the pattern
    if (result.hasHallucination && result.hallucinationType) {
      await trackHallucinationPattern(
        generation.categoryId,
        generation.subcategoryId,
        generation.styleId,
        generation.prompt,
        result.hallucinationType,
        result.suggestedFix
      );
    }

    // Update prompt analytics with quality data
    await updatePromptQualityData(
      generation.categoryId,
      generation.subcategoryId,
      generation.styleId,
      generation.prompt,
      result
    );

    // Mark job as completed
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "completed",
        completedAt: new Date(),
      },
    });

    console.log(`Analysis job ${jobId} completed successfully`);
  } catch (error) {
    // Mark job as failed
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: job.retryCount < 3 ? "pending" : "failed",
        retryCount: { increment: 1 },
        errorMessage,
      },
    });

    console.error(`Analysis job ${jobId} failed:`, errorMessage);
  }
}

// Track hallucination patterns for prevention
async function trackHallucinationPattern(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  prompt: string,
  hallucinationType: string,
  suggestedFix?: string
): Promise<void> {
  // Extract keywords from prompt
  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10);

  const triggerKeywords = JSON.stringify(keywords);

  // Try to find existing pattern
  const existing = await prisma.hallucinationPattern.findFirst({
    where: {
      categoryId,
      subcategoryId,
      styleId,
      hallucinationType,
      triggerKeywords,
    },
  });

  if (existing) {
    // Increment occurrence count
    await prisma.hallucinationPattern.update({
      where: { id: existing.id },
      data: {
        occurrenceCount: { increment: 1 },
        preventionPrompt: suggestedFix || existing.preventionPrompt,
      },
    });
  } else {
    // Create new pattern
    await prisma.hallucinationPattern.create({
      data: {
        categoryId,
        subcategoryId,
        styleId,
        triggerKeywords,
        hallucinationType,
        preventionPrompt: suggestedFix,
      },
    });
  }
}

// Update prompt analytics with quality data
async function updatePromptQualityData(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  prompt: string,
  result: AnalysisResult
): Promise<void> {
  // Normalize prompt pattern
  const promptPattern = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .slice(0, 10)
    .join(" ");

  // Determine if this is positive or negative based on scores
  const isPositive = result.promptAlignment >= 70 && !result.hasHallucination;
  const isNegative = result.promptAlignment < 50 || result.hasHallucination;

  // Update or create analytics
  const existing = await prisma.promptAnalytics.findUnique({
    where: {
      categoryId_subcategoryId_styleId_promptPattern: {
        categoryId,
        subcategoryId,
        styleId,
        promptPattern,
      },
    },
  });

  if (existing) {
    const newTotal = existing.totalGenerations + 1;
    const newPositive = existing.positiveCount + (isPositive ? 1 : 0);
    const newNegative = existing.negativeCount + (isNegative ? 1 : 0);
    const newAvgRating =
      (existing.avgRating * existing.totalGenerations + result.promptAlignment) /
      newTotal;

    await prisma.promptAnalytics.update({
      where: { id: existing.id },
      data: {
        totalGenerations: newTotal,
        positiveCount: newPositive,
        negativeCount: newNegative,
        avgRating: newAvgRating,
        bestPromptVariant:
          result.promptAlignment > (existing.avgRating || 0)
            ? prompt
            : existing.bestPromptVariant,
      },
    });
  } else {
    await prisma.promptAnalytics.create({
      data: {
        categoryId,
        subcategoryId,
        styleId,
        promptPattern,
        totalGenerations: 1,
        positiveCount: isPositive ? 1 : 0,
        negativeCount: isNegative ? 1 : 0,
        avgRating: result.promptAlignment,
        bestPromptVariant: prompt,
      },
    });
  }
}

// Queue a generation for analysis
export async function queueForAnalysis(
  generationId: string,
  priority: number = 0
): Promise<void> {
  await prisma.analysisJob.upsert({
    where: { generationId },
    update: { priority },
    create: {
      generationId,
      priority,
      status: "pending",
    },
  });
}

// Process pending analysis jobs (call from cron or background worker)
export async function processPendingJobs(limit: number = 10): Promise<number> {
  // Get pending jobs ordered by priority and creation time
  const jobs = await prisma.analysisJob.findMany({
    where: { status: "pending" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: limit,
  });

  let processed = 0;

  for (const job of jobs) {
    try {
      await processAnalysisJob(job.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process job ${job.id}:`, error);
    }

    // Small delay between jobs to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return processed;
}

// Get analysis statistics
export async function getAnalysisStats(): Promise<{
  totalAnalyzed: number;
  pendingJobs: number;
  avgQualityScore: number;
  avgPromptAlignment: number;
  hallucinationRate: number;
  topIssues: Array<{ type: string; count: number }>;
}> {
  const [
    totalAnalyzed,
    pendingJobs,
    avgScores,
    hallucinationCount,
    topIssues,
  ] = await Promise.all([
    prisma.imageAnalysis.count(),
    prisma.analysisJob.count({ where: { status: "pending" } }),
    prisma.imageAnalysis.aggregate({
      _avg: {
        qualityScore: true,
        promptAlignment: true,
      },
    }),
    prisma.imageAnalysis.count({ where: { hasHallucination: true } }),
    prisma.hallucinationPattern.groupBy({
      by: ["hallucinationType"],
      _sum: { occurrenceCount: true },
      orderBy: { _sum: { occurrenceCount: "desc" } },
      take: 5,
    }),
  ]);

  return {
    totalAnalyzed,
    pendingJobs,
    avgQualityScore: avgScores._avg.qualityScore || 0,
    avgPromptAlignment: avgScores._avg.promptAlignment || 0,
    hallucinationRate:
      totalAnalyzed > 0 ? (hallucinationCount / totalAnalyzed) * 100 : 0,
    topIssues: topIssues.map((i) => ({
      type: i.hallucinationType,
      count: i._sum.occurrenceCount || 0,
    })),
  };
}
