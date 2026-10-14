// =============================================================================
// Guest sprite storage + claim (server only).
// =============================================================================
// R2 layout, keyed by sha256(token) so the public image URL never reveals
// the claim token itself:
//   guest/{hash}.png      the sprite (public URL shown on the landing page)
//   guest/{hash}.json     sidecar: { v, createdAt, prompt, style, ... }
//   guest/{hash}.claimed  one-shot lock written with If-None-Match: *
//
// Claim order (race-safe as far as R2 allows):
//   read sidecar → check age → take lock (atomic) → copy PNG into the user's
//   generations/ path → create the Generation row → delete sidecar + PNG.
// The lock stays behind (a few bytes) so a request that read the sidecar
// just before it was deleted still can't claim a second copy. An R2
// lifecycle rule on the guest/ prefix cleans everything up.
// No credits are charged or granted.
// =============================================================================

import { createHash, randomBytes } from "node:crypto";
import {
  deleteFromR2,
  deleteR2Key,
  getR2ObjectBuffer,
  getR2PublicUrl,
  isR2Configured,
  putR2ObjectIfAbsent,
  uploadBufferToR2,
  uploadGenerationBufferToR2,
} from "@/lib/r2";
import { saveGeneration } from "@/lib/db/generations";
import { detectIntent } from "@/lib/prompt-intent";
import { GENERATE_CATEGORIES } from "@/data/generate-categories";
import { isGuestTokenExpired, isValidGuestToken } from "./token";

export type GuestStyle = "pixel" | "cartoon";

export interface GuestSpriteMeta {
  v: 1;
  createdAt: number;
  prompt: string;
  style: GuestStyle;
  styleId: string;
  finalPrompt: string;
  seed: number;
  model: string;
  providerCost: number;
}

export type ClaimStatus = "claimed" | "invalid" | "not_found" | "expired" | "already_claimed" | "error";

export interface ClaimOutcome {
  status: ClaimStatus;
  generationId?: string;
  imageUrl?: string;
}

export function createGuestToken(): string {
  return randomBytes(24).toString("base64url");
}

export function guestObjectKeys(token: string): { png: string; meta: string; lock: string } {
  const hash = createHash("sha256").update(token).digest("hex");
  return { png: `guest/${hash}.png`, meta: `guest/${hash}.json`, lock: `guest/${hash}.claimed` };
}

/** Parse the JSON sidecar; null when it is malformed. */
export function parseGuestMeta(raw: string): GuestSpriteMeta | null {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (m.v !== 1 || typeof m.createdAt !== "number" || typeof m.prompt !== "string") return null;
  if (m.style !== "pixel" && m.style !== "cartoon") return null;
  return {
    v: 1,
    createdAt: m.createdAt,
    prompt: m.prompt.slice(0, 500),
    style: m.style,
    styleId: typeof m.styleId === "string" ? m.styleId : m.style === "pixel" ? "PIXEL_ART_16" : "CARTOON_WESTERN",
    finalPrompt: typeof m.finalPrompt === "string" ? m.finalPrompt : m.prompt,
    seed: typeof m.seed === "number" ? m.seed : 0,
    model: typeof m.model === "string" ? m.model : "",
    providerCost: typeof m.providerCost === "number" ? m.providerCost : 0,
  };
}

/**
 * Asset type for the claimed sprite, read from the prompt the same way the
 * Generate panel does. Falls back to Characters → Heroes (most guest prompts).
 */
export function resolveGuestCategory(prompt: string): { categoryId: string; subcategoryId: string } {
  const intent = detectIntent(prompt);
  const group = GENERATE_CATEGORIES.find((c) => c.id === intent.categoryId);
  const sub = group?.subcategories.find((s) => s.subcategoryId === intent.subcategoryId);
  if (sub) return { categoryId: sub.categoryId, subcategoryId: sub.subcategoryId };
  return { categoryId: "CHARACTERS", subcategoryId: "HEROES" };
}

/**
 * Store a guest sprite so it can be claimed after signup.
 * Returns null when R2 is unavailable — the caller then shows the sprite
 * inline and simply offers no claim.
 */
export async function storeGuestSprite(
  png: Buffer,
  meta: Omit<GuestSpriteMeta, "v" | "createdAt">
): Promise<{ token: string; imageUrl: string } | null> {
  if (!isR2Configured()) return null;
  const token = createGuestToken();
  const keys = guestObjectKeys(token);
  const sidecar: GuestSpriteMeta = { v: 1, createdAt: Date.now(), ...meta };
  const [img, json] = await Promise.all([
    uploadBufferToR2(png, keys.png, "image/png"),
    uploadBufferToR2(Buffer.from(JSON.stringify(sidecar), "utf8"), keys.meta, "application/json"),
  ]);
  if (!img.success || !json.success) {
    console.error("[GuestClaim] store failed:", img.error ?? json.error);
    // Whatever half got written is unreachable without the token; clean up best-effort.
    await Promise.all([deleteR2Key(keys.png), deleteR2Key(keys.meta)]);
    return null;
  }
  return { token, imageUrl: getR2PublicUrl(keys.png) };
}

async function removeGuestObjects(keys: { png: string; meta: string }): Promise<void> {
  // Sidecar first: once it's gone, no new claim can start for this token.
  await deleteR2Key(keys.meta);
  await deleteR2Key(keys.png);
}

/** Move one guest sprite into `userId`'s library. Never throws. */
export async function claimGuestSprite(userId: string, token: string, nowMs: number = Date.now()): Promise<ClaimOutcome> {
  if (!isValidGuestToken(token)) return { status: "invalid" };
  const keys = guestObjectKeys(token);
  let locked = false;
  try {
    const rawMeta = await getR2ObjectBuffer(keys.meta);
    if (!rawMeta) return { status: "not_found" };
    const meta = parseGuestMeta(rawMeta.toString("utf8"));
    if (!meta) {
      await removeGuestObjects(keys);
      return { status: "not_found" };
    }
    if (isGuestTokenExpired(meta.createdAt, nowMs)) {
      await removeGuestObjects(keys);
      return { status: "expired" };
    }

    const lock = await putR2ObjectIfAbsent(keys.lock, String(nowMs), "text/plain");
    if (lock === "exists") return { status: "already_claimed" };
    locked = true;

    const png = await getR2ObjectBuffer(keys.png);
    if (!png) {
      await deleteR2Key(keys.meta);
      return { status: "not_found" };
    }

    const upload = await uploadGenerationBufferToR2(png, userId);
    if (!upload.success || !upload.url) {
      await deleteR2Key(keys.lock); // let a retry try again
      return { status: "error" };
    }

    const { categoryId, subcategoryId } = resolveGuestCategory(meta.prompt);
    const saved = await saveGeneration({
      userId,
      prompt: meta.prompt,
      fullPrompt: meta.finalPrompt,
      categoryId,
      subcategoryId,
      styleId: meta.styleId,
      imageUrl: upload.url,
      seed: meta.seed,
      // Provider cost was already paid on the guest run; don't count it twice.
      replicateCost: 0,
    });
    if (!saved.success || !("generation" in saved) || !saved.generation) {
      await deleteFromR2(upload.url);
      await deleteR2Key(keys.lock);
      return { status: "error" };
    }

    await removeGuestObjects(keys);
    return { status: "claimed", generationId: saved.generation.id, imageUrl: upload.url };
  } catch (err) {
    console.error("[GuestClaim] claim failed:", err instanceof Error ? err.message : String(err));
    if (locked) await deleteR2Key(keys.lock);
    return { status: "error" };
  }
}
