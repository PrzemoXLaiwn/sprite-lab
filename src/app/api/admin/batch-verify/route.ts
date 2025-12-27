import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { generateImage, removeBackground } from "@/lib/runware";
import { analyzeImage } from "@/lib/analytics/image-analyzer";
import { enhancePromptWithLearnedFixes } from "@/lib/analytics/prompt-enhancer";
import { buildUltimatePrompt } from "@/config";

/**
 * Batch Verification System
 * Automatically verifies multiple hallucination fixes
 */

// POST /api/admin/batch-verify
// Run batch verification on patterns with fixes
export async function POST(request: Request) {
  try {
    // Auth check - admin only
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

    const body = await request.json();
    const { 
      limit = 5,           // How many to verify at once
      categoryId,          // Optional: filter by category
      minOccurrences = 2,  // Only verify patterns that occurred multiple times
    } = body;

    // Get patterns that need verification
    const patternsToVerify = await prisma.hallucinationPattern.findMany({
      where: {
        isActive: true,
        preventionPrompt: { not: null },
        occurrenceCount: { gte: minOccurrences },
        ...(categoryId && { categoryId }),
      },
      orderBy: { occurrenceCount: "desc" },
      take: limit,
    });

    if (patternsToVerify.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No patterns need verification",
        results: [],
      });
    }

    console.log(`[BatchVerify] Starting verification of ${patternsToVerify.length} patterns`);

    const results: Array<{
      patternId: string;
      hallucinationType: string;
      category: string;
      status: string;
      message: string;
    }> = [];

    for (const pattern of patternsToVerify) {
      try {
        console.log(`[BatchVerify] Testing: ${pattern.hallucinationType} for ${pattern.categoryId}/${pattern.subcategoryId}`);

        // Find a generation with this hallucination
        const originalAnalysis = await prisma.imageAnalysis.findFirst({
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

        if (!originalAnalysis?.generation) {
          results.push({
            patternId: pattern.id,
            hallucinationType: pattern.hallucinationType,
            category: `${pattern.categoryId}/${pattern.subcategoryId}`,
            status: "SKIPPED",
            message: "No original generation found to test against",
          });
          continue;
        }

        const gen = originalAnalysis.generation;

        // Build and enhance prompt
        const { prompt: basePrompt, negativePrompt: baseNegative } = buildUltimatePrompt(
          gen.prompt,
          gen.categoryId,
          gen.subcategoryId,
          gen.styleId
        );

        const { enhancedPrompt, enhancedNegative, appliedFixes } = await enhancePromptWithLearnedFixes(
          basePrompt,
          baseNegative,
          gen.categoryId,
          gen.subcategoryId,
          gen.styleId
        );

        if (appliedFixes.length === 0) {
          results.push({
            patternId: pattern.id,
            hallucinationType: pattern.hallucinationType,
            category: `${pattern.categoryId}/${pattern.subcategoryId}`,
            status: "NO_FIX",
            message: "No fixes were applied",
          });
          continue;
        }

        // Generate verification image - use "starter" tier for better quality (flux-dev)
        const result = await generateImage({
          prompt: enhancedPrompt,
          negativePrompt: enhancedNegative,
          seed: Math.floor(Math.random() * 2147483647),
          steps: 25,
          guidance: 3.0,
          width: 1024,
          height: 1024,
        }, "starter");

        if (!result.success || !result.images?.[0]) {
          results.push({
            patternId: pattern.id,
            hallucinationType: pattern.hallucinationType,
            category: `${pattern.categoryId}/${pattern.subcategoryId}`,
            status: "GENERATION_FAILED",
            message: "Failed to generate verification image",
          });
          continue;
        }

        let verificationImageUrl = result.images[0].imageURL;

        // Remove background
        try {
          const bgResult = await removeBackground(verificationImageUrl);
          if (bgResult.success && bgResult.imageUrl) {
            verificationImageUrl = bgResult.imageUrl;
          }
        } catch (e) { /* ignore */ }

        // Analyze
        const newAnalysis = await analyzeImage(
          verificationImageUrl,
          gen.prompt,
          gen.categoryId,
          gen.subcategoryId,
          gen.styleId
        );

        // Determine status
        let status: string;
        let message: string;

        if (!newAnalysis.hasHallucination) {
          status = "VERIFIED_FIXED";
          message = `✅ Fixed! No hallucination detected.`;
          
          // Deactivate the pattern
          await prisma.hallucinationPattern.update({
            where: { id: pattern.id },
            data: { isActive: false },
          });
        } else if (newAnalysis.hallucinationType === pattern.hallucinationType) {
          status = "STILL_BROKEN";
          message = `❌ Still broken. Same hallucination persists.`;
          
          // Clear the prevention prompt for re-learning
          await prisma.hallucinationPattern.update({
            where: { id: pattern.id },
            data: { 
              preventionPrompt: null,
              occurrenceCount: { increment: 1 },
            },
          });
        } else {
          status = "DIFFERENT_ISSUE";
          message = `⚠️ Original fixed but new issue: ${newAnalysis.hallucinationType}`;
        }

        // Save verification record
        await prisma.verificationRecord.create({
          data: {
            originalGenerationId: gen.id,
            verificationImageUrl,
            originalHallucinationType: pattern.hallucinationType,
            appliedFixes: JSON.stringify(appliedFixes),
            newHasHallucination: newAnalysis.hasHallucination,
            newHallucinationType: newAnalysis.hallucinationType,
            originalAlignment: originalAnalysis.promptAlignment || 0,
            newAlignment: newAnalysis.promptAlignment,
            status,
            message,
          },
        });

        results.push({
          patternId: pattern.id,
          hallucinationType: pattern.hallucinationType,
          category: `${pattern.categoryId}/${pattern.subcategoryId}`,
          status,
          message,
        });

        // Delay between verifications to avoid rate limits
        await new Promise(r => setTimeout(r, 2000));

      } catch (error) {
        console.error(`[BatchVerify] Error verifying pattern ${pattern.id}:`, error);
        results.push({
          patternId: pattern.id,
          hallucinationType: pattern.hallucinationType,
          category: `${pattern.categoryId}/${pattern.subcategoryId}`,
          status: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Summary
    const summary = {
      total: results.length,
      verified: results.filter(r => r.status === "VERIFIED_FIXED").length,
      broken: results.filter(r => r.status === "STILL_BROKEN").length,
      different: results.filter(r => r.status === "DIFFERENT_ISSUE").length,
      errors: results.filter(r => r.status === "ERROR" || r.status === "GENERATION_FAILED").length,
    };

    console.log(`[BatchVerify] Complete:`, summary);

    return NextResponse.json({
      success: true,
      summary,
      results,
    });

  } catch (error) {
    console.error("[BatchVerify] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Batch verification failed" },
      { status: 500 }
    );
  }
}


// DELETE /api/admin/batch-verify
// Clean up verified/fixed hallucinations
export async function DELETE(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const mode = searchParams.get("mode") || "verified_only";

    let deletedPatterns = 0;
    let deletedAnalyses = 0;

    if (mode === "verified_only") {
      // Only delete patterns that are verified fixed
      const verifiedPatternTypes = await prisma.verificationRecord.findMany({
        where: { status: "VERIFIED_FIXED" },
        select: {
          originalHallucinationType: true,
          originalGeneration: {
            select: {
              categoryId: true,
              subcategoryId: true,
              styleId: true,
            },
          },
        },
        distinct: ["originalHallucinationType"],
      });

      for (const record of verifiedPatternTypes) {
        const gen = record.originalGeneration;
        
        // Delete the inactive patterns
        const deleted = await prisma.hallucinationPattern.deleteMany({
          where: {
            categoryId: gen.categoryId,
            subcategoryId: gen.subcategoryId,
            styleId: gen.styleId,
            hallucinationType: record.originalHallucinationType,
            isActive: false,
          },
        });
        
        deletedPatterns += deleted.count;
      }

      // Also delete old analyses that had these fixed hallucinations
      // (keeping the generation record, just clearing the analysis)
      const updatedAnalyses = await prisma.imageAnalysis.updateMany({
        where: {
          hasHallucination: true,
          hallucinationType: {
            in: verifiedPatternTypes.map(v => v.originalHallucinationType),
          },
        },
        data: {
          // Mark as resolved (you could also delete or keep for history)
          hasHallucination: false,
          hallucinationType: null,
          suggestedFix: null,
        },
      });

      deletedAnalyses = updatedAnalyses.count;

    } else if (mode === "all_inactive") {
      // Delete all inactive patterns (more aggressive)
      const deleted = await prisma.hallucinationPattern.deleteMany({
        where: { isActive: false },
      });
      deletedPatterns = deleted.count;

    } else if (mode === "reset_style_mismatch") {
      // Reset only style_mismatch patterns - they need to re-learn with new prompts
      const deletedPatterns = await prisma.hallucinationPattern.deleteMany({
        where: { hallucinationType: "style_mismatch" },
      });

      const deletedVerifications = await prisma.verificationRecord.deleteMany({
        where: { originalHallucinationType: "style_mismatch" },
      });

      // Also clear style_mismatch from optimizedPrompts
      const clearedOptimized = await prisma.optimizedPrompt.updateMany({
        data: {
          requiredKeywords: null,
          avoidKeywords: null,
        },
      });

      return NextResponse.json({
        success: true,
        message: `Reset style_mismatch: ${deletedPatterns.count} patterns, ${deletedVerifications.count} verifications, ${clearedOptimized.count} optimized prompts cleared`,
        mode: "reset_style_mismatch",
        deletedPatterns: deletedPatterns.count,
        deletedVerifications: deletedVerifications.count,
      });

    } else if (mode === "reset_all") {
      // Nuclear option - reset everything
      await prisma.$transaction([
        prisma.verificationRecord.deleteMany({}),
        prisma.hallucinationPattern.deleteMany({}),
        prisma.optimizedPrompt.deleteMany({}),
        prisma.imageAnalysis.updateMany({
          data: {
            hasHallucination: false,
            hallucinationType: null,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "All verification data has been reset",
        mode: "reset_all",
      });
    }

    return NextResponse.json({
      success: true,
      message: `Cleanup complete`,
      deletedPatterns,
      clearedAnalyses: deletedAnalyses,
      mode,
    });

  } catch (error) {
    console.error("[Cleanup] Error:", error);
    return NextResponse.json(
      { error: "Cleanup failed" },
      { status: 500 }
    );
  }
}