import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimitGuestGeneration } from "@/lib/rate-limit";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import {
  generateGuestAsset,
  GenerationError,
} from "@/lib/services/generation";

// =============================================================================
// GUEST GENERATION API
// =============================================================================
// Allows N free generations without login (rate-limited per IP via Upstash).
//
// Uses the same Runware FLUX Schnell model as the authenticated free tier so
// the homepage TryItNow demo finishes in ~5–10 seconds instead of the
// 15–30 seconds we used to get from Replicate SDXL — matching the "Seconds"
// claim on the landing page and removing a slow first impression.
// =============================================================================

// ─── Validation schema ────────────────────────────────────────────────────────
const GuestGenerateSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please describe what you want to create.")
    .max(200, "Description too long. Maximum 200 characters for guest mode.")
    .transform((v) => v.trim()),
  style: z.enum(["pixel", "cartoon"]).default("pixel"),
});

const STYLE_LABELS: Record<"pixel" | "cartoon", string> = {
  pixel: "Pixel Art",
  cartoon: "Cartoon",
};

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // 1. Rate limit (Upstash Redis, fail-open when not configured)
    const { blocked } = await rateLimitGuestGeneration(request);
    if (blocked) return blocked;

    // 2. Parse body
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json(
        { success: false, error: "Invalid request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    // 3. Validate
    const parsed = validateBody(GuestGenerateSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { prompt, style } = parsed.data;

    // 4. Resolve client IP for the service (used for rate-limit identifier).
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "0.0.0.0";

    // 5. Generate via the canonical service (Runware FLUX Schnell, free tier)
    const result = await generateGuestAsset({
      ipAddress,
      prompt,
      style,
    });

    const asset = result.assets[0];
    if (!asset) {
      return NextResponse.json(
        { success: false, error: "Generation failed. Please try again." },
        { status: 500 }
      );
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    return NextResponse.json({
      success: true,
      imageUrl: asset.imageUrl,
      seed: asset.seed,
      style: STYLE_LABELS[style],
      duration: `${duration}s`,
    });
  } catch (error) {
    if (error instanceof GenerationError) {
      const status =
        error.code === "PROVIDER_TIMEOUT" ? 504 :
        error.code === "PROVIDER_ERROR" ? 502 :
        500;
      return NextResponse.json(
        { success: false, error: error.userMessage, code: error.code },
        { status }
      );
    }
    console.error("[Guest Generate] Error:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ─── GET — Static info for the landing UI ────────────────────────────────────
export async function GET() {
  // Rate limiting is enforced server-side by Upstash on POST. This endpoint
  // returns static informational data the landing page uses to render copy.
  // `remaining` defaults to `max` — the live count is updated client-side
  // after each successful POST.
  const max = 3;
  return NextResponse.json({
    max,
    remaining: max,
    signupBonus: 10,
  });
}
