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
      "STRICT 16-bit pixel art style, MAXIMUM 16x16 or 32x32 pixel resolution, chunky blocky pixels, each individual pixel clearly visible and countable, hard jagged pixel edges, ZERO anti-aliasing, limited 16-color palette maximum, SNES-era sprite quality, visible dithering for shading, retro 1990s video game sprite",
    negativePrompt:
      "smooth, realistic, 3D render, anti-aliased, blurred edges, gradients, photorealistic, painted, too many colors, modern graphics, HD, detailed textures, 32-bit style, high resolution",
  },
  {
    id: "pixel-32",
    name: "Pixel Art 32-bit",
    description: "PS1/Saturn era style",
    promptSuffix:
      "32-bit pixel art style, 32x32 to 64x64 pixel resolution, MORE detailed than 16-bit but still pixelated, expanded color palette up to 256 colors, Super Nintendo late-era or early PlayStation quality, visible pixel structure but smoother than 16-bit, retro gaming sprite with enhanced detail",
    negativePrompt:
      "16-bit style, too chunky pixels, overly limited colors, smooth realistic rendering, 3D, anti-aliased, modern HD graphics, photorealistic",
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
      "cartoon illustration style, NEVER pixel art, smooth vector-like shapes, bold black outlines, flat cel-shaded coloring, exaggerated proportions, animated movie aesthetic, Disney Pixar inspired, completely non-pixelated, bright fun colors, playful design",
    negativePrompt:
      "pixel art, pixelated, blocky, retro gaming, 8-bit, 16-bit, grain, noise, realistic textures, photography, photorealistic",
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
