// Upstash Redis REST credentials.
//
// The Vercel Upstash integration writes UPSTASH_REDIS_REST_KV_REST_API_URL /
// UPSTASH_REDIS_REST_KV_REST_API_TOKEN (and the KV_REST_API_* aliases).
// Older config uses UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN.
// First set value wins. Read-only tokens are never consulted.

function firstEnv(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value != null && value !== "") return value;
  }
  return undefined;
}

/** REST url + write token. Either field is undefined when no alias is set. */
export function getRedisRestEnv(): { url: string | undefined; token: string | undefined } {
  return {
    url: firstEnv(
      "UPSTASH_REDIS_REST_URL",
      "UPSTASH_REDIS_REST_KV_REST_API_URL",
      "KV_REST_API_URL",
    ),
    token: firstEnv(
      "UPSTASH_REDIS_REST_TOKEN",
      "UPSTASH_REDIS_REST_KV_REST_API_TOKEN",
      "KV_REST_API_TOKEN",
    ),
  };
}

/** True when any accepted url/token pair can authenticate a REST client. */
export function isRedisRestConfigured(): boolean {
  const { url, token } = getRedisRestEnv();
  return Boolean(url && token);
}
