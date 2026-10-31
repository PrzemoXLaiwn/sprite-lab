// Fixed prompt set for the isolated quality benchmark.
// These strings are NOT used by production generation.

import { buildSpritePrompt, isPixelStyle } from "@/config/prompts/sprite-prompt";

export interface BenchmarkCase {
  id: string;
  subject: string;
  styleId: string;
  categoryId: string;
  pixel: boolean;
  /** What the case is there to stress. */
  covers: string;
}

export const BENCHMARK_CASES: readonly BenchmarkCase[] = [
  {
    id: "pixel-knight",
    subject: "an armoured knight in steel plate with a red tabard",
    styleId: "PIXEL_ART_16",
    categoryId: "CHARACTERS",
    pixel: true,
    covers: "pixel art character",
  },
  {
    id: "pixel-slime",
    subject: "a round green slime monster with two eyes",
    styleId: "PIXEL_ART_16",
    categoryId: "CREATURES",
    pixel: true,
    covers: "pixel art creature",
  },
  {
    id: "realistic-ranger",
    subject: "a weathered ranger in worn leather armour",
    styleId: "REALISTIC_PAINTED",
    categoryId: "CHARACTERS",
    pixel: false,
    covers: "realistic character",
  },
  {
    id: "realistic-wolf",
    subject: "a grey wolf standing on all fours",
    styleId: "REALISTIC_PAINTED",
    categoryId: "CREATURES",
    pixel: false,
    covers: "realistic creature",
  },
  {
    id: "pixel-potion",
    subject: "a small red health potion bottle",
    styleId: "PIXEL_ART_32",
    categoryId: "CONSUMABLES",
    pixel: true,
    covers: "pixel art item",
  },
];

/** The prompt production sends (buildSpritePrompt), without the Haiku interpreter. */
export function currentPrompt(c: BenchmarkCase): string {
  return buildSpritePrompt({
    subject: c.subject,
    original: c.subject,
    styleId: c.styleId,
    categoryId: c.categoryId,
    pose: "auto",
  });
}

/**
 * Proposed prompt variant. Same builder, plus constraints the model often
 * misses (checkerboard, second copy, anti-aliased pixel rims). Not wired
 * into production. Whether it helps is an open measurement — the harness
 * records it, it does not assume it.
 */
export function strictPrompt(c: BenchmarkCase): string {
  const base = currentPrompt(c);
  const extra = isPixelStyle(c.styleId)
    ? "Hard pixel edges only, no anti-aliased outline, no grey fringe, at most 24 flat colours, one consistent pixel size."
    : "Fully rendered materials are fine, but the backdrop is one flat colour with zero gradient, vignette, ground or contact shadow.";
  return `${base} ${extra} Do not draw a second copy, a border, a caption, or a checkerboard.`;
}

/** List prices copied from src/lib/billing/features.ts PRICE. The harness refuses a call that would cross the cap. */
export const LIST_PRICE_USD = {
  standard: 0.0008, // FLUX.2 klein, runware:400@2
  hd: 0.036, // GPT Image Mini, openai:1@2
  grid1024: 0.0692, // Nano Banana, google:4@3
  grid2048: 0.1029,
} as const;

export const DEFAULT_CAP_USD = 3;

export const PRODUCTION_MODELS = {
  standard: { air: "runware:400@2", label: "FLUX.2 klein", listUsd: LIST_PRICE_USD.standard },
  hd: { air: "openai:1@2", label: "GPT Image Mini", listUsd: LIST_PRICE_USD.hd },
  animation: { air: "google:4@3", label: "Nano Banana 2", listUsd: LIST_PRICE_USD.grid1024 },
} as const;
