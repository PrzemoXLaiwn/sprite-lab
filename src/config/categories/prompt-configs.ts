// ===========================================
// SPRITELAB CONFIG - CATEGORY PROMPT CONFIGS (FIXED v2.0)
// ===========================================
// CHANGES:
// - Added PANELS subcategory for UI with multiple slots
// - Fixed INVENTORY to not block slot grids
// - Combined AXES/HAMMERS properly
// - Better avoid lists that don't block valid requests
// - More specific visual descriptions

import type { SubcategoryPromptConfig } from "../types";

// ===========================================
// WEAPONS CATEGORY PROMPT CONFIGS
// ===========================================
export const WEAPONS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  SWORDS: {
    objectType: "((ONE single sword weapon))",
    visualDesc: "long metal blade with handle, crossguard or tsuba, grip wrapping, pommel end, sharp cutting edge",
    composition: "((ONLY ONE sword)), single isolated sword shown flat or slight angle, full blade visible from tip to pommel, weapon displayed as single game item icon, centered on transparent background",
    avoid: "multiple swords, many swords, sword collection, sword set, sprite sheet, weapon grid, broken blade, hand holding it, sword in stone, sheathed in scabbard, combat scene, different swords, variety of weapons",
  },
  AXES: {
    objectType: "((ONE single axe or hammer weapon))",
    visualDesc: "heavy head mounted on sturdy handle - axe with sharp blade edge OR hammer with blunt crushing head, possibly spiked or decorated",
    composition: "((ONLY ONE weapon)), single isolated weapon shown from side, full head and handle visible, displayed as single collectible item icon, centered on transparent background",
    avoid: "multiple weapons, many axes, axe collection, weapon set, sprite sheet, stuck in wood or stone, hand holding it, logging or smithing scene, broken handle",
  },
  POLEARMS: {
    objectType: "((ONE single polearm weapon))",
    visualDesc: "long wooden or metal shaft with spearhead, blade, halberd head, or pointed tip at the end",
    composition: "((ONLY ONE polearm)), single isolated polearm shown vertically or diagonal, full length visible from tip to butt, centered on transparent background",
    avoid: "multiple spears, many polearms, weapon collection, sprite sheet, broken shaft, soldier holding it, battle scene, just the head without shaft",
  },
  BOWS: {
    objectType: "((ONE single bow ranged weapon))",
    visualDesc: "curved bow limbs made of wood or composite materials, taut bowstring connecting both ends",
    composition: "((ONLY ONE bow)), single isolated bow shown front or slight angle, full curve and string visible, no arrow nocked, at rest position, centered on transparent background",
    avoid: "multiple bows, many bows, bow collection, sprite sheet, archer holding it, arrow already nocked, quiver of arrows, drawing the bow",
  },
  STAFFS: {
    objectType: "((ONE single magical staff or wand))",
    visualDesc: "long wooden or metal staff with magical crystal, glowing orb, or ornate ornament on top, may have runes or magical carvings",
    composition: "((ONLY ONE staff)), single isolated staff shown vertically, full length with magical top visible, floating or standing, centered on transparent background",
    avoid: "multiple staffs, many staffs, staff collection, sprite sheet, wizard holding it, plain walking stick without magic, broken or cracked",
  },
  GUNS: {
    objectType: "((ONE single firearm ranged weapon))",
    visualDesc: "gun with barrel, trigger mechanism, grip handle, possibly ornate steampunk or magical design elements",
    composition: "((ONLY ONE gun)), single isolated gun shown from side profile, full weapon visible from barrel to grip, centered on transparent background",
    avoid: "multiple guns, many guns, gun collection, sprite sheet, hand holding it, bullets or ammo separate, holster, firing with muzzle flash",
  },
  THROWING: {
    objectType: "((ONE single throwing weapon))",
    visualDesc: "aerodynamic throwable weapon like shuriken star, kunai knife, throwing dagger, or dart with balanced design",
    composition: "((ONLY ONE throwing weapon)), single isolated throwing weapon centered, shown flat displaying full shape and details, centered on transparent background",
    avoid: "multiple throwing weapons, many shurikens, throwing weapon collection, sprite sheet, hand throwing it, target or impact, in-flight motion blur",
  },
};

// ===========================================
// ARMOR CATEGORY PROMPT CONFIGS
// ===========================================
// PRO v3.1: Enhanced to prevent body parts in equipment renders
// Key: Use "equipment icon", "loot drop", "inventory item" framing to get isolated objects
export const ARMOR_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  HELMETS: {
    objectType: "((isolated helmet equipment icon)), game inventory helmet item, loot drop helmet",
    visualDesc: "ISOLATED helmet as equipment icon - protective headgear rendered as ((STANDALONE INVENTORY ICON)), empty hollow helmet like RPG loot drop, game item pickup style, equipment slot icon rendering, ((NO HEAD OR FACE INSIDE))",
    composition: "single empty helmet displayed as game item icon, ((COMPLETELY EMPTY INSIDE - NO HEAD)), helmet floating or on invisible stand like inventory loot, front or 3/4 view, equipment icon presentation",
    avoid: "head inside helmet, person wearing it, face visible, neck attached, mannequin head, body parts, multiple helmets, worn helmet, helmet on head, human head, skull inside, eyes visible, face inside, portrait, character",
  },
  CHEST_ARMOR: {
    objectType: "((isolated chest armor equipment icon)), game inventory armor item, loot drop breastplate",
    visualDesc: "ISOLATED chest armor as equipment icon - breastplate or chest piece rendered as ((STANDALONE INVENTORY ICON)), empty armor like RPG loot drop, game item pickup style, ((NO BODY OR TORSO INSIDE))",
    composition: "single empty chest armor displayed as game item icon, ((COMPLETELY EMPTY - NO TORSO)), armor floating or on invisible stand like inventory loot, front view, equipment icon presentation",
    avoid: "body inside armor, person wearing it, arms attached, shoulders with arms, mannequin body, body parts, full figure, torso visible, character wearing armor, human torso, chest visible, skin showing, human form inside",
  },
  SHIELDS: {
    objectType: "((isolated shield equipment icon)), game inventory shield item, loot drop shield",
    visualDesc: "shield as equipment icon - round, kite, tower, or buckler shape rendered as ((STANDALONE INVENTORY ICON)), may have emblem, boss, or magical runes, game item pickup style, ((NO ARM OR HAND HOLDING IT))",
    composition: "single shield shown front face as game item icon, full shield visible including rim, floating or standing like inventory loot, equipment icon presentation",
    avoid: "person holding it, arm holding shield, hand gripping it, multiple shields, broken shield, shield on back, character with shield, warrior, arm visible, hand visible",
  },
  GLOVES: {
    objectType: "((isolated gloves equipment icon)), game inventory gauntlets item, loot drop gloves",
    visualDesc: "ISOLATED gloves as equipment icon - metal gauntlets or leather gloves rendered as ((STANDALONE INVENTORY ICONS)), empty gloves like RPG loot drop, game item pickup style, ((NO HANDS OR ARMS INSIDE))",
    composition: "gloves displayed as game item icons lying flat or arranged together, ((COMPLETELY EMPTY - NO HANDS INSIDE)), empty hollow gloves as inventory loot, equipment icon presentation",
    avoid: "hands inside gloves, arms attached, fingers visible, worn on body, mannequin hands, human hands, body parts, hands wearing them, arms or wrists, fingers, skin, human arm, character hands",
  },
  BOOTS: {
    objectType: "((isolated boots equipment icon)), game inventory boots item, loot drop footwear",
    visualDesc: "ISOLATED boots as equipment icon - armored boots or leather boots rendered as ((STANDALONE INVENTORY ICONS)), empty boots like RPG loot drop, game item pickup style, ((NO LEGS OR FEET INSIDE))",
    composition: "boots displayed as game item icons standing or lying, ((COMPLETELY EMPTY - NO FEET INSIDE)), empty hollow boots as inventory loot, equipment icon presentation",
    avoid: "legs inside boots, feet wearing them, worn on body, mannequin legs, human legs, body parts, legs attached, ankles or calves visible, toes, feet, skin, human leg, character feet",
  },
  ACCESSORIES: {
    objectType: "((isolated accessory equipment icon)), game inventory accessory item, loot drop accessory",
    visualDesc: "accessory as equipment icon - belt, cape, ring, amulet, or bracelet rendered as ((STANDALONE INVENTORY ICON)), game item pickup style, ((NOT WORN ON BODY))",
    composition: "single accessory item as game item icon, full item visible with details clear, floating or displayed like inventory loot, equipment icon presentation",
    avoid: "person wearing it, worn on body, multiple accessories, full outfit, character, body part visible, neck with amulet, finger with ring, waist with belt",
  },
};

// ===========================================
// CONSUMABLES CATEGORY PROMPT CONFIGS
// ===========================================
export const CONSUMABLES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  POTIONS: {
    objectType: "potion bottle",
    visualDesc: "glass flask or bottle containing colored magical liquid, cork or cap stopper, may glow or have bubbles",
    composition: "single potion bottle standing upright, full bottle visible including stopper and liquid inside",
    avoid: "multiple potions, spilled or splashing liquid, hand holding it, potion shop shelf, completely empty bottle",
  },
  FOOD: {
    objectType: "food item",
    visualDesc: "edible food like cooked meat leg, bread loaf, cheese wheel, fresh fruit, or prepared meal dish",
    composition: "single food item on invisible surface, appetizing presentation, fresh and appealing look",
    avoid: "multiple different food items, plate or dish container, dining table scene, someone eating, rotten or spoiled",
  },
  SCROLLS: {
    objectType: "magic scroll",
    visualDesc: "rolled parchment scroll with wax seal, may show magical glowing runes, arcane symbols, or mystical text",
    composition: "single scroll partially unrolled or fully rolled, seal or ribbon visible",
    avoid: "multiple scrolls, fully open book (not scroll), scroll case container, library scene, torn or burned",
  },
};

// ===========================================
// RESOURCES CATEGORY PROMPT CONFIGS
// ===========================================
export const RESOURCES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  GEMS: {
    objectType: "gemstone",
    visualDesc: "cut precious gem with facets catching and refracting light, clear or colored crystalline structure",
    composition: "single gemstone centered, showing brilliant facets and internal light",
    avoid: "multiple gems pile, uncut rough ore stone, jewelry setting or ring, mine or cave scene",
  },
  ORES: {
    objectType: "ore mineral chunk",
    visualDesc: "raw rocky ore chunk with visible metal veins, crystal deposits, or valuable material embedded in stone",
    composition: "single ore piece centered, rough natural chunk shape, metallic or crystal glints visible",
    avoid: "multiple ore pieces, refined metal ingot or bar, mining scene, pile of rocks, pickaxe tool",
  },
  WOOD_STONE: {
    objectType: "raw material",
    visualDesc: "natural material like wood log with bark and tree rings visible, or stone chunk with natural texture",
    composition: "single piece of material centered, natural texture and form clearly visible",
    avoid: "multiple pieces scattered, processed lumber planks, stone wall, forest or quarry scene",
  },
  PLANTS: {
    objectType: "magical plant herb",
    visualDesc: "special herb or plant with distinctive leaves, magical flowers, or glowing mystical properties",
    composition: "single plant or herb bunch centered, roots or stems visible, magical essence apparent",
    avoid: "multiple different plant species, potted houseplant, garden scene, wilted or dead plant",
  },
  MONSTER_PARTS: {
    objectType: "monster drop item",
    visualDesc: "creature part like iridescent dragon scale, sharp monster fang, curved beast claw, or magical feather",
    composition: "single monster part centered, detail and texture clearly visible",
    avoid: "multiple parts pile, full monster creature, gore or blood pool, hunting scene, complete skeleton",
  },
  MAGIC_MATERIALS: {
    objectType: "magical essence material",
    visualDesc: "pure magical material like glowing soul gem, pulsing mana crystal, swirling essence orb, or sparkling arcane dust",
    composition: "single magical item centered, glow and magical energy effect visible",
    avoid: "multiple items scattered, crafting scene, wizard character, container full of many materials",
  },
};

// ===========================================
// QUEST ITEMS CATEGORY PROMPT CONFIGS
// ===========================================
export const QUEST_ITEMS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  KEYS: {
    objectType: "special key",
    visualDesc: "ornate unique key with distinctive decorative design, possibly magical glowing, ancient weathered, or elaborately crafted",
    composition: "single key centered, full key from decorative bow to teeth/bit visible",
    avoid: "multiple keys, keyring with many keys, lock or door, hand holding key, plain simple modern key",
  },
  ARTIFACTS: {
    objectType: "ancient artifact",
    visualDesc: "unique powerful relic like mysterious idol, legendary grail, magic mirror, glowing orb, or ancient mystical device",
    composition: "single artifact centered, mysterious and important appearance, magical aura suggested",
    avoid: "multiple artifacts, museum display case, hand holding it, broken pieces or shards",
  },
  CONTAINERS: {
    objectType: "treasure container",
    visualDesc: "special container like ornate treasure chest, decorated box, magical pouch or bag, or special carrying case",
    composition: "single container centered, closed state (not open), lock clasp or magical seal visible",
    avoid: "multiple containers, open showing contents inside, pile of chests, loot spilling out everywhere",
  },
  COLLECTIBLES: {
    objectType: "collectible item",
    visualDesc: "valuable collectible like shiny gold coin, hero medal, winner trophy, achievement badge, or special token",
    composition: "single collectible centered, detail and value clearly visible, prestigious appearance",
    avoid: "multiple collectibles, pile of coins, display case, hand holding it",
  },
};

// ===========================================
// CHARACTERS CATEGORY PROMPT CONFIGS
// ===========================================
export const CHARACTERS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  HEROES: {
    objectType: "hero character",
    visualDesc: "heroic adventurer with appropriate equipment, strong capable appearance, ready for action, confident pose",
    composition: "single character full body visible, standing neutral or heroic pose, facing forward or 3/4 view",
    avoid: "multiple characters, just face portrait closeup, action blur or motion, background scene, enemies in frame",
  },
  ENEMIES: {
    objectType: "enemy character",
    visualDesc: "hostile enemy creature or humanoid, threatening menacing appearance, combat ready stance",
    composition: "single enemy full body visible, standing battle stance, facing forward or aggressive pose",
    avoid: "multiple enemies or swarm, dead or defeated lying down, hero fighting it, dungeon scene background",
  },
  NPCS: {
    objectType: "NPC character",
    visualDesc: "non-player character like friendly merchant, town guard, helpful villager, or mysterious questgiver",
    composition: "single NPC full body visible, standing neutral friendly pose, approachable appearance",
    avoid: "multiple NPCs, hero player character, shop interior background, crowd scene",
  },
  BOSSES: {
    objectType: "boss enemy character",
    visualDesc: "powerful imposing boss creature, large intimidating presence, unique memorable design, ultimate threat",
    composition: "single boss full body visible, powerful dominant stance, showing full impressive form and scale",
    avoid: "multiple bosses, tiny minions around it, health bar UI, arena background, dead or defeated",
  },
};

// ===========================================
// CREATURES CATEGORY PROMPT CONFIGS
// ===========================================
export const CREATURES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ANIMALS: {
    objectType: "animal creature",
    visualDesc: "realistic or stylized animal like fierce wolf, powerful bear, majestic eagle, noble horse, or graceful deer",
    composition: "single animal full body visible, natural standing or alert pose, animal's character clear",
    avoid: "multiple animals herd, rider on mount, hunting scene, dead animal, pack or flock",
  },
  MYTHICAL: {
    objectType: "mythical creature",
    visualDesc: "legendary beast like majestic dragon, blazing phoenix, noble unicorn, proud griffin, or multi-headed hydra",
    composition: "single creature full body visible, majestic or powerful pose, wings spread if applicable",
    avoid: "multiple creatures, rider on creature, battle scene, egg or baby version only, skeleton undead version",
  },
  PETS: {
    objectType: "pet companion creature",
    visualDesc: "cute friendly companion like adorable cat, loyal dog, tiny fairy, baby dragon, or friendly slime blob",
    composition: "single pet full body visible, cute friendly pose, approachable and endearing appearance",
    avoid: "multiple pets, owner with pet, pet shop scene, aggressive attacking pose, injured or sad",
  },
  ELEMENTALS: {
    objectType: "elemental being",
    visualDesc: "creature made of pure element like blazing fire elemental, flowing water spirit, rocky earth golem, or wispy air elemental",
    composition: "single elemental full form visible, element clearly identifiable, floating or standing majestically",
    avoid: "multiple elementals, wizard summoning it, mixed elements together, dissipating or dying",
  },
};

// ===========================================
// ENVIRONMENT CATEGORY PROMPT CONFIGS
// ===========================================
export const ENVIRONMENT_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  TREES_PLANTS: {
    objectType: "vegetation prop",
    visualDesc: "tree, decorative bush, flower cluster, or plant suitable for game environment decoration",
    composition: "single tree or plant, full form from ground/roots to top, natural organic shape",
    avoid: "forest scene with many trees, multiple different species, character under tree, seasonal transition scene",
  },
  ROCKS_TERRAIN: {
    objectType: "rock formation prop",
    visualDesc: "boulder, rock cluster, crystal formation, cliff piece, or natural terrain element",
    composition: "single rock formation, stable grounded natural appearance, usable as game prop",
    avoid: "mountain range landscape, cave interior scene, character climbing, many separate rocks scattered randomly",
  },
  BUILDINGS: {
    objectType: "building structure",
    visualDesc: "single building like cozy house, tall tower, friendly shop, ancient temple, or castle section",
    composition: "single building front or 3/4 exterior view, full structure visible from ground to roof",
    avoid: "city scene with many buildings, interior room view, character in doorway, ruins or destroyed",
  },
  PROPS: {
    objectType: "furniture prop",
    visualDesc: "interior or exterior prop like wooden chair, sturdy table, storage barrel, wooden crate, wall torch, or signpost",
    composition: "single prop item, standing naturally in usable position, full object visible",
    avoid: "room scene with many props, multiple props together, character using or sitting on it, store inventory display",
  },
  DUNGEON: {
    objectType: "dungeon prop element",
    visualDesc: "dungeon element like deadly spike trap, mechanical lever, heavy door, sacrificial altar, hanging cage, or wall torch holder",
    composition: "single dungeon element, functional purpose clear, atmospheric and dangerous appearance",
    avoid: "dungeon room scene, multiple traps together, character triggering or dying to it, maze layout overview",
  },
  // Isometric subcategories in Environment
  ISO_BUILDINGS: {
    objectType: "isometric building",
    visualDesc: "isometric 2.5D building viewed from above at 26.57-degree angle, showing roof top and two visible walls, strategy game architecture",
    composition: "single isometric building, diamond footprint visible, complete structure with roof and walls, grounded on invisible tile grid",
    avoid: "front view, side view only, perspective 3D, top-down flat, multiple buildings, interior view, wrong angle",
  },
  ISO_TREES: {
    objectType: "isometric tree",
    visualDesc: "isometric 2.5D tree viewed from above, round or conical canopy, visible trunk base casting small shadow",
    composition: "single isometric tree, full tree from grounded base to crown, canopy shape clear, suitable for tile placement",
    avoid: "side view tree, flat tree sprite, forest scene, multiple trees, dead leafless tree, wrong projection angle",
  },
  ISO_PROPS: {
    objectType: "isometric prop decoration",
    visualDesc: "isometric 2.5D small prop or decoration, viewed from strategy game angle, functional or decorative purpose",
    composition: "single isometric prop, small scale relative to buildings, complete object, fits on tile grid",
    avoid: "flat front view, multiple props clustered, perspective view, building scale (too large)",
  },
  ISO_TERRAIN: {
    objectType: "isometric terrain feature",
    visualDesc: "isometric 2.5D terrain element like rock formation, water feature, or natural ground decoration from above",
    composition: "single terrain feature, isometric projection consistent, integrates with tile grid, natural appearance",
    avoid: "landscape panorama scene, flat terrain texture, multiple formations scattered, perspective view",
  },
};

// ===========================================
// ISOMETRIC CATEGORY PROMPT CONFIGS
// ===========================================
export const ISOMETRIC_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ISO_HOUSES: {
    objectType: "isometric residential house",
    visualDesc: "cozy isometric house with pitched roof, windows, door, chimney, warm residential home appearance viewed from 2.5D strategy angle",
    composition: "single isometric house, complete structure from foundation to roof, visible roof top and two adjacent walls, grounded stable base",
    avoid: "flat front view, interior view, multiple houses neighborhood, damaged or destroyed, construction scaffolding",
  },
  ISO_COMMERCIAL: {
    objectType: "isometric shop building",
    visualDesc: "isometric commercial building with shop front, signage area, display windows, merchant or store business appearance",
    composition: "single isometric shop, complete structure, shop features clearly visible, commercial purpose obvious",
    avoid: "residential house style, interior view, marketplace with crowds, multiple shops row, flat view",
  },
  ISO_MILITARY: {
    objectType: "isometric military structure",
    visualDesc: "isometric defensive structure like guard tower, fortress wall section, or military barracks, sturdy imposing defensive appearance",
    composition: "single military structure, isometric projection, defensive features clear, solid fortified construction",
    avoid: "battle scene with soldiers, damaged ruins, multiple towers forming wall, flat view, perspective 3D",
  },
  ISO_PRODUCTION: {
    objectType: "isometric production building",
    visualDesc: "isometric industrial or production building like windmill, farm building, mine entrance, or craftsman workshop with functional features",
    composition: "single production building, isometric projection consistent, working features visible like wheels or smokestacks, functional appearance",
    avoid: "workers or farmers, production animation effects, multiple buildings complex, flat view, landscape scene",
  },
  ISO_SPECIAL: {
    objectType: "isometric special landmark building",
    visualDesc: "isometric unique landmark building like grand temple, victory monument, or wonder structure with distinctive impressive architecture",
    composition: "single special building, isometric view consistent, landmark quality design, decorative impressive details",
    avoid: "common house design, multiple buildings, interior view, flat view, generic city building",
  },
  ISO_VEGETATION: {
    objectType: "isometric vegetation",
    visualDesc: "isometric tree or plant cluster viewed from 2.5D strategy game angle, natural rounded organic shapes",
    composition: "single vegetation element, isometric projection, complete plant visible, appropriate scale for tile placement",
    avoid: "forest scene with many plants, flat top-down view, multiple different plants scattered, wilted dead, abstract shapes",
  },
  ISO_DECORATIONS: {
    objectType: "isometric decoration prop",
    visualDesc: "small isometric decoration object like stone well, park bench, hero statue, or street lamp, detail prop for game world beautification",
    composition: "single decoration prop, isometric view, small scale appropriate for decoration, detailed and complete",
    avoid: "large building scale, multiple decorations clustered, flat view, oversized prop",
  },
  ISO_TILES: {
    objectType: "isometric ground tile",
    visualDesc: "isometric diamond-shaped ground tile, seamless edges that connect with other tiles, surface texture like grass, dirt, stone, or water",
    composition: "single isometric tile, diamond shape clearly defined, seamlessly tileable edges, consistent lighting from top-left",
    avoid: "square tile shape, objects or characters on tile, non-tileable mismatched edges, perspective view instead of isometric",
  },
};

// ===========================================
// TILESETS CATEGORY PROMPT CONFIGS
// ===========================================
export const TILESETS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  GROUND: {
    objectType: "ground tile texture",
    visualDesc: "seamless floor or ground texture like grass field, dirt path, stone floor, sand beach, or wood planks",
    composition: "single square tile, seamlessly tileable in all directions, edges match opposite edges perfectly",
    avoid: "scene showing ground area, character standing on it, objects placed on ground, non-tileable obvious edges",
  },
  WALLS: {
    objectType: "wall tile texture",
    visualDesc: "seamless vertical wall texture like brick wall, stone blocks, wood panels, or dungeon wall surface",
    composition: "single square tile, seamlessly tileable, suitable for vertical wall surface, consistent pattern",
    avoid: "room with walls scene, doorway or window in wall, character against wall, non-tileable pattern breaks",
  },
  PLATFORMS: {
    objectType: "platform tile",
    visualDesc: "platformer game surface piece like grass platform edge, stone ledge block, or floating island chunk",
    composition: "single platform tile piece, clear top walkable surface, edges defined for platformer use",
    avoid: "full level layout overview, character standing on platform, multiple platforms scene, background scenery",
  },
  DECORATIVE: {
    objectType: "decorative tile overlay",
    visualDesc: "overlay decoration texture like crack pattern, moss growth patch, blood splatter stain, or carpet pattern",
    composition: "single decorative tile, transparent background for overlay use on top of base tiles",
    avoid: "full decorated scene, base tile included underneath, character, multiple overlay types combined",
  },
};

// ===========================================
// UI ELEMENTS CATEGORY PROMPT CONFIGS
// ===========================================
// MAJOR UPDATE v3.0: Added ITEM_ICONS for inventory item icons
// Renamed INVENTORY to SLOTS_GRID for empty UI grids
export const UI_ELEMENTS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  // !!! MOST IMPORTANT - Item icons for inventory !!!
  ITEM_ICONS: {
    objectType: "game item icon for inventory",
    visualDesc: "SINGLE game item icon suitable for inventory slot - clearly recognizable item rendered as icon, simplified stylized appearance, bold outlines, high contrast, game-ready inventory icon style like RPG loot icons",
    composition: "SINGLE ITEM ICON centered on transparent background, square format (fits in inventory slot), item fills most of the frame, clean simple iconic representation, NOT a grid of items, NOT multiple objects",
    avoid: "multiple items, inventory grid or slots, UI frame around it, realistic photo style, tiny item in corner, cluttered composition, full scene, grid layout, slot borders",
  },
  SKILL_ICONS: {
    objectType: "skill ability icon",
    visualDesc: "ability or spell icon showing skill effect visually - like fireball attack, healing spell, buff aura, or combat ability, bold iconic style",
    composition: "single skill icon, square format suitable for skill bar, clear visual representation of the ability effect, iconic and readable at small size",
    avoid: "skill bar with multiple abilities, character casting the spell, cooldown overlay timer, tooltip text, realistic scene",
  },
  ICONS_UI: {
    objectType: "UI icon symbol",
    visualDesc: "interface icon like settings gear, menu hamburger, map marker, quest tracker, or notification symbol, clean vector-like style",
    composition: "single icon centered, clear symbolic meaning at small size, works as interface element",
    avoid: "multiple icons set, icon placed in interface context, text label attached, full HUD layout",
  },
  BUTTONS: {
    objectType: "UI button element",
    visualDesc: "clickable game button with clear visual states, rounded or rectangular shape, suitable for game interface",
    composition: "single button centered, readable at small size, clear clickable interactive appearance",
    avoid: "full menu screen, text on button (keep empty for user to add text), cursor clicking animation",
  },
  BARS: {
    objectType: "UI progress bar element",
    visualDesc: "progress bar like health bar, mana bar, experience bar, stamina bar, or loading bar with frame and fill",
    composition: "single bar element, horizontal rectangle, showing both empty frame and filled portion example",
    avoid: "full HUD layout, character portrait attached, screen corner placement, multiple different bars",
  },
  FRAMES: {
    objectType: "UI frame border",
    visualDesc: "decorative frame or panel border for menus, dialogs, or windows - just the border/frame element itself",
    composition: "single frame border, can be 9-slice compatible for scaling, ornate corners and edge decoration",
    avoid: "content inside the frame, full menu with buttons, multiple frames stacked, text inside",
  },
  PANELS: {
    objectType: "UI panel with internal layout",
    visualDesc: "game panel or window containing visible internal structure - may include grid of slots, sections, or organized areas",
    composition: "single panel with visible internal organization, if slots are mentioned show them as distinct bordered cells arranged in a grid pattern",
    avoid: "items filling the slots (keep slots empty), character equipment on body, just a plain frame without internal structure",
  },
  // Renamed from INVENTORY - this is for empty slot grids/UI elements only
  SLOTS_GRID: {
    objectType: "inventory slot grid UI element",
    visualDesc: "empty inventory UI element - either single item slot OR grid of multiple empty slots arranged in rows and columns, each slot is a distinct bordered square cell",
    composition: "slots shown as clearly bordered empty squares, if multiple slots requested arrange them in organized grid pattern (e.g., 2x2 for 4 slots, 3x3 for 9 slots)",
    avoid: "items inside slots (keep empty), character equipment screen with body, scattered unorganized slots, actual item icons",
  },
};

// ===========================================
// EFFECTS CATEGORY PROMPT CONFIGS
// ===========================================
export const EFFECTS_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  COMBAT_EFFECTS: {
    objectType: "combat VFX sprite",
    visualDesc: "combat visual effect like sword slash arc, hit impact burst, damage splatter, or punch impact effect",
    composition: "single effect frame, transparent background, dynamic energy and motion visible in the effect",
    avoid: "character performing the action, multiple effects overlapping, animation sequence sprite sheet, weapon shown separately",
  },
  MAGIC_EFFECTS: {
    objectType: "magic VFX sprite",
    visualDesc: "magical visual effect like spell cast burst, healing aura glow, buff sparkle effect, or magic circle formation",
    composition: "single magic effect, transparent background, glowing magical energy clearly visible",
    avoid: "wizard or mage casting, spell hitting target enemy, multiple spells combined, wand or staff shown",
  },
  ELEMENTAL: {
    objectType: "elemental effect sprite",
    visualDesc: "elemental VFX like fire burst flames, ice crystal shards, lightning bolt strike, or water splash wave",
    composition: "single elemental effect, transparent background, element type clearly identifiable",
    avoid: "elemental creature (use Creatures category), environment damage, multiple elements mixed together, character",
  },
  AMBIENT: {
    objectType: "ambient particle effect",
    visualDesc: "ambient effect like magical sparkle, floating dust mote, smoke puff wisp, rain drop, or snow flake particle",
    composition: "single particle or small cluster of same particle type, transparent background for overlay use",
    avoid: "weather system full scene, smokey room environment, dusty cave, multiple different effect types combined",
  },
};

// ===========================================
// PROJECTILES CATEGORY PROMPT CONFIGS
// ===========================================
export const PROJECTILES_PROMPT_CONFIG: Record<string, SubcategoryPromptConfig> = {
  ARROWS: {
    objectType: "arrow projectile",
    visualDesc: "flying arrow with pointed arrowhead, straight shaft, and fletching feathers at the end",
    composition: "single arrow in horizontal flight pose, full arrow visible from tip to fletching, motion direction clear",
    avoid: "multiple arrows volley, quiver container, bow weapon, archer character, arrow stuck in target",
  },
  BULLETS: {
    objectType: "bullet projectile",
    visualDesc: "ammunition like metal bullet, heavy cannonball, explosive rocket, or energy shot blast",
    composition: "single projectile, motion direction clear, full projectile visible, possibly with speed trail",
    avoid: "multiple bullets spray, gun firing with muzzle flash, impact explosion, shell casing, ammo box container",
  },
  MAGIC_PROJECTILES: {
    objectType: "magic projectile spell",
    visualDesc: "magical projectile like blazing fireball, sharp ice shard, dark shadow bolt, or glowing arcane missile",
    composition: "single magic projectile, glowing magical energy, motion direction clear, trailing magic effect",
    avoid: "wizard casting the spell, spell impact on target, multiple projectiles barrage, spell effect on enemy",
  },
  THROWN: {
    objectType: "thrown projectile item",
    visualDesc: "thrown weapon in mid-flight like spinning throwing knife, ticking bomb, hurled javelin, or bouncing grenade",
    composition: "single thrown object, flight pose with motion implied through angle and trail, mid-air",
    avoid: "multiple thrown items volley, thrower character, impact moment explosion, target being hit",
  },
};

// ===========================================
// COMBINED CATEGORY CONFIGS
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
  WEAPONS: "game weapon item, combat equipment sprite, isolated weapon asset",
  ARMOR: "protective armor equipment, defensive gear sprite, isolated armor piece",
  CONSUMABLES: "consumable game item, usable pickup sprite, isolated consumable",
  RESOURCES: "crafting resource material, gatherable item sprite, isolated resource",
  QUEST_ITEMS: "quest item artifact, special collectible sprite, isolated quest object",
  CHARACTERS: "game character sprite, full body figure, isolated character on transparent background",
  CREATURES: "creature beast sprite, full body monster or animal, isolated creature",
  ENVIRONMENT: "environment prop sprite, world decoration object, isolated placeable prop",
  ISOMETRIC: "isometric 2.5D game asset, strategy game sprite, dimetric projection view, isolated isometric object",
  TILESETS: "tileable game texture, seamless pattern tile, isolated tileable texture",
  UI_ELEMENTS: "game UI element, interface graphic sprite, isolated UI component",
  EFFECTS: "visual effect sprite, VFX game element, isolated effect with transparency",
  PROJECTILES: "projectile sprite, flying ammunition object, isolated projectile with motion",
};