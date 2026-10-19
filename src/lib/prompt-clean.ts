// =============================================================================
// User prompt clean-up — fixes the most common mistakes seen in real prompts
// (audit of generations, Oct 2026):
//   • the example text was left in ("e.g. iron sword with red gem in the hilt")
//   • the asset type was left on the default (Weapons) while describing a
//     character, a house or an icon → the sprite got framed as a weapon
//   • prompts written for chat image models ("Create a 2D …", "on a grey
//     checkerboard background", "128x128", "sprite sheet with 8 frames")
//     that fight our own instructions and produce several figures
// =============================================================================

import { detectIntent } from "@/lib/prompt-intent";
import { GENERATE_CATEGORIES } from "@/data/generate-categories";

export interface CleanPrompt {
  prompt: string;
  /** Category to use instead of the selected one, when the prompt clearly says otherwise. */
  category: { categoryId: string; subcategoryId: string } | null;
  /** The user asked for several frames / a sheet — generate one sprite, point to Animate. */
  wantsSheet: boolean;
}

const ITEM_CATEGORIES = new Set(["WEAPONS", "ARMOR", "CONSUMABLES", "RESOURCES", "QUEST_ITEMS"]);

const CHARACTER = /\b(character|man|woman|girl|boy|guy|lady|hero|heroine|warrior|knight|soldier|hunter|wizard|witch|mage|sorcerer|ninja|samurai|pirate|princess|prince|king|queen|villager|merchant|npc|player|elf|dwarf|orc|goblin|zombie|vampire|demon|boss|monster|creature|dragon|beast|alien|robot|diver|archer|assassin|thief|priest|monk|cowboy|astronaut)s?\b/i;
const BUILDING = /\b(house|houses|building|buildings|town|village|city|castle|tower|temple|church|shop|tavern|hut|cabin|map|level)\b/i;
const UI = /\b(icon|button|ui|hud|menu|logo|badge|health bar|inventory slot)\b/i;
const ITEM_NOUN = /\b(sword|blade|dagger|katana|axe|hammer|mace|spear|trident|bow|crossbow|staff|wand|gun|pistol|rifle|shield|helmet|armor|armour|potion|flask|scroll|gem|ore|coin|key|chest|ring|amulet|drill|tool|knife|knives|club|whip|scythe|throne|weapon|glock)s?\b/i;

/** First ~8 words: what the prompt is mainly about. */
const lead = (p: string) => p.split(/\s+/).slice(0, 8).join(" ");

export function cleanUserPrompt(raw: string, categoryId: string): CleanPrompt {
  let p = raw.trim();

  // Leftover example text from the input placeholder
  p = p.replace(/^e\.g\.?\s*/i, "");

  const wantsSheet = /\b(sprite ?sheet|spritesheet|\d+\s+(sequential\s+)?frames|animation frames|multiple frames|various poses|turnaround)\b/i.test(p);

  // Chat-model boilerplate that conflicts with our own framing
  p = p
    .replace(/^["'\s]*(please\s+)?(create|make|generate|draw|design)\s+(me\s+)?(a|an|one)?\s*/i, "")
    .replace(/\b(highly\s+)?detailed\s+/gi, "")
    .replace(/\b(2d|16[- ]bit|32[- ]bit|pixel[- ]art|pixelart)\s+/gi, "")
    .replace(/\b(one\s+single|exactly\s+one|single)\s+\d+\s*[x×]\s*\d+\s*(pixel|px)?\s*/gi, "")
    .replace(/\b\d+\s*[x×]\s*\d+\s*(pixels?|px)?\b/gi, "")
    .replace(/\b(on|over|with)\s+(a\s+)?(gr[ae]y|white|black|transparent|checker(ed|board)?)\s+(checker(ed|board)?\s+)?background\b/gi, "")
    .replace(/\b(transparent|checkerboard)\s+background\b/gi, "")
    .replace(/\bgame asset,?\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s,.:;-]+|[\s,;-]+$/g, "")
    .trim();
  // Asking for a sheet in the sprite prompt makes the model draw several tiny
  // copies: generate one clean sprite, the page then offers Animate for frames
  if (wantsSheet) {
    p = p
      .replace(/\b(an?\s+)?(animated\s+)?(polished\s+)?(sprite ?sheets?|spritesheets?)(\s+(of|for|with))?\s*/gi, "")
      .replace(/\b\d+\s*(sequential\s+)?(animation\s+)?frames?(\s+(of|for|with))?\s*/gi, "")
      .replace(/\b(animation frames|multiple frames|various poses|frame[- ]by[- ]frame( animation)?|animated gif|turnaround)\b[,.]?\s*/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s,.:;-]+|[\s,;-]+$/g, "")
      .trim();
  }
  if (p.length < 3) p = raw.trim();

  // Asset type: only move away from an item category, and only when the
  // opening words clearly describe something else (a "warrior's sword" stays)
  let category: CleanPrompt["category"] = null;
  const head = lead(p);
  if (ITEM_CATEGORIES.has(categoryId.toUpperCase()) && !ITEM_NOUN.test(head)) {
    if (BUILDING.test(head)) category = { categoryId: "ENVIRONMENT", subcategoryId: "BUILDINGS" };
    else if (UI.test(head)) category = { categoryId: "UI_ELEMENTS", subcategoryId: "ITEM_ICONS" };
    else if (CHARACTER.test(head)) category = { categoryId: "CHARACTERS", subcategoryId: "HEROES" };
    // The word lists above miss plenty ("young male doctor", "a nurse"): ask the
    // same detector the Generate panel's Auto uses, and trust it when it is sure
    else category = detectedNonItem(p);
  }

  return { prompt: p, category, wantsSheet };
}

/** A confident non-item asset type from the prompt (character, creature, building, UI), else null. */
function detectedNonItem(prompt: string): CleanPrompt["category"] {
  const intent = detectIntent(prompt);
  if (!intent.categoryId || intent.confidence < 0.6) return null;
  const group = GENERATE_CATEGORIES.find((c) => c.id === intent.categoryId);
  const sub = group?.subcategories.find((x) => x.subcategoryId === intent.subcategoryId);
  if (!sub || ITEM_CATEGORIES.has(sub.categoryId.toUpperCase())) return null;
  return { categoryId: sub.categoryId, subcategoryId: sub.subcategoryId };
}
