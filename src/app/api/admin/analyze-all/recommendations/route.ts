import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 120;
export const dynamic = "force-dynamic";

// POST - Generate concrete prompt config recommendations using Claude
// based on all analysis data we've collected
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    // Gather ALL analysis data
    const [
      worstCombos,
      hallucinationPatterns,
      bestPrompts,
      totalStats,
    ] = await Promise.all([
      // Worst performing category/subcategory/style combos
      prisma.$queryRaw<Array<{
        category_id: string;
        subcategory_id: string;
        style_id: string;
        count: bigint;
        avg_alignment: number;
        avg_quality: number;
        hallucination_count: bigint;
        sample_prompts: string;
        missing_elements: string;
        extra_elements: string;
        suggested_fixes: string;
      }>>`
        SELECT
          g.category_id,
          g.subcategory_id,
          g.style_id,
          COUNT(*)::bigint as count,
          ROUND(AVG(ia.prompt_alignment)::numeric, 1) as avg_alignment,
          ROUND(AVG(ia.quality_score)::numeric, 1) as avg_quality,
          COUNT(CASE WHEN ia.has_hallucination THEN 1 END)::bigint as hallucination_count,
          STRING_AGG(DISTINCT LEFT(g.prompt, 100), ' | ' ORDER BY LEFT(g.prompt, 100)) as sample_prompts,
          STRING_AGG(DISTINCT ia.missing_elements, ' | ' ORDER BY ia.missing_elements) as missing_elements,
          STRING_AGG(DISTINCT ia.extra_elements, ' | ' ORDER BY ia.extra_elements) as extra_elements,
          STRING_AGG(DISTINCT ia.suggested_fix, ' | ' ORDER BY ia.suggested_fix) as suggested_fixes
        FROM generations g
        JOIN image_analyses ia ON ia.generation_id = g.id
        GROUP BY g.category_id, g.subcategory_id, g.style_id
        ORDER BY AVG(ia.prompt_alignment) ASC
        LIMIT 20
      `,
      // All active hallucination patterns
      prisma.hallucinationPattern.findMany({
        where: { isActive: true, occurrenceCount: { gte: 2 } },
        orderBy: { occurrenceCount: "desc" },
        take: 30,
      }),
      // Best performing prompts (to learn FROM)
      prisma.$queryRaw<Array<{
        category_id: string;
        subcategory_id: string;
        style_id: string;
        prompt: string;
        full_prompt: string | null;
        alignment: number;
        quality: number;
      }>>`
        SELECT
          g.category_id,
          g.subcategory_id,
          g.style_id,
          g.prompt,
          g.full_prompt,
          ia.prompt_alignment as alignment,
          ia.quality_score as quality
        FROM generations g
        JOIN image_analyses ia ON ia.generation_id = g.id
        WHERE ia.prompt_alignment >= 80
          AND ia.has_hallucination = false
          AND ia.quality_score >= 75
        ORDER BY ia.prompt_alignment DESC
        LIMIT 30
      `,
      // Overall stats
      prisma.imageAnalysis.aggregate({
        _avg: { qualityScore: true, promptAlignment: true, styleAccuracy: true },
        _count: true,
      }),
    ]);

    // Build analysis context for Claude
    const analysisContext = `
SPRITELAB GENERATION ANALYSIS DATA
===================================

OVERALL: ${totalStats._count} images analyzed
Average Quality: ${totalStats._avg.qualityScore?.toFixed(1)}/100
Average Prompt Alignment: ${totalStats._avg.promptAlignment?.toFixed(1)}/100
Average Style Accuracy: ${totalStats._avg.styleAccuracy?.toFixed(1)}/100

WORST PERFORMING COMBINATIONS (need fixes):
${worstCombos.map(w => `
- ${w.category_id} / ${w.subcategory_id} / ${w.style_id}
  Count: ${Number(w.count)}, Avg Alignment: ${w.avg_alignment}%, Hallucination Rate: ${Number(w.count) > 0 ? Math.round(Number(w.hallucination_count) / Number(w.count) * 100) : 0}%
  Sample prompts: ${w.sample_prompts?.slice(0, 200)}
  Missing elements: ${w.missing_elements?.slice(0, 200)}
  Extra elements: ${w.extra_elements?.slice(0, 200)}
  AI suggestions: ${w.suggested_fixes?.slice(0, 300)}
`).join("")}

RECURRING HALLUCINATION PATTERNS:
${hallucinationPatterns.map(p => `
- ${p.categoryId}/${p.subcategoryId}/${p.styleId}: ${p.hallucinationType} (${p.occurrenceCount}x)
  Triggers: ${p.triggerKeywords}
  Current fix: ${p.preventionPrompt || "NONE"}
`).join("")}

BEST PERFORMING PROMPTS (learn from these):
${bestPrompts.slice(0, 15).map(b => `
- ${b.category_id}/${b.subcategory_id}/${b.style_id}: alignment=${b.alignment}%, quality=${b.quality}%
  User prompt: "${b.prompt}"
  Full system prompt: "${b.full_prompt?.slice(0, 300)}"
`).join("")}
`;

    // Ask Claude to generate concrete prompt config recommendations
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{
        role: "user",
        content: `You are an expert at optimizing AI image generation prompts for FLUX model.

Based on this analysis data from our game asset generator, give me CONCRETE prompt config fixes.

${analysisContext}

IMPORTANT CONTEXT:
- We use FLUX model (NOT Stable Diffusion). FLUX works best with:
  - Short, direct prompts (not long negative lists)
  - Guidance scale 2.0-4.0 (NOT 7-9 like SDXL)
  - Positive reinforcement works better than negative
  - 20-28 steps optimal
- Our prompt structure is: objectType + userPrompt + styleCore + composition + isolation
- Each subcategory config has: objectType, visualDesc, composition, avoid

For each broken combination, provide:
1. What's wrong (based on the data)
2. Exact objectType fix (keep under 15 words, use (( )) for emphasis)
3. Exact avoid keywords to add
4. Any negative prompt additions

Respond in JSON format:
{
  "fixes": [
    {
      "category": "CATEGORY_ID",
      "subcategory": "SUBCATEGORY_ID",
      "style": "STYLE_ID or ALL",
      "problem": "what's wrong",
      "objectType": "new objectType string",
      "addToAvoid": ["keyword1", "keyword2"],
      "addToNegative": ["neg1", "neg2"],
      "compositionFix": "new composition if needed or null",
      "confidence": 0-100
    }
  ],
  "globalFixes": [
    {
      "scope": "all categories" or "pixel art styles" etc,
      "fix": "what to change",
      "reason": "why"
    }
  ],
  "summary": "1-2 paragraph summary of main issues and fixes"
}

Be CONCRETE and SPECIFIC. No vague advice.`,
      }],
    });

    const textContent = response.content.find(c => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    // Parse JSON response
    let jsonText = textContent.text.trim();
    if (jsonText.startsWith("```")) {
      const firstNewline = jsonText.indexOf("\n");
      if (firstNewline !== -1) jsonText = jsonText.substring(firstNewline + 1);
      if (jsonText.endsWith("```")) jsonText = jsonText.slice(0, -3);
      jsonText = jsonText.trim();
    }

    const recommendations = JSON.parse(jsonText);

    return NextResponse.json({
      success: true,
      analysisDataUsed: {
        totalAnalyzed: totalStats._count,
        worstCombinations: worstCombos.length,
        hallucinationPatterns: hallucinationPatterns.length,
        bestPrompts: bestPrompts.length,
      },
      recommendations,
    });
  } catch (error) {
    console.error("[Recommendations] Error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Failed",
    }, { status: 500 });
  }
}
