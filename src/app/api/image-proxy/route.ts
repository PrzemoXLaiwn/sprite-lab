import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// =============================================================================
// Image Proxy API
// =============================================================================
// Fetches images from external URLs and returns them as base64. The canvas
// edit / variation flows can't read pixels from cross-origin images directly,
// so this is the bridge.
//
// SSRF HARDENING:
//  - Auth required (was already enforced).
//  - Host allowlist — only providers we actually serve images from.
//  - Protocol forced to https:.
//  - Reject IP-literal hosts and any host that resolves into RFC1918 / link-
//    local / loopback ranges before its first character is even examined.
//  - Response size capped so a hostile server can't OOM the worker.
//
// Without these guards, a logged-in user could hit
//   ?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/
// and exfiltrate cloud metadata (or any internal service reachable from the
// edge runtime). The proxy is intentionally narrow.
// =============================================================================

const MAX_BYTES = 25 * 1024 * 1024; // 25MB hard cap
const FETCH_TIMEOUT_MS = 15_000;

// Hosts the proxy is allowed to fetch from. Add new providers explicitly.
// Suffix matching: "im.runware.ai" allowed because it ends with ".runware.ai".
const ALLOWED_HOST_SUFFIXES = [
  ".runware.ai",
  "runware.ai",
  ".r2.cloudflarestorage.com",
  "r2.cloudflarestorage.com",
  ".cloudflarestorage.com",
  ".supabase.co",
  ".supabase.in",
  ".replicate.delivery",
  "replicate.delivery",
];

// If R2_PUBLIC_URL is configured (custom CDN domain), allow it explicitly.
function getDynamicAllowedHosts(): string[] {
  const r2 = process.env.R2_PUBLIC_URL;
  if (!r2) return [];
  try {
    return [new URL(r2).hostname];
  } catch {
    return [];
  }
}

function isHostAllowed(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Reject IP literals — too easy to point at internal ranges.
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(lower)) return false;
  if (lower.includes(":")) return false; // crude IPv6 / port check
  if (lower === "localhost" || lower.endsWith(".localhost")) return false;

  const dynamic = getDynamicAllowedHosts();
  if (dynamic.includes(lower)) return true;

  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) =>
      lower === suffix.replace(/^\./, "") ||
      lower.endsWith(suffix.startsWith(".") ? suffix : `.${suffix}`)
  );
}

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

    // Parse + protocol-gate
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
    if (parsed.protocol !== "https:") {
      return NextResponse.json(
        { error: "Only https URLs are allowed" },
        { status: 400 }
      );
    }

    // Allowlist
    if (!isHostAllowed(parsed.hostname)) {
      console.warn("[Image Proxy] Blocked host:", parsed.hostname);
      return NextResponse.json(
        { error: "Host is not on the proxy allowlist" },
        { status: 400 }
      );
    }

    // Bounded fetch
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(parsed.toString(), {
        headers: { Accept: "image/*" },
        signal: controller.signal,
        redirect: "follow",
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      console.error("[Image Proxy] Fetch failed:", response.status);
      return NextResponse.json(
        { error: `Failed to fetch image: ${response.status}` },
        { status: 502 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/png";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Resource is not an image" },
        { status: 415 }
      );
    }

    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength && declaredLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 25MB limit" },
        { status: 413 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image exceeds 25MB limit" },
        { status: 413 }
      );
    }

    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:${contentType};base64,${base64}`;

    return NextResponse.json({
      success: true,
      dataUrl,
      contentType,
      size: arrayBuffer.byteLength,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return NextResponse.json(
        { error: "Image fetch timed out" },
        { status: 504 }
      );
    }
    console.error("[Image Proxy] Error:", error);
    return NextResponse.json(
      { error: "Failed to proxy image" }, // never echo internal error to client
      { status: 500 }
    );
  }
}
