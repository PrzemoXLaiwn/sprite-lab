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

const MOTION_NOTES: Partial<Record<StExpressionLabel, string>> = {
  joy: "a gentle held smile, at most one soft brief giggle, NOT a continuous looping laugh",
  anger: "tense still breathing, maybe one sharp exhale",
  sadness: "slow heavy breathing, eyes lowering slightly",
  surprise: "held surprised look, one blink",
  love: "soft smile, slow blink",
  embarrassment: "shy glance aside and back, holds blush",
  fear: "slight trembling, quick shallow breaths",
  neutral: "calm breathing and blinking only",
};
const DEFAULT_MOTION_NOTE = "calm, subtle, holds the expression";

/** How the idle clip should move for this label. */
export function motionNoteFor(label: StExpressionLabel): string {
  return MOTION_NOTES[label] ?? DEFAULT_MOTION_NOTE;
}

/** Labels whose loop may fall back to ping-pong (never the lively ones: a reversed laugh or gasp reads wrong). */
export const PING_PONG_ALLOWED: ReadonlySet<StExpressionLabel> = new Set<StExpressionLabel>(
  ST_EXPRESSION_LABELS.filter((l) => !["joy", "surprise", "excitement", "realization", "amusement"].includes(l)),
);

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
