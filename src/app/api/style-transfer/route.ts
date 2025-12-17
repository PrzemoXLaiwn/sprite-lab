import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import Replicate from "replicate";
import { STYLES_2D_FULL } from "@/config";

// ===========================================
// STYLE TRANSFER API
// ===========================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Build style transfer prompt
function buildStyleTransferPrompt(
  description: string,
  targetStyleId: string
): string {
  const style = Object.values(STYLES_2D_FULL).find((s) => s.id === targetStyleId);

  const parts: string[] = [];

  // Base description of the image content
  parts.push(description);

  // Target style
  if (style) {
    parts.push(`in ${style.name} style`);
    parts.push(style.styleCore);
    parts.push(style.rendering);
    parts.push(style.colors);
    parts.push(style.edges);
  }

  // Quality requirements
  parts.push(
    "game asset",
    "high quality",
    "clean edges",
    "consistent style",
    "professional quality"
  );

  return parts.join(", ");
}

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse request
    const body = await request.json();
    const {
      imageUrl,
      description,
      targetStyleId,
      strength = 0.75,
    }: {
      imageUrl: string;
      description: string;
      targetStyleId: string;
      strength?: number;
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image URL is required" },
        { status: 400 }
      );
    }

    if (!description?.trim()) {
      return NextResponse.json(
        { error: "Image description is required" },
        { status: 400 }
      );
    }

    if (!targetStyleId) {
      return NextResponse.json(
        { error: "Target style is required" },
        { status: 400 }
      );
    }

    // Check credits (2 credits for style transfer)
    const creditCost = 2;

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });

    if (!dbUser || dbUser.credits < creditCost) {
      return NextResponse.json(
        {
          error: "Insufficient credits",
          required: creditCost,
          available: dbUser?.credits || 0,
        },
        { status: 402 }
      );
    }

    // Deduct credits atomically
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: creditCost } },
    });

    const seed = Math.floor(Math.random() * 2147483647);
    const prompt = buildStyleTransferPrompt(description, targetStyleId);

    try {
      // Use FLUX Redux for image-to-image style transfer
      // This model takes an input image and transforms it based on the prompt
      const output = await replicate.run(
        "black-forest-labs/flux-1.1-pro",
        {
          input: {
            prompt,
            image: imageUrl,
            prompt_strength: strength, // How much to deviate from original
            num_outputs: 1,
            aspect_ratio: "1:1",
            output_format: "png",
            output_quality: 95,
          },
        }
      );

      const resultUrl = Array.isArray(output) ? output[0] : output;

      if (!resultUrl) {
        // Refund on failure
        await prisma.user.update({
          where: { id: user.id },
          data: { credits: { increment: creditCost } },
        });
        return NextResponse.json(
          { error: "Style transfer failed - no image returned" },
          { status: 500 }
        );
      }

      // Save to database
      const generation = await prisma.generation.create({
        data: {
          userId: user.id,
          prompt: `[Style Transfer] ${prompt}`,
          imageUrl: String(resultUrl),
          categoryId: "EFFECTS",
          subcategoryId: "STYLE_TRANSFER",
          styleId: targetStyleId,
          seed,
          isPublic: false,
        },
      });

      // Get updated credit balance
      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { credits: true },
      });

      return NextResponse.json({
        success: true,
        id: generation.id,
        imageUrl: String(resultUrl),
        originalImageUrl: imageUrl,
        prompt,
        targetStyleId,
        strength,
        seed,
        creditsUsed: creditCost,
        creditsRemaining: updatedUser?.credits || 0,
      });
    } catch (genError) {
      // Refund on generation error
      await prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: creditCost } },
      });

      console.error("Style transfer error:", genError);
      return NextResponse.json(
        {
          error: "Style transfer failed",
          message:
            genError instanceof Error ? genError.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Style transfer API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
