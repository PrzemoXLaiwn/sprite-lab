// POST /api/st-packs/base — the character still a job starts from.
// Multipart (field `file`): the upload is normalised onto the 3:4 working
// canvas. JSON ({ prompt, styleNotes?, framing, count? }): 2–4 candidates are
// drawn with the edit model and the admin picks one. Either way the stills
// are stored under unguessable ids and served by /api/st-packs/base/[id].
import { NextResponse } from "next/server";
import { z } from "zod";
import { requireStAdmin } from "../_lib/guard";
import { ST_EDIT_MODEL, ST_FRAMINGS, stPacksSettings } from "@/config/st-packs";
import { runInOperation } from "@/lib/billing/ledger";
import { uploadBufferToR2 } from "@/lib/r2";
import { rateLimitUserAction } from "@/lib/rate-limit";
import { generateStImage, ProviderModerationError } from "@/lib/runware";
import { fitPng, normaliseBase } from "@/lib/st-packs/frames";
import { baseKeyFor } from "@/lib/st-packs/jobs";
import { basePrompt, FAMILY_FRIENDLY_PREFIX } from "@/lib/st-packs/prompts";
import { checkSfw } from "@/lib/st-packs/sfw";

export const maxDuration = 300;

const MAX_UPLOAD = 10 * 1024 * 1024;

/** PNG / JPEG / WebP from magic bytes (the declared type is not trusted). */
export function sniffImage(buf: Buffer): "png" | "jpeg" | "webp" | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.length >= 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  return null;
}

const PromptBody = z.object({
  prompt: z.string().trim().min(3).max(600),
  styleNotes: z.string().trim().max(200).optional(),
  framing: z.enum(ST_FRAMINGS).default("waist"),
  count: z.number().int().min(2).max(4).default(2),
});

async function store(png: Buffer): Promise<{ id: string; url: string }> {
  const id = crypto.randomUUID();
  const r = await uploadBufferToR2(png, baseKeyFor(id), "image/png");
  if (!r.success) throw new Error(`Storage upload failed: ${r.error ?? "unknown"}`);
  return { id, url: `/api/st-packs/base/${id}` };
}

export async function POST(request: Request) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const limited = await rateLimitUserAction("stpacks", guard.userId);
  if (limited.blocked) return limited.blocked;

  const contentType = request.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const framing = ST_FRAMINGS.includes(form.get("framing") as never) ? (form.get("framing") as "waist" | "bust") : "waist";
      if (!(file instanceof File)) return NextResponse.json({ error: "Attach an image file." }, { status: 400 });
      if (file.size > MAX_UPLOAD) return NextResponse.json({ error: "The image is over 10 MB." }, { status: 413 });
      const buf = Buffer.from(await file.arrayBuffer());
      if (!sniffImage(buf)) return NextResponse.json({ error: "Only PNG, JPEG or WebP images are accepted." }, { status: 400 });
      const base = await normaliseBase(buf, ST_EDIT_MODEL.width, ST_EDIT_MODEL.height, framing);
      return NextResponse.json({ bases: [await store(base)] });
    }

    const parsed = PromptBody.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Describe the character (3–600 characters)." }, { status: 400 });
    const { prompt, styleNotes, framing, count } = parsed.data;
    const sfw = checkSfw(prompt, styleNotes);
    if (!sfw.ok) return NextResponse.json({ error: sfw.message }, { status: 400 });

    const settings = stPacksSettings();
    const text = basePrompt(prompt, framing, styleNotes);
    const ctx = { operationId: `stpack_base_${crypto.randomUUID()}`, userId: guard.userId, capUsd: settings.maxUsdPerExpression, spentUsd: 0, calls: 0, incomplete: false, pending: [] as Promise<unknown>[] };
    const images = await runInOperation(ctx, () => Promise.all(Array.from({ length: count }, () => generateStImage({
      prompt: text,
      width: ST_EDIT_MODEL.width,
      height: ST_EDIT_MODEL.height,
      task: "st_base",
      listPrice: ST_EDIT_MODEL.approxCostUsd,
      moderationRetryPrefix: FAMILY_FRIENDLY_PREFIX,
    }))));
    const bases = await Promise.all(images.map(async ({ image }) => store(await fitPng(image, ST_EDIT_MODEL.width, ST_EDIT_MODEL.height))));
    return NextResponse.json({ bases, costUsd: Math.round(ctx.spentUsd * 1000) / 1000 });
  } catch (err) {
    if (err instanceof ProviderModerationError) return NextResponse.json({ error: "Blocked by provider moderation. Rephrase the description." }, { status: 422 });
    console.error("[st-packs] base failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't prepare the base image. Try again." }, { status: 502 });
  }
}
