// ===========================================
// SPRITELAB CONFIG - 2D STYLES (PRO v4.0)
// ===========================================
// FLUX-OPTIMIZED UPDATE:
// - ALL models now use FLUX (Runware backend)
// - FLUX optimal guidance: 2.0-4.0 (NOT 7-9 like SDXL!)
// - FLUX optimal steps: 20-28 for flux-dev, 4-8 for flux-schnell
// - Prompts optimized for FLUX's natural language understanding
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
  // PIXEL ART STYLES - SIMPLE PROMPTS WORK BEST!
  // Based on research: https://civitai.com/models/277680
  // Key: SHORT prompts, "pixel art" FIRST, NO "detailed/4K/HD"
  // ===========================================
  PIXEL_ART_16: {
    id: "PIXEL_ART_16",
    name: "Pixel Art 16-bit",
    emoji: "🎮",
    description: "Classic retro style",
    // 🔥 STRONG pixel art enforcement - must show visible pixels!
    styleCore: "pixel art sprite, 16x16 pixel grid, visible square pixels, pixelated retro game sprite, 16-bit SNES style",
    rendering: "visible blocky square pixels, pixel grid pattern, no anti-aliasing, hard pixel edges, dithering shading",
    colors: "limited 16 color palette, retro game colors, indexed colors",
    edges: "hard aliased pixel edges, blocky jagged edges, stair-step diagonals, no smoothing",
    styleEnforcement: "MUST look like actual pixel art with visible individual pixels, like SNES or GBA games, NOT smooth digital art",
    styleMandatory: "pixel art sprite with visible pixels, pixelated, 16 bit, no anti-aliasing, blocky",
    // 🔥 AGGRESSIVE negatives - block ALL smooth/realistic rendering!
    negatives: "smooth, anti-aliasing, realistic, 3D render, photograph, photorealistic, soft edges, blended colors, smooth shading, airbrushed, painted, high resolution, 4K, 8K, HD, hyperrealistic, smooth textures, soft gradients, detailed, ultra detailed, fine details, smooth lines, vector art, clean edges, polished, soft, gradient",
    // Model settings - optimized for pixel art
    model: "flux-dev",
    guidance: 3.0,   // Slightly higher for style enforcement
    steps: 25,       // More steps for cleaner pixels
  },

  PIXEL_ART_32: {
    id: "PIXEL_ART_32",
    name: "Pixel Art HD",
    emoji: "👾",
    description: "Modern pixel art",
    // 🔥 STRONG pixel art enforcement
    styleCore: "pixel art sprite, 32x32 pixel grid, visible pixels, pixelated indie game sprite, Celeste Dead Cells style",
    rendering: "visible pixels, pixel clusters, crisp pixel edges, no anti-aliasing, clean pixel boundaries",
    colors: "limited 32 color palette, vibrant pixel art colors, indexed palette",
    edges: "clean hard pixel edges, pixelated curves with visible steps, no smoothing",
    styleEnforcement: "MUST look like modern indie pixel art with visible pixels, like Celeste or Shovel Knight",
    styleMandatory: "pixel art sprite with visible pixels, pixelated, 32 bit, no anti-aliasing",
    negatives: "smooth, anti-aliasing, realistic, 3D render, photorealistic, soft edges, blended colors, smooth shading, airbrushed, painted, high resolution, 4K, HD, soft gradients, vector art, clean smooth edges, polished, gradient",
    model: "flux-dev",
    guidance: 3.0,
    steps: 25,
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
    // Model settings - FLUX OPTIMIZED
    model: "flux-dev",
    guidance: 3.5,      // ✅ FLUX optimal: 2-4 range
    steps: 28,          // ✅ FLUX optimal: 20-28 range
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
    // Model settings - FLUX OPTIMIZED
    model: "flux-dev",
    guidance: 3.0,      // ✅ FLUX optimal: 2-4 range
    steps: 25,          // ✅ FLUX optimal: 20-28 range
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
    // Model settings - FLUX OPTIMIZED
    model: "flux-dev",
    guidance: 3.0,      // ✅ FLUX optimal: 2-4 range
    steps: 25,          // ✅ FLUX optimal: 20-28 range
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
    // Model settings - FLUX OPTIMIZED
    model: "flux-dev",
    guidance: 3.5,      // ✅ FLUX optimal: 2-4 range (slightly higher for detail)
    steps: 28,          // ✅ FLUX optimal: 20-28 range (max for quality)
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
    // Model settings - FLUX OPTIMIZED (higher guidance for strict angle)
    model: "flux-dev",
    guidance: 4.0,      // ✅ FLUX optimal: top of 2-4 range for strict control
    steps: 28,          // ✅ FLUX optimal: max steps for geometric precision
  },

  ISOMETRIC_PIXEL: {
    id: "ISOMETRIC_PIXEL",
    name: "Isometric Pixel",
    emoji: "🎮",
    description: "Pixel art isometric",
    // 🔥 STRONG pixel art + isometric enforcement
    styleCore: "isometric pixel art sprite, visible pixels, 16-bit RTS style like StarCraft Age of Empires, pixel grid isometric view, 26.57 degree angle",
    rendering: "visible blocky pixels, pixel perfect isometric angles, dithering shading, no anti-aliasing, hard pixel edges",
    colors: "limited 16-32 indexed color palette, retro game colors, pixel color ramps",
    edges: "hard pixel edges, no anti-aliasing, stair-step isometric lines, blocky pixel boundaries",
    styleEnforcement: "MUST be pixel art with VISIBLE PIXELS in isometric view, like classic RTS games, NOT smooth 3D",
    styleMandatory: "pixel art sprite with visible pixels, isometric angle, no anti-aliasing, blocky pixels",
    negatives: "smooth, anti-aliasing, 3D render, perspective view, realistic, painterly, soft edges, blurry, smooth curves, modern HD, gradient, polished, clean edges",
    model: "flux-dev",
    guidance: 3.5,
    steps: 28,
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
    // Model settings - FLUX OPTIMIZED
    model: "flux-dev",
    guidance: 3.5,      // ✅ FLUX optimal: 2-4 range
    steps: 28,          // ✅ FLUX optimal: 20-28 range
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
    // Model settings - FLUX OPTIMIZED (higher for realistic detail)
    model: "flux-dev",
    guidance: 3.5,      // ✅ FLUX optimal: 2-4 range
    steps: 28,          // ✅ FLUX optimal: max for quality
  },
};

// ===========================================
// STYLE PREVIEWS (for UI hover tooltips)
// ===========================================

const STYLE_PREVIEWS: Record<string, { colors: string[]; bestFor: string[]; example: string }> = {
  PIXEL_ART_16: {
    colors: ["#4a90a4", "#8b4789", "#d4a574", "#5c8a4e"],
    bestFor: ["Retro games", "Platformers", "RPGs"],
    example: "16-bit SNES/Genesis era sprites with visible pixels",
  },
  PIXEL_ART_32: {
    colors: ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b"],
    bestFor: ["Indie games", "Action games", "Roguelikes"],
    example: "HD pixel art like Celeste or Dead Cells",
  },
  HAND_PAINTED: {
    colors: ["#1e3a5f", "#4a7c59", "#d4a574", "#8b6914"],
    bestFor: ["Metroidvanias", "Adventure", "Fantasy"],
    example: "Painterly style like Hollow Knight or Ori",
  },
  VECTOR_CLEAN: {
    colors: ["#00d4ff", "#00ff88", "#ff6b6b", "#feca57"],
    bestFor: ["Mobile games", "Casual", "Puzzle"],
    example: "Clean flat design like Angry Birds",
  },
  ANIME_GAME: {
    colors: ["#ff6b9d", "#c084fc", "#67e8f9", "#fbbf24"],
    bestFor: ["JRPGs", "Gacha", "Visual novels"],
    example: "Anime style like Genshin Impact",
  },
  CHIBI_CUTE: {
    colors: ["#fda4af", "#c4b5fd", "#99f6e4", "#fde68a"],
    bestFor: ["Pet games", "Kids games", "Idle games"],
    example: "Super cute kawaii mascots",
  },
  CARTOON_WESTERN: {
    colors: ["#f97316", "#facc15", "#84cc16", "#06b6d4"],
    bestFor: ["Platformers", "Run & gun", "Beat 'em up"],
    example: "Bold cartoon style like Cuphead",
  },
  DARK_SOULS: {
    colors: ["#1f1f1f", "#4a4a4a", "#8b4513", "#2d3436"],
    bestFor: ["Souls-like", "Horror", "Dark fantasy"],
    example: "Gritty style like Dark Souls/Elden Ring",
  },
  ISOMETRIC: {
    colors: ["#00bcd4", "#4caf50", "#ff9800", "#9c27b0"],
    bestFor: ["City builders", "Strategy", "Simulation"],
    example: "2.5D isometric like Clash of Clans",
  },
  ISOMETRIC_PIXEL: {
    colors: ["#607d8b", "#795548", "#9e9e9e", "#3f51b5"],
    bestFor: ["RTS games", "Classic strategy", "Tycoons"],
    example: "Pixel iso like StarCraft or Age of Empires",
  },
  ISOMETRIC_CARTOON: {
    colors: ["#e91e63", "#8bc34a", "#03a9f4", "#ffeb3b"],
    bestFor: ["Farm games", "Casual", "City builders"],
    example: "Cute iso like Hay Day or SimCity BuildIt",
  },
  REALISTIC_PAINTED: {
    colors: ["#2c3e50", "#c0392b", "#16a085", "#8e44ad"],
    bestFor: ["AAA games", "Concept art", "Card games"],
    example: "Pro quality like LoL or WoW splash art",
  },
};

// ===========================================
// UI STYLES (Frontend - with preview data)
// ===========================================

export const STYLES_2D_UI: StyleUI[] = Object.values(STYLES_2D_FULL).map((style) => ({
  id: style.id,
  name: style.name,
  emoji: style.emoji,
  description: style.description,
  preview: STYLE_PREVIEWS[style.id],
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
