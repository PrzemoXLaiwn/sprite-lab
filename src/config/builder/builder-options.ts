// ===========================================
// SPRITELAB - WEAPON & ARMOR BUILDER OPTIONS
// ===========================================
// Advanced Mode: User selects options via chips/tags
// Builder generates prompt automatically from selections

export interface BuilderOption {
  id: string;
  label: string;
  promptValue: string; // What gets added to prompt
}

export interface BuilderCategory {
  id: string;
  label: string;
  options: BuilderOption[];
  required?: boolean; // If true, user must select one
}

export interface SubcategoryBuilder {
  categories: BuilderCategory[];
}

// ===========================================
// WEAPONS BUILDER OPTIONS
// ===========================================
export const WEAPONS_BUILDER: Record<string, SubcategoryBuilder> = {
  SWORDS: {
    categories: [
      {
        id: "blade",
        label: "Blade Type",
        required: true,
        options: [
          { id: "longsword", label: "Longsword", promptValue: "longsword, straight double-edged blade" },
          { id: "katana", label: "Katana", promptValue: "katana, curved single-edged Japanese blade" },
          { id: "broadsword", label: "Broadsword", promptValue: "broadsword, wide heavy blade" },
          { id: "rapier", label: "Rapier", promptValue: "rapier, thin pointed fencing blade" },
          { id: "scimitar", label: "Scimitar", promptValue: "scimitar, curved Middle Eastern blade" },
          { id: "greatsword", label: "Greatsword", promptValue: "greatsword, massive two-handed blade" },
          { id: "shortsword", label: "Shortsword", promptValue: "shortsword, compact blade" },
          { id: "dagger", label: "Dagger", promptValue: "dagger, short stabbing blade" },
        ],
      },
      {
        id: "handle",
        label: "Handle",
        options: [
          { id: "leather", label: "Leather Wrap", promptValue: "leather wrapped handle" },
          { id: "wire", label: "Wire Wrap", promptValue: "wire wrapped grip" },
          { id: "wood", label: "Wooden", promptValue: "wooden handle" },
          { id: "bone", label: "Bone", promptValue: "bone handle" },
          { id: "ornate", label: "Ornate", promptValue: "ornate decorated handle" },
        ],
      },
      {
        id: "guard",
        label: "Guard",
        options: [
          { id: "cross", label: "Crossguard", promptValue: "cross-shaped crossguard" },
          { id: "basket", label: "Basket Hilt", promptValue: "protective basket hilt" },
          { id: "tsuba", label: "Tsuba (Japanese)", promptValue: "circular tsuba guard" },
          { id: "none", label: "Minimal", promptValue: "minimal guard" },
          { id: "ornate", label: "Ornate", promptValue: "ornate decorated guard" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "polished steel" },
          { id: "iron", label: "Iron", promptValue: "dark iron" },
          { id: "gold", label: "Gold", promptValue: "golden gilded" },
          { id: "silver", label: "Silver", promptValue: "silver plated" },
          { id: "obsidian", label: "Obsidian", promptValue: "black obsidian" },
          { id: "crystal", label: "Crystal", promptValue: "crystalline transparent" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "fire", label: "Fire", promptValue: "flaming fire enchantment, burning glow" },
          { id: "ice", label: "Ice", promptValue: "frost ice enchantment, frozen crystals" },
          { id: "lightning", label: "Lightning", promptValue: "electric lightning enchantment, sparks" },
          { id: "holy", label: "Holy", promptValue: "holy divine glow, sacred light" },
          { id: "poison", label: "Poison", promptValue: "poison dripping, toxic green glow" },
          { id: "shadow", label: "Shadow", promptValue: "dark shadow aura, void energy" },
        ],
      },
    ],
  },

  AXES: {
    categories: [
      {
        id: "type",
        label: "Axe Type",
        required: true,
        options: [
          { id: "battleaxe", label: "Battleaxe", promptValue: "battleaxe, single-sided axe head" },
          { id: "double", label: "Double Axe", promptValue: "double-headed axe, two blade heads" },
          { id: "hatchet", label: "Hatchet", promptValue: "hatchet, small one-handed axe" },
          { id: "greataxe", label: "Greataxe", promptValue: "greataxe, massive two-handed axe" },
          { id: "throwing", label: "Throwing Axe", promptValue: "throwing axe, balanced for throwing" },
        ],
      },
      {
        id: "handle",
        label: "Handle",
        options: [
          { id: "wood", label: "Wooden", promptValue: "wooden shaft" },
          { id: "metal", label: "Metal", promptValue: "metal reinforced shaft" },
          { id: "bone", label: "Bone", promptValue: "bone handle" },
          { id: "leather", label: "Leather Wrap", promptValue: "leather wrapped handle" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel axe head" },
          { id: "iron", label: "Iron", promptValue: "iron axe head" },
          { id: "bronze", label: "Bronze", promptValue: "bronze axe head" },
          { id: "obsidian", label: "Obsidian", promptValue: "obsidian blade" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "fire", label: "Fire", promptValue: "flaming fire enchantment" },
          { id: "ice", label: "Ice", promptValue: "frost ice enchantment" },
          { id: "lightning", label: "Lightning", promptValue: "electric enchantment" },
          { id: "blood", label: "Blood", promptValue: "blood-soaked, crimson glow" },
        ],
      },
    ],
  },

  BOWS: {
    categories: [
      {
        id: "type",
        label: "Bow Type",
        required: true,
        options: [
          { id: "longbow", label: "Longbow", promptValue: "longbow, tall curved bow" },
          { id: "shortbow", label: "Shortbow", promptValue: "shortbow, compact curved bow" },
          { id: "recurve", label: "Recurve", promptValue: "recurve bow, curved tips" },
          { id: "compound", label: "Compound", promptValue: "compound bow, mechanical pulleys" },
          { id: "crossbow", label: "Crossbow", promptValue: "crossbow, horizontal bow on stock" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "wood", label: "Wood", promptValue: "wooden bow" },
          { id: "bone", label: "Bone", promptValue: "bone bow" },
          { id: "metal", label: "Metal", promptValue: "metal bow" },
          { id: "composite", label: "Composite", promptValue: "composite materials bow" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "fire", label: "Fire", promptValue: "fire enchanted, glowing runes" },
          { id: "ice", label: "Ice", promptValue: "frost enchanted, icy glow" },
          { id: "nature", label: "Nature", promptValue: "nature enchanted, vines and leaves" },
        ],
      },
    ],
  },

  STAFFS: {
    categories: [
      {
        id: "type",
        label: "Staff Type",
        required: true,
        options: [
          { id: "wizard", label: "Wizard Staff", promptValue: "wizard staff, tall magical staff" },
          { id: "scepter", label: "Scepter", promptValue: "royal scepter, short ornate rod" },
          { id: "wand", label: "Wand", promptValue: "magic wand, short casting rod" },
          { id: "druid", label: "Druid Staff", promptValue: "druid staff, natural wooden staff" },
          { id: "necro", label: "Necro Staff", promptValue: "necromancer staff, skull topped" },
        ],
      },
      {
        id: "top",
        label: "Staff Top",
        options: [
          { id: "crystal", label: "Crystal Orb", promptValue: "glowing crystal orb on top" },
          { id: "gem", label: "Gemstone", promptValue: "large gemstone on top" },
          { id: "skull", label: "Skull", promptValue: "skull ornament on top" },
          { id: "nature", label: "Nature", promptValue: "twisted branches, leaves on top" },
          { id: "flame", label: "Flame", promptValue: "eternal flame on top" },
          { id: "moon", label: "Moon", promptValue: "crescent moon ornament" },
        ],
      },
      {
        id: "material",
        label: "Shaft Material",
        options: [
          { id: "wood", label: "Wood", promptValue: "wooden shaft" },
          { id: "bone", label: "Bone", promptValue: "bone shaft" },
          { id: "metal", label: "Metal", promptValue: "metal shaft" },
          { id: "crystal", label: "Crystal", promptValue: "crystalline shaft" },
        ],
      },
      {
        id: "enchant",
        label: "Magic Type",
        options: [
          { id: "arcane", label: "Arcane", promptValue: "arcane magic, purple glow" },
          { id: "fire", label: "Fire", promptValue: "fire magic, flames" },
          { id: "ice", label: "Ice", promptValue: "ice magic, frost" },
          { id: "lightning", label: "Lightning", promptValue: "lightning magic, sparks" },
          { id: "holy", label: "Holy", promptValue: "holy magic, golden light" },
          { id: "shadow", label: "Shadow", promptValue: "shadow magic, dark aura" },
          { id: "nature", label: "Nature", promptValue: "nature magic, green glow" },
        ],
      },
    ],
  },

  GUNS: {
    categories: [
      {
        id: "type",
        label: "Gun Type",
        required: true,
        options: [
          { id: "pistol", label: "Pistol", promptValue: "pistol, compact handgun" },
          { id: "revolver", label: "Revolver", promptValue: "revolver, rotating cylinder" },
          { id: "rifle", label: "Rifle", promptValue: "rifle, long barrel" },
          { id: "shotgun", label: "Shotgun", promptValue: "shotgun, wide barrel" },
          { id: "sniper", label: "Sniper", promptValue: "sniper rifle, scope attached" },
          { id: "smg", label: "SMG", promptValue: "submachine gun, compact automatic" },
        ],
      },
      {
        id: "style",
        label: "Style",
        options: [
          { id: "modern", label: "Modern", promptValue: "modern military design" },
          { id: "steampunk", label: "Steampunk", promptValue: "steampunk brass and gears" },
          { id: "scifi", label: "Sci-Fi", promptValue: "futuristic sci-fi design" },
          { id: "western", label: "Western", promptValue: "old west style" },
          { id: "ornate", label: "Ornate", promptValue: "ornate decorated engraved" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "chrome", label: "Chrome", promptValue: "chrome plated" },
          { id: "gold", label: "Gold", promptValue: "gold plated" },
          { id: "wood", label: "Wood Grip", promptValue: "wooden grip" },
        ],
      },
    ],
  },

  POLEARMS: {
    categories: [
      {
        id: "type",
        label: "Polearm Type",
        required: true,
        options: [
          { id: "spear", label: "Spear", promptValue: "spear, pointed metal tip" },
          { id: "halberd", label: "Halberd", promptValue: "halberd, axe blade and spike" },
          { id: "pike", label: "Pike", promptValue: "pike, long infantry spear" },
          { id: "glaive", label: "Glaive", promptValue: "glaive, curved blade on pole" },
          { id: "trident", label: "Trident", promptValue: "trident, three-pronged spear" },
          { id: "lance", label: "Lance", promptValue: "lance, cavalry weapon" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel Tip", promptValue: "steel tip" },
          { id: "bronze", label: "Bronze", promptValue: "bronze tip" },
          { id: "obsidian", label: "Obsidian", promptValue: "obsidian tip" },
        ],
      },
      {
        id: "shaft",
        label: "Shaft",
        options: [
          { id: "wood", label: "Wooden", promptValue: "wooden shaft" },
          { id: "metal", label: "Metal", promptValue: "metal shaft" },
          { id: "bamboo", label: "Bamboo", promptValue: "bamboo shaft" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "fire", label: "Fire", promptValue: "flaming tip" },
          { id: "lightning", label: "Lightning", promptValue: "electric charge" },
          { id: "poison", label: "Poison", promptValue: "poison dripping" },
        ],
      },
    ],
  },

  THROWING: {
    categories: [
      {
        id: "type",
        label: "Throwing Type",
        required: true,
        options: [
          { id: "shuriken", label: "Shuriken", promptValue: "shuriken, metal throwing star" },
          { id: "kunai", label: "Kunai", promptValue: "kunai, throwing knife with ring" },
          { id: "knife", label: "Throwing Knife", promptValue: "throwing knife, balanced blade" },
          { id: "dart", label: "Dart", promptValue: "throwing dart, pointed tip" },
          { id: "chakram", label: "Chakram", promptValue: "chakram, circular throwing ring" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "iron", label: "Iron", promptValue: "dark iron" },
          { id: "obsidian", label: "Obsidian", promptValue: "obsidian black" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "poison", label: "Poison", promptValue: "poison coated" },
          { id: "fire", label: "Fire", promptValue: "fire enchanted" },
          { id: "shadow", label: "Shadow", promptValue: "shadow infused" },
        ],
      },
    ],
  },
};

// ===========================================
// ARMOR BUILDER OPTIONS
// ===========================================
export const ARMOR_BUILDER: Record<string, SubcategoryBuilder> = {
  HELMETS: {
    categories: [
      {
        id: "type",
        label: "Helmet Type",
        required: true,
        options: [
          { id: "knight", label: "Knight Helm", promptValue: "knight helmet, full enclosed helm" },
          { id: "viking", label: "Viking", promptValue: "viking helmet, nose guard" },
          { id: "spartan", label: "Spartan", promptValue: "spartan helmet, tall crest" },
          { id: "samurai", label: "Samurai", promptValue: "samurai kabuto, neck guard" },
          { id: "crown", label: "Crown", promptValue: "royal crown, gems" },
          { id: "hood", label: "Hood", promptValue: "leather hood, rogue style" },
          { id: "circlet", label: "Circlet", promptValue: "metal circlet, headband" },
          { id: "wizard", label: "Wizard Hat", promptValue: "wizard hat, pointed" },
        ],
      },
      {
        id: "style",
        label: "Style",
        options: [
          { id: "warrior", label: "Warrior", promptValue: "battle-worn warrior style" },
          { id: "royal", label: "Royal", promptValue: "royal ornate decorated" },
          { id: "dark", label: "Dark", promptValue: "dark menacing style" },
          { id: "elegant", label: "Elegant", promptValue: "elegant refined style" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "iron", label: "Iron", promptValue: "dark iron" },
          { id: "gold", label: "Gold", promptValue: "golden" },
          { id: "leather", label: "Leather", promptValue: "leather" },
          { id: "bone", label: "Bone", promptValue: "bone" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "glow", label: "Glowing", promptValue: "magical glow" },
          { id: "fire", label: "Fire", promptValue: "flame effects" },
          { id: "holy", label: "Holy", promptValue: "holy light aura" },
        ],
      },
    ],
  },

  CHEST_ARMOR: {
    categories: [
      {
        id: "type",
        label: "Armor Type",
        required: true,
        options: [
          { id: "plate", label: "Plate Armor", promptValue: "plate armor breastplate, solid metal" },
          { id: "chainmail", label: "Chainmail", promptValue: "chainmail armor, interlocking rings" },
          { id: "leather", label: "Leather", promptValue: "leather armor, hardened leather" },
          { id: "scale", label: "Scale Mail", promptValue: "scale armor, overlapping scales" },
          { id: "robe", label: "Robe", promptValue: "magical robe, cloth garment" },
          { id: "brigandine", label: "Brigandine", promptValue: "brigandine, plates in cloth" },
        ],
      },
      {
        id: "style",
        label: "Style",
        options: [
          { id: "knight", label: "Knight", promptValue: "knightly medieval style" },
          { id: "rogue", label: "Rogue", promptValue: "rogue assassin style" },
          { id: "mage", label: "Mage", promptValue: "mage wizard style" },
          { id: "barbarian", label: "Barbarian", promptValue: "barbarian tribal style" },
          { id: "paladin", label: "Paladin", promptValue: "paladin holy warrior style" },
          { id: "dark", label: "Dark Knight", promptValue: "dark knight menacing style" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "polished steel" },
          { id: "iron", label: "Iron", promptValue: "dark iron" },
          { id: "gold", label: "Gold Trim", promptValue: "gold trimmed" },
          { id: "dragon", label: "Dragonscale", promptValue: "dragon scale material" },
          { id: "demon", label: "Demon", promptValue: "demonic corrupted material" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "glow", label: "Glowing Runes", promptValue: "glowing magical runes" },
          { id: "fire", label: "Fire", promptValue: "fire enchanted, ember glow" },
          { id: "ice", label: "Ice", promptValue: "frost enchanted, icy" },
          { id: "holy", label: "Holy", promptValue: "holy blessed, divine light" },
        ],
      },
    ],
  },

  SHIELDS: {
    categories: [
      {
        id: "type",
        label: "Shield Type",
        required: true,
        options: [
          { id: "round", label: "Round Shield", promptValue: "round shield, circular" },
          { id: "kite", label: "Kite Shield", promptValue: "kite shield, teardrop shape" },
          { id: "heater", label: "Heater Shield", promptValue: "heater shield, triangular" },
          { id: "tower", label: "Tower Shield", promptValue: "tower shield, large rectangular" },
          { id: "buckler", label: "Buckler", promptValue: "buckler, small round" },
        ],
      },
      {
        id: "emblem",
        label: "Emblem",
        options: [
          { id: "none", label: "Plain", promptValue: "plain surface" },
          { id: "lion", label: "Lion", promptValue: "lion emblem" },
          { id: "dragon", label: "Dragon", promptValue: "dragon emblem" },
          { id: "eagle", label: "Eagle", promptValue: "eagle emblem" },
          { id: "skull", label: "Skull", promptValue: "skull emblem" },
          { id: "cross", label: "Cross", promptValue: "holy cross emblem" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "wood", label: "Wood", promptValue: "wooden with metal rim" },
          { id: "gold", label: "Gold", promptValue: "gold plated" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "glow", label: "Glowing", promptValue: "magical glow" },
          { id: "fire", label: "Fire", promptValue: "flame enchanted" },
          { id: "holy", label: "Holy", promptValue: "holy protection aura" },
        ],
      },
    ],
  },

  GLOVES: {
    categories: [
      {
        id: "type",
        label: "Gloves Type",
        required: true,
        options: [
          { id: "gauntlet", label: "Gauntlets", promptValue: "metal gauntlets, armored" },
          { id: "leather", label: "Leather", promptValue: "leather gloves" },
          { id: "cloth", label: "Cloth", promptValue: "cloth gloves" },
          { id: "clawed", label: "Clawed", promptValue: "clawed gauntlets, sharp fingers" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "leather", label: "Leather", promptValue: "hardened leather" },
          { id: "gold", label: "Gold", promptValue: "gold trimmed" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "fire", label: "Fire", promptValue: "flame enchanted" },
          { id: "lightning", label: "Lightning", promptValue: "electric sparks" },
        ],
      },
    ],
  },

  BOOTS: {
    categories: [
      {
        id: "type",
        label: "Boots Type",
        required: true,
        options: [
          { id: "plate", label: "Plate Boots", promptValue: "metal sabatons, armored boots" },
          { id: "leather", label: "Leather", promptValue: "leather boots" },
          { id: "cloth", label: "Cloth", promptValue: "cloth boots, mage footwear" },
          { id: "fur", label: "Fur", promptValue: "fur-lined boots, barbarian style" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "steel", label: "Steel", promptValue: "steel metal" },
          { id: "leather", label: "Leather", promptValue: "hardened leather" },
          { id: "gold", label: "Gold Trim", promptValue: "gold trimmed" },
        ],
      },
      {
        id: "enchant",
        label: "Enchantment",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "speed", label: "Speed", promptValue: "speed enchanted, wind trails" },
          { id: "fire", label: "Fire", promptValue: "flame trails" },
        ],
      },
    ],
  },

  ACCESSORIES: {
    categories: [
      {
        id: "type",
        label: "Accessory Type",
        required: true,
        options: [
          { id: "ring", label: "Ring", promptValue: "ring, finger jewelry" },
          { id: "amulet", label: "Amulet", promptValue: "amulet, pendant necklace" },
          { id: "belt", label: "Belt", promptValue: "belt, waist accessory" },
          { id: "cape", label: "Cape", promptValue: "cape, flowing fabric" },
          { id: "bracelet", label: "Bracelet", promptValue: "bracelet, wrist band" },
          { id: "earring", label: "Earring", promptValue: "earring, ear jewelry" },
        ],
      },
      {
        id: "material",
        label: "Material",
        options: [
          { id: "gold", label: "Gold", promptValue: "golden" },
          { id: "silver", label: "Silver", promptValue: "silver" },
          { id: "bronze", label: "Bronze", promptValue: "bronze" },
          { id: "gem", label: "Gemstone", promptValue: "with gemstone" },
        ],
      },
      {
        id: "enchant",
        label: "Magic",
        options: [
          { id: "none", label: "None", promptValue: "" },
          { id: "glow", label: "Glowing", promptValue: "magical glowing" },
          { id: "fire", label: "Fire", promptValue: "fire enchanted" },
          { id: "holy", label: "Holy", promptValue: "holy blessed" },
          { id: "shadow", label: "Shadow", promptValue: "shadow infused" },
        ],
      },
    ],
  },
};

// ===========================================
// HELPER FUNCTION - Build prompt from selections
// ===========================================
// NOTE: This function returns ONLY the user's description
// Perspective, style, and isolation are added by prompt-builder.ts
export function buildPromptFromSelections(
  categoryId: string,
  subcategoryId: string,
  selections: Record<string, string> // { blade: "katana", handle: "leather", ... }
): string {
  const builder = categoryId === "WEAPONS"
    ? WEAPONS_BUILDER[subcategoryId]
    : categoryId === "ARMOR"
      ? ARMOR_BUILDER[subcategoryId]
      : null;

  if (!builder) return "";

  const promptParts: string[] = [];

  // Collect ONLY user selections - nothing else!
  // prompt-builder.ts will add: object type, perspective, style, isolation
  for (const category of builder.categories) {
    const selectedId = selections[category.id];
    if (selectedId) {
      const option = category.options.find(o => o.id === selectedId);
      if (option && option.promptValue) {
        promptParts.push(option.promptValue);
      }
    }
  }

  return promptParts.filter(p => p.length > 0).join(", ");
}

// ===========================================
// Get builder for category/subcategory
// ===========================================
export function getBuilder(categoryId: string, subcategoryId: string): SubcategoryBuilder | null {
  if (categoryId === "WEAPONS") {
    return WEAPONS_BUILDER[subcategoryId] || null;
  }
  if (categoryId === "ARMOR") {
    return ARMOR_BUILDER[subcategoryId] || null;
  }
  return null;
}

// ===========================================
// Check if builder is available
// ===========================================
export function hasBuilder(categoryId: string, subcategoryId: string): boolean {
  return getBuilder(categoryId, subcategoryId) !== null;
}
