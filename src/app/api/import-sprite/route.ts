import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { uploadGenerationBufferToR2 } from "@/lib/r2";
import { saveGeneration } from "@/lib/db/generations";
import { detectIntent } from "@/lib/prompt-intent";
import { GENERATE_CATEGORIES } from "@/data/generate-categories";
import { IMPORT_MAX_BYTES, UPLOAD_MARKER, importSprite } from "@/lib/image/import-sprite";

// Import your own sprite: free, private (never shared to the gallery), then
// usable in Animate, Edit, Directions and the engine pack like any sprite.
// 30 uploads an hour per user (the "upload" limiter).

export const maxDuration = 60;

const KINDS = {
  character: { categoryId: "CHARACTERS", subcategoryId: "HEROES" },
  creature: { categoryId: "CREATURES", subcategoryId: "MYTHICAL" },
  object: { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS" },
} as const;

function sniff(buf: Buffer): "png" | "jpeg" | "webp" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

/** Asset type: what the name says when it's clear, else the kind the user picked. */
function categoryFor(name: string, kind: keyof typeof KINDS) {
  const intent = detectIntent(name);
  if (intent.categoryId && intent.confidence >= 0.6) {
    const sub = GENERATE_CATEGORIES.find((c) => c.id === intent.categoryId)?.subcategories.find((s) => s.subcategoryId === intent.subcategoryId);
    if (sub) return { categoryId: sub.categoryId, subcategoryId: sub.subcategoryId };
  }
  return KINDS[kind];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Log in to upload your own sprite." }, { status: 401 });

  const { blocked } = await rateLimitUserAction("upload", user.id);
  if (blocked) return blocked;

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a PNG, JPG or WebP image to upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!file || typeof file === "string") return NextResponse.json({ error: "Choose a PNG, JPG or WebP image to upload." }, { status: 400 });
  if (file.size > IMPORT_MAX_BYTES) return NextResponse.json({ error: "That file is over 8 MB. Use a smaller PNG, JPG or WebP." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.byteLength > IMPORT_MAX_BYTES) return NextResponse.json({ error: "That file is over 8 MB. Use a smaller PNG, JPG or WebP." }, { status: 400 });
  // Trust the bytes, never the declared type or the filename
  if (!sniff(buffer)) return NextResponse.json({ error: "Only PNG, JPG and WebP images can be uploaded." }, { status: 400 });

  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim().slice(0, 200) || "Uploaded sprite";
  const kindRaw = String(form.get("kind") ?? "character");
  const kind = (kindRaw in KINDS ? kindRaw : "character") as keyof typeof KINDS;

  let imported;
  try {
    imported = await importSprite(buffer);
  } catch (err) {
    const msg = err instanceof Error && /too (small|large)|transparent/i.test(err.message) ? err.message : "Couldn't read that image. Try a PNG, JPG or WebP.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  const stored = await uploadGenerationBufferToR2(imported.png, user.id, "png");
  if (!stored.success || !stored.url) {
    console.error("[Import] R2 upload failed:", stored.error);
    return NextResponse.json({ error: "Couldn't save the image right now. Please try again." }, { status: 503 });
  }

  const { categoryId, subcategoryId } = categoryFor(name, kind);
  const styleId = imported.pixel ? "PIXEL_ART_32" : "HAND_PAINTED";
  const saved = await saveGeneration({
    userId: user.id,
    prompt: name,
    fullPrompt: `${UPLOAD_MARKER} ${name}`,
    categoryId,
    subcategoryId,
    styleId,
    imageUrl: stored.url,
    replicateCost: 0,
  });
  const generation = saved.success && "generation" in saved ? saved.generation : null;
  if (!generation) return NextResponse.json({ error: "Couldn't save the sprite right now. Please try again." }, { status: 503 });

  const warnings: string[] = [];
  if (imported.background === "none") warnings.push("We couldn't find a plain background to remove. Use Remove BG if the sprite isn't on transparency yet.");
  return NextResponse.json({
    success: true,
    generationId: generation.id,
    imageUrl: stored.url,
    styleId,
    categoryId,
    subcategoryId,
    pixel: imported.pixel,
    background: imported.background,
    warnings,
  });
}
