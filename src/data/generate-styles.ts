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

// Every backend STYLES_2D_FULL entry surfaced in the picker. Earlier we
// hid Isometric / Chibi behind URL-param-only access "to keep the picker
// short", but that quietly removed real features from the UI — testers
// asked for "Isometric Pixel" and couldn't find it. If a style is in
// STYLES_2D_FULL it should be selectable.
export const GENERATE_STYLES: GenerateStyle[] = [
  { id: "PIXEL_ART_16",      name: "Pixel 16-bit",       description: "Classic retro" },
  { id: "PIXEL_ART_32",      name: "Pixel HD",           description: "Modern indie" },
  { id: "ISOMETRIC_PIXEL",   name: "Isometric Pixel",    description: "RTS classic" },
  { id: "HAND_PAINTED",      name: "Hand Painted",       description: "Hollow Knight" },
  { id: "ANIME_GAME",        name: "Anime",              description: "JRPG style" },
  { id: "CHIBI_CUTE",        name: "Chibi",              description: "Cute mobile" },
  { id: "DARK_SOULS",        name: "Dark Fantasy",       description: "Gritty medieval" },
  { id: "CARTOON_WESTERN",   name: "Cartoon",            description: "Expressive fun" },
  { id: "ISOMETRIC_CARTOON", name: "Isometric Cartoon",  description: "Casual diorama" },
  { id: "ISOMETRIC",         name: "Isometric",          description: "RTS / city-builder" },
  { id: "VECTOR_CLEAN",      name: "Vector",             description: "Clean mobile" },
  { id: "REALISTIC_PAINTED", name: "Realistic",          description: "AAA concept" },
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
