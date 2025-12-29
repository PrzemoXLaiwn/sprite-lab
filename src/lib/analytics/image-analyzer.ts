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

/**
 * Fetch image as base64 to avoid robots.txt issues
 * Claude's URL fetch can be blocked by robots.txt, so we fetch it ourselves
 */
async function fetchImageAsBase64(imageUrl: string): Promise<{ base64: string; mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" }> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine media type
    let mediaType: "image/png" | "image/jpeg" | "image/gif" | "image/webp" = "image/png";
    if (contentType.includes("jpeg") || contentType.includes("jpg")) {
      mediaType = "image/jpeg";
    } else if (contentType.includes("gif")) {
      mediaType = "image/gif";
    } else if (contentType.includes("webp")) {
      mediaType = "image/webp";
    }

    return { base64, mediaType };
  } catch (error) {
    console.error("[ImageAnalyzer] Failed to fetch image as base64:", error);
    throw new Error(`Failed to fetch image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

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
    // Fetch image as base64 to avoid robots.txt blocking issues
    console.log(`[ImageAnalyzer] Fetching image as base64...`);
    const { base64, mediaType } = await fetchImageAsBase64(imageUrl);
    console.log(`[ImageAnalyzer] Image fetched (${mediaType}, ${Math.round(base64.length / 1024)}KB)`);

    // Call Claude Vision API with base64 image
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
                type: "base64",
                media_type: mediaType,
                data: base64,
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

    // Parse JSON response - handle markdown code blocks
    let jsonText = textContent.text.trim();

    // Remove markdown code block if present (```json ... ``` or ``` ... ```)
    if (jsonText.startsWith("```")) {
      // Find the end of the first line (after ```json or ```)
      const firstNewline = jsonText.indexOf("\n");
      if (firstNewline !== -1) {
        jsonText = jsonText.substring(firstNewline + 1);
      }
      // Remove trailing ```
      if (jsonText.endsWith("```")) {
        jsonText = jsonText.slice(0, -3);
      }
      jsonText = jsonText.trim();
    }

    const analysis = JSON.parse(jsonText);

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
    // Check for specific API errors
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Credit balance error - don't retry
    if (errorMessage.includes("credit balance") || errorMessage.includes("upgrade or purchase")) {
      console.error("[Analyzer] ❌ Anthropic API credits exhausted");
      throw new Error("CREDITS_EXHAUSTED: Anthropic API credits are empty. Please add credits at console.anthropic.com");
    }

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

    // If hallucination detected, track the pattern AND AUTO-FIX
    if (result.hasHallucination && result.hallucinationType) {
      await trackHallucinationPattern(
        generation.categoryId,
        generation.subcategoryId,
        generation.styleId || "PIXEL_ART_16",
        generation.prompt,
        result.hallucinationType,
        result.suggestedFix,
        result.missingElements,
        result.extraElements
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

// Track hallucination patterns for prevention AND AUTO-FIX IMMEDIATELY
async function trackHallucinationPattern(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  prompt: string,
  hallucinationType: string,
  suggestedFix?: string,
  missingElements?: string[],
  extraElements?: string[]
): Promise<void> {
  // Extract keywords from prompt
  const keywords = prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 10);

  const triggerKeywords = JSON.stringify(keywords);

  // Auto-generate SHORT, EFFECTIVE prevention prompt based on hallucination type
  // 🔥 CRITICAL: Keep these SHORT (max 5 words) for FLUX compatibility!
  let autoFix = "";

  // First try to extract short keywords from suggestedFix
  if (suggestedFix) {
    const words = suggestedFix.split(/\s+/);
    if (words.length <= 5) {
      autoFix = suggestedFix;
    } else {
      // Extract quoted phrases
      const quoted = suggestedFix.match(/['"]([^'"]+)['"]/g);
      if (quoted && quoted.length > 0) {
        autoFix = quoted.map(q => q.replace(/['"]/g, '')).slice(0, 2).join(', ');
      }
    }
  }

  // If no good fix from suggestion, generate based on type
  if (!autoFix) {
    if (hallucinationType === "missing_element" && missingElements && missingElements.length > 0) {
      // Just list the missing elements (short!)
      autoFix = missingElements.slice(0, 3).join(", ");
    } else if (hallucinationType === "wrong_element" && extraElements && extraElements.length > 0) {
      // Short negative: "no X"
      autoFix = `no ${extraElements[0]}`;
    } else if (hallucinationType === "style_mismatch") {
      autoFix = "exact style match";
    } else if (hallucinationType === "extra_element") {
      autoFix = "single object only";
    }
  }

  // Ensure autoFix is max 5 words
  if (autoFix) {
    const fixWords = autoFix.split(/\s+/);
    if (fixWords.length > 5) {
      autoFix = fixWords.slice(0, 5).join(' ');
    }
  }

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
        preventionPrompt: autoFix || existing.preventionPrompt,
      },
    });
    console.log(`[AutoFix] Updated pattern ${hallucinationType} (count: ${existing.occurrenceCount + 1})`);
  } else {
    // Create new pattern
    await prisma.hallucinationPattern.create({
      data: {
        categoryId,
        subcategoryId,
        styleId,
        triggerKeywords,
        hallucinationType,
        preventionPrompt: autoFix,
      },
    });
    console.log(`[AutoFix] Created new pattern ${hallucinationType} for ${categoryId}/${subcategoryId}`);
  }

  // IMMEDIATE AUTO-FIX: Apply fix to optimized prompts
  await applyImmediateAutoFix(categoryId, subcategoryId, styleId, hallucinationType, autoFix, missingElements, extraElements);
}

// Apply immediate auto-fix to the prompt system
async function applyImmediateAutoFix(
  categoryId: string,
  subcategoryId: string,
  styleId: string,
  hallucinationType: string,
  preventionPrompt?: string,
  missingElements?: string[],
  extraElements?: string[]
): Promise<void> {
  try {
    // Get current optimized prompt if exists
    const currentPrompt = await prisma.optimizedPrompt.findFirst({
      where: { categoryId, subcategoryId, styleId, isActive: true },
      orderBy: { version: "desc" },
    });

    // Build enhanced requirements based on the issue
    const newRequirements: string[] = [];
    const newAvoidKeywords: string[] = [];

    if (hallucinationType === "missing_element" && missingElements) {
      newRequirements.push(...missingElements);
    }
    if ((hallucinationType === "wrong_element" || hallucinationType === "extra_element") && extraElements) {
      newAvoidKeywords.push(...extraElements);
    }
    if (hallucinationType === "style_mismatch") {
      newRequirements.push("strict style adherence");
    }
    if (preventionPrompt) {
      newRequirements.push(preventionPrompt);
    }

    // Merge with existing or create new
    let requiredKeywords: string[] = [];
    let avoidKeywords: string[] = [];

    if (currentPrompt) {
      try {
        requiredKeywords = JSON.parse(currentPrompt.requiredKeywords || "[]");
        avoidKeywords = JSON.parse(currentPrompt.avoidKeywords || "[]");
      } catch { /* ignore parse errors */ }
    }

    // Add new requirements (avoid duplicates)
    for (const req of newRequirements) {
      if (req && !requiredKeywords.includes(req)) {
        requiredKeywords.push(req);
      }
    }
    for (const avoid of newAvoidKeywords) {
      if (avoid && !avoidKeywords.includes(avoid)) {
        avoidKeywords.push(avoid);
      }
    }

    // Only update if we have something new to add
    if (newRequirements.length === 0 && newAvoidKeywords.length === 0) {
      return;
    }

    // Build template with fix
    const template = currentPrompt?.promptTemplate ||
      `{subject}, single game asset, centered composition, transparent background`;

    const enhancedTemplate = preventionPrompt
      ? `${template}, ${preventionPrompt}`
      : template;

    const newVersion = (currentPrompt?.version || 0) + 1;

    // Deactivate old version
    if (currentPrompt) {
      await prisma.optimizedPrompt.update({
        where: { id: currentPrompt.id },
        data: { isActive: false },
      });
    }

    // Create new optimized prompt with fix
    await prisma.optimizedPrompt.create({
      data: {
        categoryId,
        subcategoryId,
        styleId,
        promptTemplate: enhancedTemplate,
        requiredKeywords: JSON.stringify(requiredKeywords),
        avoidKeywords: JSON.stringify(avoidKeywords),
        version: newVersion,
        previousVersion: currentPrompt?.id,
        isActive: true,
      },
    });

    console.log(`[AutoFix] ✅ APPLIED IMMEDIATE FIX for ${categoryId}/${subcategoryId}/${styleId} v${newVersion}`);
    console.log(`[AutoFix] Required keywords: ${requiredKeywords.slice(0, 5).join(", ")}`);
    console.log(`[AutoFix] Avoid keywords: ${avoidKeywords.slice(0, 5).join(", ")}`);
  } catch (error) {
    console.error("[AutoFix] Failed to apply immediate fix:", error);
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
