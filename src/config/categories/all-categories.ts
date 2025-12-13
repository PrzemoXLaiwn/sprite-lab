// ===========================================
// SPRITELAB CONFIG - ALL CATEGORIES
// ===========================================
// Category definitions for UI display
// These define WHAT categories exist and their subcategories

import type { CategoryUI, SubcategoryUI } from "../types";

// ===========================================
// WEAPONS CATEGORY
// ===========================================
export const WEAPONS: CategoryUI = {
  id: "WEAPONS",
  name: "Weapons",
  icon: "Swords",
  description: "All types of combat weapons",
  supports3D: true,
  subcategories: [
    { id: "SWORDS", name: "Swords", examples: ["longsword", "katana", "dagger"] },
    { id: "AXES", name: "Axes & Hammers", examples: ["battleaxe", "warhammer", "mace"] },
    { id: "POLEARMS", name: "Polearms", examples: ["spear", "halberd", "trident"] },
    { id: "BOWS", name: "Bows", examples: ["longbow", "crossbow", "shortbow"] },
    { id: "STAFFS", name: "Staffs & Wands", examples: ["wizard staff", "magic wand", "scepter"] },
    { id: "GUNS", name: "Firearms", examples: ["pistol", "rifle", "blaster"] },
    { id: "THROWING", name: "Throwing", examples: ["shuriken", "throwing knife", "javelin"] },
  ],
};

// ===========================================
// ARMOR CATEGORY
// ===========================================
export const ARMOR: CategoryUI = {
  id: "ARMOR",
  name: "Armor",
  icon: "Shield",
  description: "Protective equipment and accessories",
  supports3D: true,
  subcategories: [
    { id: "HELMETS", name: "Helmets", examples: ["knight helmet", "crown", "wizard hat"] },
    { id: "CHEST_ARMOR", name: "Chest Armor", examples: ["plate armor", "chainmail", "leather vest"] },
    { id: "SHIELDS", name: "Shields", examples: ["tower shield", "round shield", "buckler"] },
    { id: "GLOVES", name: "Gloves", examples: ["gauntlets", "leather gloves", "bracers"] },
    { id: "BOOTS", name: "Boots", examples: ["plate boots", "leather boots", "sandals"] },
    { id: "ACCESSORIES", name: "Accessories", examples: ["ring", "amulet", "cape", "belt"] },
  ],
};

// ===========================================
// CONSUMABLES CATEGORY
// ===========================================
export const CONSUMABLES: CategoryUI = {
  id: "CONSUMABLES",
  name: "Consumables",
  icon: "FlaskConical",
  description: "Potions, food, and scrolls",
  supports3D: true,
  subcategories: [
    { id: "POTIONS", name: "Potions", examples: ["health potion", "mana potion", "poison"] },
    { id: "FOOD", name: "Food", examples: ["apple", "bread", "meat", "cheese"] },
    { id: "SCROLLS", name: "Scrolls", examples: ["spell scroll", "treasure map", "ancient tome"] },
  ],
};

// ===========================================
// RESOURCES CATEGORY
// ===========================================
export const RESOURCES: CategoryUI = {
  id: "RESOURCES",
  name: "Resources",
  icon: "Gem",
  description: "Crafting materials and resources",
  supports3D: true,
  subcategories: [
    { id: "GEMS", name: "Gems", examples: ["diamond", "ruby", "emerald", "sapphire"] },
    { id: "ORES", name: "Ores", examples: ["iron ore", "gold ore", "copper ore"] },
    { id: "WOOD_STONE", name: "Wood & Stone", examples: ["wood log", "stone", "marble"] },
    { id: "PLANTS", name: "Plants", examples: ["herb", "flower", "mushroom"] },
    { id: "MONSTER_PARTS", name: "Monster Parts", examples: ["dragon scale", "fang", "feather"] },
    { id: "MAGIC_MATERIALS", name: "Magic Materials", examples: ["soul gem", "magic dust", "essence"] },
  ],
};

// ===========================================
// QUEST ITEMS CATEGORY
// ===========================================
export const QUEST_ITEMS: CategoryUI = {
  id: "QUEST_ITEMS",
  name: "Items",
  icon: "Key",
  description: "Quest items and collectibles",
  supports3D: true,
  subcategories: [
    { id: "KEYS", name: "Keys", examples: ["golden key", "skeleton key", "crystal key"] },
    { id: "ARTIFACTS", name: "Artifacts", examples: ["ancient idol", "holy grail", "magic mirror"] },
    { id: "CONTAINERS", name: "Containers", examples: ["treasure chest", "wooden crate", "backpack"] },
    { id: "COLLECTIBLES", name: "Collectibles", examples: ["gold coin", "medal", "trophy"] },
  ],
};

// ===========================================
// CHARACTERS CATEGORY
// ===========================================
export const CHARACTERS: CategoryUI = {
  id: "CHARACTERS",
  name: "Characters",
  icon: "Users",
  description: "Heroes, enemies, and NPCs",
  supports3D: true,
  subcategories: [
    { id: "HEROES", name: "Heroes", examples: ["knight", "mage", "rogue", "archer"] },
    { id: "ENEMIES", name: "Enemies", examples: ["goblin", "skeleton", "zombie", "orc"] },
    { id: "NPCS", name: "NPCs", examples: ["shopkeeper", "blacksmith", "guard", "villager"] },
    { id: "BOSSES", name: "Bosses", examples: ["dragon boss", "demon lord", "lich king"] },
  ],
};

// ===========================================
// CREATURES CATEGORY
// ===========================================
export const CREATURES: CategoryUI = {
  id: "CREATURES",
  name: "Creatures",
  icon: "PawPrint",
  description: "Animals and mythical beasts",
  supports3D: true,
  subcategories: [
    { id: "ANIMALS", name: "Animals", examples: ["wolf", "bear", "horse", "eagle"] },
    { id: "MYTHICAL", name: "Mythical", examples: ["dragon", "phoenix", "unicorn", "griffin"] },
    { id: "PETS", name: "Companions", examples: ["cat", "dog", "fairy", "baby dragon", "slime"] },
    { id: "ELEMENTALS", name: "Elementals", examples: ["fire elemental", "water elemental", "golem"] },
  ],
};

// ===========================================
// ENVIRONMENT CATEGORY
// ===========================================
export const ENVIRONMENT: CategoryUI = {
  id: "ENVIRONMENT",
  name: "Environment",
  icon: "Trees",
  description: "Trees, buildings, and props",
  supports3D: true,
  subcategories: [
    { id: "TREES_PLANTS", name: "Trees & Plants", examples: ["oak tree", "pine tree", "bush", "flowers"] },
    { id: "ROCKS_TERRAIN", name: "Rocks", examples: ["boulder", "crystal formation", "cliff"] },
    { id: "BUILDINGS", name: "Buildings", examples: ["house", "castle tower", "shop", "temple"] },
    { id: "PROPS", name: "Props", examples: ["chair", "table", "barrel", "torch", "sign"] },
    { id: "DUNGEON", name: "Dungeon", examples: ["spike trap", "lever", "door", "altar", "cage"] },
    { id: "ISO_BUILDINGS", name: "Isometric Buildings", examples: ["iso house", "iso shop", "iso tower"] },
    { id: "ISO_TREES", name: "Isometric Trees", examples: ["iso oak", "iso pine", "iso palm"] },
    { id: "ISO_PROPS", name: "Isometric Props", examples: ["iso barrel", "iso crate", "iso lamp"] },
    { id: "ISO_TERRAIN", name: "Isometric Terrain", examples: ["iso cliff", "iso water", "iso path"] },
  ],
};

// ===========================================
// ISOMETRIC CATEGORY (Dedicated)
// ===========================================
export const ISOMETRIC: CategoryUI = {
  id: "ISOMETRIC",
  name: "Isometric",
  icon: "Box",
  description: "2.5D isometric game assets",
  supports3D: false,
  subcategories: [
    { id: "ISO_HOUSES", name: "Houses", examples: ["cottage", "villa", "medieval house", "modern house"] },
    { id: "ISO_COMMERCIAL", name: "Commercial", examples: ["shop", "tavern", "bakery", "blacksmith"] },
    { id: "ISO_MILITARY", name: "Military", examples: ["barracks", "tower", "fortress", "wall"] },
    { id: "ISO_PRODUCTION", name: "Production", examples: ["farm", "mine", "sawmill", "windmill"] },
    { id: "ISO_SPECIAL", name: "Special", examples: ["castle", "temple", "monument", "wonder"] },
    { id: "ISO_VEGETATION", name: "Vegetation", examples: ["tree", "bush", "flowers", "crops"] },
    { id: "ISO_DECORATIONS", name: "Decorations", examples: ["lamp post", "fountain", "bench", "statue"] },
    { id: "ISO_TERRAIN", name: "Terrain", examples: ["cliff", "water", "path", "bridge"] },
    { id: "ISO_TILES", name: "Tiles", examples: ["grass tile", "road tile", "water tile", "sand tile"] },
  ],
};

// ===========================================
// TILESETS CATEGORY
// ===========================================
export const TILESETS: CategoryUI = {
  id: "TILESETS",
  name: "Tilesets",
  icon: "LayoutGrid",
  description: "Tileable game textures",
  supports3D: false,
  subcategories: [
    { id: "GROUND", name: "Ground", examples: ["grass tile", "dirt tile", "stone floor", "sand"] },
    { id: "WALLS", name: "Walls", examples: ["stone wall", "brick wall", "wooden wall"] },
    { id: "PLATFORMS", name: "Platforms", examples: ["grass platform", "stone platform", "floating island"] },
    { id: "DECORATIVE", name: "Decorative", examples: ["window tile", "door tile", "crack overlay"] },
  ],
};

// ===========================================
// UI ELEMENTS CATEGORY
// ===========================================
export const UI_ELEMENTS: CategoryUI = {
  id: "UI_ELEMENTS",
  name: "UI",
  icon: "Monitor",
  description: "Interface elements and icons",
  supports3D: false,
  subcategories: [
    { id: "BUTTONS", name: "Buttons", examples: ["play button", "menu button", "close button"] },
    { id: "BARS", name: "Bars", examples: ["health bar", "mana bar", "XP bar"] },
    { id: "FRAMES", name: "Frames", examples: ["dialog frame", "inventory panel", "menu frame"] },
    { id: "INVENTORY", name: "Inventory", examples: ["item slot", "equipment slot", "quick bar"] },
    { id: "ICONS_UI", name: "UI Icons", examples: ["settings icon", "inventory icon", "map icon"] },
    { id: "SKILL_ICONS", name: "Skills", examples: ["attack skill", "heal skill", "buff icon"] },
  ],
};

// ===========================================
// EFFECTS CATEGORY
// ===========================================
export const EFFECTS: CategoryUI = {
  id: "EFFECTS",
  name: "Effects",
  icon: "Sparkles",
  description: "Visual effects and particles",
  supports3D: false,
  subcategories: [
    { id: "COMBAT_EFFECTS", name: "Combat", examples: ["slash effect", "hit impact", "explosion"] },
    { id: "MAGIC_EFFECTS", name: "Magic", examples: ["fireball", "ice spike", "healing aura"] },
    { id: "ELEMENTAL", name: "Elemental", examples: ["fire", "ice crystal", "lightning spark"] },
    { id: "AMBIENT", name: "Ambient", examples: ["sparkle", "dust", "smoke", "rain drop"] },
  ],
};

// ===========================================
// PROJECTILES CATEGORY
// ===========================================
export const PROJECTILES: CategoryUI = {
  id: "PROJECTILES",
  name: "Projectiles",
  icon: "Target",
  description: "Arrows, bullets, and magic projectiles",
  supports3D: false,
  subcategories: [
    { id: "ARROWS", name: "Arrows", examples: ["arrow", "fire arrow", "ice arrow"] },
    { id: "BULLETS", name: "Bullets", examples: ["bullet", "cannonball", "rocket"] },
    { id: "MAGIC_PROJECTILES", name: "Magic Projectiles", examples: ["fireball", "ice bolt", "shadow ball"] },
    { id: "THROWN", name: "Thrown", examples: ["thrown knife", "shuriken", "bomb"] },
  ],
};

// ===========================================
// ALL CATEGORIES ARRAY
// ===========================================
export const ALL_CATEGORIES: CategoryUI[] = [
  WEAPONS,
  ARMOR,
  CONSUMABLES,
  RESOURCES,
  QUEST_ITEMS,
  CHARACTERS,
  CREATURES,
  ENVIRONMENT,
  ISOMETRIC,
  TILESETS,
  UI_ELEMENTS,
  EFFECTS,
  PROJECTILES,
];

// ===========================================
// CATEGORY IDS
// ===========================================
export const CATEGORY_IDS = ALL_CATEGORIES.map((c) => c.id);
