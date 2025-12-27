import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserCredits, checkAndDeductCredits, refundCredits, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";
import { getRunwareClient, type UserTier, RUNWARE_MODELS, DEFAULT_MODEL, MODEL_COSTS } from "@/lib/runware";

// ===========================================
// RUNWARE-BASED IMAGE EDITING
// ===========================================
// Using Runware's img2img capabilities for editing
// Cost: ~$0.003-0.01 per edit depending on tier

// ===========================================
// EDIT TYPE DETECTION - CORE LOGIC
// ===========================================

type EditType = "add_effect" | "modify_appearance" | "change_style" | "color_change" | "material_change" | "transform";

interface EditAnalysis {
  type: EditType;
  preserveOriginal: boolean;
  strength: number;
  description: string;
}

// Keywords for detecting ADDITION (preserve original)
const ADD_KEYWORDS = [
  "add", "dodaj", "put", "give", "apply", "attach", "include",
  "with", "z", "ze", "wraz z",
  "effect", "efekt", "aura", "glow", "świecenie",
  "flames", "fire", "płomienie", "ogień",
  "ice", "frost", "lód", "mróz",
  "lightning", "błyskawica", "elektryczność",
  "sparkles", "iskry", "particles", "cząsteczki",
  "runes", "runy", "symbols", "symbole",
  "gems", "klejnoty", "jewels",
  "wings", "skrzydła",
  "halo", "aureola",
  "shadow", "cień",
];

// Keywords for CHANGE (may alter original more)
const CHANGE_KEYWORDS = [
  "change", "zmień", "make", "zrób", "turn into", "zamień na",
  "transform", "przekształć", "convert", "konwertuj",
  "style", "styl", "look", "wygląd",
  "color", "kolor", "recolor",
  "material", "materiał",
  "pixel art", "anime", "realistic", "cartoon",
];

// Keywords for PRESERVING original
const PRESERVE_KEYWORDS = [
  "keep", "zachowaj", "preserve", "maintain", "same shape", "ten sam kształt",
  "only add", "tylko dodaj", "just add",
  "don't change", "nie zmieniaj",
  "keep the", "zachowaj",
];

/**
 * Analyze user prompt to determine edit type
 */
function analyzeEditIntent(userPrompt: string): EditAnalysis {
  const lowerPrompt = userPrompt.toLowerCase();

  const wantsPreserve = PRESERVE_KEYWORDS.some(kw => lowerPrompt.includes(kw));
  const isAddition = ADD_KEYWORDS.some(kw => lowerPrompt.includes(kw));
  const isChange = CHANGE_KEYWORDS.some(kw => lowerPrompt.includes(kw));

  // 1. Adding effects (fire, ice, magic)
  if (isAddition && !isChange) {
    return {
      type: "add_effect",
      preserveOriginal: true,
      strength: 0.45,
      description: "Adding effect while preserving original"
    };
  }

  // 2. Color change
  if (lowerPrompt.match(/\b(gold|silver|blue|red|green|purple|black|white|color|kolor)\b/i)) {
    return {
      type: "color_change",
      preserveOriginal: true,
      strength: 0.35,
      description: "Changing color while preserving shape"
    };
  }

  // 3. Material change
  if (lowerPrompt.match(/\b(crystal|wood|bone|stone|metal|glass|kryształ|drewno|kość|kamień)\b/i)) {
    return {
      type: "material_change",
      preserveOriginal: true,
      strength: 0.4,
      description: "Changing material while preserving shape"
    };
  }

  // 4. Style change (pixel art, anime)
  if (lowerPrompt.match(/\b(pixel|anime|cartoon|realistic|painted|sketch|chibi)\b/i)) {
    return {
      type: "change_style",
      preserveOriginal: !isChange,
      strength: 0.55,
      description: "Converting art style"
    };
  }

  // 5. Transformation
  if (lowerPrompt.match(/\b(turn into|transform|convert|zamień|przekształć)\b/i)) {
    return {
      type: "transform",
      preserveOriginal: false,
      strength: 0.6,
      description: "Transforming object"
    };
  }

  // 6. Default - preserve original with moderate change
  return {
    type: "modify_appearance",
    preserveOriginal: wantsPreserve || !isChange,
    strength: 0.35,
    description: "General modification preserving original"
  };
}

// ===========================================
// EDIT PRESETS
// ===========================================

interface EditPreset {
  keywords: string[];
  strength: number;
  promptTemplate: string;
  description: string;
  category: "effects" | "colors" | "materials" | "decorations" | "styles";
  preserveShape: boolean;
}

const EDIT_PRESETS: Record<string, EditPreset> = {
  // === EFFECTS ===
  fire: {
    keywords: ["fire", "flame", "flames", "burning", "blaze", "inferno", "ember", "ogień", "płomienie"],
    strength: 0.45,
    promptTemplate: "add dramatic fire and flames to this {itemType}, blazing fire effect, orange and red flames emanating, fiery glow, hot embers, keep the exact same {itemType} visible underneath the flames",
    description: "Adds fire/flame effects",
    category: "effects",
    preserveShape: true,
  },
  ice: {
    keywords: ["ice", "frost", "frozen", "freezing", "cold", "icy", "glacier", "snow", "crystalline", "lód", "mróz"],
    strength: 0.45,
    promptTemplate: "add ice and frost effects to this {itemType}, frozen with ice crystals, blue frost coating, icicles forming on edges, cold mist, crystalline ice texture overlay",
    description: "Adds ice/frost effects",
    category: "effects",
    preserveShape: true,
  },
  lightning: {
    keywords: ["lightning", "electric", "electricity", "thunder", "spark", "sparks", "voltage", "shock", "błyskawica"],
    strength: 0.45,
    promptTemplate: "add electric lightning effects to this {itemType}, blue-white electricity arcing around it, electrical sparks, voltage crackling, glowing electric aura",
    description: "Adds lightning/electric effects",
    category: "effects",
    preserveShape: true,
  },
  magic: {
    keywords: ["magic", "magical", "enchanted", "mystical", "arcane", "spell", "sorcery", "mana", "magia", "magiczny"],
    strength: 0.45,
    promptTemplate: "add magical enchantment effects to this {itemType}, glowing magical runes, mystical purple and blue aura, sparkles and magical particles floating around it",
    description: "Adds magical/enchanted effects",
    category: "effects",
    preserveShape: true,
  },
  glow: {
    keywords: ["glow", "glowing", "luminous", "radiant", "shining", "bright", "light", "neon", "świecenie"],
    strength: 0.40,
    promptTemplate: "make this {itemType} glow with bright inner light, luminous radiant effect, soft light rays emanating, neon glow",
    description: "Adds glowing/luminous effect",
    category: "effects",
    preserveShape: true,
  },
  poison: {
    keywords: ["poison", "toxic", "venom", "acid", "corrosive", "dripping", "ooze", "trucizna", "toksyczny"],
    strength: 0.45,
    promptTemplate: "add poison and toxic effects to this {itemType}, dripping green venom, toxic fumes rising, acid drops, sickly green glow",
    description: "Adds poison/toxic effects",
    category: "effects",
    preserveShape: true,
  },
  holy: {
    keywords: ["holy", "divine", "sacred", "blessed", "angelic", "celestial", "light", "pure", "święty", "boski"],
    strength: 0.45,
    promptTemplate: "add holy divine light effects to this {itemType}, golden celestial glow, rays of sacred light, angelic aura emanating",
    description: "Adds holy/divine effects",
    category: "effects",
    preserveShape: true,
  },
  dark: {
    keywords: ["dark", "shadow", "darkness", "evil", "cursed", "demonic", "void", "corrupt", "ciemny", "mroczny"],
    strength: 0.45,
    promptTemplate: "add dark shadow effects to this {itemType}, dark energy wisps, shadowy aura, void particles swirling, purple-black darkness",
    description: "Adds dark/shadow effects",
    category: "effects",
    preserveShape: true,
  },

  // === COLORS ===
  gold: {
    keywords: ["gold", "golden", "gilded", "aureate", "złoty", "złoto"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to be made of pure gold. Golden metallic color, shiny gold material. Keep the EXACT SAME shape and design.",
    description: "Changes to gold color",
    category: "colors",
    preserveShape: true,
  },
  silver: {
    keywords: ["silver", "chrome", "metallic", "steel", "platinum", "srebrny"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to polished silver. Shiny chrome metallic surface. Keep the EXACT same shape.",
    description: "Changes to silver color",
    category: "colors",
    preserveShape: true,
  },
  ruby: {
    keywords: ["ruby", "red", "crimson", "scarlet", "blood", "rubin", "czerwony"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} color to deep ruby red. Crimson colored, red gemstone material. Keep the EXACT same shape.",
    description: "Changes to red/ruby color",
    category: "colors",
    preserveShape: true,
  },
  sapphire: {
    keywords: ["sapphire", "blue", "azure", "cobalt", "navy", "szafir", "niebieski"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to sapphire blue color. Deep azure blue, blue gemstone material. Keep the EXACT same shape.",
    description: "Changes to blue/sapphire color",
    category: "colors",
    preserveShape: true,
  },
  emerald: {
    keywords: ["emerald", "green", "jade", "verdant", "forest", "szmaragd", "zielony"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to emerald green. Rich jade green color, green gemstone material. Keep the EXACT same shape.",
    description: "Changes to green/emerald color",
    category: "colors",
    preserveShape: true,
  },
  amethyst: {
    keywords: ["amethyst", "purple", "violet", "lavender", "magenta", "ametyst", "fioletowy"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to amethyst purple. Deep violet color, purple gemstone material. Keep the EXACT same shape.",
    description: "Changes to purple/amethyst color",
    category: "colors",
    preserveShape: true,
  },
  obsidian: {
    keywords: ["obsidian", "black", "onyx", "ebony", "jet", "obsydian", "czarny"],
    strength: 0.35,
    promptTemplate: "Change this {itemType} to black obsidian. Deep black volcanic glass material, dark and sleek. Keep the EXACT same shape.",
    description: "Changes to black/obsidian color",
    category: "colors",
    preserveShape: true,
  },
  rainbow: {
    keywords: ["rainbow", "iridescent", "prismatic", "colorful", "multicolor", "chromatic", "tęczowy"],
    strength: 0.38,
    promptTemplate: "Make this {itemType} iridescent rainbow colored. Prismatic shifting colors, rainbow reflections. Keep the original shape.",
    description: "Adds rainbow/iridescent effect",
    category: "colors",
    preserveShape: true,
  },

  // === MATERIALS ===
  crystal: {
    keywords: ["crystal", "crystalline", "gem", "gemstone", "jewel", "transparent", "glass", "kryształ"],
    strength: 0.4,
    promptTemplate: "Transform this {itemType} to be made of crystal. Transparent crystalline material, faceted gem surfaces, light refraction. Keep the EXACT same shape.",
    description: "Changes to crystal material",
    category: "materials",
    preserveShape: true,
  },
  wood: {
    keywords: ["wood", "wooden", "timber", "oak", "mahogany", "birch", "drewno", "drewniany"],
    strength: 0.4,
    promptTemplate: "Transform this {itemType} to be made of polished wood. Wood grain texture, carved wooden material. Keep the EXACT same shape.",
    description: "Changes to wooden material",
    category: "materials",
    preserveShape: true,
  },
  bone: {
    keywords: ["bone", "skeletal", "ivory", "skull", "osseous", "kość", "kościany"],
    strength: 0.4,
    promptTemplate: "Transform this {itemType} to be made of bone. Ivory white bone material, skeletal texture. Keep the EXACT same shape.",
    description: "Changes to bone material",
    category: "materials",
    preserveShape: true,
  },
  stone: {
    keywords: ["stone", "rock", "granite", "marble", "rocky", "kamień", "kamienny"],
    strength: 0.4,
    promptTemplate: "Transform this {itemType} to be carved from stone. Rocky granite texture, carved stone material. Keep the EXACT same shape.",
    description: "Changes to stone material",
    category: "materials",
    preserveShape: true,
  },

  // === DECORATIONS ===
  gems: {
    keywords: ["gems", "jewels", "jeweled", "studded", "bejeweled", "encrusted", "klejnoty"],
    strength: 0.32,
    promptTemplate: "Add precious gems and jewels to this {itemType}. Embed rubies, sapphires, emeralds, diamonds. Jewel encrusted decoration.",
    description: "Adds gems and jewels",
    category: "decorations",
    preserveShape: true,
  },
  runes: {
    keywords: ["runes", "runic", "inscribed", "carved", "etched", "symbols", "glyphs", "runy"],
    strength: 0.3,
    promptTemplate: "Add glowing magical runes to this {itemType}. Ancient runic symbols etched and glowing on the surface, mystical inscriptions.",
    description: "Adds glowing runes",
    category: "decorations",
    preserveShape: true,
  },
  ornate: {
    keywords: ["ornate", "decorated", "fancy", "elaborate", "detailed", "intricate", "baroque", "ozdobny"],
    strength: 0.35,
    promptTemplate: "Make this {itemType} more ornate and decorated. Add intricate filigree, elaborate engravings, fancy decorative details.",
    description: "Makes more ornate/decorated",
    category: "decorations",
    preserveShape: true,
  },
  ancient: {
    keywords: ["ancient", "old", "aged", "antique", "weathered", "worn", "rustic", "vintage", "starożytny"],
    strength: 0.35,
    promptTemplate: "Make this {itemType} look ancient and weathered. Add rust, wear marks, aged patina, antique appearance.",
    description: "Ages/weathers the item",
    category: "decorations",
    preserveShape: true,
  },
  pristine: {
    keywords: ["pristine", "new", "clean", "polished", "shiny", "mint", "perfect", "restore", "nowy"],
    strength: 0.3,
    promptTemplate: "Make this {itemType} look pristine and brand new. Clean polished surface, shiny and perfect condition.",
    description: "Makes pristine/new looking",
    category: "decorations",
    preserveShape: true,
  },

  // === STYLE CHANGES ===
  pixelArt: {
    keywords: ["pixel", "pixelart", "pixel art", "8bit", "8-bit", "16bit", "16-bit", "retro"],
    strength: 0.55,
    promptTemplate: "Convert to pixel art style. {itemType}, retro 16-bit pixel art, clean pixels, game sprite style. Maintain the same pose and shape.",
    description: "Converts to pixel art",
    category: "styles",
    preserveShape: true,
  },
  realistic: {
    keywords: ["realistic", "photorealistic", "real", "lifelike", "3d render", "rendered", "realistyczny"],
    strength: 0.6,
    promptTemplate: "Convert to photorealistic style. Realistic {itemType}, 3D rendered, physically accurate materials and lighting.",
    description: "Converts to realistic style",
    category: "styles",
    preserveShape: false,
  },
  anime: {
    keywords: ["anime", "manga", "japanese", "cel shaded", "cel-shaded"],
    strength: 0.55,
    promptTemplate: "Convert to anime style. {itemType} in anime manga art style, cel shaded, clean lines, vibrant colors.",
    description: "Converts to anime style",
    category: "styles",
    preserveShape: true,
  },
  cartoon: {
    keywords: ["cartoon", "cartoonish", "toon", "comic", "animated", "kreskówka"],
    strength: 0.55,
    promptTemplate: "Convert to cartoon style. {itemType} as cartoon, bold outlines, bright colors, playful style.",
    description: "Converts to cartoon style",
    category: "styles",
    preserveShape: true,
  },
  chibi: {
    keywords: ["chibi", "cute", "kawaii", "adorable", "tiny", "mini", "słodki"],
    strength: 0.6,
    promptTemplate: "Convert to cute chibi style. Adorable kawaii {itemType}, big head small body proportions if character, cute anime style.",
    description: "Converts to chibi style",
    category: "styles",
    preserveShape: false,
  },
  darkFantasy: {
    keywords: ["dark fantasy", "gothic", "grim", "grimdark", "souls", "soulslike", "eldritch", "mroczne fantasy"],
    strength: 0.5,
    promptTemplate: "Convert to dark fantasy style. {itemType} in grimdark gothic style, ominous atmosphere, dark souls aesthetic.",
    description: "Converts to dark fantasy style",
    category: "styles",
    preserveShape: true,
  },
  scifi: {
    keywords: ["sci-fi", "scifi", "futuristic", "cyber", "tech", "technological", "neon", "cyberpunk"],
    strength: 0.45,
    promptTemplate: "Transform into sci-fi futuristic version. {itemType} with technological elements, neon lights, cyberpunk aesthetic, high-tech materials.",
    description: "Makes sci-fi/futuristic",
    category: "styles",
    preserveShape: true,
  },
  steampunk: {
    keywords: ["steampunk", "clockwork", "brass", "gears", "victorian", "industrial", "zegarkowy"],
    strength: 0.45,
    promptTemplate: "Transform into steampunk version. {itemType} with brass gears, clockwork mechanisms, Victorian industrial aesthetic.",
    description: "Makes steampunk style",
    category: "styles",
    preserveShape: true,
  },
};

// Default preset for unknown edits
const DEFAULT_PRESET: EditPreset = {
  keywords: [],
  strength: 0.3,
  promptTemplate: "Edit this {itemType}: {userPrompt}. Keep the overall shape, style and details intact. Only apply the requested change.",
  description: "General edit (preserves original)",
  category: "effects",
  preserveShape: true,
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

interface GenerationData {
  categoryId?: string;
  subcategoryId?: string;
  styleId?: string;
}

function detectItemType(originalGeneration?: GenerationData): string {
  if (!originalGeneration) return "item";

  const category = originalGeneration.categoryId?.toLowerCase() || "";
  const subcategory = originalGeneration.subcategoryId?.toLowerCase() || "";

  const categoryMap: Record<string, string> = {
    weapons: "weapon",
    armor: "armor piece",
    consumables: "consumable item",
    resources: "resource",
    items: "item",
    characters: "character",
    creatures: "creature",
    environment: "environment element",
    tilesets: "tileset",
    ui: "UI element",
    effects: "effect",
    projectiles: "projectile",
  };

  const subcategoryMap: Record<string, string> = {
    swords: "sword",
    axes: "axe",
    bows: "bow",
    staffs: "staff",
    wands: "wand",
    shields: "shield",
    helmets: "helmet",
    potions: "potion",
    scrolls: "scroll",
    daggers: "dagger",
    spears: "spear",
    hammers: "hammer",
    maces: "mace",
  };

  if (subcategoryMap[subcategory]) return subcategoryMap[subcategory];
  if (categoryMap[category]) return categoryMap[category];
  return "item";
}

function findBestPreset(userPrompt: string): { preset: EditPreset; presetName: string | null } {
  const lowerPrompt = userPrompt.toLowerCase();

  let bestPreset = DEFAULT_PRESET;
  let bestScore = 0;
  let presetName: string | null = null;

  for (const [name, preset] of Object.entries(EDIT_PRESETS)) {
    for (const keyword of preset.keywords) {
      if (lowerPrompt.includes(keyword)) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestPreset = preset;
          presetName = name;
        }
      }
    }
  }

  return { preset: bestPreset, presetName };
}

function buildPrompt(
  userPrompt: string,
  preset: EditPreset,
  itemType: string,
  editAnalysis: EditAnalysis
): string {
  let prompt = preset.promptTemplate
    .replace(/{itemType}/g, itemType)
    .replace(/{userPrompt}/g, userPrompt);

  if (editAnalysis.preserveOriginal) {
    prompt += " IMPORTANT: Keep the original object completely intact, only add the requested effect/change.";
  }

  prompt += " High quality, detailed, professional game asset.";

  return prompt;
}

function buildNegativePrompt(preset: EditPreset, editAnalysis: EditAnalysis): string {
  const base = "blurry, low quality, distorted, deformed, bad anatomy, watermark, signature, text";

  const additions: string[] = [];

  if (preset.preserveShape || editAnalysis.preserveOriginal) {
    additions.push(
      "different shape",
      "wrong proportions",
      "different object",
      "different weapon",
      "multiple objects",
      "duplicated",
      "changed pose",
      "different angle"
    );
  }

  return [base, ...additions].join(", ");
}

function getUserTier(plan: string, role: string): UserTier {
  if (role === "OWNER" || role === "ADMIN") return "pro";

  switch (plan) {
    case "UNLIMITED":
    case "PRO":
      return "pro";
    case "STARTER":
      return "starter";
    default:
      return "free";
  }
}

// ===========================================
// RUNWARE IMAGE EDITING FUNCTION
// ===========================================

async function editImageWithRunware(
  imageUrl: string,
  prompt: string,
  negativePrompt: string,
  strength: number,
  userTier: UserTier
): Promise<{ success: boolean; imageUrl?: string; error?: string; cost?: number }> {
  try {
    const runware = await getRunwareClient();

    // Select model based on tier
    const modelId = DEFAULT_MODEL[userTier];
    const modelAIR = RUNWARE_MODELS[modelId];
    const cost = MODEL_COSTS[modelId];

    console.log(`[Runware Edit] Using model: ${modelId} (AIR: ${modelAIR})`);
    console.log(`[Runware Edit] Strength: ${strength}`);
    console.log(`[Runware Edit] Prompt: ${prompt.substring(0, 100)}...`);

    // Use imageInference with inputImage for img2img editing
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (runware as any).imageInference({
      positivePrompt: prompt,
      negativePrompt: negativePrompt,
      model: modelAIR,
      inputImage: imageUrl,
      strength: strength, // 0.0 = original, 1.0 = completely new
      width: 1024,
      height: 1024,
      steps: userTier === "pro" ? 30 : 25,
      CFGScale: 7,
      numberResults: 1,
      outputType: "URL",
      outputFormat: "PNG",
    });

    if (!result || result.length === 0) {
      return { success: false, error: "No result from Runware" };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resultAny = result as any;
    let editedUrl: string | null = null;

    if (Array.isArray(resultAny) && resultAny.length > 0) {
      editedUrl = resultAny[0].imageURL || resultAny[0].imageUrl || String(resultAny[0]);
    } else if (resultAny && typeof resultAny === "object") {
      editedUrl = resultAny.imageURL || resultAny.imageUrl || String(resultAny);
    }

    if (!editedUrl || !editedUrl.startsWith("http")) {
      return { success: false, error: "Invalid result URL from Runware" };
    }

    console.log(`[Runware Edit] ✅ Edit successful`);
    return { success: true, imageUrl: editedUrl, cost };
  } catch (error) {
    console.error("[Runware Edit] ❌ Error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Edit failed",
    };
  }
}

// ===========================================
// MAIN API HANDLER
// ===========================================

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    // Authentication
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "You must be logged in" }, { status: 401 });
    }

    // Check credits and plan
    const { plan, role } = await getUserCredits(user.id);
    const hasPremiumAccess = plan !== "FREE" || role === "OWNER" || role === "ADMIN";

    if (!hasPremiumAccess) {
      return NextResponse.json(
        {
          error: "Image editing is a premium feature. Upgrade to Starter or higher.",
          upgradeRequired: true,
        },
        { status: 403 }
      );
    }

    // Atomically check and deduct credits BEFORE processing
    const creditResult = await checkAndDeductCredits(user.id, 1);
    if (!creditResult.success) {
      return NextResponse.json(
        {
          error: "No credits left! Please top up your account.",
          noCredits: true,
        },
        { status: 402 }
      );
    }

    // Parse request
    const body = await request.json();
    const {
      imageUrl,
      editPrompt,
      originalGeneration,
      strength: userStrength,
    } = body;

    // Validation
    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    if (!editPrompt || !editPrompt.trim()) {
      return NextResponse.json(
        { error: "Please describe what you want to change" },
        { status: 400 }
      );
    }

    // Image size validation
    try {
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageSizeMB = imageBuffer.byteLength / (1024 * 1024);

      if (imageSizeMB > 10) {
        return NextResponse.json(
          { error: "Image too large (max 10MB). Please use a smaller image." },
          { status: 400 }
        );
      }
    } catch (sizeError) {
      console.warn("Could not validate image size:", sizeError);
    }

    const trimmedPrompt = editPrompt.trim();

    // Analyze user intent
    const editAnalysis = analyzeEditIntent(trimmedPrompt);

    // Detect item type and find best preset
    const itemType = detectItemType(originalGeneration);
    const { preset, presetName } = findBestPreset(trimmedPrompt);

    // Build prompts
    const strength = userStrength !== undefined ? userStrength : preset.strength;
    const finalPrompt = buildPrompt(trimmedPrompt, preset, itemType, editAnalysis);
    const negativePrompt = buildNegativePrompt(preset, editAnalysis);

    // Get user tier for model selection
    const userTier = getUserTier(plan, role);

    // Logging
    console.log("===========================================");
    console.log("RUNWARE IMAGE EDIT");
    console.log("===========================================");
    console.log("User prompt:", trimmedPrompt);
    console.log("Edit type:", editAnalysis.type);
    console.log("Preset:", presetName || "default");
    console.log("User tier:", userTier);
    console.log("Strength:", strength);
    console.log("Final prompt:", finalPrompt.substring(0, 200) + "...");

    // Run the edit with Runware
    const result = await editImageWithRunware(
      imageUrl,
      finalPrompt,
      negativePrompt,
      strength,
      userTier
    );

    if (!result.success || !result.imageUrl) {
      console.error("Edit failed:", result.error);
      // Refund credit on failure
      await refundCredits(user.id, 1);
      return NextResponse.json(
        { error: result.error || "Edit failed. Please try different instructions. Credit refunded." },
        { status: 500 }
      );
    }

    console.log("Edit succeeded! Uploading to storage...");

    // Upload to permanent storage
    const fileName = `edited-${Date.now()}-${presetName || "custom"}`;
    const uploadResult = await uploadImageToStorage(result.imageUrl, user.id, fileName);

    const finalUrl = uploadResult.success && uploadResult.url ? uploadResult.url : result.imageUrl;

    // Save to database
    const saveResult = await saveGeneration({
      userId: user.id,
      prompt: `[Edited: ${presetName || "custom"}] ${trimmedPrompt}`,
      fullPrompt: finalPrompt,
      categoryId: originalGeneration?.categoryId || "EDITED",
      subcategoryId: originalGeneration?.subcategoryId || "CUSTOM",
      styleId: originalGeneration?.styleId || "PIXEL_ART",
      imageUrl: finalUrl,
      seed: undefined,
    });

    if (!saveResult.success) {
      console.error("Failed to save generation:", saveResult.error);
    }

    // Credits already deducted atomically at the beginning

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("EDIT COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Effect: ${preset.description}`);
    console.log(`Cost: ~$${result.cost?.toFixed(4) || "0.01"}`);
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      generationId: saveResult.generation?.id,
      editInfo: {
        preset: presetName || "custom",
        description: preset.description,
        model: `Runware ${userTier}`,
        duration: `${duration}s`,
        preservedOriginal: editAnalysis.preserveOriginal,
        editType: editAnalysis.type,
        cost: result.cost,
      },
      message: "Image edited and saved to gallery!",
    });
  } catch (error) {
    console.error("Edit image error:", error);
    // Note: We can't easily refund here since we don't know if credits were deducted
    // The checkAndDeductCredits is atomic so if it failed, no credits were deducted
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Edit failed" },
      { status: 500 }
    );
  }
}

// ===========================================
// GET - List available edit presets
// ===========================================

export async function GET() {
  const presets = Object.entries(EDIT_PRESETS).map(([key, preset]) => ({
    id: key,
    keywords: preset.keywords,
    description: preset.description,
    category: preset.category,
    preservesOriginal: preset.preserveShape,
  }));

  const categories = [
    { id: "effects", name: "Effects", icon: "✨", description: "Add visual effects (fire, ice, magic)" },
    { id: "colors", name: "Colors", icon: "🎨", description: "Change colors and materials" },
    { id: "materials", name: "Materials", icon: "💎", description: "Transform material (crystal, wood, bone)" },
    { id: "decorations", name: "Decorations", icon: "⚜️", description: "Add decorations (gems, runes)" },
    { id: "styles", name: "Art Styles", icon: "🖼️", description: "Change art style (pixel, anime, realistic)" },
  ];

  return NextResponse.json({
    presets,
    categories,
    tips: [
      "Adding effects: 'add fire', 'with ice effect', 'give it lightning' - keeps original intact",
      "Changing colors: 'make it gold', 'change to blue' - keeps shape, changes color",
      "Changing materials: 'made of crystal', 'wooden version' - changes texture, keeps shape",
      "Adding decorations: 'add gems', 'with glowing runes' - decorates the original",
      "Style changes: 'pixel art style', 'make it anime' - may change more significantly",
      "To ensure preservation: add 'keep the same shape' or 'don't change the original'",
    ],
    editTypes: [
      { type: "add_effect", description: "Adding effects - preserves original completely" },
      { type: "color_change", description: "Changing colors - preserves shape" },
      { type: "material_change", description: "Changing material - preserves shape" },
      { type: "modify_appearance", description: "General modification - usually preserves original" },
      { type: "change_style", description: "Art style change - may change more" },
      { type: "transform", description: "Transformation - may significantly alter original" },
    ],
    provider: "Runware",
    costPerEdit: "~$0.003-0.01 depending on plan",
  });
}
