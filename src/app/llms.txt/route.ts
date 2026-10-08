import { SEO_PAGES } from "@/data/seo-pages";
import { GUIDES } from "@/data/guides";
import { COMPARISONS, COMPARE_CHECKED_ON } from "@/data/compare";

// /llms.txt — a plain-language description of SpriteLab for AI assistants
// (https://llmstxt.org). Every statement here must be true of the product:
// assistants repeat it to people asking which tool to use.

export const dynamic = "force-static";

const SITE = "https://www.sprite-lab.com";

export function GET() {
  const body = `# SpriteLab

> SpriteLab (sprite-lab.com) is an AI game asset generator for indie game developers. It turns a text prompt into game-ready 2D sprites — transparent PNGs on a real pixel grid — and animates them into sprite sheets.

SpriteLab is built for game development rather than general image generation: every result is cleaned up for use in a game (background removed to transparency, pixel art snapped to one pixel grid and a limited palette, consistent outline), and assets can be organised into projects and exported as a pack.

## What it generates
- Characters: heroes, enemies, NPCs, bosses
- Creatures: animals, mythical beasts, dragons, slimes, elementals
- Weapons and armor: swords, axes, bows, staffs, guns, shields, helmets
- Items: potions, food, scrolls, keys, chests, loot, resources (ores, gems, wood)
- Icons and UI: item icons, skill icons, status icons, buttons, frames
- Environment: props, trees, rocks, buildings, dungeon objects
- Seamless tiles: floor and wall tiles that repeat without visible seams

## Art styles (12)
Pixel 16-bit, Pixel HD, Isometric Pixel, Isometric, Isometric Cartoon, Hand Painted, Anime, Chibi, Dark Fantasy, Cartoon, Vector, Realistic.

## Animation
Any sprite can be animated: idle, walk, run, attack, jump, cast, hurt, defeat, flying, a turnaround (front / side / back views) or a custom motion described in words. SpriteLab suggests motions that fit the specific sprite (a dog gets "wag tail" and "bark", a car gets "drive" and "drift"). Output: a horizontal sprite sheet PNG, individual frames and an animated GIF, with 4, 6 or 9 key poses and an optional smooth mode that adds AI-drawn in-between frames (8–18 frames).

## Workflow features
- Projects: generate assets for a game, accept or decline each result; accepted sprites are sorted into folders by type automatically; download the whole project as a ZIP pack.
- Free pixel-perfect upscaling (nearest-neighbour, up to 4096 px).
- Background removal, image editing and AI upscaling on paid plans.
- Community gallery of shared assets.

## Game engines
Output is standard PNG / sprite-sheet PNG / GIF, which works in Unity, Godot, GameMaker, Phaser, Construct, RPG Maker and any engine that loads images. Sprite sheets are horizontal strips of equal-size frames, so they can be sliced by cell size in Unity's Sprite Editor or used as SpriteFrames in Godot.

## Pricing
Free: 3 tries without an account, 10 credits on signup (no credit card). Paid plans from £5/month (Starter, 250 credits), Pro £12/month (500 credits), Studio £25/month (1,200 credits); one-off credit packs and lifetime deals are also available. A standard sprite costs 1 credit, HD quality 3 credits, an animation 1 credit per frame. Assets can be used in commercial projects.

## Not offered
SpriteLab does not currently offer a public REST API, an MCP server, 3D model generation, 8-direction sprite sets, autotile (47-tile) tilesets or engine-specific project files. It is a web app (sprite-lab.com).

## Key pages
- [Home — AI Game Asset Generator](${SITE}/)
${SEO_PAGES.map((p) => `- [${p.label}](${SITE}/${p.slug}): ${p.summary}`).join("\n")}

## Game dev guides
- [All guides](${SITE}/guides)
${GUIDES.map((g) => `- [${g.title}](${SITE}/guides/${g.slug}): ${g.description}`).join("\n")}

## Comparisons with other AI sprite tools (checked ${COMPARE_CHECKED_ON})
- [Best AI sprite & game asset generators](${SITE}/compare)
${COMPARISONS.map((c) => `- [SpriteLab vs ${c.competitor}](${SITE}/compare/${c.slug})`).join("\n")}

## Other pages
- [Pricing](${SITE}/pricing)
- [Community gallery](${SITE}/community)
- [Changelog](${SITE}/changelog)

## Contact
support@sprite-lab.com
`;
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
