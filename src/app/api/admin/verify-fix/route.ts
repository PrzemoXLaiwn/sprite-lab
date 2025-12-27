import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateImage, removeBackground } from "@/lib/runware";
import { analyzeImage } from "@/lib/analytics/image-analyzer";
import { enhancePromptWithLearnedFixes } from "@/lib/analytics/prompt-enhancer";
import { buildUltimatePrompt } from "@/config";

/**
 * Verification System for Hallucination Fixes
 *
 * Flow:
 * 1. Take original generation that had hallucination
 * 2. Re-generate with same prompt + applied learned fixes
 * 3. Analyze new image with Claude Vision
 * 4. Compare: if hallucination gone → mark as VERIFIED_FIXED
 * 5. If still there → mark as STILL_BROKEN, increase priority
 */

/**
 * Flexible generation finder - tries multiple matching strategies
 * 1. Exact match (category + subcategory + style + hallucinationType)
 * 2. Category + subcategory + hallucinationType
 * 3. Category + hallucinationType
 * 4. Any generation from that category
 */
async function findGenerationForPattern(pattern: {
  hallucinationType: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
}) {
  // Strategy 1: Exact match
  let analysis = await prisma.imageAnalysis.findFirst({
    where: {
      hallucinationType: pattern.hallucinationType,
      generation: {
        categoryId: pattern.categoryId,
        subcategoryId: pattern.subcategoryId,
        styleId: pattern.styleId,
      },
    },
    include: { generation: true },
    orderBy: { createdAt: "desc" },
  });

  if (analysis?.generation) {
    console.log(`[Verify] Found exact match for ${pattern.hallucinationType}`);
    return { analysis, generation: analysis.generation, matchType: "exact" };
  }

  // Strategy 2: Category + subcategory + hallucinationType (any style)
  analysis = await prisma.imageAnalysis.findFirst({
    where: {
      hallucinationType: pattern.hallucinationType,
      generation: {
        categoryId: pattern.categoryId,
        subcategoryId: pattern.subcategoryId,
      },
    },
    include: { generation: true },
    orderBy: { createdAt: "desc" },
  });

  if (analysis?.generation) {
    console.log(`[Verify] Found category+subcategory match for ${pattern.hallucinationType}`);
    return { analysis, generation: analysis.generation, matchType: "category_subcategory" };
  }

  // Strategy 3: Category + hallucinationType (any subcategory)
  analysis = await prisma.imageAnalysis.findFirst({
    where: {
      hallucinationType: pattern.hallucinationType,
      generation: {
        categoryId: pattern.categoryId,
      },
    },
    include: { generation: true },
    orderBy: { createdAt: "desc" },
  });

  if (analysis?.generation) {
    console.log(`[Verify] Found category match for ${pattern.hallucinationType}`);
    return { analysis, generation: analysis.generation, matchType: "category_only" };
  }

  // Strategy 4: Any generation from that category (without hallucination match)
  // This allows testing the fix even without original hallucination data
  const anyGeneration = await prisma.generation.findFirst({
    where: {
      categoryId: pattern.categoryId,
      subcategoryId: pattern.subcategoryId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (anyGeneration) {
    // Create a mock analysis for consistency
    const mockAnalysis = await prisma.imageAnalysis.findFirst({
      where: { generationId: anyGeneration.id },
    });

    console.log(`[Verify] Using any generation from category for ${pattern.hallucinationType}`);
    return {
      analysis: mockAnalysis || {
        hallucinationType: pattern.hallucinationType,
        promptAlignment: 50,
        hasHallucination: true,
      },
      generation: anyGeneration,
      matchType: "fallback_any"
    };
  }

  return null;
}

// POST /api/admin/verify-fix
// Verify a single hallucination fix
export async function POST(request: Request) {
  try {
    // Auth check - admin only
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!dbUser || !["ADMIN", "OWNER"].includes(dbUser.role)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { generationId, hallucinationPatternId } = body;

    if (!generationId && !hallucinationPatternId) {
      return NextResponse.json(
        { error: "Provide either generationId or hallucinationPatternId" },
        { status: 400 }
      );
    }

    let originalGeneration;
    let originalAnalysis;
    let patternToVerify;

    if (generationId) {
      // Get original generation and its analysis
      originalGeneration = await prisma.generation.findUnique({
        where: { id: generationId },
      });

      if (!originalGeneration) {
        return NextResponse.json({ error: "Generation not found" }, { status: 404 });
      }

      originalAnalysis = await prisma.imageAnalysis.findUnique({
        where: { generationId },
      });

      if (!originalAnalysis?.hasHallucination) {
        return NextResponse.json({ error: "This generation has no hallucination to verify" }, { status: 400 });
      }
    } else {
      // Get pattern and find a generation with this pattern
      patternToVerify = await prisma.hallucinationPattern.findUnique({
        where: { id: hallucinationPatternId },
      });

      if (!patternToVerify) {
        return NextResponse.json({ error: "Pattern not found" }, { status: 404 });
      }

      // Find a generation using flexible matching strategy
      const matchResult = await findGenerationForPattern({
        hallucinationType: patternToVerify.hallucinationType,
        categoryId: patternToVerify.categoryId,
        subcategoryId: patternToVerify.subcategoryId,
        styleId: patternToVerify.styleId,
      });

      if (!matchResult) {
        return NextResponse.json({
          error: "No generation found for this pattern",
          suggestion: "Try generating some images in this category first"
        }, { status: 404 });
      }

      originalAnalysis = matchResult.analysis;
      originalGeneration = matchResult.generation;

      console.log(`[Verify] Match type: ${matchResult.matchType} for pattern ${patternToVerify.hallucinationType}`);
    }

    console.log(`[Verify] 🔍 Testing fix for generation ${originalGeneration.id}`);
    console.log(`[Verify] Original hallucination: ${originalAnalysis?.hallucinationType}`);

    // Step 1: Build prompt with the SAME parameters
    const { prompt: basePrompt, negativePrompt: baseNegative } = buildUltimatePrompt(
      originalGeneration.prompt,
      originalGeneration.categoryId,
      originalGeneration.subcategoryId,
      originalGeneration.styleId
    );

    // Step 2: Apply learned fixes (this is what we're testing!)
    const {
      enhancedPrompt,
      enhancedNegative,
      appliedFixes,
    } = await enhancePromptWithLearnedFixes(
      basePrompt,
      baseNegative,
      originalGeneration.categoryId,
      originalGeneration.subcategoryId,
      originalGeneration.styleId
    );

    console.log(`[Verify] Applied ${appliedFixes.length} fixes:`, appliedFixes);

    if (appliedFixes.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No fixes were applied - nothing to verify",
        status: "NO_FIX_AVAILABLE",
      });
    }

    // Step 3: Generate NEW image with fixed prompt - use "starter" for flux-dev quality
    console.log(`[Verify] 🎨 Generating verification image...`);
    const result = await generateImage({
      prompt: enhancedPrompt,
      negativePrompt: enhancedNegative,
      seed: Math.floor(Math.random() * 2147483647), // New seed to test fix broadly
      steps: 25,
      guidance: 3.0,
      width: 1024,
      height: 1024,
    }, "starter");

    if (!result.success || !result.images?.[0]) {
      return NextResponse.json({
        success: false,
        error: "Failed to generate verification image",
        status: "GENERATION_FAILED",
      });
    }

    let verificationImageUrl = result.images[0].imageURL;

    // Remove background for fair comparison
    try {
      const bgResult = await removeBackground(verificationImageUrl);
      if (bgResult.success && bgResult.imageUrl) {
        verificationImageUrl = bgResult.imageUrl;
      }
    } catch (e) {
      console.log("[Verify] Background removal failed, using original");
    }

    // Step 4: Analyze the NEW image
    console.log(`[Verify] 🔬 Analyzing verification image...`);
    const newAnalysis = await analyzeImage(
      verificationImageUrl,
      originalGeneration.prompt,
      originalGeneration.categoryId,
      originalGeneration.subcategoryId,
      originalGeneration.styleId
    );

    // Step 5: Compare results
    const originalHallucinationType = originalAnalysis?.hallucinationType;
    const newHasHallucination = newAnalysis.hasHallucination;
    const newHallucinationType = newAnalysis.hallucinationType;

    // Determine verification status
    let verificationStatus: "VERIFIED_FIXED" | "STILL_BROKEN" | "DIFFERENT_ISSUE" | "IMPROVED";
    let verificationMessage: string;

    if (!newHasHallucination) {
      // No hallucination at all - fix works!
      verificationStatus = "VERIFIED_FIXED";
      verificationMessage = `✅ Hallucination "${originalHallucinationType}" is FIXED! No issues detected.`;
    } else if (newHallucinationType === originalHallucinationType) {
      // Same hallucination still there
      verificationStatus = "STILL_BROKEN";
      verificationMessage = `❌ Hallucination "${originalHallucinationType}" still occurs. Fix needs improvement.`;
    } else if (newAnalysis.promptAlignment > (originalAnalysis?.promptAlignment || 0) + 10) {
      // Different issue but overall improved
      verificationStatus = "IMPROVED";
      verificationMessage = `⚠️ Original issue fixed but new issue "${newHallucinationType}" appeared. Overall quality improved.`;
    } else {
      // Different issue
      verificationStatus = "DIFFERENT_ISSUE";
      verificationMessage = `⚠️ Original "${originalHallucinationType}" fixed but new issue "${newHallucinationType}" appeared.`;
    }

    console.log(`[Verify] Result: ${verificationStatus}`);

    // Step 6: Update database based on result
    if (verificationStatus === "VERIFIED_FIXED") {
      // Mark the pattern as verified
      if (patternToVerify || originalAnalysis?.hallucinationType) {
        await prisma.hallucinationPattern.updateMany({
          where: {
            categoryId: originalGeneration.categoryId,
            subcategoryId: originalGeneration.subcategoryId,
            styleId: originalGeneration.styleId,
            hallucinationType: originalHallucinationType!,
          },
          data: {
            // Add verified flag (you may need to add this field to schema)
            // verifiedAt: new Date(),
            // verificationStatus: "VERIFIED_FIXED",
            isActive: false, // Deactivate the pattern since it's fixed
          },
        });

        // Also update the OptimizedPrompt success rate
        await prisma.optimizedPrompt.updateMany({
          where: {
            categoryId: originalGeneration.categoryId,
            subcategoryId: originalGeneration.subcategoryId,
            styleId: originalGeneration.styleId,
            isActive: true,
          },
          data: {
            avgQualityScore: { increment: 5 }, // Boost confidence
          },
        });
      }
    } else if (verificationStatus === "STILL_BROKEN") {
      // Increase occurrence count to prioritize re-fixing
      await prisma.hallucinationPattern.updateMany({
        where: {
          categoryId: originalGeneration.categoryId,
          subcategoryId: originalGeneration.subcategoryId,
          styleId: originalGeneration.styleId,
          hallucinationType: originalHallucinationType!,
        },
        data: {
          occurrenceCount: { increment: 1 },
          // Clear the prevention prompt so it can be regenerated
          preventionPrompt: null,
        },
      });
    }

    // Save verification record
    await prisma.verificationRecord.create({
      data: {
        originalGenerationId: originalGeneration.id,
        verificationImageUrl,
        originalHallucinationType: originalHallucinationType!,
        appliedFixes: JSON.stringify(appliedFixes),
        newHasHallucination,
        newHallucinationType,
        originalAlignment: originalAnalysis?.promptAlignment || 0,
        newAlignment: newAnalysis.promptAlignment,
        status: verificationStatus,
        message: verificationMessage,
      },
    });

    return NextResponse.json({
      success: true,
      status: verificationStatus,
      message: verificationMessage,
      details: {
        originalHallucination: originalHallucinationType,
        newHallucination: newHallucinationType || null,
        originalAlignment: originalAnalysis?.promptAlignment || 0,
        newAlignment: newAnalysis.promptAlignment,
        appliedFixes,
        verificationImageUrl,
      },
    });

  } catch (error) {
    console.error("[Verify] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Verification failed" },
      { status: 500 }
    );
  }
}

// GET /api/admin/verify-fix
// Get verification statistics
export async function GET(request: Request) {
  try {
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
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get verification stats
    const [
      totalPatterns,
      activePatterns,
      verifiedFixed,
      stillBroken,
      pendingVerification,
    ] = await Promise.all([
      prisma.hallucinationPattern.count(),
      prisma.hallucinationPattern.count({ where: { isActive: true } }),
      prisma.verificationRecord.count({ where: { status: "VERIFIED_FIXED" } }),
      prisma.verificationRecord.count({ where: { status: "STILL_BROKEN" } }),
      prisma.hallucinationPattern.count({
        where: {
          isActive: true,
          preventionPrompt: { not: null },
          // No verification record yet
        },
      }),
    ]);

    // Get patterns that need verification (have fixes but not verified)
    const patternsToVerify = await prisma.hallucinationPattern.findMany({
      where: {
        isActive: true,
        preventionPrompt: { not: null },
      },
      orderBy: { occurrenceCount: "desc" },
      take: 20,
    });

    // Get recent verifications
    const recentVerifications = await prisma.verificationRecord.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        originalGeneration: {
          select: {
            prompt: true,
            categoryId: true,
            subcategoryId: true,
            styleId: true,
          },
        },
      },
    });

    return NextResponse.json({
      stats: {
        totalPatterns,
        activePatterns,
        verifiedFixed,
        stillBroken,
        pendingVerification: patternsToVerify.length,
        fixSuccessRate: verifiedFixed + stillBroken > 0
          ? Math.round((verifiedFixed / (verifiedFixed + stillBroken)) * 100)
          : 0,
      },
      patternsToVerify: patternsToVerify.map(p => ({
        id: p.id,
        categoryId: p.categoryId,
        subcategoryId: p.subcategoryId,
        styleId: p.styleId,
        hallucinationType: p.hallucinationType,
        occurrenceCount: p.occurrenceCount,
        preventionPrompt: p.preventionPrompt,
      })),
      recentVerifications: recentVerifications.map(v => ({
        id: v.id,
        status: v.status,
        message: v.message,
        originalHallucination: v.originalHallucinationType,
        newAlignment: v.newAlignment,
        createdAt: v.createdAt,
        generation: v.originalGeneration,
      })),
    });

  } catch (error) {
    console.error("[Verify Stats] Error:", error);
    return NextResponse.json(
      { error: "Failed to get verification stats" },
      { status: 500 }
    );
  }
}