// ===========================================
// SPRITELAB CONFIG - 2D STYLES (PRO v3.0)
// ===========================================
// PROFESSIONAL GAME-DEV QUALITY UPDATE:
// - Optimized for game-ready asset output
// - Better model parameters (FLUX-dev works best with lower guidance)
// - Stronger style enforcement with weighted prompts
// - Higher steps for better quality
// - Game industry standard quality keywords

import type { StyleConfig, StyleUI } from "../types";

// ===========================================
// PROFESSIONAL QUALITY CONSTANTS
// ===========================================
// These enhance output quality across all styles
export const PRO_QUALITY_BOOST = {
  // Core game-ready requirements
  gameReady: "game-ready sprite asset, production quality, professional game art, clean isolated object",
  // Technical quality
  technical: "sharp focus, high detail, masterpiece quality, best quality, 4k quality render",
  // Composition for game use
  composition: "single centered object, perfect framing, clean readable silhouette, works at any scale",
  // Transparency for engine import
  transparency: "transparent background, PNG with alpha channel, clean anti-aliased edges for cutout, no background elements",
};

// ===========================================
// FULL STYLE CONFIGURATIONS (Backend)
// ===========================================

export const STYLES_2D_FULL: Record<string, StyleConfig> = {
  // ===========================================
  // PIXEL ART STYLES - STRONGEST ENFORCEMENT
  // ===========================================
  PIXEL_ART_16: {
    id: "PIXEL_ART_16",
    name: "Pixel Art 16-bit",
    emoji: "🎮",
    description: "Classic retro style",
    // Core style - optimized for SDXL pixel art
    styleCore: "16-bit pixel art game sprite, retro SNES Genesis era, classic video game pixel graphics, pixel perfect rendering, visible square pixels",
    // Rendering specifics
    rendering: "clearly visible individual square pixels, sharp pixel grid, dithering patterns for shading, NO anti-aliasing, NO smoothing whatsoever, each pixel must be distinct",
    // Color palette
    colors: "strictly limited 16-24 color indexed palette, saturated retro game colors, flat color fills, no color gradients at all",
    // Edge handling
    edges: "hard aliased pixel edges, blocky pixelated shapes, jagged stair-step edges on all diagonals, crisp pixel boundaries",
    // Style enforcement
    styleEnforcement: "THIS MUST BE PIXEL ART with clearly visible square pixels throughout. Every edge shows individual pixels. Classic 16-bit era game aesthetic like Final Fantasy VI or Chrono Trigger sprites.",
    // Mandatory requirements
    styleMandatory: "MANDATORY: visible pixel grid, pixelated edges, dithering shading, retro aesthetic. FORBIDDEN: smooth gradients, anti-aliasing, soft edges, painterly strokes, HD rendering",
    // Negative prompt - stronger anti-smooth
    negatives: "smooth, gradient, realistic, photorealistic, blurry, soft edges, anti-aliased, anti-aliasing, high resolution smooth details, 3D render, photograph, painting, watercolor, oil paint, sketch, pencil, smooth shading, soft lighting, realistic textures, film grain, noise, hand-painted, vector art, clean smooth lines, modern digital art, soft brush, airbrush, HD quality, 4K, smooth curves, soft focus, soft gradients, smooth rendering",
    // Model settings - OPTIMIZED: Lower guidance, more steps
    model: "sdxl",
    guidance: 8.0,   // ✅ OPTIMIZED: Prevents over-saturation and artifacts
    steps: 50,       // ✅ OPTIMIZED: More steps for sharper pixels
  },

  PIXEL_ART_32: {
    id: "PIXEL_ART_32",
    name: "Pixel Art HD",
    emoji: "👾",
    description: "Modern pixel art",
    styleCore: "32-bit HD pixel art sprite, modern indie pixel game style, detailed retro aesthetic like Celeste or Dead Cells",
    rendering: "visible pixels with fine detail, pixel clusters for smooth shading, selective dithering, crisp pixel work, readable silhouette",
    colors: "rich 32-64 color palette, smooth color ramps within pixel constraints, vibrant cohesive palette, subtle pixel-based gradients allowed",
    edges: "clean pixel edges, smoother curves through careful sub-pixel technique, but still visibly pixelated overall",
    styleEnforcement: "Modern HD PIXEL ART with visible pixels throughout - higher detail than 16-bit but still clearly pixelated, NOT smooth digital art. Like Hyper Light Drifter or Octopath Traveler sprites.",
    styleMandatory: "MANDATORY: visible pixels, pixel-based shading, crisp edges. FORBIDDEN: smooth gradients, anti-aliasing, photorealistic rendering, painterly strokes",
    negatives: "smooth gradients, blurry, soft, painterly, 3D render, photorealistic, vector art, anti-aliased edges, soft brush strokes, realistic textures, photograph, smooth digital art, airbrushed",
    model: "sdxl",
    guidance: 8.0,      // ✅ OPTIMIZED: Consistent with PIXEL_ART_16
    steps: 45,          // ✅ OPTIMIZED: More steps for quality
  },

  // ===========================================
  // HAND-PAINTED / ARTISTIC STYLES
  // ===========================================
  HAND_PAINTED: {
    id: "HAND_PAINTED",
    name: "Hand Painted",
    emoji: "🖌️",
    description: "Hollow Knight style",
    styleCore: "hand painted digital art game sprite, painterly illustration style like Hollow Knight or Ori and the Blind Forest, artistic fantasy illustration",
    rendering: "visible brush strokes and texture, textured paint application, artistic traditional media appearance, layered painting technique",
    colors: "painterly color blending, artistic harmonious palette, rich mid-tones, atmospheric color relationships, subtle color temperature shifts",
    edges: "soft painted edges, organic brush boundaries, lost and found edges technique, artistic edge variety for visual interest",
    styleEnforcement: "Hand-painted illustration quality with visible artistic brushwork throughout. Like concept art or illustrated game backgrounds. Painterly and atmospheric.",
    styleMandatory: "MUST have painterly texture, visible brush strokes, artistic rendering - NOT flat digital, NOT pixel art, NOT 3D render, NOT vector",
    negatives: "pixel art, pixelated, vector art, flat design, sharp digital edges, 3D render, cel shaded, anime style, clean lines, smooth digital, photorealistic, crisp edges, flat colors",
    model: "sdxl",
    guidance: 7.5,
    steps: 40,
  },

  // ===========================================
  // VECTOR / CLEAN STYLES
  // ===========================================
  VECTOR_CLEAN: {
    id: "VECTOR_CLEAN",
    name: "Vector",
    emoji: "🔷",
    description: "Mobile game style",
    styleCore: "clean vector art game sprite, flat design mobile game aesthetic, geometric shapes, modern casual game style like Angry Birds or Cut the Rope",
    rendering: "smooth flat colors, minimal cel shading, crisp geometric shapes, clean digital illustration, polished professional finish",
    colors: "bold solid colors, high contrast limited palette, vibrant but harmonious colors, clear color separation",
    edges: "perfectly smooth edges, clean sharp outlines, precise geometric boundaries, consistent line weight",
    styleEnforcement: "Clean vector-style art with flat colors and smooth shapes. Polished mobile game or modern indie game quality. Professional and marketable.",
    styleMandatory: "MUST be clean flat design, smooth edges, minimal texture - NOT painterly, NOT pixel art, NOT realistic shading, NOT sketchy",
    negatives: "textured, painterly, pixel art, realistic, complex shading, rough edges, noise, grain, hand-drawn, sketchy, brushy, organic shapes, irregular lines",
    model: "flux-dev",
    guidance: 3.5,
    steps: 30,
  },

  // ===========================================
  // ANIME / JAPANESE STYLES
  // ===========================================
  ANIME_GAME: {
    id: "ANIME_GAME",
    name: "Anime",
    emoji: "🌸",
    description: "JRPG / Gacha style",
    styleCore: "anime game art sprite, JRPG character illustration style, Japanese game art, gacha game aesthetic like Genshin Impact or Fire Emblem",
    rendering: "anime cel shading technique, clean color blocks with soft gradients, polished anime rendering, sharp lineart with smooth fills",
    colors: "vibrant anime colors, gradient shading on hair and clothes, saturated harmonious palette, characteristic anime color choices",
    edges: "clean black outlines, variable line weight for depth, crisp anime lineart, confident strokes",
    styleEnforcement: "Japanese anime/manga style art as seen in JRPGs, gacha games, or visual novels. Clean, polished, colorful with expressive design.",
    styleMandatory: "MUST have anime aesthetic with clean lines, cel shading, vibrant colors - NOT western cartoon, NOT realistic, NOT pixel art, NOT painterly",
    negatives: "western cartoon, realistic, pixel art, rough sketch, 3D render, chibi, painterly, oil painting, watercolor, thick outlines, american animation style",
    model: "sdxl",
    guidance: 7.0,
    steps: 40,
  },

  CHIBI_CUTE: {
    id: "CHIBI_CUTE",
    name: "Chibi Cute",
    emoji: "🍭",
    description: "Kawaii style",
    styleCore: "chibi kawaii game sprite, adorable cute game art, super deformed SD proportions, Japanese cute mascot aesthetic",
    rendering: "soft cel shading, gentle smooth gradients, sparkle and glow effects, rounded shapes everywhere, soft shadows",
    colors: "pastel candy colors, soft pink and blue accents, gentle warm tones, dreamy color palette",
    edges: "soft rounded edges, gentle thin outlines, no sharp corners anywhere, bubbly organic shapes",
    styleEnforcement: "Super cute chibi/kawaii style with big heads, small bodies, maximum adorableness. Like mobile pet games, cute mascots, or chibi character goods.",
    styleMandatory: "MUST be cute chibi with exaggerated head-to-body ratio 2:1 or 3:1 - NOT realistic proportions, NOT scary, NOT detailed anatomy",
    negatives: "realistic proportions, dark themes, horror, gritty, scary, detailed realistic anatomy, sharp edges, serious expression, mature content, violent, muscular",
    model: "flux-dev",
    guidance: 3.5,
    steps: 30,
  },

  // ===========================================
  // WESTERN CARTOON STYLES
  // ===========================================
  CARTOON_WESTERN: {
    id: "CARTOON_WESTERN",
    name: "Cartoon",
    emoji: "🎨",
    description: "Cuphead style",
    styleCore: "western cartoon game sprite, Cuphead rubber hose aesthetic, bold animated character design, classic animation style with modern polish",
    rendering: "flat colors with simple cel shading, exaggerated squash and stretch forms, animated frame look, bold confident shapes",
    colors: "bold saturated colors, high contrast palette, limited punchy colors, classic cartoon color harmony",
    edges: "thick black outlines, consistent stroke weight, bold expressive lineart, clean confident strokes",
    styleEnforcement: "Western cartoon/animation style like Cuphead, classic Fleischer/Disney, or modern Cartoon Network. Bold, expressive, animated energy.",
    styleMandatory: "MUST have thick outlines, bold colors, exaggerated cartoon proportions - NOT anime, NOT realistic, NOT pixel art, NOT subtle",
    negatives: "anime, realistic, pixel art, thin lines, muted colors, subtle shading, 3D render, photorealistic, painterly, detailed textures, soft edges",
    model: "sdxl",
    guidance: 7.5,
    steps: 40,
  },

  // ===========================================
  // DARK / MATURE STYLES
  // ===========================================
  DARK_SOULS: {
    id: "DARK_SOULS",
    name: "Dark Fantasy",
    emoji: "🌑",
    description: "Souls-like style",
    styleCore: "dark fantasy game art, souls-like aesthetic, gritty medieval dark style like Dark Souls Elden Ring Bloodborne, FromSoftware inspired design",
    rendering: "detailed realistic rendering with stylization, weathered worn textures, dramatic moody lighting, atmospheric depth, battle-worn appearance",
    colors: "desaturated muted palette, earth tones and cold grays, blood reds and rust, dark atmospheric shadows, limited color accent",
    edges: "gritty detailed edges, worn and battle-damaged surfaces, rough weathered textures, organic imperfect shapes",
    styleEnforcement: "Dark gritty atmospheric fantasy art. Weathered dangerous beautiful in darkness. Professional AAA dark fantasy game quality.",
    styleMandatory: "MUST be dark and gritty with muted desaturated colors, weathered worn details - NOT bright, NOT cute, NOT clean pristine, NOT cheerful",
    negatives: "bright colors, cartoon, cute, chibi, clean pristine, pixel art, anime, cheerful, colorful, happy, vibrant, saturated, pastel, new and shiny, smooth surfaces",
    model: "sdxl",
    guidance: 8.0,
    steps: 45,
  },

  // ===========================================
  // ISOMETRIC STYLES
  // ===========================================
  ISOMETRIC: {
    id: "ISOMETRIC",
    name: "Isometric",
    emoji: "🏰",
    description: "Clash of Clans style",
    styleCore: "isometric 2.5D game art, strict 26.57-degree dimetric projection (2:1 ratio), strategy game style like Clash of Clans Age of Empires Stardew Valley, mobile strategy aesthetic",
    rendering: "STRICT 26.57-degree isometric angle with 2:1 pixel ratio, clean cel-shaded surfaces, soft drop shadow underneath, clear form definition, mathematically correct iso projection",
    colors: "vibrant saturated colors, clear material differentiation, warm top-left lighting, distinct surface colors per plane",
    edges: "clean geometric edges at proper iso angles, precise isometric construction, subtle outlines, smooth edges for clarity",
    styleEnforcement: "Proper 26.57-degree isometric projection as seen in mobile strategy games. STRICT angle maintained throughout entire object. Game-ready asset. NO perspective distortion.",
    styleMandatory: "MUST be true 26.57-degree isometric angle not perspective, consistent top-left lighting, single isolated object - NOT perspective 3D, NOT top-down flat, NOT 30-45 degree angles",
    negatives: "perspective view with vanishing point, flat top-down orthographic, side view profile, inconsistent angles, photorealistic 3D render, tilted wrong, fisheye lens, dutch angle, blurry, realistic textures, wrong isometric angle, 30 degree angle, 45 degree angle",
    model: "sdxl",
    guidance: 8.5,      // ✅ OPTIMIZED: Higher guidance for strict angle control
    steps: 45,          // ✅ OPTIMIZED: More steps for geometric precision
  },

  ISOMETRIC_PIXEL: {
    id: "ISOMETRIC_PIXEL",
    name: "Isometric Pixel",
    emoji: "🎮",
    description: "Pixel art isometric",
    styleCore: "isometric pixel art sprite, retro strategy RTS style like classic StarCraft Command and Conquer Age of Empires II, pixel perfect iso projection, strict 26.57 degree isometric angle",
    rendering: "pixel perfect isometric angles, dithering for shading, clearly visible pixels, clean pixel clusters, precise pixel placement",
    colors: "limited 16-32 indexed color palette, color ramps for pixel shading, retro game colors",
    edges: "hard pixel edges with no anti-aliasing, clean pixel boundaries, proper stair-step isometric lines",
    styleEnforcement: "Pixel art in isometric view. Must show visible pixels while maintaining proper 26.57 degree isometric angle (2:1 ratio). Like classic RTS games.",
    styleMandatory: "MUST be pixel art with visible pixels AND proper isometric angle - both requirements critical, no smooth gradients",
    negatives: "smooth gradients, anti-aliased edges, 3D render, perspective view, realistic, painterly, soft edges, blurry, smooth curves, modern HD",
    model: "sdxl",
    guidance: 9.0,      // ✅ Already optimal for dual requirements
    steps: 50,          // ✅ OPTIMIZED: Maximum steps for pixel+iso precision
  },

  ISOMETRIC_CARTOON: {
    id: "ISOMETRIC_CARTOON",
    name: "Isometric Cartoon",
    emoji: "🎨",
    description: "Cartoon isometric",
    styleCore: "isometric cartoon game style, mobile casual aesthetic like Hay Day Township SimCity BuildIt, colorful friendly isometric design",
    rendering: "smooth cel-shaded surfaces, bold cheerful colors, exaggerated friendly proportions, clean readable forms",
    colors: "bright cheerful colors, candy palette, soft pleasant gradients, warm inviting tones",
    edges: "smooth rounded edges, thick friendly outlines, cartoon proportions, bouncy appealing shapes",
    styleEnforcement: "Cute cartoon style in proper isometric view. Friendly inviting casual mobile game quality. Fun and approachable.",
    styleMandatory: "MUST be cartoon style AND proper isometric angle - cheerful colors, rounded shapes, game-ready asset",
    negatives: "realistic, dark, gritty, pixel art, complex details, scary, horror, muted colors, serious, perspective view, flat top-down",
    model: "flux-dev",
    guidance: 3.5,
    steps: 35,
  },

  // ===========================================
  // REALISTIC / HIGH QUALITY
  // ===========================================
  REALISTIC_PAINTED: {
    id: "REALISTIC_PAINTED",
    name: "Realistic",
    emoji: "📷",
    description: "AAA quality",
    styleCore: "realistic digital painting game art, AAA quality concept art illustration, professional game industry artwork like League of Legends or World of Warcraft splash art",
    rendering: "high detail realistic rendering with artistic stylization, realistic lighting and materials, polished professional industry finish",
    colors: "realistic natural colors, proper physically-based lighting and shadow, subtle color temperature variation, cinematic color grading",
    edges: "refined natural edges, lost and found edge technique, realistic edge treatment with artistic consideration",
    styleEnforcement: "High quality realistic digital art at AAA game concept art level. Professional polished industry standard. Impressive and marketable.",
    styleMandatory: "MUST be realistic and high quality professional standard - NOT cartoon, NOT pixel art, NOT flat design, NOT amateur",
    negatives: "cartoon, pixel art, flat design, anime, chibi, overly stylized, low detail, rough, sketchy, amateur, simple shapes, flat colors, cel shaded",
    model: "sdxl",
    guidance: 8.0,
    steps: 50,
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

// ===========================================
// HELPER: Get pro quality boost string
// ===========================================
export function getProQualityBoost(): string {
  return Object.values(PRO_QUALITY_BOOST).join(", ");
}
