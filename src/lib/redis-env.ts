// Upstash Redis REST credentials.
//
// A url and token are returned only when they share one prefix. Prefixes are
// checked in order; the first one with both values non-empty wins. A url from
// one prefix is never paired with a token from another.
//
// Read-only tokens, KV_URL and REDIS_URL are never read.

export const REDIS_REST_SOURCES = [
  {
    source: "UPSTASH_REDIS_REST",
    url: "UPSTASH_REDIS_REST_URL",
    token: "UPSTASH_REDIS_REST_TOKEN",
  },
  {
    source: "UPSTASH_REDIS_REST_KV_REST_API",
    url: "UPSTASH_REDIS_REST_KV_REST_API_URL",
    token: "UPSTASH_REDIS_REST_KV_REST_API_TOKEN",
  },
  {
    source: "KV_REST_API",
    url: "KV_REST_API_URL",
    token: "KV_REST_API_TOKEN",
  },
] as const;

export type RedisRestSource = (typeof REDIS_REST_SOURCES)[number]["source"];

export type RedisRestEnv = {
  url: string | undefined;
  token: string | undefined;
  /** Set only when url and token come from the same prefix. */
  source: RedisRestSource | undefined;
  /** True when no complete pair exists, but at least one prefix has only one side. */
  partial: boolean;
  /** Env names still missing on half-set prefixes. Empty when a pair was chosen or nothing is set. */
  missing: string[];
};

function nonempty(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

/** REST url + write token from a single prefix, plus which prefix was chosen. */
export function getRedisRestEnv(): RedisRestEnv {
  const missing: string[] = [];

  for (const pair of REDIS_REST_SOURCES) {
    const url = nonempty(pair.url);
    const token = nonempty(pair.token);
    if (url && token) {
      return { url, token, source: pair.source, partial: false, missing: [] };
    }
    if (url) missing.push(pair.token);
    else if (token) missing.push(pair.url);
  }

  return {
    url: undefined,
    token: undefined,
    source: undefined,
    partial: missing.length > 0,
    missing,
  };
}

/** True when a same-prefix url and write token are both set. */
export function isRedisRestConfigured(): boolean {
  const { url, token, source } = getRedisRestEnv();
  return Boolean(source && url && token);
}

/** Hostname only. Invalid URLs and anything that still contains the token become undefined. */
export function redisRestHost(url: string | undefined, token?: string): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(url).hostname;
    if (!hostname) return undefined;
    if (token && hostname.includes(token)) return undefined;
    return hostname;
  } catch {
    return undefined;
  }
}

function errorText(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && !seen.has(current) && parts.length < 8) {
    seen.add(current);
    if (current instanceof Error) {
      parts.push(current.name, current.message);
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string") parts.push(code);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join(" ");
}

/**
 * Allowlisted Redis failure label. The raw message, URL and token never pass through.
 */
export function sanitizeRedisError(error: unknown): string {
  const text = errorText(error);
  if (/WRONGPASS/i.test(text)) return "WRONGPASS";
  if (/NOPERM/i.test(text)) return "NOPERM";
  if (/\b401\b|unauthorized/i.test(text)) return "401 Unauthorized";
  if (/timeout|timed out|AbortError|\baborted\b/i.test(text)) return "timeout";
  if (/ENOTFOUND|EAI_AGAIN|EAI_NONAME|getaddrinfo|\bDNS\b/i.test(text)) return "DNS";
  return "Redis error";
}

/** err.message with the REST token and any absolute URL removed. */
export function redisErrorLogMessage(err: unknown): string {
  const raw = err instanceof Error && err.message ? err.message : "Redis error";
  const { token, url } = getRedisRestEnv();
  let message = raw;
  if (token && token.length >= 8) message = message.split(token).join("[redacted]");
  if (url) message = message.split(url).join(redisRestHost(url, token) ?? "[redacted]");
  message = message.replace(/https?:\/\/[^\s)'"]+/gi, (match) => redisRestHost(match, token) ?? "[redacted]");
  return message;
}
