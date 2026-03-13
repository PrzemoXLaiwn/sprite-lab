// ===========================================
// SPRITELAB - ART STYLES
// ===========================================

export interface ArtStyle {
  id: string;
  name: string;
  description: string;
  promptSuffix: string;
  negativePrompt?: string;
  preview?: string;
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: "pixel-16",
    name: "Pixel Art 16-bit",
    description: "Retro SNES/GBA style",
    promptSuffix:
      "STRICT 16-bit pixel art sprite, EXACTLY 64x64 pixels maximum, HARD CHUNKY SQUARE PIXELS clearly visible, ZERO anti-aliasing, ZERO smooth edges, retro NES SNES Game Boy graphics, blocky pixelated style, maximum 16 colors, classic 8-bit video game sprite, crisp pixel edges, NO gradients, NO blending",
    negativePrompt:
      "smooth, anti-aliased, realistic, photorealistic, 3D render, gradients, soft shading, blended colors, modern graphics, HD, high resolution, painted, vector art, clean edges, cel-shaded",
  },
  {
    id: "pixel-32",
    name: "Pixel Art 32-bit",
    description: "PS1/Saturn era style",
    promptSuffix:
      "STRICT 32-bit pixel art sprite, EXACTLY 128x128 pixels maximum, MASSIVE CHUNKY SQUARE PIXELS clearly visible, ZERO anti-aliasing, ZERO smooth edges, retro PlayStation SNES era graphics, heavily pixelated blocky style, limited color palette, arcade pixel sprite, crisp pixel boundaries, NO gradients, NO blending",
    negativePrompt:
      "smooth, anti-aliased, realistic, photorealistic, 3D render, gradients, soft shading, blended colors, modern graphics, HD, high resolution, painted, vector art, clean edges, cel-shaded",
  },
  {
    id: "painted",
    name: "Hand Painted",
    description: "Stylized painted look",
    promptSuffix:
      "hand painted digital art style, visible brush strokes and paint texture, rich color blending, artistic imperfections, traditional painting techniques applied digitally, oil painting or watercolor inspired, expressive and loose brushwork, artistic interpretation rather than photorealism",
    negativePrompt:
      "pixel art, photorealistic, 3D render, vector art, flat colors, sharp digital edges, mechanical precision, overly clean",
  },
  {
    id: "vector",
    name: "Vector Flat",
    description: "Clean modern design",
    promptSuffix:
      "vector art style, flat design with solid colors, clean geometric shapes, minimalist aesthetic, bold simple forms, mobile game and modern UI style, crisp edges, limited color palette with strategic accent colors, professional graphic design quality",
    negativePrompt:
      "pixel art, photorealistic, gradients, textures, 3D render, complex details, noise, grain, painterly, rough edges",
  },
  {
    id: "anime",
    name: "Anime",
    description: "Japanese game style",
    promptSuffix:
      "anime and manga art style, Japanese illustration aesthetic, cel shading technique, vibrant saturated colors, expressive character design, clean bold outlines, large expressive eyes if character, JRPG and visual novel inspired, dynamic poses, stylized proportions",
    negativePrompt:
      "pixel art, photorealistic, western cartoon style, 3D render, dull colors, realistic proportions, complex textures, painterly",
  },
  {
    id: "cartoon",
    name: "Cartoon",
    description: "Fun exaggerated style",
    promptSuffix:
      "SMOOTH cartoon illustration style, COMPLETELY non-pixelated, ZERO visible pixels, vector-like perfectly smooth shapes, bold black outlines, flat cel-shaded coloring, exaggerated proportions, animated movie aesthetic, Disney Pixar inspired style, bright saturated colors, playful design, perfectly smooth rounded edges, ANTI-ALIASED smooth curves",
    negativePrompt:
      "pixel art, pixelated, blocky, chunky pixels, square pixels, retro gaming, 8-bit, 16-bit, 32-bit, pixel grid, visible pixels, Game Boy graphics, NES graphics, SNES graphics, retro sprites, low resolution, jagged edges, grain, noise",
  },
  {
    id: "realistic",
    name: "Realistic",
    description: "Photo-realistic look",
    promptSuffix:
      "photorealistic style, highly detailed textures, realistic lighting and shadows, cinematic quality, AAA game graphics, physically accurate materials, professional 3D render quality, lifelike appearance, high fidelity details",
    negativePrompt:
      "pixel art, cartoon, anime, stylized, flat colors, low detail, abstract, minimalist, painterly brush strokes",
  },
];

export function getStyleById(id: string): ArtStyle | undefined {
  return ART_STYLES.find((style) => style.id === id);
}
