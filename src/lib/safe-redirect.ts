// Same-origin relative return paths for post-auth redirects.
// `${origin}${next}` must never be able to leave the site: reject absolute
// URLs, protocol-relative paths (`//evil.com`), and backslash variants that
// the URL parser treats as a different host (`/\evil.com`).

const FALLBACK = "/generate";
const DEFAULT_ORIGIN = "https://spritelab.local";

function trustedOrigin(origin?: string): string {
  try {
    return new URL(origin || DEFAULT_ORIGIN).origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

/** Control chars, whitespace, or a backslash — any of these can retarget a redirect. */
function hasUnsafeChars(value: string): boolean {
  return /[\u0000-\u001F\u007F\\]/.test(value) || /\s/.test(value);
}

function isRelativePath(value: string): boolean {
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return false;
  if (value.includes("\\") || value.includes("://")) return false;
  if (hasUnsafeChars(value)) return false;
  return true;
}

/**
 * Return a same-site path (`pathname + search + hash`), or `/generate` when
 * `next` is missing or could redirect off-site.
 */
export function safeRedirectPath(next: string | null | undefined, origin?: string): string {
  if (typeof next !== "string" || next.length === 0 || next.length > 2048) return FALLBACK;
  if (!isRelativePath(next)) return FALLBACK;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    return FALLBACK;
  }
  // Encoded payloads such as `/%2f%2fevil.com` or `/%5c%5cevil.com` decode into
  // an off-site path even when the raw string still parses as same-origin.
  if (decoded !== next && !isRelativePath(decoded)) return FALLBACK;

  const base = trustedOrigin(origin);
  try {
    const url = new URL(next, base);
    if (url.origin !== base || url.username || url.password) return FALLBACK;
    const path = `${url.pathname}${url.search}${url.hash}`;
    if (!isRelativePath(path)) return FALLBACK;
    return path;
  } catch {
    return FALLBACK;
  }
}

/** True for `/checkout` and `/checkout/...` (plans, credit packs, lifetime). */
export function isCheckoutReturn(path: string): boolean {
  const end = path.search(/[?#]/);
  const pathname = end === -1 ? path : path.slice(0, end);
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}
