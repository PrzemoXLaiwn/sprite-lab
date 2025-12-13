import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Use the same bucket as sprite generations
const BUCKET_NAME = "generations";

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

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WebP, GIF" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 10MB" },
        { status: 400 }
      );
    }

    // Convert file to buffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique filename in user's folder
    const ext = file.name.split(".").pop() || "png";
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const filename = `${user.id}/uploads/${timestamp}-${randomId}.${ext}`;

    // Upload to Supabase Storage (same bucket as generations)
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type,
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
        { error: `Upload failed: ${error.message}` },
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
      { error: error instanceof Error ? error.message : "Upload failed" },
      { status: 500 }
    );
  }
}
