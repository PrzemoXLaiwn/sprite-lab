// =============================================================================
// Reading our own images (R2) in the browser
// =============================================================================
// Thumbnails show the same file through a plain <img>, which the browser caches
// without CORS headers. A later fetch() of that URL (to read pixels, download
// a PNG or build a ZIP) gets the cached copy and fails with "Failed to fetch".
// Cross-origin images are therefore read under their own cache key.
// =============================================================================

/** The URL to fetch() an image from in the browser (cross-origin files get `px=1`). */
export function corsUrl(url: string): string {
  if (typeof window === "undefined" || !/^https?:/i.test(url) || url.startsWith(window.location.origin)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}px=1`;
}

/** fetch() for an image that may also be on screen as an <img>. */
export function fetchImage(url: string, init?: RequestInit): Promise<Response> {
  return fetch(corsUrl(url), init);
}
