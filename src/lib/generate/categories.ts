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
    promptPrefix: "game character sprite, clean single character design, no extra accessories unless specified, simple clean character",
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
    promptPrefix: "game weapon icon, isolated weapon on transparent background, clearly defined weapon parts, accurate weapon design",
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
    promptPrefix: "game item icon, single item object, clean item design, game inventory style icon",
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
    promptPrefix: "game environment prop",
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
    promptPrefix: "game visual effect, magic spell effect, particle effect, energy blast, NO characters or people, pure visual effect only",
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
