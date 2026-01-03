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
      "16-bit pixel art, retro SNES era graphics, strictly limited palette of 16 colors maximum, each pixel clearly visible and deliberately placed, no anti-aliasing, no smooth gradients, use dithering technique for shading and color transitions, chunky blocky pixels, crisp hard pixel edges, nostalgic 1990s video game sprite aesthetic, low resolution pixelated artwork",
    negativePrompt:
      "smooth, blurry, gradient, anti-aliased, high resolution, photorealistic, 3D render, painterly, too many colors, soft edges",
  },
  {
    id: "pixel-32",
    name: "Pixel Art 32-bit",
    description: "PS1/Saturn era style",
    promptSuffix:
      "32-bit pixel art, PlayStation 1 and Sega Saturn era graphics, expanded color palette up to 256 colors, visible pixel grid structure, subtle dithering allowed, more detailed sprites while maintaining pixel art integrity, no anti-aliasing on edges, retro 32-bit console game aesthetic, each pixel intentionally placed",
    negativePrompt:
      "smooth gradients, blurry, anti-aliased, photorealistic, 3D render, painterly, modern HD graphics, soft airbrushed look",
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
