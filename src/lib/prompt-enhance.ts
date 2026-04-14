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

Your job: take a short user prompt and expand it into a vivid visual description optimized for FLUX.1 image generation.

RULES:
1. KEEP every element the user mentioned. Never remove or change anything.
2. EXPAND vague words into visual details:
   - "magic" → describe HOW magic looks (glowing runes, ethereal aura, energy particles)
   - "fire" → describe flames, ember glow, heat distortion
   - "ancient" → describe wear, patina, moss, cracks
   - "dark" → describe shadow tones, ominous presence
3. ADD texture, material, lighting details that make the image specific and game-ready.
4. Keep it between 20-40 words. Concise but rich in visual detail.
5. Write as a descriptive phrase, not a sentence. No "A" at the start, no period at the end.
6. Output ONLY the enhanced prompt. No explanation, no quotes, no prefix.
7. NEVER add style instructions (pixel art, anime, cartoon etc.) — the system handles style separately.
8. Focus on WHAT the object looks like: shape, material, color, texture, lighting, effects.

EXAMPLES:
User: "fire sword"
Enhanced: "blazing fire sword with flames licking along the blade, ember glow at the edges, molten orange cracks in dark steel, radiating heat shimmer"

User: "red health potion"
Enhanced: "red health potion in round glass flask, bright crimson liquid with tiny bubbles, cork stopper, warm inner glow, heart symbol etched on glass"

User: "skeleton warrior"
Enhanced: "undead skeleton warrior in rusted iron armor, glowing green eye sockets, wielding chipped bone sword, tattered dark cape, menacing combat stance"

User: "iron chestplate magic"
Enhanced: "iron chestplate with glowing blue arcane runes etched into the surface, faint magical aura emanating from the metal, ornate silver trim edges"

User: "crystal dragon"
Enhanced: "majestic crystal dragon with translucent gemstone scales refracting light, sharp faceted wings, glowing inner core visible through crystalline body, prismatic light effects"

User: "dark knight"
Enhanced: "ominous dark knight in blackened full plate armor, tattered crimson cape, glowing red visor slit, battle-worn scratches, menacing imposing stance, shadows clinging to form"`;

interface EnhanceResult {
  enhanced: string;
  original: string;
  wasEnhanced: boolean;
}

export async function enhanceUserPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string
): Promise<EnhanceResult> {
  const original = userPrompt.trim();

  // Don't enhance already very detailed prompts (10+ words is detailed enough)
  if (original.split(/\s+/).length >= 10) {
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

    // Safety: if Claude returned something completely different, use original
    // Check that at least 50% of user words appear in enhanced
    const userWords = original.toLowerCase().split(/\s+/);
    const enhancedLower = enhanced.toLowerCase();
    const matchCount = userWords.filter((w) => enhancedLower.includes(w)).length;
    if (matchCount < userWords.length * 0.5) {
      console.warn(`[PromptEnhance] Safety: enhanced prompt lost user intent, using original`);
      return { enhanced: original, original, wasEnhanced: false };
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
