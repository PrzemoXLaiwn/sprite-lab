/**
 * Prompt composition — step 2 of the pipeline.
 *
 * Flow:
 *   rawInput
 *     → [2a] translate if non-English
 *     → [2b] enhance if Pro-tier + word count in (1, 7)
 *     → [2c] look up category + style configs
 *     → [2d] compose positive prompt  (style prefix + object type + user + composition)
 *     → [2e] compose negative prompt  (UNIVERSAL_PIXEL_BASE + style.negatives + category.negatives)
 *     → return ComposedPrompt { prompt, negativePrompt, trail }
 *
 * Ports translate + enhance semantics from src/lib/prompt-enhance.ts
 * (that file is LEFT UNTOUCHED — it's still used by the v1 /api/generate
 * route). System prompts and safety checks are byte-identical.
 *
 * One behavioural difference from the port: Anthropic API errors are
 * NOT swallowed — they propagate and `composePrompt` rewraps them as
 * PromptCompositionError. Non-API fall-back conditions (no API key,
 * ASCII-only, word-count gates, empty response, intent-not-preserved,
 * no-Latin-letters) continue to fall back silently as in the original.
 *
 * TODO(module 3): replace PLACEHOLDER_OBJECT_TYPE / PLACEHOLDER_COMPOSITION
 * with category.objectType / category.composition from category-configs.ts
 * once those fields land.
 */

import Anthropic from "@anthropic-ai/sdk";
import { PromptCompositionError } from "../pipeline/errors";
import { childLogger, type Logger } from "../logger";
import {
  getStyleConfig,
  UNIVERSAL_PIXEL_BASE_NEGATIVE,
  type StyleId,
} from "../../config/styles/style-configs";
import {
  CATEGORY_IDS,
  type CategoryId,
} from "../../config/categories/category-configs";

// ─── Public types ─────────────────────────────────────────────────────────

export interface TransformationTrail {
  rawInput: string;
  translated?: string;
  enhanced?: string;
  composed: string;
  /** BCP-47-ish code when the script points to a single language (e.g. "pl"), else undefined. */
  language?: string;
}

export interface ComposedPrompt {
  prompt: string;
  negativePrompt: string;
  trail: TransformationTrail;
}

export interface ComposePromptParams {
  rawInput: string;
  categoryId: string;
  styleId: string;
  /** Pro-tier enhance toggle — defaults to false. */
  enhance?: boolean;
}

// ─── Ported constants ─────────────────────────────────────────────────────

// Byte-identical to src/lib/prompt-enhance.ts (do NOT drift).
const TRANSLATE_SYSTEM_PROMPT = `You translate game asset descriptions to English for an AI image generator (FLUX.1).

RULES:
1. Output ONLY the English translation. No explanation, no quotes, no prefix.
2. If the input is already English, output it unchanged.
3. Preserve every noun, adjective, and specific detail exactly (colors, materials, poses, tech terms like "UI button", "outline", "shader").
4. Keep it concise — same length or shorter than the original.
5. Do not add "A" or "The" at the start. Do not add a period at the end.
6. Technical game-dev terms (Unity, sprite, outline, shader, UI, HUD) stay as-is.

EXAMPLES:
Input: "Сделай обводку (outline) для UI кнопки в Unity"
Output: outline for Unity UI button

Input: "miecz ognisty z czerwoną rękojeścią"
Output: fiery sword with red hilt

Input: "warhammer, boarder"
Output: warhammer, border`;

const ENHANCE_SYSTEM_PROMPT = `You are a game asset prompt enhancer for an AI image generator (FLUX.1).

Your job: take a short user prompt and expand it into a vivid visual description.

RULES:
1. KEEP every element the user mentioned. Never remove or change anything.
2. EXPAND vague words into visual details:
   - "magic" → describe HOW magic looks (glowing runes, ethereal aura, energy particles)
   - "fire" → describe flames, ember glow, heat distortion
   - "ancient" → describe wear, patina, moss, cracks
   - "dark" → describe shadow tones, ominous presence
3. ADD texture, material, lighting details that make the image specific
4. Stay under 40 words. Be concise and visual.
5. Write as a descriptive phrase, not a sentence. No "A" at the start, no period at the end.
6. Output ONLY the enhanced prompt. No explanation, no quotes, no prefix.

EXAMPLES:
User: "fire sword"
Enhanced: "blazing fire sword with flames licking along the blade, ember glow at the edges, molten orange cracks in dark steel, radiating heat shimmer"

User: "red health potion"
Enhanced: "red health potion in round glass flask, bright crimson liquid with tiny bubbles, cork stopper, warm inner glow, heart symbol etched on glass"

User: "skeleton warrior"
Enhanced: "undead skeleton warrior in rusted iron armor, glowing green eye sockets, wielding chipped bone sword, tattered dark cape, menacing combat stance"

User: "iron chestplate magic"
Enhanced: "iron chestplate with glowing blue arcane runes etched into the surface, faint magical aura emanating from the metal, ornate silver trim edges"`;

const CLAUDE_MODEL = "claude-haiku-4-5-20251001";
const TRANSLATE_MAX_TOKENS = 200;
const ENHANCE_MAX_TOKENS = 100;

// Placeholders — module 3 replaces with category.objectType / category.composition.
const PLACEHOLDER_OBJECT_TYPE = "a pixel art game sprite";
const PLACEHOLDER_COMPOSITION = "centered, plain background";

// ─── Type guards ──────────────────────────────────────────────────────────

const STYLE_ID_SET: ReadonlySet<string> = new Set<string>([
  // StyleId union keys — kept as a runtime set so composePrompt can check
  // without casting a string into a literal union. Derived from the
  // StyleId type by enumeration; any StyleId drift will be caught by TS
  // since getStyleConfig(styleId as StyleId) still has to type-check.
  "pixel_8bit_nes",
  "pixel_16bit_snes",
  "pixel_32bit",
  "topdown_rpg",
  "sidescroller",
  "isometric",
  "gameboy_dmg",
  "pico8",
  "db16",
  "hd_hand_painted",
]);

function isKnownCategoryId(id: string): id is CategoryId {
  return (CATEGORY_IDS as readonly string[]).includes(id);
}

function isKnownStyleId(id: string): id is StyleId {
  return STYLE_ID_SET.has(id);
}

// ─── Language hint (script-based — no dep) ────────────────────────────────

/**
 * Rough source-language hint from character script. Returns a BCP-47-ish
 * code when confident, undefined when the script is ambiguous between
 * languages (e.g. Latin-with-diacritics could be French, German, Spanish…).
 *
 * Trade-off accepted: Cyrillic → "ru" isn't strictly correct for Ukrainian
 * / Bulgarian users, but Russian is the dominant case in prod traffic and
 * the field is informational (UI display, not logic).
 */
function detectLanguageHint(original: string): string | undefined {
  // Polish-specific — ąćęłńóśźż are distinctive (a/ogonek etc. not shared
  // with other major Slavic-Latin languages). Case-insensitive.
  if (/[ąćęłńóśźż]/i.test(original)) return "pl";
  // Japanese kana (hiragana + katakana) — before CJK-unified because
  // Japanese text often mixes kana with CJK ideographs.
  if (/[\u3040-\u30FF]/.test(original)) return "ja";
  // Korean Hangul syllables.
  if (/[\uAC00-\uD7AF]/.test(original)) return "ko";
  // CJK-unified ideographs (Chinese, or Japanese without kana).
  if (/[\u4E00-\u9FFF]/.test(original)) return "zh";
  // Cyrillic block — Russian in the majority of cases.
  if (/[\u0400-\u04FF]/.test(original)) return "ru";
  // Hebrew and Arabic blocks.
  if (/[\u0590-\u05FF]/.test(original)) return "he";
  if (/[\u0600-\u06FF]/.test(original)) return "ar";
  return undefined;
}

// ─── Step 2a: translate ───────────────────────────────────────────────────

interface TranslateOutcome {
  translated: string;
  wasTranslated: boolean;
  language?: string;
}

async function translateIfNeeded(
  userPrompt: string,
  log: Logger
): Promise<TranslateOutcome> {
  const original = userPrompt.trim();

  // Fast path: pure ASCII = English (or close enough), skip API call.
  if (!/[^\x00-\x7F]/.test(original)) {
    return { translated: original, wasTranslated: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("translate skipped: no ANTHROPIC_API_KEY");
    return { translated: original, wasTranslated: false };
  }

  const anthropic = new Anthropic({ apiKey });
  // Anthropic errors propagate — caller wraps as PromptCompositionError.
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: TRANSLATE_MAX_TOKENS,
    system: TRANSLATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: original }],
  });

  const text = response.content[0];
  if (text.type !== "text" || !text.text.trim()) {
    log.warn("translate: empty response, using original");
    return { translated: original, wasTranslated: false };
  }

  const translated = text.text.trim().replace(/^["']|["']$/g, "").trim();

  // Safety: no Latin letters → translation failed in some subtle way.
  if (!/[a-zA-Z]/.test(translated)) {
    log.warn("translate output had no Latin letters, using original");
    return { translated: original, wasTranslated: false };
  }

  const language = detectLanguageHint(original);
  log.debug("translate ok", { original, translated, language });
  return { translated, wasTranslated: true, language };
}

// ─── Step 2b: enhance ─────────────────────────────────────────────────────

interface EnhanceOutcome {
  enhanced: string;
  wasEnhanced: boolean;
}

// Ported verbatim — intent-preservation stem check, 30% threshold.
const FILLER_WORDS: ReadonlySet<string> = new Set([
  "a", "an", "the", "and", "or", "of", "with", "for", "to", "in", "on", "at",
]);

function stem(w: string): string {
  return w
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/(ing|ed|es|s)$/u, "");
}

function intentPreserved(original: string, enhanced: string): boolean {
  const userStems = original
    .split(/\s+/)
    .map(stem)
    .filter((w) => w.length >= 3 && !FILLER_WORDS.has(w));
  if (userStems.length === 0) return true;

  const enhancedStems = enhanced.split(/\s+/).map(stem);
  const enhancedSet = new Set(enhancedStems);

  const matchCount = userStems.filter(
    (w) => enhancedSet.has(w) || enhancedStems.some((e) => e.includes(w))
  ).length;
  return matchCount / userStems.length >= 0.3;
}

async function enhanceIfEligible(
  userPrompt: string,
  categoryId: string,
  log: Logger
): Promise<EnhanceOutcome> {
  const original = userPrompt.trim();
  const wordCount = original.split(/\s+/).length;

  // Gate: skip if already detailed (≥7) or too short (<2).
  if (wordCount >= 7 || wordCount < 2) {
    return { enhanced: original, wasEnhanced: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    log.warn("enhance skipped: no ANTHROPIC_API_KEY");
    return { enhanced: original, wasEnhanced: false };
  }

  const anthropic = new Anthropic({ apiKey });
  // Anthropic errors propagate — caller wraps as PromptCompositionError.
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: ENHANCE_MAX_TOKENS,
    system: ENHANCE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Category: ${categoryId}\nUser prompt: "${original}"`,
      },
    ],
  });

  const text = response.content[0];
  if (text.type !== "text" || !text.text.trim()) {
    log.warn("enhance: empty response, using original");
    return { enhanced: original, wasEnhanced: false };
  }

  let enhanced = text.text.trim().replace(/^["']|["']$/g, "").trim();

  // Safety: intent-preservation check.
  if (!intentPreserved(original, enhanced)) {
    log.warn("enhance lost intent, using original", { original, enhanced });
    return { enhanced: original, wasEnhanced: false };
  }

  // Safety: cap at 50 words.
  const words = enhanced.split(/\s+/);
  if (words.length > 50) {
    enhanced = words.slice(0, 50).join(" ");
  }

  log.debug("enhance ok", { original, enhanced });
  return { enhanced, wasEnhanced: true };
}

// ─── Main: composePrompt ──────────────────────────────────────────────────

export async function composePrompt(
  params: ComposePromptParams
): Promise<ComposedPrompt> {
  const { rawInput, categoryId, styleId, enhance = false } = params;
  const log = childLogger({ component: "composePrompt", categoryId, styleId });

  const t0 = Date.now();
  const trimmedInput = rawInput.trim();
  log.debug("start", { rawInput: trimmedInput, enhance });

  const trail: TransformationTrail = {
    rawInput: trimmedInput,
    composed: "", // filled at step 2d
  };

  let current = trimmedInput;

  // ── 2a: translate ───────────────────────────────────────────────────────
  try {
    const t = await translateIfNeeded(current, log);
    current = t.translated;
    if (t.wasTranslated) {
      trail.translated = t.translated;
      if (t.language) trail.language = t.language;
    }
  } catch (cause) {
    throw new PromptCompositionError("translate step failed", {
      cause,
      context: { substep: "translate", categoryId, styleId },
    });
  }

  // ── 2b: enhance (optional) ──────────────────────────────────────────────
  if (enhance) {
    try {
      const e = await enhanceIfEligible(current, categoryId, log);
      current = e.enhanced;
      if (e.wasEnhanced) trail.enhanced = e.enhanced;
    } catch (cause) {
      throw new PromptCompositionError("enhance step failed", {
        cause,
        context: { substep: "enhance", categoryId, styleId },
      });
    }
  }

  // ── 2c: validate category + style ───────────────────────────────────────
  if (!isKnownCategoryId(categoryId)) {
    throw new PromptCompositionError(`unknown categoryId: ${categoryId}`, {
      context: { substep: "lookup", categoryId, styleId },
    });
  }
  if (!isKnownStyleId(styleId)) {
    throw new PromptCompositionError(`unknown styleId: ${styleId}`, {
      context: { substep: "lookup", categoryId, styleId },
    });
  }

  let styleCfg;
  try {
    styleCfg = getStyleConfig(styleId);
  } catch (cause) {
    // Known StyleId but STYLE_CONFIGS entry missing (unfilled module-3 stub).
    throw new PromptCompositionError(`style config not populated: ${styleId}`, {
      cause,
      context: { substep: "lookup", categoryId, styleId },
    });
  }

  // ── 2d: compose positive ────────────────────────────────────────────────
  // Shape: `${style.promptPrefix}, ${category.objectType}, ${userText}, ${category.composition}`
  // (category.objectType / composition are PLACEHOLDER_* until module 3).
  // filter(Boolean) drops empty promptPrefix / user input so we don't
  // emit double commas.
  const positiveParts = [
    styleCfg.promptPrefix,
    PLACEHOLDER_OBJECT_TYPE,
    current,
    PLACEHOLDER_COMPOSITION,
  ].filter((s): s is string => s.length > 0);
  const prompt = positiveParts.join(", ");
  trail.composed = prompt;

  // ── 2e: compose negative (base + extend) ────────────────────────────────
  // HD doesn't inherit UNIVERSAL_PIXEL_BASE_NEGATIVE (style.isPixel === false).
  // category.negatives lands in module 3; not added here.
  const negativeParts: string[] = [];
  if (styleCfg.isPixel) negativeParts.push(UNIVERSAL_PIXEL_BASE_NEGATIVE);
  negativeParts.push(...styleCfg.negatives);
  const negativePrompt = negativeParts.join(", ");

  const durationMs = Date.now() - t0;
  log.debug("done", {
    translated: !!trail.translated,
    enhanced: !!trail.enhanced,
    promptLength: prompt.length,
    negativeLength: negativePrompt.length,
    durationMs,
  });

  return { prompt, negativePrompt, trail };
}
