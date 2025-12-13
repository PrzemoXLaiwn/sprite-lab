import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import { getUserCredits, deductCredit, saveGeneration } from "@/lib/database";
import { uploadImageToStorage } from "@/lib/storage";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// ===========================================
// MODEL CONFIGURATIONS
// ===========================================

const EDIT_MODELS = {
  // InstructPix2Pix - BEST for instruction-based edits (preserves original)
  instructPix2Pix: {
    version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
    name: "InstructPix2Pix",
    description: "Best for adding effects, changing colors while keeping shape",
    getInput: (imageUrl: string, prompt: string, options: EditOptions) => ({
      image: imageUrl,
      prompt: prompt,
      num_inference_steps: options.quality === "high" ? 75 : options.quality === "medium" ? 50 : 30,
      guidance_scale: options.guidanceScale || 7.5,
      image_guidance_scale: options.imageGuidance || 1.5,
      scheduler: "K_EULER_ANCESTRAL",
    }),
  },

  // SDXL img2img - for style transfers and bigger changes
  sdxlImg2Img: {
    version: "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
    name: "SDXL img2img",
    description: "Better for style changes and more dramatic edits",
    getInput: (imageUrl: string, prompt: string, options: EditOptions) => ({
      image: imageUrl,
      prompt: prompt,
      negative_prompt: options.negativePrompt || "blurry, low quality, distorted, deformed, different weapon, different object, wrong shape, bad anatomy, watermark, signature",
      num_inference_steps: options.quality === "high" ? 50 : options.quality === "medium" ? 35 : 25,
      guidance_scale: options.guidanceScale || 7.5,
      strength: options.strength || 0.4,
      scheduler: "K_EULER",
    }),
  },

  // Kandinsky - good for artistic styles
  kandinsky: {
    version: "65a15f6e3c538ee4adf5142571f42c88e3ade5d94ded1c50eb7e8d44a76df0c9",
    name: "Kandinsky 2.2",
    description: "Great for artistic and painterly effects",
    getInput: (imageUrl: string, prompt: string, options: EditOptions) => ({
      image: imageUrl,
      prompt: prompt,
      negative_prompt: options.negativePrompt || "blurry, low quality",
      num_inference_steps: options.quality === "high" ? 75 : 50,
      guidance_scale: options.guidanceScale || 4,
      strength: options.strength || 0.4,
    }),
  },
};

// ===========================================
// EDIT TYPE DETECTION - CORE LOGIC
// ===========================================

type EditType = "add_effect" | "modify_appearance" | "change_style" | "color_change" | "material_change" | "transform";

interface EditAnalysis {
  type: EditType;
  preserveOriginal: boolean; // TRUE = zachowaj oryginalny kształt/obiekt
  strength: number;
  imageGuidance: number;
  description: string;
}

// Słowa kluczowe wskazujące na DODAWANIE czegoś (zachowaj oryginał)
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

// Słowa kluczowe wskazujące na ZMIANĘ (może zmienić oryginał bardziej)
const CHANGE_KEYWORDS = [
  "change", "zmień", "make", "zrób", "turn into", "zamień na",
  "transform", "przekształć", "convert", "konwertuj",
  "style", "styl", "look", "wygląd",
  "color", "kolor", "recolor",
  "material", "materiał",
  "pixel art", "anime", "realistic", "cartoon",
];

// Słowa kluczowe wskazujące na ZACHOWANIE oryginału
const PRESERVE_KEYWORDS = [
  "keep", "zachowaj", "preserve", "maintain", "same shape", "ten sam kształt",
  "only add", "tylko dodaj", "just add",
  "don't change", "nie zmieniaj",
  "keep the", "zachowaj",
];

/**
 * Analizuje prompt użytkownika i określa typ edycji
 */
function analyzeEditIntent(userPrompt: string): EditAnalysis {
  const lowerPrompt = userPrompt.toLowerCase();
  
  // Sprawdź czy użytkownik chce ZACHOWAĆ oryginał
  const wantsPreserve = PRESERVE_KEYWORDS.some(kw => lowerPrompt.includes(kw));
  
  // Sprawdź czy to DODAWANIE efektu
  const isAddition = ADD_KEYWORDS.some(kw => lowerPrompt.includes(kw));
  
  // Sprawdź czy to ZMIANA/TRANSFORMACJA
  const isChange = CHANGE_KEYWORDS.some(kw => lowerPrompt.includes(kw));
  
  // Określ typ edycji i parametry
  
  // 1. Dodawanie efektów (ogień, lód, magia itp.)
  if (isAddition && !isChange) {
    return {
      type: "add_effect",
      preserveOriginal: true,
      strength: 0.45, // Higher strength for VISIBLE effects
      imageGuidance: 1.8, // Lower to allow effect to show
      description: "Adding effect while preserving original"
    };
  }
  
  // 2. Zmiana koloru
  if (lowerPrompt.match(/\b(gold|silver|blue|red|green|purple|black|white|color|kolor)\b/i)) {
    return {
      type: "color_change",
      preserveOriginal: true,
      strength: 0.35,
      imageGuidance: 1.5,
      description: "Changing color while preserving shape"
    };
  }
  
  // 3. Zmiana materiału
  if (lowerPrompt.match(/\b(crystal|wood|bone|stone|metal|glass|kryształ|drewno|kość|kamień)\b/i)) {
    return {
      type: "material_change",
      preserveOriginal: true,
      strength: 0.4,
      imageGuidance: 1.4,
      description: "Changing material while preserving shape"
    };
  }
  
  // 4. Zmiana stylu (pixel art, anime itp.) - może bardziej zmienić
  if (lowerPrompt.match(/\b(pixel|anime|cartoon|realistic|painted|sketch|chibi)\b/i)) {
    return {
      type: "change_style",
      preserveOriginal: !isChange, // Jeśli wprost mówi "change" to może zmienić więcej
      strength: 0.55,
      imageGuidance: 1.2,
      description: "Converting art style"
    };
  }
  
  // 5. Transformacja (zamień w coś innego) - największa zmiana
  if (lowerPrompt.match(/\b(turn into|transform|convert|zamień|przekształć)\b/i)) {
    return {
      type: "transform",
      preserveOriginal: false,
      strength: 0.6,
      imageGuidance: 1.0,
      description: "Transforming object"
    };
  }
  
  // 6. Domyślnie - zachowaj oryginał z umiarkowaną zmianą
  return {
    type: "modify_appearance",
    preserveOriginal: wantsPreserve || !isChange,
    strength: 0.35,
    imageGuidance: 1.5,
    description: "General modification preserving original"
  };
}

// ===========================================
// EDIT TYPES & PRESETS
// ===========================================

interface EditOptions {
  strength: number;
  guidanceScale: number;
  imageGuidance: number;
  quality: "fast" | "medium" | "high";
  negativePrompt: string;
  preserveShape: boolean;
  preserveColors: boolean;
  preserveStyle: boolean;
}

interface EditPreset {
  keywords: string[];
  model: keyof typeof EDIT_MODELS;
  options: Partial<EditOptions>;
  promptTemplate: string;
  description: string;
  category: "effects" | "colors" | "materials" | "decorations" | "styles";
}

const EDIT_PRESETS: Record<string, EditPreset> = {
  // === EFFECTS (fire, ice, lightning, etc.) - ALWAYS PRESERVE ORIGINAL ===
  // Note: InstructPix2Pix needs higher strength to produce VISIBLE effects
  // image_guidance_scale controls how much to preserve original (higher = more preservation)
  fire: {
    keywords: ["fire", "flame", "flames", "burning", "blaze", "inferno", "ember", "ogień", "płomienie"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45, // Higher strength for visible flames
      imageGuidance: 1.8, // Lower to allow more visible effect
      guidanceScale: 9.0, // Higher text guidance for better instruction following
      preserveShape: true,
    },
    promptTemplate: "add dramatic fire and flames to this {itemType}, blazing fire effect, orange and red flames emanating from the {itemType}, fire burning on the edges, fiery glow, hot embers, keep the exact same {itemType} visible underneath the flames",
    description: "Adds fire/flame effects",
    category: "effects",
  },

  ice: {
    keywords: ["ice", "frost", "frozen", "freezing", "cold", "icy", "glacier", "snow", "crystalline", "lód", "mróz", "zamrożony"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add ice and frost effects to this {itemType}, frozen with ice crystals, blue frost coating, icicles forming on edges, cold mist, crystalline ice texture overlay, keep the same {itemType} shape visible",
    description: "Adds ice/frost effects",
    category: "effects",
  },

  lightning: {
    keywords: ["lightning", "electric", "electricity", "thunder", "spark", "sparks", "voltage", "shock", "błyskawica", "elektryczność"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add electric lightning effects to this {itemType}, blue-white electricity arcing around it, electrical sparks, voltage crackling, glowing electric aura, lightning bolts emanating, keep the original {itemType} shape",
    description: "Adds lightning/electric effects",
    category: "effects",
  },

  magic: {
    keywords: ["magic", "magical", "enchanted", "mystical", "arcane", "spell", "sorcery", "mana", "magia", "magiczny", "zaklęcie"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add magical enchantment effects to this {itemType}, glowing magical runes, mystical purple and blue aura, sparkles and magical particles floating around it, enchanted glow, arcane energy, keep the original {itemType} shape",
    description: "Adds magical/enchanted effects",
    category: "effects",
  },

  glow: {
    keywords: ["glow", "glowing", "luminous", "radiant", "shining", "bright", "light", "neon", "świecenie", "świecący"],
    model: "instructPix2Pix",
    options: {
      strength: 0.40,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "make this {itemType} glow with bright inner light, luminous radiant effect, soft light rays emanating, neon glow, bright shining aura, keep the original shape",
    description: "Adds glowing/luminous effect",
    category: "effects",
  },

  poison: {
    keywords: ["poison", "toxic", "venom", "acid", "corrosive", "dripping", "ooze", "trucizna", "toksyczny", "jad"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add poison and toxic effects to this {itemType}, dripping green venom, toxic fumes rising, acid drops, sickly green glow, poisonous ooze, venomous appearance, keep the original shape",
    description: "Adds poison/toxic effects",
    category: "effects",
  },

  holy: {
    keywords: ["holy", "divine", "sacred", "blessed", "angelic", "celestial", "light", "pure", "święty", "boski", "błogosławiony"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add holy divine light effects to this {itemType}, golden celestial glow, rays of sacred light, angelic aura emanating, blessed radiance, heavenly shine, keep the original shape",
    description: "Adds holy/divine effects",
    category: "effects",
  },

  dark: {
    keywords: ["dark", "shadow", "darkness", "evil", "cursed", "demonic", "void", "corrupt", "ciemny", "mroczny", "przeklęty"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.8,
      guidanceScale: 9.0,
      preserveShape: true,
    },
    promptTemplate: "add dark shadow effects to this {itemType}, dark energy wisps, shadowy aura, void particles swirling, purple-black darkness, evil corrupt glow, demonic energy, keep the original shape",
    description: "Adds dark/shadow effects",
    category: "effects",
  },

  // === COLORS - PRESERVE SHAPE, CHANGE COLOR ===
  gold: {
    keywords: ["gold", "golden", "gilded", "aureate", "złoty", "złoto"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
      preserveStyle: true,
    },
    promptTemplate: "Change this {itemType} to be made of pure gold. Golden metallic color, shiny gold material. Keep the EXACT SAME shape and design, only change to gold color.",
    description: "Changes to gold color",
    category: "colors",
  },

  silver: {
    keywords: ["silver", "chrome", "metallic", "steel", "platinum", "srebrny", "chromowany"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} to polished silver. Shiny chrome metallic surface. Keep the EXACT same shape, only change to silver color.",
    description: "Changes to silver color",
    category: "colors",
  },

  ruby: {
    keywords: ["ruby", "red", "crimson", "scarlet", "blood", "rubin", "czerwony", "szkarłatny"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} color to deep ruby red. Crimson colored, red gemstone material. Keep the EXACT same shape.",
    description: "Changes to red/ruby color",
    category: "colors",
  },

  sapphire: {
    keywords: ["sapphire", "blue", "azure", "cobalt", "navy", "szafir", "niebieski", "lazurowy"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} to sapphire blue color. Deep azure blue, blue gemstone material. Keep the EXACT same shape.",
    description: "Changes to blue/sapphire color",
    category: "colors",
  },

  emerald: {
    keywords: ["emerald", "green", "jade", "verdant", "forest", "szmaragd", "zielony", "jadeit"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} to emerald green. Rich jade green color, green gemstone material. Keep the EXACT same shape.",
    description: "Changes to green/emerald color",
    category: "colors",
  },

  amethyst: {
    keywords: ["amethyst", "purple", "violet", "lavender", "magenta", "ametyst", "fioletowy", "purpurowy"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} to amethyst purple. Deep violet color, purple gemstone material. Keep the EXACT same shape.",
    description: "Changes to purple/amethyst color",
    category: "colors",
  },

  obsidian: {
    keywords: ["obsidian", "black", "onyx", "ebony", "jet", "obsydian", "czarny", "onyks"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Change this {itemType} to black obsidian. Deep black volcanic glass material, dark and sleek. Keep the EXACT same shape.",
    description: "Changes to black/obsidian color",
    category: "colors",
  },

  rainbow: {
    keywords: ["rainbow", "iridescent", "prismatic", "colorful", "multicolor", "chromatic", "tęczowy", "opalizujący"],
    model: "instructPix2Pix",
    options: {
      strength: 0.38,
      imageGuidance: 1.4,
      preserveShape: true,
    },
    promptTemplate: "Make this {itemType} iridescent rainbow colored. Prismatic shifting colors, rainbow reflections. Keep the original shape.",
    description: "Adds rainbow/iridescent effect",
    category: "colors",
  },

  // === MATERIALS - PRESERVE SHAPE ===
  crystal: {
    keywords: ["crystal", "crystalline", "gem", "gemstone", "jewel", "transparent", "glass", "kryształ", "kryształowy", "przezroczysty"],
    model: "instructPix2Pix",
    options: {
      strength: 0.4,
      imageGuidance: 1.4,
      preserveShape: true,
    },
    promptTemplate: "Transform this {itemType} to be made of crystal. Transparent crystalline material, faceted gem surfaces, light refraction. Keep the EXACT same shape.",
    description: "Changes to crystal material",
    category: "materials",
  },

  wood: {
    keywords: ["wood", "wooden", "timber", "oak", "mahogany", "birch", "drewno", "drewniany", "dębowy"],
    model: "instructPix2Pix",
    options: {
      strength: 0.4,
      imageGuidance: 1.4,
      preserveShape: true,
    },
    promptTemplate: "Transform this {itemType} to be made of polished wood. Wood grain texture, carved wooden material. Keep the EXACT same shape.",
    description: "Changes to wooden material",
    category: "materials",
  },

  bone: {
    keywords: ["bone", "skeletal", "ivory", "skull", "osseous", "kość", "kościany", "szkieletowy"],
    model: "instructPix2Pix",
    options: {
      strength: 0.4,
      imageGuidance: 1.4,
      preserveShape: true,
    },
    promptTemplate: "Transform this {itemType} to be made of bone. Ivory white bone material, skeletal texture. Keep the EXACT same shape.",
    description: "Changes to bone material",
    category: "materials",
  },

  stone: {
    keywords: ["stone", "rock", "granite", "marble", "rocky", "kamień", "kamienny", "granitowy", "marmurowy"],
    model: "instructPix2Pix",
    options: {
      strength: 0.4,
      imageGuidance: 1.4,
      preserveShape: true,
    },
    promptTemplate: "Transform this {itemType} to be carved from stone. Rocky granite texture, carved stone material. Keep the EXACT same shape.",
    description: "Changes to stone material",
    category: "materials",
  },

  // === DECORATIONS - ADD TO ORIGINAL ===
  gems: {
    keywords: ["gems", "jewels", "jeweled", "studded", "bejeweled", "encrusted", "klejnoty", "wysadzany"],
    model: "instructPix2Pix",
    options: {
      strength: 0.32,
      imageGuidance: 1.6,
      preserveShape: true,
    },
    promptTemplate: "Add precious gems and jewels to this {itemType}. Embed rubies, sapphires, emeralds, diamonds into the {itemType}. Jewel encrusted decoration. Keep the original shape intact.",
    description: "Adds gems and jewels",
    category: "decorations",
  },

  runes: {
    keywords: ["runes", "runic", "inscribed", "carved", "etched", "symbols", "glyphs", "runy", "runiczny", "wyryty"],
    model: "instructPix2Pix",
    options: {
      strength: 0.3,
      imageGuidance: 1.6,
      preserveShape: true,
    },
    promptTemplate: "Add glowing magical runes to this {itemType}. Ancient runic symbols etched and glowing on the surface, mystical inscriptions. Keep the original shape.",
    description: "Adds glowing runes",
    category: "decorations",
  },

  ornate: {
    keywords: ["ornate", "decorated", "fancy", "elaborate", "detailed", "intricate", "baroque", "ozdobny", "bogato zdobiony"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Make this {itemType} more ornate and decorated. Add intricate filigree, elaborate engravings, fancy decorative details. Keep the overall shape.",
    description: "Makes more ornate/decorated",
    category: "decorations",
  },

  ancient: {
    keywords: ["ancient", "old", "aged", "antique", "weathered", "worn", "rustic", "vintage", "starożytny", "zniszczony", "postarzały"],
    model: "instructPix2Pix",
    options: {
      strength: 0.35,
      imageGuidance: 1.5,
      preserveShape: true,
    },
    promptTemplate: "Make this {itemType} look ancient and weathered. Add rust, wear marks, aged patina, antique appearance. Keep the original shape.",
    description: "Ages/weathers the item",
    category: "decorations",
  },

  pristine: {
    keywords: ["pristine", "new", "clean", "polished", "shiny", "mint", "perfect", "restore", "nowy", "czysty", "wypolerowany"],
    model: "instructPix2Pix",
    options: {
      strength: 0.3,
      imageGuidance: 1.6,
      preserveShape: true,
    },
    promptTemplate: "Make this {itemType} look pristine and brand new. Clean polished surface, shiny and perfect condition. Keep the original shape.",
    description: "Makes pristine/new looking",
    category: "decorations",
  },

  // === STYLE CHANGES - MAY CHANGE MORE ===
  pixelArt: {
    keywords: ["pixel", "pixelart", "pixel art", "8bit", "8-bit", "16bit", "16-bit", "retro"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.55,
      guidanceScale: 8,
      preserveShape: true,
    },
    promptTemplate: "Convert to pixel art style. {itemType}, retro 16-bit pixel art, clean pixels, game sprite style. Maintain the same pose and shape as the original.",
    description: "Converts to pixel art",
    category: "styles",
  },

  realistic: {
    keywords: ["realistic", "photorealistic", "real", "lifelike", "3d render", "rendered", "realistyczny", "fotorealistyczny"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.6,
      guidanceScale: 8,
    },
    promptTemplate: "Convert to photorealistic style. Realistic {itemType}, 3D rendered, physically accurate materials and lighting. Maintain the same pose and shape.",
    description: "Converts to realistic style",
    category: "styles",
  },

  anime: {
    keywords: ["anime", "manga", "japanese", "cel shaded", "cel-shaded"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.55,
      guidanceScale: 8,
    },
    promptTemplate: "Convert to anime style. {itemType} in anime manga art style, cel shaded, clean lines, vibrant colors. Maintain the same pose.",
    description: "Converts to anime style",
    category: "styles",
  },

  cartoon: {
    keywords: ["cartoon", "cartoonish", "toon", "comic", "animated", "kreskówka", "komiksowy"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.55,
      guidanceScale: 8,
    },
    promptTemplate: "Convert to cartoon style. {itemType} as cartoon, bold outlines, bright colors, playful style. Maintain the same shape.",
    description: "Converts to cartoon style",
    category: "styles",
  },

  handDrawn: {
    keywords: ["hand drawn", "handdrawn", "sketch", "sketched", "pencil", "drawn", "illustrated", "szkic", "rysowany"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.55,
      guidanceScale: 7,
    },
    promptTemplate: "Convert to hand drawn sketch style. {itemType} as pencil sketch, hand illustrated, artistic drawing. Maintain the same pose.",
    description: "Converts to hand-drawn style",
    category: "styles",
  },

  painterly: {
    keywords: ["painted", "painterly", "oil painting", "watercolor", "artistic", "brushstrokes", "malowany", "olejny"],
    model: "kandinsky",
    options: {
      strength: 0.5,
      guidanceScale: 5,
    },
    promptTemplate: "Convert to painterly art style. {itemType} as oil painting, visible brushstrokes, artistic painted look. Maintain the same composition.",
    description: "Converts to painterly style",
    category: "styles",
  },

  chibi: {
    keywords: ["chibi", "cute", "kawaii", "adorable", "tiny", "mini", "słodki", "uroczy"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.6,
      guidanceScale: 8,
    },
    promptTemplate: "Convert to cute chibi style. Adorable kawaii {itemType}, big head small body proportions if character, cute anime style.",
    description: "Converts to chibi style",
    category: "styles",
  },

  darkFantasy: {
    keywords: ["dark fantasy", "gothic", "grim", "grimdark", "souls", "soulslike", "eldritch", "mroczne fantasy", "gotycki"],
    model: "sdxlImg2Img",
    options: {
      strength: 0.5,
      guidanceScale: 8,
    },
    promptTemplate: "Convert to dark fantasy style. {itemType} in grimdark gothic style, ominous atmosphere, dark souls aesthetic. Maintain the same shape.",
    description: "Converts to dark fantasy style",
    category: "styles",
  },

  scifi: {
    keywords: ["sci-fi", "scifi", "futuristic", "cyber", "tech", "technological", "neon", "cyberpunk", "futurystyczny"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.3,
    },
    promptTemplate: "Transform into sci-fi futuristic version. {itemType} with technological elements, neon lights, cyberpunk aesthetic, high-tech materials. Keep the general shape.",
    description: "Makes sci-fi/futuristic",
    category: "styles",
  },

  steampunk: {
    keywords: ["steampunk", "clockwork", "brass", "gears", "victorian", "industrial", "zegarkowy", "wiktoriański"],
    model: "instructPix2Pix",
    options: {
      strength: 0.45,
      imageGuidance: 1.3,
    },
    promptTemplate: "Transform into steampunk version. {itemType} with brass gears, clockwork mechanisms, Victorian industrial aesthetic. Keep the general shape.",
    description: "Makes steampunk style",
    category: "styles",
  },
};

// Default preset for unknown edits - PRESERVES ORIGINAL
const DEFAULT_PRESET: EditPreset = {
  keywords: [],
  model: "instructPix2Pix",
  options: {
    strength: 0.3,
    imageGuidance: 1.8,
    preserveShape: true,
  },
  promptTemplate: "Edit this {itemType}: {userPrompt}. Keep the overall shape, style and details intact. Only apply the requested change.",
  description: "General edit (preserves original)",
  category: "effects",
};

// ===========================================
// HELPER FUNCTIONS
// ===========================================

// Detect what type of item is being edited based on original generation
function detectItemType(originalGeneration?: GenerationData): string {
  if (!originalGeneration) return "item";

  const category = originalGeneration.categoryId?.toLowerCase() || "";
  const subcategory = originalGeneration.subcategoryId?.toLowerCase() || "";

  // Map categories to item types
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

  // More specific subcategory mappings
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

  if (subcategoryMap[subcategory]) {
    return subcategoryMap[subcategory];
  }

  if (categoryMap[category]) {
    return categoryMap[category];
  }

  return "item";
}

// Find best matching preset for the user's prompt
function findBestPreset(userPrompt: string): { preset: EditPreset; matchedKeyword: string | null; presetName: string | null } {
  const lowerPrompt = userPrompt.toLowerCase();

  // Score each preset based on keyword matches
  let bestPreset = DEFAULT_PRESET;
  let bestScore = 0;
  let matchedKeyword: string | null = null;
  let presetName: string | null = null;

  for (const [name, preset] of Object.entries(EDIT_PRESETS)) {
    for (const keyword of preset.keywords) {
      if (lowerPrompt.includes(keyword)) {
        // Longer keyword matches are more specific
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestPreset = preset;
          matchedKeyword = keyword;
          presetName = name;
        }
      }
    }
  }

  return { preset: bestPreset, matchedKeyword, presetName };
}

// Build the final prompt with template
function buildPrompt(
  userPrompt: string,
  preset: EditPreset,
  itemType: string,
  originalStyle?: string,
  editAnalysis?: EditAnalysis
): string {
  let prompt = preset.promptTemplate
    .replace(/{itemType}/g, itemType)
    .replace(/{userPrompt}/g, userPrompt);

  // Add style preservation if needed
  if (preset.options.preserveStyle && originalStyle) {
    prompt += ` Maintain the ${originalStyle} art style.`;
  }

  // Wzmocnienie zachowania oryginału jeśli wykryto
  if (editAnalysis?.preserveOriginal) {
    prompt += " IMPORTANT: Keep the original object completely intact, only add the requested effect/change.";
  }

  // Add general quality terms
  prompt += " High quality, detailed, professional game asset.";

  return prompt;
}

// Build negative prompt based on preset and analysis
function buildNegativePrompt(preset: EditPreset, editAnalysis?: EditAnalysis): string {
  const base = "blurry, low quality, distorted, deformed, bad anatomy, watermark, signature, text";

  const additions: string[] = [];

  // Jeśli ma zachować oryginał - dodaj więcej ograniczeń
  if (preset.options.preserveShape || editAnalysis?.preserveOriginal) {
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

  if (preset.options.preserveColors) {
    additions.push("wrong colors", "different colors");
  }

  return [base, ...additions].join(", ");
}

// Get default options merged with preset options and analysis
function getEditOptions(
  preset: EditPreset,
  editAnalysis: EditAnalysis,
  userOptions?: Partial<EditOptions>
): EditOptions {
  const defaults: EditOptions = {
    strength: editAnalysis.strength,
    guidanceScale: 7.5,
    imageGuidance: editAnalysis.imageGuidance,
    quality: "medium",
    negativePrompt: "",
    preserveShape: editAnalysis.preserveOriginal,
    preserveColors: false,
    preserveStyle: false,
  };

  const merged = {
    ...defaults,
    ...preset.options,
    ...userOptions,
  };

  // Zawsze nadpisz negative prompt na podstawie finalnych opcji
  merged.negativePrompt = buildNegativePrompt(preset, editAnalysis);

  return merged;
}

// Run prediction with retry logic
async function runPrediction(
  model: keyof typeof EDIT_MODELS,
  imageUrl: string,
  prompt: string,
  options: EditOptions,
  maxRetries: number = 2
): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const modelConfig = EDIT_MODELS[model];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Attempt ${attempt}/${maxRetries}] Using model: ${modelConfig.name}`);

      const modelInput = modelConfig.getInput(imageUrl, prompt, options);

      const prediction = await replicate.predictions.create({
        version: modelConfig.version,
        input: modelInput,
      });

      // Wait for completion
      let result = await replicate.predictions.get(prediction.id);
      let waitTime = 0;
      const maxWait = 120;

      while (
        (result.status === "starting" || result.status === "processing") &&
        waitTime < maxWait
      ) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        result = await replicate.predictions.get(prediction.id);
        waitTime++;

        if (waitTime % 15 === 0) {
          console.log(`Editing... ${waitTime}s (Status: ${result.status})`);
        }
      }

      if (result.status === "succeeded" && result.output) {
        let editedImageUrl: string | null = null;

        if (Array.isArray(result.output) && result.output.length > 0) {
          editedImageUrl = result.output[0];
        } else if (typeof result.output === "string") {
          editedImageUrl = result.output;
        }

        if (editedImageUrl) {
          return { success: true, imageUrl: editedImageUrl };
        }
      }

      if (result.status === "failed") {
        console.error(`Attempt ${attempt} failed:`, result.error);

        // Last attempt, return error
        if (attempt === maxRetries) {
          return { success: false, error: String(result.error || "Model failed") };
        }

        // Adjust options for retry
        options.strength = Math.min(options.strength + 0.1, 0.6);
        options.imageGuidance = Math.max((options.imageGuidance || 1.5) - 0.2, 1.0);
      }

      if (waitTime >= maxWait) {
        return { success: false, error: "Timeout - please try again" };
      }
    } catch (error) {
      console.error(`Attempt ${attempt} error:`, error);
      if (attempt === maxRetries) {
        return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
      }
    }
  }

  return { success: false, error: "All attempts failed" };
}

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface GenerationData {
  categoryId?: string;
  subcategoryId?: string;
  styleId?: string;
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
    const { plan, role, credits } = await getUserCredits(user.id);
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

    if (credits <= 0) {
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
      // Optional user overrides
      strength: userStrength,
      quality: userQuality,
      preserveShape: userPreserveShape,
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

    const trimmedPrompt = editPrompt.trim();

    // ===========================================
    // CORE LOGIC: Analyze user intent
    // ===========================================
    const editAnalysis = analyzeEditIntent(trimmedPrompt);
    
    // Detect item type and find best preset
    const itemType = detectItemType(originalGeneration);
    const { preset, matchedKeyword, presetName } = findBestPreset(trimmedPrompt);

    // Build options with user overrides (user can override our analysis)
    const userOverrides: Partial<EditOptions> = {};
    if (userStrength !== undefined) userOverrides.strength = userStrength;
    if (userQuality !== undefined) userOverrides.quality = userQuality;
    if (userPreserveShape !== undefined) userOverrides.preserveShape = userPreserveShape;

    const options = getEditOptions(preset, editAnalysis, userOverrides);

    // Build final prompt
    const originalStyle = originalGeneration?.styleId?.replace(/_/g, " ").toLowerCase();
    const finalPrompt = buildPrompt(trimmedPrompt, preset, itemType, originalStyle, editAnalysis);

    // Logging
    console.log("===========================================");
    console.log("SMART IMAGE EDIT");
    console.log("===========================================");
    console.log("User prompt:", trimmedPrompt);
    console.log("Edit Analysis:", JSON.stringify(editAnalysis, null, 2));
    console.log("Detected item type:", itemType);
    console.log("Matched preset:", presetName || "default");
    console.log("Matched keyword:", matchedKeyword || "none");
    console.log("Preset description:", preset.description);
    console.log("Model:", EDIT_MODELS[preset.model].name);
    console.log("Preserve original:", editAnalysis.preserveOriginal);
    console.log("Strength:", options.strength);
    console.log("Image Guidance:", options.imageGuidance);
    console.log("Final prompt:", finalPrompt);
    console.log("Negative prompt:", options.negativePrompt);
    console.log("Image URL:", imageUrl);

    // Run the edit
    const result = await runPrediction(preset.model, imageUrl, finalPrompt, options);

    // If primary model failed, try fallback
    if (!result.success && preset.model !== "sdxlImg2Img") {
      console.log("Primary model failed, trying SDXL fallback...");

      const fallbackOptions = {
        ...options,
        strength: Math.min(options.strength + 0.1, 0.5),
      };

      const fallbackResult = await runPrediction(
        "sdxlImg2Img",
        imageUrl,
        finalPrompt,
        fallbackOptions
      );

      if (fallbackResult.success) {
        result.success = true;
        result.imageUrl = fallbackResult.imageUrl;
      }
    }

    if (!result.success || !result.imageUrl) {
      console.error("Edit failed:", result.error);
      return NextResponse.json(
        { error: result.error || "Edit failed. Please try different instructions." },
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

    // Deduct credit
    await deductCredit(user.id, 1);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log("===========================================");
    console.log("EDIT COMPLETE!");
    console.log(`Duration: ${duration}s`);
    console.log(`Model used: ${EDIT_MODELS[preset.model].name}`);
    console.log(`Effect: ${preset.description}`);
    console.log(`Preserved original: ${editAnalysis.preserveOriginal}`);
    console.log("===========================================");

    return NextResponse.json({
      success: true,
      imageUrl: finalUrl,
      generationId: saveResult.generation?.id,
      editInfo: {
        preset: presetName || "custom",
        description: preset.description,
        model: EDIT_MODELS[preset.model].name,
        duration: `${duration}s`,
        preservedOriginal: editAnalysis.preserveOriginal,
        editType: editAnalysis.type,
      },
      message: "Image edited and saved to gallery!",
    });
  } catch (error) {
    console.error("Edit image error:", error);
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
    preservesOriginal: preset.options.preserveShape ?? true,
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
      "💡 Adding effects: 'add fire', 'with ice effect', 'give it lightning' - keeps original intact",
      "🎨 Changing colors: 'make it gold', 'change to blue' - keeps shape, changes color",
      "💎 Changing materials: 'made of crystal', 'wooden version' - changes texture, keeps shape",
      "✨ Adding decorations: 'add gems', 'with glowing runes' - decorates the original",
      "🖼️ Style changes: 'pixel art style', 'make it anime' - may change more significantly",
      "🔒 To ensure preservation: add 'keep the same shape' or 'don't change the original'",
    ],
    editTypes: [
      { type: "add_effect", description: "Adding effects - preserves original completely" },
      { type: "color_change", description: "Changing colors - preserves shape" },
      { type: "material_change", description: "Changing material - preserves shape" },
      { type: "modify_appearance", description: "General modification - usually preserves original" },
      { type: "change_style", description: "Art style change - may change more" },
      { type: "transform", description: "Transformation - may significantly alter original" },
    ],
  });
}