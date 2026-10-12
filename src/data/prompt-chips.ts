// =============================================================================
// GENERATE PAGE — CONTEXTUAL PROMPT CHIPS
// =============================================================================
// Each category gets its own set of chip groups.
// Clicking a chip appends the word to the user's prompt.
// Keys MUST match category IDs from src/config/categories/all-categories.ts.
// =============================================================================

export interface ChipGroup {
  label: string;
  chips: string[];
}

export const PROMPT_CHIPS: Record<string, ChipGroup[]> = {
  WEAPONS: [
    { label: "Element", chips: ["fire", "ice", "lightning", "poison", "holy", "dark", "nature"] },
    { label: "Material", chips: ["iron", "gold", "crystal", "bone", "wood", "obsidian", "mithril"] },
    { label: "Effect", chips: ["glowing", "enchanted", "rusted", "ancient", "legendary", "cursed"] },
  ],
  ARMOR: [
    { label: "Material", chips: ["iron", "leather", "gold", "crystal", "bone", "cloth", "dragon scale"] },
    { label: "Detail", chips: ["ornate", "battle-worn", "enchanted", "spiked", "feathered", "royal"] },
  ],
  CONSUMABLES: [
    { label: "Type", chips: ["health", "mana", "stamina", "strength", "speed", "resistance"] },
    { label: "Container", chips: ["bottle", "vial", "flask", "jar", "ampoule"] },
    { label: "Effect", chips: ["glowing", "bubbling", "smoking", "crystallized", "swirling"] },
  ],
  RESOURCES: [
    { label: "Type", chips: ["gem", "ore", "wood", "herb", "crystal", "bone", "fabric"] },
    { label: "Quality", chips: ["raw", "refined", "enchanted", "rare", "common", "ancient"] },
  ],
  CHARACTERS: [
    { label: "Class", chips: ["warrior", "mage", "rogue", "archer", "merchant", "villager", "guard"] },
    { label: "Detail", chips: ["armored", "hooded", "wounded", "elderly", "young", "muscular"] },
    { label: "Mood", chips: ["aggressive", "peaceful", "scared", "proud", "mysterious"] },
  ],
  CREATURES: [
    { label: "Type", chips: ["undead", "beast", "demon", "elemental", "dragon", "insect", "slime"] },
    { label: "Size", chips: ["small", "medium", "large", "boss"] },
    { label: "Trait", chips: ["armored", "flying", "glowing eyes", "venomous", "fiery", "frozen"] },
  ],
  UI_ELEMENTS: [
    { label: "Type", chips: ["skill icon", "status icon", "item icon", "button", "health bar", "frame"] },
    { label: "Theme", chips: ["medieval", "sci-fi", "fantasy", "minimal", "dark", "golden"] },
  ],
  ENVIRONMENT: [
    { label: "Type", chips: ["tree", "rock", "chest", "door", "torch", "barrel", "crate", "fence"] },
    { label: "Biome", chips: ["forest", "dungeon", "cave", "desert", "snow", "swamp", "castle"] },
  ],
  QUEST_ITEMS: [
    { label: "Type", chips: ["key", "artifact", "container", "collectible", "map", "letter"] },
    { label: "Detail", chips: ["golden", "ancient", "cursed", "glowing", "ornate", "rusted"] },
  ],
};
