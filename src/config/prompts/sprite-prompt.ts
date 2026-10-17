// =============================================================================
// SpriteLab — sprite prompt builder (instruction-following models)
// =============================================================================
// Modern image models (FLUX.2, Nano Banana, Seedream, GPT Image) follow plain
// instructions. Long keyword soups ("masterpiece, 4k, no HD, pixel grid…")
// contradict themselves and get ignored. This builder produces one short,
// unambiguous instruction:
//
//   - WHAT: the user's subject, framed for the asset category
//   - HOW:  a one-line style description
//   - WHERE: on a flat solid key-colour background
//
// Hard technical requirements (transparency, pixel grid, palette, framing) are
// NOT requested from the model — they are enforced afterwards by
// src/lib/image/sprite-postprocess.ts. Asking a model for a "transparent
// background" makes it paint a fake checkerboard.
// =============================================================================

/** Flat background the model paints on; keyed out in post-processing. */
export const KEY_BACKGROUND = "plain flat solid pure white background";

const STYLE_LINES: Record<string, string> = {
  PIXEL_ART_16:
    "16-bit retro pixel art in the style of classic SNES games: crisp visible pixels, limited color palette, flat shading with 2-3 tones per color, no anti-aliasing, no gradients",
  PIXEL_ART_32:
    "modern indie pixel art like Celeste or Dead Cells: crisp visible pixels, rich but limited palette, clean pixel clusters, no anti-aliasing, no gradients",
  HAND_PAINTED:
    "hand-painted 2D game art like Hollow Knight: painterly brush texture, soft lighting, rich colors",
  ANIME_GAME:
    "anime-style 2D game art like a gacha game: clean line art, cel shading, vibrant colors",
  DARK_SOULS:
    "dark fantasy 2D game art: gritty, muted desaturated palette, dramatic shading, detailed",
  REALISTIC_PAINTED:
    "photorealistic AAA game art like a high-end RPG character render: true-to-life proportions and anatomy, a realistic face with natural skin texture, real eyes and subtle features (not cartoon, not anime, not stylized, no big eyes), physically based materials (worn leather, cloth weave, scratched metal), soft cinematic lighting, highly detailed",
  CARTOON_WESTERN:
    "western cartoon 2D game art: bold black outlines, flat vibrant colors, simple shading",
  VECTOR_CLEAN:
    "clean flat vector game art: smooth shapes, flat colors, crisp outlines, minimal shading",
  CHIBI_CUTE:
    "cute chibi 2D game art: big head small body proportions, soft pastel colors, thick outlines",
  ISOMETRIC:
    "isometric 2D game art, true isometric angle, clean shading",
  ISOMETRIC_PIXEL:
    "isometric pixel art, true isometric angle, crisp visible pixels, limited palette, no anti-aliasing",
  ISOMETRIC_CARTOON:
    "isometric cartoon game art, true isometric angle, bold outlines, flat vibrant colors",
};

const CATEGORY_FRAMING: Record<string, string> = {
  CHARACTERS: "full body character, the whole character visible",
  CREATURES: "full body creature, whole creature visible",
  WEAPONS: "single weapon item shown whole, diagonal orientation, nothing else",
  ARMOR: "single armor item shown whole, nothing else",
  CONSUMABLES: "single item icon shown whole, nothing else",
  RESOURCES: "single resource item icon shown whole, nothing else",
  UI_ELEMENTS: "single game UI element, flat, front-facing",
  ENVIRONMENT: "single environment prop or object shown whole, isolated",
};

// Keys match AssetView in prompt-configs.ts ("DEFAULT" → no constraint)
// The view alone decides the angle (pose lines never mention one, so they
// can't contradict it). Figures and objects need different wording.
const VIEW_LINES: Record<string, { figure: string; object: string }> = {
  SIDE_VIEW: {
    figure: "strict side profile view facing right: only one side of the body is visible, one eye, the nose points to the right edge, no three-quarter turn",
    object: "strict side view in profile, facing right",
  },
  FRONT: {
    figure: "perfectly straight-on front view: head, chest, hips and feet all face the viewer directly, shoulders level and parallel to the image, symmetrical stance, no turn and no three-quarter angle",
    object: "straight front view facing the viewer, no perspective turn",
  },
  TOP_DOWN: {
    figure: "high top-down RPG view like classic 16-bit RPG games: the camera looks down at about 45 degrees, the top of the head and shoulders are visible, the body is shorter below them, facing down toward the viewer",
    object: "top-down view seen from directly above",
  },
};
/** No view picked: the slight three-quarter angle the UI calls Default. */
const DEFAULT_FIGURE_VIEW = "facing the viewer at a slight three-quarter angle";

// "auto" is the game-ready default the UI promises: a calm A-pose, ready to
// rig and animate (combat poses only when the user picks Dynamic)
const A_POSE = "standing upright in a relaxed A-pose: arms hanging slightly away from the body, open hands, feet shoulder-width apart, calm neutral expression";
// Something in the hands (the user asked for it): an A-pose with "open hands"
// drops the weapons, so the calm game-ready stance holds them out instead
const ARMED_STANCE = "standing upright in a steady, symmetrical ready stance, not attacking, every hand gripping its weapon or item held out and away from the body so each blade, handle and tip is fully visible";
const POSE_LINES: Record<string, string> = {
  auto: A_POSE,
  "a-pose": A_POSE,
  "t-pose": "standing in a T-pose with both arms stretched out horizontally",
  dynamic: "in a dynamic action pose",
};

export interface SpritePromptInput {
  subject: string;
  styleId: string;
  categoryId?: string;
  view?: string;
  /** Extra colour direction, e.g. a palette's promptModifier */
  colorHint?: string;
  /** Only applied to characters / creatures */
  pose?: string;
  /** What the user typed: decides whether held items were asked for. */
  original?: string;
}

/** Anything a character could hold or carry. */
const HELD_ITEM = /\b(sword|blade|katana|sabre|saber|dagger|knife|axe|hatchet|hammer|mace|club|flail|spear|lance|halberd|pike|trident|scythe|sickle|bow|crossbow|arrows?|gun|pistol|rifle|shotgun|blaster|cannon|staff|wand|rod|scepter|sceptre|orb|tome|book|scroll|shield|buckler|torch|lantern|lamp|weapons?|armed|holding|holds|wielding|wields|carrying|carries|pickaxe|shovel|rake|fishing|guitar|instrument|potion|flask|bottle|mug|cup|bag|sack|basket|umbrella|broom|whip|chain|net|key|lute|banner|flag)\b/i;

/** True when the user asked for something in the hands (so it stays). */
export function asksForHeldItem(text: string): boolean {
  return HELD_ITEM.test(text);
}

/** Legacy style ids ("pixel-16", "pixel_art_16") → canonical ids */
export function normalizeStyleId(styleId: string): string {
  const s = styleId.toUpperCase().replace(/-/g, "_");
  if (s === "PIXEL_16") return "PIXEL_ART_16";
  if (s === "PIXEL_32") return "PIXEL_ART_32";
  return s;
}

const PIXEL_CONSISTENCY =
  "Pixel size: fine and uniform, the subject spans about 110 pixels across its longest side, the same pixel size for every object (small objects are not drawn with bigger pixels). Outline: a single thin 1-pixel dark outline around the whole silhouette, never thick or double.";

/** Tiles fill their square and must wrap — no background keying. */
export function isTileCategory(categoryId: string | null | undefined): boolean {
  return (categoryId ?? "").toUpperCase() === "TILESETS";
}

export function isPixelStyle(styleId: string): boolean {
  return normalizeStyleId(styleId).includes("PIXEL");
}

/** Cut at the last comma or space before `max`, never mid-word. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const at = Math.max(cut.lastIndexOf(", "), cut.lastIndexOf(" "));
  return (at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[,\s]+$/, "");
}

export function buildSpritePrompt(input: SpritePromptInput): string {
  const { subject, categoryId, view, colorHint, pose } = input;
  let { styleId } = input;
  styleId = normalizeStyleId(styleId);
  const style = STYLE_LINES[styleId.toUpperCase()] ?? STYLE_LINES.PIXEL_ART_16;
  const category = (categoryId ?? "").toUpperCase();
  if (isTileCategory(category)) {
    const cleanTile = subject.trim().replace(/\s+/g, " ").slice(0, 400);
    return [
      `A seamless tileable square texture tile for a 2D video game: ${cleanTile}.`,
      "Flat orthographic view straight at the surface. The pattern fills the entire square edge to edge and continues across all four edges so copies line up with no visible seam.",
      `Style: ${style}.`,
      ...(isPixelStyle(styleId) ? ["Uniform fine pixel size across the whole tile."] : []),
      ...(colorHint ? [`Colors: ${colorHint.slice(0, 200)}.`] : []),
      "Even lighting with no vignette. No border, no frame, no outline around the tile, no single object in the middle, no background, no text, no watermark.",
    ].join(" ");
  }
  const figure = category === "CHARACTERS" || category === "CREATURES";
  // Game-ready by default: nothing in the hands unless the user asked for it
  const holds = asksForHeldItem(input.original ?? subject);
  const emptyHands = figure && pose !== "dynamic" && !holds;
  // Creatures (animals, monsters) aren't put in an A-pose: a calm standing pose
  // instead. Anything holding weapons gets the armed stance.
  const calm = pose === "auto" || pose === "a-pose";
  const posed = figure && pose
    ? calm && holds
      ? ARMED_STANCE
      : category === "CREATURES" && calm
        ? "standing calmly in a neutral pose, not attacking"
        : POSE_LINES[pose]
    : undefined;
  const framing = (CATEGORY_FRAMING[category] ?? "single subject shown whole") + (posed ? `, ${posed}` : "");
  const views = view ? VIEW_LINES[view.toUpperCase()] : undefined;
  const viewLine = views ? (figure ? views.figure : views.object) : figure ? DEFAULT_FIGURE_VIEW : undefined;
  const cleanSubject = clip(subject.trim().replace(/\s+/g, " "), 400);

  return [
    `A 2D video game sprite of ${cleanSubject}.`,
    `${framing}${viewLine ? `, ${viewLine}` : ""}, centered with empty space around it.`,
    // Models fill the canvas edge to edge; anything they draw past it is lost
    // for good (cut feet, flat-topped auras), so the margin is spelled out
    `Leave a wide empty margin on every side: the whole ${figure ? "figure" : "subject"}, including ${figure ? "feet, " : ""}weapon tips, flames and any glow, fits well inside the image at about two thirds of its height, and nothing touches or crosses the edges.`,
    `Style: ${style}.`,
    // Sprites of one game must match each other: same pixel density and the
    // same outline no matter whether it's a knight, an ore or an icon.
    ...(isPixelStyle(styleId) ? [PIXEL_CONSISTENCY] : []),
    ...(colorHint ? [`Colors: ${colorHint.slice(0, 200)}.`] : []),
    ...(emptyHands ? ["Hands empty: no weapon, shield, staff, wand, tool or any other held item."] : []),
    `Exactly one subject floating on a ${keyBackgroundFor(cleanSubject, styleId)}. No ground, no floor, no drop shadow under it, no scenery, no text, no border, no watermark.`,
  ].join(" ");
}

/**
 * White, silver or pale subjects can't sit on a white key: background seen
 * through a gap (between a bow and its string, inside a ring) is then
 * indistinguishable from a white shirt. Those get a magenta key — no game
 * subject is pure magenta, so every enclosed patch of it is background
 * (sprite-postprocess detects the key colour from the border).
 */
const PALE_SUBJECT = /\b(white|silver|silvery|snow\w*|ice|icy|frost\w*|ghost\w*|spirit|bone|skull|skeleton|pearl\w*|marble|ivory|cream|pale|cloud\w*|steam|mist|moon\w*|platinum|chrome|glass|crystal\w*|diamond\w*|angel\w*|polar|yeti|wool|sheep|cotton|paper|porcelain)\b/i;

export const MAGENTA_KEY_BACKGROUND = "plain flat solid pure magenta (#FF00FF) background";

/**
 * Soft light (auras, glows, flames, smoke) is semi-transparent: on a chroma
 * key it blends into a pink halo that can't be keyed out. Those subjects, and
 * every painted style (soft anti-aliased edges), stay on the white key.
 */
const SOFT_LIGHT = /\b(glow\w*|aura|halo|radiant|radiance|shin\w*|light|lights|lit|flame\w*|fire|fiery|burning|blaze|ember\w*|smoke|smoky|sparkl\w*|magic\w*|energy|spell|lightning|electric\w*)\b/i;

export function keyBackgroundFor(subject: string, styleId = "PIXEL_ART_16"): string {
  const magenta = isPixelStyle(styleId) && PALE_SUBJECT.test(subject) && !SOFT_LIGHT.test(subject);
  return magenta ? MAGENTA_KEY_BACKGROUND : KEY_BACKGROUND;
}
