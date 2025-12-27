import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Image Proxy API
 * Fetches images from external URLs and returns them as base64
 * This solves CORS issues when loading images to canvas for editing
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get image URL from query params
    const url = request.nextUrl.searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL" },
        { status: 400 }
      );
    }

    console.log("[Image Proxy] Fetching:", url.substring(0, 100));

    // Fetch the image
    const response = await fetch(url, {
      headers: {
        "Accept": "image/*",
      },
    });

    if (!response.ok) {
      console.error("[Image Proxy] Fetch failed:", response.status);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 500 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    console.log("[Image Proxy] Success, size:", arrayBuffer.byteLength);

    return NextResponse.json({
      success: true,
      dataUrl,
      contentType,
      size: arrayBuffer.byteLength,
    });
  } catch (error) {
    console.error("[Image Proxy] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to proxy image" },
      { status: 500 }
    );
  }
}
