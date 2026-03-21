// =============================================================================
// GENERATE PAGE — CATEGORY DEFINITIONS
// =============================================================================
// Maps the RPG-focused subset of categories from src/config/categories
// to the Generate page UI. IDs MUST match ALL_CATEGORIES in all-categories.ts.
// =============================================================================

import {
  Sword,
  Shield,
  FlaskConical,
  Gem,
  Users,
  Bug,
  LayoutGrid,
  TreePine,
  Crown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface GenerateSubcategory {
  categoryId: string;
  subcategoryId: string;
  label: string;
}

export interface GenerateCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  subcategories: GenerateSubcategory[];
}

export const GENERATE_CATEGORIES: GenerateCategory[] = [
  {
    id: "WEAPONS",
    label: "Weapons",
    icon: Sword,
    subcategories: [
      { categoryId: "WEAPONS", subcategoryId: "SWORDS", label: "Swords" },
      { categoryId: "WEAPONS", subcategoryId: "AXES", label: "Axes & Hammers" },
      { categoryId: "WEAPONS", subcategoryId: "POLEARMS", label: "Polearms" },
      { categoryId: "WEAPONS", subcategoryId: "BOWS", label: "Bows" },
      { categoryId: "WEAPONS", subcategoryId: "STAFFS", label: "Staffs & Wands" },
      { categoryId: "WEAPONS", subcategoryId: "GUNS", label: "Firearms" },
      { categoryId: "WEAPONS", subcategoryId: "THROWING", label: "Throwing" },
    ],
  },
  {
    id: "ARMOR",
    label: "Armor",
    icon: Shield,
    subcategories: [
      { categoryId: "ARMOR", subcategoryId: "HELMETS", label: "Helmets" },
      { categoryId: "ARMOR", subcategoryId: "CHEST_ARMOR", label: "Chest Armor" },
      { categoryId: "ARMOR", subcategoryId: "SHIELDS", label: "Shields" },
      { categoryId: "ARMOR", subcategoryId: "GLOVES", label: "Gloves" },
      { categoryId: "ARMOR", subcategoryId: "BOOTS", label: "Boots" },
      { categoryId: "ARMOR", subcategoryId: "ACCESSORIES", label: "Accessories" },
    ],
  },
  {
    id: "CONSUMABLES",
    label: "Consumables",
    icon: FlaskConical,
    subcategories: [
      { categoryId: "CONSUMABLES", subcategoryId: "POTIONS", label: "Potions" },
      { categoryId: "CONSUMABLES", subcategoryId: "FOOD", label: "Food" },
      { categoryId: "CONSUMABLES", subcategoryId: "SCROLLS", label: "Scrolls" },
    ],
  },
  {
    id: "RESOURCES",
    label: "Resources",
    icon: Gem,
    subcategories: [
      { categoryId: "RESOURCES", subcategoryId: "GEMS", label: "Gems" },
      { categoryId: "RESOURCES", subcategoryId: "ORES", label: "Ores" },
      { categoryId: "RESOURCES", subcategoryId: "WOOD_STONE", label: "Wood & Stone" },
      { categoryId: "RESOURCES", subcategoryId: "PLANTS", label: "Plants" },
      { categoryId: "RESOURCES", subcategoryId: "MONSTER_PARTS", label: "Monster Parts" },
      { categoryId: "RESOURCES", subcategoryId: "MAGIC_MATERIALS", label: "Magic Materials" },
    ],
  },
  {
    id: "CHARACTERS",
    label: "Characters",
    icon: Users,
    subcategories: [
      { categoryId: "CHARACTERS", subcategoryId: "HEROES", label: "Heroes" },
      { categoryId: "CHARACTERS", subcategoryId: "ENEMIES", label: "Enemies" },
      { categoryId: "CHARACTERS", subcategoryId: "NPCS", label: "NPCs" },
      { categoryId: "CHARACTERS", subcategoryId: "BOSSES", label: "Bosses" },
    ],
  },
  {
    id: "CREATURES",
    label: "Creatures",
    icon: Bug,
    subcategories: [
      { categoryId: "CREATURES", subcategoryId: "ANIMALS", label: "Animals" },
      { categoryId: "CREATURES", subcategoryId: "MYTHICAL", label: "Mythical" },
      { categoryId: "CREATURES", subcategoryId: "PETS", label: "Companions" },
      { categoryId: "CREATURES", subcategoryId: "ELEMENTALS", label: "Elementals" },
    ],
  },
  {
    id: "UI_ELEMENTS",
    label: "Icons",
    icon: LayoutGrid,
    subcategories: [
      { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS", label: "Item Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "SKILL_ICONS", label: "Skill Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "STATUS_ICONS", label: "Status Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "ICONS_UI", label: "UI Icons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BUTTONS", label: "Buttons" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "BARS", label: "Bars" },
      { categoryId: "UI_ELEMENTS", subcategoryId: "FRAMES", label: "Frames" },
    ],
  },
  {
    id: "ENVIRONMENT",
    label: "Environment",
    icon: TreePine,
    subcategories: [
      { categoryId: "ENVIRONMENT", subcategoryId: "TREES_PLANTS", label: "Trees & Plants" },
      { categoryId: "ENVIRONMENT", subcategoryId: "ROCKS_TERRAIN", label: "Rocks & Terrain" },
      { categoryId: "ENVIRONMENT", subcategoryId: "BUILDINGS", label: "Buildings" },
      { categoryId: "ENVIRONMENT", subcategoryId: "PROPS", label: "Props" },
      { categoryId: "ENVIRONMENT", subcategoryId: "DUNGEON", label: "Dungeon" },
    ],
  },
  {
    id: "QUEST_ITEMS",
    label: "Loot",
    icon: Crown,
    subcategories: [
      { categoryId: "QUEST_ITEMS", subcategoryId: "KEYS", label: "Keys" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "ARTIFACTS", label: "Artifacts" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "CONTAINERS", label: "Containers" },
      { categoryId: "QUEST_ITEMS", subcategoryId: "COLLECTIBLES", label: "Collectibles" },
    ],
  },
];

// Subcategory placeholder prompts (keyed by subcategoryId)
export const SUBTYPE_PLACEHOLDERS: Record<string, string> = {
  // Weapons
  SWORDS: "e.g. iron sword with red gem in the hilt",
  AXES: "e.g. bone-handled battle axe with runes",
  POLEARMS: "e.g. golden trident with glowing tips",
  BOWS: "e.g. golden recurve bow with silver tips",
  STAFFS: "e.g. crystal staff with glowing purple orb",
  GUNS: "e.g. steampunk flintlock pistol",
  THROWING: "e.g. star-shaped shuriken with red glow",
  // Armor
  HELMETS: "e.g. knight helmet with plume",
  CHEST_ARMOR: "e.g. golden plate armor with rune engravings",
  SHIELDS: "e.g. tower shield with lion crest",
  GLOVES: "e.g. iron gauntlets with spikes",
  BOOTS: "e.g. leather boots with silver buckles",
  ACCESSORIES: "e.g. silver amulet with blue gem",
  // Consumables
  POTIONS: "e.g. glowing red health potion in glass bottle",
  FOOD: "e.g. roasted chicken leg on wooden plate",
  SCROLLS: "e.g. ancient scroll with glowing runes",
  // Resources
  GEMS: "e.g. large cut ruby, deep red",
  ORES: "e.g. raw gold ore chunk",
  WOOD_STONE: "e.g. oak log with bark texture",
  PLANTS: "e.g. glowing blue herb",
  MONSTER_PARTS: "e.g. dragon scale, iridescent",
  MAGIC_MATERIALS: "e.g. purple soul gem, glowing",
  // Characters
  HEROES: "e.g. female warrior with silver armor",
  ENEMIES: "e.g. skeleton archer with cracked bones",
  NPCS: "e.g. friendly blacksmith with leather apron",
  BOSSES: "e.g. demon lord with wings and horns",
  // Creatures
  ANIMALS: "e.g. grey wolf with glowing eyes",
  MYTHICAL: "e.g. red dragon, large wings spread",
  PETS: "e.g. baby dragon companion, cute",
  ELEMENTALS: "e.g. fire elemental, swirling flame body",
  // Icons
  ITEM_ICONS: "e.g. coin stack icon, golden",
  SKILL_ICONS: "e.g. fireball spell icon, orange flames",
  STATUS_ICONS: "e.g. poison status, green skull symbol",
  ICONS_UI: "e.g. settings gear icon",
  BUTTONS: "e.g. medieval wooden play button",
  BARS: "e.g. health bar, red with black border",
  FRAMES: "e.g. ornate gold dialog frame",
  // Environment
  TREES_PLANTS: "e.g. ancient oak tree, large canopy",
  ROCKS_TERRAIN: "e.g. mossy boulder with crystals",
  BUILDINGS: "e.g. small medieval tavern",
  PROPS: "e.g. wooden barrel with iron bands",
  DUNGEON: "e.g. stone door with skull decoration",
  // Loot
  KEYS: "e.g. ornate golden skeleton key",
  ARTIFACTS: "e.g. ancient glowing orb",
  CONTAINERS: "e.g. wooden treasure chest with gold trim",
  COLLECTIBLES: "e.g. silver medal with crown engraving",
};
