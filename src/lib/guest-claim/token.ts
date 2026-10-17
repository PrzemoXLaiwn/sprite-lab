// =============================================================================
// Guest sprite claim tokens — pure helpers shared by server and browser.
// =============================================================================
// A guest generation on the landing page is stored in R2 under an
// unguessable token (24 random bytes, base64url = 32 chars). After signup the
// browser sends the token to /api/guest/claim, which moves the sprite into the
// new account. Tokens are bearer secrets: whoever holds one can claim it once.
// No Node or browser APIs here so both sides (and tests) can import it.
// =============================================================================

/** 24 random bytes encoded as base64url, no padding. */
export const GUEST_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;

/** A guest sprite can be claimed for 48 hours after it was generated. */
export const GUEST_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

/** At most this many tokens are kept in the browser and accepted per claim. */
export const MAX_GUEST_TOKENS = 3;

export function isValidGuestToken(value: unknown): value is string {
  return typeof value === "string" && GUEST_TOKEN_PATTERN.test(value);
}

/**
 * True when a sprite created at `createdAtMs` can no longer be claimed.
 * A timestamp in the future (clock skew beyond 5 minutes) or a non-finite
 * value is treated as expired — never trust it to extend the window.
 */
export function isGuestTokenExpired(createdAtMs: number, nowMs: number = Date.now()): boolean {
  if (!Number.isFinite(createdAtMs)) return true;
  if (createdAtMs - nowMs > 5 * 60 * 1000) return true;
  return nowMs - createdAtMs > GUEST_TOKEN_TTL_MS;
}
