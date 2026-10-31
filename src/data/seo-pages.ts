// Public SEO landing pages — single list used by the sitemap, robots.txt,
// llms.txt and the footer, so a new page is never left out of one of them.

export interface SeoPage {
  slug: string;
  /** Short link text (footer, llms.txt). */
  label: string;
  /** One-line summary for llms.txt and the homepage tools index. */
  summary: string;
  /**
   * false = noindex,follow and left out of the sitemap. Used for pages whose
   * content is covered in more depth by a guide (see docs/adsense-content-audit.md).
   */
  index?: boolean;
  /** ISO date of the last substantive edit. Used as sitemap lastmod. */
  updated: string;
  /** Other tool slugs linked from this page. */
  related: string[];
}

const UPDATED = "2026-10-30";

export const SEO_PAGES: SeoPage[] = [
  {
    slug: "ai-sprite-generator",
    label: "AI Sprite Generator",
    summary: "Generate game-ready 2D sprites from a text prompt: characters, creatures, weapons, items and props as transparent PNGs.",
    updated: UPDATED,
    related: ["sprite-sheet-generator", "pixel-art-generator", "game-character-generator", "2d-game-asset-generator"],
  },
  {
    slug: "pixel-art-generator",
    label: "AI Pixel Art Generator",
    summary: "Pixel art sprites on a real pixel grid with a limited palette, in 16-bit, HD and isometric pixel styles.",
    updated: UPDATED,
    related: ["ai-sprite-generator", "ai-tileset-generator", "top-down-sprite-generator", "sprite-sheet-generator"],
  },
  {
    slug: "sprite-sheet-generator",
    label: "Sprite Sheet Generator",
    summary: "Sprite sheets of equal-size frames on a transparent PNG, 4- and 8-direction sheets, a frames ZIP and engine packs for Godot, Unity and GameMaker.",
    updated: UPDATED,
    related: ["ai-sprite-animation-generator", "unity-sprite-generator", "godot-sprite-generator", "gamemaker-sprite-generator"],
  },
  {
    slug: "ai-sprite-animation-generator",
    label: "AI Sprite Animation",
    summary: "Animate any sprite — idle, walk, run, attack, jump, cast or a custom motion — and export a sprite sheet and GIF.",
    updated: UPDATED,
    related: ["walk-cycle-generator", "sprite-sheet-generator", "top-down-sprite-generator", "game-character-generator"],
  },
  {
    slug: "walk-cycle-generator",
    label: "Walk Cycle Generator",
    summary: "In-place side-view walk cycles and a 4-direction top-down walk sheet, equal frames on one ground line. Not an 8-direction walk.",
    updated: "2026-10-31",
    related: ["ai-sprite-animation-generator", "sprite-sheet-generator", "top-down-sprite-generator", "game-character-generator"],
  },
  {
    slug: "game-character-generator",
    label: "AI Character Sprite",
    summary: "AI character sprites for a 2D cast: one hero, enemies and NPCs that share a style, size and outline, ready to animate.",
    updated: UPDATED,
    related: ["walk-cycle-generator", "rpg-character-creator", "top-down-sprite-generator", "ai-sprite-animation-generator"],
  },
  {
    slug: "rpg-character-creator",
    label: "RPG Character Creator",
    summary: "Heroes, enemies, NPCs and bosses for RPGs, roguelikes and dungeon crawlers.",
    updated: UPDATED,
    related: ["game-character-generator", "top-down-sprite-generator", "game-weapon-generator", "ai-sprite-generator"],
  },
  {
    slug: "top-down-sprite-generator",
    label: "Top-Down Sprite Generator",
    summary: "Standing turnarounds and a 4-direction walk sheet for top-down and isometric RPGs, one ground line, left row mirrored from the right.",
    updated: UPDATED,
    related: ["rpg-character-creator", "sprite-sheet-generator", "ai-tileset-generator", "game-character-generator"],
  },
  {
    slug: "2d-game-asset-generator",
    label: "Game Asset Generator",
    summary: "The practical set a 2D game needs: characters, tiles, items, icons and animations, as files an engine imports.",
    updated: UPDATED,
    related: ["ai-sprite-generator", "ai-tileset-generator", "ai-game-icon-generator", "sprite-sheet-generator"],
  },
  {
    slug: "game-weapon-generator",
    label: "Game Weapon Generator",
    summary: "Swords, axes, bows, staffs, guns and shields as game-ready sprites.",
    updated: UPDATED,
    related: ["ai-game-icon-generator", "ai-sprite-generator", "rpg-character-creator", "pixel-art-generator"],
  },
  {
    slug: "ai-tileset-generator",
    label: "AI Tileset Generator",
    summary: "Tileset generator for seamless floor and wall tiles that repeat without visible seams, plus animated water and lava.",
    updated: UPDATED,
    related: ["pixel-art-generator", "top-down-sprite-generator", "2d-game-asset-generator", "ai-sprite-generator"],
  },
  {
    slug: "ai-game-icon-generator",
    label: "AI Game Icon Generator",
    summary: "Item, skill and status icons for inventories, hotbars and HUDs.",
    updated: UPDATED,
    related: ["game-weapon-generator", "2d-game-asset-generator", "pixel-art-generator", "ai-sprite-generator"],
  },
  {
    slug: "unity-sprite-generator",
    label: "AI Sprites for Unity",
    summary: "Generate sprites and sprite sheets and import them into Unity 2D, with step-by-step slicing instructions.",
    updated: UPDATED,
    related: ["sprite-sheet-generator", "godot-sprite-generator", "gamemaker-sprite-generator", "ai-sprite-animation-generator"],
  },
  {
    slug: "godot-sprite-generator",
    label: "AI Sprites for Godot",
    summary: "Generate sprites and sprite sheets and use them in Godot 4 with Sprite2D and AnimatedSprite2D.",
    updated: UPDATED,
    related: ["sprite-sheet-generator", "unity-sprite-generator", "gamemaker-sprite-generator", "ai-tileset-generator"],
  },
  {
    slug: "gamemaker-sprite-generator",
    label: "AI Sprites for GameMaker",
    summary: "Sprite strips named _stripN so GameMaker slices them on import, plus origins, masks and pixel-art settings.",
    updated: UPDATED,
    related: ["sprite-sheet-generator", "unity-sprite-generator", "godot-sprite-generator", "ai-sprite-animation-generator"],
  },
];

/** Landing pages that search engines should index (sitemap). */
export const INDEXED_SEO_PAGES = SEO_PAGES.filter((p) => p.index !== false);

/** Up to four sibling tools, in the order listed on the page. */
export function relatedSeoPages(slug: string): SeoPage[] {
  const page = SEO_PAGES.find((p) => p.slug === slug);
  const slugs = page?.related ?? [];
  const picked = slugs
    .map((s) => SEO_PAGES.find((p) => p.slug === s))
    .filter((p): p is SeoPage => p !== undefined && p.slug !== slug);
  if (picked.length > 0) return picked.slice(0, 4);
  return SEO_PAGES.filter((p) => p.slug !== slug).slice(0, 4);
}
