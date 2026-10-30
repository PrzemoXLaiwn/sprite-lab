import { prisma } from "@/lib/prisma";

// In-process cache for the public generation count. Paid subscriber counts
// and activity numbers are not part of this payload.

let cachedGenerations: number | null = null;
let cacheTime = 0;
const CACHE_DURATION = 60 * 1000;

export function resetPublicStatsCacheForTests() {
  cachedGenerations = null;
  cacheTime = 0;
}

export async function readPublicGenerationStats(): Promise<{ totalGenerations: number; cached: boolean }> {
  const now = Date.now();
  if (cachedGenerations !== null && now - cacheTime < CACHE_DURATION) {
    return { totalGenerations: cachedGenerations, cached: true };
  }
  const totalGenerations = await prisma.generation.count();
  cachedGenerations = totalGenerations;
  cacheTime = now;
  return { totalGenerations, cached: false };
}
