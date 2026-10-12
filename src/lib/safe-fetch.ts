// =============================================================================
// SPRITELAB — SAFE IMAGE FETCH (SSRF + memory-DoS hardening)
// =============================================================================
// Every server-side fetch of a URL that came from a client MUST go through
// safeFetchImage(). It enforces:
//   - https: only (plus inline data:image/... URLs, which never hit the network)
//   - host allowlist: only hosts we store images on / receive them from
//   - redirect: "manual" — each hop is re-validated against the allowlist
//   - hard timeout
//   - content-type image/*
//   - max byte size enforced WHILE streaming (never buffers more than the cap)
//
// Allowed hosts:
//   - R2_PUBLIC_URL hostname            (primary image storage / CDN)
//   - NEXT_PUBLIC_SUPABASE_URL hostname (Supabase Storage fallback + uploads)
//   - im.runware.ai                     (Runware output URLs)
//   - replicate.delivery + subdomains   (Replicate output URLs)
//   - IMAGE_FETCH_ALLOWED_HOSTS         (optional, comma-separated exact hosts)
// =============================================================================

export type SafeFetchErrorCode =
  | "INVALID_URL"
  | "HOST_NOT_ALLOWED"
  | "TOO_MANY_REDIRECTS"
  | "UPSTREAM_ERROR"
  | "NOT_IMAGE"
  | "TOO_LARGE"
  | "TIMEOUT";

export class SafeFetchError extends Error {
  code: SafeFetchErrorCode;
  constructor(code: SafeFetchErrorCode, message: string) {
    super(message);
    this.name = "SafeFetchError";
    this.code = code;
  }
}

export interface SafeFetchOptions {
  /** Max bytes to accept. Default 10MB. */
  maxBytes?: number;
  /** Total time budget for the fetch, including body. Default 15s. */
  timeoutMs?: number;
  /** Max redirect hops (each re-validated). Default 3. */
  maxRedirects?: number;
}

export interface SafeFetchResult {
  buffer: Buffer;
  contentType: string;
  /** The final URL fetched (after validated redirects) or the data: URL. */
  url: string;
}

const DEFAULT_MAX_BYTES = 10 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_REDIRECTS = 3;

// Exact hosts that are always allowed (provider output hosts).
const STATIC_EXACT_HOSTS = ["im.runware.ai", "replicate.delivery"];
// Suffixes — kept to provider-owned delivery domains only.
const STATIC_HOST_SUFFIXES = [".replicate.delivery"];

function hostnameFromEnvUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function getAllowedExactHosts(): Set<string> {
  const hosts = new Set<string>(STATIC_EXACT_HOSTS);
  const r2 = hostnameFromEnvUrl(process.env.R2_PUBLIC_URL);
  if (r2) hosts.add(r2);
  const supabase = hostnameFromEnvUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
  if (supabase) hosts.add(supabase);
  for (const extra of (process.env.IMAGE_FETCH_ALLOWED_HOSTS || "").split(",")) {
    const h = extra.trim().toLowerCase();
    if (h) hosts.add(h);
  }
  return hosts;
}

/** True when the hostname is on the image allowlist. */
export function isAllowedImageHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/\.$/, "");
  if (!lower) return false;
  if (getAllowedExactHosts().has(lower)) return true;
  return STATIC_HOST_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

const DATA_URL_RE = /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([A-Za-z0-9+/=\s]+)$/i;

/**
 * Validate a client-supplied image URL without fetching it.
 * Returns the parsed URL, or throws SafeFetchError.
 * data:image/... URLs are accepted and returned as-is.
 */
export function assertSafeImageUrl(raw: unknown): URL {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > 20_000_000) {
    throw new SafeFetchError("INVALID_URL", "Invalid image URL");
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SafeFetchError("INVALID_URL", "Invalid image URL");
  }
  if (parsed.protocol === "data:") {
    if (!DATA_URL_RE.test(raw)) {
      throw new SafeFetchError("INVALID_URL", "Unsupported data URL");
    }
    return parsed;
  }
  if (parsed.protocol !== "https:") {
    throw new SafeFetchError("INVALID_URL", "Only https URLs are allowed");
  }
  if (parsed.username || parsed.password || (parsed.port && parsed.port !== "443")) {
    throw new SafeFetchError("INVALID_URL", "Invalid image URL");
  }
  if (!isAllowedImageHost(parsed.hostname)) {
    throw new SafeFetchError("HOST_NOT_ALLOWED", "Image host is not allowed");
  }
  return parsed;
}

function decodeDataUrl(raw: string, maxBytes: number): SafeFetchResult {
  const match = DATA_URL_RE.exec(raw);
  if (!match) throw new SafeFetchError("INVALID_URL", "Unsupported data URL");
  const b64 = match[2].replace(/\s+/g, "");
  // Check the size BEFORE decoding (base64 = 4 chars per 3 bytes).
  if (Math.floor((b64.length * 3) / 4) > maxBytes + 3) {
    throw new SafeFetchError("TOO_LARGE", "Image is too large");
  }
  const buffer = Buffer.from(b64, "base64");
  if (buffer.byteLength > maxBytes) {
    throw new SafeFetchError("TOO_LARGE", "Image is too large");
  }
  const contentType = match[1].toLowerCase() === "image/jpg" ? "image/jpeg" : match[1].toLowerCase();
  return { buffer, contentType, url: raw };
}

async function readBodyCapped(
  response: Response,
  maxBytes: number,
  controller: AbortController
): Promise<Buffer> {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        controller.abort();
        try { await reader.cancel(); } catch { /* ignore */ }
        throw new SafeFetchError("TOO_LARGE", "Image is too large");
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength)), total);
}

/**
 * Fetch an image from a client-supplied URL with SSRF / DoS protections.
 * Throws SafeFetchError on any violation. Never follows a redirect to a host
 * outside the allowlist.
 */
export async function safeFetchImage(
  rawUrl: unknown,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult> {
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRedirects = options.maxRedirects ?? DEFAULT_MAX_REDIRECTS;

  let current = assertSafeImageUrl(rawUrl);
  if (current.protocol === "data:") {
    return decodeDataUrl(rawUrl as string, maxBytes);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; ; hop++) {
      let response: Response;
      try {
        response = await fetch(current.toString(), {
          headers: { Accept: "image/*" },
          redirect: "manual",
          signal: controller.signal,
          cache: "no-store",
        });
      } catch (err) {
        if (controller.signal.aborted) throw new SafeFetchError("TIMEOUT", "Image fetch timed out");
        throw new SafeFetchError("UPSTREAM_ERROR", `Image fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      }

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        try { await response.body?.cancel(); } catch { /* ignore */ }
        if (!location || hop >= maxRedirects) {
          throw new SafeFetchError("TOO_MANY_REDIRECTS", "Too many redirects");
        }
        // Re-validate every hop against the allowlist (https only, no data:).
        const next = new URL(location, current);
        if (next.protocol !== "https:") {
          throw new SafeFetchError("HOST_NOT_ALLOWED", "Redirect target is not allowed");
        }
        current = assertSafeImageUrl(next.toString());
        continue;
      }

      if (!response.ok) {
        try { await response.body?.cancel(); } catch { /* ignore */ }
        throw new SafeFetchError("UPSTREAM_ERROR", `Upstream responded ${response.status}`);
      }

      const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (!contentType.startsWith("image/")) {
        try { await response.body?.cancel(); } catch { /* ignore */ }
        throw new SafeFetchError("NOT_IMAGE", "Resource is not an image");
      }

      const declared = Number(response.headers.get("content-length") || 0);
      if (declared && declared > maxBytes) {
        try { await response.body?.cancel(); } catch { /* ignore */ }
        throw new SafeFetchError("TOO_LARGE", "Image is too large");
      }

      let buffer: Buffer;
      try {
        buffer = await readBodyCapped(response, maxBytes, controller);
      } catch (err) {
        if (err instanceof SafeFetchError) throw err;
        if (controller.signal.aborted) throw new SafeFetchError("TIMEOUT", "Image fetch timed out");
        throw new SafeFetchError("UPSTREAM_ERROR", "Image download failed");
      }

      return { buffer, contentType, url: current.toString() };
    }
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Map a SafeFetchError to a client-safe message + HTTP status. Never echoes
 * upstream status codes or network error text (prevents port/host probing).
 */
export function safeFetchErrorResponse(
  err: unknown,
  maxMb?: number
): { error: string; status: number } {
  if (err instanceof SafeFetchError) {
    switch (err.code) {
      case "INVALID_URL":
        return { error: "Invalid image URL.", status: 400 };
      case "HOST_NOT_ALLOWED":
        return { error: "Images can only be loaded from SpriteLab storage.", status: 400 };
      case "NOT_IMAGE":
        return { error: "The provided URL is not an image.", status: 415 };
      case "TOO_LARGE":
        return {
          error: maxMb ? `Image too large (max ${maxMb}MB). Please use a smaller image.` : "Image too large.",
          status: 413,
        };
      case "TIMEOUT":
        return { error: "Loading the image timed out.", status: 504 };
      default:
        return { error: "Could not load the image.", status: 502 };
    }
  }
  return { error: "Could not load the image.", status: 502 };
}
