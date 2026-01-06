import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

// POST - Generate AI-powered prompt optimizations based on all hallucinations
export async function POST(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Gather all hallucination data
    const [
      hallucinationAnalyses,
      hallucinationPatterns,
      problemsByCategory,
    ] = await Promise.all([
      // Get recent problematic analyses with full details
      prisma.imageAnalysis.findMany({
        where: {
          OR: [
            { hasHallucination: true },
            { promptAlignment: { lt: 60 } },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          generation: {
            select: {
              prompt: true,
              categoryId: true,
              subcategoryId: true,
              styleId: true,
            },
          },
        },
      }),
      // Get existing patterns
      prisma.hallucinationPattern.findMany({
        where: { isActive: true },
        orderBy: { occurrenceCount: "desc" },
        take: 30,
      }),
      // Get category stats
      prisma.$queryRaw<Array<{
        categoryId: string;
        subcategoryId: string;
        styleId: string;
        hallucinationRate: number;
        avgAlignment: number;
        totalAnalyses: bigint;
      }>>`
        SELECT
          g."categoryId",
          g."subcategoryId",
          g."styleId",
          (SUM(CASE WHEN ia."hasHallucination" = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ia.id)::float, 0) * 100) as "hallucinationRate",
          AVG(ia."promptAlignment") as "avgAlignment",
          COUNT(ia.id) as "totalAnalyses"
        FROM "ImageAnalysis" ia
        JOIN "Generation" g ON ia."generationId" = g.id
        GROUP BY g."categoryId", g."subcategoryId", g."styleId"
        HAVING (SUM(CASE WHEN ia."hasHallucination" = true THEN 1 ELSE 0 END)::float / NULLIF(COUNT(ia.id)::float, 0) * 100) > 10
           OR AVG(ia."promptAlignment") < 70
        ORDER BY "hallucinationRate" DESC
      `,
    ]);

    if (hallucinationAnalyses.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No hallucinations found to analyze",
        optimizations: [],
      });
    }

    // 2. Prepare data for Claude analysis
    const hallucinationSummary = hallucinationAnalyses.map(a => ({
      prompt: a.generation.prompt,
      category: a.generation.categoryId,
      subcategory: a.generation.subcategoryId,
      style: a.generation.styleId,
      hallucinationType: a.hallucinationType,
      missingElements: a.missingElements,
      extraElements: a.extraElements,
      suggestedFix: a.suggestedFix,
      alignment: a.promptAlignment,
      quality: a.qualityScore,
    }));

    const patternsSummary = hallucinationPatterns.map(p => ({
      category: p.categoryId,
      subcategory: p.subcategoryId,
      style: p.styleId,
      type: p.hallucinationType,
      triggerKeywords: p.triggerKeywords,
      occurrences: p.occurrenceCount,
      currentFix: p.preventionPrompt,
    }));

    const categorySummary = problemsByCategory.map(c => ({
      category: c.categoryId,
      subcategory: c.subcategoryId,
      style: c.styleId,
      hallucinationRate: Number(c.hallucinationRate?.toFixed(1) || 0),
      avgAlignment: Number(c.avgAlignment?.toFixed(1) || 0),
      totalAnalyses: Number(c.totalAnalyses),
    }));

    // 3. Call Claude to analyze and generate optimizations
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const claudeResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [
        {
          role: "user",
          content: `You are an expert at optimizing AI image generation prompts. Analyze these hallucination patterns and generate specific prompt optimizations.

## CONTEXT
This is for a game asset generator using FLUX models (Runware API). Users describe what they want, and the system generates sprites/assets.

## HALLUCINATION DATA (Recent problems)
${JSON.stringify(hallucinationSummary.slice(0, 30), null, 2)}

## RECURRING PATTERNS
${JSON.stringify(patternsSummary, null, 2)}

## PROBLEM CATEGORIES (High hallucination rate or low alignment)
${JSON.stringify(categorySummary, null, 2)}

## YOUR TASK
Analyze ALL this data and generate SPECIFIC prompt optimizations. For each problematic category/style combination, provide:

1. **Root cause analysis** - Why are hallucinations happening?
2. **Optimized prompt template** - A complete prompt template with {subject} placeholder
3. **Required keywords** - Words that MUST be in every prompt for this category
4. **Avoid keywords** - Words that cause problems
5. **Style-specific instructions** - Special handling for pixel art, cartoon, etc.

## OUTPUT FORMAT (JSON)
Return a JSON array of optimizations:
\`\`\`json
{
  "analysis": "Brief overall analysis of the main issues",
  "optimizations": [
    {
      "category": "characters",
      "subcategory": "heroes",
      "style": "pixel-16",
      "rootCause": "Why this combination fails",
      "promptTemplate": "16-bit pixel art sprite, {subject}, visible square pixels, limited 16 color palette, no anti-aliasing, game-ready asset, isolated on transparent background",
      "requiredKeywords": ["pixel art", "visible pixels", "no anti-aliasing"],
      "avoidKeywords": ["smooth", "realistic", "HD", "detailed"],
      "specialInstructions": "Always put style keywords FIRST in prompt"
    }
  ],
  "globalRecommendations": [
    "Always specify output size for pixel art",
    "Use negative phrasing: NOT smooth, NOT blurry"
  ]
}
\`\`\`

Focus on the MOST problematic combinations first. Be SPECIFIC and ACTIONABLE.`,
        },
      ],
    });

    // 4. Parse Claude's response
    const responseText = claudeResponse.content[0].type === "text"
      ? claudeResponse.content[0].text
      : "";

    // Extract JSON from response
    const jsonMatch = responseText.match(/```json\n?([\s\S]*?)\n?```/);
    let optimizationResult;

    if (jsonMatch) {
      try {
        optimizationResult = JSON.parse(jsonMatch[1]);
      } catch {
        // If JSON parsing fails, return raw text
        optimizationResult = {
          analysis: responseText,
          optimizations: [],
          globalRecommendations: [],
        };
      }
    } else {
      // Try parsing the whole response as JSON
      try {
        optimizationResult = JSON.parse(responseText);
      } catch {
        optimizationResult = {
          analysis: responseText,
          optimizations: [],
          globalRecommendations: [],
        };
      }
    }

    // 5. Store optimizations in database
    const storedOptimizations = [];

    for (const opt of optimizationResult.optimizations || []) {
      try {
        // Upsert OptimizedPrompt
        const existing = await prisma.optimizedPrompt.findFirst({
          where: {
            categoryId: opt.category,
            subcategoryId: opt.subcategory,
            styleId: opt.style,
            isActive: true,
          },
        });

        if (existing) {
          // Update existing
          await prisma.optimizedPrompt.update({
            where: { id: existing.id },
            data: {
              promptTemplate: opt.promptTemplate,
              requiredKeywords: JSON.stringify(opt.requiredKeywords || []),
              avoidKeywords: JSON.stringify(opt.avoidKeywords || []),
              version: existing.version + 1,
              updatedAt: new Date(),
            },
          });
          storedOptimizations.push({ ...opt, action: "updated" });
        } else {
          // Create new
          await prisma.optimizedPrompt.create({
            data: {
              categoryId: opt.category,
              subcategoryId: opt.subcategory,
              styleId: opt.style,
              promptTemplate: opt.promptTemplate,
              requiredKeywords: JSON.stringify(opt.requiredKeywords || []),
              avoidKeywords: JSON.stringify(opt.avoidKeywords || []),
              avgQualityScore: 0,
              avgPromptAlignment: 0,
              successCount: 0,
              failureCount: 0,
              version: 1,
              isActive: true,
            },
          });
          storedOptimizations.push({ ...opt, action: "created" });
        }
      } catch (err) {
        console.error("Failed to store optimization:", err);
      }
    }

    return NextResponse.json({
      success: true,
      analysis: optimizationResult.analysis,
      optimizations: storedOptimizations,
      globalRecommendations: optimizationResult.globalRecommendations || [],
      stats: {
        analyzedHallucinations: hallucinationAnalyses.length,
        patternsFound: hallucinationPatterns.length,
        problemCategories: problemsByCategory.length,
        optimizationsGenerated: storedOptimizations.length,
      },
    });
  } catch (error) {
    console.error("Generate optimizations error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate optimizations" },
      { status: 500 }
    );
  }
}

// GET - Get current AI-generated optimizations
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get all active optimized prompts
    const optimizations = await prisma.optimizedPrompt.findMany({
      where: { isActive: true },
      orderBy: [
        { updatedAt: "desc" },
        { avgQualityScore: "desc" },
      ],
    });

    return NextResponse.json({
      optimizations: optimizations.map(o => ({
        id: o.id,
        category: o.categoryId,
        subcategory: o.subcategoryId,
        style: o.styleId,
        promptTemplate: o.promptTemplate,
        requiredKeywords: JSON.parse(o.requiredKeywords || "[]"),
        avoidKeywords: JSON.parse(o.avoidKeywords || "[]"),
        avgQuality: o.avgQualityScore,
        avgAlignment: o.avgPromptAlignment,
        successRate: o.successCount > 0
          ? (o.successCount / (o.successCount + o.failureCount) * 100).toFixed(1)
          : "N/A",
        version: o.version,
        updatedAt: o.updatedAt,
      })),
    });
  } catch (error) {
    console.error("Get optimizations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch optimizations" },
      { status: 500 }
    );
  }
}
