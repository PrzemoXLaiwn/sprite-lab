import { NextResponse } from "next/server";
import Replicate from "replicate";
import { z } from "zod";
import { rateLimitGuestGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";

// ===========================================
// GUEST GENERATION API
// Allows 2 free generations without login
// ===========================================

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ─── Validation schema ────────────────────────────────────────────────────────
const GuestGenerateSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please describe what you want to create.")
    .max(200, "Description too long. Maximum 200 characters for guest mode.")
    .transform((v) => v.trim()),
  style: z.enum(["pixel", "cartoon"]).default("pixel"),
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const GUEST_STYLES = {
  pixel: {
    name: "Pixel Art",
    model: "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    prompt: "pixel art style, 16-bit, retro game sprite, clean edges, limited color palette",
    negative: "blurry, realistic, 3D render, photograph, noisy, gradient, anti-aliased",
  },
  cartoon: {
    name: "Cartoon",
    model: "stability-ai/sdxl:7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    prompt: "cartoon style, bold outlines, vibrant colors, game asset, clean design",
    negative: "realistic, photograph, blurry, noisy, complex background",
  },
} as const;

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Rate limit (Upstash Redis, fail-open when not configured)
    const { blocked } = await rateLimitGuestGeneration(request);
    if (blocked) return blocked;

    // 2. Parse body safely — handles empty body, non-JSON, wrong Content-Type
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // 5. Validate with Zod
    const parsed = validateBody(GuestGenerateSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { prompt, style } = parsed.data;
    const styleConfig = GUEST_STYLES[style];

    // 6. Build prompt
    const finalPrompt = `${styleConfig.prompt}, ${prompt}, game sprite, single object, centered, transparent background, high quality`;

    console.log("===========================================");
    console.log("GUEST GENERATION");
    console.log("===========================================");
    console.log("Prompt:", prompt);

    // 7. Generate
    const output = await replicate.run(
      styleConfig.model as `${string}/${string}:${string}`,
      {
        input: {
          prompt: finalPrompt,
          negative_prompt: styleConfig.negative,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 25,
          guidance_scale: 7.5,
          seed: Math.floor(Math.random() * 2147483647),
        },
      }
    );

    // 8. Extract image URL
    let imageUrl: string | null = null;
    if (Array.isArray(output) && output.length > 0) {
      const firstOutput = output[0];
      if (typeof firstOutput === "string") {
        imageUrl = firstOutput;
      } else if (
        firstOutput &&
        typeof firstOutput === "object" &&
        "url" in firstOutput
      ) {
        imageUrl = (firstOutput as { url: string }).url;
      }
    }

    if (!imageUrl) {
      console.error("No image URL from generation");
      return NextResponse.json(
        { success: false, error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("GUEST GENERATION COMPLETE! Duration:", duration + "s");
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl,
      style: styleConfig.name,
      duration: `${duration}s`,
    });
  } catch (error) {
    console.error("[Guest Generate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ─── GET — Check remaining generations ───────────────────────────────────────
export async function GET() {
  // Rate limiting is now handled entirely by Upstash Redis.
  // This endpoint returns static info for the frontend.
  return NextResponse.json({
    max: 3,
    signupBonus: 10,
  });
}
