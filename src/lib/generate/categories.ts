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
    promptPrefix: "single clean character sprite, EXACTLY as described - nothing more nothing less, NO armor unless specified, NO crown unless specified, NO helmet unless specified, NO horns, NO spikes, NO extra decorations, wizard = robes and staff and pointed hat, knight = armor, neutral pose, ONLY explicitly requested features, accurate proportions, ZERO blood, ZERO wounds",
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
    promptPrefix: "single weapon only, isolated weapon sprite, ALL described elements MANDATORY, glowing runes = bright magical symbols carved into surface with visible light emission, crystal elements = clear transparent glass texture, glowing effects = intense bright aura with light rays, magical energy visible, luminous enchantments clearly shown, accurate proportions, clean design",
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
    promptPrefix: "game item icon, single item object, clean design, glowing potions = bright luminous bottles with visible magical aura and light emission, magical items = clearly visible enchantment effects, coins = simple metallic design, inventory style icon",
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
    promptPrefix: "PURE MAGICAL EFFECT ONLY - ZERO characters, ZERO people, ZERO wizards, ZERO humans, ZERO faces, ZERO bodies, ZERO living creatures, abstract magical phenomenon only, isolated spell effect, energy manifestation, particle system, magic aura, elemental effect, pure visual magic without any caster or person",
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
    promptPrefix: "SPRITE SHEET FORMAT MANDATORY: horizontal row of animation frames, minimum 4 frames (idle-walk-attack-death), each frame same size, equal spacing between frames, white background separation, consistent character across all frames, frame-by-frame animation sequence, game development ready format, ALL frames clearly visible",
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
