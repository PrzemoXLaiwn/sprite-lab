// Deterministic hashing + PRNG for Sprite Dungeon (same input → same output on
// every machine; no Math.random anywhere in the game logic).

/** FNV-1a 32-bit hash of a string → unsigned 32-bit integer. */
export function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Hash → value in [0, 1). */
export function hashUnit(input: string): number {
  return hash32(input) / 4_294_967_296;
}

/** Mulberry32: small, fast, good enough for a game. Returns floats in [0, 1). */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Seed of a user's Nth run on a UTC day. */
export function runSeed(userId: string, day: string, runIndex: number): number {
  return hash32(`${userId}:${day}:${runIndex}`);
}

/** Short, stable public id for a user without a username ("Creator #k3x9q"). */
export function publicTag(userId: string): string {
  return hash32(`creator:${userId}`).toString(36).padStart(5, "0").slice(-5);
}
