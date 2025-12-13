// ===========================================
// SPRITELAB CONFIG - CATEGORY PROMPT CONFIGS
// ===========================================
// All subcategory prompt configurations for AI generation
// These define HOW each subcategory should be generated

import type { SubcategoryPromptConfig } from "../types";

// ===========================================
// WEAPONS CATEGORY PROMPT CONFIGS
// ===========================================
export const WEAPONS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  SWORDS: {
    objectType: "sword weapon",
    visualDesc: "long metal blade with handle, crossguard or tsuba, grip wrapping, pommel end",
    composition: "single sword shown flat or slight angle, full blade visible from tip to pommel",
    avoid: "multiple swords, broken blade, hand holding it, sword in stone, sheathed",
  },
  AXES: {
    objectType: "axe weapon",
    visualDesc: "heavy axe head with sharp edge mounted on wooden or metal handle",
    composition: "single axe shown from side, full head and handle visible",
    avoid: "multiple axes, axe stuck in wood, hand holding it, logging scene",
  },
  HAMMERS: {
    objectType: "war hammer weapon",
    visualDesc: "heavy hammer head for crushing, long or short sturdy handle, possibly spiked",
    composition: "single hammer shown from side, full head and handle visible",
    avoid: "multiple hammers, construction hammer, hand holding it, smithing scene",
  },
  POLEARMS: {
    objectType: "polearm weapon",
    visualDesc: "long wooden shaft with metal spearhead, blade, or point at the end",
    composition: "single polearm shown vertically or diagonal, full length visible",
    avoid: "multiple spears, broken shaft, soldier holding it, battle scene",
  },
  BOWS: {
    objectType: "bow ranged weapon",
    visualDesc: "curved bow limbs made of wood or composite, taut bowstring connecting ends",
    composition: "single bow shown front or slight angle, full curve and string visible, no arrow nocked",
    avoid: "multiple bows, archer holding it, arrow already nocked, quiver",
  },
  STAFFS: {
    objectType: "magical staff weapon",
    visualDesc: "long wooden or metal staff with magical crystal, orb, or ornament on top, runes or carvings",
    composition: "single staff shown vertically, full length with magical top visible",
    avoid: "multiple staffs, wizard holding it, plain walking stick, broken",
  },
  GUNS: {
    objectType: "firearm ranged weapon",
    visualDesc: "gun with barrel, trigger, grip handle, possibly ornate or magical design",
    composition: "single gun shown from side profile, full weapon visible",
    avoid: "multiple guns, hand holding it, bullets separate, holster",
  },
  THROWING: {
    objectType: "throwing weapon",
    visualDesc: "aerodynamic throwable weapon like shuriken, kunai, throwing knife, or dart",
    composition: "single throwing weapon centered, shown flat displaying full shape",
    avoid: "multiple throwing weapons, hand throwing it, target, in flight motion blur",
  },
};

// ===========================================
// ARMOR CATEGORY PROMPT CONFIGS
// ===========================================
export const ARMOR_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  HELMETS: {
    objectType: "helmet head armor",
    visualDesc: "protective headgear covering skull, may have visor, plume, horns, or crown elements",
    composition: "single helmet shown from front or 3/4 view, as if displayed on stand",
    avoid: "person wearing it, multiple helmets, damaged beyond recognition, full armor set",
  },
  CHEST_ARMOR: {
    objectType: "chest armor piece",
    visualDesc: "torso protection like breastplate, chainmail shirt, or leather chest piece",
    composition: "single chest piece shown front view, as if on armor stand, no mannequin",
    avoid: "person wearing it, full armor set, just shoulder piece, pants or legs",
  },
  SHIELDS: {
    objectType: "shield defensive equipment",
    visualDesc: "handheld defensive barrier, round kite tower or buckler shape, may have emblem",
    composition: "single shield shown front face, full shield visible including edges",
    avoid: "person holding it, multiple shields, broken shield, shield on back",
  },
  GLOVES: {
    objectType: "gloves hand armor",
    visualDesc: "hand protection like metal gauntlets, leather gloves, or armored bracers",
    composition: "single pair of gloves shown together or one glove, palm or back view",
    avoid: "hands wearing them, multiple pairs, just one finger, full armor set",
  },
  BOOTS: {
    objectType: "boots foot armor",
    visualDesc: "foot protection like armored boots, leather boots, or greaves with foot cover",
    composition: "single pair of boots shown together or one boot, side view",
    avoid: "legs wearing them, multiple pairs, just the sole, full armor set",
  },
  ACCESSORIES: {
    objectType: "armor accessory item",
    visualDesc: "wearable accessory like belt, cape, ring, amulet, necklace, or bracelet",
    composition: "single accessory item centered, full item visible",
    avoid: "person wearing it, multiple accessories, full outfit, too small to see",
  },
};

// ===========================================
// CONSUMABLES CATEGORY PROMPT CONFIGS
// ===========================================
export const CONSUMABLES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  POTIONS: {
    objectType: "potion bottle",
    visualDesc: "glass flask or bottle containing colored magical liquid, cork stopper, may glow",
    composition: "single potion bottle standing upright, full bottle visible including stopper",
    avoid: "multiple potions, spilled liquid, hand holding it, potion shop shelf, empty bottle",
  },
  FOOD: {
    objectType: "food item",
    visualDesc: "edible food like cooked meat, bread loaf, cheese wheel, fruit, or prepared meal",
    composition: "single food item on invisible surface, appetizing presentation",
    avoid: "multiple food items, plate or dish, dining table, someone eating, rotten food",
  },
  SCROLLS: {
    objectType: "magic scroll",
    visualDesc: "rolled parchment scroll with wax seal, may show magical runes or glowing text",
    composition: "single scroll partially rolled or fully rolled, seal visible",
    avoid: "multiple scrolls, open book, scroll case, library scene, torn scroll",
  },
};

// ===========================================
// RESOURCES CATEGORY PROMPT CONFIGS
// ===========================================
export const RESOURCES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  GEMS: {
    objectType: "gemstone",
    visualDesc: "cut precious gem with facets catching light, clear or colored crystal",
    composition: "single gemstone centered, showing facets and brilliance",
    avoid: "multiple gems, uncut rough stone, jewelry setting, pile of gems, mine",
  },
  ORES: {
    objectType: "ore mineral chunk",
    visualDesc: "raw rocky ore chunk with visible metal veins or crystal deposits",
    composition: "single ore piece centered, rough natural shape, metallic glints visible",
    avoid: "multiple ore pieces, refined ingot, mining scene, pile of rocks, pickaxe",
  },
  WOOD_STONE: {
    objectType: "raw material",
    visualDesc: "natural material like wood log with bark and rings, or stone chunk",
    composition: "single piece of material centered, natural texture visible",
    avoid: "multiple pieces, processed lumber, stone wall, forest scene, pile",
  },
  PLANTS: {
    objectType: "magical plant herb",
    visualDesc: "special herb or plant with distinctive leaves, flowers, or magical properties",
    composition: "single plant or herb bunch centered, roots or stems visible",
    avoid: "multiple different plants, potted plant, garden scene, wilted dead plant",
  },
  MONSTER_PARTS: {
    objectType: "monster drop item",
    visualDesc: "creature part like dragon scale, monster fang, beast claw, or magical feather",
    composition: "single monster part centered, detail clearly visible",
    avoid: "multiple parts, full monster, gore or blood, hunting scene, skeleton",
  },
  MAGIC_MATERIALS: {
    objectType: "magical essence material",
    visualDesc: "pure magical material like soul gem, mana crystal, essence orb, or arcane dust",
    composition: "single magical item centered, glow effect visible",
    avoid: "multiple items, crafting scene, wizard using it, container of many",
  },
};

// ===========================================
// QUEST ITEMS CATEGORY PROMPT CONFIGS
// ===========================================
export const QUEST_ITEMS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  KEYS: {
    objectType: "special key",
    visualDesc: "ornate unique key with distinctive design, possibly magical or ancient",
    composition: "single key centered, full key from bow to bit visible",
    avoid: "multiple keys, keyring, lock, door, hand holding key, plain simple key",
  },
  ARTIFACTS: {
    objectType: "ancient artifact",
    visualDesc: "unique powerful relic like idol, grail, mirror, orb, or ancient device",
    composition: "single artifact centered, mysterious and important appearance",
    avoid: "multiple artifacts, museum display, hand holding it, broken pieces",
  },
  CONTAINERS: {
    objectType: "treasure container",
    visualDesc: "special container like treasure chest, ornate box, magical bag, or special case",
    composition: "single container centered, closed state, lock or clasp visible",
    avoid: "multiple containers, open showing contents, pile of chests, loot spilling out",
  },
  COLLECTIBLES: {
    objectType: "collectible item",
    visualDesc: "valuable collectible like gold coin, medal, trophy, badge, or special token",
    composition: "single collectible centered, detail clearly visible",
    avoid: "multiple collectibles, pile of coins, display case, hand holding it",
  },
};

// ===========================================
// CHARACTERS CATEGORY PROMPT CONFIGS
// ===========================================
export const CHARACTERS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  HEROES: {
    objectType: "hero character",
    visualDesc: "heroic adventurer with equipment, strong capable appearance, ready for action",
    composition: "single character full body, standing neutral or heroic pose, facing forward or 3/4",
    avoid: "multiple characters, just face portrait, action blur, background scene, enemies",
  },
  ENEMIES: {
    objectType: "enemy character",
    visualDesc: "hostile enemy creature or humanoid, threatening appearance, combat ready",
    composition: "single enemy full body, standing battle stance, facing forward",
    avoid: "multiple enemies, dead or defeated, hero fighting it, dungeon scene, swarm",
  },
  NPCS: {
    objectType: "NPC character",
    visualDesc: "non-player character like merchant, guard, villager, or questgiver",
    composition: "single NPC full body, standing neutral friendly pose",
    avoid: "multiple NPCs, hero character, shop interior, crowd scene, dialogue box",
  },
  BOSSES: {
    objectType: "boss enemy character",
    visualDesc: "powerful imposing boss creature, large and intimidating, unique design",
    composition: "single boss full body, powerful stance, showing full impressive form",
    avoid: "multiple bosses, tiny minions around it, health bar, arena background, dead",
  },
};

// ===========================================
// CREATURES CATEGORY PROMPT CONFIGS
// ===========================================
export const CREATURES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ANIMALS: {
    objectType: "animal creature",
    visualDesc: "realistic or stylized animal like wolf, bear, eagle, horse, or deer",
    composition: "single animal full body, natural standing or alert pose",
    avoid: "multiple animals, rider on mount, hunting scene, dead animal, herd",
  },
  MYTHICAL: {
    objectType: "mythical creature",
    visualDesc: "legendary beast like dragon, phoenix, unicorn, griffin, or hydra",
    composition: "single creature full body, majestic or powerful pose, wings spread if applicable",
    avoid: "multiple creatures, rider, battle scene, egg or baby only, skeleton",
  },
  PETS: {
    objectType: "pet companion creature",
    visualDesc: "cute friendly companion like cat, dog, fairy, baby dragon, or slime",
    composition: "single pet full body, cute friendly pose, approachable appearance",
    avoid: "multiple pets, owner with pet, pet shop, aggressive pose, injured",
  },
  ELEMENTALS: {
    objectType: "elemental being",
    visualDesc: "creature made of pure element like fire elemental, water spirit, earth golem, or air wisp",
    composition: "single elemental full form, element clearly visible, floating or standing",
    avoid: "multiple elementals, wizard summoning it, mixed elements, dissipating",
  },
};

// ===========================================
// ENVIRONMENT CATEGORY PROMPT CONFIGS
// ===========================================
export const ENVIRONMENT_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  TREES_PLANTS: {
    objectType: "vegetation prop",
    visualDesc: "tree, bush, flowers, or plant cluster suitable for game environment",
    composition: "single tree or plant, full form from roots to top, natural shape",
    avoid: "forest scene, multiple different trees, character under tree, seasonal scene",
  },
  ROCKS_TERRAIN: {
    objectType: "rock formation prop",
    visualDesc: "boulder, rock cluster, crystal formation, cliff piece, or terrain element",
    composition: "single rock formation, stable grounded appearance",
    avoid: "mountain range, cave interior, character climbing, multiple separate rocks scattered",
  },
  BUILDINGS: {
    objectType: "building structure",
    visualDesc: "single building like house, tower, shop, temple, or castle piece",
    composition: "single building front or 3/4 view, full structure visible",
    avoid: "city scene, multiple buildings, interior view, character in doorway, ruins",
  },
  PROPS: {
    objectType: "furniture prop",
    visualDesc: "interior or exterior prop like chair, table, barrel, crate, torch, or sign",
    composition: "single prop item, standing naturally, full object visible",
    avoid: "room scene, multiple props, character using it, store inventory",
  },
  DUNGEON: {
    objectType: "dungeon prop element",
    visualDesc: "dungeon element like spike trap, lever, door, altar, cage, or torch holder",
    composition: "single dungeon element, functional appearance clear",
    avoid: "dungeon room, multiple traps, character triggering it, maze layout",
  },
  // Isometric subcategories in Environment
  ISO_BUILDINGS: {
    objectType: "isometric building",
    visualDesc: "isometric 2.5D building viewed from above at 26.57-degree angle, showing roof top and two visible walls, strategy game style architecture",
    composition: "single isometric building, diamond footprint visible, complete structure with roof and walls, grounded on invisible tile grid",
    avoid: "front view, side view, perspective, top-down flat, multiple buildings, interior view, tilted angle, city scene",
  },
  ISO_TREES: {
    objectType: "isometric tree",
    visualDesc: "isometric 2.5D tree viewed from above, round or conical canopy, visible trunk base, strategy game vegetation",
    composition: "single isometric tree, full tree from grounded base to crown, canopy shape clear, suitable for placing on tile",
    avoid: "side view tree, flat tree, forest scene, multiple trees, dead tree, tilted wrong",
  },
  ISO_PROPS: {
    objectType: "isometric prop decoration",
    visualDesc: "isometric 2.5D small prop or decoration, viewed from strategy game angle, functional or decorative object",
    composition: "single isometric prop, small scale, complete object, fits on tile grid",
    avoid: "flat view, multiple props, cluttered, perspective view, large scale",
  },
  ISO_TERRAIN: {
    objectType: "isometric terrain feature",
    visualDesc: "isometric 2.5D terrain element like rock, water, or natural formation, viewed from above",
    composition: "single terrain feature, isometric projection, integrates with tile grid, natural appearance",
    avoid: "landscape scene, flat terrain, multiple formations, perspective view",
  },
};

// ===========================================
// ISOMETRIC CATEGORY PROMPT CONFIGS
// ===========================================
export const ISOMETRIC_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ISO_BUILDINGS: {
    objectType: "isometric building",
    visualDesc: "isometric 2.5D building viewed from above at 26.57-degree angle, showing roof top and two visible walls, strategy game style architecture",
    composition: "single isometric building, diamond footprint visible, complete structure with roof and walls, grounded on invisible tile grid",
    avoid: "front view, side view, perspective, top-down flat, multiple buildings, interior view, tilted angle, city scene",
  },
  ISO_TREES: {
    objectType: "isometric tree",
    visualDesc: "isometric 2.5D tree viewed from above, round or conical canopy, visible trunk base, strategy game vegetation",
    composition: "single isometric tree, full tree from grounded base to crown, canopy shape clear, suitable for placing on tile",
    avoid: "side view tree, flat tree, forest scene, multiple trees, dead tree, tilted wrong",
  },
  ISO_PROPS: {
    objectType: "isometric prop decoration",
    visualDesc: "isometric 2.5D small prop or decoration, viewed from strategy game angle, functional or decorative object",
    composition: "single isometric prop, small scale, complete object, fits on tile grid",
    avoid: "flat view, multiple props, cluttered, perspective view, large scale",
  },
  ISO_TERRAIN: {
    objectType: "isometric terrain feature",
    visualDesc: "isometric 2.5D terrain element like rock, water, or natural formation, viewed from above",
    composition: "single terrain feature, isometric projection, integrates with tile grid, natural appearance",
    avoid: "landscape scene, flat terrain, multiple formations, perspective view",
  },
  ISO_HOUSES: {
    objectType: "isometric residential house",
    visualDesc: "cozy isometric house with pitched roof, windows, door, chimney, warm residential appearance viewed from 2.5D angle",
    composition: "single isometric house, complete structure, visible roof top and two walls, grounded base, residential feel",
    avoid: "flat view, interior, multiple houses, damaged, construction site, city block",
  },
  ISO_COMMERCIAL: {
    objectType: "isometric shop building",
    visualDesc: "isometric commercial building with shop front, signage area, display windows, merchant or store appearance",
    composition: "single isometric shop, complete structure, shop features visible, commercial character clear",
    avoid: "residential house, interior view, marketplace crowd, multiple shops, flat view",
  },
  ISO_MILITARY: {
    objectType: "isometric military structure",
    visualDesc: "isometric defensive structure like tower, fortress wall, or barracks, sturdy imposing appearance, strategic building",
    composition: "single military structure, isometric view, defensive features clear, solid construction",
    avoid: "battle scene, soldiers, damaged ruins, multiple towers, flat view, perspective",
  },
  ISO_PRODUCTION: {
    objectType: "isometric production building",
    visualDesc: "isometric industrial or production building like windmill, farm, mine, or workshop with functional features",
    composition: "single production building, isometric projection, working features visible, functional appearance",
    avoid: "workers, production animation, multiple buildings, flat view, landscape",
  },
  ISO_SPECIAL: {
    objectType: "isometric special landmark building",
    visualDesc: "isometric unique building like temple, monument, or grand structure with distinctive architectural features",
    composition: "single special building, isometric view, landmark quality, decorative details",
    avoid: "common house, multiple buildings, interior, flat view, city scene",
  },
  ISO_VEGETATION: {
    objectType: "isometric vegetation",
    visualDesc: "isometric tree or plant cluster viewed from 2.5D strategy game angle, natural rounded shapes",
    composition: "single vegetation element, isometric projection, complete plant, suitable tile scale",
    avoid: "forest scene, flat top view, multiple plants scattered, wilted, abstract",
  },
  ISO_DECORATIONS: {
    objectType: "isometric decoration prop",
    visualDesc: "small isometric decoration object like well, bench, statue, or lamp, detail prop for game world",
    composition: "single decoration, isometric view, small scale prop, detailed and complete",
    avoid: "large building scale, multiple decorations, flat view, cluttered",
  },
  ISO_TILES: {
    objectType: "isometric ground tile",
    visualDesc: "isometric diamond-shaped ground tile, seamless edges, surface texture like grass dirt stone or water",
    composition: "single isometric tile, diamond shape, seamlessly tileable, consistent lighting from top-left",
    avoid: "square tile, objects on tile, character, non-tileable edges, perspective view",
  },
};

// ===========================================
// TILESETS CATEGORY PROMPT CONFIGS
// ===========================================
export const TILESETS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  GROUND: {
    objectType: "ground tile texture",
    visualDesc: "seamless floor texture like grass, dirt, stone, sand, or wood planks",
    composition: "single square tile, seamlessly tileable, edges match opposite edges",
    avoid: "scene with ground, character standing, objects on ground, non-tileable edges",
  },
  WALLS: {
    objectType: "wall tile texture",
    visualDesc: "seamless vertical wall texture like brick, stone, wood panels, or dungeon wall",
    composition: "single square tile, seamlessly tileable, suitable for vertical surface",
    avoid: "room with walls, doorway in wall, character against wall, non-tileable",
  },
  PLATFORMS: {
    objectType: "platform tile",
    visualDesc: "platformer game surface like grass platform edge, stone ledge, or floating island piece",
    composition: "single platform tile piece, clear top walkable surface",
    avoid: "full level layout, character on platform, multiple platforms, background",
  },
  DECORATIVE: {
    objectType: "decorative tile overlay",
    visualDesc: "overlay decoration like crack pattern, moss growth, blood splatter, or carpet pattern",
    composition: "single decorative tile, transparent background for overlay use",
    avoid: "full decorated scene, base tile included, character, multiple overlays",
  },
};

// ===========================================
// UI ELEMENTS CATEGORY PROMPT CONFIGS
// ===========================================
export const UI_ELEMENTS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  BUTTONS: {
    objectType: "UI button",
    visualDesc: "clickable game button with clear pressed and normal state possibility",
    composition: "single button centered, readable at small size, clear clickable appearance",
    avoid: "full menu screen, multiple buttons, text on button, cursor clicking",
  },
  BARS: {
    objectType: "UI bar element",
    visualDesc: "progress bar like health bar, mana bar, experience bar, or loading bar",
    composition: "single bar element, horizontal rectangle, fill level example shown",
    avoid: "full HUD layout, character portrait with bar, multiple bars, screen corner",
  },
  FRAMES: {
    objectType: "UI frame border",
    visualDesc: "decorative frame or panel border for menus, dialogs, or inventory",
    composition: "single frame, can be 9-slice compatible, ornate corners and edges",
    avoid: "content inside frame, full menu, multiple frames stacked, text",
  },
  INVENTORY: {
    objectType: "inventory slot UI",
    visualDesc: "single inventory slot or equipment slot, square container for item display",
    composition: "single slot centered, empty or with subtle slot indicator",
    avoid: "full inventory grid, item in slot, character equipment screen, multiple slots",
  },
  ICONS_UI: {
    objectType: "UI icon",
    visualDesc: "interface icon like settings gear, menu icon, map icon, or quest marker",
    composition: "single icon centered, clear symbolic meaning, works at small size",
    avoid: "multiple icons, icon in interface context, text label, HUD layout",
  },
  SKILL_ICONS: {
    objectType: "skill ability icon",
    visualDesc: "ability or spell icon showing skill effect like fireball, heal, buff, or attack",
    composition: "single skill icon, square format, clear ability representation",
    avoid: "skill bar, multiple abilities, character casting, cooldown overlay",
  },
};

// ===========================================
// EFFECTS CATEGORY PROMPT CONFIGS
// ===========================================
export const EFFECTS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  COMBAT_EFFECTS: {
    objectType: "combat VFX sprite",
    visualDesc: "combat effect like sword slash, hit impact, blood splatter, or punch effect",
    composition: "single effect frame, transparent background, dynamic energy visible",
    avoid: "character performing action, multiple effects, animation sequence sheet, weapon",
  },
  MAGIC_EFFECTS: {
    objectType: "magic VFX sprite",
    visualDesc: "magical effect like spell cast, healing aura, buff glow, or magic circle",
    composition: "single magic effect, transparent background, glowing energy",
    avoid: "wizard casting, spell hitting target, multiple spells, wand or staff",
  },
  ELEMENTAL: {
    objectType: "elemental effect sprite",
    visualDesc: "elemental VFX like fire burst, ice crystal, lightning bolt, or water splash",
    composition: "single elemental effect, transparent background, element clearly identifiable",
    avoid: "elemental creature, environment damage, multiple elements mixed, character",
  },
  AMBIENT: {
    objectType: "ambient particle effect",
    visualDesc: "ambient effect like sparkle, dust mote, smoke puff, rain drop, or snow flake",
    composition: "single or small cluster of particles, transparent background",
    avoid: "weather system, smokey room, dusty environment, multiple effect types",
  },
};

// ===========================================
// PROJECTILES CATEGORY PROMPT CONFIGS
// ===========================================
export const PROJECTILES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ARROWS: {
    objectType: "arrow projectile",
    visualDesc: "flying arrow with pointed head, shaft, and fletching feathers",
    composition: "single arrow horizontal flight pose, full arrow visible",
    avoid: "multiple arrows, quiver, bow, archer, arrow in target, broken arrow",
  },
  BULLETS: {
    objectType: "bullet projectile",
    visualDesc: "ammunition like bullet, cannonball, rocket, or energy shot",
    composition: "single projectile, motion direction clear, full projectile visible",
    avoid: "multiple bullets, gun firing, impact explosion, shell casing, ammo box",
  },
  MAGIC_PROJECTILES: {
    objectType: "magic projectile",
    visualDesc: "magical projectile like fireball, ice shard, shadow bolt, or arcane missile",
    composition: "single magic projectile, glowing energy, motion direction clear",
    avoid: "wizard casting, spell impact, multiple projectiles, spell effect on target",
  },
  THROWN: {
    objectType: "thrown projectile",
    visualDesc: "thrown weapon in flight like throwing knife, bomb, javelin, or grenade",
    composition: "single thrown object, flight pose with motion implied",
    avoid: "multiple thrown items, thrower character, impact moment, target",
  },
};

// ===========================================
// COMBINED CATEGORY CONFIGS (for easy access)
// ===========================================
export const CATEGORY_PROMPT_CONFIGS: Record<string, Record<string, SubcategoryPromptConfig>> = {
  WEAPONS: WEAPONS_PROMPT_CONFIG,
  ARMOR: ARMOR_PROMPT_CONFIG,
  CONSUMABLES: CONSUMABLES_PROMPT_CONFIG,
  RESOURCES: RESOURCES_PROMPT_CONFIG,
  QUEST_ITEMS: QUEST_ITEMS_PROMPT_CONFIG,
  CHARACTERS: CHARACTERS_PROMPT_CONFIG,
  CREATURES: CREATURES_PROMPT_CONFIG,
  ENVIRONMENT: ENVIRONMENT_PROMPT_CONFIG,
  ISOMETRIC: ISOMETRIC_PROMPT_CONFIG,
  TILESETS: TILESETS_PROMPT_CONFIG,
  UI_ELEMENTS: UI_ELEMENTS_PROMPT_CONFIG,
  EFFECTS: EFFECTS_PROMPT_CONFIG,
  PROJECTILES: PROJECTILES_PROMPT_CONFIG,
};

// ===========================================
// CATEGORY BASE DESCRIPTIONS
// ===========================================
export const CATEGORY_BASE_DESCRIPTIONS: Record<string, string> = {
  WEAPONS: "game weapon item, combat equipment sprite",
  ARMOR: "protective armor equipment, defensive gear sprite",
  CONSUMABLES: "consumable game item, usable pickup sprite",
  RESOURCES: "crafting resource material, gatherable item sprite",
  QUEST_ITEMS: "quest item artifact, special collectible sprite",
  CHARACTERS: "game character sprite, full body figure",
  CREATURES: "creature beast sprite, full body monster",
  ENVIRONMENT: "environment prop sprite, world decoration object",
  ISOMETRIC: "isometric 2.5D game asset, strategy game sprite, dimetric projection view",
  TILESETS: "tileable game texture, seamless pattern tile",
  UI_ELEMENTS: "game UI element, interface graphic sprite",
  EFFECTS: "visual effect sprite, VFX game element",
  PROJECTILES: "projectile sprite, flying ammunition object",
};
