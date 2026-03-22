// ===========================================
// SPRITELAB - ULTIMATE PROMPT CONFIG
// Version: 4.0
// Purpose:
// - deterministic prompt assembly
// - minimal hallucination / minimal wrong composition
// - strong control over view / style / quality
// - backward compatibility aliases
// - category/subcategory safe resolution
// - UI-ready labels aligned with current app
// ===========================================

import type { SubcategoryPromptConfig } from "../types";

// --------------------------------------------------
// CORE TYPES
// --------------------------------------------------
export type AssetCategory =
  | "WEAPONS"
  | "ARMOR"
  | "CONSUMABLES"
  | "RESOURCES"
  | "CHARACTERS"
  | "CREATURES"
  | "UI_ELEMENTS"
  | "ENVIRONMENT"
  | "QUEST_ITEMS";

export type AssetView =
  | "DEFAULT"
  | "SIDE_VIEW"
  | "FRONT"
  | "TOP_DOWN";

export type AssetQuality = "FAST" | "MEDIUM" | "HD";

export type AssetStyle =
  | "PIXEL_16"
  | "PIXEL_HD"
  | "HAND_PAINTED"
  | "ANIME"
  | "DARK_FANTASY"
  | "CARTOON"
  | "VECTOR"
  | "REALISTIC";

export interface PromptBuildInput {
  category: string;
  subcategory: string;
  style?: string;
  view?: string;
  quality?: string;
  userPrompt?: string;
  element?: string[];
  material?: string[];
  color?: string[];
  extraTags?: string[];
}

export interface PromptBuildResult {
  fullPrompt: string;
  negativePrompt: string;
  debug: {
    resolvedCategory: string;
    resolvedSubcategory: string;
    resolvedStyle: string;
    resolvedView: string;
    resolvedQuality: string;
  };
}

export interface StylePromptConfig {
  positive: string;
  negative: string;
}

export interface ViewPromptConfig {
  positive: string;
  negative: string;
  categoryOverrides?: Partial<Record<AssetCategory, string>>;
  subcategoryOverrides?: Record<string, string>;
}

export interface QualityPromptConfig {
  positive: string;
  negative: string;
}

export interface CategoryMeta {
  label: string;
  description: string;
}

export interface SubcategoryMeta {
  label: string;
}

export interface ExtendedSubcategoryPromptConfig extends SubcategoryPromptConfig {
  // Optional stronger overrides
  viewOverrides?: Partial<Record<AssetView, string>>;
  additionalNegativeByView?: Partial<Record<AssetView, string>>;
}

// --------------------------------------------------
// HELPERS
// --------------------------------------------------
function compact(parts: Array<string | undefined | null | false>): string[] {
  return parts
    .flatMap((part) => String(part ?? "").split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinCsv(parts: Array<string | undefined | null | false>): string {
  return compact(parts).join(", ");
}

function dedupeCsv(parts: Array<string | undefined | null | false>): string {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of compact(parts)) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }

  return out.join(", ");
}

function makeConfig(
  objectType: string,
  visualDesc: string,
  composition: string,
  avoid: string,
  extras?: Partial<ExtendedSubcategoryPromptConfig>
): ExtendedSubcategoryPromptConfig {
  return {
    objectType,
    visualDesc,
    composition,
    avoid,
    ...extras,
  };
}

function normalizeKey(input?: string): string {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s&/-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

// --------------------------------------------------
// GLOBAL RENDER RULES
// --------------------------------------------------
export const GLOBAL_POSITIVE_BASE = dedupeCsv([
  "single isolated game asset",
  "transparent background",
  "centered composition",
  "clear silhouette",
  "clean readable shape",
  "subject fully visible",
  "game-ready asset render",
  "no scene unless explicitly required",
  "icon-like clarity",
  "high subject separation",
]);

export const GLOBAL_NEGATIVE_BASE = dedupeCsv([
  "multiple objects unless explicitly requested",
  "crowd",
  "busy background",
  "environment scene",
  "landscape",
  "cinematic shot",
  "cropped subject",
  "subject cut off by frame",
  "partial object only",
  "tiny subject",
  "off-center composition",
  "text",
  "watermark",
  "logo",
  "caption",
  "UI overlay",
  "mockup",
  "frame unless explicitly requested",
  "hands holding object unless explicitly requested",
  "person wearing or using item unless explicitly requested",
  "photo studio props",
  "random extra objects",
  "duplicate subjects",
]);

// --------------------------------------------------
// VIEW CONFIGS
// Important:
// - DEFAULT = neutral readable product/icon angle
// - SIDE_VIEW = orthographic side/readable profile
// - FRONT = straight front-facing / symmetrical where applicable
// - TOP_DOWN = camera from above, NOT isometric, NOT front
// --------------------------------------------------
export const VIEW_PROMPT_CONFIGS: Record<AssetView, ViewPromptConfig> = {
  DEFAULT: {
    positive: dedupeCsv([
      "neutral readable presentation angle",
      "best angle for readability",
      "full subject clearly shown",
      "game asset showcase view",
    ]),
    negative: dedupeCsv([
      "extreme perspective distortion",
      "dramatic cinematic angle",
      "top-down unless requested",
      "front orthographic unless requested",
      "side orthographic unless requested",
    ]),
  },

  SIDE_VIEW: {
    positive: dedupeCsv([
      "strict side view",
      "profile view",
      "side-facing presentation",
      "orthographic-style readable silhouette",
      "full object visible from one side",
    ]),
    negative: dedupeCsv([
      "front view",
      "top-down view",
      "three-quarter cinematic angle",
      "isometric angle",
      "foreshortening",
    ]),
    categoryOverrides: {
      WEAPONS: "weapon shown from side profile, full length from tip to handle visible",
      ARMOR: "equipment shown from side or slight profile only if side readability is possible",
      UI_ELEMENTS: "flat side-neutral icon presentation, no perspective frame depth",
    },
  },

  FRONT: {
    positive: dedupeCsv([
      "strict front view",
      "straight-on view",
      "front-facing presentation",
      "symmetrical readable layout when applicable",
    ]),
    negative: dedupeCsv([
      "side profile",
      "top-down view",
      "isometric angle",
      "tilted perspective",
      "dynamic camera angle",
    ]),
    categoryOverrides: {
      ARMOR: "front-facing equipment icon presentation",
      CHARACTERS: "full body character facing forward",
      CREATURES: "full body creature facing forward or near-front, readable silhouette",
      UI_ELEMENTS: "flat front-facing interface icon presentation",
    },
  },

  TOP_DOWN: {
    positive: dedupeCsv([
      "true top-down view",
      "camera directly above the subject",
      "bird's-eye asset presentation",
      "top surface visible",
      "not isometric",
      "not side view",
      "not front view",
    ]),
    negative: dedupeCsv([
      "front view",
      "side view",
      "profile view",
      "isometric angle",
      "three-quarter perspective",
      "horizon line",
      "cinematic perspective",
    ]),
    categoryOverrides: {
      WEAPONS: "weapon laid flat and viewed from directly above",
      ARMOR: "equipment laid flat and viewed from directly above like inventory layout",
      CONSUMABLES: "item viewed from above, clearly readable top-down inventory render",
      RESOURCES: "resource item viewed from above, clean top-down game asset",
      UI_ELEMENTS: "flat UI element seen directly from above with no perspective depth",
      QUEST_ITEMS: "quest item laid flat or presented from true top-down view",
    },
    subcategoryOverrides: {
      HEROES: "top-down character sprite orientation, character seen from above, readable for top-down game",
      ENEMIES: "top-down enemy sprite orientation, seen from above, readable for top-down gameplay",
      NPCS: "top-down NPC sprite orientation, seen from above, readable for top-down gameplay",
      BOSSES: "top-down boss sprite orientation, seen from above, readable for top-down gameplay",
      ANIMALS: "animal seen from above, top-down game sprite readability",
      MYTHICAL: "mythical creature seen from above, top-down game sprite readability",
      COMPANIONS: "companion creature seen from above, top-down game sprite readability",
      ELEMENTALS: "elemental seen from above, top-down sprite readability",
      TREES_PLANTS: "vegetation seen from directly above, top canopy readable",
      ROCKS_TERRAIN: "terrain prop seen from directly above",
      BUILDINGS: "building roof-dominant top-down view, not isometric",
      PROPS: "prop seen from directly above, silhouette readable",
      DUNGEON: "dungeon prop seen from directly above, gameplay readability prioritized",
    },
  },
};

// --------------------------------------------------
// STYLE CONFIGS
// --------------------------------------------------
export const STYLE_PROMPT_CONFIGS: Record<AssetStyle, StylePromptConfig> = {
  PIXEL_16: {
    positive: dedupeCsv([
      "16-bit pixel art style",
      "classic retro game asset",
      "clean pixel clusters",
      "low-resolution readability",
      "limited color palette",
      "crisp sprite edges",
      "designed for game sprite use",
    ]),
    negative: dedupeCsv([
      "blurry anti-aliased painting",
      "realistic photo textures",
      "3D render look",
      "high-frequency micro-detail",
      "soft painterly brushwork",
      "vector gradients",
    ]),
  },

  PIXEL_HD: {
    positive: dedupeCsv([
      "HD pixel art style",
      "modern indie pixel asset",
      "higher detail pixel clusters",
      "clean silhouette",
      "pixel-perfect readability",
      "game sprite polish",
    ]),
    negative: dedupeCsv([
      "photo realism",
      "soft painted blur",
      "3D model render look",
      "vector flat icon style",
    ]),
  },

  HAND_PAINTED: {
    positive: dedupeCsv([
      "hand-painted game art style",
      "painterly brushwork",
      "stylized fantasy asset rendering",
      "rich material definition",
      "clean subject readability",
    ]),
    negative: dedupeCsv([
      "pixel art",
      "vector flat icon",
      "photo realism",
      "hard 3D CGI look",
      "messy background scene",
    ]),
  },

  ANIME: {
    positive: dedupeCsv([
      "anime-inspired game asset style",
      "clean stylized linework",
      "controlled cel-shaded rendering",
      "clear readable forms",
    ]),
    negative: dedupeCsv([
      "photo realism",
      "western comic exaggeration",
      "messy painterly texture",
      "pixel art",
    ]),
  },

  DARK_FANTASY: {
    positive: dedupeCsv([
      "dark fantasy aesthetic",
      "grim medieval mood",
      "cold restrained palette",
      "worn believable materials",
      "moody but readable asset design",
    ]),
    negative: dedupeCsv([
      "cute toy-like style",
      "bright cheerful palette",
      "sci-fi neon theme",
      "cartoony comedy look",
    ]),
  },

  CARTOON: {
    positive: dedupeCsv([
      "cartoon game asset style",
      "bold shapes",
      "simplified readable forms",
      "friendly stylization",
      "high clarity silhouette",
    ]),
    negative: dedupeCsv([
      "photo realism",
      "grim dark over-texturing",
      "pixel art",
      "overly detailed gritty rendering",
    ]),
  },

  VECTOR: {
    positive: dedupeCsv([
      "clean vector-like game asset style",
      "flat shapes",
      "minimal controlled detail",
      "high readability",
      "mobile-friendly icon clarity",
    ]),
    negative: dedupeCsv([
      "photo realism",
      "painterly brush texture",
      "pixel art dithering",
      "3D depth-heavy rendering",
    ]),
  },

  REALISTIC: {
    positive: dedupeCsv([
      "realistic game concept asset style",
      "believable materials",
      "accurate lighting on subject",
      "high detail",
      "AAA asset concept clarity",
    ]),
    negative: dedupeCsv([
      "cartoon exaggeration",
      "vector flat simplification",
      "pixel art",
      "anime cel shading",
    ]),
  },
};

// --------------------------------------------------
// QUALITY CONFIGS
// Note:
// quality should influence polish/detail,
// not composition or count of objects
// --------------------------------------------------
export const QUALITY_PROMPT_CONFIGS: Record<AssetQuality, QualityPromptConfig> = {
  FAST: {
    positive: dedupeCsv([
      "simple clean rendering",
      "fast readable asset generation",
      "minimal but clear detail",
    ]),
    negative: dedupeCsv([
      "overly intricate decoration",
      "micro-details everywhere",
      "excessive texture noise",
    ]),
  },

  MEDIUM: {
    positive: dedupeCsv([
      "balanced detail level",
      "clean polished game asset",
      "good material readability",
    ]),
    negative: dedupeCsv([
      "extreme over-detail",
      "visual clutter",
    ]),
  },

  HD: {
    positive: dedupeCsv([
      "high detail polished asset",
      "refined materials",
      "extra surface detail where appropriate",
      "premium concept quality",
    ]),
    negative: dedupeCsv([
      "messy noisy detail",
      "detail that breaks silhouette",
    ]),
  },
};

// --------------------------------------------------
// CATEGORY LABELS / UI METADATA
// --------------------------------------------------
export const CATEGORY_META: Record<AssetCategory, CategoryMeta> = {
  WEAPONS: {
    label: "Weapons",
    description: "Game weapon items and combat equipment.",
  },
  ARMOR: {
    label: "Armor",
    description: "Protective gear and wearable equipment icons.",
  },
  CONSUMABLES: {
    label: "Consumables",
    description: "Potions, food, scrolls and usable pickups.",
  },
  RESOURCES: {
    label: "Resources",
    description: "Crafting materials, ores, gems, plants and drops.",
  },
  CHARACTERS: {
    label: "Characters",
    description: "Heroes, NPCs, enemies and bosses.",
  },
  CREATURES: {
    label: "Creatures",
    description: "Animals, mythical creatures, companions and elementals.",
  },
  UI_ELEMENTS: {
    label: "Icons",
    description: "Game UI icons, slots, buttons, bars, frames and panels.",
  },
  ENVIRONMENT: {
    label: "Environment",
    description: "Props, buildings, trees, dungeon objects and terrain assets.",
  },
  QUEST_ITEMS: {
    label: "Loot",
    description: "Keys, artifacts, containers and collectibles.",
  },
};

// --------------------------------------------------
// SUBCATEGORY LABELS / ALIASES
// --------------------------------------------------
export const SUBCATEGORY_META: Record<string, SubcategoryMeta> = {
  SWORDS: { label: "Swords" },
  AXES_HAMMERS: { label: "Axes & Hammers" },
  POLEARMS: { label: "Polearms" },
  BOWS: { label: "Bows" },
  STAFFS_WANDS: { label: "Staffs & Wands" },
  FIREARMS: { label: "Firearms" },
  THROWING: { label: "Throwing" },

  HELMETS: { label: "Helmets" },
  CHEST_ARMOR: { label: "Chest Armor" },
  SHIELDS: { label: "Shields" },
  GLOVES: { label: "Gloves" },
  BOOTS: { label: "Boots" },
  ACCESSORIES: { label: "Accessories" },

  POTIONS: { label: "Potions" },
  FOOD: { label: "Food" },
  SCROLLS: { label: "Scrolls" },

  GEMS: { label: "Gems" },
  ORES: { label: "Ores" },
  WOOD_STONE: { label: "Wood & Stone" },
  PLANTS: { label: "Plants" },
  MONSTER_PARTS: { label: "Monster Parts" },
  MAGIC_MATERIALS: { label: "Magic Materials" },

  HEROES: { label: "Heroes" },
  ENEMIES: { label: "Enemies" },
  NPCS: { label: "NPCs" },
  BOSSES: { label: "Bosses" },

  ANIMALS: { label: "Animals" },
  MYTHICAL: { label: "Mythical" },
  COMPANIONS: { label: "Companions" },
  ELEMENTALS: { label: "Elementals" },

  ITEM_ICONS: { label: "Item Icons" },
  SKILL_ICONS: { label: "Skill Icons" },
  STATUS_ICONS: { label: "Status Icons" },
  UI_ICONS: { label: "UI Icons" },
  BUTTONS: { label: "Buttons" },
  BARS: { label: "Bars" },
  FRAMES: { label: "Frames" },
  PANELS: { label: "Panels" },
  SLOTS_GRID: { label: "Slots Grid" },

  TREES_PLANTS: { label: "Trees & Plants" },
  ROCKS_TERRAIN: { label: "Rocks & Terrain" },
  BUILDINGS: { label: "Buildings" },
  PROPS: { label: "Props" },
  DUNGEON: { label: "Dungeon" },

  KEYS: { label: "Keys" },
  ARTIFACTS: { label: "Artifacts" },
  CONTAINERS: { label: "Containers" },
  COLLECTIBLES: { label: "Collectibles" },
};

export const CATEGORY_ALIASES: Record<string, AssetCategory> = {
  ICONS: "UI_ELEMENTS",
  UI: "UI_ELEMENTS",
  LOOT: "QUEST_ITEMS",
  QUEST_ITEMS: "QUEST_ITEMS",
  // Old generate page lowercase IDs
  CHARACTERS: "CHARACTERS",
  WEAPONS: "WEAPONS",
  ARMOR: "ARMOR",
  CONSUMABLES: "CONSUMABLES",
  RESOURCES: "RESOURCES",
  CREATURES: "CREATURES",
  ENVIRONMENT: "ENVIRONMENT",
  UI_ELEMENTS: "UI_ELEMENTS",
  // From old data/generate-categories.ts
  ITEMS: "CONSUMABLES",
};

export const SUBCATEGORY_ALIASES: Record<string, string> = {
  AXES: "AXES_HAMMERS",
  HAMMERS: "AXES_HAMMERS",
  AXES_HAMMERS: "AXES_HAMMERS",

  STAFFS: "STAFFS_WANDS",
  WANDS: "STAFFS_WANDS",
  STAFFS_WANDS: "STAFFS_WANDS",

  GUNS: "FIREARMS",
  FIREARMS: "FIREARMS",

  PETS: "COMPANIONS",
  COMPANIONS: "COMPANIONS",

  ICONS_UI: "UI_ICONS",
  UI_ICONS: "UI_ICONS",

  INVENTORY: "SLOTS_GRID",
  SLOTS: "SLOTS_GRID",
  SLOTS_GRID: "SLOTS_GRID",
};

// --------------------------------------------------
// PROMPT CONFIGS - WEAPONS
// --------------------------------------------------
export const WEAPONS_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  SWORDS: makeConfig(
    "((ONE single sword weapon)), isolated game item sprite",
    "long metal blade with handle grip, crossguard or tsuba, pommel end, sharp cutting edge, weapon loot drop style",
    "((ONLY ONE sword)), single isolated sword shown flat or slight angle, full blade visible from tip to pommel, weapon displayed as single game item icon, centered on transparent background",
    "multiple swords, many swords, sword collection, weapon set, sprite sheet, weapon grid, broken blade, hand holding it, sword in stone, sheathed in scabbard, combat scene, different swords, variety of weapons, smooth shading, realistic metal, anti-aliasing, 3D render, gradient"
  ),

  AXES_HAMMERS: makeConfig(
    "one single melee weapon, either axe or hammer based on user description",
    "heavy weapon head on sturdy handle, axe blade or hammer head, reinforced striking design",
    "single isolated weapon shown clearly, full head and handle visible, centered game item presentation",
    "multiple weapons, weapon rack, collection, hand holding it, blacksmith scene, broken handle, mixed weapon set"
  ),

  POLEARMS: makeConfig(
    "one single polearm weapon",
    "long shaft weapon with spearhead, halberd blade, glaive edge, or pointed tip",
    "single isolated polearm, full length visible from tip to butt end, readable centered presentation",
    "multiple spears, group of weapons, soldier holding it, battle scene, broken shaft, head without shaft"
  ),

  BOWS: makeConfig(
    "one single bow weapon",
    "curved limbs, bowstring, wooden or composite construction",
    "single isolated bow, full curve and string visible, no arrow nocked unless requested",
    "multiple bows, quiver, archer, drawn bow, firing scene, bow set"
  ),

  STAFFS_WANDS: makeConfig(
    "one single magical staff or wand",
    "magic channeling focus, wood or metal shaft, crystal or orb or carved magical headpiece",
    "single isolated magical focus item, fully visible, centered, clear magical identity",
    "multiple staffs, wizard holding it, walking stick without magical identity, spell scene, broken staff"
  ),

  FIREARMS: makeConfig(
    "one single firearm weapon",
    "barrel, grip, trigger mechanism, compact or long-ranged gun silhouette, game-ready readable weapon design",
    "single isolated firearm shown clearly from readable angle, full weapon visible, centered",
    "multiple guns, ammo spread, hand holding it, firing scene, muzzle flash, holster, weapon wall"
  ),

  THROWING: makeConfig(
    "one single throwing weapon",
    "throwing knife, shuriken, kunai, dart, or similar compact throwable weapon",
    "single isolated throwing weapon, full silhouette visible, centered, readable as one item",
    "multiple shurikens, volley of weapons, hand throwing it, target impact, motion blur scene"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - ARMOR
// --------------------------------------------------
export const ARMOR_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  HELMETS: makeConfig(
    "((isolated helmet equipment icon)), game inventory helmet item, loot drop helmet",
    "ISOLATED helmet as standalone inventory icon, empty hollow helmet like RPG loot drop, game item pickup style, ((NO HEAD OR FACE INSIDE)), ((NO BODY PARTS))",
    "((ONLY ONE helmet)), single empty helmet displayed as game item icon, ((COMPLETELY EMPTY INSIDE - NO HEAD)), helmet floating as inventory loot, front or 3/4 view, centered on transparent background",
    "head inside helmet, face visible, eyes visible, neck attached, person wearing it, mannequin head, body parts, multiple helmets, worn helmet, helmet on head, human head, skull inside, horns unless requested, portrait, character body"
  ),

  CHEST_ARMOR: makeConfig(
    "((isolated chest armor equipment icon)), game inventory armor item, loot drop breastplate",
    "ISOLATED chest armor as standalone inventory icon, empty breastplate or chest piece, ((NO BODY OR TORSO INSIDE)), game item pickup style",
    "((ONLY ONE chest armor)), single empty chest armor displayed as equipment icon on transparent background, ((COMPLETELY EMPTY - NO TORSO)), armor floating as inventory loot, front view",
    "person wearing armor, body inside armor, torso inside, arms attached, mannequin body, skin visible, full character, human form, multiple armors, character wearing armor"
  ),

  SHIELDS: makeConfig(
    "isolated shield equipment icon",
    "single standalone shield, defensive gear, clear face design, usable game equipment item",
    "single shield fully visible from readable angle, centered, no hand or arm",
    "hand holding shield, arm attached, warrior using shield, multiple shields, shield wall, battle scene"
  ),

  GLOVES: makeConfig(
    "isolated gloves equipment icon",
    "pair of empty gloves or gauntlets, standalone wearable item, inventory presentation",
    "single pair of gloves shown as one equipment item, empty inside, readable and centered",
    "hands inside gloves, arms attached, skin, worn on person, mannequin hands, multiple glove pairs"
  ),

  BOOTS: makeConfig(
    "isolated boots equipment icon",
    "pair of empty boots, standalone wearable footwear item, inventory presentation",
    "single pair of boots shown as one equipment item, empty inside, readable and centered",
    "legs inside boots, feet visible, worn on person, mannequin legs, skin, multiple pairs"
  ),

  ACCESSORIES: makeConfig(
    "isolated accessory equipment icon",
    "single wearable accessory item such as ring, amulet, belt, cape clasp, bracelet, charm",
    "single standalone accessory item, centered inventory style presentation, not worn on a body",
    "person wearing item, neck with amulet, finger with ring, full outfit, character, accessory set"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - CONSUMABLES
// --------------------------------------------------
export const CONSUMABLES_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  POTIONS: makeConfig(
    "((ONE single potion bottle)), isolated game item sprite",
    "glass flask or bottle containing colored magical liquid, cork or cap stopper, alchemy-style consumable item, game loot drop presentation",
    "((ONLY ONE potion bottle)), single upright potion bottle centered on transparent background, full bottle visible including stopper and liquid inside, inventory item style",
    "multiple potions, many bottles, potion set, potion shelf, potion shop, hand holding it, spilled liquid, empty bottle, brewing scene, cauldron, table with potions, background scene, extra bottles, potion collection, scattered items"
  ),

  FOOD: makeConfig(
    "single food item",
    "game consumable food such as bread, meat, fruit, cheese, stew bowl or ration item depending on request",
    "single isolated food item, centered, readable as one pickup or consumable",
    "banquet table, multiple food items, person eating, restaurant scene, rotten food unless requested"
  ),

  SCROLLS: makeConfig(
    "single magic or quest scroll",
    "rolled parchment scroll, ribbon or wax seal, arcane markings or mystical script if appropriate",
    "single isolated scroll, rolled or slightly unrolled, fully visible, centered",
    "stack of scrolls, open book, library scene, torn burnt paper unless requested"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - RESOURCES
// --------------------------------------------------
export const RESOURCES_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  GEMS: makeConfig(
    "((ONE single gemstone)), isolated game resource item sprite",
    "cut precious gem with clear facets catching light, strong internal shine, readable game crafting material, loot drop style",
    "((ONLY ONE gemstone)), single centered gem on transparent background, full crystal visible, not mounted in jewelry, game item icon presentation",
    "pile of gems, multiple gemstones, gem collection, ring, necklace, jewelry setting, mine scene, cave background, treasure chest, scattered gems, gem pile, uncut ore unless requested"
  ),

  ORES: makeConfig(
    "single ore resource chunk",
    "rough ore rock with embedded mineral veins or valuable material",
    "single rough ore chunk, centered, readable natural silhouette",
    "multiple ore chunks, ingot, refined metal bar, mining scene, rock pile"
  ),

  WOOD_STONE: makeConfig(
    "single raw material resource",
    "natural wood log, timber chunk, stone block, rock piece, or similar raw crafting material depending on request",
    "single isolated material piece, centered, readable natural texture",
    "multiple logs, forest scene, quarry scene, lumber stack, wall made of stone"
  ),

  PLANTS: makeConfig(
    "single herb or plant resource",
    "harvestable plant, herb, flower, mushroom, root or magical flora item",
    "single isolated plant resource, centered, roots or stem visible when useful",
    "garden scene, potted plant, bouquet, multiple species mixed together, landscape"
  ),

  MONSTER_PARTS: makeConfig(
    "single monster drop resource",
    "one creature-derived crafting component such as fang, claw, scale, horn fragment, feather, shell or eye depending on request",
    "single isolated monster part, centered, readable as one loot drop item",
    "full monster, gore scene, pile of body parts, blood pool, hunting scene, complete skeleton"
  ),

  MAGIC_MATERIALS: makeConfig(
    "single magical crafting material",
    "mana crystal, soul shard, glowing orb, enchanted dust cluster, magical essence item",
    "single isolated magical material item, centered, clearly magical and readable",
    "wizard casting scene, container full of materials, multiple items scattered, spell explosion"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - CHARACTERS
// --------------------------------------------------
export const CHARACTERS_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  HEROES: makeConfig(
    "((EXACTLY ONE single hero character)), isolated game character sprite",
    "playable hero-type character with equipment ONLY if explicitly requested, archetype must match user description exactly, wizard = robed mage with staff, knight = armored warrior, rogue = leather hood daggers",
    "((ONLY ONE character)), single full body character on transparent background, isolated, readable silhouette, neutral standing pose, no extra gear beyond the request",
    "multiple characters, party scene, two or more people, portrait close-up only, background environment, wrong class gear, extra armor or crown unless requested, companion, duplicate, group, crowd",
    {
      viewOverrides: {
        FRONT: "single full body hero character facing directly forward, readable symmetrical front-facing sprite or concept presentation",
        TOP_DOWN: "single top-down hero character sprite, seen from directly above, readable for top-down gameplay",
      },
    }
  ),

  ENEMIES: makeConfig(
    "((EXACTLY ONE single enemy character)), isolated game character sprite",
    "hostile enemy creature or humanoid foe, threatening menacing appearance, combat ready stance, design based on user request",
    "((ONLY ONE enemy)), single full body enemy character on transparent background, isolated, clear readable combat-ready posture",
    "enemy group, multiple enemies, swarm, hero fighting it, background scene, corpse, defeated pose, cropped figure, companion, duplicate",
    {
      viewOverrides: {
        FRONT: "single full body enemy facing forward, readable silhouette",
        TOP_DOWN: "single top-down enemy sprite, seen from directly above, readable for top-down gameplay",
      },
    }
  ),

  NPCS: makeConfig(
    "single NPC character",
    "non-playable character such as merchant, villager, guard, blacksmith, priest, scholar or quest giver based on request",
    "single full body NPC, isolated, neutral readable pose, no scene clutter",
    "multiple NPCs, town crowd, shop background, dialogue window, portrait only",
    {
      viewOverrides: {
        FRONT: "single full body NPC facing forward, readable and neutral front-facing presentation",
        TOP_DOWN: "single top-down NPC sprite, seen from directly above, readable for top-down gameplay",
      },
    }
  ),

  BOSSES: makeConfig(
    "single boss character",
    "large unique boss enemy with strong silhouette and memorable presence",
    "single full body boss, isolated, complete form visible, dominant readable design",
    "minions, arena scene, boss UI, health bars, defeated boss, multiple bosses",
    {
      viewOverrides: {
        FRONT: "single full body boss facing forward, readable imposing front-facing presentation",
        TOP_DOWN: "single top-down boss sprite, seen from directly above, readable for top-down gameplay",
      },
    }
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - CREATURES
// --------------------------------------------------
export const CREATURES_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  ANIMALS: makeConfig(
    "((ONE single animal creature)), isolated game sprite",
    "one animal based on user request, stylized game creature design, complete body with all limbs visible",
    "((ONLY ONE animal)), single full body animal on transparent background, isolated, readable silhouette, complete body visible from nose to tail",
    "animal herd, rider, landscape scene, dead animal, cropped body"
  ),

  MYTHICAL: makeConfig(
    "single mythical creature",
    "legendary creature such as dragon, griffin, phoenix, unicorn, hydra or other mythic beast depending on request",
    "single full body mythical creature, isolated, readable shape and defining anatomy visible",
    "multiple creatures, rider on creature, battle scene, hatchling only unless requested, dead version"
  ),

  COMPANIONS: makeConfig(
    "single companion creature",
    "friendly pet or companion creature suitable for game sidekick or summon role",
    "single full body companion, isolated, readable cute or loyal silhouette",
    "multiple pets, owner with companion, pet shop scene, sad injured animal, crowded scene"
  ),

  ELEMENTALS: makeConfig(
    "single elemental creature",
    "creature made from a dominant element such as fire, ice, water, stone, lightning, shadow or nature depending on request",
    "single full form elemental, isolated, clearly readable as one element-based being",
    "wizard summoning it, mixed elements without request, environment scene, multiple elementals"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - UI ELEMENTS
// --------------------------------------------------
export const UI_ELEMENTS_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  ITEM_ICONS: makeConfig(
    "((ONE single inventory item icon)), game UI icon sprite",
    "one bold item icon rendered as square game icon, simplified readable shape, high contrast, RPG loot icon style, item fills 80% of frame",
    "((ONLY ONE icon)), single centered item icon on transparent background, square format, item fills most of frame, no frame border, no background elements, readable at 32x32 pixels",
    "inventory grid, multiple icons, icon sheet, icon collection, icon set, full scene, tiny object in corner, character holding item, UI frame around it, slot borders, grid layout, realistic photo style, cluttered composition"
  ),

  SKILL_ICONS: makeConfig(
    "single skill icon",
    "one symbolic ability icon, readable as a clean game skill symbol, not a scene",
    "single centered icon, symbol fills most of frame, transparent background, small-size readability",
    "character casting spell, multiple icons, full combat scene, spellbook page, UI bar strip"
  ),

  STATUS_ICONS: makeConfig(
    "single status icon",
    "one compact symbolic buff or debuff icon, very readable, flat badge-like design",
    "single centered icon, clear simple status symbol, transparent background, tiny-size readability",
    "character affected by status, multiple icons, potion bottle unless requested, full scene, tooltip"
  ),

  UI_ICONS: makeConfig(
    "single UI navigation icon",
    "one clean interface symbol such as gear, bag, map pin, sword, shield, chat, mail, home",
    "single centered interface icon, transparent background, very readable at small size",
    "icon set, full menu, text label, realistic illustration, screenshot UI"
  ),

  BUTTONS: makeConfig(
    "single UI button element",
    "clean game button shape, clickable appearance, empty textless button unless user requests label",
    "single centered button, readable shape, no full menu around it",
    "full menu screen, cursor click scene, multiple buttons panel, text unless requested"
  ),

  BARS: makeConfig(
    "single UI bar element",
    "single progress bar such as health, mana, stamina, xp or loading bar",
    "single horizontal UI bar, centered, readable frame and fill",
    "full HUD, multiple bars at once, portrait attached, full screen interface"
  ),

  FRAMES: makeConfig(
    "single UI frame element",
    "decorative border or scalable UI frame for menus and windows",
    "single centered frame only, border visible, interior empty",
    "menu content inside, stacked windows, text, buttons, full interface"
  ),

  PANELS: makeConfig(
    "single UI panel element",
    "game UI panel or window with internal organization, sections or layout structure",
    "single centered panel, readable internal structure, empty content areas",
    "items filling the panel, full interface screen, character equipment screen, multiple windows"
  ),

  SLOTS_GRID: makeConfig(
    "empty inventory slot grid",
    "one empty slot or organized empty grid of square item slots, no items inside",
    "empty bordered slot layout, centered, clean grid structure, readable spacing",
    "items inside slots, full inventory screen, character paperdoll equipment screen, messy scattered slots"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - ENVIRONMENT
// --------------------------------------------------
export const ENVIRONMENT_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  TREES_PLANTS: makeConfig(
    "((ONE single vegetation prop)), isolated game environment asset",
    "one placeable environment plant asset such as tree, bush, shrub, flower patch, cactus or fungus depending on request, game prop style",
    "((ONLY ONE plant/tree)), single isolated vegetation asset on transparent background, complete form from ground to top visible, grounded readable silhouette, centered",
    "forest scene, landscape, multiple trees, multiple species mixed together, character next to tree, garden scene, many plants, row of trees"
  ),

  ROCKS_TERRAIN: makeConfig(
    "single terrain prop",
    "one environment terrain asset such as rock, boulder, crystal cluster, stump, mound, cliff fragment or ground feature",
    "single isolated terrain prop, readable natural shape, centered and complete",
    "mountain landscape, quarry scene, multiple random rocks, character climbing it"
  ),

  BUILDINGS: makeConfig(
    "((ONE single building)), isolated game environment asset",
    "one placeable building asset such as house, hut, tower, cabin, forge, temple, shop or ruin depending on request, complete structure with roof and walls",
    "((ONLY ONE building)), single isolated building exterior on transparent background, complete structure visible from ground to roof, centered, no surrounding town or landscape",
    "city block, town scene, interior view, multiple buildings, street scene, characters around building, neighborhood, landscape background, sky background",
    {
      viewOverrides: {
        TOP_DOWN: "single building viewed from directly above, roof-dominant top-down game asset, not isometric",
        FRONT: "single building shown from straight front view, readable facade and full structure",
      },
    }
  ),

  PROPS: makeConfig(
    "single environment prop",
    "one placeable prop such as barrel, crate, chair, table, signpost, torch, altar, campfire, lamp or similar object",
    "single isolated prop, complete object visible, centered game-ready presentation",
    "room scene, prop collection, character using it, storefront display"
  ),

  DUNGEON: makeConfig(
    "single dungeon prop",
    "one dungeon-related gameplay asset such as trap, lever, gate, altar, cage, brazier, obelisk or ritual object",
    "single isolated dungeon prop, centered, functional gameplay-readability prioritized",
    "whole dungeon room, multiple traps, character triggering it, labyrinth scene"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - QUEST ITEMS / LOOT
// --------------------------------------------------
export const QUEST_ITEMS_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  KEYS: makeConfig(
    "single key item",
    "one special key with distinct silhouette and decorative design, fantasy or game loot style",
    "single isolated key, fully visible from bow to teeth, centered",
    "keyring with many keys, lock and door scene, hand holding key, plain modern house key unless requested"
  ),

  ARTIFACTS: makeConfig(
    "single artifact item",
    "one unique relic or magical artifact, powerful and special-looking, design driven by request",
    "single isolated artifact, centered, complete item visible, mysterious but readable",
    "artifact collection, museum scene, hand holding it, shattered fragments unless requested"
  ),

  CONTAINERS: makeConfig(
    "single loot container item",
    "one container such as chest, box, satchel, urn, crate or magical vessel depending on request",
    "single isolated closed container, centered, complete silhouette visible",
    "multiple containers, open chest with loot explosion, storage room scene, hand opening it"
  ),

  COLLECTIBLES: makeConfig(
    "single collectible item",
    "one collectible such as coin, token, medal, badge, emblem, trophy or unique pickup item",
    "single isolated collectible, centered, readable and valuable-looking",
    "pile of coins, display shelf, hand holding item, multiple collectibles"
  ),
};

// --------------------------------------------------
// COMBINED CATEGORY CONFIGS
// --------------------------------------------------
export const CATEGORY_PROMPT_CONFIGS: Record<AssetCategory, Record<string, ExtendedSubcategoryPromptConfig>> = {
  WEAPONS: WEAPONS_PROMPT_CONFIG,
  ARMOR: ARMOR_PROMPT_CONFIG,
  CONSUMABLES: CONSUMABLES_PROMPT_CONFIG,
  RESOURCES: RESOURCES_PROMPT_CONFIG,
  CHARACTERS: CHARACTERS_PROMPT_CONFIG,
  CREATURES: CREATURES_PROMPT_CONFIG,
  UI_ELEMENTS: UI_ELEMENTS_PROMPT_CONFIG,
  ENVIRONMENT: ENVIRONMENT_PROMPT_CONFIG,
  QUEST_ITEMS: QUEST_ITEMS_PROMPT_CONFIG,
};

// --------------------------------------------------
// BASE CATEGORY DESCRIPTIONS
// --------------------------------------------------
export const CATEGORY_BASE_DESCRIPTIONS: Record<AssetCategory, string> = {
  WEAPONS: "game weapon item, isolated combat asset, readable equipment design",
  ARMOR: "game armor equipment, isolated wearable item icon, loot-style presentation",
  CONSUMABLES: "game consumable item, isolated pickup asset, usable inventory object",
  RESOURCES: "game crafting resource, isolated material drop, readable inventory item",
  CHARACTERS: "game character asset, isolated full-body figure, gameplay-readable silhouette",
  CREATURES: "game creature asset, isolated full-body monster or animal, readable silhouette",
  UI_ELEMENTS: "game UI graphic element, isolated interface asset, readable small-size design",
  ENVIRONMENT: "game environment prop, isolated placeable world object, clean asset presentation",
  QUEST_ITEMS: "game loot or quest item, isolated important pickup object, readable collectible design",
};

// --------------------------------------------------
// RESOLVERS
// --------------------------------------------------
export function resolveCategoryKey(category: string): AssetCategory | undefined {
  const normalized = normalizeKey(category);
  return CATEGORY_ALIASES[normalized] ?? (normalized as AssetCategory);
}

export function resolveSubcategoryKey(subcategory: string): string {
  const normalized = normalizeKey(subcategory);
  return SUBCATEGORY_ALIASES[normalized] ?? normalized;
}

export function resolveStyleKey(style?: string): AssetStyle {
  const normalized = normalizeKey(style) || "PIXEL_16";
  const map: Record<string, AssetStyle> = {
    // Canonical names
    PIXEL_16: "PIXEL_16",
    PIXEL16: "PIXEL_16",
    PIXEL_HD: "PIXEL_HD",
    PIXELHD: "PIXEL_HD",
    HAND_PAINTED: "HAND_PAINTED",
    HANDPAINTED: "HAND_PAINTED",
    ANIME: "ANIME",
    DARK_FANTASY: "DARK_FANTASY",
    DARKFANTASY: "DARK_FANTASY",
    CARTOON: "CARTOON",
    VECTOR: "VECTOR",
    REALISTIC: "REALISTIC",
    // Aliases from STYLES_2D_FULL (src/config/styles/styles-2d.ts)
    PIXEL_ART_16: "PIXEL_16",
    PIXELART16: "PIXEL_16",
    PIXEL_ART_32: "PIXEL_HD",
    PIXELART32: "PIXEL_HD",
    VECTOR_CLEAN: "VECTOR",
    VECTORCLEAN: "VECTOR",
    ANIME_GAME: "ANIME",
    ANIMEGAME: "ANIME",
    CARTOON_WESTERN: "CARTOON",
    CARTOONWESTERN: "CARTOON",
    DARK_SOULS: "DARK_FANTASY",
    DARKSOULS: "DARK_FANTASY",
    CHIBI_CUTE: "CARTOON",
    CHIBICUTE: "CARTOON",
    REALISTIC_PAINTED: "REALISTIC",
    REALISTICPAINTED: "REALISTIC",
    // Isometric styles map to PIXEL_16 for prompt purposes (iso view handled separately)
    ISOMETRIC: "PIXEL_16",
    ISOMETRIC_PIXEL: "PIXEL_16",
    ISOMETRICPIXEL: "PIXEL_16",
    ISOMETRIC_CARTOON: "CARTOON",
    ISOMETRICCARTOON: "CARTOON",
    // Frontend generate page IDs (lowercase kebab)
    PIXEL_16_BIT: "PIXEL_16",
    PIXEL_HD_2: "PIXEL_HD",
  };

  return map[normalized] ?? "PIXEL_16";
}

export function resolveViewKey(view?: string): AssetView {
  const normalized = normalizeKey(view) || "DEFAULT";
  const map: Record<string, AssetView> = {
    DEFAULT: "DEFAULT",
    SIDE_VIEW: "SIDE_VIEW",
    SIDEVIEW: "SIDE_VIEW",
    SIDE: "SIDE_VIEW",
    FRONT: "FRONT",
    TOP_DOWN: "TOP_DOWN",
    TOPDOWN: "TOP_DOWN",
    TOP: "TOP_DOWN",
  };

  return map[normalized] ?? "DEFAULT";
}

export function resolveQualityKey(quality?: string): AssetQuality {
  const normalized = normalizeKey(quality) || "MEDIUM";
  const map: Record<string, AssetQuality> = {
    FAST: "FAST",
    MEDIUM: "MEDIUM",
    HD: "HD",
  };

  return map[normalized] ?? "MEDIUM";
}

export function getPromptConfig(
  category: string,
  subcategory: string
): ExtendedSubcategoryPromptConfig | undefined {
  const resolvedCategory = resolveCategoryKey(category);
  if (!resolvedCategory) return undefined;

  const categoryConfig = CATEGORY_PROMPT_CONFIGS[resolvedCategory];
  if (!categoryConfig) return undefined;

  const resolvedSubcategory = resolveSubcategoryKey(subcategory);
  return categoryConfig[resolvedSubcategory];
}

// --------------------------------------------------
// TOKEN TAG NORMALIZATION
// --------------------------------------------------
export function normalizeTagList(values?: string[]): string[] {
  return (values ?? [])
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function buildTagPrompt(
  label: string,
  values?: string[]
): string {
  const clean = normalizeTagList(values);
  if (!clean.length) return "";
  return `${label}: ${clean.join(", ")}`;
}

// --------------------------------------------------
// VIEW APPLICATION
// Order of precedence:
// 1. subcategory.viewOverrides[view]
// 2. view.subcategoryOverrides[subcategory]
// 3. view.categoryOverrides[category]
// 4. view.positive
// --------------------------------------------------
export function getViewPositive(
  category: AssetCategory,
  subcategory: string,
  config: ExtendedSubcategoryPromptConfig,
  view: AssetView
): string {
  const subOverride = config.viewOverrides?.[view];
  if (subOverride) return subOverride;

  const viewConfig = VIEW_PROMPT_CONFIGS[view];
  const subcategoryOverride = viewConfig.subcategoryOverrides?.[subcategory];
  if (subcategoryOverride) return subcategoryOverride;

  const categoryOverride = viewConfig.categoryOverrides?.[category];
  if (categoryOverride) return categoryOverride;

  return viewConfig.positive;
}

export function getViewNegative(
  config: ExtendedSubcategoryPromptConfig,
  view: AssetView
): string {
  return dedupeCsv([
    VIEW_PROMPT_CONFIGS[view].negative,
    config.additionalNegativeByView?.[view],
  ]);
}

// --------------------------------------------------
// MAIN PROMPT BUILDER
// --------------------------------------------------
export function buildAssetPrompt(input: PromptBuildInput): PromptBuildResult {
  const resolvedCategory = resolveCategoryKey(input.category);
  if (!resolvedCategory) {
    throw new Error(`Unknown category: ${input.category}`);
  }

  const resolvedSubcategory = resolveSubcategoryKey(input.subcategory);
  const config = getPromptConfig(resolvedCategory, resolvedSubcategory);

  if (!config) {
    throw new Error(
      `Missing prompt config for ${resolvedCategory}.${resolvedSubcategory}`
    );
  }

  const resolvedStyle = resolveStyleKey(input.style);
  const resolvedView = resolveViewKey(input.view);
  const resolvedQuality = resolveQualityKey(input.quality);

  const categoryBase = CATEGORY_BASE_DESCRIPTIONS[resolvedCategory];
  const styleConfig = STYLE_PROMPT_CONFIGS[resolvedStyle];
  const qualityConfig = QUALITY_PROMPT_CONFIGS[resolvedQuality];

  const elementPrompt = buildTagPrompt("elemental theme", input.element);
  const materialPrompt = buildTagPrompt("materials", input.material);
  const colorPrompt = buildTagPrompt("colors", input.color);
  const extraTagsPrompt = normalizeTagList(input.extraTags).join(", ");

  const viewPositive = getViewPositive(
    resolvedCategory,
    resolvedSubcategory,
    config,
    resolvedView
  );
  const viewNegative = getViewNegative(config, resolvedView);

  const fullPrompt = dedupeCsv([
    GLOBAL_POSITIVE_BASE,
    categoryBase,
    config.objectType,
    config.visualDesc,
    config.composition,
    viewPositive,
    styleConfig.positive,
    qualityConfig.positive,
    elementPrompt,
    materialPrompt,
    colorPrompt,
    extraTagsPrompt,
    input.userPrompt,
  ]);

  const negativePrompt = dedupeCsv([
    GLOBAL_NEGATIVE_BASE,
    config.avoid,
    viewNegative,
    styleConfig.negative,
    qualityConfig.negative,
  ]);

  return {
    fullPrompt,
    negativePrompt,
    debug: {
      resolvedCategory,
      resolvedSubcategory,
      resolvedStyle,
      resolvedView,
      resolvedQuality,
    },
  };
}

// --------------------------------------------------
// VALIDATION
// --------------------------------------------------
export function validatePromptConfigs(): string[] {
  const errors: string[] = [];

  for (const [category, configMap] of Object.entries(CATEGORY_PROMPT_CONFIGS)) {
    if (!CATEGORY_BASE_DESCRIPTIONS[category as AssetCategory]) {
      errors.push(`Missing CATEGORY_BASE_DESCRIPTIONS entry for ${category}`);
    }

    for (const [subcategory, config] of Object.entries(configMap)) {
      if (!config.objectType?.trim()) {
        errors.push(`${category}.${subcategory}: missing objectType`);
      }
      if (!config.visualDesc?.trim()) {
        errors.push(`${category}.${subcategory}: missing visualDesc`);
      }
      if (!config.composition?.trim()) {
        errors.push(`${category}.${subcategory}: missing composition`);
      }
      if (!config.avoid?.trim()) {
        errors.push(`${category}.${subcategory}: missing avoid`);
      }

      if (config.viewOverrides) {
        for (const [viewKey, value] of Object.entries(config.viewOverrides)) {
          if (!value?.trim()) {
            errors.push(`${category}.${subcategory}: empty view override for ${viewKey}`);
          }
        }
      }
    }
  }

  return errors;
}

// --------------------------------------------------
// DEV CHECK
// --------------------------------------------------
export function assertPromptConfigValidity(): void {
  const errors = validatePromptConfigs();
  if (errors.length) {
    throw new Error(`SPRITELAB prompt config validation failed:\n${errors.join("\n")}`);
  }
}