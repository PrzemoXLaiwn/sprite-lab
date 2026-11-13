import { NextResponse } from "next/server";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { hasPaidPerks } from "@/lib/billing/entitlements";
import { godotSpriteFramesTres } from "@/lib/export/godot-tres";
import { safeFetchImage } from "@/lib/safe-fetch";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const FORMATS = new Set(["godot", "unity", "hires"]);

/**
 * Paid export. Free accounts get 402. Godot/Unity are metadata only.
 * 2× is nearest-neighbour on the file the account already owns — no image model.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Please log in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const generationId = typeof body?.generationId === "string" ? body.generationId : "";
  const format = typeof body?.format === "string" ? body.format : "";
  if (!generationId || !FORMATS.has(format)) {
    return NextResponse.json({ error: "Choose an export." }, { status: 400 });
  }

  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, role: true },
  });
  if (!hasPaidPerks(account?.plan, account?.role)) {
    return NextResponse.json(
      { error: "Unity, Godot and 2× export are on Starter and up.", code: "UPGRADE", noCredits: true },
      { status: 402 },
    );
  }

  const generation = await prisma.generation.findFirst({
    where: { id: generationId, userId: user.id },
    select: { id: true, imageUrl: true, prompt: true },
  });
  if (!generation) return NextResponse.json({ error: "Sprite not found." }, { status: 404 });

  const frameCount = typeof body?.frameCount === "number" ? body.frameCount : 1;
  const frameWidth = typeof body?.frameWidth === "number" ? body.frameWidth : 0;
  const frameHeight = typeof body?.frameHeight === "number" ? body.frameHeight : 0;
  const fps = typeof body?.fps === "number" ? body.fps : 8;
  const name = (generation.prompt || "sprite").split(/[,.]/)[0].slice(0, 32) || "sprite";

  if (format === "godot") {
    const tres = godotSpriteFramesTres({
      name,
      frameCount,
      frameWidth: frameWidth || 64,
      frameHeight: frameHeight || 64,
      fps,
      loop: body?.loop !== false,
      sheetFile: `res://${name.replace(/\s+/g, "_")}.png`,
    });
    return new NextResponse(tres, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="${name}.tres"` },
    });
  }

  if (format === "unity") {
    const frames = Array.from({ length: Math.max(1, Math.floor(frameCount)) }, (_, i) => `${name}_${String(i).padStart(2, "0")}.png`);
    return NextResponse.json({ name, fps, loop: body?.loop !== false, frames, pixelsPerUnit: frameWidth || 64 });
  }

  const fetched = await safeFetchImage(generation.imageUrl);
  const input = fetched.buffer;
  const meta = await sharp(input).metadata();
  const width = Math.min((meta.width ?? 1) * 2, 4096);
  const height = Math.min((meta.height ?? 1) * 2, 4096);
  const png = await sharp(input).resize(width, height, { kernel: "nearest" }).png().toBuffer();
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", "Content-Disposition": `attachment; filename="${name}-2x.png"` },
  });
}
