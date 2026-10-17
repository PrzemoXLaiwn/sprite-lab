// =============================================================================
// Prompt intent — reads a sprite prompt and picks the panel settings it implies
// (asset type, style, camera view, palette, pose). Pure, synchronous, no API
// calls: runs on every keystroke (debounced) in the Generate panel.
//
// Every ID returned here exists in the Generate panel:
//   • categoryId / subcategoryId → src/data/generate-categories.ts
//     (categoryId is the picker group, e.g. "ENVIRONMENT" for floor tiles)
//   • styleId → src/data/generate-styles.ts
//   • view / palette / pose → VIEW_OPTIONS / PALETTE_OPTIONS / POSE_OPTIONS
//     in src/components/generate/GenerateWorkspace.tsx
//
// How the asset type is found: English puts the head noun last in the subject
// phrase ("warrior's sword" is a sword, "goblin merchant" is a merchant), and
// the subject ends at the first preposition ("knight with a sword" is a
// knight). Polish puts it first ("miecz rycerza" is a sword).
// The server keeps its own safety net (src/lib/prompt-clean.ts) — the tests
// check both agree on the asset group.
// =============================================================================

export type IntentView = "side" | "front" | "topdown";
export type IntentPose = "a-pose" | "t-pose" | "dynamic";
export type IntentPalette = "NEON_CYBER" | "PASTEL_DREAM" | "MONO_BW" | "RETRO_GAMEBOY" | "AUTUMN_HARVEST" | "SUNSET_WARM";

export interface PromptIntent {
  /** Picker group (GENERATE_CATEGORIES id), or null when the prompt names no known asset. */
  categoryId: string | null;
  subcategoryId: string | null;
  styleId: string | null;
  view: IntentView | null;
  palette: IntentPalette | null;
  pose: IntentPose | null;
  /** 0–1, how sure the asset type is (0 when nothing was found). */
  confidence: number;
  /** The words that triggered each setting, e.g. { category: "main character" }. */
  reasons: Partial<Record<"category" | "style" | "view" | "palette" | "pose", string>>;
}

export interface IntentContext {
  /** Style currently selected — "pixel art" keeps Pixel HD, "isometric" keeps the pixel/cartoon family. */
  currentStyleId?: string;
}

/** Asset categories (backend categoryId) where the camera view changes the result. */
export const VIEW_APPLIES_TO = new Set(["CHARACTERS", "CREATURES", "ENVIRONMENT"]);
/** Picker groups that show the Pose control. */
export const POSE_APPLIES_TO = new Set(["CHARACTERS", "CREATURES"]);

// -----------------------------------------------------------------------------
// Matching helpers — \b is ASCII-only in JS, so Polish letters need lookarounds
// -----------------------------------------------------------------------------

const L = "[\\p{L}\\p{N}]";
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** English term → regex source: spaces/hyphens interchangeable, simple plurals allowed. */
function enTerm(t: string): string {
  const body = t.split(/[\s-]+/).map(esc).join("[\\s-]?");
  return /[a-z]$/.test(t) && !/s$/.test(t) ? `${body}(?:s|es)?` : body;
}
const plTerm = (t: string) => t.split(/\s+/).map(esc).join("\\s+");

function wordsRe(src: string[], flags = "iu"): RegExp {
  const sorted = [...src].sort((a, b) => b.length - a.length);
  return new RegExp(`(?<!${L})(?:${sorted.join("|")})(?!${L})`, flags);
}

// -----------------------------------------------------------------------------
// Asset nouns
// -----------------------------------------------------------------------------

interface NounEntry {
  sub: string;
  en: string[];
  pl?: string[];
  /** Vague nouns ("character", "monster"): a more specific noun in the subject wins. */
  generic?: string[];
}

/** subcategoryId → picker group. Mirrors GENERATE_CATEGORIES (checked by the tests). */
export const SUB_TO_GROUP: Record<string, string> = {
  SWORDS: "WEAPONS", AXES: "WEAPONS", POLEARMS: "WEAPONS", BOWS: "WEAPONS", STAFFS: "WEAPONS", GUNS: "WEAPONS", THROWING: "WEAPONS",
  HELMETS: "ARMOR", CHEST_ARMOR: "ARMOR", SHIELDS: "ARMOR", GLOVES: "ARMOR", BOOTS: "ARMOR", ACCESSORIES: "ARMOR",
  POTIONS: "CONSUMABLES", FOOD: "CONSUMABLES", SCROLLS: "CONSUMABLES",
  GEMS: "RESOURCES", ORES: "RESOURCES", WOOD_STONE: "RESOURCES", PLANTS: "RESOURCES", MONSTER_PARTS: "RESOURCES", MAGIC_MATERIALS: "RESOURCES",
  HEROES: "CHARACTERS", ENEMIES: "CHARACTERS", NPCS: "CHARACTERS", BOSSES: "CHARACTERS",
  ANIMALS: "CREATURES", MYTHICAL: "CREATURES", PETS: "CREATURES", ELEMENTALS: "CREATURES",
  ITEM_ICONS: "UI_ELEMENTS", SKILL_ICONS: "UI_ELEMENTS", STATUS_ICONS: "UI_ELEMENTS", ICONS_UI: "UI_ELEMENTS", BUTTONS: "UI_ELEMENTS", BARS: "UI_ELEMENTS", FRAMES: "UI_ELEMENTS",
  TREES_PLANTS: "ENVIRONMENT", ROCKS_TERRAIN: "ENVIRONMENT", BUILDINGS: "ENVIRONMENT", PROPS: "ENVIRONMENT", DUNGEON: "ENVIRONMENT", GROUND: "ENVIRONMENT", WALLS: "ENVIRONMENT",
  KEYS: "QUEST_ITEMS", ARTIFACTS: "QUEST_ITEMS", CONTAINERS: "QUEST_ITEMS", COLLECTIBLES: "QUEST_ITEMS",
};

const NOUNS: NounEntry[] = [
  // ── Characters
  { sub: "HEROES",
    en: ["main character", "player character", "playable character", "protagonist", "hero", "heroine", "adventurer", "warrior", "knight", "paladin", "soldier", "hunter", "ranger", "wizard", "witch", "mage", "sorcerer", "sorceress", "ninja", "samurai", "pirate", "princess", "prince", "rogue", "assassin", "thief", "thieves", "archer", "cleric", "priest", "priestess", "monk", "druid", "bard", "barbarian", "cowboy", "astronaut", "survivor", "explorer", "scavenger", "diver", "viking", "gladiator", "swordsman", "swordswoman", "mercenary", "spearman", "gunslinger", "detective", "superhero", "elf", "elves", "dwarf", "dwarves", "man", "men", "woman", "women", "girl", "boy", "guy", "lady", "ladies", "kid", "child", "children", "player", "avatar", "marine", "agent", "spy", "hacker", "cyborg", "android", "magician", "warlock", "shaman", "berserker", "musketeer", "sailor", "captain", "pilot", "scientist", "engineer", "medic", "doctor", "nurse", "chef", "student"],
    pl: ["postać", "postac", "bohater", "bohaterka", "wojownik", "wojowniczka", "rycerz", "czarodziej", "czarodziejka", "czarownica", "wiedźma", "mag", "łucznik", "łuczniczka", "żołnierz", "pirat", "księżniczka", "książę", "gracz", "dziewczyna", "chłopak", "kobieta", "mężczyzna", "łowca", "złodziej", "ocalały", "ocalała", "elf", "krasnolud", "najemnik", "kapłan", "mnich", "astronauta"],
    generic: ["character", "person", "people", "humanoid", "figure"] },
  { sub: "ENEMIES",
    en: ["enemy", "enemies", "foe", "minion", "villain", "goblin", "orc", "skeleton", "zombie", "undead", "ghoul", "bandit", "cultist", "imp", "kobold", "raider", "mutant", "necromancer", "vampire", "ghost", "wraith", "lich", "mummy", "werewolf", "gnoll", "brigand", "outlaw", "henchman", "henchmen", "grunt", "infected"],
    pl: ["wróg", "przeciwnik", "goblin", "ork", "szkielet", "zombie", "nieumarły", "bandyta", "wampir", "duch", "upiór", "nekromanta", "kultysta", "mumia", "wilkołak"] },
  { sub: "NPCS",
    en: ["npc", "villager", "merchant", "shopkeeper", "trader", "vendor", "blacksmith", "innkeeper", "bartender", "farmer", "peasant", "guard", "elder", "king", "queen", "mayor", "baker", "fisherman", "fishermen", "miner", "citizen", "townsperson", "townsfolk", "quest giver", "old man", "old woman", "butcher", "tailor", "alchemist", "librarian", "noble", "nobleman", "servant", "maid", "shepherd", "hermit", "sage", "oracle", "fortune teller", "beggar", "traveler", "traveller", "pilgrim", "monarch", "emperor", "empress"],
    pl: ["kupiec", "handlarz", "kowal", "karczmarz", "rolnik", "chłop", "strażnik", "król", "królowa", "wieśniak", "wieśniaczka", "mieszkaniec", "sprzedawca", "alchemik", "pustelnik", "starzec", "rybak", "górnik", "piekarz"] },
  { sub: "BOSSES",
    en: ["boss", "final boss", "mini boss", "miniboss", "overlord", "demon lord", "dark lord", "warlord", "lich king", "titan", "archdemon", "dragon lord", "tyrant"],
    pl: ["boss", "władca demonów", "mroczny władca"] },
  // ── Creatures
  { sub: "ANIMALS",
    en: ["animal", "wolf", "wolves", "fox", "bear", "deer", "rabbit", "bunny", "bunnies", "cat", "dog", "horse", "boar", "bird", "eagle", "owl", "crow", "raven", "snake", "spider", "rat", "bat", "frog", "toad", "fish", "shark", "lion", "tiger", "cow", "pig", "chicken", "sheep", "goat", "monkey", "ape", "crab", "turtle", "tortoise", "beetle", "insect", "bug", "scorpion", "lizard", "crocodile", "alligator", "squirrel", "mouse", "mice", "hedgehog", "duck", "penguin", "panda", "elephant", "giraffe", "camel", "octopus", "jellyfish", "whale", "dolphin", "bee", "wasp", "ant", "butterfly", "moth", "worm", "snail", "slug", "parrot", "hawk", "falcon", "vulture", "panther", "leopard", "cheetah", "hyena", "raccoon", "badger", "otter", "moose", "elk", "bison", "ox", "oxen", "donkey", "mole"],
    pl: ["zwierzę", "wilk", "lis", "niedźwiedź", "jeleń", "sarna", "królik", "zając", "kot", "pies", "koń", "dzik", "ptak", "orzeł", "sowa", "kruk", "wrona", "wąż", "pająk", "szczur", "nietoperz", "żaba", "ryba", "rekin", "lew", "tygrys", "krowa", "świnia", "kura", "owca", "koza", "małpa", "krab", "żółw", "żuk", "chrząszcz", "skorpion", "jaszczurka", "mysz", "jeż", "kaczka", "pingwin"] },
  { sub: "MYTHICAL",
    en: ["dragon", "wyvern", "wyrm", "drake", "griffin", "gryphon", "phoenix", "unicorn", "hydra", "kraken", "basilisk", "chimera", "minotaur", "cyclops", "golem", "troll", "ogre", "giant", "demon", "behemoth", "alien", "pegasus", "slime", "beholder", "manticore", "centaur", "harpy", "harpies", "mimic", "gargoyle", "yeti", "sea serpent", "serpent", "leviathan", "cerberus", "dinosaur", "dino", "t-rex", "mech", "robot"],
    pl: ["smok", "potwór", "stwór", "bestia", "gryf", "feniks", "jednorożec", "hydra", "demon", "golem", "troll", "ogr", "olbrzym", "gigant", "szlam", "kosmita", "robot", "dinozaur"],
    generic: ["monster", "creature", "beast", "critter"] },
  { sub: "PETS",
    en: ["pet", "companion", "familiar", "puppy", "puppies", "kitten", "mascot"],
    pl: ["zwierzak", "towarzysz", "pupil", "szczeniak", "kotek"] },
  { sub: "ELEMENTALS",
    en: ["elemental", "spirit", "wisp", "will o wisp", "will-o-wisp", "fire spirit", "water spirit"],
    pl: ["żywiołak", "duszek"] },
  // ── Weapons
  { sub: "SWORDS",
    en: ["sword", "blade", "dagger", "katana", "sabre", "saber", "rapier", "scimitar", "knife", "knives", "claymore", "greatsword", "longsword", "broadsword", "shortsword", "cutlass", "machete", "falchion", "estoc", "zweihander", "lightsaber", "dirk", "stiletto"],
    pl: ["miecz", "sztylet", "nóż", "szabla", "katana", "rapier", "kordelas", "maczeta"],
    generic: ["weapon", "melee weapon"] },
  { sub: "AXES",
    en: ["axe", "hatchet", "hammer", "warhammer", "mace", "club", "flail", "maul", "morning star", "morningstar", "pickaxe", "battleaxe", "cudgel", "tomahawk", "sledgehammer"],
    pl: ["topór", "siekiera", "młot", "młotek", "buława", "maczuga", "kilof", "cep"] },
  { sub: "POLEARMS",
    en: ["spear", "lance", "halberd", "trident", "glaive", "pike", "scythe", "naginata", "polearm", "partisan", "pitchfork"],
    pl: ["włócznia", "lanca", "halabarda", "trójząb", "kosa", "glewia", "widły"] },
  { sub: "BOWS",
    en: ["bow", "longbow", "shortbow", "crossbow", "slingshot", "recurve bow", "compound bow", "arrow"],
    pl: ["łuk", "kusza", "proca", "strzała"] },
  { sub: "STAFFS",
    en: ["staff", "staves", "wand", "scepter", "sceptre", "rod", "magic staff", "quarterstaff"],
    pl: ["kostur", "różdżka", "laska", "berło"] },
  { sub: "GUNS",
    en: ["gun", "pistol", "rifle", "shotgun", "revolver", "blaster", "musket", "flintlock", "smg", "sniper", "rocket launcher", "cannon", "glock", "uzi", "minigun", "laser gun", "firearm", "handgun", "machine gun", "assault rifle", "carbine", "railgun", "grenade launcher", "flamethrower", "crossbow pistol"],
    pl: ["pistolet", "karabin", "strzelba", "rewolwer", "działo", "muszkiet", "broń palna"] },
  { sub: "THROWING",
    en: ["shuriken", "throwing knife", "throwing knives", "throwing star", "javelin", "boomerang", "grenade", "bomb", "kunai", "chakram", "dart", "throwing axe", "molotov"],
    pl: ["granat", "bumerang", "bomba", "oszczep", "rzutka"] },
  // ── Armor
  { sub: "HELMETS",
    en: ["helmet", "helm", "hood", "hat", "mask", "cap", "headgear", "visor", "circlet"],
    pl: ["hełm", "kask", "czapka", "maska", "kaptur", "kapelusz"] },
  { sub: "CHEST_ARMOR",
    en: ["armor", "armour", "chestplate", "breastplate", "chest armor", "chest armour", "chest plate", "plate armor", "plate armour", "chainmail", "chain mail", "tunic", "robe", "cuirass", "vest", "body armor", "body armour", "mail shirt", "jerkin"],
    pl: ["zbroja", "pancerz", "kolczuga", "napierśnik", "szata", "tunika", "kamizelka"] },
  { sub: "SHIELDS",
    en: ["shield", "buckler", "kite shield", "tower shield"],
    pl: ["tarcza"] },
  { sub: "GLOVES",
    en: ["glove", "gauntlet", "bracer", "mitten", "vambrace"],
    pl: ["rękawica", "rękawice", "rękawiczki", "karwasze"] },
  { sub: "BOOTS",
    en: ["boot", "shoe", "greave", "sandal", "sabaton", "sneaker"],
    pl: ["buty", "trzewiki", "sandały", "nagolenniki"] },
  { sub: "ACCESSORIES",
    en: ["ring", "amulet", "necklace", "pendant", "talisman", "belt", "cloak", "cape", "earring", "bracelet", "crown", "tiara", "brooch", "charm", "medallion", "scarf", "goggles", "glasses"],
    pl: ["pierścień", "pierścionek", "amulet", "naszyjnik", "wisior", "talizman", "pas", "płaszcz", "peleryna", "korona", "bransoleta", "kolczyki"] },
  // ── Consumables
  { sub: "POTIONS",
    en: ["potion", "flask", "elixir", "vial", "bottle", "tonic", "brew", "philter", "draught"],
    pl: ["mikstura", "eliksir", "butelka", "fiolka", "flaszka", "napój"] },
  { sub: "FOOD",
    en: ["food", "apple", "bread", "meat", "cheese", "pie", "cake", "steak", "chicken leg", "drumstick", "roast chicken", "roasted chicken", "carrot", "berry", "berries", "cookie", "soup", "ham", "sandwich", "pizza", "burger", "fruit", "candy", "candies", "egg", "banana", "grape", "orange", "pear", "watermelon", "cupcake", "donut", "doughnut", "sushi", "rice", "noodles", "sausage", "bacon", "honey", "jam", "meal", "snack", "ration", "canned food", "can of beans"],
    pl: ["jedzenie", "jabłko", "chleb", "mięso", "ser", "ciasto", "zupa", "udko", "marchewka", "jagody", "ciastko", "kanapka", "owoc", "cukierek", "jajko", "kiełbasa", "konserwa"] },
  { sub: "SCROLLS",
    en: ["scroll", "spellbook", "spell book", "book", "tome", "grimoire", "treasure map", "letter", "parchment", "recipe", "note"],
    pl: ["zwój", "księga", "książka", "mapa skarbów", "pergamin"] },
  // ── Resources
  { sub: "GEMS",
    en: ["gem", "gemstone", "jewel", "ruby", "rubies", "sapphire", "emerald", "diamond", "amethyst", "crystal", "topaz", "pearl", "opal", "jade", "onyx", "quartz"],
    pl: ["klejnot", "kamień szlachetny", "rubin", "szafir", "szmaragd", "diament", "ametyst", "kryształ", "perła"] },
  { sub: "ORES",
    en: ["ore", "ingot", "nugget", "gold bar", "iron bar", "metal bar", "raw metal", "scrap metal", "scrap"],
    pl: ["ruda", "sztabka", "samorodek", "złom"] },
  { sub: "WOOD_STONE",
    en: ["log", "plank", "lumber", "timber", "firewood", "wood", "stone", "brick", "stick", "branch", "pebble", "cobblestone", "coal"],
    pl: ["kłoda", "deska", "drewno", "kamień", "cegła", "patyk", "gałąź", "węgiel"] },
  { sub: "PLANTS",
    en: ["herb", "flower", "leaf", "leaves", "seed", "mushroom", "petal", "root", "sapling", "clover", "rose", "lotus", "wheat", "fern"],
    pl: ["zioło", "zioła", "kwiat", "liść", "nasiono", "grzyb", "korzeń", "róża"] },
  { sub: "MONSTER_PARTS",
    en: ["scale", "fang", "claw", "horn", "tooth", "teeth", "bone", "feather", "pelt", "hide", "skull", "eyeball", "tentacle", "talon", "carapace", "slime ball", "venom sac", "dragon heart"],
    pl: ["łuska", "kieł", "pazur", "róg", "ząb", "kość", "pióro", "skóra", "czaszka", "macka"] },
  { sub: "MAGIC_MATERIALS",
    en: ["soul gem", "soul stone", "mana crystal", "magic crystal", "essence", "rune", "runestone", "magic dust", "stardust", "shard", "crystal shard", "soul", "mana stone", "ether", "aether"],
    pl: ["esencja", "runa", "odłamek", "pył", "kamień dusz", "dusza"] },
  // ── Icons / UI
  { sub: "ITEM_ICONS",
    en: ["icon", "item icon", "inventory icon", "loot icon", "emblem", "symbol", "pictogram"],
    pl: ["ikona", "ikonka", "symbol", "emblemat"] },
  { sub: "SKILL_ICONS",
    en: ["skill icon", "spell icon", "ability icon", "talent icon", "perk icon"],
    pl: ["ikona umiejętności", "ikona zaklęcia"] },
  { sub: "STATUS_ICONS",
    en: ["status", "status icon", "status effect", "buff", "debuff", "buff icon", "debuff icon"],
    pl: ["status", "efekt statusu"] },
  { sub: "ICONS_UI",
    en: ["ui icon", "menu icon", "settings icon", "cursor", "crosshair", "app icon"],
    pl: ["kursor", "celownik"] },
  { sub: "BUTTONS",
    en: ["button", "play button", "start button", "toggle", "checkbox"],
    pl: ["przycisk", "guzik"] },
  { sub: "BARS",
    en: ["health bar", "hp bar", "mana bar", "mp bar", "xp bar", "exp bar", "progress bar", "stamina bar", "loading bar", "energy bar", "life bar", "healthbar"],
    pl: ["pasek zdrowia", "pasek many", "pasek postępu", "pasek życia"] },
  { sub: "FRAMES",
    en: ["frame", "dialog box", "dialogue box", "dialog", "dialogue", "panel", "window", "border", "inventory slot", "item slot", "slot", "hud", "menu", "tooltip", "speech bubble", "banner", "nameplate", "ui frame", "inventory", "card frame"],
    pl: ["ramka", "okno", "panel", "okno dialogowe", "dymek", "menu", "slot", "ekwipunek"] },
  // ── Environment
  { sub: "TREES_PLANTS",
    en: ["tree", "oak", "pine", "palm", "palm tree", "bush", "shrub", "plant", "cactus", "cacti", "vine", "grass tuft", "hedge", "willow", "birch", "bamboo", "sakura", "foliage", "reeds", "stump", "tree stump"],
    pl: ["drzewo", "dąb", "sosna", "palma", "krzak", "krzew", "roślina", "kaktus", "pnącze", "wierzba", "brzoza", "pień"] },
  { sub: "ROCKS_TERRAIN",
    en: ["rock", "boulder", "cliff", "terrain", "hill", "mountain", "island", "crater", "stalagmite", "stalactite", "rock formation", "crystal cluster", "mound", "volcano", "platform", "floating island", "ledge"],
    pl: ["skała", "głaz", "teren", "klif", "wzgórze", "góra", "wyspa", "krater", "platforma"] },
  { sub: "BUILDINGS",
    en: ["house", "building", "town hall", "castle", "tower", "temple", "church", "shop", "store", "tavern", "inn", "hut", "cabin", "cottage", "barn", "windmill", "mill", "fort", "fortress", "bunker", "shelter", "tent", "lighthouse", "shack", "factory", "farmhouse", "smithy", "forge", "palace", "mansion", "manor", "chapel", "cathedral", "pagoda", "shrine", "igloo", "treehouse", "outpost", "watchtower", "stable", "warehouse", "skyscraper", "village", "town", "city", "camp", "base", "home", "market stall", "stall"],
    pl: ["dom", "domek", "budynek", "zamek", "wieża", "świątynia", "kościół", "sklep", "karczma", "gospoda", "chata", "chatka", "stodoła", "wiatrak", "młyn", "twierdza", "fort", "bunkier", "schron", "namiot", "latarnia morska", "kuźnia", "pałac", "dwór", "kaplica", "wioska", "miasto", "obóz", "baza", "stragan"] },
  { sub: "PROPS",
    en: ["prop", "barrel", "crate", "box", "table", "chair", "bench", "lamp", "lantern", "torch", "campfire", "bonfire", "fence", "sign", "signpost", "signboard", "cart", "wagon", "well", "statue", "fountain", "bed", "bookshelf", "bookcase", "shelf", "shelves", "pot", "vase", "anvil", "cauldron", "mailbox", "tombstone", "gravestone", "grave", "street lamp", "lamppost", "mailbox", "trash can", "dumpster", "workbench", "furniture", "stool", "rug", "carpet", "banner pole", "flag", "scarecrow", "haystack", "hay bale", "log pile", "woodpile", "bridge", "ladder", "cage", "pillar", "column", "barricade", "sandbag", "generator", "machine", "terminal", "computer", "car", "vehicle", "boat", "ship", "spaceship", "starship", "spacecraft", "airship", "plane", "airplane", "jet", "helicopter", "train", "submarine", "tank", "truck", "bike", "motorcycle"],
    pl: ["beczka", "skrzynka", "pudło", "stół", "krzesło", "ławka", "lampa", "latarnia", "pochodnia", "ognisko", "płot", "ogrodzenie", "znak", "drogowskaz", "wóz", "wózek", "studnia", "posąg", "pomnik", "fontanna", "łóżko", "regał", "półka", "garnek", "wazon", "kowadło", "kocioł", "nagrobek", "grób", "drabina", "klatka", "kolumna", "samochód", "łódź", "statek", "czołg"] },
  { sub: "DUNGEON",
    en: ["dungeon", "door", "doorway", "trap", "spike trap", "portal", "altar", "crypt", "tomb", "ruins", "sarcophagus", "lever", "gate", "dungeon door", "prison cell", "jail", "torture rack", "pressure plate", "stairs", "staircase", "obelisk", "coffin"],
    pl: ["loch", "lochy", "drzwi", "pułapka", "portal", "ołtarz", "krypta", "grobowiec", "ruiny", "sarkofag", "dźwignia", "brama", "schody", "obelisk", "trumna"] },
  { sub: "GROUND",
    en: ["tile", "tileset", "floor tile", "ground tile", "grass tile", "floor", "ground", "seamless texture", "texture", "tilemap", "terrain tile", "path tile", "water tile", "road", "pavement"],
    pl: ["kafelek", "kafelki", "płytka", "podłoga", "tekstura", "nawierzchnia", "droga"] },
  { sub: "WALLS",
    en: ["wall", "wall tile", "brick wall", "stone wall", "castle wall", "wall segment"],
    pl: ["ściana", "mur"] },
  // ── Loot
  { sub: "KEYS",
    en: ["key", "keycard", "key card", "skeleton key"],
    pl: ["klucz", "kluczyk"] },
  { sub: "ARTIFACTS",
    en: ["artifact", "artefact", "relic", "orb", "idol", "totem", "chalice", "grail", "crystal ball", "hourglass", "compass", "holy grail", "sacred stone", "mirror", "music box", "lamp of", "magic lamp"],
    pl: ["artefakt", "relikwia", "kula", "bożek", "totem", "kielich", "klepsydra", "kompas", "lustro"] },
  { sub: "CONTAINERS",
    en: ["chest", "treasure chest", "bag", "pouch", "sack", "backpack", "loot box", "lootbox", "coffer", "loot bag", "satchel", "basket", "jar", "urn", "lockbox", "safe"],
    pl: ["skrzynia", "skrzynia skarbów", "kufer", "worek", "sakwa", "sakiewka", "plecak", "torba", "koszyk", "słoik", "urna"] },
  { sub: "COLLECTIBLES",
    en: ["coin", "medal", "trophy", "trophies", "token", "badge", "star", "card", "stamp", "figurine", "gold coin", "coin stack", "treasure", "gold", "money", "cash", "dollar"],
    pl: ["moneta", "monety", "medal", "trofeum", "żeton", "odznaka", "gwiazdka", "karta", "skarb", "złoto", "pieniądze"] },
];

interface CompiledNoun { sub: string; re: RegExp; generic: boolean; lang: "en" | "pl" }

const COMPILED: CompiledNoun[] = NOUNS.flatMap((n) => {
  const out: CompiledNoun[] = [{ sub: n.sub, re: wordsRe(n.en.map(enTerm), "giu"), generic: false, lang: "en" }];
  if (n.pl?.length) out.push({ sub: n.sub, re: wordsRe(n.pl.map(plTerm), "giu"), generic: false, lang: "pl" });
  if (n.generic?.length) out.push({ sub: n.sub, re: wordsRe(n.generic.map(enTerm), "giu"), generic: true, lang: "en" });
  return out;
});

interface NounHit { sub: string; start: number; end: number; text: string; generic: boolean; lang: "en" | "pl" }

function findNouns(text: string): NounHit[] {
  const hits: NounHit[] = [];
  for (const c of COMPILED) {
    // Overlapping matches: "stone wall tile" must also find "wall tile"
    c.re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = c.re.exec(text)) !== null) {
      const start = m.index;
      hits.push({ sub: c.sub, start, end: start + m[0].length, text: m[0], generic: c.generic, lang: c.lang });
      c.re.lastIndex = m.index + 1;
    }
  }
  return hits;
}

/** Where the subject phrase ends: first preposition / clause word / punctuation. */
const SUBJECT_END = new RegExp(
  `(?<!${L})(?:with|holding|wielding|carrying|wearing|riding|from|in|on|of|for|by|at|and|or|that|which|who|near|inside|under|over|against|behind|beside|made|using|while|surrounded|without|like|to|as|z|ze|w|we|na|dla|do|od|przy|pod|nad|i|oraz|trzymając\\p{L}*|któr\\p{L}*|który|niosąc\\p{L}*)(?!${L})|[,;.:!?()\\[\\]—–]|\\s-\\s`,
  "iu",
);

/** Pick the head noun: English → the last noun of the phrase, Polish → the first. */
function pickHead(hits: NounHit[], englishOrder: boolean): NounHit | null {
  if (!hits.length) return null;
  const allPl = hits.every((h) => h.lang === "pl");
  const sorted = [...hits].sort((a, b) =>
    englishOrder && !allPl
      ? b.end - a.end || a.start - b.start // last noun; at the same end the longer phrase
      : a.start - b.start || b.end - a.end, // first noun; at the same start the longer phrase
  );
  return sorted[0];
}

// Modifiers that move a character / creature / icon to a sibling subcategory
const ENEMY_MOD = wordsRe(["evil", "hostile", "enemy", "villain(?:ous)?", "corrupted", "cursed", "undead", "skeleton", "skeletal", "zombie", "goblin", "orc(?:ish)?", "demonic", "possessed", "bandit", "wrogi", "zły", "zła", "nieumarły", "szkielet"]);
const HERO_MOD = wordsRe(["main", "player", "playable", "protagonist", "hero", "główn\\p{L}*", "grywaln\\p{L}*"]);
const BOSS_MOD = wordsRe(["boss", "final[\\s-]boss", "mini[\\s-]?boss", "raid boss"]);
const PET_MOD = wordsRe(["pet", "baby", "tamed", "companion", "mały", "mała", "małe"]);
const SKILL_MOD = wordsRe(["skill", "spell", "ability", "abilities", "talent", "perk", "fireball", "lightning bolt", "heal(?:ing)? spell", "attack", "dash", "magic", "umiejętności", "zaklęcia"]);
const STATUS_MOD = wordsRe(["status", "buff", "debuff", "poison(?:ed)?", "burn(?:ing)?", "stun(?:ned)?", "frozen", "bleed(?:ing)?", "regen(?:eration)?", "shielded", "sleep(?:ing)?", "confus(?:ed|ion)"]);
const UI_MOD = wordsRe(["settings", "menu", "home", "pause", "play", "sound", "music", "volume", "close", "exit", "back", "arrow", "save", "load", "options", "gear", "cog", "share", "info", "help", "search", "mute", "ustawienia"]);

function refine(sub: string, subject: string, full: string): string {
  const group = SUB_TO_GROUP[sub];
  if (group === "CHARACTERS") {
    if (BOSS_MOD.test(full)) return "BOSSES";
    if (sub === "HEROES" && HERO_MOD.test(subject)) return "HEROES";
    if (sub === "HEROES" && ENEMY_MOD.test(subject)) return "ENEMIES";
  }
  if (group === "CREATURES" && sub !== "PETS" && sub !== "ELEMENTALS" && PET_MOD.test(subject)) return "PETS";
  if (sub === "ITEM_ICONS") {
    if (STATUS_MOD.test(subject)) return "STATUS_ICONS";
    if (SKILL_MOD.test(subject)) return "SKILL_ICONS";
    if (UI_MOD.test(subject)) return "ICONS_UI";
  }
  return sub;
}

/** Split the prompt into phrases at prepositions / punctuation. */
function phrases(text: string): string[] {
  const out: string[] = [];
  const re = new RegExp(SUBJECT_END.source, "giu");
  let from = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m[0].length === 0) { re.lastIndex++; continue; }
    if (text.slice(from, m.index).trim()) {
      out.push(text.slice(from, m.index));
      from = m.index;
    }
    // a boundary at the very start ("with wings…") just joins the next phrase
  }
  if (text.slice(from).trim()) out.push(text.slice(from));
  return out;
}

function detectCategory(text: string): { sub: string; term: string; confidence: number } | null {
  const pool = (hits: NounHit[]) => {
    const specific = hits.filter((h) => !h.generic);
    return specific.length ? specific : hits;
  };
  // The subject is the first phrase; when it names nothing ("32x32 sprite of a
  // robot", "pile of coins") the first later phrase that does takes over.
  const parts = phrases(text);
  for (let i = 0; i < parts.length; i++) {
    const head = pickHead(pool(findNouns(parts[i])), true);
    if (!head) continue;
    const confidence = i === 0 ? (head.generic ? 0.7 : 0.9) : (head.generic ? 0.5 : 0.6);
    return { sub: refine(head.sub, parts[i], text), term: head.text.trim(), confidence };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Style, view, palette, pose
// -----------------------------------------------------------------------------

const PIXEL_STYLES = new Set(["PIXEL_ART_16", "PIXEL_ART_32", "ISOMETRIC_PIXEL"]);
const CARTOONY_STYLES = new Set(["CARTOON_WESTERN", "CHIBI_CUTE", "VECTOR_CLEAN", "ISOMETRIC_CARTOON"]);

const RE = (src: string) => new RegExp(`(?<!${L})(?:${src})(?!${L})`, "iu");

const ISOMETRIC = RE("isometric|isometry|iso[\\s-]view|izometryczn\\p{L}*|izometri\\p{L}*");
const PIXEL_32 = RE("32[\\s-]?bit|32\\s?[x×]\\s?32|64\\s?[x×]\\s?64|hd[\\s-]pixel(?:[\\s-]art)?|pixel[\\s-]hd|hi[\\s-]?bit|high[\\s-]res(?:olution)?\\s+pixel(?:[\\s-]art)?|modern\\s+pixel(?:[\\s-]art)?");
const PIXEL_16 = RE("16[\\s-]?bit|8[\\s-]?bit|16\\s?[x×]\\s?16|snes|nes|retro\\s+pixel(?:[\\s-]art)?|game\\s?boy");
const PIXEL_ANY = RE("pixel[\\s-]?art|pixelart|pixel(?:ated)?|pixels|pikselow\\p{L}*|pixelow\\p{L}*|piksel\\p{L}*");
const CARTOON_WORD = RE("cartoon(?:y|ish)?|toon|casual|cute|chibi|kreskówkow\\p{L}*");

const STYLE_WORDS: Array<{ id: string; re: RegExp }> = [
  { id: "CHIBI_CUTE",        re: RE("chibi|kawaii|super[\\s-]deformed|sd[\\s-]style") },
  { id: "ANIME_GAME",        re: RE("anime|manga|jrpg|cel[\\s-]shaded|anim\\p{L}*\\s+styl\\p{L}*") },
  { id: "HAND_PAINTED",      re: RE("hand[\\s-]?painted|hand[\\s-]?drawn|painterly|watercolou?r|gouache|ręcznie\\s+malowan\\p{L}*|akwarel\\p{L}*") },
  { id: "DARK_SOULS",        re: RE("dark[\\s-]fantasy|grimdark|souls[\\s-]?like|dark\\s+souls|gothic\\s+horror|mroczne?\\s+fantasy") },
  { id: "CARTOON_WESTERN",   re: RE("cartoon(?:y|ish)?|toon|comic[\\s-]style|kreskówk\\p{L}*|kreskówkow\\p{L}*") },
  { id: "VECTOR_CLEAN",      re: RE("vector|flat[\\s-](?:design|style|vector|illustration|art|colou?rs?)|minimalist(?:ic)?|wektorow\\p{L}*") },
  { id: "REALISTIC_PAINTED", re: RE("realistic|photo[\\s-]?realistic|photoreal|realism|semi[\\s-]realistic|aaa|realistyczn\\p{L}*") },
];

function matchText(re: RegExp, text: string): string | null {
  const m = text.match(re);
  return m ? m[0] : null;
}

function detectStyle(text: string, current?: string): { id: string; term: string } | null {
  const iso = matchText(ISOMETRIC, text);
  if (iso) {
    if (PIXEL_ANY.test(text) || PIXEL_16.test(text) || PIXEL_32.test(text)) return { id: "ISOMETRIC_PIXEL", term: iso };
    if (CARTOON_WORD.test(text)) return { id: "ISOMETRIC_CARTOON", term: iso };
    if (current && PIXEL_STYLES.has(current)) return { id: "ISOMETRIC_PIXEL", term: iso };
    if (current && CARTOONY_STYLES.has(current)) return { id: "ISOMETRIC_CARTOON", term: iso };
    return { id: "ISOMETRIC", term: iso };
  }
  const p32 = matchText(PIXEL_32, text);
  if (p32) return { id: "PIXEL_ART_32", term: p32 };
  const p16 = matchText(PIXEL_16, text);
  if (p16) return { id: "PIXEL_ART_16", term: p16 };
  const px = matchText(PIXEL_ANY, text);
  if (px) {
    // Plain "pixel art": keep the pixel style already picked
    if (current === "PIXEL_ART_16" || current === "PIXEL_ART_32") return { id: current, term: px };
    return { id: "PIXEL_ART_16", term: px };
  }
  for (const s of STYLE_WORDS) {
    const t = matchText(s.re, text);
    if (t) return { id: s.id, term: t };
  }
  return null;
}

// View patterns mirror detectViewFromPrompt (src/config/categories/prompt-configs.ts),
// which the server applies anyway, plus genre words that imply a camera.
const VIEW_WORDS: Array<{ id: IntentView; re: RegExp }> = [
  { id: "topdown", re: RE("top[\\s-]?down(?:\\s+view)?|bird'?s?[\\s-]?eye(?:\\s+view)?|from\\s+above|overhead(?:\\s+view)?|aerial\\s+view|flat\\s+lay|zelda[\\s-]like|twin[\\s-]stick|z\\s+g[oó]ry|widok\\s+z\\s+g[oó]ry|z\\s+lotu\\s+ptaka|od\\s+g[oó]ry|odg[oó]ry|perspektywa\\s+z\\s+g[oó]ry") },
  { id: "side",    re: RE("side[\\s-]?view|side\\s+profile|from\\s+the\\s+side|platformer(?:\\s+view)?|side[\\s-]?scroll(?:er|ing)?|metroidvania|widok\\s+z\\s+boku|z\\s+boku|z\\s+profilu|profil\\s+boczny|platformówk\\p{L}*") },
  { id: "front",   re: RE("front[\\s-]?view|front[\\s-]?facing|facing\\s+(?:forward|the\\s+viewer|viewer|camera)|frontal\\s+view|head[\\s-]?on|straight[\\s-]?on|widok\\s+z\\s+przodu|z\\s+przodu|od\\s+przodu|na\\s+wprost|frontalnie|frontaln\\p{L}*") },
];

const PALETTE_WORDS: Array<{ id: IntentPalette; re: RegExp }> = [
  { id: "RETRO_GAMEBOY",  re: RE("game\\s?boy|gb\\s+palette|4[\\s-]colou?r\\s+green") },
  { id: "MONO_BW",        re: RE("black\\s+(?:and|&)\\s+white|monochrome|monochromatic|gr[ae]yscale|1[\\s-]bit|czarno[\\s-]biał\\p{L}*") },
  { id: "NEON_CYBER",     re: RE("neon|cyberpunk|synthwave|vaporwave|outrun") },
  { id: "PASTEL_DREAM",   re: RE("pastel(?:s)?|pastelow\\p{L}*") },
  { id: "AUTUMN_HARVEST", re: RE("autumn(?:al)?|fall\\s+colou?rs|jesienn\\p{L}*") },
  { id: "SUNSET_WARM",    re: RE("sunset|zachód\\s+słońca") },
];

const POSE_WORDS: Array<{ id: IntentPose; re: RegExp }> = [
  { id: "t-pose",  re: RE("t[\\s-]pose|tpose") },
  { id: "a-pose",  re: RE("a[\\s-]pose|apose") },
  { id: "dynamic", re: RE("dynamic\\s+pose|action\\s+pose|fighting\\s+stance|battle\\s+stance|combat\\s+stance|attack(?:ing)?\\s+pose|attacking|mid[\\s-](?:jump|air|swing|attack)|jumping|leaping|lunging|swinging|casting\\s+a\\s+spell|in\\s+action|dynamiczn\\p{L}*\\s+poz\\p{L}*|w\\s+akcji") },
];

function firstMatch<T extends string>(list: Array<{ id: T; re: RegExp }>, text: string): { id: T; term: string } | null {
  for (const item of list) {
    const t = matchText(item.re, text);
    if (t) return { id: item.id, term: t };
  }
  return null;
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function detectIntent(raw: string, ctx: IntentContext = {}): PromptIntent {
  const text = (raw ?? "")
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/^\s*e\.g\.?\s*/, "")
    .slice(0, 500);

  const empty: PromptIntent = { categoryId: null, subcategoryId: null, styleId: null, view: null, palette: null, pose: null, confidence: 0, reasons: {} };
  if (text.trim().length < 3) return empty;

  const reasons: PromptIntent["reasons"] = {};

  // Style / camera words are not part of the asset ("top-down knight", "pixel art sword")
  const cat = detectCategory(text);
  const style = detectStyle(text, ctx.currentStyleId);
  const view = firstMatch<IntentView>(VIEW_WORDS, text);
  const palette = firstMatch<IntentPalette>(PALETTE_WORDS, text);
  const pose = firstMatch<IntentPose>(POSE_WORDS, text);

  if (cat) reasons.category = cat.term;
  if (style) reasons.style = style.term;
  if (view) reasons.view = view.term;
  if (palette) reasons.palette = palette.term;
  if (pose) reasons.pose = pose.term;

  return {
    categoryId: cat ? SUB_TO_GROUP[cat.sub] : null,
    subcategoryId: cat?.sub ?? null,
    styleId: style?.id ?? null,
    view: view?.id ?? null,
    palette: palette?.id ?? null,
    pose: pose?.id ?? null,
    confidence: cat?.confidence ?? 0,
    reasons,
  };
}
