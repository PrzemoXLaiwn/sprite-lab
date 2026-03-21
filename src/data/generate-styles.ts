// =============================================================================
// GENERATE PAGE — STYLE DEFINITIONS
// =============================================================================
// RPG-focused subset of styles for the Generate page UI.
// IDs MUST match keys in STYLES_2D_FULL from src/config/styles/styles-2d.ts.
// =============================================================================

export interface GenerateStyle {
  id: string;
  name: string;
  description: string;
}

// Primary styles shown in the generator (8 styles)
// Excluded from default list: CHIBI_CUTE, ISOMETRIC, ISOMETRIC_PIXEL, ISOMETRIC_CARTOON
// Those are accessible via URL params or future presets.
export const GENERATE_STYLES: GenerateStyle[] = [
  { id: "PIXEL_ART_16", name: "Pixel 16-bit", description: "Classic retro" },
  { id: "PIXEL_ART_32", name: "Pixel HD", description: "Modern indie" },
  { id: "HAND_PAINTED", name: "Hand Painted", description: "Hollow Knight" },
  { id: "ANIME_GAME", name: "Anime", description: "JRPG style" },
  { id: "DARK_SOULS", name: "Dark Fantasy", description: "Gritty medieval" },
  { id: "CARTOON_WESTERN", name: "Cartoon", description: "Expressive fun" },
  { id: "VECTOR_CLEAN", name: "Vector", description: "Clean mobile" },
  { id: "REALISTIC_PAINTED", name: "Realistic", description: "AAA concept" },
];

// All valid style IDs (for validation / URL param acceptance)
export const ALL_GENERATE_STYLE_IDS = [
  "PIXEL_ART_16",
  "PIXEL_ART_32",
  "HAND_PAINTED",
  "VECTOR_CLEAN",
  "ANIME_GAME",
  "CHIBI_CUTE",
  "CARTOON_WESTERN",
  "DARK_SOULS",
  "ISOMETRIC",
  "ISOMETRIC_PIXEL",
  "ISOMETRIC_CARTOON",
  "REALISTIC_PAINTED",
] as const;

export type GenerateStyleId = (typeof ALL_GENERATE_STYLE_IDS)[number];
