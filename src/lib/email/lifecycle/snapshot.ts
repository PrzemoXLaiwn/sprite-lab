// =============================================================================
// Lifecycle emails — turn raw DB rows into what the rules read (pure)
// =============================================================================

import { classifyGeneration, cleanGenerationPrompt, parseAnimationPrompt } from "@/lib/workspace/history";
import { cleanPrompt, shortName, isPixelStyle, type InspirationPick } from "./content";
import { DAY, type WorkItem } from "./rules";

export interface GenerationRow {
  id: string;
  userId: string;
  prompt: string;
  categoryId: string;
  subcategoryId: string;
  styleId: string;
  imageUrl: string;
  createdAt: Date;
}

/** Only absolute https images can be shown in an email (no data: URLs, no .glb models). */
export function emailSafeImage(url: string | null | undefined): string | null {
  if (!url || url.length > 2000) return null;
  if (!/^https:\/\/[^\s"'<>]+$/i.test(url)) return null;
  if (/\.(glb|gltf)(\?|$)/i.test(url)) return null;
  return url;
}

export interface WorkSummary {
  latestItem: WorkItem | null;
  latestSprite: WorkItem | null;
  lastCreatedAt: Date | null;
}

/** `rows`: one user's most recent generations, newest first. */
export function summarizeWork(rows: GenerationRow[]): WorkSummary {
  const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  let latestItem: WorkItem | null = null;
  let latestSprite: WorkItem | null = null;
  for (const r of sorted) {
    const kind = classifyGeneration(r);
    if (kind === "model") continue;
    const base = {
      id: r.id,
      imageUrl: emailSafeImage(r.imageUrl),
      prompt: cleanGenerationPrompt(r.prompt),
      categoryId: r.categoryId,
      styleId: r.styleId,
      createdAt: r.createdAt,
    };
    if (kind === "animation") {
      if (!latestItem) {
        const parsed = parseAnimationPrompt(r.prompt);
        // The row doesn't store its source sprite: the newest older sprite with the same prompt
        const src = sorted.find(
          (s) => s.createdAt.getTime() <= r.createdAt.getTime() && classifyGeneration(s) !== "animation" && classifyGeneration(s) !== "model" &&
            parsed && cleanGenerationPrompt(s.prompt) === parsed.sourcePrompt
        );
        latestItem = { ...base, kind: "animation", motionLabel: parsed?.label, sourceSpriteId: src?.id ?? null };
      }
      continue;
    }
    const item: WorkItem = { ...base, kind: kind === "edit" ? "edit" : "sprite" };
    if (!latestItem) latestItem = item;
    if (!latestSprite && item.imageUrl) latestSprite = item;
    if (latestItem && latestSprite) break;
  }
  return { latestItem, latestSprite, lastCreatedAt: sorted[0]?.createdAt ?? null };
}

export interface CommunityRow extends GenerationRow {
  likes: number;
}

/**
 * Up to 6 public community sprites: this week's first (most liked), at most
 * two per author, no duplicate prompts. `thisWeek` is only true when every
 * pick is from the last 7 days, so the email never says "this week" wrongly.
 */
export function pickInspiration(rows: CommunityRow[], now: Date): InspirationPick | null {
  const weekAgo = now.getTime() - 7 * DAY;
  const usable = rows.filter((r) => {
    const kind = classifyGeneration(r);
    return (kind === "sprite" || kind === "variant") && emailSafeImage(r.imageUrl) && cleanPrompt(cleanGenerationPrompt(r.prompt));
  });
  const ranked = [
    ...usable.filter((r) => r.createdAt.getTime() >= weekAgo),
    ...usable.filter((r) => r.createdAt.getTime() < weekAgo),
  ];
  const picked: CommunityRow[] = [];
  const perAuthor = new Map<string, number>();
  const prompts = new Set<string>();
  for (const r of ranked) {
    if (picked.length >= 6) break;
    const p = cleanGenerationPrompt(r.prompt).toLowerCase();
    if (prompts.has(p) || (perAuthor.get(r.userId) ?? 0) >= 2) continue;
    prompts.add(p);
    perAuthor.set(r.userId, (perAuthor.get(r.userId) ?? 0) + 1);
    picked.push(r);
  }
  if (picked.length < 3) return null;
  const shown = picked.slice(0, picked.length >= 6 ? 6 : 3);
  return {
    items: shown.map((r) => ({
      id: r.id,
      imageUrl: emailSafeImage(r.imageUrl)!,
      caption: shortName(r.prompt, "community sprite"),
      pixel: isPixelStyle(r.styleId),
    })),
    tryPrompt: cleanPrompt(cleanGenerationPrompt(shown[0].prompt), 90)!,
    thisWeek: shown.every((r) => r.createdAt.getTime() >= weekAgo),
  };
}
