import Anthropic from "@anthropic-ai/sdk";

/**
 * AI Prompt Enhancer — Pro/Studio feature
 *
 * Takes a short user prompt like "iron chestplate magic" and expands it
 * into a detailed visual description for FLUX.1 while preserving the
 * user's EXACT intent. Never adds, removes, or changes the core subject.
 *
 * Rules:
 * - Keep every word the user wrote (iron, chestplate, magic)
 * - Expand vague words into visual descriptions ("magic" → "glowing blue runes")
 * - Add material/texture/lighting details FLUX needs
 * - Stay under 40 words total (FLUX optimal when combined with system prompt)
 * - Never change the item type, color, or style
 * - Output ONLY the enhanced prompt, no explanation
 */

const SYSTEM_PROMPT = `You are a game asset prompt enhancer for an AI image generator (FLUX.1).

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

interface EnhanceResult {
  enhanced: string;
  original: string;
  wasEnhanced: boolean;
}

interface TranslateResult {
  translated: string;
  original: string;
  wasTranslated: boolean;
}

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

/**
 * Translate a non-English user prompt to English before sending to FLUX.
 * FLUX is English-trained, so raw Cyrillic/Polish/etc. produces garbage.
 * Runs for ALL users — translation is the foundation, not a paid feature.
 */
export async function translatePromptIfNeeded(
  userPrompt: string
): Promise<TranslateResult> {
  const original = userPrompt.trim();

  // Fast path: pure ASCII = English (or close enough), skip the API call.
  if (!/[^\x00-\x7F]/.test(original)) {
    return { translated: original, original, wasTranslated: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[Translate] No ANTHROPIC_API_KEY, sending original prompt");
    return { translated: original, original, wasTranslated: false };
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system: TRANSLATE_SYSTEM_PROMPT,
      messages: [{ role: "user", content: original }],
    });

    const text = response.content[0];
    if (text.type !== "text" || !text.text.trim()) {
      return { translated: original, original, wasTranslated: false };
    }

    let translated = text.text.trim().replace(/^["']|["']$/g, "").trim();

    // Safety: if translator returned something with no Latin letters at all,
    // assume it failed and fall back.
    if (!/[a-zA-Z]/.test(translated)) {
      console.warn(`[Translate] Output had no Latin letters, using original`);
      return { translated: original, original, wasTranslated: false };
    }

    console.log(`[Translate] "${original}" → "${translated}"`);
    return { translated, original, wasTranslated: true };
  } catch (error) {
    console.error("[Translate] Error:", error);
    return { translated: original, original, wasTranslated: false };
  }
}

export async function enhanceUserPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string
): Promise<EnhanceResult> {
  const original = userPrompt.trim();

  // Don't enhance already detailed prompts (7+ words is detailed enough)
  if (original.split(/\s+/).length >= 7) {
    return { enhanced: original, original, wasEnhanced: false };
  }

  // Don't enhance empty or single-word prompts
  if (original.split(/\s+/).length < 2) {
    return { enhanced: original, original, wasEnhanced: false };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("[PromptEnhance] No ANTHROPIC_API_KEY, skipping enhancement");
    return { enhanced: original, original, wasEnhanced: false };
  }

  try {
    const anthropic = new Anthropic({ apiKey });

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Category: ${categoryId}/${subcategoryId}\nUser prompt: "${original}"`,
        },
      ],
    });

    const text = response.content[0];
    if (text.type !== "text" || !text.text.trim()) {
      return { enhanced: original, original, wasEnhanced: false };
    }

    let enhanced = text.text.trim();

    // Safety: remove quotes if Claude wrapped it
    enhanced = enhanced.replace(/^["']|["']$/g, "").trim();

    // Safety: if Claude returned something completely different, use original.
    // Normalize via stem (strip trailing s/es/ed/ing) so "sword" matches "swords"
    // and "glow" matches "glowing". Skip filler words that Claude routinely
    // drops/replaces (articles, prepositions). Threshold 30% — low enough to
    // allow synonym substitutions ("red" → "crimson"), high enough to catch
    // total derailment.
    const FILLER = new Set([
      "a", "an", "the", "and", "or", "of", "with", "for", "to", "in", "on", "at",
    ]);
    const stem = (w: string): string =>
      w.toLowerCase()
        .replace(/[^a-z0-9]/g, "")
        .replace(/(ing|ed|es|s)$/u, "");

    const userStems = original
      .split(/\s+/)
      .map(stem)
      .filter((w) => w.length >= 3 && !FILLER.has(w));
    const enhancedStems = enhanced.split(/\s+/).map(stem);
    const enhancedSet = new Set(enhancedStems);

    if (userStems.length > 0) {
      const matchCount = userStems.filter(
        (w) => enhancedSet.has(w) || enhancedStems.some((e) => e.includes(w))
      ).length;
      const ratio = matchCount / userStems.length;
      if (ratio < 0.3) {
        console.warn(
          `[PromptEnhance] Safety: enhanced lost intent (${matchCount}/${userStems.length} = ${Math.round(ratio * 100)}%), using original`
        );
        return { enhanced: original, original, wasEnhanced: false };
      }
    }

    // Safety: cap at 50 words
    const words = enhanced.split(/\s+/);
    if (words.length > 50) {
      enhanced = words.slice(0, 50).join(" ");
    }

    console.log(`[PromptEnhance] "${original}" → "${enhanced}"`);
    return { enhanced, original, wasEnhanced: true };
  } catch (error) {
    console.error("[PromptEnhance] Error:", error);
    return { enhanced: original, original, wasEnhanced: false };
  }
}
