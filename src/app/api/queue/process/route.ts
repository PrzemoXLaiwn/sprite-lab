import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  buildUltimatePrompt,
} from "@/config";
import { persistImage } from "@/lib/storage";
import { generateImage, removeBackground, type RunwareModelId } from "@/lib/runware";
import Replicate from "replicate";
import { timingSafeEqual } from "crypto";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Vercel Pro max. Replicate calls get REPLICATE_STEP_TIMEOUT_MS each and
// Runware calls are capped in src/lib/runware.ts, so the failure/refund
// transaction always has time to run.
export const maxDuration = 300;
const REPLICATE_STEP_TIMEOUT_MS = 110_000;

// ===========================================
// PROCESS QUEUE JOB (INTERNAL WORKER)
// ===========================================

/** Constant-time secret comparison (length leak only). */
function secretsMatch(provided: string | null, expected: string): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  try {
    // Verify internal call — FAIL CLOSED when the secret is not configured.
    const validSecret = process.env.QUEUE_SECRET;
    if (!validSecret) {
      console.error("[Worker] QUEUE_SECRET is not set — refusing to process jobs");
      return NextResponse.json(
        { error: "Worker not configured" },
        { status: 500 }
      );
    }

    const secret = request.headers.get("x-queue-secret");
    if (!secretsMatch(secret, validSecret)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let rawJobId: unknown;
    try {
      ({ jobId: rawJobId } = await request.json());
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!rawJobId || typeof rawJobId !== "string") {
      return NextResponse.json(
        { error: "Job ID required" },
        { status: 400 }
      );
    }
    const jobId: string = rawJobId;

    // Atomically CLAIM the job: only one worker invocation can move it from
    // pending → processing. Duplicate triggers get count 0 and stop here,
    // so a job can never be processed (or refunded) twice.
    const claim = await prisma.pendingGeneration.updateMany({
      where: { id: jobId, status: "pending" },
      data: {
        status: "processing",
        startedAt: new Date(),
        progress: 5,
        progressMessage: "Starting generation..."
      }
    });

    if (claim.count !== 1) {
      const existing = await prisma.pendingGeneration.findUnique({
        where: { id: jobId },
        select: { status: true },
      });
      if (!existing) {
        return NextResponse.json(
          { error: "Job not found" },
          { status: 404 }
        );
      }
      return NextResponse.json({
        success: true,
        message: `Job already ${existing.status}`,
        status: existing.status
      });
    }

    const job = await prisma.pendingGeneration.findUniqueOrThrow({
      where: { id: jobId }
    });

    console.log(`[Worker] Processing job ${jobId} (${job.mode})`);

    try {
      if (job.mode === "3d") {
        await process3DGeneration(job);
      } else {
        await process2DGeneration(job);
      }
    } catch (error) {
      // Internal detail stays in logs; the job row (shown to the user via
      // /api/queue/status) only gets a generic message.
      const internalMessage = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Worker] Job ${jobId} failed:`, internalMessage);

      // Mark failed + refund in ONE transaction, conditional on the job still
      // being "processing" — the refund can only ever happen once.
      const refunded = await prisma.$transaction(async (tx) => {
        const { count } = await tx.pendingGeneration.updateMany({
          where: { id: jobId, status: "processing" },
          data: {
            status: "failed",
            completedAt: new Date(),
            errorMessage: "Generation failed. Your credits were refunded.",
            progressMessage: "Failed"
          }
        });
        if (count !== 1) return false;

        await tx.user.update({
          where: { id: job.userId },
          data: { credits: { increment: job.creditsUsed } }
        });

        await tx.creditTransaction.create({
          data: {
            userId: job.userId,
            amount: job.creditsUsed,
            type: "REFUND",
            description: "Queued generation failed — credits refunded"
          }
        });
        return true;
      });

      return NextResponse.json({ success: false, error: "Generation failed", refunded });
    }

    return NextResponse.json({ success: true, jobId });

  } catch (error) {
    console.error("[Worker] Error:", error);
    return NextResponse.json(
      { error: "Worker error" },
      { status: 500 }
    );
  }
}

// ===========================================
// PROCESS 2D GENERATION
// ===========================================
async function process2DGeneration(job: {
  id: string;
  userId: string;
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed: number | null;
  creditsUsed: number;
}) {
  const { id: jobId, userId, prompt, categoryId, subcategoryId, styleId, seed } = job;

  // Update progress
  await updateProgress(jobId, 10, "Building optimized prompt...");

  // Build prompt
  const { prompt: builtPrompt, negativePrompt, guidance, steps } = buildUltimatePrompt(
    prompt,
    categoryId,
    subcategoryId,
    styleId
  );

  // Generate seed if not provided
  const usedSeed = seed ?? Math.floor(Math.random() * 2147483647);

  // Update progress
  await updateProgress(jobId, 20, "Generating sprite...");

  // Generate image
  const result = await generateImage(
    {
      prompt: builtPrompt,
      negativePrompt,
      seed: usedSeed,
      steps,
      guidance,
      width: 1024,
      height: 1024,
    },
    "free" // We don't track tier here, using default
  );

  if (!result.success || !result.images || result.images.length === 0) {
    throw new Error(result.error || "Image generation failed");
  }

  const generatedImage = result.images[0];

  // Update progress
  await updateProgress(jobId, 60, "Removing background...");

  // Auto remove background
  let imageUrlForUpload = generatedImage.imageURL;
  try {
    const bgRemovalResult = await removeBackground(generatedImage.imageURL);
    if (bgRemovalResult.success && bgRemovalResult.imageUrl) {
      imageUrlForUpload = bgRemovalResult.imageUrl;
    }
  } catch (bgError) {
    console.log("[Worker] Background removal failed, using original:", bgError);
  }

  // Update progress
  await updateProgress(jobId, 80, "Uploading to storage...");

  // Upload to storage
  const fileName = `sprite-${categoryId}-${subcategoryId}-${styleId}-${generatedImage.seed}`;
  const persistedUrl = await persistImage(imageUrlForUpload, userId, fileName);
  if (!persistedUrl) {
    console.error(`[Worker] Re-host failed for job ${jobId} — saving TEMPORARY provider URL (will expire)`);
  }
  const finalUrl = persistedUrl ?? imageUrlForUpload;

  // Update progress
  await updateProgress(jobId, 90, "Saving to gallery...");

  // Save to database
  const generation = await prisma.generation.create({
    data: {
      userId,
      prompt,
      fullPrompt: builtPrompt,
      categoryId,
      subcategoryId,
      styleId,
      imageUrl: finalUrl,
      seed: generatedImage.seed,
      replicateCost: generatedImage.cost,
    }
  });

  // Mark job as completed
  await prisma.pendingGeneration.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      progress: 100,
      progressMessage: "Complete!",
      resultUrl: finalUrl,
      resultSeed: generatedImage.seed,
      generationId: generation.id,
    }
  });

  console.log(`[Worker] ✅ Job ${jobId} completed (2D)`);
}

// ===========================================
// PROCESS 3D GENERATION
// ===========================================
async function process3DGeneration(job: {
  id: string;
  userId: string;
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed: number | null;
  model3DId: string | null;
  quality3D: string | null;
  creditsUsed: number;
}) {
  const { id: jobId, userId, prompt, categoryId, subcategoryId, seed, model3DId, quality3D } = job;

  // Update progress
  await updateProgress(jobId, 10, "Generating reference image...");

  // Generate reference image first
  const usedSeed = seed ?? Math.floor(Math.random() * 2147483647);

  // Simple reference prompt for 3D
  const referencePrompt = `professional 3D render, ${prompt}, single object, white background,
    game asset, isolated subject, clean silhouette, studio lighting, high quality, 8K detailed`;

  const refOutput = await replicate.run("black-forest-labs/flux-dev", {
    input: {
      prompt: referencePrompt,
      seed: usedSeed,
      guidance: 3.5,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "png",
      output_quality: 95,
      num_inference_steps: 28,
    },
    signal: AbortSignal.timeout(REPLICATE_STEP_TIMEOUT_MS),
  });

  const referenceImageUrl = extractUrl(refOutput);
  if (!referenceImageUrl) {
    throw new Error("Failed to generate reference image");
  }

  // Update progress
  await updateProgress(jobId, 40, "Converting to 3D model...");

  // Convert to 3D
  const modelConfig = get3DModelConfig(model3DId || "rodin");
  const input3D = modelConfig.getInput(referenceImageUrl, quality3D || "medium");

  const output3D = await replicate.run(
    modelConfig.replicateModel as `${string}/${string}`,
    { input: input3D, signal: AbortSignal.timeout(REPLICATE_STEP_TIMEOUT_MS) }
  );

  const modelUrl = modelConfig.parseOutput(output3D);
  if (!modelUrl) {
    throw new Error("Failed to generate 3D model");
  }

  // Update progress
  await updateProgress(jobId, 80, "Saving to gallery...");

  // Save to database
  const generation = await prisma.generation.create({
    data: {
      userId,
      prompt,
      fullPrompt: `[3D] ${referencePrompt}`,
      categoryId,
      subcategoryId,
      styleId: `3D_${(model3DId || "rodin").toUpperCase()}`,
      imageUrl: modelUrl,
      seed: usedSeed,
    }
  });

  // Mark job as completed
  await prisma.pendingGeneration.update({
    where: { id: jobId },
    data: {
      status: "completed",
      completedAt: new Date(),
      progress: 100,
      progressMessage: "Complete!",
      resultUrl: modelUrl,
      resultSeed: usedSeed,
      generationId: generation.id,
    }
  });

  console.log(`[Worker] ✅ Job ${jobId} completed (3D)`);
}

// ===========================================
// HELPER: Update job progress
// ===========================================
async function updateProgress(jobId: string, progress: number, message: string) {
  await prisma.pendingGeneration.update({
    where: { id: jobId },
    data: { progress, progressMessage: message }
  });
}

// ===========================================
// HELPER: Extract URL from Replicate output
// ===========================================
function extractUrl(output: unknown): string | null {
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      if ("url" in first && typeof (first as { url: () => URL }).url === "function") {
        try {
          return (first as { url: () => URL }).url().toString();
        } catch { /* ignore */ }
      }
    }
  }
  if (typeof output === "string") return output;
  return null;
}

// ===========================================
// HELPER: Get 3D model config
// ===========================================
function get3DModelConfig(modelId: string) {
  const configs: Record<string, {
    replicateModel: string;
    getInput: (imageUrl: string, quality: string) => Record<string, unknown>;
    parseOutput: (output: unknown) => string | null;
  }> = {
    rodin: {
      replicateModel: "hyper3d/rodin",
      getInput: (imageUrl: string, quality: string) => ({
        prompt: "3D model of the object, game-ready asset, clean topology",
        images: [imageUrl],
        quality: quality === "high" ? "high" : quality === "low" ? "low" : "medium",
        material: "PBR",
        geometry_file_format: "glb",
        mesh_mode: "Quad",
      }),
      parseOutput: (output: unknown) => {
        if (typeof output === "string") return output;
        if (output && typeof output === "object") {
          const out = output as Record<string, unknown>;
          for (const key of ["output", "geometry", "mesh", "glb", "model"]) {
            const val = out[key];
            if (typeof val === "string") return val;
            if (val && typeof val === "object" && "url" in val) {
              try {
                return (val as { url: () => URL }).url().toString();
              } catch { /* ignore */ }
            }
          }
        }
        return null;
      }
    },
    trellis: {
      replicateModel: process.env.REPLICATE_TRELLIS_MODEL || "firtoz/trellis",
      getInput: (imageUrl: string) => ({
        image: imageUrl,
        texture_size: 1024,
        mesh_simplify: 0.95,
        generate_model: true,
        generate_video: true,
      }),
      parseOutput: (output: unknown) => {
        if (output && typeof output === "object") {
          const out = output as Record<string, unknown>;
          for (const key of ["model_file", "mesh", "glb"]) {
            const val = out[key];
            if (typeof val === "string") return val;
            if (val && typeof val === "object" && "url" in val) {
              try {
                return (val as { url: () => URL }).url().toString();
              } catch { /* ignore */ }
            }
          }
        }
        return null;
      }
    },
    hunyuan3d: {
      replicateModel: "tencent/hunyuan3d-2:b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb",
      getInput: (imageUrl: string) => ({
        image: imageUrl,
        foreground_ratio: 0.9,
        remesh: "none",
      }),
      parseOutput: (output: unknown) => {
        if (output && typeof output === "object") {
          const out = output as Record<string, unknown>;
          for (const key of ["mesh", "glb", "model"]) {
            const val = out[key];
            if (typeof val === "string") return val;
          }
        }
        if (typeof output === "string") return output;
        return null;
      }
    },
    wonder3d: {
      replicateModel: "adirik/wonder3d",
      getInput: (imageUrl: string) => ({
        image: imageUrl,
        remove_bg: true,
      }),
      parseOutput: (output: unknown) => {
        if (output && typeof output === "object") {
          const out = output as Record<string, unknown>;
          for (const key of ["mesh", "model", "glb"]) {
            const val = out[key];
            if (typeof val === "string") return val;
          }
        }
        if (typeof output === "string") return output;
        return null;
      }
    }
  };

  return configs[modelId] || configs.rodin;
}
