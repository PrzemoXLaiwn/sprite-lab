import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeFetchImage, SafeFetchError } from "@/lib/safe-fetch";

// =============================================================================
// Image Proxy API
// =============================================================================
// Fetches images from external URLs and returns them as base64. The canvas
// edit / variation flows can't read pixels from cross-origin images directly,
// so this is the bridge.
//
// SSRF HARDENING (see src/lib/safe-fetch.ts):
//  - Auth required.
//  - Exact host allowlist — our own storage hosts + provider output hosts.
//  - Protocol forced to https:, no custom ports, no credentials in URL.
//  - Redirects are NOT followed blindly — every hop is re-validated.
//  - Response size capped while streaming so a hostile server can't OOM us.
//  - Upstream status codes / network errors are never echoed to the client
//    (prevents using the proxy as a port / host probe).
// =============================================================================

const MAX_BYTES = 25 * 1024 * 1024; // 25MB hard cap
const FETCH_TIMEOUT_MS = 15_000;

export async function GET(request: NextRequest) {
  try {
    // Auth check
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = request.nextUrl.searchParams.get("url");
    if (!raw) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    const { buffer, contentType } = await safeFetchImage(raw, {
      maxBytes: MAX_BYTES,
      timeoutMs: FETCH_TIMEOUT_MS,
    });

    const base64 = buffer.toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      contentType,
      size: buffer.byteLength,
    });
  } catch (error) {
    if (error instanceof SafeFetchError) {
      switch (error.code) {
        case "INVALID_URL":
          return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
        case "HOST_NOT_ALLOWED":
          console.warn("[Image Proxy] Blocked URL");
          return NextResponse.json(
            { error: "Host is not on the proxy allowlist" },
            { status: 400 }
          );
        case "TOO_LARGE":
          return NextResponse.json(
            { error: "Image exceeds 25MB limit" },
            { status: 413 }
          );
        default:
          // Upstream / redirect / timeout / content-type: generic 502, no detail.
          console.error("[Image Proxy] Fetch failed:", error.code, error.message);
          return NextResponse.json(
            { error: "Failed to fetch image" },
            { status: 502 }
          );
      }
    }
    console.error("[Image Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" }, // never echo internal error to client
      { status: 500 }
    );
  }
}
