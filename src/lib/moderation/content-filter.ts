// =============================================================================
// Community content filter — what may appear in the public gallery, comments
// and chat
// =============================================================================
// Deliberately narrow: sexual content, slurs and strong profanity (English and
// Polish). It is not a sprite-generation filter (the image providers moderate
// generation); it decides what is shown to everyone else. Short words match as
// whole words only (so "class", "glass", "scunthorpe" pass); stems match inside
// words ("masturbating"). Leetspeak digits are folded first ("d1ld0").
// =============================================================================

/** Whole-word terms. */
const WORDS = [
  // sexual
  "dildo", "dildos", "penis", "penises", "vagina", "vaginas", "porn", "porno", "nsfw", "nude", "nudes", "naked", "hentai",
  "boobs", "boob", "tits", "titties", "sex", "sexy", "erotic", "orgasm", "cum", "blowjob", "genitals", "genital", "nipple",
  "nipples", "dick", "dicks", "cock", "cocks", "pussy", "anal", "horny", "slut", "whore", "rape", "incest", "loli", "shota",
  "fetish", "bdsm", "condom", "vibrator", "buttplug", "milf", "onlyfans",
  // slurs
  "nigger", "niggers", "nigga", "faggot", "fag", "retard", "kike", "chink", "spic", "tranny",
  // strong profanity
  "fuck", "fucking", "fucker", "shit", "cunt", "bitch", "asshole", "motherfucker",
  // Polish
  "kutas", "chuj", "cipa", "pizda", "kurwa", "dziwka", "cwel", "pedał", "seks", "wagina", "ruchanie", "jebać", "jebac",
];
/** Stems matched inside words. */
const STEMS = ["masturbat", "pornograph", "pierdol", "jebany", "jebana", "spierdal", "wypierdal", "pedofil", "pedophil", "kurwy"];

const fold = (text: string) =>
  text.toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
    .replace(/@/g, "a").replace(/\$/g, "s");

// Letters include Polish diacritics, so "pedał" is a whole word and "pedal" isn't
const WORD_RE = new RegExp(`(?<![\\p{L}])(?:${WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![\\p{L}])`, "iu");
const STEM_RE = new RegExp(STEMS.join("|"), "i");

/** The first blocked term in the text, or null. */
export function findBlockedTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const t = fold(text);
  return t.match(WORD_RE)?.[0] ?? t.match(STEM_RE)?.[0] ?? null;
}

export function isBlockedText(text: string | null | undefined): boolean {
  return findBlockedTerm(text) !== null;
}

/**
 * Unambiguous terms for a database filter (substring, case-insensitive): used
 * to keep anything already published with them out of the public lists until a
 * moderator removes it. Only words that can't be part of an innocent word.
 */
export const GALLERY_HIDDEN_SUBSTRINGS = [
  "dildo", "penis", "vagina", "porn", "hentai", "nsfw", "blowjob", "masturbat", "genital", "vibrator", "orgasm",
  "nigger", "nigga", "faggot", "boobs", "titties", "onlyfans", "fuck", "kutas", "pierdol",
] as const;

/** Message shown when a community post, comment or chat line is refused. */
export const BLOCKED_MESSAGE = "That text can't be shared in the community. Keep it game-friendly, please.";
