import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getCategoryById, getSubcategoryById } from "@/lib/categories";
import { getOrCreateUser, getUserCredits, deductCredit, saveGeneration } from "@/lib/database";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Allow overriding the Trellis slug/version when the default model is unavailable
const TRELLIS_MODEL_SLUG = (process.env.REPLICATE_TRELLIS_MODEL || "firtoz/trellis").trim();
const TRELLIS_MODEL_VERSION = process.env.REPLICATE_TRELLIS_VERSION?.trim();
const trellisModelIdentifier =
  TRELLIS_MODEL_VERSION && !TRELLIS_MODEL_SLUG.includes(":")
    ? `${TRELLIS_MODEL_SLUG}:${TRELLIS_MODEL_VERSION}`
    : TRELLIS_MODEL_SLUG;

// ===========================================
// ENHANCED PROMPT SYSTEM FOR 3D GENERATION
// ===========================================

interface PromptTemplate {
  prefix: string;           // Style and rendering instructions
  categoryContext: string;  // What type of object this is
  materialHints: string;    // Surface and material details
  composition: string;      // How it should be positioned
  lighting: string;         // Lighting setup
  qualityTags: string;      // Quality boosters
}

// ===========================================
// CATEGORY-SPECIFIC DETAILED PROMPTS
// ===========================================
const CATEGORY_PROMPTS: Record<string, PromptTemplate> = {
  WEAPONS: {
    prefix: "professional 3D render, game asset, weapon design concept art",
    categoryContext: "combat weapon, battle-ready equipment, fantasy RPG item",
    materialHints: "detailed metal textures, worn leather grip, intricate engravings, realistic material properties, PBR textures",
    composition: "single isolated weapon, perfectly centered, front-facing orthographic view, floating on pure white void",
    lighting: "soft studio lighting, subtle rim light, no harsh shadows, even illumination",
    qualityTags: "8K ultra detailed, photorealistic rendering, sharp edges, clean silhouette, game-ready asset, AAA quality"
  },
  ARMOR: {
    prefix: "professional 3D render, game asset, armor design concept art",
    categoryContext: "protective gear, fantasy armor piece, medieval equipment, RPG wearable",
    materialHints: "polished metal plates, chainmail details, leather straps, fabric padding, battle damage marks, PBR materials",
    composition: "single isolated armor piece, perfectly centered, front view display, floating on pure white background",
    lighting: "dramatic studio lighting, metallic reflections, subtle ambient occlusion",
    qualityTags: "8K ultra detailed, realistic metal shader, intricate details, game-ready model, professional quality"
  },
  CONSUMABLES: {
    prefix: "professional 3D render, game item, consumable design",
    categoryContext: "usable game item, potion bottle, food item, magical consumable, RPG pickup",
    materialHints: "glass transparency, liquid effects, cork textures, label details, glowing magical effects",
    composition: "single isolated item, perfectly centered, product photography style, floating on white void",
    lighting: "soft diffused lighting, subtle glow effects for magical items, clean shadows",
    qualityTags: "8K detailed, realistic glass shader, appetizing appearance, collectible quality, polished finish"
  },
  RESOURCES: {
    prefix: "professional 3D render, game resource, crafting material",
    categoryContext: "raw material, crafting component, gatherable resource, inventory item",
    materialHints: "natural textures, ore veins, wood grain, crystal facets, organic surfaces, realistic material response",
    composition: "single isolated resource, centered composition, slightly angled for depth, white background",
    lighting: "natural lighting simulation, subsurface scattering for organics, specular highlights for minerals",
    qualityTags: "8K detailed, realistic textures, tactile quality, game-ready, satisfying to collect"
  },
  QUEST_ITEMS: {
    prefix: "professional 3D render, magical artifact, quest item design",
    categoryContext: "unique story item, ancient artifact, magical object, legendary relic, plot-important item",
    materialHints: "mysterious glowing runes, ancient patina, magical aura, ornate decorations, precious materials",
    composition: "single isolated artifact, perfectly centered, dramatic presentation, floating on white void",
    lighting: "dramatic lighting with magical glow, ethereal rim light, mystical atmosphere",
    qualityTags: "8K ultra detailed, epic quality, mysterious aura, legendary appearance, museum-worthy presentation"
  },
  CHARACTERS: {
    prefix: "professional 3D character render, game character design, figurine style",
    categoryContext: "game character, playable hero, NPC design, fantasy creature humanoid",
    materialHints: "detailed skin texture, fabric folds, armor pieces, hair strands, expressive face, equipment details",
    composition: "full body T-pose or heroic stance, perfectly centered, front view, clean white background",
    lighting: "three-point character lighting, flattering shadows, clear silhouette, readable details",
    qualityTags: "8K detailed, AAA character quality, memorable design, clear personality, game-ready topology"
  },
  CREATURES: {
    prefix: "professional 3D creature render, monster design, game enemy concept",
    categoryContext: "fantasy creature, game monster, mythical beast, enemy design, boss creature",
    materialHints: "realistic scales, fur texture, bone protrusions, glowing eyes, organic anatomy, threatening features",
    composition: "single creature, aggressive or neutral pose, perfectly centered, white background isolation",
    lighting: "dramatic creature lighting, menacing shadows, eye glow effects, clear form reading",
    qualityTags: "8K detailed, terrifying design, memorable silhouette, AAA monster quality, anatomically interesting"
  },
  ENVIRONMENT: {
    prefix: "professional 3D prop render, environment asset, game prop design",
    categoryContext: "world prop, environmental object, decorative item, interactive object, scene element",
    materialHints: "weathered surfaces, realistic wear, appropriate material response, environmental storytelling",
    composition: "single isolated prop, perfectly centered, slight angle for interest, white background",
    lighting: "neutral environment lighting, soft shadows, clear material reading",
    qualityTags: "8K detailed, world-building quality, believable wear, game-ready asset, modular design"
  },
  TILESETS: {
    prefix: "professional 3D tile render, seamless tileset piece, modular game asset",
    categoryContext: "floor tile, wall segment, modular piece, tileable element, level building block",
    materialHints: "seamless edges, tileable textures, consistent lighting bake, modular connection points",
    composition: "single tile piece, perfectly orthographic, exact center alignment, white background",
    lighting: "neutral flat lighting for tiling, no directional shadows, ambient only",
    qualityTags: "perfectly seamless, modular ready, consistent scale, level-design friendly, optimized geometry"
  },
  UI_ELEMENTS: {
    prefix: "professional 3D UI element, game interface icon, stylized game UI",
    categoryContext: "interface element, game icon, button design, HUD element, menu graphic",
    materialHints: "clean edges, readable at small sizes, iconic design, clear symbolism, stylized materials",
    composition: "single UI element, perfectly centered, flat orthographic view, transparent or white background",
    lighting: "flat UI lighting, no perspective distortion, clear silhouette",
    qualityTags: "crystal clear, instantly readable, iconic design, scalable, consistent style"
  },
  EFFECTS: {
    prefix: "3D visual effect, particle system reference, VFX element",
    categoryContext: "spell effect, magical aura, elemental effect, impact visual, ability effect",
    materialHints: "glowing energy, transparent layers, particle trails, color gradients, ethereal quality",
    composition: "isolated effect, centered composition, alpha-friendly background, clear boundaries",
    lighting: "self-illuminated, additive blending ready, no external shadows",
    qualityTags: "vibrant colors, clear effect reading, impactful visual, performance-friendly concept"
  },
  PROJECTILES: {
    prefix: "professional 3D projectile render, ammunition design, thrown object",
    categoryContext: "projectile object, ammunition, thrown weapon, magical missile, ranged attack",
    materialHints: "aerodynamic design, motion-ready appearance, glowing trails for magical, sharp points",
    composition: "single projectile, horizontal orientation, centered, motion-implying angle, white background",
    lighting: "dramatic speed lighting, motion blur suggestion, glowing tips for magical",
    qualityTags: "dynamic design, clear direction, impactful appearance, satisfying to see in motion"
  }
};

// ===========================================
// SUBCATEGORY-SPECIFIC ENHANCEMENTS
// ===========================================
const SUBCATEGORY_PROMPTS: Record<string, Record<string, string>> = {
  WEAPONS: {
    // Swords & Blades
    SWORDS: "longsword design, balanced blade, crossguard details, wrapped handle, pommel design, double-edged blade",
    DAGGERS: "short blade dagger, quick weapon, concealed carry size, sharp point, finger guard",
    AXES: "battle axe head, curved blade edge, reinforced poll, sturdy wooden or metal shaft, warrior weapon",
    HAMMERS: "war hammer, heavy crushing head, reinforced striking surface, counterweight design, brutal weapon",
    SPEARS: "polearm spear, long shaft, pointed tip, hand grip wrapping, throwable or thrusting design",
    BOWS: "archery bow, curved limbs, string nocked, grip handle, elegant archer weapon",
    CROSSBOWS: "mechanical crossbow, trigger mechanism, bolt rail, stock design, medieval ranged weapon",
    STAFFS: "magical staff, twisted wood or metal, crystal focus, runic carvings, mage weapon",
    WANDS: "magic wand, ornate handle, magical tip, compact casting focus, wizard implement",
    SHIELDS: "defensive shield, reinforced boss, arm straps visible, heraldic surface, protective gear",
    GUNS: "fantasy firearm, ornate barrel, mechanical details, steampunk or magical elements",
    THROWN: "throwing weapon, balanced for flight, multiple carried, aerodynamic design",
    CLAWS: "claw weapons, finger-mounted blades, feral design, slashing focused",
    SCYTHES: "curved scythe blade, long handle, reaper aesthetic, sweeping weapon",
    WHIPS: "flexible whip weapon, braided leather or chain, handle grip, reach weapon",
    FLAILS: "chain flail, spiked ball head, handle with chain, momentum weapon",
    EXOTIC: "unique exotic weapon, unconventional design, rare fighting style, distinctive silhouette"
  },
  ARMOR: {
    HELMETS: "protective helmet, face guard, visor design, plume attachment, head protection",
    CHEST: "chest plate armor, torso protection, articulated segments, breast plate design",
    SHOULDERS: "pauldron shoulder armor, layered plates, arm mobility, intimidating profile",
    GLOVES: "armored gauntlets, finger articulation, wrist protection, grip texture",
    LEGS: "leg armor greaves, knee protection, shin guards, mobility joints",
    BOOTS: "armored boots, ankle protection, sole grip, foot coverage",
    CLOAKS: "flowing cloak, fabric draping, clasp attachment, dramatic silhouette",
    ROBES: "magical robes, layered fabric, mystical patterns, flowing design",
    BELTS: "utility belt, pouch attachments, buckle design, waist equipment",
    ACCESSORIES: "armor accessory, decorative element, functional attachment, detail piece",
    FULL_SETS: "complete armor set, matching design, cohesive style, full protection"
  },
  CONSUMABLES: {
    HEALTH: "health potion, red liquid, heart symbol, healing glow, life-restoring bottle",
    MANA: "mana potion, blue magical liquid, arcane glow, energy-restoring flask",
    BUFF: "enhancement potion, glowing liquid, power-up effect, temporary boost flask",
    FOOD: "prepared food item, appetizing appearance, fantasy cuisine, stamina restoration",
    DRINKS: "beverage container, refreshing liquid, tavern drink, thirst-quenching",
    SCROLLS: "magical scroll, rolled parchment, glowing runes, spell container",
    BOMBS: "throwable explosive, fuse visible, dangerous container, alchemical bomb",
    TRAPS: "deployable trap, trigger mechanism, concealed danger, tactical item",
    MEDICINE: "healing salve, bandage roll, medical supplies, wound treatment",
    ANTIDOTES: "cure potion, cleansing liquid, poison remedy, green healing glow"
  },
  RESOURCES: {
    ORES: "raw metal ore, mineral veins, rocky matrix, mineable resource, metallic glints",
    GEMS: "precious gemstone, faceted crystal, brilliant clarity, valuable jewel, light refraction",
    WOOD: "lumber log, tree bark texture, wood grain, carpentry material, natural resource",
    HERBS: "magical herb, plant leaves, medicinal flower, alchemical ingredient, nature item",
    FABRIC: "cloth material, woven texture, fabric roll, tailoring resource, soft material",
    LEATHER: "tanned leather, animal hide, crafting material, armor component, brown texture",
    BONES: "skeletal bones, creature remains, crafting bone, necromantic component",
    CRYSTALS: "magical crystal, energy formation, glowing facets, power source",
    METALS: "refined metal ingot, forged bar, smithing material, metallic sheen",
    MAGICAL: "magical essence, contained energy, arcane resource, glowing component"
  },
  QUEST_ITEMS: {
    KEYS: "ornate key, unique design, lock-specific shape, important access item, mysterious metal",
    ARTIFACTS: "ancient artifact, powerful relic, historical item, legendary power, museum piece",
    DOCUMENTS: "important document, sealed scroll, plot information, quest clue, aged paper",
    RELICS: "sacred relic, religious artifact, blessed item, divine power, holy object",
    TOKENS: "proof token, quest evidence, completion marker, symbolic item",
    FRAGMENTS: "item fragment, broken piece, collectible part, assembly required",
    MAPS: "treasure map, navigation chart, location marker, exploration guide",
    TOOLS: "special tool, unique function, quest-specific use, problem solver",
    CONTAINERS: "mysterious container, locked box, contents unknown, discovery item",
    EVIDENCE: "investigation evidence, clue item, mystery solving, detective piece"
  },
  CHARACTERS: {
    WARRIORS: "armored warrior, battle stance, strong physique, weapon ready, fighter class",
    MAGES: "robed mage, magical aura, staff or wand, mystical appearance, spellcaster",
    ROGUES: "hooded rogue, light armor, daggers equipped, stealthy pose, assassin type",
    ARCHERS: "bow-wielding archer, quiver visible, ranger attire, keen eyes, ranged fighter",
    HEALERS: "holy healer, flowing robes, healing staff, gentle appearance, support class",
    TANKS: "heavy tank, massive armor, shield bearer, defensive stance, protector",
    MERCHANTS: "traveling merchant, trade goods, friendly appearance, vendor NPC",
    VILLAGERS: "common villager, simple clothes, civilian appearance, townsfolk",
    NOBLES: "aristocratic noble, fine clothing, regal bearing, wealthy appearance",
    BOSSES: "boss character, imposing presence, unique design, memorable antagonist, powerful enemy"
  },
  CREATURES: {
    BEASTS: "wild beast, natural animal, feral creature, predator or prey, realistic anatomy",
    UNDEAD: "undead creature, decaying flesh, skeletal parts, necromantic horror, death theme",
    DEMONS: "demonic entity, hellish appearance, horns and claws, infernal creature, evil design",
    DRAGONS: "dragon creature, scaled body, wings spread, fire breathing, legendary beast",
    ELEMENTALS: "elemental being, pure element form, magical nature, fire/water/earth/air body",
    MYTHICAL: "mythical creature, legendary beast, folklore monster, magical animal",
    INSECTS: "giant insect, segmented body, multiple legs, chitinous armor, bug monster",
    AQUATIC: "water creature, fins and scales, aquatic adaptation, sea monster",
    FLYING: "flying creature, wings prominent, aerial predator, sky hunter",
    PLANTS: "plant creature, vegetable monster, vine tendrils, nature horror, living plant",
    SLIMES: "slime creature, gelatinous body, transparent mass, amorphous monster",
    GOLEMS: "constructed golem, animated statue, elemental core, magical construct",
    SPIRITS: "ethereal spirit, ghostly form, transparent body, supernatural entity"
  },
  ENVIRONMENT: {
    FURNITURE: "room furniture, functional piece, interior decoration, home item",
    VEGETATION: "plant decoration, tree or bush, natural growth, environment greenery",
    STRUCTURES: "architectural structure, building element, construction piece",
    CONTAINERS: "storage container, chest or barrel, inventory storage, loot container",
    LIGHTS: "light source, torch or lamp, illumination object, glow effect",
    SIGNS: "directional sign, information board, marker post, navigation aid",
    DEBRIS: "scattered debris, broken objects, destruction remains, atmosphere piece",
    INTERACTIVE: "interactive object, usable prop, mechanism trigger, puzzle element",
    DECORATIVE: "decorative prop, atmosphere item, visual interest, detail object",
    NATURAL: "natural formation, rock or crystal, environment feature, outdoor element"
  }
};

// ===========================================
// MATERIAL STYLE MODIFIERS
// ===========================================
const MATERIAL_STYLES: Record<string, string> = {
  REALISTIC: "photorealistic materials, accurate light response, real-world textures, physically based rendering",
  STYLIZED: "stylized art direction, hand-painted textures, artistic interpretation, unique visual style",
  PIXEL: "pixel art inspired, blocky aesthetic, retro game style, voxel-friendly design",
  CARTOON: "cartoon shading, bold outlines, vibrant colors, animated movie style",
  DARK_FANTASY: "dark fantasy aesthetic, gritty textures, ominous atmosphere, souls-like design",
  HIGH_FANTASY: "high fantasy style, vibrant magical, epic scale feeling, heroic design",
  SCI_FI: "science fiction design, futuristic materials, technological aesthetic, advanced civilization",
  STEAMPUNK: "steampunk aesthetic, brass and copper, gears and pipes, Victorian industrial",
  ANIME: "anime style design, large eyes for characters, cel-shaded appearance, Japanese game aesthetic"
};

// ===========================================
// NEGATIVE PROMPT - THINGS TO AVOID
// ===========================================
const NEGATIVE_PROMPT_BASE = `
multiple objects, more than one item, duplicates, copies, 
busy background, complex background, gradient background, colored background,
text, watermark, signature, logo, writing, labels,
blurry, out of focus, low quality, low resolution, pixelated, jpeg artifacts,
cropped, cut off, partial object, incomplete, missing parts,
shadows on background, cast shadows, harsh shadows,
perspective distortion, wide angle distortion, fisheye,
noise, grain, dithering,
frame, border, vignette,
human hands holding, fingers in frame,
reflection on ground, mirror surface,
3D grid, wireframe visible, topology visible,
oversaturated, undersaturated, wrong colors,
deformed, mutated, disfigured, bad anatomy,
floating parts, disconnected elements,
too small, too large, wrong scale,
boring, generic, uninteresting design
`.trim().replace(/\n/g, ", ");

// ===========================================
// BUILD ENHANCED 3D PROMPT
// ===========================================
function buildEnhanced3DPrompt(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  style: string = "REALISTIC"
): { prompt: string; negativePrompt: string } {
  
  // Get category template
  const categoryTemplate = CATEGORY_PROMPTS[categoryId] || CATEGORY_PROMPTS.ENVIRONMENT;
  
  // Get subcategory enhancement
  const subcategoryEnhancements = SUBCATEGORY_PROMPTS[categoryId] || {};
  const subcategoryPrompt = subcategoryEnhancements[subcategoryId] || "";
  
  // Get material style
  const materialStyle = MATERIAL_STYLES[style] || MATERIAL_STYLES.REALISTIC;
  
  // Build the comprehensive prompt
  const promptParts = [
    // Core rendering instruction
    categoryTemplate.prefix,
    
    // User's specific request (most important)
    userPrompt,
    
    // Subcategory specific details
    subcategoryPrompt,
    
    // Category context
    categoryTemplate.categoryContext,
    
    // Material and surface details
    categoryTemplate.materialHints,
    materialStyle,
    
    // Composition (critical for 3D conversion)
    categoryTemplate.composition,
    "pure white background (#FFFFFF), no environment, no ground plane, no shadows on background",
    "object floating in white void, isolated subject, clean extraction ready",
    
    // Lighting setup
    categoryTemplate.lighting,
    
    // Quality tags
    categoryTemplate.qualityTags,
    
    // Technical requirements for 3D conversion
    "perfect for 3D reconstruction, clean silhouette, clear depth information",
    "suitable for photogrammetry, image-to-3D optimized, neural rendering ready"
  ];
  
  // Join and clean up
  const fullPrompt = promptParts
    .filter(part => part && part.trim().length > 0)
    .join(", ")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();
  
  // Build negative prompt with category-specific additions
  let negativePrompt = NEGATIVE_PROMPT_BASE;
  
  // Add category-specific negatives
  if (categoryId === "CHARACTERS" || categoryId === "CREATURES") {
    negativePrompt += ", bad anatomy, wrong proportions, extra limbs, missing limbs, fused fingers";
  }
  if (categoryId === "WEAPONS") {
    negativePrompt += ", bent blade, broken weapon, wrong proportions, unsafe grip";
  }
  if (categoryId === "ARMOR") {
    negativePrompt += ", impossible to wear, non-functional design, floating pieces";
  }
  
  console.log("[Prompt Builder] Category:", categoryId);
  console.log("[Prompt Builder] Subcategory:", subcategoryId);
  console.log("[Prompt Builder] Style:", style);
  console.log("[Prompt Builder] Final prompt length:", fullPrompt.length);
  
  return {
    prompt: fullPrompt,
    negativePrompt: negativePrompt
  };
}

// ===========================================
// HELPER: Extract URL from Replicate output (FileOutput objects)
// ===========================================
async function extractImageUrl(output: unknown): Promise<string | null> {
  console.log("[extractImageUrl] Input type:", typeof output);
  
  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0];
    
    if (typeof firstItem === "string") {
      return firstItem;
    }
    
    if (firstItem && typeof firstItem === "object") {
      if ("url" in firstItem && typeof (firstItem as { url: unknown }).url === "function") {
        try {
          const urlObj = (firstItem as { url: () => URL }).url();
          console.log("[extractImageUrl] Called url() method:", urlObj.toString());
          return urlObj.toString();
        } catch (e) {
          console.error("[extractImageUrl] Error calling url():", e);
        }
      }
      
      const obj = firstItem as Record<string, unknown>;
      if (typeof obj.uri === "string") return obj.uri;
      if (typeof obj.href === "string") return obj.href;
    }
  }
  
  if (typeof output === "string") {
    return output;
  }
  
  if (output && typeof output === "object" && !Array.isArray(output)) {
    const obj = output as Record<string, unknown>;
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.uri === "string") return obj.uri;
    if (typeof obj.image === "string") return obj.image;
  }
  
  console.log("[extractImageUrl] Could not extract URL from:", output);
  return null;
}

// ===========================================
// HELPER: Extract URL from any value (handles FileOutput)
// ===========================================
function getUrlFromValue(val: unknown): string | undefined {
  if (typeof val === "string") return val;
  if (val && typeof val === "object" && "url" in val) {
    const fileOut = val as { url?: () => URL };
    if (typeof fileOut.url === "function") {
      try {
        return fileOut.url().toString();
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

// ===========================================
// 3D MODEL CONFIGURATIONS
// ===========================================
interface Model3DConfig {
  id: string;
  name: string;
  replicateModel: string;
  credits: number;
  quality: "good" | "high" | "best";
  speed: "fast" | "medium" | "slow";
  estimatedTime: string;
  outputFormats: string[];
  description: string;
  getInput: (imageUrl: string) => Record<string, unknown>;
  parseOutput: (output: unknown) => { modelUrl: string | null; thumbnailUrl?: string; videoUrl?: string };
}

const MODEL_3D_CONFIGS: Record<string, Model3DConfig> = {
  rodin: {
    id: "rodin",
    name: "Rodin Gen-2",
    replicateModel: "hyper3d/rodin",
    credits: 4,
    quality: "high",
    speed: "medium",
    estimatedTime: "30-60s",
    outputFormats: ["glb", "fbx", "obj", "usdz"],
    description: "High quality, PBR materials, reliable",
    getInput: (imageUrl: string) => ({
      prompt: "3D model of the object in the image, game-ready asset, clean topology",
      images: [imageUrl],
      quality: "medium",
      material: "PBR",
      geometry_file_format: "glb",
      mesh_mode: "Quad",
    }),
    parseOutput: (output: unknown) => {
      console.log("[Rodin] Parsing output:", JSON.stringify(output, null, 2));

      if (typeof output === "string") {
        return { modelUrl: output };
      }

      const url = getUrlFromValue(output);
      if (url) {
        return { modelUrl: url };
      }

      if (output && typeof output === "object") {
        const out = output as Record<string, unknown>;
        const modelUrl =
          getUrlFromValue(out.output) ||
          getUrlFromValue(out.geometry) ||
          getUrlFromValue(out.mesh) ||
          getUrlFromValue(out.glb) ||
          getUrlFromValue(out.model) ||
          null;

        return {
          modelUrl,
          videoUrl: getUrlFromValue(out.preview_render) || getUrlFromValue(out.video),
          thumbnailUrl: getUrlFromValue(out.thumbnail) || getUrlFromValue(out.image),
        };
      }

      return { modelUrl: null };
    },
  },
  trellis: {
    id: "trellis",
    name: "TRELLIS",
    replicateModel: trellisModelIdentifier,
    credits: 5,
    quality: "best",
    speed: "medium",
    estimatedTime: "30-60s",
    outputFormats: ["glb"],
    description: "Best quality, textured meshes, game-ready",
    getInput: (imageUrl: string) => ({
      image: imageUrl,
      texture_size: 1024,
      mesh_simplify: 0.95,
      generate_model: true,
      generate_video: true,
      generate_color: true,
      generate_normal: true,
      randomize_seed: true,
      ss_sampling_steps: 12,
      slat_sampling_steps: 12,
      ss_guidance_strength: 7.5,
      slat_guidance_strength: 3,
    }),
    parseOutput: (output: unknown) => {
      console.log("[TRELLIS] Parsing output:", JSON.stringify(output, null, 2));
      
      if (output && typeof output === "object") {
        const out = output as Record<string, unknown>;
        return {
          modelUrl: getUrlFromValue(out.model_file) || getUrlFromValue(out.mesh) || getUrlFromValue(out.glb) || null,
          videoUrl: getUrlFromValue(out.combined_video) || getUrlFromValue(out.video),
          thumbnailUrl: getUrlFromValue(out.no_background_image) || getUrlFromValue(out.image),
        };
      }
      return { modelUrl: null };
    },
  },
  hunyuan3d: {
    id: "hunyuan3d",
    name: "Hunyuan3D-2",
    replicateModel: "tencent/hunyuan3d-2:b1b9449a1277e10402781c5d41eb30c0a0683504fb23fab591ca9dfc2aabe1cb",
    credits: 4,
    quality: "high",
    speed: "fast",
    estimatedTime: "20-40s",
    outputFormats: ["glb", "obj"],
    description: "Fast generation, good quality",
    getInput: (imageUrl: string) => ({
      image: imageUrl,
      foreground_ratio: 0.9,
      remesh: "none",
      ss_sampling_steps: 12,
      slat_sampling_steps: 12,
    }),
    parseOutput: (output: unknown) => {
      console.log("[Hunyuan3D] Parsing output:", JSON.stringify(output, null, 2));
      
      if (output && typeof output === "object") {
        const out = output as Record<string, unknown>;
        return {
          modelUrl: getUrlFromValue(out.mesh) || getUrlFromValue(out.glb) || getUrlFromValue(out.model) || null,
          videoUrl: getUrlFromValue(out.video),
          thumbnailUrl: getUrlFromValue(out.image),
        };
      }
      if (typeof output === "string") {
        return { modelUrl: output };
      }
      return { modelUrl: null };
    },
  },
  wonder3d: {
    id: "wonder3d",
    name: "Wonder3D",
    replicateModel: "adirik/wonder3d",
    credits: 4,
    quality: "high",
    speed: "slow",
    estimatedTime: "40-80s",
    outputFormats: ["glb", "obj"],
    description: "Detailed multi-view reconstruction",
    getInput: (imageUrl: string) => ({
      image: imageUrl,
      remove_bg: true,
    }),
    parseOutput: (output: unknown) => {
      console.log("[Wonder3D] Parsing output:", JSON.stringify(output, null, 2));
      
      if (output && typeof output === "object") {
        const out = output as Record<string, unknown>;
        return {
          modelUrl: getUrlFromValue(out.mesh) || getUrlFromValue(out.model) || getUrlFromValue(out.glb) || null,
          thumbnailUrl: getUrlFromValue(out.normal_images),
        };
      }
      if (typeof output === "string") {
        return { modelUrl: output };
      }
      return { modelUrl: null };
    },
  },
};

// ===========================================
// HELPER: Sleep for retry
// ===========================================
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ===========================================
// HELPER: Run with retry for rate limits and network errors
// ===========================================
function isRetryableError(errorMessage: string): boolean {
  const retryablePatterns = [
    "429", "rate limit", "throttled",
    "network", "Network is unreachable", "ECONNREFUSED", "ECONNRESET",
    "ETIMEDOUT", "ENOTFOUND", "socket hang up", "Connection refused",
    "502", "503", "504", "Bad Gateway", "Service Unavailable", "Gateway Timeout",
  ];

  const lowerMessage = errorMessage.toLowerCase();
  return retryablePatterns.some(pattern =>
    lowerMessage.includes(pattern.toLowerCase())
  );
}

async function runWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 5000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      const errorMessage = lastError.message || "";

      if (isRetryableError(errorMessage)) {
        const delay = baseDelay * (attempt + 1);
        console.log(`[Retry] Retryable error. Waiting ${delay}ms before retry ${attempt + 1}/${maxRetries}...`);
        await sleep(delay);
        continue;
      }

      throw error;
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// ===========================================
// REFERENCE IMAGE MODELS
// ===========================================
type ReferenceModelIdentifier = `${string}/${string}` | `${string}/${string}:${string}`;

interface ReferenceModelConfig {
  id: string;
  name: string;
  identifier: ReferenceModelIdentifier;
  buildInput: (prompt: string, negative: string, seed: number) => Record<string, unknown>;
}

const REFERENCE_MODELS: ReferenceModelConfig[] = [
  {
    id: "flux-dev",
    name: "FLUX Dev (best quality)",
    identifier: "black-forest-labs/flux-dev",
    buildInput: (prompt: string, _negative: string, seed: number) => ({
      prompt,
      seed,
      guidance: 3.5,
      num_outputs: 1,
      aspect_ratio: "1:1",
      output_format: "png",
      output_quality: 95,
      num_inference_steps: 28,
    }),
  },
  {
    id: "sdxl",
    name: "SDXL (versioned fallback)",
    identifier: "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
    buildInput: (prompt: string, negative: string, seed: number) => ({
      prompt,
      negative_prompt: negative,
      seed,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      guidance_scale: 7.5,
      num_inference_steps: 25,
      scheduler: "K_EULER",
    }),
  },
];

// ===========================================
// STEP 1: GENERATE REFERENCE IMAGE
// ===========================================
async function generateReferenceImage(
  userPrompt: string,
  categoryId: string,
  subcategoryId: string,
  style: string = "REALISTIC",
  seed?: number
): Promise<{ success: boolean; imageUrl?: string; seed?: number; error?: string; fullPrompt?: string }> {
  try {
    console.log("[Reference Image] Building enhanced prompt...");
    
    // Build the enhanced prompt
    const { prompt: enhancedPrompt, negativePrompt } = buildEnhanced3DPrompt(
      userPrompt,
      categoryId,
      subcategoryId,
      style
    );
    
    const usedSeed = seed ?? Math.floor(Math.random() * 2147483647);

    console.log("[Reference Image] ========================================");
    console.log("[Reference Image] ENHANCED PROMPT:");
    console.log(enhancedPrompt);
    console.log("[Reference Image] ========================================");
    console.log("[Reference Image] Seed:", usedSeed);

    for (const model of REFERENCE_MODELS) {
      try {
        console.log(`[Reference Image] Trying ${model.name}...`);
        const output = await runWithRetry(async () => {
          return await replicate.run(model.identifier, {
            input: model.buildInput(enhancedPrompt, negativePrompt, usedSeed),
          });
        });

        const imageUrl = await extractImageUrl(output);

        if (imageUrl) {
          console.log(`[Reference Image] SUCCESS with ${model.name}:`, imageUrl);
          return { 
            success: true, 
            imageUrl, 
            seed: usedSeed,
            fullPrompt: enhancedPrompt 
          };
        }

        console.warn(`[Reference Image] ${model.name} returned no usable URL. Trying next...`);
      } catch (modelError) {
        console.error(`[Reference Image] ${model.name} failed:`, modelError);
      }
    }

    return { success: false, error: "All reference models failed" };

  } catch (error) {
    console.error("[Reference Image] Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Reference image generation failed",
    };
  }
}

// ===========================================
// STEP 2: GENERATE 3D FROM IMAGE
// ===========================================
async function generate3DFromImage(
  modelId: string,
  imageUrl: string
): Promise<{
  success: boolean;
  modelUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  format?: string;
  error?: string;
}> {
  const config = MODEL_3D_CONFIGS[modelId];
  
  if (!config) {
    return { success: false, error: `Unknown 3D model: ${modelId}` };
  }

  try {
    console.log(`[3D Gen] Starting ${config.name}...`);
    console.log(`[3D Gen] Input image: ${imageUrl}`);

    const input = config.getInput(imageUrl);
    console.log(`[3D Gen] Input params:`, JSON.stringify(input, null, 2));

    const output = await runWithRetry(async () => {
      return await replicate.run(
        config.replicateModel as `${string}/${string}`,
        { input }
      );
    });

    console.log(`[3D Gen] Raw output received`);

    const parsed = config.parseOutput(output);

    // Search all keys if needed
    if (!parsed.modelUrl && output && typeof output === "object") {
      const outputObj = output as Record<string, unknown>;
      for (const [key, value] of Object.entries(outputObj)) {
        const url = getUrlFromValue(value);
        if (url) {
          const is3DFile = [".glb", ".obj", ".ply", ".gltf", ".fbx", ".usdz", ".stl"]
            .some(ext => url.includes(ext));
          const isReplicateDelivery = url.includes("replicate.delivery");
          if (is3DFile || isReplicateDelivery) {
            console.log(`[3D Gen] Found model URL in "${key}":`, url);
            parsed.modelUrl = url;
            break;
          }
        }
      }
    }

    // Check iterable
    if (!parsed.modelUrl && output && typeof output === "object" && Symbol.iterator in output) {
      const arr = Array.from(output as Iterable<unknown>);
      if (arr.length > 0) {
        const firstUrl = getUrlFromValue(arr[0]);
        if (firstUrl) {
          parsed.modelUrl = firstUrl;
        }
      }
    }

    if (!parsed.modelUrl) {
      return { 
        success: false, 
        error: `${config.name} did not return a valid 3D model URL` 
      };
    }

    let format = "glb";
    if (parsed.modelUrl.includes(".obj")) format = "obj";
    else if (parsed.modelUrl.includes(".ply")) format = "ply";
    else if (parsed.modelUrl.includes(".gltf")) format = "gltf";
    else if (parsed.modelUrl.includes(".fbx")) format = "fbx";

    return {
      success: true,
      modelUrl: parsed.modelUrl,
      thumbnailUrl: parsed.thumbnailUrl,
      videoUrl: parsed.videoUrl,
      format,
    };

  } catch (error) {
    console.error(`[3D Gen] ${config.name} error:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `${config.name} generation failed`,
    };
  }
}

// ===========================================
// MAIN API HANDLER - POST
// ===========================================
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please log in to generate 3D models." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      prompt,
      categoryId,
      subcategoryId,
      modelId = "rodin",
      style = "REALISTIC",
      seed,
    } = body;

    console.log("\n===========================================");
    console.log("3D GENERATION REQUEST");
    console.log("===========================================");
    console.log("User:", user.id);
    console.log("Prompt:", prompt);
    console.log("Category:", categoryId, "->", subcategoryId);
    console.log("Style:", style);
    console.log("3D Model:", modelId);

    // Validation
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: "Please enter a description for your 3D model." },
        { status: 400 }
      );
    }

    if (!categoryId || !subcategoryId) {
      return NextResponse.json(
        { error: "Please select category and subcategory." },
        { status: 400 }
      );
    }

    const modelConfig = MODEL_3D_CONFIGS[modelId];
    if (!modelConfig) {
      return NextResponse.json(
        { error: `Invalid 3D model: ${modelId}` },
        { status: 400 }
      );
    }

    const category = getCategoryById(categoryId);
    if (!category) {
      return NextResponse.json(
        { error: `Invalid category: ${categoryId}` },
        { status: 400 }
      );
    }

    const subcategory = getSubcategoryById(categoryId, subcategoryId);
    if (!subcategory) {
      return NextResponse.json(
        { error: `Invalid subcategory: ${subcategoryId}` },
        { status: 400 }
      );
    }

    // Check credits
    const CREDITS_REQUIRED = modelConfig.credits;
    await getOrCreateUser(user.id, user.email!);
    const { credits } = await getUserCredits(user.id);

    if (credits < CREDITS_REQUIRED) {
      return NextResponse.json(
        {
          error: `Not enough credits. Need ${CREDITS_REQUIRED}, have ${credits}.`,
          noCredits: true,
        },
        { status: 402 }
      );
    }

    let validSeed: number | undefined;
    if (seed !== undefined && seed !== null && seed !== "") {
      validSeed = Number(seed);
      if (isNaN(validSeed) || validSeed < 0 || validSeed > 2147483647) {
        validSeed = undefined;
      }
    }

    // ===========================================
    // STEP 1: Generate reference image with ENHANCED PROMPT
    // ===========================================
    console.log("\n[Step 1/2] Generating reference image with enhanced prompt...");
    
    const referenceResult = await generateReferenceImage(
      prompt.trim(),
      categoryId,
      subcategoryId,
      style,
      validSeed
    );

    if (!referenceResult.success || !referenceResult.imageUrl) {
      return NextResponse.json(
        { error: `Reference image failed: ${referenceResult.error}` },
        { status: 500 }
      );
    }

    console.log("[Step 1/2] ✓ COMPLETE");

    // ===========================================
    // STEP 2: Convert to 3D model
    // ===========================================
    console.log(`\n[Step 2/2] Converting to 3D with ${modelConfig.name}...`);
    
    const model3DResult = await generate3DFromImage(modelId, referenceResult.imageUrl);

    if (!model3DResult.success || !model3DResult.modelUrl) {
      return NextResponse.json(
        { error: `3D conversion failed: ${model3DResult.error}` },
        { status: 500 }
      );
    }

    console.log("[Step 2/2] ✓ COMPLETE");

    // Deduct credits
    await deductCredit(user.id, CREDITS_REQUIRED);

    // Save to database
    await saveGeneration({
      userId: user.id,
      prompt: prompt.trim(),
      fullPrompt: referenceResult.fullPrompt || `[3D] ${prompt.trim()}`,
      categoryId,
      subcategoryId,
      styleId: `3D_${modelId.toUpperCase()}`,
      imageUrl: model3DResult.modelUrl,
      seed: referenceResult.seed,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("\n===========================================");
    console.log("✓ 3D GENERATION COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Format: ${model3DResult.format}`);
    console.log(`URL: ${model3DResult.modelUrl}`);
    console.log("===========================================\n");

    return NextResponse.json({
      success: true,
      modelUrl: model3DResult.modelUrl,
      format: model3DResult.format || "glb",
      is3DModel: true,
      referenceImageUrl: referenceResult.imageUrl,
      thumbnailUrl: model3DResult.thumbnailUrl || referenceResult.imageUrl,
      videoUrl: model3DResult.videoUrl,
      prompt: prompt.trim(),
      fullPrompt: referenceResult.fullPrompt,
      seed: referenceResult.seed,
      modelInfo: {
        id: modelConfig.id,
        name: modelConfig.name,
        quality: modelConfig.quality,
        speed: modelConfig.speed,
      },
      creditsUsed: CREDITS_REQUIRED,
      duration: `${duration}s`,
    });

  } catch (error) {
    console.error("[3D Gen] Unexpected error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Something went wrong" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - Available 3D models and styles info
// ===========================================
export async function GET() {
  const models = Object.entries(MODEL_3D_CONFIGS).map(([id, config]) => ({
    id,
    name: config.name,
    credits: config.credits,
    quality: config.quality,
    speed: config.speed,
    estimatedTime: config.estimatedTime,
    outputFormats: config.outputFormats,
    description: config.description,
  }));

  const styles = Object.keys(MATERIAL_STYLES).map(id => ({
    id,
    name: id.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase()),
  }));

  const categories = Object.keys(CATEGORY_PROMPTS);

  return NextResponse.json({
    models,
    styles,
    categories,
    defaultModel: "rodin",
    defaultStyle: "REALISTIC",
    workflow: "text → enhanced prompt → reference image → 3D model",
  });
}