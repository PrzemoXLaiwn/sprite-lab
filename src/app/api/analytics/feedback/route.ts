import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST - Submit feedback for a generation
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { generationId, rating, feedbackType = "thumbs", comment, issues } = body;

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    if (rating === undefined || rating === null) {
      return NextResponse.json(
        { error: "Rating is required" },
        { status: 400 }
      );
    }

    // Verify the generation exists and belongs to user (or is public)
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) {
      return NextResponse.json(
        { error: "Generation not found" },
        { status: 404 }
      );
    }

    // Upsert feedback (update if exists, create if not)
    const feedback = await prisma.generationFeedback.upsert({
      where: {
        generationId_userId: {
          generationId,
          userId: user.id,
        },
      },
      update: {
        rating,
        feedbackType,
        comment,
        issues: issues ? JSON.stringify(issues) : null,
      },
      create: {
        generationId,
        userId: user.id,
        rating,
        feedbackType,
        comment,
        issues: issues ? JSON.stringify(issues) : null,
      },
    });

    // Update prompt analytics asynchronously
    updatePromptAnalytics(generation, rating).catch(console.error);

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET - Get feedback for a generation
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const generationId = searchParams.get("generationId");

    if (!generationId) {
      return NextResponse.json(
        { error: "Generation ID is required" },
        { status: 400 }
      );
    }

    const feedback = await prisma.generationFeedback.findUnique({
      where: {
        generationId_userId: {
          generationId,
          userId: user.id,
        },
      },
    });

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("Get feedback error:", error);
    return NextResponse.json(
      { error: "Failed to get feedback" },
      { status: 500 }
    );
  }
}

// Helper function to update prompt analytics
async function updatePromptAnalytics(
  generation: { categoryId: string; subcategoryId: string; styleId: string; prompt: string },
  rating: number
) {
  // Normalize prompt to keywords (simple version - can be enhanced with NLP)
  const promptPattern = generation.prompt
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .sort()
    .slice(0, 10) // Keep top 10 keywords
    .join(" ");

  const isPositive = rating > 0 || rating >= 4;
  const isNegative = rating < 0 || rating <= 2;

  try {
    // Try to update existing analytics
    const existing = await prisma.promptAnalytics.findUnique({
      where: {
        categoryId_subcategoryId_styleId_promptPattern: {
          categoryId: generation.categoryId,
          subcategoryId: generation.subcategoryId,
          styleId: generation.styleId,
          promptPattern,
        },
      },
    });

    if (existing) {
      const newTotal = existing.totalGenerations + 1;
      const newPositive = existing.positiveCount + (isPositive ? 1 : 0);
      const newNegative = existing.negativeCount + (isNegative ? 1 : 0);
      const totalRated = newPositive + newNegative;
      const newAvgRating = totalRated > 0 ? (newPositive / totalRated) * 5 : 0;

      await prisma.promptAnalytics.update({
        where: { id: existing.id },
        data: {
          totalGenerations: newTotal,
          positiveCount: newPositive,
          negativeCount: newNegative,
          avgRating: newAvgRating,
        },
      });
    } else {
      await prisma.promptAnalytics.create({
        data: {
          categoryId: generation.categoryId,
          subcategoryId: generation.subcategoryId,
          styleId: generation.styleId,
          promptPattern,
          totalGenerations: 1,
          positiveCount: isPositive ? 1 : 0,
          negativeCount: isNegative ? 1 : 0,
          avgRating: isPositive ? 5 : isNegative ? 1 : 3,
        },
      });
    }
  } catch (error) {
    console.error("Failed to update prompt analytics:", error);
  }
}
