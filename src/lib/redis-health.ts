import { Redis } from "@upstash/redis";
import {
  getRedisRestEnv,
  redisRestHost,
  sanitizeRedisError,
  type RedisRestEnv,
  type RedisRestSource,
} from "@/lib/redis-env";

export const REDIS_PING_TIMEOUT_MS = 2_000;

export type RedisHealthCheck = {
  status: "OK" | "PARTIAL" | "ERROR";
  detail?: string;
  missing?: string[];
  source?: RedisRestSource;
  host?: string;
  latencyMs?: number;
  error?: string;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

async function pingRedis(url: string, token: string, timeoutMs: number): Promise<string> {
  const redis = new Redis({
    url,
    token,
    retry: false,
    signal: () => AbortSignal.timeout(timeoutMs),
  });
  return withTimeout(redis.ping(), timeoutMs);
}

/**
 * Config check plus a real REST ping when a same-prefix pair is set.
 * A failed ping is ERROR here; callers map that to overall "degraded", not "unhealthy".
 */
export async function checkRedisHealth(options?: {
  env?: RedisRestEnv;
  ping?: (url: string, token: string) => Promise<unknown>;
  now?: () => number;
  timeoutMs?: number;
}): Promise<RedisHealthCheck> {
  const env = options?.env ?? getRedisRestEnv();
  if (!env.source || !env.url || !env.token) {
    if (env.partial) {
      return {
        status: "PARTIAL",
        detail: "Upstash rate limiter partially configured",
        missing: env.missing,
      };
    }
    return { status: "PARTIAL", detail: "Upstash rate limiter not configured" };
  }

  const now = options?.now ?? Date.now;
  const started = now();
  const host = redisRestHost(env.url, env.token);
  const timeoutMs = options?.timeoutMs ?? REDIS_PING_TIMEOUT_MS;
  try {
    await (options?.ping ?? ((url, token) => pingRedis(url, token, timeoutMs)))(env.url, env.token);
    const latencyMs = Math.max(0, now() - started);
    return {
      status: "OK",
      source: env.source,
      host,
      latencyMs,
      detail: [env.source, host, `${latencyMs}ms`].filter(Boolean).join(" "),
    };
  } catch (error) {
    const latencyMs = Math.max(0, now() - started);
    const sanitized = sanitizeRedisError(error);
    return {
      status: "ERROR",
      source: env.source,
      host,
      latencyMs,
      error: sanitized,
      detail: [env.source, host, `${latencyMs}ms`, sanitized].filter(Boolean).join(" "),
    };
  }
}
