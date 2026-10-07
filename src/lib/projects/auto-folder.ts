// =============================================================================
// Auto-filing: which project folder does a generated sprite belong in?
// =============================================================================
// Deterministic (instant, free): the sprite's asset type (category +
// subcategory) picks the folder family, then the prompt's wording decides
// between folders of the same type — "goblin" → Enemies, "dragon" → Bosses,
// "merchant" → NPCs. When nothing fits, a folder named after the asset type is
// created so the next sprite of that type lands next to it.
// =============================================================================

import { ALL_CATEGORIES } from "@/config/categories/all-categories";

export interface FolderLite {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description?: string | null;
  suggestedAssets?: string | null;
  sortOrder: number;
}

export interface SpriteLite {
  categoryId: string | null;
  subcategoryId: string | null;
  prompt: string;
}

export type FolderPick =
  | { kind: "existing"; folder: FolderLite }
  | { kind: "create"; name: string; category: string; subcategory: string | null };

/** Character roles told apart by wording, strongest first. */
const ROLE_WORDS: [string, RegExp][] = [
  ["BOSSES", /\b(boss|dragon|lich|overlord|titan|giant|demon lord|warlord|king|queen|tyrant|colossus|hydra|kraken)\b/],
  ["NPCS", /\b(npc|merchant|shopkeeper|villager|blacksmith|innkeeper|trader|vendor|farmer|priest|quest giver|townsfolk|guard)\b/],
  ["ENEMIES", /\b(enemy|enemies|goblin|orc|skeleton|zombie|undead|bandit|monster|slime|ghoul|imp|cultist|evil|hostile|minion|vampire|werewolf|spider|bat|rat|wolf|demon|ghost)\b/],
  ["HEROES", /\b(hero|heroine|player|protagonist|main character|playable|adventurer|knight|paladin|ranger|mage|wizard|warrior|rogue)\b/],
];

/** Creatures share folders with characters when there is no creature folder. */
const RELATED: Record<string, string[]> = {
  CREATURES: ["CHARACTERS"],
  CHARACTERS: ["CREATURES"],
  TILESETS: ["ENVIRONMENT", "ISOMETRIC"],
  ISOMETRIC: ["ENVIRONMENT", "TILESETS"],
  ENVIRONMENT: ["TILESETS", "ISOMETRIC"],
  PROJECTILES: ["EFFECTS", "WEAPONS"],
  EFFECTS: ["PROJECTILES"],
  QUEST_ITEMS: ["RESOURCES", "CONSUMABLES"],
  RESOURCES: ["QUEST_ITEMS"],
};

export function pickFolder(sprite: SpriteLite, folders: FolderLite[], hintFolderId?: string | null): FolderPick {
  const cat = (sprite.categoryId ?? "").toUpperCase();
  const rawSub = (sprite.subcategoryId ?? "").toUpperCase();
  const sub = rawSub === "ANIMATION" ? "" : rawSub;
  const text = sprite.prompt.replace(/^\[[^\]]*\]\s*/, "").toLowerCase();
  const role = (cat === "CHARACTERS" || cat === "CREATURES") ? ROLE_WORDS.find(([, re]) => re.test(text))?.[0] ?? null : null;
  const words = tokens(text);

  let best: { folder: FolderLite; score: number } | null = null;
  for (const f of folders) {
    const fCat = f.category?.toUpperCase() ?? "";
    const fSub = f.subcategory?.toUpperCase() ?? "";
    let score: number;
    if (fCat === cat) score = 60;
    else if (RELATED[cat]?.includes(fCat)) score = 30;
    else continue;

    if (sub && fSub === sub) score += 30;
    if (role && fSub === role) score += 45;
    // A creature in a characters folder only makes sense as an enemy/boss
    if (cat === "CREATURES" && fCat === "CHARACTERS" && fSub !== "ENEMIES" && fSub !== "BOSSES") score -= 25;

    const folderWords = tokens([f.name, f.description ?? "", parseSuggested(f.suggestedAssets)].join(" "));
    let overlap = 0;
    for (const w of words) if (folderWords.has(w)) overlap += 6;
    score += Math.min(overlap, 30);

    if (hintFolderId && f.id === hintFolderId) score += 25;

    if (!best || score > best.score || (score === best.score && f.sortOrder < best.folder.sortOrder)) {
      best = { folder: f, score };
    }
  }

  if (best && best.score >= 55) return { kind: "existing", folder: best.folder };

  // Nothing fits: a folder for this asset type (or role, for characters)
  const category = ALL_CATEGORIES.find((c) => c.id === cat);
  if (!category) return best ? { kind: "existing", folder: best.folder } : { kind: "create", name: "Unsorted", category: cat || "OTHER", subcategory: null };
  const roleSub = role ?? (cat === "CHARACTERS" ? sub || null : null);
  const roleName = roleSub ? category.subcategories.find((s) => s.id === roleSub)?.name : undefined;
  if (cat === "CHARACTERS" && roleName) return { kind: "create", name: roleName, category: cat, subcategory: roleSub };
  if (cat === "CREATURES" && role && (role === "ENEMIES" || role === "BOSSES")) {
    return { kind: "create", name: role === "BOSSES" ? "Bosses" : "Enemies", category: "CHARACTERS", subcategory: role };
  }
  return { kind: "create", name: category.name, category: cat, subcategory: null };
}

function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || STOP.has(raw)) continue;
    out.add(raw.replace(/(ies)$/, "y").replace(/(es|s)$/, ""));
  }
  return out;
}

function parseSuggested(json: string | null | undefined): string {
  if (!json) return "";
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.filter((x) => typeof x === "string").join(" ") : "";
  } catch {
    return "";
  }
}

const STOP = new Set([
  "the", "and", "with", "for", "pixel", "art", "sprite", "game", "style", "asset", "view", "side", "front", "top", "down",
  "glowing", "small", "large", "big", "detailed", "simple", "cute", "dark", "light", "new", "main", "basic", "item", "items",
]);
