import { afterEach, describe, expect, it, vi } from "vitest";
import { getRedisRestEnv, isRedisRestConfigured } from "./redis-env";

const NAMES = [
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "UPSTASH_REDIS_REST_KV_REST_API_URL",
  "UPSTASH_REDIS_REST_KV_REST_API_TOKEN",
  "UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN",
  "KV_REST_API_URL",
  "KV_REST_API_TOKEN",
  "KV_REST_API_READ_ONLY_TOKEN",
  "KV_URL",
  "REDIS_URL",
] as const;

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getRedisRestEnv", () => {
  it("prefers the short Upstash names", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://short.example");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "short-token");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "integration-token");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");

    expect(getRedisRestEnv()).toEqual({
      url: "https://short.example",
      token: "short-token",
    });
    expect(isRedisRestConfigured()).toBe(true);
  });

  it("uses the Vercel Upstash integration pair when the short names are unset", () => {
    for (const name of NAMES) vi.stubEnv(name, "");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_TOKEN", "integration-token");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN", "read-only");
    vi.stubEnv("KV_URL", "rediss://should-not-be-used");
    vi.stubEnv("REDIS_URL", "rediss://should-not-be-used");

    expect(getRedisRestEnv()).toEqual({
      url: "https://integration.example",
      token: "integration-token",
    });
    expect(isRedisRestConfigured()).toBe(true);
  });

  it("falls back to KV_REST_API_* and ignores a read-only token", () => {
    for (const name of NAMES) vi.stubEnv(name, "");
    vi.stubEnv("KV_REST_API_URL", "https://kv.example");
    vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "read-only");

    expect(getRedisRestEnv()).toEqual({
      url: "https://kv.example",
      token: "kv-token",
    });
  });

  it("does not treat a read-only token as credentials", () => {
    for (const name of NAMES) vi.stubEnv(name, "");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_URL", "https://integration.example");
    vi.stubEnv("UPSTASH_REDIS_REST_KV_REST_API_READ_ONLY_TOKEN", "read-only");
    vi.stubEnv("KV_REST_API_READ_ONLY_TOKEN", "read-only");

    expect(getRedisRestEnv()).toEqual({
      url: "https://integration.example",
      token: undefined,
    });
    expect(isRedisRestConfigured()).toBe(false);
  });

  it("is unconfigured when nothing is set", () => {
    for (const name of NAMES) vi.stubEnv(name, "");
    expect(getRedisRestEnv()).toEqual({ url: undefined, token: undefined });
    expect(isRedisRestConfigured()).toBe(false);
  });
});
