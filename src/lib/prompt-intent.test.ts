import { describe, expect, it } from "vitest";
import { detectIntent, SUB_TO_GROUP } from "./prompt-intent";
import { cleanUserPrompt } from "./prompt-clean";
import { GENERATE_CATEGORIES, SUBTYPE_PLACEHOLDERS } from "@/data/generate-categories";
import { ALL_GENERATE_STYLE_IDS } from "@/data/generate-styles";

const type = (p: string, currentStyleId?: string) => {
  const r = detectIntent(p, { currentStyleId });
  return `${r.categoryId}/${r.subcategoryId}`;
};

describe("detectIntent — asset type", () => {
  it("owner's example: top-down main character from a survival game", () => {
    const r = detectIntent("top-down main character from survival game");
    expect(r.categoryId).toBe("CHARACTERS");
    expect(r.subcategoryId).toBe("HEROES");
    expect(r.view).toBe("topdown");
    expect(r.reasons.category).toBe("main character");
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it("a weapon described with its owner stays a weapon", () => {
    expect(type("warrior's sword with gold hilt")).toBe("WEAPONS/SWORDS");
    expect(type("knight’s shield with a lion crest")).toBe("ARMOR/SHIELDS");
    expect(type("sword wielded by an ancient king")).toBe("WEAPONS/SWORDS");
  });

  it("a character holding a weapon is a character", () => {
    expect(type("goblin merchant with a backpack")).toBe("CHARACTERS/NPCS");
    expect(type("knight holding a huge sword")).toBe("CHARACTERS/HEROES");
    expect(type("orc warrior with a battle axe")).toBe("CHARACTERS/ENEMIES");
    expect(type("necromancer final boss with a staff")).toBe("CHARACTERS/BOSSES");
  });

  it("icons: the head noun wins over the item it shows", () => {
    expect(type("health potion icon")).toBe("UI_ELEMENTS/ITEM_ICONS");
    expect(type("fireball spell icon, orange flames")).toBe("UI_ELEMENTS/SKILL_ICONS");
    expect(type("poison debuff icon")).toBe("UI_ELEMENTS/STATUS_ICONS");
    expect(type("settings gear icon")).toBe("UI_ELEMENTS/ICONS_UI");
    expect(type("health potion")).toBe("CONSUMABLES/POTIONS");
  });

  it("creatures, pets and monsters", () => {
    expect(type("giant spider with glowing eyes")).toBe("CREATURES/ANIMALS");
    expect(type("fire-breathing baby dragon")).toBe("CREATURES/PETS");
    expect(type("scary swamp monster")).toBe("CREATURES/MYTHICAL");
    expect(type("wolf creature with two heads")).toBe("CREATURES/ANIMALS");
    expect(type("dragon boss")).toBe("CHARACTERS/BOSSES");
  });

  it("environment, tiles and loot", () => {
    expect(type("small wooden house with a red roof")).toBe("ENVIRONMENT/BUILDINGS");
    expect(type("seamless grass floor tile")).toBe("ENVIRONMENT/GROUND");
    expect(type("mossy stone wall tile")).toBe("ENVIRONMENT/WALLS");
    expect(type("potion shop")).toBe("ENVIRONMENT/BUILDINGS");
    expect(type("treasure chest overflowing with gold")).toBe("QUEST_ITEMS/CONTAINERS");
    expect(type("dragon scale chestplate")).toBe("ARMOR/CHEST_ARMOR");
    expect(type("pile of gold coins")).toBe("QUEST_ITEMS/COLLECTIBLES");
  });

  it("Polish prompts (head noun first)", () => {
    expect(type("miecz rycerza z rubinem")).toBe("WEAPONS/SWORDS");
    expect(type("rycerz z mieczem")).toBe("CHARACTERS/HEROES");
    expect(type("mikstura zdrowia")).toBe("CONSUMABLES/POTIONS");
    expect(type("drewniany domek w lesie")).toBe("ENVIRONMENT/BUILDINGS");
    const r = detectIntent("główna postać z gry survival, widok z góry");
    expect(`${r.categoryId}/${r.subcategoryId}`).toBe("CHARACTERS/HEROES");
    expect(r.view).toBe("topdown");
  });

  it("returns nothing for prompts without an asset noun", () => {
    const r = detectIntent("something cool and shiny");
    expect(r.categoryId).toBeNull();
    expect(r.confidence).toBe(0);
    expect(detectIntent("ab").categoryId).toBeNull();
  });

  it("every placeholder example maps to its own type", () => {
    for (const [sub, placeholder] of Object.entries(SUBTYPE_PLACEHOLDERS)) {
      expect(`${placeholder} → ${detectIntent(placeholder).subcategoryId}`).toBe(`${placeholder} → ${sub}`);
    }
  });

  it("'Surprise me' ideas map to the group they were written for", () => {
    const surprise: Record<string, string[]> = {
      WEAPONS: ["frost greatsword with glowing blue runes", "ancient bronze axe with a leather grip", "elven longbow carved from silver wood", "rusty pirate cutlass", "staff topped with a floating purple crystal"],
      ARMOR: ["golden viking helmet with horns", "dragon scale chestplate", "round wooden shield with an iron rim", "enchanted leather boots with wings"],
      CONSUMABLES: ["red health potion in a round flask", "glowing blue mana elixir", "roasted chicken leg", "ancient scroll tied with a red ribbon"],
      CHARACTERS: ["dwarf blacksmith with a big hammer", "elf ranger with a green hood", "knight in silver armor with a red cape", "witch with a crooked hat and a broom"],
      CREATURES: ["green slime with big eyes", "fire-breathing baby dragon", "giant spider with glowing eyes"],
    };
    for (const [group, prompts] of Object.entries(surprise)) {
      for (const p of prompts) expect(`${p} → ${detectIntent(p).categoryId}`).toBe(`${p} → ${group}`);
    }
  });
});

describe("detectIntent — style, view, palette, pose", () => {
  it("pixel art resolutions", () => {
    expect(detectIntent("32-bit pixel art knight").styleId).toBe("PIXEL_ART_32");
    expect(detectIntent("16 bit snes style slime").styleId).toBe("PIXEL_ART_16");
    expect(detectIntent("8-bit coin").styleId).toBe("PIXEL_ART_16");
    // Plain "pixel art" keeps the pixel style already picked
    expect(detectIntent("pixel art knight", { currentStyleId: "PIXEL_ART_32" }).styleId).toBe("PIXEL_ART_32");
    expect(detectIntent("pixel art knight", { currentStyleId: "ANIME_GAME" }).styleId).toBe("PIXEL_ART_16");
  });

  it("isometric picks the variant that fits", () => {
    expect(detectIntent("isometric pixel art house").styleId).toBe("ISOMETRIC_PIXEL");
    expect(detectIntent("isometric cartoon tavern").styleId).toBe("ISOMETRIC_CARTOON");
    expect(detectIntent("isometric tavern", { currentStyleId: "PIXEL_ART_16" }).styleId).toBe("ISOMETRIC_PIXEL");
    expect(detectIntent("isometric tavern", { currentStyleId: "REALISTIC_PAINTED" }).styleId).toBe("ISOMETRIC");
  });

  it("named styles", () => {
    expect(detectIntent("chibi cat girl").styleId).toBe("CHIBI_CUTE");
    expect(detectIntent("anime swordswoman").styleId).toBe("ANIME_GAME");
    expect(detectIntent("hand-painted ancient oak tree").styleId).toBe("HAND_PAINTED");
    expect(detectIntent("dark fantasy knight").styleId).toBe("DARK_SOULS");
    expect(detectIntent("cartoon pirate").styleId).toBe("CARTOON_WESTERN");
    expect(detectIntent("flat vector coin icon").styleId).toBe("VECTOR_CLEAN");
    expect(detectIntent("realistic steel helmet").styleId).toBe("REALISTIC_PAINTED");
    expect(detectIntent("iron sword with red gem").styleId).toBeNull();
  });

  it("camera view", () => {
    expect(detectIntent("knight, side view").view).toBe("side");
    expect(detectIntent("platformer hero").view).toBe("side");
    expect(detectIntent("bird's eye view of a tavern").view).toBe("topdown");
    expect(detectIntent("front-facing robot").view).toBe("front");
    expect(detectIntent("rycerz z boku").view).toBe("side");
    expect(detectIntent("knight with a sword").view).toBeNull();
  });

  it("palette and pose", () => {
    expect(detectIntent("neon cyberpunk hacker").palette).toBe("NEON_CYBER");
    expect(detectIntent("game boy style slime").palette).toBe("RETRO_GAMEBOY");
    expect(detectIntent("black and white ghost").palette).toBe("MONO_BW");
    expect(detectIntent("pastel bunny").palette).toBe("PASTEL_DREAM");
    expect(detectIntent("red dragon").palette).toBeNull();
    expect(detectIntent("knight in a dynamic pose").pose).toBe("dynamic");
    expect(detectIntent("ninja attacking with a katana").pose).toBe("dynamic");
    expect(detectIntent("robot in t-pose").pose).toBe("t-pose");
  });
});

describe("detectIntent — consistency", () => {
  const PROMPTS = [
    "top-down main character from survival game", "warrior's sword with gold hilt", "goblin merchant with a backpack",
    "health potion icon", "isometric pixel art house", "32-bit pixel art knight", "neon cyberpunk hacker",
    "seamless grass floor tile", "fire-breathing baby dragon", "treasure chest overflowing with gold",
    "dragon boss", "settings gear icon", "mossy stone wall tile", "chibi cat girl",
    ...Object.values(SUBTYPE_PLACEHOLDERS),
  ];

  it("only returns options that exist in the Generate panel", () => {
    const pairs = new Set(GENERATE_CATEGORIES.flatMap((c) => c.subcategories.map((s) => `${c.id}/${s.subcategoryId}`)));
    for (const p of PROMPTS) {
      const r = detectIntent(p);
      if (r.categoryId) expect(pairs.has(`${r.categoryId}/${r.subcategoryId}`)).toBe(true);
      if (r.styleId) expect((ALL_GENERATE_STYLE_IDS as readonly string[]).includes(r.styleId)).toBe(true);
    }
  });

  it("SUB_TO_GROUP mirrors GENERATE_CATEGORIES", () => {
    const expected = Object.fromEntries(GENERATE_CATEGORIES.flatMap((c) => c.subcategories.map((s) => [s.subcategoryId, c.id])));
    expect(SUB_TO_GROUP).toEqual(expected);
  });

  it("agrees with the server-side reroute (prompt-clean) on the asset group", () => {
    const prompts = [
      "a goblin merchant with a big backpack", "small wooden house with a red roof", "warrior's sword with gold hilt",
      "top-down main character from survival game", "health potion icon", "old wizard with a long beard",
      "stone castle tower", "iron helmet", "knight with a sword",
    ];
    for (const p of prompts) {
      const server = cleanUserPrompt(p, "WEAPONS").category;
      const client = detectIntent(p);
      // Whenever the server would reroute, the client already picked the same group
      if (server) expect(`${p} → ${client.categoryId}`).toBe(`${p} → ${server.categoryId}`);
    }
  });
});
