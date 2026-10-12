"use client";

/**
 * Client helpers that turn a saved generation back into tool state
 * ("continue where you left off"). Reads go through the user-scoped
 * /api/generations/:id route, which checks ownership server-side.
 */

import {
  animationSheetGeometry,
  defaultAnimationFps,
  parseAnimationPrompt,
} from "@/lib/workspace/history";
import { useSyncExternalStore } from "react";
import { actionForAnimation } from "@/lib/workspace/animate-restore";
import { lookupSourceLink, readStoredRaw, type AnimationResultSnapshot } from "@/lib/workspace/session";

export interface SavedGeneration {
  id: string;
  prompt: string;
  fullPrompt?: string | null;
  imageUrl: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  seed?: number | null;
  createdAt?: string;
}

export interface FetchedGeneration {
  generation: SavedGeneration;
  /** Animations only: the sprite it was made from, when it could be found. */
  sourceGenerationId: string | null;
}

/** One of the user's generations, or null (missing, not theirs, offline). */
export async function fetchOwnGeneration(id: string, signal?: AbortSignal): Promise<FetchedGeneration | null> {
  try {
    const res = await fetch(`/api/generations/${encodeURIComponent(id)}`, { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.generation?.imageUrl) return null;
    return {
      generation: data.generation as SavedGeneration,
      sourceGenerationId: typeof data.sourceGenerationId === "string" ? data.sourceGenerationId : null,
    };
  } catch {
    return null;
  }
}

/** Natural size of an image (0×0 when it can't be loaded). */
export function measureImage(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = url;
  });
}

export interface RestoredAnimation {
  result: AnimationResultSnapshot;
  fps: number;
  /** Motion label ("walk") for file names and the in-game preview. */
  motion: { id: string; text: string };
  /** Motion card to preselect (null: keep the current one). */
  action: string | null;
}

/**
 * Rebuilds the Animate result (player + downloads) from a saved animation
 * row. The GIF URL isn't stored in the database, so it is only known for
 * animations restored from this browser's draft.
 */
export async function animationFromGeneration(g: SavedGeneration): Promise<RestoredAnimation | null> {
  const parsed = parseAnimationPrompt(g.prompt);
  if (!parsed) return null;
  const { width, height } = await measureImage(g.imageUrl);
  const geo = animationSheetGeometry(parsed, width, height);
  if (!geo) return null;
  return {
    result: {
      sheetUrl: g.imageUrl,
      gifUrl: null,
      frameCount: geo.frameCount,
      frameWidth: geo.frameWidth,
      frameHeight: geo.frameHeight,
      sheetCols: geo.sheetCols,
    },
    fps: defaultAnimationFps(parsed, g.fullPrompt),
    action: actionForAnimation(parsed, g.categoryId),
    motion: { id: parsed.label.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "animation", text: parsed.label },
  };
}

/** Source sprite of an animation: this browser's link first, then the server's guess. */
export async function resolveAnimationSource(resultId: string, signal?: AbortSignal): Promise<string | null> {
  const local = lookupSourceLink(resultId);
  if (local) return local;
  const fetched = await fetchOwnGeneration(resultId, signal);
  return fetched?.sourceGenerationId ?? null;
}

const noopSubscribe = () => () => {};

/**
 * A localStorage value read during render without a hydration mismatch:
 * null on the server / first hydration pass, "" when nothing is stored.
 */
export function useStoredRaw(key: string): string | null {
  return useSyncExternalStore(noopSubscribe, () => readStoredRaw(key), () => null);
}
