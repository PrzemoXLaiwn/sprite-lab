/**
 * Script to generate example sprites for landing page
 * Run with: npx tsx scripts/generate-examples.ts
 */

import Replicate from "replicate";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

// Load .env.local
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Examples to generate - variety of styles and categories
const EXAMPLES_TO_GENERATE = [
  // Weapons
  {
    filename: "sword-pixel.png",
    prompt: "golden sword with ruby gems embedded in hilt",
    style: "pixel art",
    category: "Weapons",
    is3D: false,
  },
  {
    filename: "staff-dark.png",
    prompt: "ice staff with glowing crystal orb on top",
    style: "dark fantasy",
    category: "Weapons",
    is3D: false,
  },
  {
    filename: "axe-pixel.png",
    prompt: "battle axe with ornate engravings",
    style: "pixel art",
    category: "Weapons",
    is3D: false,
  },
  // Consumables
  {
    filename: "potion-anime.png",
    prompt: "health potion bottle with red liquid",
    style: "anime",
    category: "Consumables",
    is3D: false,
  },
  {
    filename: "scroll-painted.png",
    prompt: "ancient magic scroll with glowing runes",
    style: "hand painted",
    category: "Items",
    is3D: false,
  },
  // Armor
  {
    filename: "helmet-painted.png",
    prompt: "knight helmet with golden visor",
    style: "hand painted",
    category: "Armor",
    is3D: false,
  },
  {
    filename: "shield-realistic.png",
    prompt: "medieval shield with dragon crest emblem",
    style: "realistic",
    category: "Armor",
    is3D: true,
  },
  // Creatures
  {
    filename: "dragon-chibi.png",
    prompt: "cute baby dragon breathing small flame",
    style: "chibi cute",
    category: "Creatures",
    is3D: false,
  },
  {
    filename: "slime-cartoon.png",
    prompt: "cute slime monster with big happy eyes",
    style: "cartoon",
    category: "Creatures",
    is3D: false,
  },
  // Characters
  {
    filename: "mage-anime.png",
    prompt: "wizard mage character casting spell with staff",
    style: "anime",
    category: "Characters",
    is3D: false,
  },
  {
    filename: "knight-pixel.png",
    prompt: "brave knight in shining armor with sword",
    style: "pixel art",
    category: "Characters",
    is3D: false,
  },
  // Items
  {
    filename: "chest-iso.png",
    prompt: "treasure chest overflowing with gold coins",
    style: "isometric",
    category: "Items",
    is3D: false,
  },
  {
    filename: "gem-vector.png",
    prompt: "glowing blue sapphire gem crystal",
    style: "vector",
    category: "Resources",
    is3D: false,
  },
  {
    filename: "key-pixel.png",
    prompt: "golden ornate key with skull design",
    style: "pixel art",
    category: "Items",
    is3D: false,
  },
];

// Style prompts
const STYLE_PROMPTS: Record<string, { positive: string; negative: string }> = {
  "pixel art": {
    positive: "pixel art style, 16-bit, retro game sprite, clean edges, limited color palette, crisp pixels, game asset",
    negative: "blurry, realistic, 3D render, photograph, noisy, gradient, anti-aliased, smooth",
  },
  "dark fantasy": {
    positive: "dark fantasy art style, dramatic lighting, detailed, mystical atmosphere, game art, professional illustration",
    negative: "bright colors, cartoon, chibi, blurry, pixelated, low quality",
  },
  "anime": {
    positive: "anime art style, vibrant colors, clean lines, manga style, expressive, game character art",
    negative: "realistic, western cartoon, blurry, sketch, rough",
  },
  "hand painted": {
    positive: "hand painted style, digital painting, rich colors, artistic brushstrokes, fantasy game art",
    negative: "photo, 3D render, pixel art, flat colors, vector",
  },
  "chibi cute": {
    positive: "chibi style, cute, kawaii, big head small body, adorable, pastel colors, game mascot",
    negative: "realistic, scary, detailed, mature, dark",
  },
  "cartoon": {
    positive: "cartoon style, bold outlines, vibrant colors, fun, playful, game asset, clean design",
    negative: "realistic, photograph, blurry, noisy, complex background",
  },
  "isometric": {
    positive: "isometric view, 2.5D perspective, game asset, clean design, isometric game art style",
    negative: "front view, side view, realistic, blurry, 3D render",
  },
  "vector": {
    positive: "vector art style, flat design, clean shapes, bold colors, modern game icon style",
    negative: "gradient, realistic, 3D, textured, photograph",
  },
  "realistic": {
    positive: "realistic digital art, detailed, high quality, fantasy realism, game concept art",
    negative: "cartoon, anime, pixel art, chibi, flat colors",
  },
};

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    const protocol = url.startsWith("https") ? https : http;

    protocol.get(url, (response) => {
      // Handle redirects
      if (response.statusCode === 301 || response.statusCode === 302) {
        const redirectUrl = response.headers.location;
        if (redirectUrl) {
          downloadImage(redirectUrl, filepath).then(resolve).catch(reject);
          return;
        }
      }

      response.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve();
      });
    }).on("error", (err) => {
      fs.unlink(filepath, () => {}); // Delete partial file
      reject(err);
    });
  });
}

async function generateSprite(example: typeof EXAMPLES_TO_GENERATE[0]): Promise<string | null> {
  const styleConfig = STYLE_PROMPTS[example.style] || STYLE_PROMPTS["pixel art"];

  const finalPrompt = `${styleConfig.positive}, ${example.prompt}, single object centered on transparent background, game sprite, high quality, no background, isolated object`;

  console.log(`\n🎨 Generating: ${example.filename}`);
  console.log(`   Prompt: "${example.prompt}"`);
  console.log(`   Style: ${example.style}`);

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-schnell" as `${string}/${string}`,
      {
        input: {
          prompt: finalPrompt,
          num_outputs: 1,
          aspect_ratio: "1:1",
          output_format: "png",
          output_quality: 100,
        },
      }
    );

    // Extract URL from output
    let imageUrl: string | null = null;

    if (Array.isArray(output) && output.length > 0) {
      const first = output[0];
      if (typeof first === "string") {
        imageUrl = first;
      } else if (first && typeof first === "object") {
        const obj = first as Record<string, unknown>;
        if (typeof obj.url === "function") {
          try {
            imageUrl = (obj.url as () => URL)().toString();
          } catch {
            // ignore
          }
        }
        if (!imageUrl && typeof obj.url === "string") imageUrl = obj.url;
      }
    }

    if (imageUrl) {
      console.log(`   ✅ Generated successfully!`);
      return imageUrl;
    }

    console.log(`   ❌ No image URL in output`);
    return null;
  } catch (error) {
    console.error(`   ❌ Error:`, error);
    return null;
  }
}

async function main() {
  console.log("═".repeat(60));
  console.log("🎮 SpriteLab Example Generator");
  console.log("═".repeat(60));

  // Create examples directory if it doesn't exist
  const examplesDir = path.join(process.cwd(), "public", "examples");
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
    console.log(`📁 Created directory: ${examplesDir}`);
  }

  const results: { filename: string; success: boolean }[] = [];

  for (const example of EXAMPLES_TO_GENERATE) {
    const filepath = path.join(examplesDir, example.filename);

    // Skip if file already exists
    if (fs.existsSync(filepath)) {
      console.log(`\n⏭️  Skipping ${example.filename} (already exists)`);
      results.push({ filename: example.filename, success: true });
      continue;
    }

    const imageUrl = await generateSprite(example);

    if (imageUrl) {
      try {
        console.log(`   📥 Downloading to ${example.filename}...`);
        await downloadImage(imageUrl, filepath);
        console.log(`   ✅ Saved!`);
        results.push({ filename: example.filename, success: true });
      } catch (err) {
        console.error(`   ❌ Download failed:`, err);
        results.push({ filename: example.filename, success: false });
      }
    } else {
      results.push({ filename: example.filename, success: false });
    }

    // Small delay between generations to avoid rate limiting
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("📊 GENERATION SUMMARY");
  console.log("═".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    console.log("\nFailed files:");
    results.filter((r) => !r.success).forEach((r) => console.log(`   - ${r.filename}`));
  }

  console.log("\n🎉 Done! Check public/examples folder.");
}

main().catch(console.error);
