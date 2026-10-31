// Credits for sprites and the image tools (remove background, AI upscale,
// variations, style match, brush edit).
// One source for the routes and the economics report (src/config/economics.ts).

/** A sprite by quality preset: Standard (FLUX.2 klein) and HD (GPT Image Mini). */
export const SPRITE_CREDIT_COSTS = { draft: 1, normal: 1, hd: 3 } as const;

export const REMOVE_BG_CREDITS = 1;

/** AI upscale credits by effective output scale (pixel-perfect upscaling is free). */
export function upscaleCredits(scale: number): number {
  return scale >= 4 ? 2 : 1;
}

/** Per delivered variation. */
export const VARIATION_CREDITS = 3;

/** A sprite drawn in the style of a reference sprite (image-edit model). */
export const STYLE_MATCH_CREDITS = 5;

/** Brush / describe edit of a sprite (image-edit model). */
export const EDIT_CREDITS = 5;
