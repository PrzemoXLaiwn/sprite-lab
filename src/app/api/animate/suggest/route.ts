import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitAiHelper } from "@/lib/rate-limit";
import { safeFetchImage } from "@/lib/safe-fetch";
import { fallbackSuggestions, suggestMotions, type MotionSuggestions } from "@/lib/animation-suggest";

// Suggestions are kept per sprite: one Opus call per sprite, not one per server
// instance (the module cache only lives as long as the instance). Bump the
// version when the prompt changes so old answers are redone.
const SUGGESTIONS_EVENT = "motion_suggestions";
const SUGGESTIONS_VERSION = 1;

function parseStored(metadata: string | null | undefined): MotionSuggestions | null {
  if (!metadata) return null;
  try {
    const data = JSON.parse(metadata) as { v?: unknown; subject?: unknown; motions?: unknown };
    if (data.v !== SUGGESTIONS_VERSION || !Array.isArray(data.motions) || data.motions.length < 3) return null;
    return { subject: typeof data.subject === "string" ? data.subject : "", motions: data.motions, ai: true };
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/animate/suggest?id=<generationId>
 * Motions that suit this sprite (free; cached per sprite).
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const id = req.nextUrl.searchParams.get("id")?.slice(0, 64);
  if (!id) return NextResponse.json({ error: "Missing sprite id." }, { status: 400 });

  const source = await prisma.generation.findFirst({
    where: { id, userId: user.id },
    select: { id: true, imageUrl: true, prompt: true, styleId: true, categoryId: true },
  });
  if (!source) return NextResponse.json({ error: "Sprite not found." }, { status: 404 });

  const stored = await prisma.generationEvent.findFirst({
    where: { generationId: source.id, eventType: SUGGESTIONS_EVENT },
    orderBy: { createdAt: "desc" },
    select: { metadata: true },
  });
  const saved = parseStored(stored?.metadata);
  if (saved) return NextResponse.json(saved, { headers: { "Cache-Control": "private, max-age=3600" } });

  const { blocked } = await rateLimitAiHelper(user.id);
  if (blocked) return NextResponse.json(fallbackSuggestions(source.categoryId));

  try {
    const { buffer } = await safeFetchImage(source.imageUrl, { maxBytes: 10 * 1024 * 1024 });
    const pixel = (source.styleId ?? "").toUpperCase().includes("PIXEL");
    const image = await sharp(buffer)
      .resize(384, 384, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 }, kernel: pixel ? "nearest" : "lanczos3" })
      .flatten({ background: "#ffffff" })
      .png()
      .toBuffer();
    const result = await suggestMotions({ cacheKey: source.id, image, prompt: source.prompt, categoryId: source.categoryId });
    if (result.ai) {
      prisma.generationEvent
        .create({ data: { generationId: source.id, userId: user.id, eventType: SUGGESTIONS_EVENT, metadata: JSON.stringify({ v: SUGGESTIONS_VERSION, subject: result.subject, motions: result.motions }) } })
        .catch(() => {});
    }
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json(fallbackSuggestions(source.categoryId));
  }
}
