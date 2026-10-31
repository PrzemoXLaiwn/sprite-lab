// =============================================================================
// ST Packs — SFW check for prompts and style notes
// =============================================================================
// The packs are character portraits for chat; nothing sexual, no fetish
// framing, nothing that sexualises minors, no gore. Text is folded first
// (lower case, leetspeak digits, punctuation stripped) so "n.u.d.e" and
// "nud3" match. Short words match whole words only, stems match inside
// words. Every generation prompt is additionally prefixed with SFW_PREFIX.
// =============================================================================

export const SFW_PREFIX = "SFW, fully clothed, adult character";

const WORDS = [
  // sexual / nudity
  "nude", "nudes", "naked", "nsfw", "porn", "porno", "hentai", "ecchi", "erotic", "erotica", "sex", "sexy", "sexual",
  "topless", "bottomless", "lingerie", "bikini", "underwear", "panties", "bra", "nipple", "nipples", "areola", "boobs",
  "boob", "tits", "breasts", "cleavage", "genitals", "genital", "penis", "vagina", "pussy", "dick", "cock", "anal",
  "orgasm", "cum", "blowjob", "handjob", "horny", "aroused", "arousal", "lewd", "lustful", "seductive", "strip", "stripper",
  "slut", "whore", "milf", "onlyfans", "thong", "camel toe", "upskirt", "nudity",
  // fetish
  "fetish", "bdsm", "bondage", "latex", "tentacle", "tentacles", "futanari", "futa", "yaoi", "yuri", "ahegao", "bukkake",
  "dildo", "vibrator", "buttplug", "collar and leash",
  // minors in any sexual framing (the fragments above already block the act; these block the pairing)
  "loli", "lolita", "shota", "underage", "jailbait", "schoolgirl", "cp",
  // gore
  "gore", "gory", "guro", "dismembered", "dismemberment", "decapitated", "decapitation", "disemboweled", "mutilated",
  "mutilation", "entrails", "torture", "snuff",
  // Polish
  "nagi", "naga", "nago", "golas", "goła", "goły", "cycki", "piersi", "seks", "seksowna", "seksowny", "erotyczna",
  "erotyczny", "porno", "majtki", "bielizna", "penis", "wagina", "cipka", "kutas", "chuj", "orgazm", "fetysz",
];
const STEMS = ["masturbat", "pornograph", "pedophil", "pedofil", "paedophil", "sexualis", "sexualiz", "nudist", "rape", "incest", "bestialit", "necrophil", "genitali"];

const fold = (text: string) =>
  text
    .toLowerCase()
    .replace(/0/g, "o").replace(/1/g, "i").replace(/3/g, "e").replace(/4/g, "a").replace(/5/g, "s").replace(/7/g, "t")
    .replace(/@/g, "a").replace(/\$/g, "s")
    // "n.u.d.e", "n-u-d-e" → "nude" (only between single letters, so "cel-shading" stays two words)
    .replace(/(?<=\b\p{L})[.\-_*](?=\p{L}\b)/gu, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const WORD_RE = new RegExp(`(?<![\\p{L}])(?:${WORDS.map(esc).join("|")})(?![\\p{L}])`, "iu");
const STEM_RE = new RegExp(STEMS.join("|"), "i");

/** The first blocked term found in the text, or null when it is fine. */
export function findUnsafeTerm(text: string | null | undefined): string | null {
  if (!text) return null;
  const folded = fold(text);
  const word = WORD_RE.exec(folded);
  if (word) return word[0];
  const stem = STEM_RE.exec(folded);
  return stem ? stem[0] : null;
}

export type SfwCheck = { ok: true } | { ok: false; term: string; message: string };

/** Prompt and style notes together; the message is safe to show in the UI. */
export function checkSfw(...texts: Array<string | null | undefined>): SfwCheck {
  for (const t of texts) {
    const term = findUnsafeTerm(t);
    if (term) return { ok: false, term, message: `That text isn't allowed here ("${term}"). Keep the character fully clothed, adult and non-sexual, with no gore.` };
  }
  return { ok: true };
}
