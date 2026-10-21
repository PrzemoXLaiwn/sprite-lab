import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { SafeFetchError, safeFetchImage } from "@/lib/safe-fetch";
import {
  integerDownsample,
  isRemoteSpriteUrl,
  nearestPixelBox,
  snapThumbWidth,
  THUMB_WIDTHS,
} from "@/lib/image/sprite-thumb";

export const runtime = "nodejs";
export const maxDuration = 30;

const LOCAL_PREFIXES = ["/showcase/", "/styles/"];
const MAX_BYTES = 12 * 1024 * 1024;
const NO_STORE = { "Cache-Control": "no-store" };

class ThumbInputError extends Error {
  status: 400 | 404;
  constructor(status: 400 | 404, message: string) {
    super(message);
    this.name = "ThumbInputError";
    this.status = status;
  }
}

function localFile(src: string): string | null {
  if (!LOCAL_PREFIXES.some((prefix) => src.startsWith(prefix))) return null;
  if (src.includes("..") || src.includes("\\") || src.includes("\0")) return null;
  const publicDir = path.join(process.cwd(), "public");
  const full = path.resolve(publicDir, src.slice(1));
  if (full !== publicDir && !full.startsWith(publicDir + path.sep)) return null;
  return full;
}

/** Only src, w, and k=nearest, in that order. Anything else is a new cache key. */
function canonicalUrl(request: NextRequest, src: string, width: number): URL {
  const url = new URL("/api/sprite-thumb", request.nextUrl.origin);
  url.searchParams.set("src", src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("k", "nearest");
  return url;
}

function isCanonical(request: NextRequest, src: string, width: number): boolean {
  const params = request.nextUrl.searchParams;
  const keys = [...params.keys()];
  if (keys.length !== 3 || keys[0] !== "src" || keys[1] !== "w" || keys[2] !== "k") return false;
  if (params.getAll("src").length !== 1 || params.getAll("w").length !== 1 || params.getAll("k").length !== 1) return false;
  return params.get("src") === src && params.get("w") === String(width) && params.get("k") === "nearest";
}

/**
 * Nearest-neighbor WebP inside a snapped width. Integer scale when the
 * source divides evenly. Cached for a year — the query is canonical, so
 * extra params cannot mint a new R2 fetch.
 */
export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get("src") || "";
  const width = Number(request.nextUrl.searchParams.get("w"));
  const allowed = (THUMB_WIDTHS as readonly number[]).includes(width);
  if (!src || !allowed || snapThumbWidth(width) !== width) {
    return new NextResponse("Bad request", { status: 400, headers: NO_STORE });
  }
  if (!isCanonical(request, src, width)) {
    return NextResponse.redirect(canonicalUrl(request, src, width), {
      status: 308,
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  }

  try {
    const input = await loadSource(src);
    const body = await nearestWebp(input, width);
    return new NextResponse(new Uint8Array(body), {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (error instanceof ThumbInputError) {
      return new NextResponse(error.message, { status: error.status, headers: NO_STORE });
    }
    if (error instanceof SafeFetchError) {
      if (error.code === "NOT_FOUND") {
        return new NextResponse("Not found", { status: 404, headers: NO_STORE });
      }
      const status = error.code === "HOST_NOT_ALLOWED" || error.code === "INVALID_URL" ? 400 : 502;
      return new NextResponse("Bad image", { status, headers: NO_STORE });
    }
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return new NextResponse("Not found", { status: 404, headers: NO_STORE });
    }
    if (code === "EISDIR") {
      return new NextResponse("Not a file", { status: 400, headers: NO_STORE });
    }
    return new NextResponse("Could not resize", { status: 502, headers: NO_STORE });
  }
}

async function loadSource(src: string): Promise<Buffer> {
  const file = localFile(src);
  if (file) {
    const info = await stat(file).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") throw new ThumbInputError(404, "Not found");
      throw error;
    });
    if (!info.isFile()) throw new ThumbInputError(400, "Not a file");
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

async function nearestWebp(input: Buffer, max: number): Promise<Buffer> {
  let raw: { data: Buffer; info: sharp.OutputInfo };
  try {
    raw = await sharp(input, { animated: false, limitInputPixels: 24_000_000 })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ThumbInputError(400, "Not an image");
  }
  const srcW = raw.info.width;
  const srcH = raw.info.height;
  const channels = raw.info.channels;
  if (!srcW || !srcH) throw new ThumbInputError(400, "Not an image");
  const box = nearestPixelBox(srcW, srcH, max, max);
  const factor = srcW / box.width;
  const pixels =
    Number.isInteger(factor) && factor === srcH / box.height
      ? integerDownsample(raw.data, srcW, srcH, channels, factor)
      : await sharp(raw.data, { raw: { width: srcW, height: srcH, channels } })
          .resize({ width: box.width, height: box.height, fit: "fill", kernel: "nearest" })
          .raw()
          .toBuffer();
  return sharp(pixels, { raw: { width: box.width, height: box.height, channels } })
    .webp({ lossless: true, effort: 4 })
    .toBuffer();
}
