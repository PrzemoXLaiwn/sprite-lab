// @ts-nocheck - Remove after running: npx prisma generate
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
} from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits } from "@/lib/database";
import { z } from "zod";
import { parseJsonBody, validateBody } from "@/lib/validation/common";

// ─── Input validation schema ──────────────────────────────────────────────────
const QueueSubmitSchema = z.object({
  prompt: z
    .string()
    .min(1, "Please enter a description.")
    .max(500, "Description too long. Maximum 500 characters.")
    .transform((v) => v.trim()),
  categoryId: z
    .string()
    .min(1, "Please select a category."),
  subcategoryId: z
    .string()
    .min(1, "Please select a type."),
  styleId: z.string().optional().default("PIXEL_ART_16"),
  mode: z.enum(["2d", "3d"]).optional().default("2d"),
  seed: z.union([z.number(), z.string(), z.null()]).optional(),
  model3DId: z
    .enum(["rodin", "trellis", "hunyuan3d", "wonder3d"])
    .optional()
    .default("rodin"),
  quality3D: z
    .enum(["low", "medium", "high"])
    .optional()
    .default("medium"),
});

// ===========================================
// SUBMIT GENERATION TO BACKGROUND QUEUE
// ===========================================
// Like Sora - user submits, we process in background

export async function POST(request: Request) {
  try {
    // 🔐 Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate." },
        { status: 401 }
      );
    }

    // 📦 Parse + validate request body
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json(
        { error: "Invalid request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = validateBody(QueueSubmitSchema, rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const {
      prompt,
      categoryId,
      subcategoryId,
      styleId,
      mode,
      seed,
      model3DId,
      quality3D,
    } = parsed.data;

    // ✅ Semantic validation (category/subcategory/style existence)
    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid type: ${subcategoryId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Validate style for 2D
    if (mode === "2d" && !STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // 💳 Calculate credits needed
    let creditsRequired = 1; // Default for 2D
    if (mode === "3d") {
      // 3D model credits based on model
      const model3DCosts: Record<string, number> = {
        rodin: 4,
        trellis: 5,
        hunyuan3d: 4,
        wonder3d: 4,
      };
      creditsRequired = model3DCosts[model3DId] || 4;
    }

    // 💳 Check and deduct credits ATOMICALLY (before adding to queue)
    await getOrCreateUser(user.id, user.email!);
    const creditResult = await checkAndDeductCredits(user.id, creditsRequired);

    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: `Not enough credits. You need ${creditsRequired} credit${creditsRequired > 1 ? 's' : ''}.`,
          noCredits: true
        },
        { status: 402 }
      );
    }

    // 🎲 Seed Handling
    let usedSeed: number | null = null;
    if (seed !== undefined && seed !== null && seed !== "") {
      usedSeed = Number(seed);
      if (isNaN(usedSeed) || usedSeed < 0 || usedSeed > 2147483647) {
        usedSeed = null; // Will be randomized during processing
      }
    }

    // 📝 Create pending generation record
    const pendingGeneration = await prisma.pendingGeneration.create({
      data: {
        userId: user.id,
        prompt: prompt.trim(),
        categoryId,
        subcategoryId,
        styleId,
        mode,
        seed: usedSeed,
        model3DId: mode === "3d" ? model3DId : null,
        quality3D: mode === "3d" ? quality3D : null,
        status: "pending",
        progress: 0,
        progressMessage: "Queued for processing...",
        creditsUsed: creditsRequired,
      },
    });

    console.log(`[Queue] ✅ Job ${pendingGeneration.id} created for user ${user.id}`);
    console.log(`[Queue] Mode: ${mode}, Credits: ${creditsRequired}`);

    // 🚀 Trigger background processing (fire and forget)
    // In production, you'd use a job queue like BullMQ or Vercel Cron
    // For now, we'll trigger it immediately but not wait for it
    triggerProcessing(pendingGeneration.id).catch(err => {
      console.error(`[Queue] Failed to trigger processing for ${pendingGeneration.id}:`, err);
    });

    return NextResponse.json({
      success: true,
      jobId: pendingGeneration.id,
      status: "pending",
      message: "Generation queued! Check your gallery for progress.",
      creditsUsed: creditsRequired,
      estimatedTime: mode === "3d" ? "30-60 seconds" : "5-15 seconds",
    });

  } catch (error) {
    console.error("[Queue Submit] Error:", error);
    return NextResponse.json(
      { error: "Failed to queue generation. Please try again." },
      { status: 500 }
    );
  }
}

// ===========================================
// TRIGGER BACKGROUND PROCESSING
// ===========================================
async function triggerProcessing(jobId: string) {
  try {
    // Call the process endpoint internally
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/queue/process`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Use internal secret for auth
        'x-queue-secret': process.env.QUEUE_SECRET || 'dev-secret',
      },
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      console.error(`[Queue] Process trigger failed:`, await response.text());
    }
  } catch (error) {
    console.error(`[Queue] Process trigger error:`, error);
    // Job stays in pending state, will be picked up by cron or manual retry
  }
}
