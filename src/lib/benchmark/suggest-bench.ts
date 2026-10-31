// Side-by-side scorer for motion suggestions. The live script
// (scripts/benchmark/suggest.ts) calls the models when a key is present.
// This module only scores text and prices tokens. It does not call an API.

import { claudeCostUsd } from "@/lib/claude-usage";
import type { MotionSuggestions } from "@/lib/animation-suggest";

export const SUGGEST_BENCH_PROMPTS: { id: string; categoryId: string; prompt: string; want: RegExp; forbid?: RegExp }[] = [
  { id: "dog", categoryId: "CREATURES", prompt: "a brown dog with a red collar", want: /wag|bark|sniff/i, forbid: /fly|drive|wheel/i },
  { id: "cat", categoryId: "CREATURES", prompt: "a black cat", want: /lick|purr|pounce|tail/i, forbid: /drive|wheel/i },
  { id: "knight", categoryId: "CHARACTERS", prompt: "a knight in plate armour with a sword and shield", want: /shield|sword|walk|idle/i },
  { id: "wizard", categoryId: "CHARACTERS", prompt: "an old wizard with a staff and a spellbook", want: /cast|spell|book|staff/i },
  { id: "slime", categoryId: "CREATURES", prompt: "a green slime monster", want: /wobble|hop|split|bounce/i, forbid: /walk cycle with two legs/i },
  { id: "dragon", categoryId: "CREATURES", prompt: "a red dragon with wings", want: /breath|fly|wing|roar/i },
  { id: "pirate", categoryId: "CHARACTERS", prompt: "a pirate with a cutlass and a peg leg", want: /cutlass|sword|idle|walk/i },
  { id: "robot", categoryId: "CHARACTERS", prompt: "a small boxy robot with treads", want: /roll|drive|idle|beep/i, forbid: /wag tail/i },
  { id: "sword", categoryId: "WEAPONS", prompt: "a steel longsword", want: /swing|thrust|spin/i, forbid: /walk|bark/i },
  { id: "bow", categoryId: "WEAPONS", prompt: "a wooden hunting bow", want: /draw|shoot|aim|string/i, forbid: /walk/i },
  { id: "potion", categoryId: "CONSUMABLES", prompt: "a red health potion bottle", want: /bubble|float|glow|cork/i, forbid: /walk|attack/i },
  { id: "chest", categoryId: "ENVIRONMENT", prompt: "a wooden treasure chest with a gold lock", want: /open|shimmer|shake/i, forbid: /walk/i },
  { id: "tree", categoryId: "ENVIRONMENT", prompt: "an oak tree", want: /sway|leaf|wind/i, forbid: /walk|attack/i },
  { id: "torch", categoryId: "ENVIRONMENT", prompt: "a wall torch with a flame", want: /flicker|flame|burn/i },
  { id: "coin", categoryId: "RESOURCES", prompt: "a gold coin", want: /spin|flip|shine/i, forbid: /walk/i },
  { id: "car", categoryId: "CHARACTERS", prompt: "a red sports car", want: /drive|drift|idle|brake/i, forbid: /wag|bark/i },
  { id: "ghost", categoryId: "CREATURES", prompt: "a pale ghost", want: /float|hover|fade|wail/i },
  { id: "horse", categoryId: "CREATURES", prompt: "a brown horse", want: /trot|gallop|walk|idle/i, forbid: /drive|wheel/i },
  { id: "mage-staff", categoryId: "WEAPONS", prompt: "a crystal mage staff", want: /glow|cast|pulse|swing/i, forbid: /bark/i },
  { id: "ui-heart", categoryId: "UI_ELEMENTS", prompt: "a heart icon for a health bar", want: /pulse|beat|shine/i, forbid: /walk|attack/i },
];

export interface SuggestScore {
  id: string;
  motions: number;
  idleFirst: boolean;
  matched: boolean;
  forbidden: boolean;
  reasons: string[];
}

export function scoreSuggestions(promptId: string, result: MotionSuggestions | null): SuggestScore {
  const spec = SUGGEST_BENCH_PROMPTS.find((p) => p.id === promptId);
  const reasons: string[] = [];
  if (!spec) reasons.push("unknown prompt");
  if (!result || result.motions.length < 6 || result.motions.length > 8) reasons.push(`motion count ${result?.motions.length ?? 0}`);
  const idleFirst = !!result && result.motions[0]?.loop === true;
  if (!idleFirst) reasons.push("first motion is not a loop");
  const blob = (result?.motions ?? []).map((m) => `${m.label} ${m.motion}`).join("\n");
  const matched = spec ? spec.want.test(blob) : false;
  if (!matched) reasons.push("missing a motion the prompt needs");
  const forbidden = spec?.forbid ? spec.forbid.test(blob) : false;
  if (forbidden) reasons.push("contains a motion the subject cannot do");
  return { id: promptId, motions: result?.motions.length ?? 0, idleFirst, matched, forbidden, reasons };
}

/** Same token counts on both models. Haiku's list price in claude-usage.ts is 1/5 of Opus. */
export function suggestPriceDelta(tokens: { input_tokens: number; output_tokens: number }) {
  const opusUsd = claudeCostUsd("claude-opus-5-5", tokens);
  const haikuUsd = claudeCostUsd("claude-haiku-4-5-20251001", tokens);
  return { opusUsd, haikuUsd, savedUsd: opusUsd - haikuUsd, haikuOverOpus: opusUsd === 0 ? 0 : haikuUsd / opusUsd };
}
