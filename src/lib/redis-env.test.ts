import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getRedisRestEnv,
  isRedisRestConfigured,
  redisErrorLogMessage,
  redisRestHost,
  sanitizeRedisError,
} from "./redis-env";

const NAMES = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_READ_ONLY_TOKEN",
  "UPSTASH_REDIS_REST_KV_REST_API_URL",
  "UPSTASH_REDIS_REST_KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "KV_REST_API_READ_ONLY_TOKEN",
  "KV_URL",
  "REDIS_URL",
] as const;

beforeEach(() => {
  for (const name of NAMES) vi.stubEnv(name, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getRedisRestEnv", () => {
  it("uses the first prefix where both url and token are set", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://short.example/path");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "short-token-value");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "integration-token-value");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token-value");

    expect(getRedisRestEnv()).toEqual({
      url: "https://short.example/path",
      token: "short-token-value",
      source: "UPSTASH_REDIS_REST",
      partial: false,
      missing: [],
    });
    expect(isRedisRestConfigured()).toBe(true);
  });

  it("skips a half-set prefix and uses the next complete pair", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://short.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example/rest");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "integration-token-value");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN", "read-only-token-value");

    expect(getRedisRestEnv()).toEqual({
      url: "https://integration.example/rest",
      token: "integration-token-value",
      source: "UPSTASH_REDIS_REST_KV_REST_API",
      partial: false,
      missing: [],
    });
  });

  it("falls back to KV_REST_API when that is the first complete pair", () => {
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token-value");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "read-only-token-value");
    vi.stubEnv("KV_URL", "rediss://should-not-be-used");
    vi.stubEnv("REDIS_URL", "rediss://should-not-be-used");

    expect(getRedisRestEnv()).toEqual({
      url: "https://kv.example",
      token: "kv-token-value",
      source: "KV_REST_API",
      partial: false,
      missing: [],
    });
    expect(isRedisRestConfigured()).toBe(true);
  });

  it("does not mix a url from one prefix with a token from another", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://short.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token-value");
    vi.stubEnv("KV_URL", "https://ignored.example");
    vi.stubEnv("REDIS_URL", "https://also-ignored.example");

    const env = getRedisRestEnv();
    expect(env.url).toBeUndefined();
    expect(env.token).toBeUndefined();
    expect(env.source).toBeUndefined();
    expect(env.partial).toBe(true);
    expect(env.missing).toEqual(["UPSTASH_REDIS_REST_TOKEN", "KV_REST_API_URL"]);
    expect(isRedisRestConfigured()).toBe(false);
    expect(JSON.stringify(env)).not.toContain("kv-token-value");
    expect(JSON.stringify(env)).not.toContain("short.example");
  });

  it("ignores a read-only token and reports the write token as missing", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN", "read-only-token-value");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "other-read-only-token");

    const env = getRedisRestEnv();
    expect(env).toEqual({
      url: undefined,
      token: undefined,
      source: undefined,
      partial: true,
      missing: ["UPSTASH_REDIS_REST_KV_REST_API_TOKEN"],
    });
    expect(isRedisRestConfigured()).toBe(false);
    expect(JSON.stringify(env)).not.toContain("read-only");
  });

  it("treats blank values as unset", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "  ");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("KV_REST_API_URL", " https://kv.example ");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token-value");

    expect(getRedisRestEnv()).toMatchObject({
      url: "https://kv.example",
      token: "kv-token-value",
      source: "KV_REST_API",
      partial: false,
    });
  });

  it("is unconfigured when nothing usable is set", () => {
    vi.stubEnv("KV_URL", "rediss://ignored");
    vi.stubEnv("REDIS_URL", "rediss://ignored");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "read-only-token-value");

    expect(getRedisRestEnv()).toEqual({
      url: undefined,
      token: undefined,
      source: undefined,
      partial: false,
      missing: [],
    });
    expect(isRedisRestConfigured()).toBe(false);
  });
});

describe("redisRestHost", () => {
  it("returns the hostname only", () => {
    expect(redisRestHost("https://eu1-abc.upstash.io/pipeline?token=secret")).toBe("eu1-abc.upstash.io");
    expect(redisRestHost("https://user:secret-token-value@eu1-abc.upstash.io:443/path")).toBe("eu1-abc.upstash.io");
    expect(redisRestHost("not a url")).toBeUndefined();
  });
});

describe("sanitizeRedisError", () => {
  const token = "AXxx-super-secret-token";

  it("maps known failures and drops the token and URL", () => {
    const leak = `WRONGPASS invalid password ${token} https://eu1-abc.upstash.io/pipeline`;
    expect(sanitizeRedisError(new Error(leak))).toBe("WRONGPASS");
    expect(sanitizeRedisError(new Error(`NOPERM this user cannot ping ${token}`))).toBe("NOPERM");
    expect(sanitizeRedisError(new Error(`401 Unauthorized ${token}`))).toBe("401 Unauthorized");
    expect(sanitizeRedisError(new Error("The operation was aborted due to timeout"))).toBe("timeout");

    const dns = new Error("fetch failed");
    (dns as { cause?: unknown }).cause = Object.assign(new Error("getaddrinfo ENOTFOUND eu1-abc.upstash.io"), {
      code: "ENOTFOUND",
    });
    expect(sanitizeRedisError(dns)).toBe("DNS");
    expect(sanitizeRedisError(new Error(`something else ${token}`))).toBe("Redis error");
  });
});

describe("redisErrorLogMessage", () => {
  it("keeps err.message and strips the token and full URL", () => {
    vi.stubEnv("KV_REST_API_URL", "https://eu1-abc.upstash.io/pipeline");
    vi.stubEnv("KV_REST_API_TOKEN", "AXxx-super-secret-token");
    const err = new Error(
      "WRONGPASS for https://eu1-abc.upstash.io/pipeline using AXxx-super-secret-token",
    );
    const message = redisErrorLogMessage(err);
    expect(message).toContain("WRONGPASS");
    expect(message).toContain("eu1-abc.upstash.io");
    expect(message).not.toContain("AXxx-super-secret-token");
    expect(message).not.toContain("/pipeline");
    expect(message).not.toContain("https://");
  });
});
