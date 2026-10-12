// ===========================================
// RANDOM PROMPT GENERATOR
// Comprehensive prompt generation system for all categories
// ===========================================

// Base modifiers that can be combined
const PREFIXES = {
  rarity: ["common", "uncommon", "rare", "epic", "legendary", "mythical", "ancient", "cursed", "blessed", "divine"],
  material: ["iron", "steel", "bronze", "silver", "gold", "platinum", "diamond", "obsidian", "crystal", "jade", "ruby", "emerald", "sapphire", "mithril", "adamantine", "wooden", "bone", "stone"],
  style: ["ornate", "simple", "elegant", "rugged", "battle-worn", "pristine", "decorated", "minimalist", "intricate", "polished"],
  magic: ["enchanted", "magical", "glowing", "ethereal", "spectral", "arcane", "elemental", "mystic", "infused", "blessed"],
  condition: ["pristine", "worn", "ancient", "weathered", "cracked", "restored", "brand new", "battle-scarred"],
  era: ["medieval", "viking", "samurai", "roman", "greek", "egyptian", "fantasy", "steampunk", "cyberpunk", "futuristic"],
};

const SUFFIXES = {
  power: ["of power", "of strength", "of wisdom", "of the ancients", "of destruction", "of protection", "of healing", "of speed"],
  element: ["of fire", "of ice", "of lightning", "of shadow", "of light", "of nature", "of storm", "of void"],
  origin: ["from the depths", "of the realm", "of legends", "of kings", "of the forgotten", "of the lost kingdom", "from the mountains"],
  effect: ["with glowing runes", "with magical aura", "with gem inlays", "with intricate patterns", "with ethereal glow", "crackling with energy"],
};

const COLORS = ["red", "blue", "green", "purple", "golden", "silver", "black", "white", "crimson", "azure", "emerald", "violet", "orange", "teal", "pink", "dark", "bright"];

// Category-specific prompt templates
const CATEGORY_PROMPTS: Record<string, Record<string, PromptTemplate[]>> = {
  WEAPONS: {
    SWORDS: [
      { base: "longsword", variants: ["claymore", "broadsword", "bastard sword", "greatsword", "flamberge"] },
      { base: "katana", variants: ["wakizashi", "nodachi", "tanto", "ninja sword", "samurai blade"] },
      { base: "rapier", variants: ["foil", "estoc", "dueling blade", "fencing sword", "court sword"] },
      { base: "dagger", variants: ["stiletto", "dirk", "kris", "kukri", "hunting knife", "throwing knife"] },
      { base: "scimitar", variants: ["cutlass", "saber", "falchion", "shamshir", "curved blade"] },
      { base: "short sword", variants: ["gladius", "xiphos", "machete", "combat knife"] },
    ],
    AXES: [
      { base: "battleaxe", variants: ["war axe", "greataxe", "executioner axe", "bearded axe", "double-headed axe"] },
      { base: "warhammer", variants: ["maul", "sledgehammer", "thunder hammer", "siege hammer", "mace"] },
      { base: "mace", variants: ["morning star", "flail", "club", "scepter mace", "spiked mace"] },
      { base: "pickaxe", variants: ["war pick", "ice pick", "mining pick"] },
    ],
    POLEARMS: [
      { base: "spear", variants: ["lance", "pike", "javelin", "trident", "harpoon"] },
      { base: "halberd", variants: ["glaive", "bardiche", "pollaxe", "voulge", "guisarme"] },
      { base: "staff", variants: ["quarterstaff", "bo staff", "combat staff", "bladed staff"] },
      { base: "scythe", variants: ["war scythe", "reaper scythe", "death scythe", "crescent blade"] },
    ],
    BOWS: [
      { base: "longbow", variants: ["recurve bow", "compound bow", "hunting bow", "war bow", "elven bow"] },
      { base: "crossbow", variants: ["heavy crossbow", "repeating crossbow", "hand crossbow", "siege crossbow"] },
      { base: "shortbow", variants: ["composite bow", "horse bow", "light bow"] },
    ],
    STAFFS: [
      { base: "wizard staff", variants: ["arcane staff", "mage staff", "runic staff", "elder staff"] },
      { base: "magic wand", variants: ["spell wand", "crystal wand", "enchanted wand", "fairy wand"] },
      { base: "scepter", variants: ["royal scepter", "arcane scepter", "power scepter", "divine scepter"] },
      { base: "druid staff", variants: ["nature staff", "wooden staff", "living staff", "ancient staff"] },
    ],
    GUNS: [
      { base: "pistol", variants: ["revolver", "flintlock", "hand cannon", "derringer", "plasma pistol"] },
      { base: "rifle", variants: ["musket", "sniper rifle", "blaster rifle", "laser rifle", "hunting rifle"] },
      { base: "shotgun", variants: ["blunderbuss", "scatter gun", "combat shotgun", "sawed-off"] },
      { base: "crossbow pistol", variants: ["hand crossbow", "repeater pistol", "bolt pistol"] },
    ],
    THROWING: [
      { base: "shuriken", variants: ["throwing star", "ninja star", "wind blade", "razor star"] },
      { base: "throwing knife", variants: ["throwing dagger", "kunai", "spike", "dart"] },
      { base: "javelin", variants: ["throwing spear", "pilum", "harpoon", "throwing axe"] },
      { base: "boomerang", variants: ["chakram", "glaive disc", "war boomerang", "bladed ring"] },
    ],
  },
  ARMOR: {
    HELMETS: [
      { base: "knight helmet", variants: ["great helm", "crusader helm", "armet", "barbute", "close helmet"] },
      { base: "crown", variants: ["royal crown", "king crown", "tiara", "circlet", "diadem"] },
      { base: "wizard hat", variants: ["mage hat", "witch hat", "sorcerer hood", "mystical cap"] },
      { base: "hood", variants: ["assassin hood", "rogue hood", "leather hood", "mystical hood"] },
      { base: "viking helmet", variants: ["horned helmet", "norse helm", "berserker helm", "raider helm"] },
    ],
    CHEST_ARMOR: [
      { base: "plate armor", variants: ["full plate", "knight armor", "heavy armor", "gothic plate"] },
      { base: "chainmail", variants: ["chain shirt", "chain hauberk", "mail armor", "ring mail"] },
      { base: "leather vest", variants: ["leather armor", "studded leather", "hardened leather", "ranger vest"] },
      { base: "robe", variants: ["wizard robe", "mage robe", "mystic robe", "arcane vestments"] },
      { base: "breastplate", variants: ["cuirass", "half plate", "scale mail", "brigandine"] },
    ],
    SHIELDS: [
      { base: "tower shield", variants: ["pavise", "fortress shield", "siege shield", "wall shield"] },
      { base: "round shield", variants: ["viking shield", "targe", "buckler shield", "parrying shield"] },
      { base: "kite shield", variants: ["heater shield", "knight shield", "heraldic shield", "cavalry shield"] },
      { base: "buckler", variants: ["fist shield", "punch shield", "dueling shield", "small shield"] },
    ],
    GLOVES: [
      { base: "gauntlets", variants: ["plate gauntlets", "war gauntlets", "spiked gauntlets", "knight gloves"] },
      { base: "leather gloves", variants: ["archer gloves", "thief gloves", "assassin gloves", "ranger gloves"] },
      { base: "bracers", variants: ["arm guards", "wrist guards", "vambraces", "archer bracers"] },
      { base: "magic gloves", variants: ["enchanted gloves", "spell gloves", "mystic gloves", "elemental gloves"] },
    ],
    BOOTS: [
      { base: "plate boots", variants: ["knight boots", "heavy boots", "war boots", "sabatons"] },
      { base: "leather boots", variants: ["ranger boots", "traveler boots", "hunting boots", "scout boots"] },
      { base: "sandals", variants: ["gladiator sandals", "mystic sandals", "traveler sandals"] },
      { base: "magic boots", variants: ["speed boots", "flying boots", "enchanted boots", "winged boots"] },
    ],
    ACCESSORIES: [
      { base: "ring", variants: ["signet ring", "power ring", "magic ring", "wedding ring", "skull ring"] },
      { base: "amulet", variants: ["pendant", "necklace", "talisman", "charm", "medallion"] },
      { base: "cape", variants: ["cloak", "mantle", "royal cape", "hooded cloak", "shoulder cape"] },
      { base: "belt", variants: ["utility belt", "war belt", "leather belt", "champion belt", "jeweled belt"] },
    ],
  },
  CONSUMABLES: {
    POTIONS: [
      { base: "health potion", variants: ["healing elixir", "life potion", "restoration potion", "vitality potion"] },
      { base: "mana potion", variants: ["magic elixir", "arcane potion", "spirit potion", "essence potion"] },
      { base: "poison", variants: ["toxin vial", "venom flask", "deadly poison", "paralyzing poison"] },
      { base: "strength potion", variants: ["power elixir", "might potion", "warrior elixir", "giant strength"] },
      { base: "speed potion", variants: ["haste elixir", "swift potion", "agility potion", "dash potion"] },
      { base: "invisibility potion", variants: ["stealth elixir", "vanishing potion", "shadow potion"] },
    ],
    FOOD: [
      { base: "apple", variants: ["golden apple", "enchanted apple", "fruit", "berry"] },
      { base: "bread", variants: ["loaf of bread", "baguette", "roll", "pastry", "pie"] },
      { base: "meat", variants: ["steak", "drumstick", "roast", "ham", "bacon", "jerky"] },
      { base: "cheese", variants: ["cheese wheel", "cheese wedge", "aged cheese", "moldy cheese"] },
      { base: "fish", variants: ["cooked fish", "raw fish", "grilled fish", "fish steak"] },
    ],
    SCROLLS: [
      { base: "spell scroll", variants: ["magic scroll", "arcane scroll", "ancient scroll", "cursed scroll"] },
      { base: "treasure map", variants: ["pirate map", "dungeon map", "world map", "secret map"] },
      { base: "ancient tome", variants: ["spellbook", "grimoire", "forbidden book", "holy book", "encyclopedia"] },
      { base: "letter", variants: ["sealed letter", "royal decree", "wanted poster", "invitation"] },
    ],
  },
  RESOURCES: {
    GEMS: [
      { base: "diamond", variants: ["rough diamond", "cut diamond", "flawless diamond", "blood diamond"] },
      { base: "ruby", variants: ["fire ruby", "blood ruby", "star ruby", "enchanted ruby"] },
      { base: "emerald", variants: ["forest emerald", "royal emerald", "mystic emerald", "raw emerald"] },
      { base: "sapphire", variants: ["ocean sapphire", "star sapphire", "midnight sapphire", "celestial sapphire"] },
      { base: "amethyst", variants: ["purple amethyst", "shadow amethyst", "spirit amethyst"] },
      { base: "opal", variants: ["fire opal", "mystic opal", "rainbow opal", "black opal"] },
    ],
    ORES: [
      { base: "iron ore", variants: ["iron nugget", "raw iron", "iron ingot", "refined iron"] },
      { base: "gold ore", variants: ["gold nugget", "raw gold", "gold ingot", "pure gold"] },
      { base: "copper ore", variants: ["copper nugget", "raw copper", "copper ingot", "bronze ingot"] },
      { base: "silver ore", variants: ["silver nugget", "raw silver", "silver ingot", "pure silver"] },
      { base: "mythril ore", variants: ["mithril ore", "moonstone ore", "starmetal ore", "orichalcum ore"] },
    ],
    WOOD_STONE: [
      { base: "wood log", variants: ["oak log", "pine log", "birch log", "mahogany log", "enchanted wood"] },
      { base: "stone", variants: ["cobblestone", "granite", "limestone", "sandstone", "marble"] },
      { base: "crystal", variants: ["quartz crystal", "magic crystal", "power crystal", "soul crystal"] },
      { base: "obsidian", variants: ["black obsidian", "volcanic rock", "demon stone", "shadow stone"] },
    ],
    PLANTS: [
      { base: "herb", variants: ["healing herb", "magic herb", "rare herb", "poison herb", "ancient herb"] },
      { base: "flower", variants: ["rose", "sunflower", "lotus", "mystic flower", "night bloom"] },
      { base: "mushroom", variants: ["magic mushroom", "poison mushroom", "glowing mushroom", "giant mushroom"] },
      { base: "vine", variants: ["magic vine", "thorny vine", "healing vine", "cursed vine"] },
    ],
    MONSTER_PARTS: [
      { base: "dragon scale", variants: ["fire dragon scale", "ice dragon scale", "elder dragon scale"] },
      { base: "fang", variants: ["wolf fang", "vampire fang", "dragon fang", "demon fang"] },
      { base: "feather", variants: ["phoenix feather", "griffin feather", "angel feather", "harpy feather"] },
      { base: "horn", variants: ["unicorn horn", "demon horn", "minotaur horn", "dragon horn"] },
      { base: "eye", variants: ["demon eye", "all-seeing eye", "dragon eye", "basilisk eye"] },
    ],
    MAGIC_MATERIALS: [
      { base: "soul gem", variants: ["greater soul gem", "black soul gem", "white soul gem", "flawless soul gem"] },
      { base: "magic dust", variants: ["fairy dust", "pixie dust", "elemental dust", "star dust"] },
      { base: "essence", variants: ["life essence", "death essence", "elemental essence", "void essence"] },
      { base: "mana crystal", variants: ["arcane crystal", "power crystal", "spirit crystal", "chaos crystal"] },
    ],
  },
  QUEST_ITEMS: {
    KEYS: [
      { base: "golden key", variants: ["ornate key", "master key", "dungeon key", "treasure key"] },
      { base: "skeleton key", variants: ["bone key", "ancient key", "cursed key", "ghostly key"] },
      { base: "crystal key", variants: ["magic key", "elemental key", "void key", "celestial key"] },
      { base: "rusty key", variants: ["old key", "forgotten key", "mysterious key", "strange key"] },
    ],
    ARTIFACTS: [
      { base: "ancient idol", variants: ["golden idol", "cursed idol", "tribal idol", "demon idol"] },
      { base: "holy grail", variants: ["sacred chalice", "divine cup", "legendary goblet", "blessed vessel"] },
      { base: "magic mirror", variants: ["scrying mirror", "portal mirror", "truth mirror", "dark mirror"] },
      { base: "orb", variants: ["crystal orb", "power orb", "scrying orb", "chaos orb", "void orb"] },
      { base: "crown", variants: ["ancient crown", "cursed crown", "lost crown", "royal crown"] },
    ],
    CONTAINERS: [
      { base: "treasure chest", variants: ["wooden chest", "golden chest", "pirate chest", "mimic chest"] },
      { base: "wooden crate", variants: ["supply crate", "mystery crate", "cargo box", "storage box"] },
      { base: "backpack", variants: ["adventurer bag", "satchel", "rucksack", "travel bag", "magic bag"] },
      { base: "pouch", variants: ["coin pouch", "magic pouch", "herb pouch", "gem pouch"] },
    ],
    COLLECTIBLES: [
      { base: "gold coin", variants: ["silver coin", "ancient coin", "cursed coin", "lucky coin", "pirate coin"] },
      { base: "medal", variants: ["war medal", "honor medal", "hero medal", "ancient medal"] },
      { base: "trophy", variants: ["golden trophy", "champion trophy", "victory cup", "prize"] },
      { base: "badge", variants: ["hero badge", "guild badge", "rank badge", "honor badge"] },
    ],
  },
  CHARACTERS: {
    HEROES: [
      { base: "knight", variants: ["paladin", "crusader", "templar", "holy knight", "dark knight"] },
      { base: "mage", variants: ["wizard", "sorcerer", "archmage", "battlemage", "enchanter"] },
      { base: "rogue", variants: ["assassin", "thief", "ninja", "shadow dancer", "spy"] },
      { base: "archer", variants: ["ranger", "hunter", "marksman", "sniper", "scout"] },
      { base: "warrior", variants: ["barbarian", "berserker", "gladiator", "fighter", "champion"] },
    ],
    ENEMIES: [
      { base: "goblin", variants: ["hobgoblin", "goblin chief", "goblin shaman", "goblin warrior"] },
      { base: "skeleton", variants: ["skeleton warrior", "skeleton archer", "skeleton mage", "bone knight"] },
      { base: "zombie", variants: ["undead soldier", "ghoul", "rotting zombie", "plague zombie"] },
      { base: "orc", variants: ["orc warrior", "orc berserker", "orc shaman", "orc warlord"] },
      { base: "demon", variants: ["lesser demon", "imp", "succubus", "demon soldier", "fiend"] },
    ],
    NPCS: [
      { base: "shopkeeper", variants: ["merchant", "trader", "vendor", "peddler", "salesman"] },
      { base: "blacksmith", variants: ["weaponsmith", "armorsmith", "forge master", "craftsman"] },
      { base: "guard", variants: ["town guard", "royal guard", "night watch", "sentry", "patrol"] },
      { base: "villager", variants: ["peasant", "farmer", "townsperson", "citizen", "commoner"] },
      { base: "innkeeper", variants: ["bartender", "tavern keeper", "host", "barkeep"] },
    ],
    BOSSES: [
      { base: "dragon", variants: ["fire dragon", "ice dragon", "elder dragon", "undead dragon"] },
      { base: "demon lord", variants: ["archdemon", "devil king", "dark lord", "chaos lord"] },
      { base: "lich", variants: ["lich king", "necromancer lord", "death lord", "bone king"] },
      { base: "giant", variants: ["fire giant", "frost giant", "stone giant", "titan", "colossus"] },
    ],
  },
  CREATURES: {
    ANIMALS: [
      { base: "wolf", variants: ["dire wolf", "alpha wolf", "shadow wolf", "ghost wolf", "winter wolf"] },
      { base: "bear", variants: ["grizzly bear", "polar bear", "cave bear", "spirit bear"] },
      { base: "horse", variants: ["warhorse", "stallion", "mustang", "nightmare horse", "spirit horse"] },
      { base: "eagle", variants: ["golden eagle", "giant eagle", "war eagle", "thunder eagle"] },
    ],
    MYTHICAL: [
      { base: "dragon", variants: ["wyvern", "drake", "serpent dragon", "wyrm", "sky dragon"] },
      { base: "phoenix", variants: ["fire phoenix", "ice phoenix", "storm phoenix", "shadow phoenix"] },
      { base: "unicorn", variants: ["alicorn", "dark unicorn", "crystal unicorn", "forest unicorn"] },
      { base: "griffin", variants: ["gryphon", "hippogriff", "sky griffin", "war griffin"] },
    ],
    PETS: [
      { base: "cat", variants: ["kitten", "black cat", "magic cat", "spirit cat", "ghost cat"] },
      { base: "dog", variants: ["puppy", "hound", "wolf dog", "spirit dog", "guardian dog"] },
      { base: "fairy", variants: ["sprite", "pixie", "forest fairy", "fire fairy", "ice fairy"] },
      { base: "slime", variants: ["blue slime", "fire slime", "king slime", "metal slime", "ghost slime"] },
    ],
    ELEMENTALS: [
      { base: "fire elemental", variants: ["flame spirit", "inferno", "fire golem", "lava elemental"] },
      { base: "water elemental", variants: ["water spirit", "ocean elemental", "ice elemental", "mist elemental"] },
      { base: "earth elemental", variants: ["stone golem", "rock elemental", "crystal golem", "mud golem"] },
      { base: "air elemental", variants: ["wind spirit", "storm elemental", "cloud elemental", "lightning elemental"] },
    ],
  },
  ENVIRONMENT: {
    TREES_PLANTS: [
      { base: "oak tree", variants: ["ancient oak", "spirit tree", "world tree", "giant oak"] },
      { base: "pine tree", variants: ["evergreen", "snow pine", "mountain pine", "enchanted pine"] },
      { base: "bush", variants: ["berry bush", "thorny bush", "flowering bush", "magic bush"] },
      { base: "flowers", variants: ["rose garden", "flower patch", "magic flowers", "glowing flowers"] },
    ],
    ROCKS_TERRAIN: [
      { base: "boulder", variants: ["giant rock", "moss covered boulder", "ancient stone", "magic rock"] },
      { base: "crystal formation", variants: ["crystal cluster", "gem deposit", "magic crystals", "cave crystals"] },
      { base: "cliff", variants: ["rocky cliff", "seaside cliff", "mountain face", "stone wall"] },
    ],
    BUILDINGS: [
      { base: "house", variants: ["cottage", "cabin", "hut", "farmhouse", "manor"] },
      { base: "castle tower", variants: ["watch tower", "wizard tower", "fortress tower", "bell tower"] },
      { base: "shop", variants: ["market stall", "blacksmith shop", "potion shop", "magic shop"] },
      { base: "temple", variants: ["shrine", "church", "cathedral", "ancient temple", "ruined temple"] },
    ],
    PROPS: [
      { base: "barrel", variants: ["wine barrel", "water barrel", "explosive barrel", "treasure barrel"] },
      { base: "torch", variants: ["wall torch", "standing torch", "magic torch", "eternal flame"] },
      { base: "chair", variants: ["throne", "wooden chair", "stone seat", "bench"] },
      { base: "table", variants: ["dining table", "work table", "altar", "counter"] },
    ],
    DUNGEON: [
      { base: "spike trap", variants: ["floor spikes", "wall spikes", "ceiling spikes", "poison trap"] },
      { base: "lever", variants: ["wall switch", "floor plate", "button", "mechanism"] },
      { base: "door", variants: ["wooden door", "iron door", "magic door", "dungeon gate", "portal"] },
      { base: "altar", variants: ["sacrificial altar", "holy altar", "dark altar", "offering table"] },
    ],
  },
  TILESETS: {
    GROUND: [
      { base: "grass tile", variants: ["lush grass", "dead grass", "tall grass", "meadow"] },
      { base: "dirt tile", variants: ["mud", "soil", "farmland", "path"] },
      { base: "stone floor", variants: ["cobblestone", "marble floor", "dungeon floor", "tile floor"] },
      { base: "sand", variants: ["desert sand", "beach sand", "dunes", "quicksand"] },
    ],
    WALLS: [
      { base: "stone wall", variants: ["castle wall", "dungeon wall", "ancient wall", "ruined wall"] },
      { base: "brick wall", variants: ["red brick", "old brick", "mossy brick", "crumbling brick"] },
      { base: "wooden wall", variants: ["plank wall", "log wall", "cabin wall", "fence"] },
    ],
    PLATFORMS: [
      { base: "grass platform", variants: ["floating island", "earth platform", "nature platform"] },
      { base: "stone platform", variants: ["temple platform", "dungeon platform", "ancient platform"] },
      { base: "wooden platform", variants: ["dock", "bridge", "treehouse platform", "pier"] },
    ],
    DECORATIVE: [
      { base: "window", variants: ["stained glass", "broken window", "castle window", "round window"] },
      { base: "door tile", variants: ["wooden door", "iron gate", "dungeon door", "secret door"] },
      { base: "crack overlay", variants: ["damaged tile", "broken stone", "aged surface", "weathered texture"] },
    ],
  },
  UI_ELEMENTS: {
    BUTTONS: [
      { base: "play button", variants: ["start button", "begin button", "go button", "launch button"] },
      { base: "menu button", variants: ["options button", "settings button", "pause button", "home button"] },
      { base: "close button", variants: ["exit button", "cancel button", "back button", "x button"] },
    ],
    BARS: [
      { base: "health bar", variants: ["HP bar", "life bar", "vitality bar", "hearts"] },
      { base: "mana bar", variants: ["MP bar", "magic bar", "energy bar", "spirit bar"] },
      { base: "XP bar", variants: ["experience bar", "progress bar", "level bar", "skill bar"] },
    ],
    FRAMES: [
      { base: "dialog frame", variants: ["speech bubble", "text box", "message frame", "notification"] },
      { base: "inventory panel", variants: ["item panel", "equipment panel", "storage panel", "bag UI"] },
      { base: "menu frame", variants: ["game menu", "pause menu", "options panel", "settings frame"] },
    ],
    INVENTORY: [
      { base: "item slot", variants: ["inventory cell", "storage slot", "bag slot", "grid cell"] },
      { base: "equipment slot", variants: ["weapon slot", "armor slot", "accessory slot", "gear slot"] },
      { base: "quick bar", variants: ["hotbar", "action bar", "skill bar", "shortcut bar"] },
    ],
    ICONS_UI: [
      { base: "settings icon", variants: ["gear icon", "cog icon", "options icon", "config icon"] },
      { base: "inventory icon", variants: ["bag icon", "backpack icon", "chest icon", "items icon"] },
      { base: "map icon", variants: ["compass icon", "location icon", "waypoint icon", "marker icon"] },
    ],
    SKILL_ICONS: [
      { base: "attack skill", variants: ["slash icon", "strike icon", "hit icon", "damage icon"] },
      { base: "heal skill", variants: ["healing icon", "restore icon", "cure icon", "recovery icon"] },
      { base: "buff icon", variants: ["boost icon", "enhance icon", "power up icon", "strengthen icon"] },
    ],
  },
  EFFECTS: {
    COMBAT_EFFECTS: [
      { base: "slash effect", variants: ["sword slash", "claw slash", "energy slash", "light slash"] },
      { base: "hit impact", variants: ["punch impact", "strike impact", "damage effect", "critical hit"] },
      { base: "explosion", variants: ["fire explosion", "magic explosion", "energy burst", "shockwave"] },
    ],
    MAGIC_EFFECTS: [
      { base: "fireball", variants: ["fire blast", "flame orb", "inferno ball", "meteor"] },
      { base: "ice spike", variants: ["frost shard", "ice crystal", "frozen spike", "icicle"] },
      { base: "healing aura", variants: ["heal circle", "restoration light", "cure effect", "life glow"] },
    ],
    ELEMENTAL: [
      { base: "fire", variants: ["flames", "burning fire", "blue fire", "hellfire", "campfire"] },
      { base: "ice crystal", variants: ["frost", "frozen effect", "snow crystal", "ice chunk"] },
      { base: "lightning spark", variants: ["electric bolt", "thunder", "shock", "plasma"] },
    ],
    AMBIENT: [
      { base: "sparkle", variants: ["glitter", "shine", "twinkle", "star effect"] },
      { base: "dust", variants: ["particle dust", "magic dust", "floating dust", "debris"] },
      { base: "smoke", variants: ["mist", "fog", "steam", "vapor", "haze"] },
    ],
  },
  PROJECTILES: {
    ARROWS: [
      { base: "arrow", variants: ["wooden arrow", "iron arrow", "steel arrow", "elven arrow"] },
      { base: "fire arrow", variants: ["flaming arrow", "inferno arrow", "burning arrow", "blaze arrow"] },
      { base: "ice arrow", variants: ["frost arrow", "frozen arrow", "glacier arrow", "crystal arrow"] },
    ],
    BULLETS: [
      { base: "bullet", variants: ["pistol bullet", "rifle bullet", "musket ball", "slug"] },
      { base: "cannonball", variants: ["iron ball", "explosive shell", "chain shot", "grapeshot"] },
      { base: "rocket", variants: ["missile", "explosive rocket", "homing missile", "firework"] },
    ],
    MAGIC_PROJECTILES: [
      { base: "magic missile", variants: ["arcane bolt", "mana dart", "spell projectile", "energy blast"] },
      { base: "shadow ball", variants: ["dark orb", "void sphere", "shadow bolt", "nightmare ball"] },
      { base: "holy light", variants: ["divine bolt", "sacred beam", "light projectile", "holy arrow"] },
    ],
    THROWN: [
      { base: "throwing knife", variants: ["flying dagger", "blade", "dart", "needle"] },
      { base: "bomb", variants: ["grenade", "explosive", "dynamite", "fire bomb"] },
      { base: "potion flask", variants: ["throwing potion", "acid flask", "holy water", "oil bomb"] },
    ],
  },
};

interface PromptTemplate {
  base: string;
  variants: string[];
}

// Helper function to pick random element
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Helper function to maybe pick (50% chance)
function maybePick<T>(arr: T[]): T | null {
  return Math.random() > 0.5 ? pickRandom(arr) : null;
}

// Main function to generate random prompt
export function generateRandomPrompt(
  categoryId: string,
  subcategoryId: string,
  complexity: "simple" | "medium" | "complex" = "medium"
): string {
  const categoryPrompts = CATEGORY_PROMPTS[categoryId];
  if (!categoryPrompts) return "";

  const subcategoryPrompts = categoryPrompts[subcategoryId];
  if (!subcategoryPrompts || subcategoryPrompts.length === 0) return "";

  // Pick a random template
  const template = pickRandom(subcategoryPrompts);

  // Decide whether to use base or variant
  const useVariant = Math.random() > 0.3;
  const baseItem = useVariant ? pickRandom(template.variants) : template.base;

  // Build prompt based on complexity
  let prompt = "";

  if (complexity === "simple") {
    // Simple: just the item, maybe with a color
    const color = Math.random() > 0.6 ? pickRandom(COLORS) : null;
    prompt = color ? `${color} ${baseItem}` : baseItem;
  } else if (complexity === "medium") {
    // Medium: item with 1-2 modifiers
    const prefix = maybePick([...PREFIXES.rarity, ...PREFIXES.material, ...PREFIXES.magic]);
    const suffix = maybePick([...SUFFIXES.power, ...SUFFIXES.element, ...SUFFIXES.effect]);
    const color = Math.random() > 0.7 ? pickRandom(COLORS) : null;

    const parts = [];
    if (prefix) parts.push(prefix);
    if (color) parts.push(color);
    parts.push(baseItem);
    if (suffix) parts.push(suffix);

    prompt = parts.join(" ");
  } else {
    // Complex: item with multiple modifiers and details
    const rarity = maybePick(PREFIXES.rarity);
    const material = maybePick(PREFIXES.material);
    const style = maybePick(PREFIXES.style);
    const magic = maybePick(PREFIXES.magic);
    const color = Math.random() > 0.5 ? pickRandom(COLORS) : null;
    const suffix1 = maybePick(SUFFIXES.power);
    const suffix2 = maybePick(SUFFIXES.effect);

    const prefixParts = [rarity, material, style, magic, color].filter(Boolean);
    const suffixParts = [suffix1, suffix2].filter(Boolean);

    // Limit prefixes to 2-3
    const selectedPrefixes = prefixParts.slice(0, Math.min(3, prefixParts.length));

    prompt = [...selectedPrefixes, baseItem, ...suffixParts].join(" ");
  }

  return prompt.trim();
}

// Generate multiple prompt suggestions
export function generatePromptSuggestions(
  categoryId: string,
  subcategoryId: string,
  count: number = 5
): string[] {
  const suggestions: string[] = [];
  const complexities: ("simple" | "medium" | "complex")[] = ["simple", "medium", "complex"];

  for (let i = 0; i < count; i++) {
    const complexity = complexities[i % 3];
    const prompt = generateRandomPrompt(categoryId, subcategoryId, complexity);
    if (prompt && !suggestions.includes(prompt)) {
      suggestions.push(prompt);
    }
  }

  return suggestions;
}

// Get all available bases for a subcategory (for quick picks)
export function getQuickPrompts(categoryId: string, subcategoryId: string): string[] {
  const categoryPrompts = CATEGORY_PROMPTS[categoryId];
  if (!categoryPrompts) return [];

  const subcategoryPrompts = categoryPrompts[subcategoryId];
  if (!subcategoryPrompts) return [];

  return subcategoryPrompts.map(t => t.base);
}
