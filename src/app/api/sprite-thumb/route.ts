import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { SafeFetchError, safeFetchImage } from "@/lib/safe-fetch";
import { isRemoteSpriteUrl, snapThumbWidth, THUMB_WIDTHS } from "@/lib/image/sprite-thumb";

export const runtime = "nodejs";
export const maxDuration = 30;

const LOCAL_PREFIXES = ["/showcase/", "/styles/"];
const MAX_BYTES = 12 * 1024 * 1024;

function localFile(src: string): string | null {
  if (!LOCAL_PREFIXES.some((prefix) => src.startsWith(prefix))) return null;
  if (src.includes("..") || src.includes("\\") || src.includes("\0")) return null;
  const publicDir = path.join(process.cwd(), "public");
  const full = path.resolve(publicDir, src.slice(1));
  if (full !== publicDir && !full.startsWith(publicDir + path.sep)) return null;
  return full;
}

/**
 * Nearest-neighbor (pixel art) or smooth (painted) WebP at a snapped width.
 * Cached for a year — R2 keys are content-addressed, static files change
 * only on deploy.
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") || "";
  const width = Number(request.nextUrl.searchParams.get("w"));
  const kernel = request.nextUrl.searchParams.get("k") === "smooth" ? "smooth" : "nearest";
  const allowed = (THUMB_WIDTHS as readonly number[]).includes(width);
  if (!allowed || snapThumbWidth(width) !== width) {
    return new NextResponse("Bad width", { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const input = await loadSource(src);
    const resized = sharp(input, { animated: false, limitInputPixels: 24_000_000 }).resize({
      width,
      height: width,
      fit: "inside",
      withoutEnlargement: true,
      kernel: kernel === "nearest" ? "nearest" : "lanczos3",
    });
    const body =
      kernel === "nearest"
        ? await resized.webp({ lossless: true, effort: 4 }).toBuffer()
        : await resized.webp({ quality: 75, effort: 4 }).toBuffer();

    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof SafeFetchError) {
      const status = error.code === "HOST_NOT_ALLOWED" || error.code === "INVALID_URL" ? 400 : 502;
      return new NextResponse("Bad image", { status, headers: { "Cache-Control": "no-store" } });
    }
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
    }
    return new NextResponse("Could not resize", { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}

async function loadSource(src: string): Promise<Buffer> {
  const file = localFile(src);
  if (file) {
    const buf = await readFile(file);
    if (buf.byteLength > MAX_BYTES) throw new SafeFetchError("TOO_LARGE", "Image is too large");
    return buf;
  }
  if (!isRemoteSpriteUrl(src)) {
    throw new SafeFetchError("HOST_NOT_ALLOWED", "Image host is not allowed");
  }
  const fetched = await safeFetchImage(src, { maxBytes: MAX_BYTES, timeoutMs: 20_000 });
  return fetched.buffer;
}
