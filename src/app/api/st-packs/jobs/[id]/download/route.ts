// GET /api/st-packs/jobs/[id]/download?kind=…&label=…
// Everything a job produced, streamed from R2 behind the admin guard:
//   zip | png | gif | grid | readme   (job level; zip/png/gif are built on demand when missing)
//   webp | still | edit (+label)      (one expression; used for previews too)
//   base                              (the job's base still)
import { NextResponse } from "next/server";
import { JOB_ID_RE, requireStAdmin } from "../../../_lib/guard";
import { isExpressionLabel } from "@/config/st-expressions";
import { getR2ObjectBuffer, getR2SignedGetUrl } from "@/lib/r2";
import { buildArtifacts, buildExtraArchive, getJob, jobSlug } from "@/lib/st-packs/jobs";
import { packFileName, readmeText } from "@/lib/st-packs/package";

export const maxDuration = 120;

const KINDS = new Set(["zip", "png", "gif", "grid", "readme", "webp", "still", "edit", "base"]);

function file(body: Buffer | string, contentType: string, name?: string): NextResponse {
  const bytes = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  // Chunk the body. A buffered response over ~4.5 MB (the four-expression ZIP
  // is 10–18 MB) is dropped by the platform and the browser never saves it.
  const chunk = 64 * 1024;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (let off = 0; off < bytes.length; off += chunk) {
        controller.enqueue(bytes.subarray(off, Math.min(bytes.length, off + chunk)));
      }
      controller.close();
    },
  });
  return new NextResponse(stream, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.length),
      "Cache-Control": "private, no-store",
      ...(name ? { "Content-Disposition": `attachment; filename="${name}"` } : {}),
    },
  });
}

export async function GET(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const guard = await requireStAdmin();
  if (!guard.ok) return guard.response;
  const { id } = await ctx.params;
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind") ?? "";
  const label = url.searchParams.get("label");
  if (!JOB_ID_RE.test(id) || !KINDS.has(kind)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const slug = jobSlug(job);
  const notFound = () => NextResponse.json({ error: "Not available yet" }, { status: 404 });

  try {
    switch (kind) {
      case "readme":
        return file(readmeText(), "text/plain; charset=utf-8", packFileName(slug, "readme"));
      case "base": {
        const buf = job.baseKey ? await getR2ObjectBuffer(job.baseKey) : null;
        return buf ? file(buf, "image/png") : notFound();
      }
      case "zip":
      case "grid": {
        let key = kind === "zip" ? job.zipKey : job.gridKey;
        if (!key && (job.status === "done" || job.status === "partial")) {
          const built = await buildArtifacts(id);
          key = kind === "zip" ? built.zipKey : built.gridKey;
        }
        if (!key) return notFound();
        const type = kind === "zip" ? "application/zip" : "image/gif";
        const name = packFileName(slug, kind);
        // The browser fetches the bytes from storage. The function only mints the URL.
        const signed = await getR2SignedGetUrl(key, { contentType: type, filename: name });
        if (signed) return NextResponse.redirect(signed, 302);
        const buf = await getR2ObjectBuffer(key);
        return buf ? file(buf, type, name) : notFound();
      }
      case "png":
      case "gif": {
        const buf = await buildExtraArchive(id, kind);
        return buf ? file(buf, "application/zip", packFileName(slug, kind)) : notFound();
      }
      default: {
        if (!label || !isExpressionLabel(label)) return notFound();
        const e = job.expressions.find((x) => x.label === label);
        const key = kind === "webp" ? e?.webpKey : kind === "still" ? e?.pngKey : e?.editKey;
        const buf = key ? await getR2ObjectBuffer(key) : null;
        if (!buf) return notFound();
        const type = kind === "webp" ? "image/webp" : "image/png";
        return file(buf, type, url.searchParams.has("dl") ? `${label}.${kind === "webp" ? "webp" : "png"}` : undefined);
      }
    }
  } catch (err) {
    console.error("[st-packs] download failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Couldn't read that file." }, { status: 502 });
  }
}
