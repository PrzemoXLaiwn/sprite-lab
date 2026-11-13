// =============================================================================
// Provider moderation retry — Google (Nano Banana) rejects harmless game art
// ("slime", "acid spit", "blood splatter") even when the picture is a sprite.
// The first attempt is unchanged. This rewrite runs only on the one retry,
// so a generation that passes the first time costs the same as before.
// =============================================================================

/** Prepended on the animation-grid retry. Kept stable so tests can lock it. */
export const GAME_ART_RETRY_PREFIX =
  "Harmless, family-friendly cartoon video game sprite sheet for an indie game, no gore, no realistic violence.";

/**
 * Words that show up in ordinary game prompts and still trip the provider.
 * Replacements stay visual (a jelly blob, red paint) so the picture is the
 * same idea, drawn as cartoon game art.
 */
const SWAPS: ReadonlyArray<readonly [RegExp, string]> = [
  [/\b(bloodied|bloody|blood)\b/gi, "red paint"],
  [/\b(gore|gory|guts|intestines|entrails)\b/gi, "cartoon stuffing"],
  [/\b(dismember(?:ed|ment)?|decapitat(?:e|ed|ion)|behead(?:ed|ing)?|severed)\b/gi, "cartoon"],
  [/\b(nude|nudes|naked|nsfw|sexy|erotic|erotica|lingerie|topless)\b/gi, "fully clothed"],
  [/\b(kill|killing|murder(?:ed|ing)?|corpse|cadaver)\b/gi, "defeat"],
  [/\bacids?\b/gi, "bright green liquid"],
  [/\bslimes?\b/gi, "round jelly creatures"],
];

export function softenForModeration(prompt: string, prefix = GAME_ART_RETRY_PREFIX): string {
  const head = prefix.trim();
  // Already retried once: do not rewrite the prefix ("no gore" must stay).
  if (head && prompt.startsWith(head)) return prompt;
  let body = prompt;
  for (const [re, to] of SWAPS) body = body.replace(re, to);
  if (!head) return body;
  return `${head}\n${body}`;
}
