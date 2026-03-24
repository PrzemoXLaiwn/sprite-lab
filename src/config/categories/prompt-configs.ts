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
    positive: "neutral 3/4 angle, full subject visible, game asset showcase",
    negative: "extreme perspective, dutch angle, fisheye, worm's eye view, extreme close-up",
    categoryOverrides: {
      WEAPONS: "weapon shown at slight angle, full weapon from tip to handle clearly visible, classic RPG inventory presentation",
      ARMOR: "equipment shown at neutral angle, full piece visible, empty armor presented as inventory loot drop icon",
      CHARACTERS: "full body character in neutral standing pose, slight 3/4 angle, head to feet visible",
      CREATURES: "full body creature, neutral pose, slight 3/4 angle showing form clearly",
      CONSUMABLES: "item at slight angle, full object visible, clean inventory item presentation",
      RESOURCES: "resource at slight angle, full material visible, clean crafting material icon",
      EFFECTS: "effect shown at neutral angle, pure VFX element, no perspective distortion",
      PROJECTILES: "projectile at slight angle showing flight direction, full projectile visible",
    },
  },

  // ── SIDE VIEW ──────────────────────────────────────────
  // Strict profile: camera at exact 90° to the subject's side.
  // Like a platformer sprite or weapon blueprint.
  SIDE_VIEW: {
    positive: "((strict side view)), exact profile angle, camera perpendicular to subject side, flat 2D side-on, facing right",
    negative: "front view, front-facing, looking at camera, top-down, 3/4 view, isometric, rotated toward viewer",
    categoryOverrides: {
      WEAPONS: "weapon shown in strict side profile, full length from tip to pommel visible horizontally, like a weapon blueprint",
      ARMOR: "equipment shown in strict side profile, shape and depth readable, empty armor piece as side-view icon",
      CHARACTERS: "full body character in strict side profile, platformer sprite pose, walking or standing, facing right",
      CREATURES: "full body creature in strict side profile facing right, all limbs readable, platformer enemy style",
      CONSUMABLES: "item in strict side profile, full shape visible, bottle or container silhouette clear",
      EFFECTS: "effect shown from the side, energy spread visible in profile",
      PROJECTILES: "projectile in strict horizontal flight, side profile, full length visible, arrow or missile facing right",
    },
    subcategoryOverrides: {
      HEROES: "hero character strict side profile, full body facing right, platformer sprite orientation, running or standing pose",
      ENEMIES: "enemy character strict side profile, full body facing right, combat-ready pose, platformer enemy sprite",
      NPCS: "NPC character strict side profile, full body facing right, idle standing pose",
      BOSSES: "boss creature strict side profile, full imposing form visible facing right",
      ANIMALS: "animal in strict side profile facing right, full body from nose to tail visible",
      MYTHICAL: "mythical creature in strict side profile facing right, wings and limbs readable",
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
    positive: "((true top-down view)), ((camera directly above looking straight down)), 90-degree overhead, only top surface visible, RPG Maker Zelda top-down sprite",
    negative: "front view, side view, profile, isometric, 2.5D, 3/4 angle, horizon line, walls from side, eye-level camera, vanishing point",
    categoryOverrides: {
      WEAPONS: "weapon laid completely flat on ground, viewed from directly above, full outline visible like dropped loot in top-down RPG",
      ARMOR: "equipment piece laid flat, viewed from directly above, like inventory slot or dropped loot in top-down game",
      CONSUMABLES: "item viewed from directly above, circular cap or lid visible, top-down inventory item",
      RESOURCES: "resource viewed from directly above, top surface texture visible, top-down game pickup",
      CHARACTERS: "character sprite viewed from directly above, head and shoulders visible, top-down RPG movement sprite",
      CREATURES: "creature viewed from directly above, back and head visible, top-down game enemy sprite",
      UI_ELEMENTS: "flat UI icon, no perspective depth, purely 2D overhead presentation",
      ENVIRONMENT: "environment prop viewed from directly above, roof or canopy visible, top-down game tilemap asset",
      QUEST_ITEMS: "quest item viewed from directly above, full shape outline visible, top-down RPG loot",
      EFFECTS: "effect viewed from directly above, circular or radial spread pattern, top-down spell circle",
      PROJECTILES: "projectile viewed from directly above, flight path visible as top-down shadow or outline",
    },
    subcategoryOverrides: {
      HEROES: "hero sprite viewed from directly above, head visible, body foreshortened below, top-down RPG player character, like Zelda or Stardew Valley sprite",
      ENEMIES: "enemy sprite viewed from directly above, top of head and body visible, top-down RPG enemy",
      NPCS: "NPC sprite viewed from directly above, head and shoulders visible, top-down RPG villager",
      BOSSES: "boss sprite viewed from directly above, large imposing top-down silhouette, top-down RPG boss",
      ANIMALS: "animal viewed from directly above, back and head visible, top-down game animal sprite",
      MYTHICAL: "mythical creature from directly above, wingspan or full body top surface visible",
      COMPANIONS: "companion creature from directly above, small readable top-down pet sprite",
      ELEMENTALS: "elemental from directly above, radiating energy pattern visible from overhead",
      TREES_PLANTS: "tree or plant from directly above, canopy fills the frame, trunk hidden below foliage, round or organic top-down silhouette",
      ROCKS_TERRAIN: "rock formation from directly above, top surface texture and shape visible",
      BUILDINGS: "building from directly above, roof completely visible filling frame, NO walls visible from side, floor plan style, top-down RPG building",
      PROPS: "prop from directly above, top surface visible, clean top-down game decoration",
      DUNGEON: "dungeon element from directly above, trap plate or floor mechanism visible, top-down dungeon crawl asset",
      SWORDS: "sword laid flat viewed from directly above, blade and handle forming clean top-down silhouette",
      AXES_HAMMERS: "axe or hammer laid flat viewed from directly above, head and handle top-down outline",
      BOWS: "bow laid flat viewed from directly above, curved shape and string visible from overhead",
      STAFFS_WANDS: "staff laid flat viewed from directly above, full length and crystal top visible",
      POTIONS: "potion viewed from directly above, round cap or cork visible, circular top-down shape",
      SHIELDS: "shield laid flat viewed from directly above, full emblem and rim visible as circle or kite shape",
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
    "((exactly one single sword)), isolated weapon game sprite, NOT multiple swords",
    "one blade with handle and crossguard, sharp weapon, game loot icon style, clean readable design",
    "((ONLY ONE SWORD)), one isolated sword on transparent background, full blade from tip to pommel visible, flat or slight angle, game inventory icon, NO other weapons nearby, centered",
    "multiple swords, many swords, sword collection, weapon set, sprite sheet, weapon grid, broken blade, hand holding it, sword in stone, sheathed in scabbard, combat scene, different swords, variety of weapons, smooth shading, realistic metal, anti-aliasing, 3D render, gradient, hand gripping, fingers on handle, arm visible, warrior character, person wielding, knight holding, magical aura unless described, glowing blade unless described, fire on blade unless described, runes unless described, enchanted glow unless described, extra gems unless described, energy effects unless described, ground or surface, background scene, display rack"
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
    "((one empty helmet)), game equipment icon, hollow armor piece with NO head inside",
    "empty helmet floating alone, no face no head no skull inside, visor open or closed showing empty dark interior, game inventory loot drop presentation",
    "((ONE HELMET ONLY)), empty hollow helmet on transparent background, ((ABSOLUTELY NO HEAD INSIDE)), no body no neck no shoulders, helmet displayed as game loot pickup icon, front or 3/4 view",
    "head inside helmet, face visible, eyes visible, skull inside, person wearing it, neck attached, mannequin head, body parts, multiple helmets, worn helmet, human head, portrait, character body, shoulders visible, torso, armor stand, knight character, warrior wearing, hair visible, chin visible, ears visible, skin showing, human features inside, glowing eyes inside unless requested, horns unless requested"
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
    "((exactly one potion bottle)), isolated game item, single flask only",
    "one glass bottle with colored liquid inside and cork stopper, simple clean potion design, game inventory item style",
    "((ONLY ONE BOTTLE)), single potion bottle upright on transparent background, full bottle visible, NO other bottles nearby, NO shelf NO table NO background, centered inventory icon",
    "multiple potions, many bottles, two bottles, potion set, potion shelf, potion shop, potion rack, row of potions, hand holding it, spilled liquid, empty bottle, brewing scene, cauldron, table, background scene, extra bottles, potion collection, scattered items, wizard, character, person, alchemy lab, ingredient jars, mortar pestle, magical aura unless described, glowing effects unless described, smoke unless described, extra decorations, ornate stand, wooden table, shelf"
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
    "((exactly one gemstone)), isolated game resource sprite, single cut crystal only",
    "one faceted precious gem catching light, clean readable game crafting material, loot drop icon style",
    "((ONLY ONE GEM)), single gemstone centered on transparent background, full crystal visible, NOT in jewelry NOT in ring NOT in crown, game inventory icon, NO other gems nearby",
    "pile of gems, multiple gemstones, two gems, gem collection, gem cluster, scattered gems, ring, necklace, jewelry setting, crown, scepter, mine scene, cave background, treasure chest, gem pile, uncut ore unless requested, hand holding gem, person, character, staff with crystal, pedestal, display case, ground or surface underneath, magical aura unless described, glowing energy unless described, floating particles unless described"
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
    "((exactly one hero character)), isolated game character sprite, single person only",
    "one playable character, equipment matching user description ONLY, wizard = robed mage with staff and pointed hat, knight = armored warrior with sword, rogue = leather hood with daggers, archer = bow and quiver",
    "((ONLY ONE CHARACTER)), single full body character on transparent background, head to feet visible, neutral standing or heroic pose, NO companions NO pets NO extra people, centered game sprite",
    "multiple characters, two people, party scene, group, crowd, companion, duplicate, portrait close-up only, background scene, forest, castle, dungeon, landscape, room, wrong class gear, extra armor unless requested, crown unless requested, wings unless requested, pet unless requested",
    {
      viewOverrides: {
        FRONT: "single full body hero character facing directly forward, readable symmetrical front-facing sprite or concept presentation",
        TOP_DOWN: "single top-down hero character sprite, seen from directly above, readable for top-down gameplay",
      },
    }
  ),

  ENEMIES: makeConfig(
    "((exactly one enemy character)), isolated game enemy sprite, single hostile creature only",
    "one threatening enemy based on user description, menacing combat-ready pose, complete body visible",
    "((ONLY ONE ENEMY)), single full body enemy on transparent background, head to feet visible, NO other characters nearby, NO hero fighting it, NO background, centered game sprite",
    "enemy group, multiple enemies, two enemies, swarm, horde, hero fighting it, background scene, dungeon, cave, forest, corpse, defeated pose, dead body, cropped figure, companion, duplicate, landscape",
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
  const extraTagsPrompt = normalizeTagList(input.extraTags).join(", ");

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
  const fullPrompt = dedupeCsv([
    config.objectType,        // 1. WHAT it is (highest FLUX weight)
    input.userPrompt,         // 2. WHAT user wants (second highest)
    config.visualDesc,        // 3. HOW it looks
    viewPositive,             // 4. CAMERA angle (must be early to take effect)
    config.composition,       // 5. FRAMING rules
    elementPrompt,            // 6. Optional tags
    materialPrompt,
    colorPrompt,
    extraTagsPrompt,
    "transparent background, centered, single isolated game asset",  // 7. Base rules (compact)
  ]);

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