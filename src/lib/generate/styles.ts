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
    description: "Retro SNES/GBA style",
    promptSuffix:
      "16-bit pixel art sprite, visible square pixels, blocky pixelated style, retro video game graphics, low resolution sprite, 16x16 or 32x32 pixel grid, sharp pixel edges, no anti-aliasing, limited color palette, NES SNES GBA style, 2D game sprite, pixelated texture, each pixel clearly visible as square",
  },
  {
    id: "pixel-32",
    name: "Pixel Art 32-bit",
    description: "PS1/Saturn era style",
    promptSuffix:
      "32-bit pixel art sprite, visible square pixels, detailed pixelated style, retro PlayStation era graphics, medium resolution sprite, 64x64 or 128x128 pixel grid, sharp pixel edges, no anti-aliasing, richer color palette, 2D game sprite, pixelated texture, each pixel clearly visible",
  },
  {
    id: "painted",
    name: "Hand Painted",
    description: "Stylized painted look",
    promptSuffix:
      "hand painted style, stylized, soft edges, painterly texture, game art, digital painting, brushstroke texture",
  },
  {
    id: "vector",
    name: "Vector Flat",
    description: "Clean modern design",
    promptSuffix:
      "vector art style, flat design, clean lines, solid colors, mobile game aesthetic, minimalist, sharp edges",
  },
  {
    id: "anime",
    name: "Anime",
    description: "Japanese game style",
    promptSuffix:
      "anime style, manga aesthetic, JRPG art style, cel shaded, vibrant colors, clean lines, Japanese video game art",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    description: "Fun exaggerated style",
    promptSuffix:
      "cartoon style, bold outlines, exaggerated proportions, fun colorful, playful design, thick black outlines",
  },
  {
    id: "realistic",
    name: "Realistic",
    description: "Photo-realistic look",
    promptSuffix:
      "realistic style, detailed textures, photorealistic, high quality render, AAA game quality, lifelike",
  },
];

export function getStyleById(id: string): ArtStyle | undefined {
  return ART_STYLES.find((style) => style.id === id);
}
