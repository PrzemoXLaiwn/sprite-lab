// ===========================================
// SPRITELAB CONFIG - 3D STYLES
// ===========================================
// All 3D art style configurations

import type { Style3DConfig, Model3DConfig } from "../types";

// ===========================================
// 3D STYLES
// ===========================================

export const STYLES_3D: Style3DConfig[] = [
  { id: "REALISTIC", name: "Realistic", emoji: "📷", description: "Photorealistic textures" },
  { id: "STYLIZED", name: "Stylized", emoji: "🎨", description: "Clean, game-ready look" },
  { id: "CARTOON", name: "Cartoon", emoji: "🎭", description: "Bold colors, simple shapes" },
  { id: "ANIME", name: "Anime", emoji: "🌸", description: "Japanese animation style" },
  { id: "LOW_POLY", name: "Low Poly", emoji: "💎", description: "Minimalist, geometric" },
  { id: "HAND_PAINTED", name: "Hand Painted", emoji: "🖌️", description: "Painterly textures" },
];

// ===========================================
// 3D MODELS
// ===========================================

export const MODELS_3D: Model3DConfig[] = [
  {
    id: "rodin",
    name: "Rodin Gen-2",
    description: "Reliable & Online - High quality PBR materials",
    speed: "⚡⚡",
    quality: "⭐⭐⭐⭐⭐",
    credits: 4,
    time: "30-60s",
    formats: ["GLB"],
    recommended: true,
    online: true,
  },
  {
    id: "trellis",
    name: "TRELLIS",
    description: "Best quality - High detail textures (may be offline)",
    speed: "⚡⚡",
    quality: "⭐⭐⭐⭐⭐",
    credits: 5,
    time: "30-60s",
    formats: ["GLB"],
    online: false,
  },
  {
    id: "hunyuan3d",
    name: "Hunyuan3D-2",
    description: "Fast by Tencent (may be offline)",
    speed: "⚡⚡⚡",
    quality: "⭐⭐⭐⭐",
    credits: 4,
    time: "20-40s",
    formats: ["GLB", "OBJ"],
    online: false,
  },
  {
    id: "wonder3d",
    name: "Wonder3D",
    description: "Detailed multi-view (may be offline)",
    speed: "⚡⚡",
    quality: "⭐⭐⭐⭐",
    credits: 4,
    time: "40-80s",
    formats: ["OBJ", "GLB"],
    online: false,
  },
];

// ===========================================
// STYLE IDS
// ===========================================

export const STYLE_3D_IDS = STYLES_3D.map((s) => s.id);

// ===========================================
// DEFAULT 3D STYLE & MODEL
// ===========================================

export const DEFAULT_STYLE_3D = "STYLIZED";
export const DEFAULT_MODEL_3D = "rodin";
