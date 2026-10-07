import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { rateLimitAiHelper } from "@/lib/rate-limit";
import { safeFetchImage } from "@/lib/safe-fetch";
import { fallbackSuggestions, suggestMotions } from "@/lib/animation-suggest";

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
    return NextResponse.json(result, { headers: { "Cache-Control": "private, max-age=3600" } });
  } catch {
    return NextResponse.json(fallbackSuggestions(source.categoryId));
  }
}
