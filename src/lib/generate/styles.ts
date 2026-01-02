// ===========================================
// SPRITELAB - ART STYLES
// ===========================================

export interface ArtStyle {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  preview?: string;
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: "pixel-16",
    name: "Pixel Art 16-bit",
    description: "Retro SNES style",
    promptSuffix:
      "pixel art, 16-bit style, limited color palette, crisp pixels, retro game aesthetic, clean pixel edges",
  },
  {
    id: "pixel-32",
    name: "Pixel Art HD",
    description: "Modern pixel art",
    promptSuffix:
      "pixel art, 32-bit style, detailed pixels, vibrant colors, modern retro, high detail pixel art",
  },
  {
    id: "painted",
    name: "Hand Painted",
    description: "Stylized painted look",
    promptSuffix:
      "hand painted style, stylized, soft edges, painterly texture, game art, digital painting",
  },
  {
    id: "vector",
    name: "Vector Flat",
    description: "Clean modern design",
    promptSuffix:
      "vector art style, flat design, clean lines, solid colors, mobile game aesthetic, minimalist",
  },
  {
    id: "anime",
    name: "Anime",
    description: "Japanese game style",
    promptSuffix:
      "anime style, manga aesthetic, JRPG art style, cel shaded, vibrant colors, clean lines",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    description: "Fun exaggerated style",
    promptSuffix:
      "cartoon style, bold outlines, exaggerated proportions, fun colorful, playful design",
  },
  {
    id: "realistic",
    name: "Realistic",
    description: "Photo-realistic look",
    promptSuffix:
      "realistic style, detailed textures, photorealistic, high quality render, AAA game quality",
  },
];

export function getStyleById(id: string): ArtStyle | undefined {
  return ART_STYLES.find((style) => style.id === id);
}
