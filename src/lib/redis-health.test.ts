import { afterEach, describe, expect, it, vi } from "vitest";
import { summarizeHealth } from "./health/summary";
import { checkRedisHealth } from "./redis-health";
import type { RedisRestEnv } from "./redis-env";

afterEach(() => {
  vi.unstubAllEnvs();
});

const TOKEN = "AXxx-super-secret-token";
const URL = "https://user:AXxx-super-secret-token@eu1-abc.upstash.io/pipeline?token=AXxx-super-secret-token";

function configured(source: RedisRestEnv["source"]): RedisRestEnv {
  return {
    url: URL,
    token: TOKEN,
    source,
    partial: false,
    missing: [],
  };
}

describe("checkRedisHealth", () => {
  it("reports a successful ping with source, host and latency", async () => {
    let now = 1_000;
    const check = await checkRedisHealth({
      env: configured("KV_REST_API"),
      now: () => now,
      ping: async () => {
        now = 1_037;
        return "PONG";
      },
    });

    expect(check).toEqual({
      status: "OK",
      source: "KV_REST_API",
      host: "eu1-abc.upstash.io",
      latencyMs: 37,
      detail: "KV_REST_API eu1-abc.upstash.io 37ms",
    });
    expect(JSON.stringify(check)).not.toContain(TOKEN);
    expect(JSON.stringify(check)).not.toContain("/pipeline");
    expect(JSON.stringify(check)).not.toContain("https://");
  });

  it("sanitizes a failed ping and does not call out a partial config", async () => {
    let now = 50;
    const ping = vi.fn(async () => {
      now = 2_050;
      throw new Error(`401 Unauthorized ${TOKEN} ${URL}`);
    });
    const check = await checkRedisHealth({
      env: configured("UPSTASH_REDIS_REST_KV_REST_API"),
      now: () => now,
      ping,
    });

    expect(ping).toHaveBeenCalledOnce();
    expect(check.status).toBe("ERROR");
    expect(check.source).toBe("UPSTASH_REDIS_REST_KV_REST_API");
    expect(check.host).toBe("eu1-abc.upstash.io");
    expect(check.latencyMs).toBe(2_000);
    expect(check.error).toBe("401 Unauthorized");
    expect(check.detail).toBe("UPSTASH_REDIS_REST_KV_REST_API eu1-abc.upstash.io 2000ms 401 Unauthorized");
    const body = JSON.stringify(check);
    expect(body).not.toContain(TOKEN);
    expect(body).not.toContain("/pipeline");
    expect(body).not.toContain("https://");
  });

  it("reports a half pair as partial and does not ping", async () => {
    const ping = vi.fn();
    const check = await checkRedisHealth({
      env: {
        url: undefined,
        token: undefined,
        source: undefined,
        partial: true,
        missing: ["UPSTASH_REDIS_REST_TOKEN"],
      },
      ping,
    });
    expect(ping).not.toHaveBeenCalled();
    expect(check).toEqual({
      status: "PARTIAL",
      detail: "Upstash rate limiter partially configured",
      missing: ["UPSTASH_REDIS_REST_TOKEN"],
    });
  });

  it("leaves Redis unconfigured when no pair is set", async () => {
    const ping = vi.fn();
    const check = await checkRedisHealth({
      env: { url: undefined, token: undefined, source: undefined, partial: false, missing: [] },
      ping,
    });
    expect(ping).not.toHaveBeenCalled();
    expect(check).toEqual({ status: "PARTIAL", detail: "Upstash rate limiter not configured" });
  });
});

describe("summarizeHealth", () => {
  it("degrades on a failed Redis ping and stays unhealthy for a real outage", () => {
    expect(summarizeHealth({ rate_limiting: { status: "ERROR" }, database: { status: "OK" } })).toEqual({
      status: "degraded",
      httpStatus: 200,
    });
    expect(summarizeHealth({ rate_limiting: { status: "PARTIAL" } })).toEqual({
      status: "degraded",
      httpStatus: 200,
    });
    expect(summarizeHealth({ rate_limiting: { status: "ERROR" }, database: { status: "ERROR" } })).toEqual({
      status: "unhealthy",
      httpStatus: 503,
    });
    expect(summarizeHealth({ database: { status: "OK" }, rate_limiting: { status: "OK" } })).toEqual({
      status: "healthy",
      httpStatus: 200,
    });
  });
});
