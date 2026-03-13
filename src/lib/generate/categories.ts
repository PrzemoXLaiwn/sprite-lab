// ===========================================
// SPRITELAB - ASSET CATEGORIES
// ===========================================

export interface AssetCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  promptPrefix: string;
  defaultSize: { width: number; height: number };
  subcategories: string[];
  suggestions: string[];
}

export const ASSET_CATEGORIES: AssetCategory[] = [
  {
    id: "characters",
    name: "Characters",
    icon: "👤",
    description: "Heroes, enemies, NPCs",
    promptPrefix: "EXACTLY ONE single character sprite ONLY, ZERO additional characters, ZERO background characters, ZERO multiple people, clean isolated character design, neutral standing pose, character alone on transparent background, wizard = SINGLE robed mage with staff and pointed hat, knight = SINGLE armored warrior, NO companions, NO duplicates",
    defaultSize: { width: 512, height: 512 },
    subcategories: ["hero", "enemy", "npc", "boss", "animal", "creature"],
    suggestions: [
      "warrior knight with heavy armor",
      "cute slime enemy, bouncy",
      "wizard with long beard and staff",
      "ninja assassin in shadows",
      "robot companion, friendly",
      "pixel art goblin enemy",
    ],
  },
  {
    id: "weapons",
    name: "Weapons",
    icon: "⚔️",
    description: "Swords, guns, magic staffs",
    promptPrefix: "single weapon sprite on transparent background, WHEN 'glowing' mentioned: INTENSE BRIGHT LUMINOUS AURA radiating from entire weapon with visible light rays and energy particles, WHEN 'runes' mentioned: GLOWING magical symbols CARVED DEEP into weapon surface EMITTING BRIGHT COLORED LIGHT, WHEN 'magical': weapon SURROUNDED by swirling energy effects, all magical weapons MUST show DRAMATIC glowing effects",
    defaultSize: { width: 256, height: 256 },
    subcategories: ["sword", "axe", "bow", "gun", "staff", "shield"],
    suggestions: [
      "fire sword with flames",
      "crystal ice staff",
      "ancient golden bow",
      "sci-fi laser rifle",
      "wooden shield with lion emblem",
      "legendary katana, glowing",
    ],
  },
  {
    id: "items",
    name: "Items",
    icon: "💎",
    description: "Potions, coins, power-ups",
    promptPrefix: "single game item sprite, WHEN 'glowing' mentioned: BRIGHT MAGICAL AURA completely surrounding object with visible light particles and energy emission radiating outward, WHEN 'potion' mentioned: transparent glass bottle with cork stopper containing brightly colored liquid, WHEN magical item: INTENSE glowing magical effects visible around entire object, all magical items MUST display dramatic luminous effects",
    defaultSize: { width: 128, height: 128 },
    subcategories: ["potion", "coin", "gem", "food", "key", "scroll"],
    suggestions: [
      "red health potion, glowing",
      "golden coin, shiny",
      "blue mana crystal",
      "treasure chest, wooden",
      "magic scroll, ancient",
      "green stamina potion",
    ],
  },
  {
    id: "ui",
    name: "UI Elements",
    icon: "🎮",
    description: "Buttons, frames, icons",
    promptPrefix: "game UI element",
    defaultSize: { width: 256, height: 256 },
    subcategories: ["button", "frame", "panel", "icon", "healthbar"],
    suggestions: [
      "wooden button, medieval",
      "sci-fi health bar",
      "inventory slot frame",
      "golden star rating icon",
      "pause menu panel",
      "skill icon frame",
    ],
  },
  {
    id: "environment",
    name: "Environment",
    icon: "🌳",
    description: "Trees, rocks, props",
    promptPrefix: "game environment asset, trees = chunky pixelated trunk and foliage if pixel art style, fantasy elements clearly visible, organic shapes adapted to chosen art style, clean prop design, game-ready asset",
    defaultSize: { width: 512, height: 512 },
    subcategories: ["tree", "rock", "bush", "grass", "flower", "prop"],
    suggestions: [
      "oak tree, large canopy",
      "mossy boulder, forest",
      "street lamp, victorian",
      "wooden fence section",
      "campfire with logs",
      "treasure chest in grass",
    ],
  },
  {
    id: "buildings",
    name: "Buildings",
    icon: "🏠",
    description: "Houses, castles, structures",
    promptPrefix: "game building asset",
    defaultSize: { width: 512, height: 512 },
    subcategories: ["house", "castle", "tower", "shop", "temple"],
    suggestions: [
      "medieval tavern, cozy",
      "wizard tower, tall spire",
      "blacksmith shop with anvil",
      "abandoned ruins, overgrown",
      "futuristic space station",
      "small cottage, fantasy",
    ],
  },
  {
    id: "effects",
    name: "Effects",
    icon: "✨",
    description: "Explosions, magic, particles",
    promptPrefix: "ABSTRACT MAGICAL EFFECT ONLY - ABSOLUTELY ZERO people, ZERO wizards, ZERO characters, ZERO humans, ZERO faces, ZERO bodies, ZERO hands, ZERO creatures, ZERO living beings of any kind, pure isolated spell effect, floating magical energy, elemental phenomenon, particle system, magic aura, energy burst, NO CASTER VISIBLE, just the effect itself floating in space",
    defaultSize: { width: 256, height: 256 },
    subcategories: ["explosion", "fire", "lightning", "magic", "smoke"],
    suggestions: [
      "fire explosion burst",
      "magic sparkles, blue",
      "smoke cloud puff",
      "electric lightning bolt",
      "healing green aura",
      "ice crystal shard",
    ],
  },
  {
    id: "vehicles",
    name: "Vehicles",
    icon: "🚀",
    description: "Cars, ships, spaceships",
    promptPrefix: "game vehicle sprite",
    defaultSize: { width: 512, height: 512 },
    subcategories: ["car", "spaceship", "boat", "plane", "mount"],
    suggestions: [
      "medieval horse cart",
      "spaceship fighter, sleek",
      "pirate sailing ship",
      "post-apocalyptic car",
      "flying broom, magical",
      "armored tank, futuristic",
    ],
  },
  {
    id: "spritesheets",
    name: "Sprite Sheets",
    icon: "🎬",
    description: "Animation frames, sequences",
    promptPrefix: "MANDATORY SPRITESHEET: visible white grid layout showing 4x1 OR 8x1 horizontal row of separate square frames, each frame EXACTLY same size, character repeated in EACH frame with different pose, frame 1: idle standing, frame 2: walking step, frame 3: attack pose, frame 4: hurt/damaged, WHITE BORDER LINES separating each frame clearly, game animation spritesheet format, NEVER single character - MUST be multiple frames in grid, pixel-perfect frame alignment",
    defaultSize: { width: 512, height: 128 },
    subcategories: ["walk-cycle", "attack", "idle", "death", "jump"],
    suggestions: [
      "knight walk cycle, 4 frames",
      "slime bounce animation, 6 frames",
      "sword slash attack sequence",
      "wizard casting spell animation",
      "character death animation",
      "idle breathing animation",
    ],
  },
];

export function getCategoryById(id: string): AssetCategory | undefined {
  return ASSET_CATEGORIES.find((cat) => cat.id === id);
}

export function getRandomSuggestion(categoryId: string): string {
  const category = getCategoryById(categoryId);
  if (!category) return "";
  const suggestions = category.suggestions;
  return suggestions[Math.floor(Math.random() * suggestions.length)];
}
