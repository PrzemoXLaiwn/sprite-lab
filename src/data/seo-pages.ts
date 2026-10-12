// Public SEO landing pages — single list used by the sitemap, robots.txt,
// llms.txt and the footer, so a new page is never left out of one of them.

export interface SeoPage {
  slug: string;
  /** Short link text (footer, llms.txt). */
  label: string;
  /** One-line summary for llms.txt. */
  summary: string;
}

export const SEO_PAGES: SeoPage[] = [
  { slug: "ai-sprite-generator", label: "AI Sprite Generator", summary: "Generate game-ready 2D sprites from a text prompt: characters, creatures, weapons, items and props as transparent PNGs." },
  { slug: "pixel-art-generator", label: "AI Pixel Art Generator", summary: "Pixel art sprites on a real pixel grid with a limited palette, in 16-bit, HD and isometric pixel styles." },
  { slug: "ai-sprite-animation-generator", label: "AI Sprite Animation & Sprite Sheets", summary: "Animate any sprite — idle, walk, run, attack, jump, cast or a custom motion — and export a sprite sheet and GIF." },
  { slug: "rpg-character-creator", label: "RPG Character Creator", summary: "Heroes, enemies, NPCs and bosses for RPGs, roguelikes and dungeon crawlers." },
  { slug: "game-weapon-generator", label: "Game Weapon Generator", summary: "Swords, axes, bows, staffs, guns and shields as game-ready sprites." },
  { slug: "ai-tileset-generator", label: "AI Tile Generator", summary: "Seamless floor and wall tiles that repeat without visible seams, plus animated water and lava tiles." },
  { slug: "ai-game-icon-generator", label: "AI Game Icon Generator", summary: "Item, skill and status icons for inventories, hotbars and HUDs." },
  { slug: "unity-sprite-generator", label: "AI Sprites for Unity", summary: "Generate sprites and sprite sheets and import them into Unity 2D, with step-by-step slicing instructions." },
  { slug: "godot-sprite-generator", label: "AI Sprites for Godot", summary: "Generate sprites and sprite sheets and use them in Godot 4 with Sprite2D and AnimatedSprite2D." },
];
