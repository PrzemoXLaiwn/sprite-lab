// =============================================================================
// Motion suggestions — which animations suit THIS sprite?
// =============================================================================
// Fixed preset lists don't fit everything: a dog shouldn't be offered "Fly",
// a slime has no "Walk", a chest wants "Open". Claude looks at the sprite and
// proposes the motions that make sense for it, each with a full description
// the animation planner then turns into poses. Falls back to the category
// presets when the API isn't available. Results are cached per sprite.
// =============================================================================

import Anthropic from "@anthropic-ai/sdk";
import { claudeCall, trackClaude } from "@/lib/claude-usage";
import { animationPresetsFor, MOTION_ANCHORS, type AnimationPreset, type MotionAnchor } from "@/config/animations";

const MODEL = "claude-opus-5-5";
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const TIMEOUT_MS = 30_000;

/** Durable cache row. Same table as claude_usage; no schema change. */
export const SUGGEST_CACHE_EVENT = "suggest_cache";

/** Off in production. Set to 1 to use Haiku and the database cache. */
export const SUGGEST_HAIKU_FLAG = "SPRITELAB_SUGGEST_HAIKU";

export function suggestHaikuEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const v = (env[SUGGEST_HAIKU_FLAG] ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

export interface SuggestedMotion extends AnimationPreset {
  /** Cycles (idle, walk…) vs one-shot (attack, hurt…). */
  loop: boolean;
}

export interface MotionSuggestions {
  subject: string;
  motions: SuggestedMotion[];
  ai: boolean;
}

const cache = new Map<string, MotionSuggestions>();
const CACHE_MAX = 500;

const SYSTEM = `You are a 2D game animator. You get one game sprite and suggest the animations a game developer would actually need for it — think like someone shipping a game, not like a template.
Rules:
- 6 to 8 motions that fit THIS sprite's anatomy, role and personality. Look at what it is, what it wears and holds, and what it would do in a game.
- First motion is always its resting loop (idle / hover / sway / shimmer).
- Never suggest motions it physically can't do (no flying for a dog without wings, no walking for a sword, no wheels spinning for a horse).
- Include at least one motion that is specific to this exact sprite, beyond the obvious set — e.g. a wizard "Read Spellbook", a pirate "Drink Rum", a dog "Sniff Ground" / "Wag Tail", a cat "Lick Paw", a knight "Raise Shield", a dragon "Take Off", a car "Drift" / "Headlights On", a chest "Open", a potion "Bubble", a tree "Drop Leaves", a torch "Flicker", a coin "Spin", a slime "Split".
- Characters, creatures and vehicles also get "Turnaround" (front, side, back views) when the sprite is a standalone figure — game devs need the other directions.
- Examples of good sets:
  dog → Idle Breathing, Walk, Run, Wag Tail, Bark, Sit, Jump, Hurt
  red sports car → Idle Engine, Drive, Boost, Drift, Brake, Turnaround, Crash
  slime → Wobble, Hop, Split, Attack Splat, Hurt, Melt
  sword → Swing, Thrust, Spin, Power Up, Pickup Float
  treasure chest → Shimmer, Open, Close, Shake, Burst of Loot
  oak tree → Wind Sway, Drop Leaves, Shake, Fall Over
  fire spell → Loop, Burst, Fizzle
  wizard → Idle, Walk, Cast, Read Spellbook, Staff Attack, Hurt, Defeat, Turnaround
- label: 1–3 words, Title Case. motion: one sentence describing the whole movement for an animator (what moves, in which order, and what does NOT move), under 45 words.
- loop: true for cycles (idle, walk, run, fly, hover, sway, drive), false for one-shots (attack, hurt, jump, open, crash, defeat).
- anchor: how frames line up — "ground" for anything standing or moving in place on the ground (idle, walk, attack, drive); "air" when the body leaves the ground and its height must be kept (jump, hop, fly, float, take off); "cell" when the whole sprite travels or shakes sideways (thrust, dash, knockback, shake, crash); "center" for rotations and effects that pulse around a centre (spin, swing of a lone weapon, glow, shine).
- frames: 4 for simple loops and quick actions, 6 for walks, runs, attacks and most motions, 9 for complex one-shots (crash, transformation, long combos).`;

const SCHEMA = {
  type: "object",
  properties: {
    subject: { type: "string", description: "What the sprite is, under 15 words." },
    motions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          motion: { type: "string" },
          loop: { type: "boolean" },
          anchor: { type: "string", enum: ["ground", "air", "cell", "center"] },
          frames: { type: "integer", enum: [4, 6, 9] },
        },
        required: ["label", "motion", "loop", "anchor", "frames"],
        additionalProperties: false,
      },
    },
  },
  required: ["subject", "motions"],
  additionalProperties: false,
} as const;

/** Category presets, used when the model can't be asked. */
export function fallbackSuggestions(categoryId: string | null): MotionSuggestions {
  return {
    subject: "",
    motions: animationPresetsFor(categoryId).map((p) => ({ ...p, loop: p.loop ?? true })),
    ai: false,
  };
}

export async function suggestMotions(opts: {
  cacheKey: string;
  image: Buffer;
  prompt: string;
  categoryId: string | null;
  /** Logged on the usage row when the caller has one. The route does not pass it yet. */
  userId?: string;
}, hooks?: SuggestHooks): Promise<MotionSuggestions> {
  if (suggestHaikuEnabled()) return suggestWithHaiku(opts, hooks);
  const hit = cache.get(opts.cacheKey);
  if (hit) return hit;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return fallbackSuggestions(opts.categoryId);

  try {
    const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: 1 });
    const params = {
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      // Structured output (not in this SDK version's types yet — the API accepts it)
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      messages: [{
        role: "user" as const,
        content: [
          { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: opts.image.toString("base64") } },
          { type: "text" as const, text: `Sprite prompt: "${opts.prompt.slice(0, 300)}"\nAsset category: ${opts.categoryId ?? "unknown"}` },
        ],
      }],
    };
    const response = await claudeCall("suggest", MODEL, () => anthropic.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming));
    trackClaude("suggest", response);
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text") return fallbackSuggestions(opts.categoryId);
    const data = JSON.parse(text.text) as { subject?: unknown; motions?: unknown };
    const seen = new Set<string>();
    const motions: SuggestedMotion[] = [];
    for (const m of Array.isArray(data.motions) ? data.motions : []) {
      const label = typeof m?.label === "string" ? m.label.trim().slice(0, 24) : "";
      const motion = typeof m?.motion === "string" ? m.motion.trim().slice(0, 300) : "";
      if (!label || motion.length < 8) continue;
      const id = `ai-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const anchor = MOTION_ANCHORS.includes(m.anchor) ? (m.anchor as MotionAnchor) : undefined;
      const frames = m.frames === 4 || m.frames === 6 || m.frames === 9 ? (m.frames as 4 | 6 | 9) : undefined;
      motions.push({ id, label, motion, loop: m.loop === true, anchor, frames });
      if (motions.length === 8) break;
    }
    if (motions.length < 3) return fallbackSuggestions(opts.categoryId);
    const result: MotionSuggestions = {
      subject: typeof data.subject === "string" ? data.subject.slice(0, 120) : "",
      motions,
      ai: true,
    };
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
    cache.set(opts.cacheKey, result);
    return result;
  } catch (err) {
    console.warn("[MotionSuggest] Falling back:", err instanceof Error ? err.message : err);
    return fallbackSuggestions(opts.categoryId);
  }
}

export interface SuggestCache {
  get(key: string): Promise<MotionSuggestions | null>;
  set(key: string, value: MotionSuggestions, userId: string): Promise<void>;
}

export interface SuggestHooks {
  complete?(model: string): Promise<{ model?: string; content: { type: string; text?: string }[]; usage?: { input_tokens?: number; output_tokens?: number } }>;
  cache?: SuggestCache;
}

/** Turn the model's JSON into the list the UI stores. Shared by both models. */
export function parseSuggestionPayload(data: { subject?: unknown; motions?: unknown }): MotionSuggestions | null {
  const seen = new Set<string>();
  const motions: SuggestedMotion[] = [];
  for (const m of Array.isArray(data.motions) ? data.motions : []) {
    const label = typeof m?.label === "string" ? m.label.trim().slice(0, 24) : "";
    const motion = typeof m?.motion === "string" ? m.motion.trim().slice(0, 300) : "";
    if (!label || motion.length < 8) continue;
    const id = `ai-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const anchor = MOTION_ANCHORS.includes(m.anchor) ? (m.anchor as MotionAnchor) : undefined;
    const frames = m.frames === 4 || m.frames === 6 || m.frames === 9 ? (m.frames as 4 | 6 | 9) : undefined;
    motions.push({ id, label, motion, loop: m.loop === true, anchor, frames });
    if (motions.length === 8) break;
  }
  if (motions.length < 3) return null;
  return {
    subject: typeof data.subject === "string" ? data.subject.slice(0, 120) : "",
    motions,
    ai: true,
  };
}

async function suggestWithHaiku(opts: {
  cacheKey: string;
  image: Buffer;
  prompt: string;
  categoryId: string | null;
  userId?: string;
}, hooks?: SuggestHooks): Promise<MotionSuggestions> {
  const mem = cache.get(opts.cacheKey);
  if (mem?.ai) return mem;
  const store = hooks?.cache ?? prismaSuggestCache;
  try {
    const stored = await store.get(opts.cacheKey);
    if (stored?.ai && stored.motions.length >= 3) {
      remember(opts.cacheKey, stored);
      return stored;
    }
  } catch (err) {
    console.warn("[MotionSuggest] Cache read failed:", err instanceof Error ? err.message : err);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey && !hooks?.complete) return fallbackSuggestions(opts.categoryId);

  try {
    const response = hooks?.complete
      ? await hooks.complete(HAIKU_MODEL)
      : await callSuggestModel(HAIKU_MODEL, opts, 1200, 0);
    trackClaude("suggest", response, opts.userId ?? "system");
    const text = response.content.find((b) => b.type === "text");
    if (!text || text.type !== "text" || !text.text) return fallbackSuggestions(opts.categoryId);
    const parsed = parseSuggestionPayload(JSON.parse(text.text) as { subject?: unknown; motions?: unknown });
    if (!parsed) return fallbackSuggestions(opts.categoryId);
    remember(opts.cacheKey, parsed);
    try { await store.set(opts.cacheKey, parsed, opts.userId ?? "system"); } catch (err) {
      console.warn("[MotionSuggest] Cache write failed:", err instanceof Error ? err.message : err);
    }
    return parsed;
  } catch (err) {
    console.warn("[MotionSuggest] Haiku falling back:", err instanceof Error ? err.message : err);
    return fallbackSuggestions(opts.categoryId);
  }
}

function remember(key: string, result: MotionSuggestions) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
  cache.set(key, result);
}

async function callSuggestModel(model: string, opts: { image: Buffer; prompt: string; categoryId: string | null }, maxTokens: number, retries: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");
  const anthropic = new Anthropic({ apiKey, timeout: TIMEOUT_MS, maxRetries: retries });
  const params = {
    model,
    max_tokens: maxTokens,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{
      role: "user" as const,
      content: [
        { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data: opts.image.toString("base64") } },
        { type: "text" as const, text: `Sprite prompt: "${opts.prompt.slice(0, 300)}"\nAsset category: ${opts.categoryId ?? "unknown"}` },
      ],
    }],
  };
  return claudeCall("suggest", model, () => anthropic.messages.create(params as unknown as Anthropic.MessageCreateParamsNonStreaming));
}

const prismaSuggestCache: SuggestCache = {
  async get(key) {
    const { prisma } = await import("@/lib/prisma");
    const row = await prisma.generationEvent.findFirst({
      where: { generationId: key.slice(0, 64), eventType: SUGGEST_CACHE_EVENT },
      orderBy: { createdAt: "desc" },
      select: { metadata: true },
    });
    if (!row?.metadata) return null;
    try {
      const data = JSON.parse(row.metadata) as MotionSuggestions;
      if (!data?.ai || !Array.isArray(data.motions) || data.motions.length < 3) return null;
      return data;
    } catch {
      return null;
    }
  },
  async set(key, value, userId) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.generationEvent.create({
      data: {
        generationId: key.slice(0, 64),
        userId: userId.slice(0, 64) || "system",
        eventType: SUGGEST_CACHE_EVENT,
        metadata: JSON.stringify(value),
      },
    });
  },
};
