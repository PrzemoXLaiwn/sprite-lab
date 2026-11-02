// =============================================================================
// What the prompt is actually asking for
// =============================================================================
// About 1 in 10 real prompts ask for an animation, a sprite sheet, or a set of
// items, and the single-sprite pipeline used to draw that request literally
// (a tiny contact sheet, or one character holding the set). This plans a
// delivery the pipelines we already have can honour:
//   • animation / sheet → one clean sprite, and which Animate motion to open
//   • turnaround        → the existing 4- or 8-direction sheet
//   • set               → one image, items in a row, not a character holding them
// No extra model call. Animation itself still runs only when the user
// continues in Animate (that pipeline has its own credit price).
// =============================================================================

export type DeliveryKind = "sprite" | "animation" | "sheet" | "set";

export interface PromptDelivery {
  kind: DeliveryKind;
  /** Subject with the sheet / cycle / "set of" wording removed. */
  prompt: string;
  motion: "idle" | "walk" | "run" | "attack" | "jump" | "cast" | "hurt" | "death" | "fly" | null;
  rotation: "rotate4" | "rotate8" | null;
  /** Walk and run read properly from the side; only when the user named no view. */
  preferSideView: boolean;
  /** 2–6 when the prompt asks for several items. */
  setCount: number | null;
}

const COUNT_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
};

function countOf(word: string | undefined): number | null {
  if (!word) return null;
  const n = COUNT_WORDS[word.toLowerCase()] ?? Number(word);
  if (!Number.isInteger(n) || n < 2 || n > 12) return null;
  return n;
}

const SHEET = /\b(sprite ?sheets?|spritesheets?|\d+\s+(?:sequential\s+)?(?:animation\s+)?frames?|animation frames|multiple frames|various poses|frame[- ]by[- ]frame(?: animation)?|animated gifs?|turnarounds?)\b/i;
const CYCLE = /\b((?:walk(?:ing)?|run(?:ning)?|idle|attack(?:ing)?|jump(?:ing)?|cast(?:ing)?|hurt|death|dying|fly(?:ing)?|flight)\s+(?:cycle|animation|animations|anim)|sprite animations?|animations? of|animated sprite)\b/i;
const ROT8 = /\b(8|eight)[- ]directions?\b|\bevery 45\b/i;
const ROT4 = /\bturnarounds?\b|\b(4|four)[- ]directions?\b|\bfront,?\s+(?:the\s+)?(?:side|right|back)\b/i;
const SET_OF = /\b(?:a\s+)?(?:set|collection|pack|assortment|bundle)\s+of(?:\s+(\d+|two|three|four|five|six|seven|eight))?\b/i;
const SEVERAL = /\b(\d+|two|three|four|five|six|seven|eight)\s+(?:different\s+)?(potions?|flasks?|elixirs?|swords?|axes?|shields?|helmets?|helms?|gems?|coins?|icons?|items?|weapons?|boots?|rings?|scrolls?|keys?|chests?|armou?rs?|daggers?|staffs?|staves|wands?)\b/i;

function motionOf(text: string): PromptDelivery["motion"] {
  if (/\b(run(?:ning)?|sprint)\b/i.test(text)) return "run";
  if (/\bwalk(?:ing)?\b/i.test(text)) return "walk";
  if (/\battack(?:ing)?\b/i.test(text)) return "attack";
  if (/\bjump(?:ing)?\b/i.test(text)) return "jump";
  if (/\b(cast(?:ing)?|spell)\b/i.test(text)) return "cast";
  if (/\b(hurt|flinch|hit reaction)\b/i.test(text)) return "hurt";
  if (/\b(death|dying|defeat)\b/i.test(text)) return "death";
  if (/\b(fly(?:ing)?|flight)\b/i.test(text)) return "fly";
  if (/\bidle\b/i.test(text)) return "idle";
  return null;
}

function stripDeliveryWords(p: string): string {
  return p
    .replace(/\b(?:an?\s+)?(?:animated\s+)?(?:polished\s+)?(?:sprite ?sheets?|spritesheets?)(?:\s+(?:of|for|with))?\s*/gi, "")
    .replace(/\b\d+\s*(?:sequential\s+)?(?:animation\s+)?frames?(?:\s+(?:of|for|with))?\s*/gi, "")
    .replace(CYCLE, " ")
    .replace(/\b(?:animation frames|multiple frames|various poses|frame[- ]by[- ]frame(?: animation)?|animated gifs?|turnarounds?|sprite animations?|animations? of|animated sprites?)\b[,.]?\s*/gi, "")
    .replace(/\b(?:8|eight|4|four)[- ]directions?\b[,.]?\s*/gi, "")
    .replace(SET_OF, " ")
    .replace(SEVERAL, (_m, _n, noun: string) => `${noun} `)
    .replace(/\s{2,}/g, " ")
    .replace(/^(?:of|for|with)\s+/i, "")
    .replace(/^[\s,.:;-]+|[\s,;-]+$/g, "")
    .trim();
}

export function planDelivery(raw: string): PromptDelivery {
  const text = (raw ?? "").replace(/\s+/g, " ").trim();
  const base: PromptDelivery = {
    kind: "sprite", prompt: text, motion: null, rotation: null, preferSideView: false, setCount: null,
  };
  if (text.length < 3) return base;

  const sheet = SHEET.test(text);
  const cycle = CYCLE.test(text);
  const rotation: PromptDelivery["rotation"] = ROT8.test(text) ? "rotate8" : ROT4.test(text) ? "rotate4" : null;
  const setMatch = text.match(SET_OF);
  const several = text.match(SEVERAL);
  const setCount = setMatch
    ? Math.min(6, countOf(setMatch[1]) ?? 4)
    : several
      ? Math.min(6, countOf(several[1]) ?? 2)
      : null;

  if (!sheet && !cycle && !rotation && !setCount) return base;

  const prompt = stripDeliveryWords(text);
  const safePrompt = prompt.length >= 3 ? prompt : text;
  if (sheet || cycle || rotation) {
    const motion = rotation ? null : motionOf(text);
    return {
      kind: rotation && !cycle ? "sheet" : cycle || motion ? "animation" : "sheet",
      prompt: safePrompt,
      motion,
      rotation,
      preferSideView: !rotation && (motion === "walk" || motion === "run"),
      setCount: null,
    };
  }
  return { kind: "set", prompt: safePrompt, motion: null, rotation: null, preferSideView: false, setCount };
}
