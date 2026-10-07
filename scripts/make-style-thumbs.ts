/**
 * Generates the style-picker thumbnails in /public/styles with the production
 * sprite pipeline (standard model + postprocess), so the picker shows exactly
 * what each style produces.
 *
 *   npx tsx --env-file=.env.local scripts/make-style-thumbs.ts [STYLE_ID ...]
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import sharp from "sharp";
import { generateSpriteImage } from "../src/lib/runware";
import { postprocessSprite } from "../src/lib/image/sprite-postprocess";
import { buildSpritePrompt, isPixelStyle } from "../src/config/prompts/sprite-prompt";
import { GENERATE_STYLES } from "../src/data/generate-styles";

const OUT = join(process.cwd(), "public", "styles");
const only = process.argv.slice(2);

async function main() {
  mkdirSync(OUT, { recursive: true });
  for (const style of GENERATE_STYLES) {
    if (only.length && !only.includes(style.id)) continue;
    const iso = style.id.startsWith("ISOMETRIC");
    const prompt = buildSpritePrompt({
      subject: iso ? "a small medieval house with a red roof" : "a knight with a sword and shield",
      styleId: style.id,
      categoryId: iso ? "ENVIRONMENT" : "CHARACTERS",
    });
    const g = await generateSpriteImage({ prompt, model: "standard", seed: 1234 });
    const pixel = isPixelStyle(style.id);
    const out = await postprocessSprite(g.image, { pixelGrid: pixel ? 128 : undefined, paletteSize: 32 });
    const file = join(OUT, `${style.id.toLowerCase()}.png`);
    if (pixel && out.nativePng) writeFileSync(file, out.nativePng);
    else await sharp(out.png).resize(256, 256).png({ compressionLevel: 9 }).toFile(file);
    console.log(style.id, "→", file);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
