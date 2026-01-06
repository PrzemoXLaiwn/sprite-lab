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
      "STRICT 16-bit pixel art, blocky chunky pixels, each individual pixel clearly visible, hard pixel edges with NO anti-aliasing, limited 16-color palette only, old school retro SNES sprite, dithering for shading, NO smooth gradients, NO realistic rendering, pure pixelated game sprite",
    negativePrompt:
      "smooth, realistic, 3D render, anti-aliased, blurred edges, gradients, photorealistic, painted, too many colors, modern graphics, HD, detailed textures",
  },
  {
    id: "pixel-32",
    name: "Pixel Art 32-bit",
    description: "PS1/Saturn era style",
    promptSuffix:
      "STRICT 32-bit pixel art, visible pixel grid structure, blocky pixelated style, 32x32 or 64x64 pixel resolution, expanded color palette but still pixelated, retro PlayStation 1 sprite quality, hard pixel edges, NO anti-aliasing, each pixel deliberately placed",
    negativePrompt:
      "smooth, realistic, 3D render, anti-aliased, blurred, photorealistic, painted, modern HD graphics, soft edges, detailed textures",
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
      "cartoon style, bold thick outlines, exaggerated proportions and features, bright fun colors, playful and whimsical design, animated movie quality, smooth shapes, expressive and dynamic, family friendly aesthetic, professional animation style",
    negativePrompt:
      "pixel art, photorealistic, anime style, 3D render, realistic proportions, dark gritty, complex details, thin lines",
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
