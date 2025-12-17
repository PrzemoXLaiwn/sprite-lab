// ===========================================
// SPRITELAB CONFIG - ALL CATEGORIES (FIXED v2.0)
// ===========================================
// CHANGES:
// - Added PANELS subcategory to UI_ELEMENTS
// - Combined AXES & HAMMERS description
// - Better examples throughout

import type { CategoryUI } from "../types";

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
    { id: "SWORDS", name: "Swords", examples: ["longsword", "katana", "dagger", "rapier"] },
    { id: "AXES", name: "Axes & Hammers", examples: ["battleaxe", "warhammer", "mace", "morningstar"] },
    { id: "POLEARMS", name: "Polearms", examples: ["spear", "halberd", "trident", "lance"] },
    { id: "BOWS", name: "Bows", examples: ["longbow", "crossbow", "shortbow", "compound bow"] },
    { id: "STAFFS", name: "Staffs & Wands", examples: ["wizard staff", "magic wand", "scepter", "rod"] },
    { id: "GUNS", name: "Firearms", examples: ["pistol", "rifle", "blaster", "musket"] },
    { id: "THROWING", name: "Throwing", examples: ["shuriken", "throwing knife", "javelin", "kunai"] },
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
    { id: "HELMETS", name: "Helmets", examples: ["knight helmet", "crown", "wizard hat", "viking helm"] },
    { id: "CHEST_ARMOR", name: "Chest Armor", examples: ["plate armor", "chainmail", "leather vest", "robe"] },
    { id: "SHIELDS", name: "Shields", examples: ["tower shield", "round shield", "buckler", "kite shield"] },
    { id: "GLOVES", name: "Gloves", examples: ["gauntlets", "leather gloves", "bracers", "hand wraps"] },
    { id: "BOOTS", name: "Boots", examples: ["plate boots", "leather boots", "sandals", "greaves"] },
    { id: "ACCESSORIES", name: "Accessories", examples: ["ring", "amulet", "cape", "belt", "necklace"] },
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
    { id: "POTIONS", name: "Potions", examples: ["health potion", "mana potion", "poison", "elixir"] },
    { id: "FOOD", name: "Food", examples: ["apple", "bread", "meat", "cheese", "pie"] },
    { id: "SCROLLS", name: "Scrolls", examples: ["spell scroll", "treasure map", "ancient tome", "recipe"] },
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
    { id: "GEMS", name: "Gems", examples: ["diamond", "ruby", "emerald", "sapphire", "amethyst"] },
    { id: "ORES", name: "Ores", examples: ["iron ore", "gold ore", "copper ore", "mythril"] },
    { id: "WOOD_STONE", name: "Wood & Stone", examples: ["wood log", "stone", "marble", "obsidian"] },
    { id: "PLANTS", name: "Plants", examples: ["herb", "flower", "mushroom", "magical plant"] },
    { id: "MONSTER_PARTS", name: "Monster Parts", examples: ["dragon scale", "fang", "feather", "claw"] },
    { id: "MAGIC_MATERIALS", name: "Magic Materials", examples: ["soul gem", "magic dust", "essence", "crystal"] },
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
    { id: "KEYS", name: "Keys", examples: ["golden key", "skeleton key", "crystal key", "ancient key"] },
    { id: "ARTIFACTS", name: "Artifacts", examples: ["ancient idol", "holy grail", "magic mirror", "orb"] },
    { id: "CONTAINERS", name: "Containers", examples: ["treasure chest", "wooden crate", "backpack", "pouch"] },
    { id: "COLLECTIBLES", name: "Collectibles", examples: ["gold coin", "medal", "trophy", "badge"] },
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
    { id: "HEROES", name: "Heroes", examples: ["knight", "mage", "rogue", "archer", "paladin"] },
    { id: "ENEMIES", name: "Enemies", examples: ["goblin", "skeleton", "zombie", "orc", "bandit"] },
    { id: "NPCS", name: "NPCs", examples: ["shopkeeper", "blacksmith", "guard", "villager", "innkeeper"] },
    { id: "BOSSES", name: "Bosses", examples: ["dragon boss", "demon lord", "lich king", "giant"] },
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
    { id: "ANIMALS", name: "Animals", examples: ["wolf", "bear", "horse", "eagle", "deer"] },
    { id: "MYTHICAL", name: "Mythical", examples: ["dragon", "phoenix", "unicorn", "griffin", "hydra"] },
    { id: "PETS", name: "Companions", examples: ["cat", "dog", "fairy", "baby dragon", "slime"] },
    { id: "ELEMENTALS", name: "Elementals", examples: ["fire elemental", "water elemental", "golem", "wisp"] },
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
    { id: "ROCKS_TERRAIN", name: "Rocks", examples: ["boulder", "crystal formation", "cliff", "stalagmite"] },
    { id: "BUILDINGS", name: "Buildings", examples: ["house", "castle tower", "shop", "temple", "cabin"] },
    { id: "PROPS", name: "Props", examples: ["chair", "table", "barrel", "torch", "sign", "lamp"] },
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
    { id: "WALLS", name: "Walls", examples: ["stone wall", "brick wall", "wooden wall", "dungeon wall"] },
    { id: "PLATFORMS", name: "Platforms", examples: ["grass platform", "stone platform", "floating island"] },
    { id: "DECORATIVE", name: "Decorative", examples: ["window tile", "door tile", "crack overlay", "moss"] },
  ],
};

// ===========================================
// UI ELEMENTS CATEGORY
// !!! FIXED: Added PANELS subcategory !!!
// ===========================================
export const UI_ELEMENTS: CategoryUI = {
  id: "UI_ELEMENTS",
  name: "UI",
  icon: "Monitor",
  description: "Interface elements and icons",
  supports3D: false,
  subcategories: [
    // ITEM ICONS - Most important! For generating inventory item icons
    { id: "ITEM_ICONS", name: "Item Icons", examples: ["gold bars icon", "potion icon", "sword icon", "gem icon", "coin stack icon", "key icon"] },
    { id: "SKILL_ICONS", name: "Skill Icons", examples: ["attack skill", "heal skill", "buff icon", "fireball skill", "shield ability"] },
    { id: "ICONS_UI", name: "UI Icons", examples: ["settings icon", "inventory icon", "map icon", "quest icon", "menu icon"] },
    { id: "BUTTONS", name: "Buttons", examples: ["play button", "menu button", "close button", "action button"] },
    { id: "BARS", name: "Bars", examples: ["health bar", "mana bar", "XP bar", "stamina bar"] },
    { id: "FRAMES", name: "Frames", examples: ["dialog frame", "menu frame", "tooltip frame", "window border"] },
    { id: "PANELS", name: "Panels", examples: ["inventory panel with slots", "equipment panel", "storage panel", "container panel"] },
    { id: "SLOTS_GRID", name: "Slot Grids", examples: ["empty item slot", "4 slot grid", "inventory grid", "equipment slot"] },
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
    { id: "COMBAT_EFFECTS", name: "Combat", examples: ["slash effect", "hit impact", "explosion", "blood splatter"] },
    { id: "MAGIC_EFFECTS", name: "Magic", examples: ["fireball", "ice spike", "healing aura", "magic circle"] },
    { id: "ELEMENTAL", name: "Elemental", examples: ["fire", "ice crystal", "lightning spark", "water splash"] },
    { id: "AMBIENT", name: "Ambient", examples: ["sparkle", "dust", "smoke", "rain drop", "snow flake"] },
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
    { id: "ARROWS", name: "Arrows", examples: ["arrow", "fire arrow", "ice arrow", "poison arrow"] },
    { id: "BULLETS", name: "Bullets", examples: ["bullet", "cannonball", "rocket", "energy shot"] },
    { id: "MAGIC_PROJECTILES", name: "Magic Projectiles", examples: ["fireball", "ice bolt", "shadow ball", "arcane missile"] },
    { id: "THROWN", name: "Thrown", examples: ["thrown knife", "shuriken", "bomb", "grenade"] },
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