import { describe, expect, it } from "vitest";
import { GUEST_TOKEN_TTL_MS, MAX_GUEST_TOKENS, isGuestTokenExpired, isValidGuestToken } from "./token";
import {
  GUEST_TOKENS_STORAGE_KEY,
  addGuestToken,
  clearGuestTokens,
  parseGuestTokens,
  readGuestTokens,
  rememberGuestToken,
} from "./local-tokens";
import { createGuestToken, guestObjectKeys, parseGuestMeta, resolveGuestCategory } from "./server";

const T1 = "A".repeat(32);
const T2 = "b".repeat(31) + "_";
const T3 = "-".repeat(32);
const T4 = "0123456789abcdefghijABCDEFGHIJ-_";
const NOW = 1_800_000_000_000;

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    data,
  };
}

describe("guest token format", () => {
  it("accepts 32-char base64url tokens", () => {
    expect(isValidGuestToken(T1)).toBe(true);
    expect(isValidGuestToken(T4)).toBe(true);
  });
  it("rejects anything else", () => {
    for (const bad of ["", "A".repeat(31), "A".repeat(33), "A".repeat(31) + "=", "A".repeat(31) + "/", "../" + "A".repeat(29), null, 42, undefined]) {
      expect(isValidGuestToken(bad)).toBe(false);
    }
  });
  it("createGuestToken produces valid, distinct tokens", () => {
    const a = createGuestToken();
    const b = createGuestToken();
    expect(isValidGuestToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });
});

describe("guest token expiry", () => {
  it("is valid up to 48 h", () => {
    expect(isGuestTokenExpired(NOW, NOW)).toBe(false);
    expect(isGuestTokenExpired(NOW - GUEST_TOKEN_TTL_MS, NOW)).toBe(false);
    expect(isGuestTokenExpired(NOW - GUEST_TOKEN_TTL_MS - 1, NOW)).toBe(true);
  });
  it("treats far-future and non-finite timestamps as expired", () => {
    expect(isGuestTokenExpired(NOW + 60_000, NOW)).toBe(false);
    expect(isGuestTokenExpired(NOW + 60 * 60_000, NOW)).toBe(true);
    expect(isGuestTokenExpired(Number.NaN, NOW)).toBe(true);
  });
});

describe("guest object keys", () => {
  it("never contain the token itself", () => {
    const keys = guestObjectKeys(T4);
    for (const k of Object.values(keys)) {
      expect(k.startsWith("guest/")).toBe(true);
      expect(k).not.toContain(T4);
    }
    expect(keys.png).toMatch(/^guest\/[0-9a-f]{64}\.png$/);
    expect(guestObjectKeys(T4)).toEqual(keys);
  });
});

describe("localStorage token list", () => {
  it("parses, drops junk/expired/duplicates, newest first, capped", () => {
    const raw = JSON.stringify([
      { token: T1, createdAt: NOW - 1000 },
      { token: T2, createdAt: NOW - GUEST_TOKEN_TTL_MS - 1 },
      { token: "nope", createdAt: NOW },
      { token: T3, createdAt: NOW - 10 },
      { token: T1, createdAt: NOW - 5 },
      { token: T4, createdAt: NOW - 2000 },
      "x",
      null,
    ]);
    const list = parseGuestTokens(raw, NOW);
    expect(list.map((t) => t.token)).toEqual([T3, T1, T4]);
    expect(list.length).toBeLessThanOrEqual(MAX_GUEST_TOKENS);
  });
  it("handles empty and malformed storage", () => {
    expect(parseGuestTokens(null, NOW)).toEqual([]);
    expect(parseGuestTokens("{not json", NOW)).toEqual([]);
    expect(parseGuestTokens('{"a":1}', NOW)).toEqual([]);
  });
  it("adds newest first, de-duplicates and keeps at most 3", () => {
    let list = addGuestToken([], T1, NOW - 3);
    list = addGuestToken(list, T2, NOW - 2);
    list = addGuestToken(list, T3, NOW - 1);
    list = addGuestToken(list, T4, NOW);
    expect(list.map((t) => t.token)).toEqual([T4, T3, T2]);
    list = addGuestToken(list, T2, NOW + 1);
    expect(list.map((t) => t.token)).toEqual([T2, T4, T3]);
    expect(addGuestToken(list, "bad", NOW)).toBe(list);
  });
  it("remember/read/clear round-trip through storage", () => {
    const s = memoryStorage();
    rememberGuestToken(T1, s);
    rememberGuestToken(T2, s);
    expect(readGuestTokens(s).map((t) => t.token)).toEqual([T2, T1]);
    clearGuestTokens(s);
    expect(s.data.has(GUEST_TOKENS_STORAGE_KEY)).toBe(false);
    expect(readGuestTokens(s)).toEqual([]);
  });
  it("never throws when storage is blocked", () => {
    const throwing = {
      getItem: () => { throw new Error("SecurityError"); },
      setItem: () => { throw new Error("QuotaExceeded"); },
      removeItem: () => { throw new Error("SecurityError"); },
    };
    expect(readGuestTokens(throwing)).toEqual([]);
    expect(() => rememberGuestToken(T1, throwing)).not.toThrow();
    expect(() => clearGuestTokens(throwing)).not.toThrow();
    expect(readGuestTokens(null)).toEqual([]);
  });
});

describe("guest sidecar", () => {
  it("parses a valid sidecar", () => {
    const meta = parseGuestMeta(JSON.stringify({
      v: 1, createdAt: NOW, prompt: "red potion", style: "pixel", styleId: "PIXEL_ART_16",
      finalPrompt: "fp", seed: 7, model: "m", providerCost: 0.01,
    }));
    expect(meta).toMatchObject({ createdAt: NOW, prompt: "red potion", style: "pixel", seed: 7 });
  });
  it("rejects malformed sidecars", () => {
    expect(parseGuestMeta("nope")).toBeNull();
    expect(parseGuestMeta(JSON.stringify({ v: 2, createdAt: NOW, prompt: "x", style: "pixel" }))).toBeNull();
    expect(parseGuestMeta(JSON.stringify({ v: 1, createdAt: "x", prompt: "x", style: "pixel" }))).toBeNull();
    expect(parseGuestMeta(JSON.stringify({ v: 1, createdAt: NOW, prompt: "x", style: "anime" }))).toBeNull();
  });
  it("fills defaults for optional fields", () => {
    const meta = parseGuestMeta(JSON.stringify({ v: 1, createdAt: NOW, prompt: "x", style: "cartoon" }));
    expect(meta?.styleId).toBe("CARTOON_WESTERN");
    expect(meta?.seed).toBe(0);
  });
});

describe("claimed sprite category", () => {
  it("reads the asset type from the prompt", () => {
    expect(resolveGuestCategory("red health potion in a round glass flask").subcategoryId).toBe("POTIONS");
  });
  it("falls back to characters", () => {
    expect(resolveGuestCategory("zzz qqq")).toEqual({ categoryId: "CHARACTERS", subcategoryId: "HEROES" });
  });
});
