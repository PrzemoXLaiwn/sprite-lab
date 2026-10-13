import Anthropic from "@anthropic-ai/sdk";
import { claudeCall, trackClaude } from "@/lib/claude-usage";
import { looksLikeChatReply } from "@/lib/prompt-enhance";

// =============================================================================
// Subject interpreter — turns what the user imagined into what to draw
// =============================================================================
// Image models take words literally and fall back to "a generic human" for
// anything abstract: "a gaming keyboard as an enemy" came out as a man in a
// helmet, "an African pygmy hedgehog wearing armour" as a human with spiky
// hair. One short Haiku call decides what the subject's BODY is (a living
// keyboard, a real hedgehog) and spells it out, keeping every detail the user
// asked for. It never blocks a generation: any failure returns the original.
// =============================================================================

const HAIKU = "claude-haiku-4-5-20251001";

const SYSTEM = `You turn a request for a 2D game sprite into one concrete visual description for an image model. The image model takes words literally and, when unsure, draws a generic human — your job is to remove that ambiguity.

Rules:
1. Keep EVERY element the user asked for: the subject, objects, colours, materials, accessories, mood. Never drop, soften or swap anything, and reuse the user's own key nouns word for word ("health potion", "cheese", "keyboard") — add detail around them, don't replace them with synonyms.
2. Start by stating what the subject's BODY is:
   - An object, food, furniture, vehicle, device or plant "as a character / enemy / boss", or "a character that is a X": the creature's body IS that object, still clearly recognisable (its real shape, parts and details), brought to life with eyes, a mouth and small limbs. Never a human wearing or holding it, never a person in a costume.
     Keep the object's REAL silhouette and proportions — the first thing a viewer must recognise is the object itself. A keyboard stays a long, low, flat rectangle seen from the front at a slight top-down angle with its rows of keys clearly visible (never a square box standing on end); a sofa stays a sofa; a bottle stays tall and thin. Put the legs under it or at its sides, put the face where it fits naturally (eyes in the top row of keys, the mouth as a gap in the keys). Name the object's most recognisable details (key rows, space bar, cable, RGB backlight, wrist rest, brand look).
   - A real animal: the true anatomy and proportions of that species with its signature features (name them). It may stand, wear or hold things when asked, but it stays clearly that animal — not a human with animal ears, hair or a mask. Make it humanoid only when the user says humanoid, anthro, -folk or a warrior race.
   - People and fantasy races: describe them normally.
3. "enemy", "monster", "boss", "villain": menacing — angry glowing eyes, hostile stance, sharp details. "cute", "friendly", "pet": the opposite.
4. Turn vague words into something visible (magic, aura, fire, ancient, legendary).
5. Fix spelling mistakes. Write in English.
6. Do not mention art style, pixels, background, camera, lighting setup, sprites or games — they are added separately.
7. Output one line of 25-60 words: no quotes, no lead-in, no full stop at the end. Never ask questions or comment.

Examples:
Request: gaming keyboard as an enemy wearing a plastic helmet with a fire sword
Output: a living black RGB gaming keyboard monster: its body is a long, low, full-size mechanical keyboard seen from the front at a slight top-down angle, rows of rainbow-backlit keycaps and a long space bar clearly visible, angry red glowing eyes in the top row of keys, a jagged mouth where keys are missing, four short clawed legs underneath, its cable lashing like a tail, a cheap plastic toy helmet on its left end, one small arm gripping a flaming sword

Request: character that is a corner sofa blue color holding magic wand
Output: a living blue L-shaped corner sofa creature: its cushioned seat and backrest form the body, two button eyes and a stitched grin on the backrest, stubby wooden sofa legs as feet, a small fabric arm raising a sparkling magic wand

Request: hedgegog african pygmy standing, wearing armour and have aura
Output: a real African pygmy hedgehog standing on its short hind legs: round body, white-tipped brown spines covering its back and head, pale face, pointed snout, tiny black eyes and nose, small clawed paws, wearing fitted steel armour, surrounded by a soft glowing blue aura

Request: knight with a flaming sword
Output: an armoured knight in steel plate armour with a visored helmet and a red tabard, holding a sword whose blade is wrapped in bright orange flames`;

export interface InterpretResult {
  /** What to draw (the original request when interpretation was skipped or failed). */
  subject: string;
  interpreted: boolean;
}

/** Categories where the subject is a thing to draw (tiles and UI are left as typed). */
const INTERPRETED = new Set(["CHARACTERS", "CREATURES", "WEAPONS", "ARMOR", "CONSUMABLES", "RESOURCES", "ENVIRONMENT", ""]);

const FILLER = new Set(["a", "an", "the", "and", "or", "of", "with", "for", "to", "in", "on", "at", "as", "that", "is", "it", "its", "have", "has"]);
const stem = (w: string) => w.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/(ing|ed|es|s)$/u, "");

/**
 * True when the interpretation kept most of what the user wrote. Spelling
 * fixes ("hedgegog" → "hedgehog") are allowed through the prefix match.
 */
export function keepsIntent(original: string, output: string): boolean {
  const asked = original.split(/\s+/).map(stem).filter((w) => w.length >= 3 && !FILLER.has(w));
  if (asked.length === 0) return true;
  const got = output.split(/\s+/).map(stem);
  const hit = asked.filter((w) => got.some((g) => g.includes(w) || (w.includes(g) && g.length >= 4) || (w.length >= 4 && g.slice(0, 4) === w.slice(0, 4)))).length;
  return hit / asked.length >= 0.5;
}

export async function interpretSubject(prompt: string, categoryId?: string): Promise<InterpretResult> {
  const original = prompt.trim();
  const keep = { subject: original, interpreted: false };
  if (!original || !INTERPRETED.has((categoryId ?? "").toUpperCase())) return keep;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return keep;

  try {
    // Short timeout, no retry: this sits in front of every sprite.
    const anthropic = new Anthropic({ apiKey, timeout: 8_000, maxRetries: 0 });
    const response = await claudeCall("interpret", HAIKU, () => anthropic.messages.create({
      model: HAIKU,
      max_tokens: 160,
      system: SYSTEM,
      messages: [{ role: "user", content: `Request: ${original.slice(0, 500)}` }],
    }));
    trackClaude("interpret", response);
    const block = response.content[0];
    if (block?.type !== "text") return keep;
    const out = block.text.trim().replace(/^output:\s*/i, "").replace(/^["']|["']$/g, "").replace(/\.$/, "").trim();
    // Descriptions here are meant to be long (up to 80 words), so only the
    // chatbot-phrasing checks apply, not the shared length limit.
    if (!out || looksLikeChatReply(out.slice(0, 400), original) || !keepsIntent(original, out)) { if (process.env.DEBUG_PROMPTS === "1") console.warn("[Interpret] rejected:", out); return keep; }
    return { subject: out.split(/\s+/).slice(0, 80).join(" "), interpreted: true };
  } catch (err) {
    console.warn("[Interpret] skipped:", err instanceof Error ? err.message : err);
    return keep;
  }
}
