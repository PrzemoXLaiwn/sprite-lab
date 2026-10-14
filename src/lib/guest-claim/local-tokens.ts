// =============================================================================
// Browser-side list of guest sprite tokens (localStorage).
// =============================================================================
// Keeps the newest MAX_GUEST_TOKENS tokens so a visitor who signs up later
// still gets their landing-page sprites. Every storage access is wrapped:
// private windows, blocked site data and quota errors must never break the page.
// =============================================================================

import { GUEST_TOKEN_TTL_MS, MAX_GUEST_TOKENS, isGuestTokenExpired, isValidGuestToken } from "./token";

export const GUEST_TOKENS_STORAGE_KEY = "spritelab:guest-sprites";

export interface StoredGuestToken {
  token: string;
  /** When the sprite was generated (ms since epoch). */
  createdAt: number;
}

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Parse the stored JSON, dropping malformed, duplicate and expired entries. Newest first. */
export function parseGuestTokens(raw: string | null, nowMs: number = Date.now()): StoredGuestToken[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  const seen = new Set<string>();
  const out: StoredGuestToken[] = [];
  for (const item of data) {
    if (!item || typeof item !== "object") continue;
    const { token, createdAt } = item as Record<string, unknown>;
    if (!isValidGuestToken(token) || typeof createdAt !== "number") continue;
    if (isGuestTokenExpired(createdAt, nowMs) || seen.has(token)) continue;
    seen.add(token);
    out.push({ token, createdAt });
  }
  return out.sort((a, b) => b.createdAt - a.createdAt).slice(0, MAX_GUEST_TOKENS);
}

/** Add a token (newest first, de-duplicated, capped). Invalid tokens are ignored. */
export function addGuestToken(
  list: StoredGuestToken[],
  token: string,
  nowMs: number = Date.now()
): StoredGuestToken[] {
  if (!isValidGuestToken(token)) return list;
  const rest = list.filter((t) => t.token !== token && nowMs - t.createdAt <= GUEST_TOKEN_TTL_MS);
  return [{ token, createdAt: nowMs }, ...rest].slice(0, MAX_GUEST_TOKENS);
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

export function readGuestTokens(storage: StorageLike | null = defaultStorage()): StoredGuestToken[] {
  if (!storage) return [];
  try {
    return parseGuestTokens(storage.getItem(GUEST_TOKENS_STORAGE_KEY));
  } catch {
    return [];
  }
}

export function rememberGuestToken(token: string, storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    const next = addGuestToken(readGuestTokens(storage), token);
    storage.setItem(GUEST_TOKENS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable — the sprite just won't be claimable */
  }
}

export function clearGuestTokens(storage: StorageLike | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(GUEST_TOKENS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
