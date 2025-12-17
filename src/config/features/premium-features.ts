// ===========================================
// SPRITELAB - PREMIUM FEATURES CONFIGURATION
// ===========================================
// Unique competitive features for market differentiation

// ===========================================
// 1. SPRITE SHEET GENERATOR - Animation Frames
// ===========================================

export interface AnimationFrame {
  id: string;
  name: string;
  promptModifier: string;
  description: string;
}

export interface AnimationType {
  id: string;
  name: string;
  emoji: string;
  description: string;
  frames: AnimationFrame[];
  frameCount: number;
  creditsRequired: number;
}

export const ANIMATION_TYPES: AnimationType[] = [
  {
    id: "IDLE",
    name: "Idle Animation",
    emoji: "😌",
    description: "Breathing/waiting animation",
    frameCount: 4,
    creditsRequired: 4,
    frames: [
      { id: "idle_1", name: "Idle 1", promptModifier: "standing still, neutral pose, relaxed stance", description: "Base idle pose" },
      { id: "idle_2", name: "Idle 2", promptModifier: "standing still, slight body shift, breathing in", description: "Slight movement" },
      { id: "idle_3", name: "Idle 3", promptModifier: "standing still, subtle movement, breathing out", description: "Return movement" },
      { id: "idle_4", name: "Idle 4", promptModifier: "standing still, neutral pose, slight sway", description: "Back to base" },
    ],
  },
  {
    id: "WALK",
    name: "Walk Cycle",
    emoji: "🚶",
    description: "4-frame walk animation",
    frameCount: 4,
    creditsRequired: 4,
    frames: [
      { id: "walk_1", name: "Walk 1", promptModifier: "walking pose, left foot forward, arms swinging", description: "Left step" },
      { id: "walk_2", name: "Walk 2", promptModifier: "walking pose, feet together, passing position", description: "Passing" },
      { id: "walk_3", name: "Walk 3", promptModifier: "walking pose, right foot forward, arms swinging opposite", description: "Right step" },
      { id: "walk_4", name: "Walk 4", promptModifier: "walking pose, feet together, returning position", description: "Return" },
    ],
  },
  {
    id: "RUN",
    name: "Run Cycle",
    emoji: "🏃",
    description: "6-frame run animation",
    frameCount: 6,
    creditsRequired: 6,
    frames: [
      { id: "run_1", name: "Run 1", promptModifier: "running pose, left leg extended back, right arm forward, dynamic motion", description: "Push off" },
      { id: "run_2", name: "Run 2", promptModifier: "running pose, airborne, both feet off ground, mid-stride", description: "Flight 1" },
      { id: "run_3", name: "Run 3", promptModifier: "running pose, right leg landing, left arm forward", description: "Landing" },
      { id: "run_4", name: "Run 4", promptModifier: "running pose, right leg extended back, left arm forward", description: "Push off 2" },
      { id: "run_5", name: "Run 5", promptModifier: "running pose, airborne, both feet off ground, opposite stride", description: "Flight 2" },
      { id: "run_6", name: "Run 6", promptModifier: "running pose, left leg landing, right arm forward", description: "Landing 2" },
    ],
  },
  {
    id: "ATTACK",
    name: "Attack Animation",
    emoji: "⚔️",
    description: "3-frame attack sequence",
    frameCount: 3,
    creditsRequired: 3,
    frames: [
      { id: "attack_1", name: "Windup", promptModifier: "attack windup pose, weapon raised back, preparing to strike, tension in body", description: "Preparation" },
      { id: "attack_2", name: "Strike", promptModifier: "attack striking pose, weapon swinging forward, full extension, dynamic action", description: "Attack" },
      { id: "attack_3", name: "Recovery", promptModifier: "attack follow-through pose, weapon extended, recovering stance", description: "Follow-through" },
    ],
  },
  {
    id: "DEATH",
    name: "Death Animation",
    emoji: "💀",
    description: "4-frame death sequence",
    frameCount: 4,
    creditsRequired: 4,
    frames: [
      { id: "death_1", name: "Hit", promptModifier: "hit reaction pose, recoiling, pain expression, staggering", description: "Impact" },
      { id: "death_2", name: "Falling", promptModifier: "falling pose, losing balance, tilting backward, arms flailing", description: "Falling" },
      { id: "death_3", name: "Collapse", promptModifier: "collapsing pose, knees buckling, body crumpling", description: "Collapse" },
      { id: "death_4", name: "Dead", promptModifier: "lying on ground, defeated pose, motionless, flat on back", description: "Final" },
    ],
  },
  {
    id: "JUMP",
    name: "Jump Animation",
    emoji: "🦘",
    description: "3-frame jump sequence",
    frameCount: 3,
    creditsRequired: 3,
    frames: [
      { id: "jump_1", name: "Crouch", promptModifier: "crouching pose, preparing to jump, legs bent, arms back", description: "Preparation" },
      { id: "jump_2", name: "Airborne", promptModifier: "jumping pose, airborne, legs tucked, arms up, peak of jump", description: "In air" },
      { id: "jump_3", name: "Landing", promptModifier: "landing pose, legs bent absorbing impact, arms out for balance", description: "Landing" },
    ],
  },
];

// ===========================================
// 2. STYLE MIXING - Blend Two Styles
// ===========================================

export interface StyleMixConfig {
  style1Weight: number; // 0-100
  style2Weight: number; // 0-100
}

export const STYLE_MIX_PRESETS = [
  { name: "Balanced", style1: 50, style2: 50 },
  { name: "Primary Focus", style1: 70, style2: 30 },
  { name: "Secondary Focus", style1: 30, style2: 70 },
  { name: "Subtle Blend", style1: 80, style2: 20 },
];

// Style compatibility matrix - some styles blend better than others
export const STYLE_COMPATIBILITY: Record<string, string[]> = {
  PIXEL_ART_16: ["PIXEL_ART_32", "ISOMETRIC_PIXEL"],
  PIXEL_ART_32: ["PIXEL_ART_16", "ISOMETRIC_PIXEL", "ANIME_GAME"],
  HAND_PAINTED: ["DARK_SOULS", "REALISTIC_PAINTED", "ANIME_GAME"],
  VECTOR_CLEAN: ["CHIBI_CUTE", "CARTOON_WESTERN", "ISOMETRIC_CARTOON"],
  ANIME_GAME: ["CHIBI_CUTE", "HAND_PAINTED", "PIXEL_ART_32"],
  CHIBI_CUTE: ["ANIME_GAME", "VECTOR_CLEAN", "CARTOON_WESTERN"],
  CARTOON_WESTERN: ["VECTOR_CLEAN", "CHIBI_CUTE", "ISOMETRIC_CARTOON"],
  DARK_SOULS: ["HAND_PAINTED", "REALISTIC_PAINTED"],
  ISOMETRIC: ["ISOMETRIC_PIXEL", "ISOMETRIC_CARTOON", "VECTOR_CLEAN"],
  ISOMETRIC_PIXEL: ["PIXEL_ART_16", "PIXEL_ART_32", "ISOMETRIC"],
  ISOMETRIC_CARTOON: ["CARTOON_WESTERN", "VECTOR_CLEAN", "CHIBI_CUTE"],
  REALISTIC_PAINTED: ["HAND_PAINTED", "DARK_SOULS"],
};

// ===========================================
// 3. COLOR PALETTE LOCK - Consistent Colors
// ===========================================

export interface ColorPalette {
  id: string;
  name: string;
  emoji: string;
  description: string;
  colors: string[]; // Hex colors
  promptModifier: string;
}

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "FANTASY_GOLD",
    name: "Fantasy Gold",
    emoji: "👑",
    description: "Royal gold and deep purples",
    colors: ["#FFD700", "#DAA520", "#8B4513", "#4B0082", "#2E1A47", "#1A0F2E"],
    promptModifier: "golden yellow, royal purple, rich brown color palette, fantasy medieval colors",
  },
  {
    id: "FOREST_GREEN",
    name: "Forest Realm",
    emoji: "🌲",
    description: "Natural greens and earth tones",
    colors: ["#228B22", "#32CD32", "#8B4513", "#D2691E", "#2F4F2F", "#1C3A1C"],
    promptModifier: "forest green, earth brown, natural color palette, woodland colors",
  },
  {
    id: "ICE_BLUE",
    name: "Frozen Tundra",
    emoji: "❄️",
    description: "Cool blues and white",
    colors: ["#87CEEB", "#00CED1", "#E0FFFF", "#B0E0E6", "#4169E1", "#191970"],
    promptModifier: "ice blue, frost white, cool cyan color palette, frozen arctic colors",
  },
  {
    id: "FIRE_RED",
    name: "Inferno",
    emoji: "🔥",
    description: "Hot reds and oranges",
    colors: ["#FF4500", "#FF6347", "#FFD700", "#8B0000", "#DC143C", "#2F0A0A"],
    promptModifier: "fire red, burning orange, molten gold color palette, flame inferno colors",
  },
  {
    id: "DARK_SOULS",
    name: "Dark Souls",
    emoji: "🌑",
    description: "Muted grays and browns",
    colors: ["#2F2F2F", "#4A4A4A", "#6B4423", "#8B7355", "#1A1A1A", "#0D0D0D"],
    promptModifier: "dark muted, desaturated brown, gritty gray color palette, souls-like dark colors",
  },
  {
    id: "NEON_CYBER",
    name: "Cyberpunk",
    emoji: "💜",
    description: "Neon pink and cyan",
    colors: ["#FF00FF", "#00FFFF", "#FF1493", "#7B68EE", "#0D0D1A", "#1A0A2E"],
    promptModifier: "neon pink, electric cyan, purple glow color palette, cyberpunk neon colors",
  },
  {
    id: "PASTEL_DREAM",
    name: "Pastel Dream",
    emoji: "🍭",
    description: "Soft pastel colors",
    colors: ["#FFB6C1", "#98FB98", "#87CEFA", "#DDA0DD", "#F0E68C", "#FFF0F5"],
    promptModifier: "soft pastel, gentle pink, light blue color palette, dreamy kawaii colors",
  },
  {
    id: "OCEAN_DEEP",
    name: "Ocean Depths",
    emoji: "🌊",
    description: "Deep sea blues and teals",
    colors: ["#006994", "#40E0D0", "#20B2AA", "#00CED1", "#003366", "#001A33"],
    promptModifier: "deep ocean blue, teal, aquamarine color palette, underwater sea colors",
  },
  {
    id: "AUTUMN_HARVEST",
    name: "Autumn Harvest",
    emoji: "🍂",
    description: "Warm autumn oranges and browns",
    colors: ["#D2691E", "#FF8C00", "#8B4513", "#CD853F", "#A0522D", "#3D2314"],
    promptModifier: "autumn orange, harvest brown, warm amber color palette, fall season colors",
  },
  {
    id: "MONO_BW",
    name: "Monochrome",
    emoji: "⬛",
    description: "Black and white only",
    colors: ["#FFFFFF", "#E0E0E0", "#A0A0A0", "#606060", "#303030", "#000000"],
    promptModifier: "black and white, grayscale, monochrome color palette, no color",
  },
  {
    id: "RETRO_GAMEBOY",
    name: "Game Boy",
    emoji: "🎮",
    description: "Classic Game Boy green",
    colors: ["#9BBC0F", "#8BAC0F", "#306230", "#0F380F"],
    promptModifier: "game boy green, 4-color palette, retro handheld, classic green LCD colors",
  },
  {
    id: "SUNSET_WARM",
    name: "Sunset Glow",
    emoji: "🌅",
    description: "Warm sunset gradients",
    colors: ["#FF6B6B", "#FFE66D", "#FF8E53", "#845EC2", "#2C1654", "#1A0A2E"],
    promptModifier: "sunset orange, warm pink, golden yellow color palette, evening sky colors",
  },
];

// ===========================================
// 4. ASSET PACKS - Themed Sets of Related Assets
// ===========================================

export interface AssetPackItem {
  id: string;
  name: string;
  promptModifier: string;
  category: string;
  subcategory: string;
}

export interface AssetPack {
  id: string;
  name: string;
  emoji: string;
  description: string;
  items: AssetPackItem[];
  itemCount: number;
  creditsRequired: number;
  suggestedStyle: string;
}

export const ASSET_PACKS: AssetPack[] = [
  {
    id: "WARRIOR_LOADOUT",
    name: "Warrior's Loadout",
    emoji: "⚔️",
    description: "Complete warrior equipment set",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "HAND_PAINTED",
    items: [
      { id: "warrior_sword", name: "Iron Sword", promptModifier: "iron sword, straight blade, leather wrapped handle, warrior weapon", category: "WEAPONS", subcategory: "SWORDS" },
      { id: "warrior_shield", name: "Round Shield", promptModifier: "round wooden shield, metal rim, leather straps, battle worn", category: "ARMOR", subcategory: "SHIELDS" },
      { id: "warrior_helmet", name: "Steel Helm", promptModifier: "steel helmet, nose guard, chainmail neck guard, warrior helm", category: "ARMOR", subcategory: "HELMETS" },
      { id: "warrior_chestplate", name: "Chainmail", promptModifier: "chainmail armor, steel rings, leather backing, torso armor", category: "ARMOR", subcategory: "CHEST" },
      { id: "warrior_boots", name: "Leather Boots", promptModifier: "leather boots, metal toe cap, strapped, combat footwear", category: "ARMOR", subcategory: "BOOTS" },
      { id: "warrior_potion", name: "Health Potion", promptModifier: "red health potion, glass bottle, cork stopper, glowing liquid", category: "CONSUMABLES", subcategory: "POTIONS" },
    ],
  },
  {
    id: "MAGE_ESSENTIALS",
    name: "Mage's Essentials",
    emoji: "🔮",
    description: "Essential items for any spellcaster",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "HAND_PAINTED",
    items: [
      { id: "mage_staff", name: "Arcane Staff", promptModifier: "magical staff, crystal orb top, wooden shaft, rune carvings, glowing", category: "WEAPONS", subcategory: "STAVES" },
      { id: "mage_wand", name: "Magic Wand", promptModifier: "magic wand, star tip, ornate handle, sparkles, enchanted", category: "WEAPONS", subcategory: "WANDS" },
      { id: "mage_robe", name: "Wizard Robe", promptModifier: "wizard robe, flowing fabric, star patterns, hood, magical attire", category: "ARMOR", subcategory: "ROBES" },
      { id: "mage_book", name: "Spellbook", promptModifier: "ancient spellbook, leather bound, magical symbols, glowing pages", category: "RESOURCES", subcategory: "BOOKS" },
      { id: "mage_mana", name: "Mana Potion", promptModifier: "blue mana potion, crystal vial, swirling liquid, magical energy", category: "CONSUMABLES", subcategory: "POTIONS" },
      { id: "mage_scroll", name: "Magic Scroll", promptModifier: "ancient scroll, mystical writing, glowing runes, rolled parchment", category: "CONSUMABLES", subcategory: "SCROLLS" },
    ],
  },
  {
    id: "ROGUE_TOOLKIT",
    name: "Rogue's Toolkit",
    emoji: "🗡️",
    description: "Stealthy assassin equipment",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "DARK_SOULS",
    items: [
      { id: "rogue_dagger", name: "Shadow Dagger", promptModifier: "curved dagger, dark blade, wrapped handle, assassin weapon", category: "WEAPONS", subcategory: "DAGGERS" },
      { id: "rogue_throwing", name: "Throwing Knives", promptModifier: "set of throwing knives, balanced blades, leather pouch", category: "WEAPONS", subcategory: "THROWING" },
      { id: "rogue_cloak", name: "Shadow Cloak", promptModifier: "dark hooded cloak, tattered edges, shadow magic, stealth gear", category: "ARMOR", subcategory: "CLOAKS" },
      { id: "rogue_lockpick", name: "Lockpick Set", promptModifier: "lockpicking tools, metal picks, leather case, thief tools", category: "RESOURCES", subcategory: "TOOLS" },
      { id: "rogue_poison", name: "Poison Vial", promptModifier: "green poison vial, skull cork, toxic liquid, assassin tool", category: "CONSUMABLES", subcategory: "POTIONS" },
      { id: "rogue_smoke", name: "Smoke Bomb", promptModifier: "smoke bomb, round ball, fuse, escape tool, ninja weapon", category: "CONSUMABLES", subcategory: "BOMBS" },
    ],
  },
  {
    id: "DUNGEON_LOOT",
    name: "Dungeon Loot",
    emoji: "💎",
    description: "Treasures found in dark dungeons",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "PIXEL_ART_32",
    items: [
      { id: "dungeon_chest", name: "Treasure Chest", promptModifier: "wooden treasure chest, gold coins spilling out, metal bands", category: "ENVIRONMENT", subcategory: "CONTAINERS" },
      { id: "dungeon_key", name: "Skeleton Key", promptModifier: "ornate skeleton key, skull design, ancient metal, dungeon key", category: "RESOURCES", subcategory: "KEYS" },
      { id: "dungeon_gem", name: "Magic Gem", promptModifier: "glowing gemstone, faceted cut, magical aura, precious stone", category: "RESOURCES", subcategory: "GEMS" },
      { id: "dungeon_coin", name: "Gold Coins", promptModifier: "pile of gold coins, ancient currency, shiny, treasure", category: "RESOURCES", subcategory: "CURRENCY" },
      { id: "dungeon_torch", name: "Wall Torch", promptModifier: "burning wall torch, metal bracket, flickering flame, dungeon lighting", category: "ENVIRONMENT", subcategory: "PROPS" },
      { id: "dungeon_skull", name: "Ancient Skull", promptModifier: "human skull, cracked, mysterious, dungeon decoration, bone", category: "ENVIRONMENT", subcategory: "PROPS" },
    ],
  },
  {
    id: "NATURE_ELEMENTS",
    name: "Forest Elements",
    emoji: "🌿",
    description: "Natural forest environment props",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "HAND_PAINTED",
    items: [
      { id: "nature_tree", name: "Oak Tree", promptModifier: "large oak tree, thick trunk, green leaves, forest tree", category: "ENVIRONMENT", subcategory: "TREES" },
      { id: "nature_bush", name: "Berry Bush", promptModifier: "green bush, red berries, foliage, forest vegetation", category: "ENVIRONMENT", subcategory: "PLANTS" },
      { id: "nature_rock", name: "Mossy Rock", promptModifier: "large rock, moss covered, forest boulder, natural stone", category: "ENVIRONMENT", subcategory: "ROCKS" },
      { id: "nature_mushroom", name: "Magic Mushroom", promptModifier: "glowing mushroom, spotted cap, magical fungus, fantasy mushroom", category: "RESOURCES", subcategory: "PLANTS" },
      { id: "nature_flower", name: "Healing Flower", promptModifier: "magical flower, glowing petals, healing herb, fantasy plant", category: "RESOURCES", subcategory: "PLANTS" },
      { id: "nature_log", name: "Fallen Log", promptModifier: "fallen tree log, moss, decomposing wood, forest debris", category: "ENVIRONMENT", subcategory: "PROPS" },
    ],
  },
  {
    id: "MEDIEVAL_FOOD",
    name: "Tavern Fare",
    emoji: "🍖",
    description: "Medieval food and drinks",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "PIXEL_ART_32",
    items: [
      { id: "food_meat", name: "Roasted Meat", promptModifier: "roasted leg of meat, bone handle, cooked brown, tavern food", category: "CONSUMABLES", subcategory: "FOOD" },
      { id: "food_bread", name: "Bread Loaf", promptModifier: "fresh bread loaf, crusty, golden brown, bakery item", category: "CONSUMABLES", subcategory: "FOOD" },
      { id: "food_cheese", name: "Cheese Wheel", promptModifier: "yellow cheese wheel, wedge cut, holes, dairy food", category: "CONSUMABLES", subcategory: "FOOD" },
      { id: "food_apple", name: "Red Apple", promptModifier: "shiny red apple, fresh fruit, healthy food item", category: "CONSUMABLES", subcategory: "FOOD" },
      { id: "food_ale", name: "Ale Mug", promptModifier: "wooden mug of ale, foam top, tavern drink, medieval beer", category: "CONSUMABLES", subcategory: "DRINKS" },
      { id: "food_wine", name: "Wine Bottle", promptModifier: "glass wine bottle, red wine, cork, medieval drink", category: "CONSUMABLES", subcategory: "DRINKS" },
    ],
  },
  {
    id: "MONSTER_DROPS",
    name: "Monster Drops",
    emoji: "👹",
    description: "Items dropped by defeated monsters",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "DARK_SOULS",
    items: [
      { id: "drop_fang", name: "Beast Fang", promptModifier: "large monster fang, sharp tooth, beast trophy, crafting material", category: "RESOURCES", subcategory: "MONSTER_PARTS" },
      { id: "drop_claw", name: "Dragon Claw", promptModifier: "dragon claw, sharp talons, scaly, monster trophy", category: "RESOURCES", subcategory: "MONSTER_PARTS" },
      { id: "drop_scale", name: "Dragon Scale", promptModifier: "iridescent dragon scale, armor-like, magical material", category: "RESOURCES", subcategory: "MONSTER_PARTS" },
      { id: "drop_eye", name: "Demon Eye", promptModifier: "glowing demon eye, evil eye, magical ingredient, occult item", category: "RESOURCES", subcategory: "MONSTER_PARTS" },
      { id: "drop_horn", name: "Minotaur Horn", promptModifier: "curved monster horn, bone material, trophy item", category: "RESOURCES", subcategory: "MONSTER_PARTS" },
      { id: "drop_essence", name: "Soul Essence", promptModifier: "glowing soul essence, ethereal orb, magical spirit, ghost energy", category: "RESOURCES", subcategory: "MAGICAL" },
    ],
  },
  {
    id: "CRAFTING_MATERIALS",
    name: "Crafting Materials",
    emoji: "🔨",
    description: "Basic crafting resources",
    itemCount: 6,
    creditsRequired: 6,
    suggestedStyle: "PIXEL_ART_16",
    items: [
      { id: "craft_wood", name: "Wood Planks", promptModifier: "stack of wood planks, lumber, building material, carpentry", category: "RESOURCES", subcategory: "MATERIALS" },
      { id: "craft_iron", name: "Iron Ingot", promptModifier: "iron ingot, metal bar, smithing material, forging resource", category: "RESOURCES", subcategory: "METALS" },
      { id: "craft_gold", name: "Gold Ingot", promptModifier: "gold ingot, precious metal bar, shiny, valuable resource", category: "RESOURCES", subcategory: "METALS" },
      { id: "craft_leather", name: "Leather Hide", promptModifier: "tanned leather hide, animal skin, crafting material", category: "RESOURCES", subcategory: "MATERIALS" },
      { id: "craft_cloth", name: "Cloth Bundle", promptModifier: "rolled cloth bundle, fabric, textile, tailoring material", category: "RESOURCES", subcategory: "MATERIALS" },
      { id: "craft_herb", name: "Herb Bundle", promptModifier: "tied herb bundle, dried plants, alchemy ingredient, green herbs", category: "RESOURCES", subcategory: "PLANTS" },
    ],
  },
];

// ===========================================
// FEATURE CREDITS COST
// ===========================================

export const FEATURE_COSTS = {
  SPRITE_SHEET: {
    // Cost per frame (uses standard generation)
    perFrame: 1,
  },
  STYLE_MIX: {
    // Additional cost for style mixing
    extraCost: 0, // Free! It's just prompt engineering
  },
  COLOR_PALETTE: {
    // Additional cost for palette lock
    extraCost: 0, // Free! It's just prompt engineering
  },
};

// ===========================================
// SPRITE SHEET OUTPUT CONFIG
// ===========================================

export interface SpriteSheetConfig {
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  padding: number;
  backgroundColor: string;
}

export const SPRITE_SHEET_DEFAULTS: SpriteSheetConfig = {
  tileWidth: 256,
  tileHeight: 256,
  columns: 4, // Will adjust based on frame count
  rows: 1,
  padding: 0,
  backgroundColor: "transparent",
};
