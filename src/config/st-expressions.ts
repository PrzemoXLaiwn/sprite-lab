// =============================================================================
// SillyTavern expression labels — the single source of truth for ST Packs
// =============================================================================
// SillyTavern's "Character Expressions" extension classifies a message into
// one of 28 labels and shows the sprite file named after it (joy.webp …).
// Everything here is client-safe: labels, the default set, the prompt
// fragments the image edit uses and the motion notes the video pass uses.
// =============================================================================

export const ST_EXPRESSION_LABELS = [
  "admiration", "amusement", "anger", "annoyance", "approval", "caring", "confusion", "curiosity", "desire",
  "disappointment", "disapproval", "disgust", "embarrassment", "excitement", "fear", "gratitude", "grief", "joy",
  "love", "nervousness", "optimism", "pride", "realization", "relief", "remorse", "sadness", "surprise", "neutral",
] as const;

export type StExpressionLabel = (typeof ST_EXPRESSION_LABELS)[number];

/** The eight most used in chat; `neutral` is ST's recommended fallback and always ships. */
export const ST_DEFAULT_LABELS: readonly StExpressionLabel[] = [
  "neutral", "joy", "anger", "sadness", "surprise", "love", "embarrassment", "fear",
];

export const ST_EXPRESSION_SETS = ["default8", "all28", "custom"] as const;
export type StExpressionSet = (typeof ST_EXPRESSION_SETS)[number];

/** What the image edit changes on the base still — kept subtle on purpose. */
export const ST_EXPRESSION_FRAGMENTS: Record<StExpressionLabel, string> = {
  neutral: "calm neutral face, relaxed mouth, soft attentive eyes",
  joy: "gentle warm smile with slightly raised cheeks, eyes a little narrowed with happiness, mouth closed or barely open",
  anger: "furrowed brows pulled down, narrowed eyes, tight pressed lips, slight frown",
  sadness: "inner brows raised, eyes slightly downcast and glossy, small downturned mouth",
  surprise: "raised eyebrows, widened eyes, small open \"o\" mouth",
  love: "soft affectionate smile, slightly lowered eyelids, light blush on cheeks",
  embarrassment: "shy awkward smile, strong blush across cheeks, eyes glancing to the side",
  fear: "raised and drawn-together brows, wide eyes, lips slightly parted and tense",
  admiration: "bright eyes looking up slightly, impressed soft smile",
  amusement: "playful amused half-smile, one corner of the mouth raised",
  annoyance: "flat unimpressed eyes, one brow slightly lowered, small pout",
  approval: "small confident smile, slight nod-ready expression, relaxed brows",
  caring: "gentle tender smile, soft warm eyes, slightly tilted head feel",
  confusion: "one eyebrow raised, the other lowered, slightly tilted mouth",
  curiosity: "eyebrows slightly raised, attentive wide eyes, lips slightly parted",
  desire: "longing wistful look, soft eyes, slight smile, fully clothed, non-sexual",
  disappointment: "lowered eyes, slight frown, deflated look",
  disapproval: "narrowed eyes, pursed lips, slightly lowered brows",
  disgust: "wrinkled nose, raised upper lip, squinted eyes",
  excitement: "big bright eyes, wide open smile, raised brows",
  gratitude: "warm thankful smile, soft eyes, slightly lowered brows",
  grief: "deep sorrow, brows raised in the middle, tearful eyes, trembling downturned mouth",
  nervousness: "uneasy small smile, eyes glancing aside, slight sweat drop optional",
  optimism: "hopeful gentle smile, eyes looking slightly upward",
  pride: "confident smug smile, chin slightly raised, half-lidded eyes",
  realization: "eyes widening, eyebrows lifting, mouth slightly open in \"aha\"",
  relief: "relaxed exhale look, soft closed-mouth smile, eyebrows easing",
  remorse: "guilty look, eyes downcast, lips pressed, brows drawn up",
};

/**
 * Expressive mode: one body-acting beat per label. The clip starts and ends
 * on the still; this is what happens in the middle. Each line is a different
 * performance, not a swapped adjective.
 */
export const ST_EXPRESSIVE_ACTING: Record<StExpressionLabel, string> = {
  admiration: "eyes lift, a small impressed nod, one hand rises to the chest, then the arm settles",
  amusement: "a short laugh in the chest, one shoulder hitches, eyes crinkle, then the body stills",
  anger: "fists clench, shoulders tense and rise, a sharp head turn to one side and back, one arm juts out once, then the arms return",
  annoyance: "a flat exhale, one brow drops, a short dismissive flick of one hand, then the hand falls",
  approval: "one firm nod, a small open palm toward the viewer, a satisfied breath, then the hand lowers",
  caring: "the head tilts, one hand reaches slightly forward as if to steady someone, then the arm returns",
  confusion: "the head cocks, one hand comes up beside the temple, the eyes search once, then the hand drops",
  curiosity: "a lean in, eyes widen, one hand lifts with the fingers opening, then the body comes back upright",
  desire: "a slow inhale, one hand rests over the heart, the eyes soften and glance aside, fully clothed, then the hand lowers",
  disappointment: "shoulders sink, a sigh, the head dips, one hand falls, then the posture eases back up",
  disapproval: "one slow head shake, lips press, one palm lifts in a single stop, then the hand lowers",
  disgust: "the head pulls back, the nose wrinkles, one hand waves the air away once, shoulders hunch, then the pose returns",
  embarrassment: "the eyes dart aside, one hand covers the mouth, the shoulders rise, then the hand comes down",
  excitement: "a small bounce, a wide grin, both hands lift once, then the feet and hands settle",
  fear: "a flinch and a half step back, both hands rise, a sharp inhale, then the body eases forward again",
  gratitude: "one hand to the chest, a small bow of the head, then the spine straightens",
  grief: "the head lowers, the shoulders collapse, one hand rubs the opposite arm, the eyes close briefly, then the head lifts",
  joy: "a laugh, the shoulders shake, the head tilts back, one hand goes to the mouth, then the head comes level again",
  love: "one hand over the heart, a soft sway, a small lean in, then the body returns to centre",
  nervousness: "weight shifts to one foot, the hands fidget together once, a glance aside, then the stance evens out",
  optimism: "the chin lifts, a hopeful breath, one open hand gestures outward, then the arm returns",
  pride: "the chin rises, the chest expands, the hands rest on the hips for a moment, then the arms relax",
  realization: "the eyes widen, a small gasp, one finger lifts, the head comes up, then the hand lowers",
  relief: "a long exhale, the shoulders drop, the eyes close for a beat, then they open and the posture recovers",
  remorse: "the eyes go down, one hand rubs the arm, one slow head shake, then the eyes come back up",
  sadness: "the head lowers, the shoulders drop, one hand rubs the opposite arm, the eyes look down and then up",
  surprise: "a step back, both hands come up, the eyes and mouth open, a short freeze, then the feet return",
  neutral: "one deeper breath, a small shift of weight, hair and clothes move once, at most one blink, no gesture",
};

const MOTION_NOTES: Partial<Record<StExpressionLabel, string>> = {
  joy: "a gentle held smile, no giggle, NOT a continuous looping laugh",
  anger: "tense still breathing, one quiet exhale at most, no repeated gesture",
  sadness: "slow breathing, the expression held, no head bob",
  surprise: "holds the surprised look, no extra blink and no recoil",
  love: "soft smile held still, no rhythmic blink",
  embarrassment: "holds the shy look, no repeated glance",
  fear: "shallow breathing, the expression held still, no shaking loop",
  neutral: "quiet chest breathing, no blink or one slow blink at most, no head bob",
};
const DEFAULT_MOTION_NOTE = "calm, subtle, holds the expression";

/** How the idle clip should move for this label. */
export function motionNoteFor(label: StExpressionLabel): string {
  return MOTION_NOTES[label] ?? DEFAULT_MOTION_NOTE;
}

export function isExpressionLabel(value: unknown): value is StExpressionLabel {
  return typeof value === "string" && (ST_EXPRESSION_LABELS as readonly string[]).includes(value);
}

/** `joy` → `joy.webp`. Throws on anything that is not an ST label. */
export function expressionFileName(label: string, ext: "webp" | "gif" | "png" = "webp"): string {
  if (!isExpressionLabel(label)) throw new Error(`Unknown expression label: ${label}`);
  return `${label}.${ext}`;
}

/**
 * The labels a job will produce, in ST order, `neutral` first and always
 * present. Unknown custom entries are dropped.
 */
export function resolveExpressionLabels(set: StExpressionSet, custom: readonly string[] = []): StExpressionLabel[] {
  const picked = new Set<StExpressionLabel>(["neutral"]);
  const source = set === "all28" ? ST_EXPRESSION_LABELS : set === "default8" ? ST_DEFAULT_LABELS : custom.filter(isExpressionLabel);
  for (const l of source) picked.add(l);
  return ["neutral", ...ST_EXPRESSION_LABELS.filter((l) => l !== "neutral" && picked.has(l))];
}
