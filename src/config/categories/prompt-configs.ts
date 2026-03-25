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
  | "QUEST_ITEMS"
  | "EFFECTS"
  | "PROJECTILES";

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
// Compact — the inline base in buildAssetPrompt() handles essentials.
// This is kept for backward compat exports but NOT used in prompt assembly.
export const GLOBAL_POSITIVE_BASE =
  "single isolated game asset, transparent background, centered, clear silhouette, fully visible";

export const GLOBAL_NEGATIVE_BASE =
  "multiple objects, crowd, busy background, landscape, environment scene, " +
  "cropped, cut off, partial, tiny subject, text, watermark, logo, " +
  "UI overlay, frame, hands holding unless requested, " +
  "person wearing unless requested, duplicate, extra objects";

// --------------------------------------------------
// VIEW CONFIGS
// Important:
// - DEFAULT = neutral readable product/icon angle
// - SIDE_VIEW = orthographic side/readable profile
// - FRONT = straight front-facing / symmetrical where applicable
// - TOP_DOWN = camera from above, NOT isometric, NOT front
// --------------------------------------------------
export const VIEW_PROMPT_CONFIGS: Record<AssetView, ViewPromptConfig> = {
  // ── DEFAULT ────────────────────────────────────────────
  // Neutral 3/4 angle — the "game shop icon" perspective.
  // Most readable for isolated assets: slight angle shows
  // depth without dramatic foreshortening.
  DEFAULT: {
    positive: "Displayed at a neutral slight angle for clear readability",
    negative: "extreme perspective, dutch angle, fisheye, worm's eye view, extreme close-up",
    categoryOverrides: {
      WEAPONS: "Displayed at a slight angle showing blade and handle clearly, like an RPG inventory icon",
      ARMOR: "Displayed at a neutral angle as an empty equipment icon, no body inside",
      CHARACTERS: "Standing in neutral pose at slight 3/4 angle, full body from head to feet visible",
      CREATURES: "In neutral pose at slight 3/4 angle, full body visible from head to tail",
      CONSUMABLES: "Displayed upright at slight angle, full object visible as inventory item",
      RESOURCES: "Displayed at slight angle showing material texture clearly",
      EFFECTS: "Displayed as isolated VFX element at neutral angle",
      PROJECTILES: "Displayed at slight angle showing flight direction",
    },
  },

  // ── SIDE VIEW ──────────────────────────────────────────
  // Strict profile: camera at exact 90° to the subject's side.
  // Like a platformer sprite or weapon blueprint.
  SIDE_VIEW: {
    positive: "((strict side view profile)), facing right, camera at exact 90 degrees to the side, 2D side-scrolling game sprite orientation",
    negative: "front view, front-facing, looking at camera, top-down, 3/4 angle, three-quarter, isometric, rotated toward viewer, angled",
    categoryOverrides: {
      WEAPONS: "weapon horizontal side profile like a blueprint, full length visible left to right",
      ARMOR: "equipment side profile, shape readable from the side, empty armor piece",
      CHARACTERS: "character facing right in strict side profile, full body visible, platformer sprite, like Mario or Mega Man side-scrolling pose",
      CREATURES: "creature facing right in strict side profile, full body nose to tail, platformer enemy",
      CONSUMABLES: "item side profile, bottle silhouette facing right",
      EFFECTS: "effect side profile, energy spread visible from the side",
      PROJECTILES: "projectile flying right, strict horizontal side profile, full length visible",
    },
    subcategoryOverrides: {
      HEROES: "hero facing right strict side profile, full body, platformer sprite like Mario or Mega Man, walking or standing",
      ENEMIES: "enemy facing right strict side profile, full body, combat pose, platformer enemy sprite",
      NPCS: "NPC facing right strict side profile, full body, idle pose",
      BOSSES: "boss facing right strict side profile, full imposing form visible",
      ANIMALS: "animal facing right strict side profile, full body nose to tail, like a safari field guide illustration",
      MYTHICAL: "mythical creature facing right strict side profile, wings and limbs visible",
    },
  },

  // ── FRONT ──────────────────────────────────────────────
  // Straight-on frontal view: camera directly in front of subject.
  // Symmetrical presentation, like a character select screen.
  FRONT: {
    positive: "((strict front view)), camera directly in front, straight-on frontal, symmetrical, subject facing viewer",
    negative: "side view, side profile, back view, top-down, isometric, 3/4 angle, turned away, looking sideways",
    categoryOverrides: {
      WEAPONS: "weapon shown front-on, blade or head facing viewer, handle pointing down, symmetrical presentation",
      ARMOR: "equipment shown front-on, as if on an invisible mannequin facing the viewer, symmetrical, no body inside",
      CHARACTERS: "full body character facing directly forward at viewer, symmetrical standing pose, character select screen style",
      CREATURES: "full body creature facing directly forward, symmetrical when possible, menacing or neutral frontal pose",
      CONSUMABLES: "item viewed from the front, label or contents visible, bottle or container facing viewer",
      EFFECTS: "effect viewed from the front, energy radiating toward the viewer",
      PROJECTILES: "projectile coming directly toward viewer, foreshortened circular front of projectile visible",
    },
    subcategoryOverrides: {
      HEROES: "hero facing directly forward, full body visible, symmetrical heroic standing pose, character select presentation",
      ENEMIES: "enemy facing directly forward, full body visible, threatening frontal pose",
      NPCS: "NPC facing directly forward, full body visible, neutral welcoming pose",
      BOSSES: "boss facing directly forward, full imposing form, intimidating frontal presentation",
      ANIMALS: "animal facing directly forward, head and body symmetrically visible",
      MYTHICAL: "mythical creature facing directly forward, full wingspan or form symmetrically displayed",
      HELMETS: "helmet front-on, visor or face opening directly toward viewer, symmetrical",
      CHEST_ARMOR: "chest armor front-on, as if worn by invisible figure facing viewer",
      SHIELDS: "shield front face shown directly, full emblem and rim visible, flat frontal view",
    },
  },

  // ── TOP DOWN ───────────────────────────────────────────
  // TRUE top-down: camera is directly above looking straight
  // down at 90°. Shows the top surface only. NOT isometric.
  // Used for top-down RPGs (Zelda, Stardew Valley).
  TOP_DOWN: {
    positive: "((bird's eye view from directly above)), ((top-down overhead camera looking straight down)), 90 degree overhead angle, only top surface visible, flat lay product photography, NOT standing upright NOT vertical",
    negative: "front view, side view, profile, isometric, 2.5D, 3/4 angle, three-quarter, horizon line, walls from side, eye-level, vanishing point, standing upright, vertical orientation, upright position",
    categoryOverrides: {
      WEAPONS: "((flat lay weapon on table)), photographed from directly above, bird's eye view, weapon laying HORIZONTAL on flat surface, like product photography from overhead",
      ARMOR: "flat lay armor piece photographed from directly above, equipment on table, bird's eye view",
      CONSUMABLES: "item photographed from directly above showing round cap, bird's eye view, on table",
      RESOURCES: "resource photographed from directly above showing top surface, bird's eye flat lay",
      CHARACTERS: "character seen from directly above showing top of head and shoulders, like top-down RPG Maker sprite, Zelda SNES overhead view",
      CREATURES: "creature seen from directly above showing back of body, top-down RPG enemy, overhead game sprite",
      UI_ELEMENTS: "flat 2D icon, no perspective depth, overhead presentation",
      ENVIRONMENT: "prop seen from directly above, roof or canopy top visible, top-down tilemap game asset",
      QUEST_ITEMS: "item photographed from directly above, flat lay, bird's eye view",
      EFFECTS: "effect seen from directly above, radial circular spread, top-down spell circle on ground",
      PROJECTILES: "projectile seen from directly above, top-down flight path visible",
    },
    subcategoryOverrides: {
      HEROES: "hero character seen from directly above, top of head visible, body below, top-down RPG sprite like Zelda SNES or Stardew Valley overhead",
      ENEMIES: "enemy seen from directly above, top of head and back visible, top-down RPG enemy overhead sprite",
      NPCS: "NPC seen from directly above, head and shoulders, top-down RPG villager overhead sprite",
      BOSSES: "boss seen from directly above, large top-down silhouette, overhead RPG boss sprite",
      ANIMALS: "animal seen from directly above, back and head visible, top-down overhead game sprite",
      MYTHICAL: "mythical creature from directly above, wingspan visible, overhead top-down sprite",
      TREES_PLANTS: "tree canopy seen from directly above filling frame, round organic shape, trunk hidden below",
      BUILDINGS: "building roof seen from directly above, NO walls visible, floor plan style, top-down RPG building",
      SWORDS: "((sword laying flat horizontally on table)), photographed from directly above, bird's eye flat lay, blade pointing left handle pointing right, NO vertical sword",
      AXES_HAMMERS: "axe laying flat photographed from directly above, bird's eye flat lay",
      BOWS: "bow laying flat photographed from directly above, curved shape visible, bird's eye flat lay",
      STAFFS_WANDS: "staff laying flat photographed from directly above, full length visible, bird's eye",
      POTIONS: "potion bottle from directly above showing round cork cap, circular top-down shape, bird's eye",
      SHIELDS: "shield laying flat from directly above, full emblem visible as circle or kite, bird's eye flat lay",
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
  EFFECTS: {
    label: "Effects",
    description: "Combat VFX, magic effects, elemental bursts and particles.",
  },
  PROJECTILES: {
    label: "Projectiles",
    description: "Arrows, bullets, magic projectiles and thrown weapons.",
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
  // Added categories
  EFFECTS: "EFFECTS",
  PROJECTILES: "PROJECTILES",
  VFX: "EFFECTS",
  SPELLS: "EFFECTS",
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
    "single sword weapon, game item sprite",
    "blade with handle and crossguard",
    "weapon shown at slight angle, full blade visible tip to pommel, centered",
    "multiple swords, sword collection, hand holding it, combat scene, person wielding, broken blade, sprite sheet, magical aura unless described, glowing unless described, fire unless described, runes unless described"
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
    "single empty helmet, game equipment icon, NO head inside",
    "hollow armor headpiece, empty dark interior visible, floating loot drop",
    "one helmet centered, completely empty inside, inventory icon style",
    "head inside helmet, face visible, skull inside, person wearing it, neck attached, body parts, multiple helmets, worn helmet, human features, skin showing, horns unless requested"
  ),

  CHEST_ARMOR: makeConfig(
    "single empty chest armor, game equipment icon, NO body inside",
    "isolated breastplate, empty hollow armor piece, loot drop style",
    "one chest armor centered, completely empty, inventory icon",
    "person wearing armor, body inside, torso, arms attached, skin visible, character, multiple armors"
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
    "single potion bottle, game item",
    "glass flask with colored liquid inside, cork stopper",
    "one bottle centered, upright, full bottle visible",
    "multiple potions, potion shelf, hand holding it, brewing scene, cauldron, table, wizard, character, extra bottles, alchemy lab, glowing unless described"
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
    "single gemstone, game resource item",
    "faceted precious crystal catching light, clean crafting material",
    "one gem centered, full crystal visible, not in jewelry",
    "multiple gems, gem pile, jewelry, ring, crown, necklace, mine scene, treasure chest, character, hand holding, glowing unless described"
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
    "single game character, full body sprite",
    "heroic adventurer with equipment matching the description exactly",
    "one character centered, head to feet visible, standing pose",
    "multiple characters, party, crowd, companion, portrait only, background scene, wrong class gear, extra armor unless requested",
    {
      viewOverrides: {
        FRONT: "hero facing directly at camera, full body visible, symmetrical character select screen pose",
        TOP_DOWN: "hero seen from directly above, top of head and shoulders visible, Zelda SNES overhead RPG sprite",
        SIDE_VIEW: "hero facing right in strict side profile, full body, platformer walking sprite like Mario or Mega Man",
      },
    }
  ),

  ENEMIES: makeConfig(
    "single enemy character, game sprite",
    "threatening hostile creature, menacing combat pose, full body visible",
    "one enemy centered, full body head to feet, combat-ready pose",
    "enemy group, multiple enemies, two enemies, swarm, horde, hero fighting it, background scene, dungeon, cave, forest, corpse, defeated pose, dead body, cropped figure, companion, duplicate, landscape",
    {
      viewOverrides: {
        FRONT: "enemy facing directly at camera, full body visible, threatening frontal pose",
        TOP_DOWN: "enemy seen from directly above, back and head visible, top-down RPG enemy sprite",
        SIDE_VIEW: "enemy facing right in strict side profile, full body, platformer enemy sprite",
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
        FRONT: "NPC facing directly at camera, full body visible, neutral welcoming pose",
        TOP_DOWN: "NPC seen from directly above, head and shoulders visible, top-down RPG villager sprite",
        SIDE_VIEW: "NPC facing right in strict side profile, full body, idle standing pose",
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
        FRONT: "boss facing directly at camera, full imposing form visible, intimidating frontal pose",
        TOP_DOWN: "boss seen from directly above, large imposing top-down silhouette, overhead RPG boss",
        SIDE_VIEW: "boss facing right in strict side profile, full imposing form visible",
      },
    }
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - CREATURES
// --------------------------------------------------
export const CREATURES_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  ANIMALS: makeConfig(
    "((exactly one animal)), isolated game creature sprite, single animal only",
    "one complete animal with all limbs visible, stylized game creature design, clear readable silhouette",
    "((ONLY ONE ANIMAL)), single full body animal on transparent background, complete body from nose to tail, NO other animals nearby, NO background, centered game sprite",
    "animal herd, multiple animals, two animals, pack, flock, group, rider on mount, person with animal, landscape scene, dead animal, cropped body, forest background, grass ground, sky, nature scene, hunter, pet owner, leash collar unless requested, saddle unless requested, cage, zoo enclosure, barn interior, trees, rocks, water"
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
    "((exactly one item icon)), game inventory icon sprite, single symbol only",
    "one bold simplified item rendered as flat game icon, high contrast, RPG inventory style, fills 80% of frame, readable at small size",
    "((ONLY ONE ICON)), single centered item icon on transparent background, square format, NO frame border NO grid NO slot, NO multiple icons, clean flat icon presentation",
    "inventory grid, multiple icons, two icons, icon sheet, icon collection, icon set, icon pack, full scene, tiny object in corner, character holding item, UI frame around it, slot borders, grid layout, realistic photo style, cluttered composition, background behind icon, 3D depth shading, perspective"
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
    "((exactly one tree or plant)), isolated game prop, single vegetation only",
    "one placeable tree bush shrub or plant, game environment decoration, complete from roots to top",
    "((ONLY ONE TREE OR PLANT)), single isolated vegetation on transparent background, complete form visible, NO forest NO landscape NO sky, centered game prop asset",
    "forest scene, landscape, multiple trees, two trees, row of trees, many plants, mixed species, character next to tree, garden scene, sky, sun, clouds, grass ground, path, river, background scene, animals, birds"
  ),

  ROCKS_TERRAIN: makeConfig(
    "single terrain prop",
    "one environment terrain asset such as rock, boulder, crystal cluster, stump, mound, cliff fragment or ground feature",
    "single isolated terrain prop, readable natural shape, centered and complete",
    "mountain landscape, quarry scene, multiple random rocks, character climbing it"
  ),

  BUILDINGS: makeConfig(
    "((exactly one building)), isolated game environment asset, single structure only",
    "one complete building with roof and walls, game-ready placeable asset, clean readable structure",
    "((ONLY ONE BUILDING)), single isolated building on transparent background, complete from ground to roof, NO other buildings, NO town, NO landscape, NO sky, centered game asset",
    "city block, town scene, two buildings, interior view, multiple buildings, street scene, neighborhood, landscape background, sky background, people, NPCs, characters, vehicles, road, path, trees unless requested, garden unless requested, fence unless requested, other structures, birds, clouds, sun, moon, panoramic view, aerial cityscape, ground texture, grass, water",
    {
      viewOverrides: {
        TOP_DOWN: "building roof seen from directly above, floor plan style, NO walls visible, bird's eye view",
        FRONT: "building facade straight front view, full structure from ground to roof, front elevation",
        SIDE_VIEW: "building side elevation, full structure from ground to roof, side profile",
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
// PROMPT CONFIGS - EFFECTS
// --------------------------------------------------
export const EFFECTS_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  COMBAT_EFFECTS: makeConfig(
    "((one combat visual effect only)), pure VFX sprite, ABSOLUTELY NO characters NO people NO hands",
    "isolated slash arc or impact burst or energy wave, abstract combat effect, NO person performing it, just the effect floating alone",
    "((ONLY THE EFFECT)), single VFX element on transparent background, NO character NO body NO hands NO arms NO weapon separate from effect, pure energy or motion graphic",
    "character performing action, person attacking, hand visible, arm swinging, warrior, fighter, human body, weapon shown separately, full body, face, head, torso, legs, multiple effects overlapping, animation sheet, sprite sheet, background scene, floor, ground, sword, shield, armor"
  ),

  MAGIC_EFFECTS: makeConfig(
    "((ONE single magic VFX sprite)), isolated spell effect, ZERO characters, ZERO wizards, ZERO casters",
    "magical visual effect like spell burst, healing aura glow, buff sparkle, magic circle, enchantment energy, pure magic phenomenon only",
    "((ONLY the magical effect)), single isolated magic effect on transparent background, glowing energy clearly visible, NO caster, NO character casting",
    "wizard casting, mage character, person casting spell, hands visible, staff or wand visible, character body, spell hitting target, multiple spells, animation sheet, background scene"
  ),

  ELEMENTAL: makeConfig(
    "((ONE single elemental VFX sprite)), isolated element effect, ZERO characters",
    "elemental visual effect like fire burst, ice crystal shards, lightning bolt, water splash, pure element manifestation",
    "((ONLY the elemental effect)), single isolated element on transparent background, element type clearly identifiable",
    "elemental creature, golem, character, person, wizard, multiple elements mixed, animation sheet, environment scene, landscape"
  ),

  AMBIENT: makeConfig(
    "((ONE single ambient particle effect)), isolated subtle VFX",
    "ambient effect like magical sparkle, floating dust motes, smoke wisp, rain drops, snow particle, subtle atmospheric element",
    "single particle or small cluster of same particle type on transparent background, subtle and delicate",
    "weather system scene, smokey room, dusty cave, multiple different effect types, landscape, character, full scene"
  ),
};

// --------------------------------------------------
// PROMPT CONFIGS - PROJECTILES
// --------------------------------------------------
export const PROJECTILES_PROMPT_CONFIG: Record<string, ExtendedSubcategoryPromptConfig> = {
  ARROWS: makeConfig(
    "((ONE single arrow projectile)), isolated flying arrow sprite",
    "arrow with pointed arrowhead, straight shaft, fletching feathers, in-flight pose",
    "single arrow in horizontal flight, full arrow visible from tip to fletching, motion direction clear, on transparent background",
    "multiple arrows volley, quiver, bow weapon, archer character, arrow stuck in target, hand holding arrow"
  ),

  BULLETS: makeConfig(
    "((ONE single bullet or ammunition projectile)), isolated ammunition sprite",
    "ammunition like metal bullet, cannonball, rocket, or energy shot, compact projectile design",
    "single projectile on transparent background, motion direction clear, full projectile visible, speed trail optional",
    "multiple bullets spray, gun firing, muzzle flash, impact explosion, shell casing, ammo box, character shooting"
  ),

  MAGIC_PROJECTILES: makeConfig(
    "((ONE single magic projectile)), isolated spell projectile sprite, ZERO characters",
    "magical projectile like fireball, ice shard, shadow bolt, arcane missile, glowing spell energy in flight",
    "single magic projectile on transparent background, glowing energy, motion direction clear, trailing magic effect",
    "wizard casting, mage character, spell impact on target, multiple projectiles, barrage, character body, hands visible"
  ),

  THROWN: makeConfig(
    "((ONE single thrown projectile)), isolated throwing weapon in flight",
    "thrown weapon in mid-flight like spinning throwing knife, bomb, javelin, or grenade",
    "single thrown object in flight pose on transparent background, motion implied through angle, mid-air",
    "multiple thrown items, thrower character, person throwing, impact explosion, target being hit, hand visible"
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
  EFFECTS: EFFECTS_PROMPT_CONFIG,
  PROJECTILES: PROJECTILES_PROMPT_CONFIG,
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
  EFFECTS: "game visual effect sprite, isolated VFX element, ZERO characters or people, pure effect only",
  PROJECTILES: "game projectile sprite, isolated flying ammunition or spell, motion-implied design",
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

  // categoryBase, styleConfig, qualityConfig intentionally not used in prompt assembly.
  // Style comes from STYLES_2D_FULL via prompt-builder.ts bridgeResult().
  // Quality comes from generation service QUALITY_SETTINGS (steps/guidance).
  // This avoids bloating the prompt past FLUX's 80-word sweet spot.

  const elementPrompt = buildTagPrompt("elemental theme", input.element);
  const materialPrompt = buildTagPrompt("materials", input.material);
  const colorPrompt = buildTagPrompt("colors", input.color);
  // extraTags not used in prompt — tags bloat prompt past FLUX optimal length

  const viewPositive = getViewPositive(
    resolvedCategory,
    resolvedSubcategory,
    config,
    resolvedView
  );
  const viewNegative = getViewNegative(config, resolvedView);

  // ═══════════════════════════════════════════════════════
  // POSITIVE PROMPT ORDER — optimized for FLUX (50-80 words ideal)
  // FLUX gives highest weight to FIRST phrases in prompt.
  // Order: identity → user intent → camera → framing → base rules
  // ═══════════════════════════════════════════════════════
  // NOTE: styleConfig.positive and qualityConfig.positive are intentionally
  // EXCLUDED from here — they are redundant with STYLES_2D_FULL which adds
  // styleCore + styleMandatory via prompt-builder.ts bridgeResult().
  // Including both would bloat the prompt past the 100-word enhancer limit
  // and cause critical phrases to be truncated.
  // When user explicitly picks a non-default view (TOP_DOWN, SIDE_VIEW, FRONT),
  // the camera angle MUST be the very first thing FLUX sees — it's the user's
  // primary intent and FLUX gives highest weight to the first phrases.
  // For DEFAULT view, object identity comes first (standard behavior).
  const isExplicitView = resolvedView !== "DEFAULT";

  // ── Color detection ───────────────────────────────────────────────
  const ACTUAL_COLORS = new Set(["red", "blue", "green", "purple", "gold", "golden", "black", "white", "orange", "yellow", "pink", "silver", "crimson"]);
  const userLower = (input.userPrompt || "").toLowerCase();
  const detectedColors = userLower.split(/\s+/).filter(w => ACTUAL_COLORS.has(w));
  const colorClause = detectedColors.length > 0
    ? `The color is distinctly ${detectedColors.join(" and ")}.`
    : "";

  // ── PROMPT ASSEMBLY — STYLE EARLY for FLUX ──────────────────────
  // FLUX gives highest weight to FIRST ~40 words.
  // Style MUST appear in first 20 words or FLUX ignores it.
  // Order: [style] [subject] [user desc] [view] [composition] [base]
  const userDesc = (input.userPrompt || "").trim();
  const tags = [elementPrompt, materialPrompt, colorPrompt].filter(Boolean).join(", ");

  // Short style tag — injected at position #1 so FLUX renders correct style
  const styleTag = STYLE_PROMPT_CONFIGS[resolvedStyle]?.positive || "";

  let fullPrompt: string;
  if (isExplicitView) {
    fullPrompt = [
      `${styleTag} ${viewPositive}.`,                              // 1. STYLE + CAMERA (first thing FLUX sees)
      `${config.objectType}: ${userDesc}.`,                        // 2. WHAT + USER INTENT
      colorClause,                                                  // 3. Color reinforcement
      tags ? `${tags}.` : "",                                       // 4. Tags
      `Isolated on transparent background, centered, game sprite.`, // 5. Base
    ].filter(Boolean).join(" ");
  } else {
    fullPrompt = [
      `${styleTag} ${config.objectType}: ${userDesc}.`,            // 1. STYLE + WHAT + USER (first 15 words!)
      config.visualDesc ? `${config.visualDesc}.` : "",             // 2. Visual details
      colorClause,                                                  // 3. Color
      `${viewPositive}.`,                                           // 4. Camera
      config.composition ? `${config.composition}.` : "",           // 5. Framing
      tags ? `${tags}.` : "",                                       // 6. Tags
      `Transparent background, centered, single game sprite.`,      // 7. Base
    ].filter(Boolean).join(" ");
  }

  // ═══════════════════════════════════════════════════════
  // NEGATIVE PROMPT — blocks hallucinations
  // styleConfig.negative excluded — STYLES_2D_FULL.negatives handles it
  // ═══════════════════════════════════════════════════════
  const negativePrompt = dedupeCsv([
    GLOBAL_NEGATIVE_BASE,
    config.avoid,
    viewNegative,
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