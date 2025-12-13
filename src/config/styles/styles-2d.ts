// ===========================================
// SPRITELAB CONFIG - 2D STYLES
// ===========================================
// All 2D art style configurations for sprite generation

import type { StyleConfig, StyleUI } from "../types";

// ===========================================
// FULL STYLE CONFIGURATIONS (Backend)
// ===========================================

export const STYLES_2D_FULL: Record<string, StyleConfig> = {
  PIXEL_ART_16: {
    id: "PIXEL_ART_16",
    name: "Pixel Art 16-bit",
    emoji: "🎮",
    description: "Classic retro style",
    styleCore: "16-bit pixel art, retro SNES style sprite, classic game aesthetic",
    rendering: "crisp individual pixels, dithering patterns, no smoothing",
    colors: "limited 16-color palette, saturated retro colors",
    edges: "hard aliased pixel edges, no anti-aliasing",
    negatives: "blurry, smooth, gradient shading, anti-aliased, soft edges, 3D render, photorealistic, painterly, modern",
    model: "flux-dev",
    guidance: 7.5,
    steps: 28,
  },
  PIXEL_ART_32: {
    id: "PIXEL_ART_32",
    name: "Pixel Art HD",
    emoji: "👾",
    description: "Modern pixel art",
    styleCore: "32-bit HD pixel art, modern pixel sprite, detailed retro style",
    rendering: "high-resolution pixels, detailed pixel clusters, subpixel shading",
    colors: "rich color palette, smooth color ramps",
    edges: "clean pixel edges, selective smoothing on curves",
    negatives: "blurry, low resolution, painterly, 3D render, photorealistic, messy jagged pixels",
    model: "flux-dev",
    guidance: 7.5,
    steps: 28,
  },
  HAND_PAINTED: {
    id: "HAND_PAINTED",
    name: "Hand Painted",
    emoji: "🖌️",
    description: "Hollow Knight style",
    styleCore: "hand painted digital art, painterly game sprite, illustrated style",
    rendering: "visible brushstrokes, textured painting, artistic rendering",
    colors: "painterly color blending, artistic palette",
    edges: "soft painted edges, organic brush boundaries",
    negatives: "pixel art, vector art, flat design, sharp digital edges, 3D render, cel shaded",
    model: "sdxl",
    guidance: 8.0,
    steps: 35,
  },
  VECTOR_CLEAN: {
    id: "VECTOR_CLEAN",
    name: "Vector",
    emoji: "🔷",
    description: "Mobile game style",
    styleCore: "clean vector art, flat design game sprite, mobile game style",
    rendering: "smooth flat colors, minimal shading, crisp shapes",
    colors: "bold solid colors, high contrast palette",
    edges: "perfectly smooth edges, clean outlines",
    negatives: "textured, painterly, pixel art, realistic, complex shading, rough edges, gradients",
    model: "flux-dev",
    guidance: 7.0,
    steps: 25,
  },
  ANIME_GAME: {
    id: "ANIME_GAME",
    name: "Anime",
    emoji: "🌸",
    description: "JRPG / Gacha style",
    styleCore: "anime game art, JRPG style sprite, Japanese illustration",
    rendering: "anime cel shading, clean color blocks, soft highlights",
    colors: "vibrant anime colors, gradient hair and effects",
    edges: "clean black outlines, variable line weight",
    negatives: "western cartoon, realistic, pixel art, rough sketch, 3D render, chibi",
    model: "sdxl",
    guidance: 7.5,
    steps: 35,
  },
  CARTOON_WESTERN: {
    id: "CARTOON_WESTERN",
    name: "Cartoon",
    emoji: "🎨",
    description: "Cuphead style",
    styleCore: "western cartoon style, Cuphead aesthetic, bold animated look",
    rendering: "flat colors with simple shading, exaggerated forms",
    colors: "bold saturated colors, high contrast",
    edges: "thick black outlines, consistent stroke weight",
    negatives: "anime, realistic, pixel art, thin lines, muted colors, subtle shading, 3D",
    model: "sdxl",
    guidance: 8.0,
    steps: 35,
  },
  DARK_SOULS: {
    id: "DARK_SOULS",
    name: "Dark Fantasy",
    emoji: "🌑",
    description: "Souls-like style",
    styleCore: "dark fantasy art, souls-like aesthetic, gritty medieval style",
    rendering: "detailed realistic rendering, weathered textures, dramatic lighting",
    colors: "desaturated palette, muted earth tones, blood reds, cold steel",
    edges: "gritty detailed edges, worn and battle-damaged",
    negatives: "bright colors, cartoon, cute, chibi, clean pristine, pixel art, anime, cheerful",
    model: "sdxl",
    guidance: 8.5,
    steps: 40,
  },
  CHIBI_CUTE: {
    id: "CHIBI_CUTE",
    name: "Chibi Cute",
    emoji: "🍭",
    description: "Kawaii style",
    styleCore: "chibi kawaii style, adorable cute game art, soft rounded design",
    rendering: "soft cel shading, gentle gradients, sparkle effects",
    colors: "pastel colors, candy palette, soft pink accents",
    edges: "soft rounded edges, gentle outlines",
    negatives: "realistic proportions, dark themes, horror, gritty, scary, detailed realistic, sharp edges",
    model: "flux-dev",
    guidance: 7.0,
    steps: 28,
  },
  ISOMETRIC: {
    id: "ISOMETRIC",
    name: "Isometric",
    emoji: "🏰",
    description: "Clash of Clans style",
    styleCore: "isometric game art, 2.5D dimetric projection, strategy game style like Clash of Clans or Age of Empires, clean vector-like rendering",
    rendering: "consistent 26.57-degree isometric angle (2:1 pixel ratio), clear form definition, cel-shaded look, soft shadows, clean outlines",
    colors: "vibrant saturated colors, clear material differentiation, warm lighting from top-left, distinct surface colors for roof walls and ground",
    edges: "clean geometric edges, precise angles, subtle black outline, smooth anti-aliased edges",
    negatives: "perspective view, flat top-down, orthographic side view, inconsistent angle, photorealistic 3D render, tilted wrong, fisheye, dutch angle, blurry, noisy, complex realistic textures",
    model: "flux-dev",
    guidance: 7.5,
    steps: 30,
  },
  ISOMETRIC_PIXEL: {
    id: "ISOMETRIC_PIXEL",
    name: "Isometric Pixel",
    emoji: "🎮",
    description: "Pixel art isometric",
    styleCore: "isometric pixel art, retro strategy game style, classic RTS aesthetic like StarCraft or Command & Conquer",
    rendering: "pixel perfect isometric projection, dithering for shading, limited color palette per object, clean pixel clusters",
    colors: "limited palette, 16-32 colors, color ramps for shading, clear material colors",
    edges: "hard pixel edges, no anti-aliasing, clean pixel boundaries",
    negatives: "blurry, smooth gradients, anti-aliased, 3D render, perspective view, realistic, painterly",
    model: "flux-dev",
    guidance: 7.5,
    steps: 28,
  },
  ISOMETRIC_CARTOON: {
    id: "ISOMETRIC_CARTOON",
    name: "Isometric Cartoon",
    emoji: "🎨",
    description: "Cartoon isometric",
    styleCore: "isometric cartoon style, mobile game aesthetic, colorful and playful like Hay Day or Township",
    rendering: "smooth cel-shaded surfaces, bold colors, exaggerated proportions, friendly appearance",
    colors: "bright cheerful colors, candy palette, soft gradients, warm highlights",
    edges: "smooth rounded edges, thick outlines, cartoon proportions",
    negatives: "realistic, dark, gritty, pixel art, complex details, scary, horror",
    model: "sdxl",
    guidance: 7.0,
    steps: 35,
  },
  REALISTIC_PAINTED: {
    id: "REALISTIC_PAINTED",
    name: "Realistic",
    emoji: "📷",
    description: "AAA quality",
    styleCore: "realistic digital painting, AAA game art quality, professional illustration",
    rendering: "high detail rendering, realistic lighting, polished finish",
    colors: "realistic natural colors, proper light and shadow",
    edges: "refined natural edges, lost and found edges",
    negatives: "cartoon, pixel art, flat design, anime, chibi, stylized, low detail, rough",
    model: "sdxl",
    guidance: 9.0,
    steps: 40,
  },
};

// ===========================================
// UI STYLES (Frontend - lightweight)
// ===========================================

export const STYLES_2D_UI: StyleUI[] = Object.values(STYLES_2D_FULL).map((style) => ({
  id: style.id,
  name: style.name,
  emoji: style.emoji,
  description: style.description,
}));

// ===========================================
// STYLE IDS (for validation)
// ===========================================

export const STYLE_2D_IDS = Object.keys(STYLES_2D_FULL) as Array<keyof typeof STYLES_2D_FULL>;

// ===========================================
// DEFAULT STYLE
// ===========================================

export const DEFAULT_STYLE_2D = "PIXEL_ART_16";
