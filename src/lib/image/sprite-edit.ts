// =============================================================================
// Sprite editing — describe a change, optionally paint where it goes
// =============================================================================
// The image-edit model (Nano Banana) sees the sprite and redraws it with the
// requested change, keeping pose, style and colours. When the user painted a
// mask, everything outside it is restored from the original pixel for pixel —
// a true local edit: the rest of the sprite cannot drift. The result then runs
// through the normal sprite post-processing (transparent background, same
// pixel grid as the original).
// =============================================================================

import sharp from "sharp";
import { generateAnimationGrid } from "@/lib/runware";
import { postprocessSprite, pixelCanvasOf } from "./sprite-postprocess";

/** Instruction edit on the image-edit model (~$0.07). */
export const EDIT_CREDITS = 4;

const SIZE = 1024;

export interface EditResult {
  png: Buffer;
  cost: number;
}

export async function editSprite(opts: {
  /** The stored sprite (transparent PNG). */
  sprite: Buffer;
  instruction: string;
  pixel: boolean;
  /** Optional mask (PNG, any size): painted (opaque/white) = may change. */
  mask?: Buffer;
}): Promise<EditResult> {
  // Same framing for the model input and the mask: the sprite on white, square
  const flat = await sharp(opts.sprite)
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 1 }, kernel: opts.pixel ? "nearest" : "lanczos3" })
    .flatten({ background: "#ffffff" })
    .png()
    .toBuffer();

  const prompt = [
    `Edit this 2D game sprite: ${opts.instruction.slice(0, 400)}.`,
    opts.mask ? "Only change the part of the sprite that the instruction is about; everything else stays exactly as it is." : "",
    "Keep everything else exactly the same: the same character or object, pose, size, position, proportions, outline, colours and art style" + (opts.pixel ? ", and the same pixel size (crisp pixel art)." : "."),
    "Plain flat solid pure white background. No text, no shadow, no ground.",
  ].filter(Boolean).join("\n");

  const edited = await generateAnimationGrid({ prompt, reference: flat, size: SIZE });
  let out = await sharp(edited.image).resize(SIZE, SIZE, { fit: "fill" }).flatten({ background: "#ffffff" }).png().toBuffer();

  if (opts.mask) {
    // Soft-edged mask so the seam blends; outside it the original wins
    const m = await sharp(opts.mask)
      .resize(SIZE, SIZE, { fit: "fill" })
      .ensureAlpha()
      .extractChannel(3)
      .blur(opts.pixel ? 1.5 : 4)
      .raw()
      .toBuffer();
    const [a, b] = await Promise.all([
      sharp(flat).removeAlpha().raw().toBuffer(),
      sharp(out).removeAlpha().raw().toBuffer(),
    ]);
    const mixed = Buffer.alloc(a.length);
    for (let p = 0; p < SIZE * SIZE; p++) {
      const t = m[p] / 255;
      for (let c = 0; c < 3; c++) mixed[p * 3 + c] = Math.round(a[p * 3 + c] * (1 - t) + b[p * 3 + c] * t);
    }
    out = await sharp(mixed, { raw: { width: SIZE, height: SIZE, channels: 3 } }).png().toBuffer();
  }

  // Back to a clean sprite on the original's pixel grid
  const grid = opts.pixel ? (await pixelCanvasOf(opts.sprite)) ?? 128 : undefined;
  const processed = await postprocessSprite(out, opts.pixel ? { pixelGrid: Math.max(24, grid ?? 128), paletteSize: 32 } : {});
  return { png: processed.png, cost: edited.cost };
}
