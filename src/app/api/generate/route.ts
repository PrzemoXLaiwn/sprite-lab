import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  CATEGORY_PROMPT_CONFIGS,
} from "@/config";
import { RUNWARE_MODELS, MODEL_COSTS, type RunwareModelId } from "@/lib/runware";
import { getOrCreateUser } from "@/lib/database";
import { z } from "zod";
import { parseJsonBody, validateBody } from "@/lib/validation/common";
import {
  generateAssets,
  GenerationError,
  type GenerationRequest,
} from "@/lib/services/generation";
import { enhanceUserPrompt } from "@/lib/prompt-enhance";

// ─── Input validation schema ──────────────────────────────────────────────────
// Identical to Phase 2 schema — no breaking changes to accepted input.
const GenerateBodySchema = z
  .object({
    prompt: z
      .string()
      .min(1, "Please enter a description for your sprite.")
      .max(500, "Description too long. Maximum 500 characters.")
      .transform((v) => v.trim()),
    categoryId: z
      .string()
      .min(1, "Please select a category."),
    subcategoryId: z
      .string()
      .min(1, "Please select a type."),
    styleId: z.string().optional().default("PIXEL_ART_16"),
    view: z.string().optional().default("DEFAULT"),
    seed: z.union([z.number(), z.string(), z.null()]).optional(),
    qualityPreset: z.enum(["draft", "normal", "hd"]).optional().default("normal"),
    enableStyleMix: z.boolean().optional().default(false),
    style2Id: z.string().optional(),
    style1Weight: z.number().min(0).max(100).optional().default(70),
    colorPaletteId: z.string().optional(),
    modelId: z.string().optional(),
  })
  .passthrough();

// ─── Error code → HTTP status mapping ────────────────────────────────────────
function statusForCode(code: string): number {
  switch (code) {
    case "INSUFFICIENT_CREDITS":   return 402;
    case "INVALID_REQUEST":
    case "INVALID_CATEGORY":
    case "INVALID_SUBCATEGORY":
    case "INVALID_STYLE":
    case "UNSUPPORTED_MODE":       return 400;
    case "UNAUTHENTICATED":        return 401;
    case "PROVIDER_ERROR":
    case "PROVIDER_TIMEOUT":       return 500;
    default:                       return 500;
  }
}

// =============================================================================
// POST — Generate a single 2D sprite
// =============================================================================
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // ── 1. Auth ───────────────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate sprites." },
        { status: 401 }
      );
    }

    // ── 2. Parse + validate body ──────────────────────────────────────────────
    const rawBody = await parseJsonBody(request);
    if (rawBody === null) {
      return NextResponse.json(
        { error: "Invalid request body.", code: "INVALID_JSON" },
        { status: 400 }
      );
    }

    const parsed = validateBody(GenerateBodySchema, rawBody);
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
      view,
      seed,
      qualityPreset,
      enableStyleMix,
      style2Id,
      style1Weight,
      colorPaletteId,
      modelId,
    } = parsed.data;

    // ── 3. Semantic validation ────────────────────────────────────────────────
    // The service does not validate category/subcategory/style existence —
    // it relies on callers to do this before dispatch.
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

    if (!STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // ── 4. Ensure user record exists ──────────────────────────────────────────
    const dbUser = await getOrCreateUser(user.id, user.email!);

    // ── 4b. AI Prompt Enhancement (Pro/Studio only) ─────────────────────────
    // Expands short prompts like "iron sword magic" into detailed visual
    // descriptions while preserving the user's exact intent.
    let finalUserPrompt = prompt;
    let promptWasEnhanced = false;
    const userPlan = dbUser?.user?.plan ?? "FREE";
    const isPaidPlan = ["PRO", "UNLIMITED", "STARTER"].includes(userPlan);

    if (isPaidPlan && prompt.split(/\s+/).length < 7) {
      try {
        const { enhanced, wasEnhanced } = await enhanceUserPrompt(
          prompt,
          categoryId,
          subcategoryId
        );
        if (wasEnhanced) {
          finalUserPrompt = enhanced;
          promptWasEnhanced = true;
        }
      } catch {
        // Enhancement failed — use original prompt, don't block generation
      }
    }

    // ── 5. Resolve seed ───────────────────────────────────────────────────────
    // Service accepts seed as number | undefined. Convert here before dispatch.
    let resolvedSeed: number | undefined;
    if (seed !== undefined && seed !== null && seed !== "") {
      const n = Number(seed);
      resolvedSeed = !isNaN(n) && n >= 0 && n <= 2147483647 ? n : undefined;
    }

    // ── 6. Build service request ──────────────────────────────────────────────
    // userId comes from the verified session — never from the request body.
    const serviceRequest: GenerationRequest = {
      userId: user.id,
      mode: "single",
      prompt: finalUserPrompt,
      categoryId,
      subcategoryId,
      styleId,
      view,
      seed: resolvedSeed,
      qualityPreset,
      modelId: modelId as RunwareModelId | undefined,
      enableStyleMix,
      styleMix: enableStyleMix && style2Id
        ? { style2Id, style1Weight: style1Weight ?? 70 }
        : undefined,
      colorPaletteId,
    };

    // ── 7. Delegate to service ────────────────────────────────────────────────
    const result = await generateAssets(serviceRequest);
    const asset = result.assets[0];
    if (!asset) {
      throw new GenerationError({
        code: "UNEXPECTED_ERROR",
        userMessage: "Something went wrong. Please try again.",
        message: "generateAssets returned empty assets array for mode:single",
      });
    }
    const styleConfig = STYLES_2D_FULL[styleId];
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // ── 8. Return success — shape kept identical to pre-migration ─────────────
    return NextResponse.json({
      success: true,
      imageUrl: asset.imageUrl,
      format: "png",
      is2DSprite: true,
      transparentBackground: true,
      prompt: prompt.trim(),
      enhancedPrompt: promptWasEnhanced ? finalUserPrompt : undefined,
      fullPrompt: asset.finalPrompt,
      seed: asset.seed,
      modelUsed: asset.model,
      appliedOptimizations: asset.appliedOptimizations,
      warnings: asset.warnings,
      style: {
        id: styleId,
        name: styleConfig?.name ?? styleId,
      },
      category: {
        id: category.id,
        name: category.name,
      },
      subcategory: {
        id: subcategory.id,
        name: subcategory.name,
      },
      creditsUsed: result.creditsUsed,
      duration: `${duration}s`,
    });

  } catch (error) {
    // ── Typed service errors ──────────────────────────────────────────────────
    if (error instanceof GenerationError) {
      const status = statusForCode(error.code);

      // Insufficient credits: keep legacy noCredits flag for frontend compat
      if (error.code === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          { error: error.userMessage, noCredits: true },
          { status: 402 }
        );
      }

      return NextResponse.json(
        { error: error.userMessage, code: error.code },
        { status }
      );
    }

    // ── Unexpected errors — never leak stack trace ────────────────────────────
    console.error("[Generate] ❌ Unexpected error:", {
      message: error instanceof Error ? error.message : String(error),
      name: error instanceof Error ? error.name : "Unknown",
    });

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET — API info (unchanged)
// =============================================================================
export async function GET() {
  const styles = Object.entries(STYLES_2D_FULL).map(([id, config]) => ({
    id,
    name: config.name,
    model: config.model,
  }));

  const categories = Object.keys(CATEGORY_PROMPT_CONFIGS).map(catId => ({
    id: catId,
    subcategories: Object.keys((CATEGORY_PROMPT_CONFIGS as Record<string, Record<string, unknown>>)[catId] || {}),
  }));

  const models = Object.entries(RUNWARE_MODELS).map(([id, air]) => ({
    id,
    air,
    cost: MODEL_COSTS[id as RunwareModelId],
  }));

  return NextResponse.json({
    version: "4.2.0",
    name: "Ultimate 2D Sprite Generator (Runware + Auto-Learning)",
    provider: "Runware",
    styles,
    categories,
    models,
    defaultStyle: "PIXEL_ART_16",
    outputFormat: "png",
    resolution: "1024x1024",
    creditsPerGeneration: 1,
    features: [
      "Tier-based model selection",
      "FLUX.2 Pro for premium users",
      "Hand-crafted prompts for every category",
      "Sub-second inference times",
      "Smart fallback system",
      "Auto-learning from quality analysis",
      "Automatic hallucination prevention",
    ],
  });
}
