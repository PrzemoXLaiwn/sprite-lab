import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// POST - Track a generation event
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
    const { generationId, eventType, metadata } = body;

    if (!generationId || !eventType) {
      return NextResponse.json(
        { error: "Generation ID and event type are required" },
        { status: 400 }
      );
    }

    // Validate event type
    const validEvents = [
      "view",
      "download",
      "share",
      "regenerate",
      "edit",
      "delete",
      "favorite",
      "unfavorite",
      "copy_prompt",
      "playground_test",
    ];

    if (!validEvents.includes(eventType)) {
      return NextResponse.json(
        { error: "Invalid event type" },
        { status: 400 }
      );
    }

    // Create event
    const event = await prisma.generationEvent.create({
      data: {
        generationId,
        userId: user.id,
        eventType,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    // Update prompt analytics rates asynchronously
    updateAnalyticsRates(generationId, eventType).catch(console.error);

    return NextResponse.json({
      success: true,
      event,
    });
  } catch (error) {
    console.error("Event tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track event" },
      { status: 500 }
    );
  }
}

// Helper to update analytics rates based on events
async function updateAnalyticsRates(generationId: string, eventType: string) {
  try {
    const generation = await prisma.generation.findUnique({
      where: { id: generationId },
    });

    if (!generation) return;

    // Normalize prompt pattern
    const promptPattern = generation.prompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .sort()
      .slice(0, 10)
      .join(" ");

    const analytics = await prisma.promptAnalytics.findUnique({
      where: {
        categoryId_subcategoryId_styleId_promptPattern: {
          categoryId: generation.categoryId,
          subcategoryId: generation.subcategoryId,
          styleId: generation.styleId,
          promptPattern,
        },
      },
    });

    if (!analytics) return;

    // Calculate new rates based on event type
    const totalGens = analytics.totalGenerations || 1;

    // Get all generation IDs for this category/style combination
    const relatedGenerations = await prisma.generation.findMany({
      where: {
        categoryId: generation.categoryId,
        subcategoryId: generation.subcategoryId,
        styleId: generation.styleId,
      },
      select: { id: true },
    });

    const generationIds = relatedGenerations.map((g) => g.id);

    // Get event counts for generations in this pattern
    const [downloadCount, shareCount, regenerateCount] = await Promise.all([
      prisma.generationEvent.count({
        where: {
          eventType: "download",
          generationId: { in: generationIds },
        },
      }),
      prisma.generationEvent.count({
        where: {
          eventType: "share",
          generationId: { in: generationIds },
        },
      }),
      prisma.generationEvent.count({
        where: {
          eventType: "regenerate",
          generationId: { in: generationIds },
        },
      }),
    ]);

    await prisma.promptAnalytics.update({
      where: { id: analytics.id },
      data: {
        downloadRate: (downloadCount / totalGens) * 100,
        shareRate: (shareCount / totalGens) * 100,
        regenerateRate: (regenerateCount / totalGens) * 100,
      },
    });
  } catch (error) {
    console.error("Failed to update analytics rates:", error);
  }
}
