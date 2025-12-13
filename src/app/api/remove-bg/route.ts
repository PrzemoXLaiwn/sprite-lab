import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getUserCredits, checkAndDeductCredits, refundCredits } from "@/lib/database";
import { prisma } from "@/lib/prisma";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Cost: 1 credit for background removal
const REMOVE_BG_COST = 1;

// Plans that have access to Remove BG (SPARK is excluded!)
const ALLOWED_PLANS = ["FORGE", "INFINITE", "LIFETIME"];

export async function POST(request: Request) {
  try {
    // Authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in" },
        { status: 401 }
      );
    }

    // Check user credits and plan
    const { credits, plan, role } = await getUserCredits(user.id);

    // Only FORGE, INFINITE, LIFETIME plans can use Remove BG (admins/owners always have access)
    const hasPremiumAccess = ALLOWED_PLANS.includes(plan) || role === "OWNER" || role === "ADMIN";

    if (!hasPremiumAccess) {
      return NextResponse.json(
        { error: "Background removal is available for Forge, Infinite, and Lifetime plans. Upgrade to unlock this feature!" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { imageUrl, originalPrompt, categoryId, subcategoryId, styleId, generationId } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "No image URL provided" },
        { status: 400 }
      );
    }

    console.log("===========================================");
    console.log("REMOVING BACKGROUND (BRIA RMBG 2.0)");
    console.log("===========================================");
    console.log("Input image URL:", imageUrl);

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, REMOVE_BG_COST);
    if (!creditResult.success) {
      const errorMsg = creditResult.error === "INSUFFICIENT_CREDITS"
        ? `Not enough credits. Background removal costs ${REMOVE_BG_COST} credit.`
        : "Failed to process credits. Please try again.";
      return NextResponse.json(
        { error: errorMsg, noCredits: creditResult.error === "INSUFFICIENT_CREDITS" },
        { status: 402 }
      );
    }

    console.log(`Atomically deducted ${REMOVE_BG_COST} credit for background removal`);

    // Use BRIA RMBG 2.0 - State-of-the-art background removal model
    // Much better quality than rembg, especially for complex edges and fine details
    const prediction = await replicate.predictions.create({
      version: "d75a83de0c4beaf30f1dd0f3dfb27541406e304b5b4bfc52e6848f4f6dc9a5ad",
      input: {
        image: imageUrl,
      }
    });

    console.log("Prediction created:", prediction.id);

    // Wait for completion
    let result = await replicate.predictions.get(prediction.id);
    let waitTime = 0;
    const maxWait = 60;

    while (
      (result.status === "starting" || result.status === "processing") &&
      waitTime < maxWait
    ) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
      waitTime++;

      if (waitTime % 5 === 0) {
        console.log(`Processing... ${waitTime}s (Status: ${result.status})`);
      }
    }

    if (result.status === "failed") {
      console.error("Background removal failed:", result.error);
      // Refund credit on failure
      await refundCredits(user.id, REMOVE_BG_COST);
      throw new Error("Background removal failed. Please try again. Credit refunded.");
    }

    if (waitTime >= maxWait) {
      // Refund credit on timeout
      await refundCredits(user.id, REMOVE_BG_COST);
      throw new Error("Background removal timed out. Please try again. Credit refunded.");
    }

    console.log("Result status:", result.status);
    console.log("Result output type:", typeof result.output);

    let outputUrl: string | null = null;

    // Handle different output types from Replicate
    if (result.output) {
      if (typeof result.output === "string") {
        outputUrl = result.output;
      } else if (Array.isArray(result.output) && result.output.length > 0) {
        outputUrl = String(result.output[0]);
      } else if (result.output instanceof ReadableStream) {
        // Convert ReadableStream to base64 data URL
        const reader = result.output.getReader();
        const chunks: Uint8Array[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const combined = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.length;
        }

        const base64 = Buffer.from(combined).toString("base64");
        outputUrl = `data:image/png;base64,${base64}`;
      } else if (typeof result.output === "object" && "url" in result.output) {
        outputUrl = String((result.output as { url: string }).url);
      }
    }

    if (!outputUrl) {
      console.error("No output URL from model:", result);
      // Refund on no output
      await refundCredits(user.id, REMOVE_BG_COST);
      throw new Error("Model did not return an image. Credit refunded.");
    }

    console.log("Output URL (first 100 chars):", outputUrl.substring(0, 100));

    // Auto-save to user's gallery as a new generation
    let savedGenerationId: string | null = null;
    try {
      const generation = await prisma.generation.create({
        data: {
          userId: user.id,
          prompt: originalPrompt ? `[No BG] ${originalPrompt}` : "[No BG] Background removed",
          fullPrompt: originalPrompt || "Background removal",
          categoryId: categoryId || "TOOLS",
          subcategoryId: subcategoryId || "REMOVE_BG",
          styleId: styleId || "TRANSPARENT",
          imageUrl: outputUrl,
        },
      });
      savedGenerationId = generation.id;
      console.log("Auto-saved to gallery:", generation.id);
    } catch (saveError) {
      console.error("Failed to auto-save to gallery:", saveError);
      // Don't fail the request if save fails
    }

    console.log("===========================================");
    console.log("BACKGROUND REMOVAL SUCCESS!");
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: outputUrl,
      savedToGallery: !!savedGenerationId,
      generationId: savedGenerationId,
      creditCost: REMOVE_BG_COST,
    });

  } catch (error) {
    console.error("Background removal error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Background removal failed" },
      { status: 500 }
    );
  }
}
