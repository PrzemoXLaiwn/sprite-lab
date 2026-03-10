// =============================================================================
// SPRITELAB — RATE LIMITING
// =============================================================================
// Uses Upstash Redis + @upstash/ratelimit (sliding window).
//
// FAIL-OPEN DESIGN: If Redis is not configured (UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN env vars absent), every call to checkRateLimit()
// returns null (= allowed). This means:
//   - Local development works with no Redis setup
//   - Production with Redis missing fails open (requests pass through)
//   - Rate limiting activates automatically once env vars are set
//
// Required env vars (add to Vercel dashboard when ready):
//   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
//   UPSTASH_REDIS_REST_TOKEN=AXxx...
//
// To provision: https://console.upstash.com → Create Database → REST API
// Free tier is sufficient for this usage pattern.
// =============================================================================

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// -----------------------------------------------------------------------------
// REDIS CLIENT — lazy, only created when env vars are present
// -----------------------------------------------------------------------------

let redis: Redis | null = null;

function getRedis(): Redis | null {
  if (redis) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    // Not configured — rate limiting disabled, fail open
    return null;
  }

  try {
    redis = new Redis({ url, token });
    return redis;
  } catch {
    console.warn("[RateLimit] Failed to initialise Redis client — rate limiting disabled");
    return null;
  }
}

// -----------------------------------------------------------------------------
// RATE LIMITER FACTORY
// Returns null when Redis is not available (fail-open pattern).
// -----------------------------------------------------------------------------

function createLimiter(
  requests: number,
  windowSeconds: number,
  prefix: string
): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;

  return new Ratelimit({
    redis: r,
    limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
    prefix: `spritelab:${prefix}`,
    analytics: false, // Keeps request count low on free tier
  });
}

// -----------------------------------------------------------------------------
// LIMITERS — created on first use
// -----------------------------------------------------------------------------

// Cache limiter instances so they're not recreated per request
const _limiters: Record<string, Ratelimit | null> = {};

function getLimiter(
  key: string,
  requests: number,
  windowSeconds: number
): Ratelimit | null {
  if (key in _limiters) return _limiters[key];
  _limiters[key] = createLimiter(requests, windowSeconds, key);
  return _limiters[key];
}

// -----------------------------------------------------------------------------
// IP HELPER
// -----------------------------------------------------------------------------

/**
 * Extract the best available client IP from request headers.
 * Checks x-forwarded-for (Vercel/Cloudflare), x-real-ip, cf-connecting-ip.
 * Falls back to "unknown" — unknown IPs share one rate limit bucket.
 */
export function getClientIp(request: Request): string {
  const fwdFor = request.headers.get("x-forwarded-for");
  if (fwdFor) return fwdFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();

  return "unknown";
}

// -----------------------------------------------------------------------------
// CHECK HELPERS
// Each returns null if the request is allowed, or a ready Response if blocked.
// -----------------------------------------------------------------------------

interface RateLimitResult {
  /** null = allowed. A Response = blocked — return it directly from the route. */
  blocked: Response | null;
}

async function check(
  limiterKey: string,
  requests: number,
  windowSeconds: number,
  identifier: string
): Promise<RateLimitResult> {
  const limiter = getLimiter(limiterKey, requests, windowSeconds);

  // No Redis — fail open
  if (!limiter) return { blocked: null };

  try {
    const result = await limiter.limit(identifier);

    if (result.success) return { blocked: null };

    const retryAfterMs = result.reset - Date.now();
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    return {
      blocked: Response.json(
        {
          success: false,
          error: "Too many requests. Please wait before trying again.",
          code: "RATE_LIMITED",
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": retryAfterSeconds.toString(),
            "X-RateLimit-Limit": result.limit.toString(),
            "X-RateLimit-Remaining": result.remaining.toString(),
            "X-RateLimit-Reset": Math.ceil(result.reset / 1000).toString(),
          },
        }
      ),
    };
  } catch (err) {
    // Redis error — fail open, log warning
    console.warn("[RateLimit] Redis check failed, allowing request:", err);
    return { blocked: null };
  }
}

// -----------------------------------------------------------------------------
// PUBLIC API
// Usage in a route handler:
//
//   const { blocked } = await rateLimitGuestGeneration(request);
//   if (blocked) return blocked;
// -----------------------------------------------------------------------------

/**
 * Guest generation: 3 requests per hour per IP.
 * Applied to /api/generate-guest (no auth, highest abuse risk).
 */
export async function rateLimitGuestGeneration(
  request: Request
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  return check("guest:gen", 3, 3600, ip);
}

/**
 * Authenticated generation: 30 requests per hour per user ID.
 * Applied to /api/generate for extra protection beyond credit system.
 */
export async function rateLimitUserGeneration(
  userId: string
): Promise<RateLimitResult> {
  return check("user:gen", 30, 3600, userId);
}

/**
 * Pack generation: 10 requests per hour per user ID.
 * Packs are 6x more expensive — tighter limit.
 */
export async function rateLimitPackGeneration(
  userId: string
): Promise<RateLimitResult> {
  return check("user:pack", 10, 3600, userId);
}

/**
 * Email trigger endpoints: 2 per 24 hours per IP.
 */
export async function rateLimitEmail(
  request: Request
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  return check("email", 2, 86400, ip);
}

/**
 * Feedback endpoints: 10 per hour per user.
 */
export async function rateLimitFeedback(
  userId: string
): Promise<RateLimitResult> {
  return check("feedback", 10, 3600, userId);
}
