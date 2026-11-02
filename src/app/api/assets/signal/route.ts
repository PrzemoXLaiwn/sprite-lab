import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { parseSignalKind } from "@/lib/asset-signal";

export const maxDuration = 15;

/**
 * POST { generationId, kind: "download" | "up" | "down" | "clear" }
 * Records a download or replaces the caller's thumbs vote.
 * No prompt text is stored. Failures here must not block the download,
 * so the client ignores the response.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null) as { generationId?: unknown; kind?: unknown } | null;
  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  const kind = parseSignalKind(body?.kind);
  if (!generationId || generationId.length > 64 || !kind) {
    return NextResponse.json({ error: "Invalid signal" }, { status: 400 });
  }

  const generation = await prisma.generation.findUnique({
    where: { id: generationId },
    select: { userId: true, isPublic: true },
  });
  if (!generation || (generation.userId !== user.id && !generation.isPublic)) {
    return NextResponse.json({ error: "Generation not found" }, { status: 404 });
  }

  if (kind === "up" || kind === "down" || kind === "clear") {
    await prisma.assetSignal.deleteMany({
      where: { generationId, userId: user.id, kind: { in: ["up", "down"] } },
    });
  }
  if (kind !== "clear") {
    await prisma.assetSignal.create({
      data: { generationId, userId: user.id, kind },
    });
  }
  return NextResponse.json({ ok: true });
}
