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
// EXCEPTION: guest generation (unauthenticated, no credits) never fails open
// in production — without Upstash it uses a per-instance in-memory limiter
// with a global hourly cap (see memoryCheck).
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
 *
 * Order matters because per-IP limits are only as good as the IP is hard to
 * spoof:
 *  1. `x-vercel-forwarded-for` — set by Vercel's edge; client-supplied values
 *     are overwritten, so it cannot be spoofed.
 *  2. `x-real-ip` — set by Vercel / typical reverse proxies to the peer IP.
 *  3. `x-forwarded-for` — clients can prepend arbitrary hops. On Vercel the
 *     edge rewrites the header so the first hop is the real client; elsewhere
 *     the LAST hop is the one appended by the proxy closest to us (the only
 *     entry we can trust), so that is used instead of the attacker-controlled
 *     first entry.
 *  4. `cf-connecting-ip` — Cloudflare.
 * Falls back to "unknown" — unknown IPs share one rate limit bucket.
 */
export function getClientIp(request: Request): string {
  const vercelFwd = request.headers.get("x-vercel-forwarded-for");
  if (vercelFwd) {
    const first = vercelFwd.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp?.trim()) return realIp.trim();

  const fwdFor = request.headers.get("x-forwarded-for");
  if (fwdFor) {
    const hops = fwdFor.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) {
      return process.env.VERCEL === "1" ? hops[0] : hops[hops.length - 1];
    }
  }

  const cfIp = request.headers.get("cf-connecting-ip");
  if (cfIp?.trim()) return cfIp.trim();

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

/**
 * Response used when a fail-closed limiter cannot be evaluated.
 */
function unavailableResponse(): Response {
  return Response.json(
    {
      success: false,
      error: "This feature is temporarily unavailable. Please try again later or sign in.",
      code: "RATE_LIMIT_UNAVAILABLE",
    },
    { status: 503, headers: { "Retry-After": "60" } }
  );
}

// -----------------------------------------------------------------------------
// IN-MEMORY FALLBACK (fail-closed limiters only)
// -----------------------------------------------------------------------------
// Per serverless instance, so not exact — but combined with a global cap per
// instance it bounds spend when Redis is missing. Guest generation costs
// ~$0.001/image, so this is an acceptable degradation.
const MEMORY_GLOBAL_CAP_PER_HOUR = 150;
const MEMORY_MAX_KEYS = 10_000;
// Per-identifier hit timestamps, keyed `${limiterKey}:${identifier}`.
const memoryHits = new Map<string, number[]>();
// Global hourly hits per limiter. Kept separate from memoryHits so the
// hard-bound clear below (which an attacker can trigger by rotating IPs)
// never resets the global spend cap. Bounded by the number of limiter keys,
// and each array by MEMORY_GLOBAL_CAP_PER_HOUR.
const memoryGlobalHits = new Map<string, number[]>();

function memoryCheck(
  limiterKey: string,
  requests: number,
  windowSeconds: number,
  identifier: string
): RateLimitResult {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;

  const globalHits = (memoryGlobalHits.get(limiterKey) ?? []).filter((t) => now - t < 3600_000);
  memoryGlobalHits.set(limiterKey, globalHits);
  if (globalHits.length >= MEMORY_GLOBAL_CAP_PER_HOUR) {
    return { blocked: unavailableResponse() };
  }

  const key = `${limiterKey}:${identifier}`;
  const hits = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= requests) {
    memoryHits.set(key, hits);
    const retryAfter = Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
    return {
      blocked: Response.json(
        { success: false, error: "Too many requests. Please wait before trying again.", code: "RATE_LIMITED", retryAfter },
        { status: 429, headers: { "Retry-After": String(retryAfter) } }
      ),
    };
  }

  // Bound memory before inserting a new key: first drop this limiter's
  // expired entries (deleting arrays that become empty), and only if that is
  // not enough, clear the per-identifier map. The global cap above is
  // unaffected either way.
  if (!memoryHits.has(key) && memoryHits.size >= MEMORY_MAX_KEYS) {
    const prefix = `${limiterKey}:`;
    for (const [k, v] of memoryHits) {
      if (!k.startsWith(prefix)) continue;
      const live = v.filter((t) => now - t < windowMs);
      if (live.length === 0) memoryHits.delete(k);
      else if (live.length !== v.length) memoryHits.set(k, live);
    }
    if (memoryHits.size >= MEMORY_MAX_KEYS) memoryHits.clear();
  }

  hits.push(now);
  memoryHits.set(key, hits);
  globalHits.push(now);
  return { blocked: null };
}

/**
 * @param failClosed When true and running in production, a missing or
 *   erroring Redis BLOCKS the request instead of allowing it. Use for
 *   unauthenticated endpoints that cost us money (guest generation), where
 *   the rate limiter is the only abuse control. Authenticated paid routes
 *   stay fail-open: credits already bound the cost per user.
 */
async function check(
  limiterKey: string,
  requests: number,
  windowSeconds: number,
  identifier: string,
  failClosed = false
): Promise<RateLimitResult> {
  const limiter = getLimiter(limiterKey, requests, windowSeconds);
  const denyWhenUnavailable = failClosed && process.env.NODE_ENV === "production";

  // No Redis — fail open, except fail-closed limiters which fall back to a
  // per-instance in-memory limiter (plus a global cap) so the endpoint keeps
  // working with a bounded cost instead of going dark.
  if (!limiter) {
    if (denyWhenUnavailable) {
      return memoryCheck(limiterKey, requests, windowSeconds, identifier);
    }
    return { blocked: null };
  }

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
    if (denyWhenUnavailable) {
      console.error(`[RateLimit] Redis check failed — using in-memory fallback for "${limiterKey}":`, err);
      return memoryCheck(limiterKey, requests, windowSeconds, identifier);
    }
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

/** Max guest generations per hour across ALL guests. */
const GUEST_GLOBAL_LIMIT_PER_HOUR = 200;

/**
 * Guest generation: 3 requests per hour per IP, plus a global hourly cap.
 * Applied to /api/generate-guest (no auth, highest abuse risk).
 * FAIL-CLOSED in production: with no credits involved, this limiter is the
 * only thing standing between an attacker and unbounded provider spend.
 */
export async function rateLimitGuestGeneration(
  request: Request
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const perIp = await check("guest:gen", 3, 3600, ip, true);
  if (perIp.blocked) return perIp;

  // Global cap across all guests (shared via Upstash), so IP rotation cannot
  // drive unbounded provider spend even when Redis is configured.
  return check("guest:global", GUEST_GLOBAL_LIMIT_PER_HOUR, 3600, "all", true);
}

/**
 * Authenticated generation: 30 requests per hour per user ID.
 * Applied to /api/generate (and the other paid image/3D routes) for extra
 * protection beyond the credit system. Fail-open is acceptable here: every
 * request still has to atomically pay credits, which bounds the cost.
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
 * 3D generation: 10 requests per hour per user ID.
 * Each request is a multi-minute Replicate pipeline. Fail-open (credits
 * bound the cost).
 */
export async function rateLimit3DGeneration(
  userId: string
): Promise<RateLimitResult> {
  return check("user:3d", 10, 3600, userId);
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
 * Free AI helper calls (e.g. motion suggestions on /animate): 60 per hour per
 * user. They cost us a small model call and no credits, so they need a cap.
 */
export async function rateLimitAiHelper(
  userId: string
): Promise<RateLimitResult> {
  return check("user:ai-helper", 60, 3600, userId);
}

/**
 * Community live chat: 10 messages per minute per user (shown in the UI).
 */
export async function rateLimitChat(
  userId: string
): Promise<RateLimitResult> {
  return check("chat", 10, 60, userId);
}

/**
 * Feedback endpoints: 10 per hour per user.
 */
export async function rateLimitFeedback(
  userId: string
): Promise<RateLimitResult> {
  return check("feedback", 10, 3600, userId);
}
