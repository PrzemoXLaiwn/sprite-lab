import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

import { randomUUID } from "crypto";

// Use the same bucket as sprite generations
const BUCKET_NAME = "generations";

const MAX_SIZE = 10 * 1024 * 1024;

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Detect PNG / JPEG / WebP / GIF from magic bytes. */
function sniffImageType(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }
  if (buf.length >= 6) {
    const head = buf.subarray(0, 6).toString("ascii");
    if (head === "GIF87a" || head === "GIF89a") return "image/gif";
  }
  if (
    buf.length >= 12 &&
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to upload images." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (typeof file === "string" || typeof file.arrayBuffer !== "function") {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type (declared MIME must be on the allowlist)
    const declaredType = (file.type || "").toLowerCase();
    if (!(declaredType in EXTENSION_BY_MIME)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    if (buffer.byteLength > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Verify the bytes are actually the declared image type (magic bytes).
    // Never trust the client-supplied MIME or filename.
    const sniffedType = sniffImageType(buffer);
    if (!sniffedType || sniffedType !== declaredType) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Generate unique filename in user's folder. Extension is derived from
    // the validated MIME type, never from the client filename.
    const ext = EXTENSION_BY_MIME[sniffedType];
    const timestamp = Date.now();
    const randomId = randomUUID();
    const filename = `${user.id}/uploads/${timestamp}-${randomId}.${ext}`;

    // Upload to Supabase Storage (same bucket as generations)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: sniffedType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      console.error("[Upload] Supabase error:", error);

      // If bucket doesn't exist or permission denied, give helpful error
      if (error.message.includes("not found") || error.message.includes("Bucket")) {
        return NextResponse.json(
          { error: "Storage not configured. Please create a 'generations' bucket in Supabase." },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: "Upload failed. Please try again." },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(data.path);

    console.log("[Upload] Success:", publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename: data.path,
    });

  } catch (error) {
    console.error("[Upload] Error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
