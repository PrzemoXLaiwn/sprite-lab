// ===========================================
// AI GAME ASSET GENERATOR - CATEGORY SYSTEM
// ===========================================

// ===========================================
// TYPES
// ===========================================
export interface Subcategory {
  id: string;
  name: string;
  description: string;
  examples: string[];
  promptGuide: string;
  technicalRequirements: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  subcategories: Subcategory[];
  globalPromptRules: string;
  globalNegativePrompt: string;
  supports3D: boolean;
}

// ===========================================
// CATEGORY: WEAPONS
// ===========================================
const WEAPONS: Category = {
  id: "WEAPONS",
  name: "Weapons",
  icon: "⚔️",
  description: "All types of weapons for combat",
  globalPromptRules: "single weapon, full weapon visible from tip to handle end, centered, white background, game asset, clean design",
  globalNegativePrompt: "hands, fingers, holding, person, arm, multiple weapons, cropped, cut off, partial",
  supports3D: true,
  subcategories: [
    {
      id: "SWORDS",
      name: "Swords & Blades",
      description: "Swords, katanas, daggers, and bladed weapons",
      examples: ["longsword", "katana", "dagger", "rapier", "claymore", "scimitar", "shortsword"],
      promptGuide: "sword weapon, sharp blade, handle with grip and guard, vertical orientation",
      technicalRequirements: "blade pointing up, handle at bottom, full blade visible"
    },
    {
      id: "AXES",
      name: "Axes & Hammers",
      description: "Axes, hammers, maces, and blunt weapons",
      examples: ["battleaxe", "warhammer", "mace", "hatchet", "morning star", "flail"],
      promptGuide: "heavy weapon, metal head, wooden or metal handle",
      technicalRequirements: "weapon head at top, handle at bottom, full weapon visible"
    },
    {
      id: "POLEARMS",
      name: "Polearms & Spears",
      description: "Spears, lances, halberds, and long weapons",
      examples: ["spear", "lance", "halberd", "trident", "pike", "glaive", "naginata"],
      promptGuide: "long polearm weapon, pointed tip, long shaft",
      technicalRequirements: "vertical orientation, tip at top, full length visible"
    },
    {
      id: "BOWS",
      name: "Bows & Crossbows",
      description: "Ranged weapons with strings",
      examples: ["longbow", "shortbow", "crossbow", "recurve bow", "compound bow"],
      promptGuide: "ranged weapon, curved shape, bowstring visible",
      technicalRequirements: "full bow visible, string taut, no arrows nocked"
    },
    {
      id: "STAFFS",
      name: "Staffs & Wands",
      description: "Magical weapons and focuses",
      examples: ["wizard staff", "magic wand", "scepter", "druid staff", "crystal rod"],
      promptGuide: "magic weapon, ornate top with crystal or orb, long handle",
      technicalRequirements: "vertical orientation, ornate head at top, full length visible"
    },
    {
      id: "GUNS",
      name: "Guns & Firearms",
      description: "Pistols, rifles, and ranged firearms",
      examples: ["pistol", "rifle", "shotgun", "musket", "blaster", "ray gun"],
      promptGuide: "firearm, barrel, grip, trigger visible",
      technicalRequirements: "horizontal orientation, barrel pointing right, full weapon visible"
    },
    {
      id: "THROWING",
      name: "Throwing Weapons",
      description: "Thrown projectile weapons",
      examples: ["throwing knife", "shuriken", "javelin", "boomerang", "kunai"],
      promptGuide: "small throwing weapon, aerodynamic shape",
      technicalRequirements: "single item, compact size, centered"
    }
  ]
};

// ===========================================
// CATEGORY: ARMOR
// ===========================================
const ARMOR: Category = {
  id: "ARMOR",
  name: "Armor & Equipment",
  icon: "🛡️",
  description: "Protective gear and equipment",
  globalPromptRules: "single armor piece, front view, symmetrical, white background, game asset, clean design",
  globalNegativePrompt: "person wearing, body, mannequin, multiple items, cropped",
  supports3D: true,
  subcategories: [
    {
      id: "HELMETS",
      name: "Helmets & Headgear",
      description: "Head protection and accessories",
      examples: ["knight helmet", "viking helmet", "wizard hat", "crown", "hood", "tiara", "mask"],
      promptGuide: "headwear, front view, as if on invisible head",
      technicalRequirements: "front facing, symmetrical, eye slots visible if helmet"
    },
    {
      id: "CHEST_ARMOR",
      name: "Chest Armor",
      description: "Body armor and clothing",
      examples: ["plate armor", "chainmail", "leather vest", "robe", "tunic", "breastplate"],
      promptGuide: "torso armor, front view, as if on invisible mannequin",
      technicalRequirements: "front facing, symmetrical, shoulders to waist visible"
    },
    {
      id: "SHIELDS",
      name: "Shields",
      description: "Defensive shields",
      examples: ["tower shield", "round shield", "kite shield", "buckler", "magic barrier"],
      promptGuide: "defensive shield, front face visible, handle on back hidden",
      technicalRequirements: "front view, full shield visible, centered"
    },
    {
      id: "GLOVES",
      name: "Gloves & Gauntlets",
      description: "Hand protection",
      examples: ["gauntlets", "leather gloves", "magic gloves", "bracers", "armguards"],
      promptGuide: "single glove or pair, palm or back view",
      technicalRequirements: "single item or matching pair, detailed fingers"
    },
    {
      id: "BOOTS",
      name: "Boots & Footwear",
      description: "Foot protection",
      examples: ["plate boots", "leather boots", "magic shoes", "sandals", "greaves"],
      promptGuide: "single boot or pair, side or front view",
      technicalRequirements: "single item or matching pair, full boot visible"
    },
    {
      id: "ACCESSORIES",
      name: "Accessories",
      description: "Belts, capes, jewelry",
      examples: ["belt", "cape", "cloak", "ring", "amulet", "necklace", "earring", "bracelet"],
      promptGuide: "single accessory item, detailed",
      technicalRequirements: "single item, centered, full item visible"
    }
  ]
};

// ===========================================
// CATEGORY: CONSUMABLES
// ===========================================
const CONSUMABLES: Category = {
  id: "CONSUMABLES",
  name: "Consumables",
  icon: "🧪",
  description: "Potions, food, and usable items",
  globalPromptRules: "single item, 3/4 view or front view, white background, game inventory icon, clean design",
  globalNegativePrompt: "multiple items, hands, person, table, surface, cluttered",
  supports3D: true,
  subcategories: [
    {
      id: "POTIONS",
      name: "Potions & Elixirs",
      description: "Magical drinks and brews",
      examples: ["health potion", "mana potion", "stamina potion", "poison", "antidote", "buff potion"],
      promptGuide: "glass bottle with colored liquid inside, cork stopper, glowing effect",
      technicalRequirements: "bottle shape clear, liquid color visible, subtle glow, cork on top"
    },
    {
      id: "FOOD",
      name: "Food & Drinks",
      description: "Edible items",
      examples: ["apple", "bread", "meat", "cheese", "fish", "cake", "soup", "ale", "water flask"],
      promptGuide: "appetizing food item, fresh appearance, vibrant colors",
      technicalRequirements: "single food item, looks edible and fresh"
    },
    {
      id: "SCROLLS",
      name: "Scrolls & Books",
      description: "Readable magical items",
      examples: ["spell scroll", "treasure map", "recipe book", "ancient tome", "letter"],
      promptGuide: "paper item, rolled scroll or book, aged or magical appearance",
      technicalRequirements: "scroll rolled or partially open, book closed or slightly open"
    }
  ]
};

// ===========================================
// CATEGORY: RESOURCES
// ===========================================
const RESOURCES: Category = {
  id: "RESOURCES",
  name: "Resources & Materials",
  icon: "💎",
  description: "Crafting materials and resources",
  globalPromptRules: "single resource item, 3/4 view, white background, game inventory icon, clean design",
  globalNegativePrompt: "multiple items, pile, stack, hands, mining, environment",
  supports3D: true,
  subcategories: [
    {
      id: "GEMS",
      name: "Gems & Crystals",
      description: "Precious stones and crystals",
      examples: ["diamond", "ruby", "emerald", "sapphire", "amethyst", "crystal", "geode"],
      promptGuide: "precious gem, faceted cut, sparkling, light refraction",
      technicalRequirements: "clear facets, internal glow, sparkling highlights"
    },
    {
      id: "ORES",
      name: "Ores & Metals",
      description: "Raw ores and refined metals",
      examples: ["iron ore", "gold ore", "copper ore", "gold bar", "steel ingot", "mithril"],
      promptGuide: "ore chunk with visible metal veins, or refined metal bar/ingot",
      technicalRequirements: "rough texture for ore, smooth for ingot, metallic sheen"
    },
    {
      id: "WOOD_STONE",
      name: "Wood & Stone",
      description: "Natural building materials",
      examples: ["wood log", "plank", "stone", "marble", "granite", "obsidian"],
      promptGuide: "natural material, visible texture and grain",
      technicalRequirements: "wood grain visible, stone texture clear"
    },
    {
      id: "PLANTS",
      name: "Plants & Herbs",
      description: "Botanical resources",
      examples: ["herb", "flower", "mushroom", "seeds", "roots", "magic plant"],
      promptGuide: "fresh plant, vibrant colors, natural appearance",
      technicalRequirements: "leaves/petals detailed, fresh appearance"
    },
    {
      id: "MONSTER_PARTS",
      name: "Monster Parts",
      description: "Drops from creatures",
      examples: ["dragon scale", "fang", "claw", "feather", "bone", "hide", "horn", "eye"],
      promptGuide: "creature part, trophy item, organic material",
      technicalRequirements: "detailed texture, looks like part of larger creature"
    },
    {
      id: "MAGIC_MATERIALS",
      name: "Magic Materials",
      description: "Magical crafting components",
      examples: ["essence", "soul gem", "magic dust", "elemental core", "enchanted fabric"],
      promptGuide: "magical material, glowing, ethereal appearance",
      technicalRequirements: "magical glow, ethereal quality, mystical appearance"
    }
  ]
};

// ===========================================
// CATEGORY: QUEST ITEMS
// ===========================================
const QUEST_ITEMS: Category = {
  id: "QUEST_ITEMS",
  name: "Quest Items",
  icon: "🔑",
  description: "Special items for quests and story",
  globalPromptRules: "single special item, mysterious or important appearance, white background, game asset",
  globalNegativePrompt: "common item, boring, plain, multiple items, hands",
  supports3D: true,
  subcategories: [
    {
      id: "KEYS",
      name: "Keys",
      description: "Keys and lockpicks",
      examples: ["iron key", "golden key", "skeleton key", "crystal key", "master key", "keycard"],
      promptGuide: "ornate key, detailed head, unique design",
      technicalRequirements: "full key visible, ornate bow (head), distinct teeth"
    },
    {
      id: "ARTIFACTS",
      name: "Artifacts & Relics",
      description: "Ancient and powerful items",
      examples: ["ancient idol", "holy grail", "magic mirror", "crystal ball", "sacred relic"],
      promptGuide: "ancient powerful artifact, ornate, mysterious, glowing",
      technicalRequirements: "aged appearance, intricate details, magical aura"
    },
    {
      id: "CONTAINERS",
      name: "Chests & Containers",
      description: "Storage and treasure containers",
      examples: ["treasure chest", "wooden crate", "jewelry box", "magic bag", "backpack"],
      promptGuide: "container, 3/4 view, detailed lid and body",
      technicalRequirements: "3/4 view, hinges visible, can be closed or slightly open"
    },
    {
      id: "COLLECTIBLES",
      name: "Collectibles",
      description: "Coins, trophies, tokens",
      examples: ["gold coin", "medal", "trophy", "badge", "token", "collectible card"],
      promptGuide: "small valuable item, shiny, collectible quality",
      technicalRequirements: "detailed surface, shiny, small size"
    }
  ]
};

// ===========================================
// CATEGORY: CHARACTERS
// ===========================================
const CHARACTERS: Category = {
  id: "CHARACTERS",
  name: "Characters",
  icon: "👤",
  description: "Playable and non-playable characters",
  globalPromptRules: "full body character, front view, standing pose, centered, white background, game sprite, character design",
  globalNegativePrompt: "cropped, partial body, multiple characters, background scene, sitting, lying down",
  supports3D: true,
  subcategories: [
    {
      id: "HEROES",
      name: "Heroes & Players",
      description: "Playable hero characters",
      examples: ["knight", "warrior", "mage", "wizard", "rogue", "archer", "paladin", "assassin", "priest", "ranger"],
      promptGuide: "heroic character, determined expression, equipped with class-appropriate gear",
      technicalRequirements: "full body, head to toe, neutral or ready stance, facing forward"
    },
    {
      id: "ENEMIES",
      name: "Enemies & Monsters",
      description: "Hostile creatures and enemies",
      examples: ["goblin", "skeleton", "zombie", "orc", "demon", "slime", "vampire", "werewolf", "ghost"],
      promptGuide: "hostile creature, menacing appearance, ready to fight",
      technicalRequirements: "full body, threatening pose, facing forward"
    },
    {
      id: "NPCS",
      name: "NPCs",
      description: "Non-player characters",
      examples: ["shopkeeper", "blacksmith", "innkeeper", "guard", "villager", "merchant", "sage"],
      promptGuide: "friendly or neutral NPC, occupation-appropriate clothing",
      technicalRequirements: "full body, welcoming or neutral pose, facing forward"
    },
    {
      id: "BOSSES",
      name: "Bosses",
      description: "Major enemy bosses",
      examples: ["dragon boss", "demon lord", "lich king", "giant", "final boss", "dungeon boss"],
      promptGuide: "powerful boss creature, imposing size, intimidating appearance",
      technicalRequirements: "full body, dramatic pose, larger and more detailed than regular enemies"
    }
  ]
};

// ===========================================
// CATEGORY: CREATURES
// ===========================================
const CREATURES: Category = {
  id: "CREATURES",
  name: "Creatures",
  icon: "🐾",
  description: "Animals, monsters, and pets",
  globalPromptRules: "full creature, side view or 3/4 view, natural pose, white background, game sprite",
  globalNegativePrompt: "partial, cropped, multiple creatures, environment, background",
  supports3D: true,
  subcategories: [
    {
      id: "ANIMALS",
      name: "Animals",
      description: "Normal animals",
      examples: ["wolf", "bear", "horse", "deer", "eagle", "snake", "fish", "chicken", "cow"],
      promptGuide: "realistic animal, natural pose, detailed fur/feathers/scales",
      technicalRequirements: "full animal visible, natural standing or alert pose"
    },
    {
      id: "MYTHICAL",
      name: "Mythical Creatures",
      description: "Fantasy creatures",
      examples: ["dragon", "phoenix", "griffin", "unicorn", "pegasus", "basilisk", "hydra", "wyvern"],
      promptGuide: "mythical creature, majestic or fearsome, detailed fantasy anatomy",
      technicalRequirements: "full creature visible, wings spread if applicable"
    },
    {
      id: "PETS",
      name: "Pets & Companions",
      description: "Friendly companion creatures",
      examples: ["cat", "dog", "baby dragon", "fairy", "slime", "spirit companion", "familiar"],
      promptGuide: "cute or friendly creature, companion appearance, approachable",
      technicalRequirements: "full body, friendly pose, cute proportions"
    },
    {
      id: "ELEMENTALS",
      name: "Elementals & Spirits",
      description: "Elemental and spirit beings",
      examples: ["fire elemental", "water elemental", "earth golem", "air spirit", "shadow being", "light spirit"],
      promptGuide: "elemental creature made of element, magical appearance",
      technicalRequirements: "element clearly visible, ethereal or magical quality"
    }
  ]
};

// ===========================================
// CATEGORY: ENVIRONMENT
// ===========================================
const ENVIRONMENT: Category = {
  id: "ENVIRONMENT",
  name: "Environment",
  icon: "🏠",
  description: "World objects and scenery",
  globalPromptRules: "single environment object, game asset, clean design, white or transparent background",
  globalNegativePrompt: "full scene, landscape, multiple objects, characters, cluttered",
  supports3D: true,
  subcategories: [
    {
      id: "TREES_PLANTS",
      name: "Trees & Plants",
      description: "Vegetation for environments",
      examples: ["oak tree", "pine tree", "palm tree", "dead tree", "bush", "flowers", "vines", "grass"],
      promptGuide: "single plant or tree, full plant visible, natural appearance",
      technicalRequirements: "full tree from roots to crown, or complete plant"
    },
    {
      id: "ROCKS_TERRAIN",
      name: "Rocks & Terrain",
      description: "Terrain features",
      examples: ["boulder", "rock pile", "crystal formation", "stalagmite", "cliff piece"],
      promptGuide: "terrain object, natural rock or formation",
      technicalRequirements: "single formation, grounded base, natural texture"
    },
    {
      id: "BUILDINGS",
      name: "Buildings & Structures",
      description: "Architectural elements",
      examples: ["house", "castle tower", "shop", "inn", "temple", "hut", "dungeon entrance"],
      promptGuide: "building front view or isometric, complete structure",
      technicalRequirements: "complete building, door visible, architectural details"
    },
    {
      id: "PROPS",
      name: "Props & Furniture",
      description: "Interactive world objects",
      examples: ["chair", "table", "bed", "chest", "barrel", "crate", "torch", "sign", "ladder"],
      promptGuide: "furniture or prop, functional appearance, game scale",
      technicalRequirements: "single prop, complete object, usable appearance"
    },
    {
      id: "DUNGEON",
      name: "Dungeon Elements",
      description: "Dungeon specific objects",
      examples: ["spike trap", "lever", "pressure plate", "door", "gate", "altar", "pillar", "cage"],
      promptGuide: "dungeon element, ominous or functional, detailed",
      technicalRequirements: "single element, functional looking, dungeon aesthetic"
    },
    // =============== ISOMETRIC SUBCATEGORIES ===============
    {
      id: "ISO_BUILDINGS",
      name: "🔷 Isometric Buildings",
      description: "Isometric 2.5D buildings for strategy games",
      examples: ["cottage", "farmhouse", "medieval house", "tower", "castle", "shop", "windmill", "barn", "church"],
      promptGuide: "isometric building, 2.5D dimetric projection, strategy game style, complete structure with roof",
      technicalRequirements: "isometric 30-degree angle, full building visible, clear roof and walls, grounded base"
    },
    {
      id: "ISO_TREES",
      name: "🔷 Isometric Trees",
      description: "Isometric vegetation for strategy games",
      examples: ["isometric oak", "isometric pine", "isometric palm", "fruit tree", "autumn tree", "cherry blossom", "willow"],
      promptGuide: "isometric tree, 2.5D dimetric view, strategy game vegetation",
      technicalRequirements: "isometric angle, full tree from base to crown, round canopy shape"
    },
    {
      id: "ISO_PROPS",
      name: "🔷 Isometric Props",
      description: "Isometric world props and decorations",
      examples: ["well", "fountain", "fence", "cart", "barrel stack", "crates", "lamp post", "bench", "statue"],
      promptGuide: "isometric prop, 2.5D game asset, strategy game decoration",
      technicalRequirements: "isometric 30-degree angle, complete object, consistent with isometric building scale"
    },
    {
      id: "ISO_TERRAIN",
      name: "🔷 Isometric Terrain",
      description: "Isometric terrain features and natural elements",
      examples: ["rock formation", "cliff", "waterfall", "pond", "hill", "cave entrance", "ruins", "bridge"],
      promptGuide: "isometric terrain element, 2.5D natural feature, strategy game environment",
      technicalRequirements: "isometric projection, grounded base, integrates with tile grid"
    }
  ]
};

// ===========================================
// CATEGORY: ISOMETRIC (Dedicated Category)
// ===========================================
const ISOMETRIC: Category = {
  id: "ISOMETRIC",
  name: "Isometric Assets",
  icon: "🏰",
  description: "2.5D isometric game assets for strategy and city builders",
  globalPromptRules: "isometric 2.5D game asset, dimetric projection, 30-degree angle, strategy game style, clean edges",
  globalNegativePrompt: "perspective view, flat top-down, side view, tilted wrong angle, 3D rendered realistic, photorealistic",
  supports3D: false,
  subcategories: [
    {
      id: "ISO_HOUSES",
      name: "Houses & Homes",
      description: "Residential isometric buildings",
      examples: ["cottage", "farmhouse", "medieval house", "villa", "hut", "tent", "cabin", "mansion"],
      promptGuide: "isometric house, cozy residential building, complete with roof and door",
      technicalRequirements: "isometric 30-degree projection, full building, visible roof, walls, door, windows"
    },
    {
      id: "ISO_COMMERCIAL",
      name: "Shops & Commercial",
      description: "Commercial isometric buildings",
      examples: ["shop", "market stall", "bakery", "blacksmith", "tavern", "inn", "bank", "warehouse"],
      promptGuide: "isometric commercial building, shop with signage or distinct features",
      technicalRequirements: "isometric projection, shop front visible, distinctive commercial features"
    },
    {
      id: "ISO_MILITARY",
      name: "Military & Defense",
      description: "Defensive and military isometric structures",
      examples: ["tower", "castle", "fortress", "barracks", "wall section", "gate", "watchtower", "siege weapon"],
      promptGuide: "isometric military structure, defensive building, imposing and sturdy",
      technicalRequirements: "isometric angle, solid construction appearance, defensive features visible"
    },
    {
      id: "ISO_PRODUCTION",
      name: "Production Buildings",
      description: "Resource and production isometric buildings",
      examples: ["windmill", "watermill", "mine entrance", "lumber mill", "farm", "quarry", "forge", "workshop"],
      promptGuide: "isometric production building, functional industrial structure",
      technicalRequirements: "isometric projection, working/functional appearance, production features visible"
    },
    {
      id: "ISO_SPECIAL",
      name: "Special Buildings",
      description: "Unique and special isometric structures",
      examples: ["temple", "church", "wizard tower", "monument", "fountain plaza", "town hall", "library", "museum"],
      promptGuide: "isometric special building, unique architectural features, landmark quality",
      technicalRequirements: "isometric angle, distinctive design, decorative elements"
    },
    {
      id: "ISO_VEGETATION",
      name: "Trees & Vegetation",
      description: "Isometric trees and plants",
      examples: ["oak tree", "pine tree", "palm tree", "fruit tree", "bush cluster", "flower bed", "hedge", "large mushroom"],
      promptGuide: "isometric tree or vegetation, 2.5D plant, rounded canopy",
      technicalRequirements: "isometric view, full plant visible, consistent scale"
    },
    {
      id: "ISO_DECORATIONS",
      name: "Props & Decorations",
      description: "Isometric world decorations",
      examples: ["well", "fountain", "bench", "lamp post", "cart", "barrel", "crate", "sign post", "statue"],
      promptGuide: "isometric decoration prop, small world object, strategy game detail",
      technicalRequirements: "isometric 30-degree angle, small scale prop, detailed"
    },
    {
      id: "ISO_TERRAIN",
      name: "Terrain Features",
      description: "Isometric natural terrain",
      examples: ["rock pile", "cliff edge", "waterfall", "pond", "river section", "bridge", "path", "ruins"],
      promptGuide: "isometric terrain feature, natural environment element",
      technicalRequirements: "isometric projection, integrates with tile grid, natural appearance"
    },
    {
      id: "ISO_TILES",
      name: "Ground Tiles",
      description: "Isometric floor and ground tiles",
      examples: ["grass tile", "dirt path", "cobblestone", "water tile", "sand tile", "snow tile", "farm field"],
      promptGuide: "isometric ground tile, diamond-shaped base tile, seamless",
      technicalRequirements: "isometric diamond shape, tileable edges, consistent lighting direction"
    }
  ]
};

// ===========================================
// CATEGORY: TILESETS
// ===========================================
const TILESETS: Category = {
  id: "TILESETS",
  name: "Tilesets",
  icon: "🧱",
  description: "Tileable game tiles",
  globalPromptRules: "single tile, seamless edges, tileable pattern, square format, game tile",
  globalNegativePrompt: "non-tileable, obvious borders, characters, items, asymmetric edges",
  supports3D: false,
  subcategories: [
    {
      id: "GROUND",
      name: "Ground Tiles",
      description: "Floor and terrain tiles",
      examples: ["grass tile", "dirt tile", "stone floor", "sand", "snow", "water", "lava"],
      promptGuide: "seamless ground texture, top-down view, tileable pattern",
      technicalRequirements: "MUST be seamlessly tileable, consistent lighting, no obvious repeating pattern"
    },
    {
      id: "WALLS",
      name: "Wall Tiles",
      description: "Wall and barrier tiles",
      examples: ["stone wall", "brick wall", "dungeon wall", "wooden wall", "cave wall"],
      promptGuide: "seamless wall texture, front view, tileable pattern",
      technicalRequirements: "MUST be seamlessly tileable vertically, consistent texture"
    },
    {
      id: "PLATFORMS",
      name: "Platform Tiles",
      description: "Platformer tiles",
      examples: ["grass platform", "stone platform", "wooden platform", "floating island"],
      promptGuide: "platform tile, side view, clear top surface",
      technicalRequirements: "clear walkable top edge, sides detailed, tileable horizontally"
    },
    {
      id: "DECORATIVE",
      name: "Decorative Tiles",
      description: "Decoration and detail tiles",
      examples: ["window tile", "door tile", "crack overlay", "moss overlay", "decoration"],
      promptGuide: "decorative element, overlay or standalone",
      technicalRequirements: "works as overlay or standalone decoration"
    }
  ]
};

// ===========================================
// CATEGORY: UI ELEMENTS
// ===========================================
const UI_ELEMENTS: Category = {
  id: "UI_ELEMENTS",
  name: "UI Elements",
  icon: "🖥️",
  description: "User interface components",
  globalPromptRules: "clean UI element, crisp edges, scalable design, transparent background, game UI",
  globalNegativePrompt: "blurry, low resolution, 3D realistic, photograph, game scene, characters",
  supports3D: false,
  subcategories: [
    {
      id: "BUTTONS",
      name: "Buttons",
      description: "Clickable button designs",
      examples: ["play button", "menu button", "action button", "close button", "arrow button"],
      promptGuide: "UI button, clean design, clear clickable appearance, rounded or rectangular",
      technicalRequirements: "clear borders, readable, works at multiple sizes, consider pressed/hover states"
    },
    {
      id: "BARS",
      name: "Bars & Sliders",
      description: "Progress and status bars",
      examples: ["health bar", "mana bar", "stamina bar", "XP bar", "loading bar", "cooldown indicator"],
      promptGuide: "horizontal bar with frame, fill area visible, clear segments",
      technicalRequirements: "frame separate from fill, easy to show partial fill, clear empty/full states"
    },
    {
      id: "FRAMES",
      name: "Frames & Panels",
      description: "Window frames and panels",
      examples: ["dialog frame", "inventory panel", "character panel", "menu frame", "tooltip box"],
      promptGuide: "decorative frame or panel, clear border, expandable design",
      technicalRequirements: "9-slice compatible, clear corners and edges, scalable"
    },
    {
      id: "INVENTORY",
      name: "Inventory Elements",
      description: "Inventory UI pieces",
      examples: ["item slot", "equipment slot", "quick bar slot", "locked slot", "selected slot"],
      promptGuide: "square slot, clear border, empty interior",
      technicalRequirements: "square format, clear border, states (empty/hover/selected)"
    },
    {
      id: "ICONS_UI",
      name: "UI Icons",
      description: "Interface icons",
      examples: ["settings icon", "inventory icon", "map icon", "quest icon", "chat icon", "close icon"],
      promptGuide: "simple icon, clear silhouette, recognizable symbol",
      technicalRequirements: "simple, clear at small sizes, consistent style"
    },
    {
      id: "SKILL_ICONS",
      name: "Skill & Status Icons",
      description: "Ability and status effect icons",
      examples: ["attack skill", "heal skill", "buff icon", "debuff icon", "poison status", "shield buff"],
      promptGuide: "square icon, clear symbol representing effect, colored border optional",
      technicalRequirements: "square format, clear at 32x32, distinct from other icons"
    },
    {
      id: "DIALOG",
      name: "Dialog Elements",
      description: "Text and speech elements",
      examples: ["speech bubble", "thought bubble", "name plate", "quest marker", "exclamation mark"],
      promptGuide: "clean text container or indicator, clear shape",
      technicalRequirements: "space for text, pointer if speech bubble, clean design"
    },
    {
      id: "CONTROLS",
      name: "Controls",
      description: "Sliders, toggles, checkboxes",
      examples: ["slider", "checkbox", "toggle switch", "radio button", "dropdown arrow", "scroll bar"],
      promptGuide: "interactive control element, clear states",
      technicalRequirements: "on/off states clear, interactive appearance, clean design"
    }
  ]
};

// ===========================================
// CATEGORY: EFFECTS
// ===========================================
const EFFECTS: Category = {
  id: "EFFECTS",
  name: "Effects & Particles",
  icon: "✨",
  description: "Visual effects and particles",
  globalPromptRules: "effect graphic, transparent background, vibrant colors, dynamic appearance",
  globalNegativePrompt: "static, boring, dark, muddy colors, realistic photo, scene",
  supports3D: false,
  subcategories: [
    {
      id: "COMBAT_EFFECTS",
      name: "Combat Effects",
      description: "Attack and hit effects",
      examples: ["slash effect", "hit impact", "explosion", "blood splatter", "critical hit"],
      promptGuide: "dynamic effect, motion blur, impactful appearance",
      technicalRequirements: "transparent background, bright/vibrant, works as overlay"
    },
    {
      id: "MAGIC_EFFECTS",
      name: "Magic Effects",
      description: "Spell and magic visuals",
      examples: ["fireball", "ice spike", "lightning bolt", "healing aura", "magic circle", "portal"],
      promptGuide: "magical effect, glowing, elemental appearance",
      technicalRequirements: "transparent background, glowing, additive-blend friendly"
    },
    {
      id: "ELEMENTAL",
      name: "Elemental Effects",
      description: "Element-based effects",
      examples: ["fire", "flame", "ice crystal", "water splash", "lightning spark", "wind swirl", "earth crack"],
      promptGuide: "elemental effect, pure element visualization",
      technicalRequirements: "transparent background, element clearly identifiable"
    },
    {
      id: "AMBIENT",
      name: "Ambient Effects",
      description: "Environmental particles",
      examples: ["sparkle", "dust", "smoke", "bubble", "leaf", "rain drop", "snow flake", "light ray"],
      promptGuide: "small ambient particle or effect, subtle, atmospheric",
      technicalRequirements: "small size, transparent, works as scattered particles"
    }
  ]
};

// ===========================================
// CATEGORY: PROJECTILES
// ===========================================
const PROJECTILES: Category = {
  id: "PROJECTILES",
  name: "Projectiles",
  icon: "🎯",
  description: "Bullets, arrows, and thrown objects",
  globalPromptRules: "single projectile, in-flight appearance, horizontal orientation pointing right, transparent background",
  globalNegativePrompt: "multiple projectiles, bow, gun, launcher, character, hands",
  supports3D: false,
  subcategories: [
    {
      id: "ARROWS",
      name: "Arrows & Bolts",
      description: "Arrow projectiles",
      examples: ["arrow", "fire arrow", "ice arrow", "poison arrow", "crossbow bolt", "magic arrow"],
      promptGuide: "arrow in flight, horizontal, point facing right, optional trail effect",
      technicalRequirements: "horizontal orientation, tip pointing right, fletching visible"
    },
    {
      id: "BULLETS",
      name: "Bullets & Missiles",
      description: "Gun and launcher projectiles",
      examples: ["bullet", "cannonball", "rocket", "missile", "energy blast"],
      promptGuide: "projectile in motion, horizontal, optional motion blur",
      technicalRequirements: "horizontal, moving right, compact shape"
    },
    {
      id: "MAGIC_PROJECTILES",
      name: "Magic Projectiles",
      description: "Spell projectiles",
      examples: ["fireball", "ice bolt", "lightning orb", "shadow ball", "holy bolt", "arcane missile"],
      promptGuide: "magic projectile, glowing, elemental trail effect",
      technicalRequirements: "horizontal orientation, glowing core, energy trail"
    },
    {
      id: "THROWN",
      name: "Thrown Objects",
      description: "Thrown item projectiles",
      examples: ["thrown knife", "shuriken", "rock", "bomb", "potion bottle", "grenade"],
      promptGuide: "thrown item mid-air, rotation implied",
      technicalRequirements: "mid-flight appearance, slight rotation, compact"
    }
  ]
};

// ===========================================
// ALL CATEGORIES EXPORT
// ===========================================
export const ALL_CATEGORIES: Category[] = [
  WEAPONS,
  ARMOR,
  CONSUMABLES,
  RESOURCES,
  QUEST_ITEMS,
  CHARACTERS,
  CREATURES,
  ENVIRONMENT,
  ISOMETRIC, // Dedicated isometric category
  TILESETS,
  UI_ELEMENTS,
  EFFECTS,
  PROJECTILES
];

// ===========================================
// HELPER FUNCTIONS
// ===========================================
export function getCategoryById(id: string): Category | undefined {
  return ALL_CATEGORIES.find(cat => cat.id === id);
}

export function getSubcategoryById(categoryId: string, subcategoryId: string): Subcategory | undefined {
  const category = getCategoryById(categoryId);
  if (!category) return undefined;
  return category.subcategories.find(sub => sub.id === subcategoryId);
}

export function getAllSubcategories(): { category: Category; subcategory: Subcategory }[] {
  const result: { category: Category; subcategory: Subcategory }[] = [];
  for (const category of ALL_CATEGORIES) {
    for (const subcategory of category.subcategories) {
      result.push({ category, subcategory });
    }
  }
  return result;
}

// ===========================================
// STYLE DEFINITIONS
// ===========================================
export const STYLES = [
  {
    id: "PIXEL_ART",
    name: "Pixel Art",
    icon: "🎮",
    description: "Retro 16-bit game style",
    prompt: "pixel art, 16-bit, retro game style, clean pixels, limited color palette"
  },
  {
    id: "HAND_DRAWN",
    name: "Hand Drawn",
    icon: "✏️",
    description: "Sketchy illustrated style",
    prompt: "hand drawn, illustrated, sketch style, artistic, ink outlines"
  },
  {
    id: "REALISTIC",
    name: "Realistic",
    icon: "📷",
    description: "3D photorealistic style",
    prompt: "realistic 3D render, detailed textures, professional lighting, photorealistic"
  },
  {
    id: "ANIME",
    name: "Anime",
    icon: "🎌",
    description: "Japanese animation style",
    prompt: "anime style, cel shaded, vibrant colors, clean lines, JRPG style"
  },
  {
    id: "FLAT",
    name: "Flat Design",
    icon: "🔷",
    description: "Minimalist vector style",
    prompt: "flat design, vector art, minimalist, simple shapes, solid colors, clean"
  },
  {
    id: "CARTOON",
    name: "Cartoon",
    icon: "🎨",
    description: "Bold cartoon style",
    prompt: "cartoon style, bold outlines, exaggerated features, colorful, fun"
  },
  {
    id: "DARK_FANTASY",
    name: "Dark Fantasy",
    icon: "🖤",
    description: "Gothic dark style",
    prompt: "dark fantasy, gothic, grim, moody lighting, detailed, ominous"
  },
  {
    id: "CUTE",
    name: "Cute / Chibi",
    icon: "🌸",
    description: "Adorable chibi style",
    prompt: "cute, chibi, adorable, kawaii, big eyes, small body, rounded shapes"
  }
];

export function getStyleById(id: string) {
  return STYLES.find(s => s.id === id);
}