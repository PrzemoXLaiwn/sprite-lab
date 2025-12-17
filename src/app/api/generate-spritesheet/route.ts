import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import {
  getCategoryById,
  getSubcategoryById,
  STYLES_2D_FULL,
  buildUltimatePrompt,
  ANIMATION_TYPES,
  COLOR_PALETTES,
  STYLE_COMPATIBILITY,
} from "@/config";
import { getOrCreateUser, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

const API_TIMEOUT = 180000; // 3 minutes for multiple generations

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

type ModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

// ===========================================
// IMAGE GENERATION FUNCTIONS
// ===========================================

async function runFluxDev(
  prompt: string,
  seed: number,
  steps: number
): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    const output = await replicate.run(
      "black-forest-labs/flux-dev" as ModelIdentifier,
      {
        input: {
          prompt,
          seed,
          go_fast: false,
          guidance: 3.5,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 100,
          num_inference_steps: steps,
        },
      }
    );
    const imageUrl = extractUrl(output);
    return imageUrl ? { imageUrl } : { imageUrl: null, error: "No output URL" };
  } catch (error) {
    return { imageUrl: null, error: String(error) };
  }
}

async function runSDXL(
  prompt: string,
  negative: string,
  seed: number,
  guidance: number,
  steps: number
): Promise<{ imageUrl: string | null; error?: string }> {
  try {
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b" as ModelIdentifier,
      {
        input: {
          prompt,
          negative_prompt: negative,
          seed,
          width: 1024,
          height: 1024,
          num_outputs: 1,
          guidance_scale: guidance,
          num_inference_steps: steps,
          scheduler: "K_EULER",
          refine: "expert_ensemble_refiner",
          high_noise_frac: 0.8,
          apply_watermark: false,
        },
      }
    );
    const imageUrl = extractUrl(output);
    return imageUrl ? { imageUrl } : { imageUrl: null, error: "No output URL" };
  } catch (error) {
    return { imageUrl: null, error: String(error) };
  }
}

function extractUrl(output: unknown): string | null {
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const obj = first as Record<string, unknown>;
      if (typeof obj.url === "function") {
        try { return (obj.url as () => URL)().toString(); } catch { /* ignore */ }
      }
      if (typeof obj.url === "string") return obj.url;
    }
  }
  if (typeof output === "string") return output;
  return null;
}

// ===========================================
// STYLE MIXING HELPER
// ===========================================

function buildMixedStylePrompt(
  basePrompt: string,
  style1Id: string,
  style2Id: string,
  style1Weight: number
): { prompt: string; negatives: string; model: "flux-dev" | "sdxl" | "flux-schnell"; guidance: number; steps: number } {
  const style1 = STYLES_2D_FULL[style1Id];
  const style2 = STYLES_2D_FULL[style2Id];

  if (!style1 || !style2) {
    // Fallback to style1 only
    const fallback = style1 || STYLES_2D_FULL.PIXEL_ART_16;
    return {
      prompt: `${fallback.styleCore}, ${basePrompt}, ${fallback.rendering}, ${fallback.colors}`,
      negatives: fallback.negatives,
      model: fallback.model as "flux-dev" | "sdxl" | "flux-schnell",
      guidance: fallback.guidance,
      steps: fallback.steps,
    };
  }

  const style2Weight = 100 - style1Weight;

  // Build mixed prompt with weighted style descriptions
  const mixedPrompt = [
    `(${style1.styleCore}:${(style1Weight / 100).toFixed(2)})`,
    `(${style2.styleCore}:${(style2Weight / 100).toFixed(2)})`,
    basePrompt,
    `blending ${style1.name} with ${style2.name} style`,
    style1Weight >= 50 ? style1.rendering : style2.rendering,
    `${style1.colors}, ${style2.colors}`,
    style1Weight >= 50 ? style1.edges : style2.edges,
  ].join(", ");

  // Combine negatives
  const combinedNegatives = `${style1.negatives}, ${style2.negatives}`;

  // Use the dominant style's model settings
  const dominantStyle = style1Weight >= 50 ? style1 : style2;

  return {
    prompt: mixedPrompt,
    negatives: combinedNegatives,
    model: dominantStyle.model as "flux-dev" | "sdxl" | "flux-schnell",
    guidance: dominantStyle.guidance,
    steps: dominantStyle.steps,
  };
}

// ===========================================
// COLOR PALETTE HELPER
// ===========================================

function applyColorPalette(basePrompt: string, paletteId: string): string {
  const palette = COLOR_PALETTES.find(p => p.id === paletteId);
  if (!palette) return basePrompt;

  return `${basePrompt}, ${palette.promptModifier}, strictly using ${palette.name} color scheme`;
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function POST(request: Request) {
  const startTime = Date.now();
  let creditsDeducted = 0;
  let userId: string | null = null;

  try {
    // Auth Check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate sprite sheets." },
        { status: 401 }
      );
    }
    userId = user.id;

    // Parse Request
    const body = await request.json();
    const {
      prompt,
      categoryId,
      subcategoryId,
      styleId = "PIXEL_ART_16",
      animationTypeId,
      // Style mixing
      enableStyleMix = false,
      style2Id,
      style1Weight = 70,
      // Color palette
      colorPaletteId,
      // Seed
      baseSeed,
    } = body;

    // Validation
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Please enter a description for your sprite." },
        { status: 400 }
      );
    }

    if (!categoryId || !subcategoryId) {
      return NextResponse.json(
        { error: "Please select a category and type." },
        { status: 400 }
      );
    }

    if (!animationTypeId) {
      return NextResponse.json(
        { error: "Please select an animation type." },
        { status: 400 }
      );
    }

    // Validate category
    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}` },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid type: ${subcategoryId}` },
        { status: 400 }
      );
    }

    // Validate style
    if (!STYLES_2D_FULL[styleId]) {
      return NextResponse.json(
        { error: `Invalid style: ${styleId}` },
        { status: 400 }
      );
    }

    // Validate animation type
    const animationType = ANIMATION_TYPES.find(a => a.id === animationTypeId);
    if (!animationType) {
      return NextResponse.json(
        { error: `Invalid animation type: ${animationTypeId}` },
        { status: 400 }
      );
    }

    // Validate style mixing compatibility
    if (enableStyleMix && style2Id) {
      const compatible = STYLE_COMPATIBILITY[styleId];
      if (compatible && !compatible.includes(style2Id)) {
        console.log(`[SpriteSheet] Warning: ${styleId} and ${style2Id} may not blend well`);
      }
    }

    // Calculate credits needed
    const creditsRequired = animationType.frameCount;

    // Credits check
    await getOrCreateUser(user.id, user.email!);
    const creditResult = await checkAndDeductCredits(user.id, creditsRequired);

    if (!creditResult.success) {
      return NextResponse.json(
        { error: `Not enough credits. You need ${creditsRequired} credits for ${animationType.frameCount} frames.`, noCredits: true },
        { status: 402 }
      );
    }
    creditsDeducted = creditsRequired;

    // Base seed
    const baseSeedNum = baseSeed && !isNaN(Number(baseSeed))
      ? Number(baseSeed)
      : Math.floor(Math.random() * 2147483647);

    // Generate frames
    console.log(`\n${"═".repeat(70)}`);
    console.log(`🎬 SPRITE SHEET GENERATOR`);
    console.log(`${"═".repeat(70)}`);
    console.log(`📝 Base Prompt: ${prompt.trim()}`);
    console.log(`🎭 Animation: ${animationType.name} (${animationType.frameCount} frames)`);
    console.log(`🎨 Style: ${styleId}${enableStyleMix ? ` + ${style2Id} (${style1Weight}/${100-style1Weight})` : ""}`);
    console.log(`🎨 Palette: ${colorPaletteId || "Default"}`);
    console.log(`🌱 Base Seed: ${baseSeedNum}`);
    console.log(`${"─".repeat(70)}`);

    const frames: Array<{
      frameId: string;
      frameName: string;
      imageUrl: string;
      seed: number;
    }> = [];

    for (let i = 0; i < animationType.frames.length; i++) {
      const frame = animationType.frames[i];
      const frameSeed = baseSeedNum + i; // Increment seed for each frame for consistency

      console.log(`\n🖼️ Frame ${i + 1}/${animationType.frameCount}: ${frame.name}`);

      // Build frame-specific prompt
      let framePrompt = `${prompt.trim()}, ${frame.promptModifier}`;

      // Apply color palette if selected
      if (colorPaletteId) {
        framePrompt = applyColorPalette(framePrompt, colorPaletteId);
      }

      // Add consistency hints for animation
      framePrompt = `${framePrompt}, same character design, consistent proportions, consistent colors, animation frame`;

      let finalPrompt: string;
      let negativePrompt: string;
      let model: "flux-dev" | "sdxl" | "flux-schnell";
      let guidance: number;
      let steps: number;

      if (enableStyleMix && style2Id) {
        // Use mixed style
        const mixed = buildMixedStylePrompt(framePrompt, styleId, style2Id, style1Weight);
        finalPrompt = mixed.prompt;
        negativePrompt = mixed.negatives;
        model = mixed.model;
        guidance = mixed.guidance;
        steps = mixed.steps;
      } else {
        // Use standard prompt builder
        const built = buildUltimatePrompt(framePrompt, categoryId, subcategoryId, styleId);
        finalPrompt = built.prompt;
        negativePrompt = built.negativePrompt;
        model = built.model;
        guidance = built.guidance;
        steps = built.steps;
      }

      // Generate frame
      let result: { imageUrl: string | null; error?: string };

      if (model === "sdxl") {
        result = await runSDXL(finalPrompt, negativePrompt, frameSeed, guidance, steps);
      } else {
        result = await runFluxDev(finalPrompt, frameSeed, steps);
      }

      if (!result.imageUrl) {
        console.log(`❌ Frame ${i + 1} failed: ${result.error}`);
        // Continue with other frames, we'll handle partial success
        continue;
      }

      console.log(`✅ Frame ${i + 1} complete`);

      // Upload to storage
      const fileName = `spritesheet-${categoryId}-${animationTypeId}-${frame.id}-${frameSeed}`;
      const uploadResult = await uploadImageToStorage(result.imageUrl, user.id, fileName);
      const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : result.imageUrl;

      frames.push({
        frameId: frame.id,
        frameName: frame.name,
        imageUrl: finalUrl,
        seed: frameSeed,
      });

      // Small delay between generations to avoid rate limiting
      if (i < animationType.frames.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // Check if we got enough frames
    if (frames.length === 0) {
      // Refund all credits
      await refundCredits(user.id, creditsDeducted);
      return NextResponse.json(
        { error: "All frame generations failed. Please try again." },
        { status: 500 }
      );
    }

    // Partial success - refund unused credits
    if (frames.length < creditsDeducted) {
      const refundAmount = creditsDeducted - frames.length;
      await refundCredits(user.id, refundAmount);
      console.log(`⚠️ Partial success: ${frames.length}/${creditsDeducted} frames. Refunded ${refundAmount} credits.`);
    }

    // Save generation record
    await saveGeneration({
      userId: user.id,
      prompt: prompt.trim(),
      fullPrompt: `[Sprite Sheet: ${animationType.name}] ${prompt.trim()}`,
      categoryId,
      subcategoryId,
      styleId,
      imageUrl: frames[0].imageUrl, // Save first frame as thumbnail
      seed: baseSeedNum,
      replicateCost: frames.length * 0.025, // Approximate cost
    });

    // Final stats
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n${"═".repeat(70)}`);
    console.log(`🎉 SPRITE SHEET COMPLETE!`);
    console.log(`${"═".repeat(70)}`);
    console.log(`⏱️ Duration: ${duration}s`);
    console.log(`🖼️ Frames: ${frames.length}/${animationType.frameCount}`);
    console.log(`💰 Credits Used: ${frames.length}`);
    console.log(`${"═".repeat(70)}\n`);

    return NextResponse.json({
      success: true,
      animationType: {
        id: animationType.id,
        name: animationType.name,
      },
      frames,
      frameCount: frames.length,
      baseSeed: baseSeedNum,
      creditsUsed: frames.length,
      duration: `${duration}s`,
      style: {
        id: styleId,
        name: STYLES_2D_FULL[styleId].name,
        mixed: enableStyleMix && style2Id ? {
          style2Id,
          style1Weight,
        } : null,
      },
      colorPalette: colorPaletteId ? COLOR_PALETTES.find(p => p.id === colorPaletteId) : null,
    });

  } catch (error) {
    console.error("[SpriteSheet] ❌ Unexpected error:", error);

    // Try to refund credits on error
    if (userId && creditsDeducted > 0) {
      try {
        await refundCredits(userId, creditsDeducted);
        console.log(`[SpriteSheet] Refunded ${creditsDeducted} credits due to error`);
      } catch (refundError) {
        console.error("[SpriteSheet] Failed to refund credits:", refundError);
      }
    }

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - API Info
// ===========================================

export async function GET() {
  return NextResponse.json({
    version: "1.0.0",
    name: "Sprite Sheet Generator",
    description: "Generate animation sprite sheets with multiple frames",
    animationTypes: ANIMATION_TYPES.map(a => ({
      id: a.id,
      name: a.name,
      emoji: a.emoji,
      description: a.description,
      frameCount: a.frameCount,
      creditsRequired: a.creditsRequired,
    })),
    colorPalettes: COLOR_PALETTES.map(p => ({
      id: p.id,
      name: p.name,
      emoji: p.emoji,
      description: p.description,
      colors: p.colors,
    })),
    styleMixing: {
      enabled: true,
      presets: [
        { name: "Balanced", style1: 50, style2: 50 },
        { name: "Primary Focus", style1: 70, style2: 30 },
        { name: "Secondary Focus", style1: 30, style2: 70 },
      ],
    },
  });
}
