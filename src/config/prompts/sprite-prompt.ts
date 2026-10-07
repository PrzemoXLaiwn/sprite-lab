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
    "semi-realistic painted 2D game art: detailed rendering, dramatic lighting",
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
  CHARACTERS: "full body character, whole figure visible from head to feet",
  CREATURES: "full body creature, whole creature visible",
  WEAPONS: "single weapon item shown whole, diagonal orientation, nothing else",
  ARMOR: "single armor item shown whole, nothing else",
  CONSUMABLES: "single item icon shown whole, nothing else",
  RESOURCES: "single resource item icon shown whole, nothing else",
  UI_ELEMENTS: "single game UI element, flat, front-facing",
  ENVIRONMENT: "single environment prop or object shown whole, isolated",
};

// Keys match AssetView in prompt-configs.ts ("DEFAULT" → no constraint)
const VIEW_LINES: Record<string, string> = {
  SIDE_VIEW: "strict side view in profile, facing right",
  FRONT: "straight front view facing the viewer",
  TOP_DOWN: "top-down view seen from directly above",
};

const POSE_LINES: Record<string, string> = {
  auto: "standing in a neutral idle pose",
  "a-pose": "standing in an A-pose with arms angled slightly away from the body",
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

export function buildSpritePrompt({ subject, styleId, categoryId, view, colorHint, pose }: SpritePromptInput): string {
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
  const posed = (category === "CHARACTERS" || category === "CREATURES") && pose ? POSE_LINES[pose] : undefined;
  const framing = (CATEGORY_FRAMING[category] ?? "single subject shown whole") + (posed ? `, ${posed}` : "");
  const viewLine = view ? VIEW_LINES[view.toUpperCase()] : undefined;
  const cleanSubject = subject.trim().replace(/\s+/g, " ").slice(0, 400);

  return [
    `A 2D video game sprite of ${cleanSubject}.`,
    `${framing}${viewLine ? `, ${viewLine}` : ""}, centered with empty space around it.`,
    `Style: ${style}.`,
    // Sprites of one game must match each other: same pixel density and the
    // same outline no matter whether it's a knight, an ore or an icon.
    ...(isPixelStyle(styleId) ? [PIXEL_CONSISTENCY] : []),
    ...(colorHint ? [`Colors: ${colorHint.slice(0, 200)}.`] : []),
    `Exactly one subject floating on a ${KEY_BACKGROUND}. No ground, no floor, no drop shadow under it, no scenery, no text, no border, no watermark.`,
  ].join(" ");
}
