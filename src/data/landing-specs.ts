// =============================================================================
// Asset-specific game-dev notes for the indexed tool landing pages — the part
// of each page that is not shared with its siblings. Rendered by SeoLanding's
// "specs" section. Keep SpriteLab claims in line with geo-content.ts and the
// guides; anything the reader does in their engine is said as such.
// =============================================================================

import type { SeoSection } from "@/components/landing/SeoLanding";

type Specs = Extract<SeoSection, { kind: "specs" }>;

export const LANDING_SPECS: Record<string, Specs> = {
  "ai-sprite-generator": {
    kind: "specs",
    id: "game-ready-checklist",
    eyebrow: "before it goes in your game",
    title: "What makes a sprite game-ready",
    intro: "A picture becomes a usable sprite when it meets a few technical rules. Check these whatever tool you use.",
    rows: [
      { label: "Background", value: "Real alpha transparency — not white, and not a checkerboard painted into the pixels." },
      { label: "Canvas", value: "The whole figure inside the frame with a margin, so weapons and capes are not cut off." },
      { label: "View", value: "Side view for platformers, three-quarter top-down for RPGs, front view for portraits and menus." },
      { label: "Pixel density", value: "One density for every asset in the game; never shrink one sprite to fit next to others." },
      { label: "Origin", value: "Bottom centre for characters, so the feet sit on the ground in every animation." },
      { label: "SpriteLab output", value: "Transparent PNG; pixel styles snapped to a pixel grid with a limited palette and a consistent outline." },
    ],
    notes: [
      "The most common reason a generated image fails in a game is the view. A character drawn in a dramatic three-quarter pose looks great in a gallery and wrong on a side-scrolling level. Decide the camera of your game first and put it in the prompt: 'side view' for a platformer, 'top-down three-quarter view' for an RPG.",
      "The second is scale. Sprites made on their own each fill their canvas, so a mouse and a dragon come out the same height. Pick a reference character and size everything relative to it in your engine or pixel editor, scaling by whole numbers for pixel art.",
      "SpriteLab removes the background and, for pixel styles, snaps the result to a real grid, so the remaining work is mostly these design choices — view, size and origin — which only you can make for your game.",
    ],
    links: [
      { label: "Pixel art sprite sizes for games", href: "/guides/pixel-art-sprite-sizes-for-games" },
      { label: "How to keep AI game art consistent", href: "/guides/how-to-keep-ai-game-art-consistent" },
    ],
  },

  "pixel-art-generator": {
    kind: "specs",
    id: "pixel-specs",
    eyebrow: "pixel art numbers",
    title: "Sizes, palettes and scaling that work",
    intro: "The decisions that make pixel art look like pixel art once it is in an engine.",
    rows: [
      { label: "Sprite size", value: "16×16 retro, 32×32 the common middle, 64×64 and up for bosses and portraits." },
      { label: "Game resolution", value: "320×180 or 640×360 — both scale by whole numbers to 720p, 1080p and 4K." },
      { label: "Palette", value: "16–32 colours for the whole game, in ramps of 3–5 shades per material." },
      { label: "Outline", value: "1 px dark outline or selective outline — one rule for every sprite." },
      { label: "Scaling", value: "Whole numbers only (2×, 3×, 4×) with nearest-neighbour; never 2.5×." },
      { label: "Engine filter", value: "Godot: Nearest. Unity: Point (no filter), Compression None. GameMaker: interpolation off." },
    ],
    notes: [
      "Pixel art only stays crisp if every source pixel becomes the same square block on screen. That needs two things: a real grid in the image, and whole-number scaling in the engine. Many AI images labelled 'pixel art' fail the first test — zoom in and the blocks are uneven and blurred, with hundreds of near-identical colours.",
      "SpriteLab's Pixel 16-bit, Pixel HD and Isometric Pixel styles are snapped to one pixel grid with a limited palette after generation, and delivered pre-scaled by a whole number so they are easy to see. If your game uses smaller sprites, scale down by the block size with nearest-neighbour in a pixel editor, then index to your palette for an exact match.",
      "The second test is up to your project settings: render at a low internal resolution and scale the whole screen, not individual sprites.",
    ],
    links: [
      { label: "Pixel art sprite sizes: 16, 32 or 64?", href: "/guides/pixel-art-sprite-sizes-for-games" },
      { label: "How to make pixel art sprites for games", href: "/guides/how-to-make-pixel-art-sprites-for-games" },
    ],
  },

  "ai-sprite-animation-generator": {
    kind: "specs",
    id: "animation-specs",
    eyebrow: "frames, fps and files",
    title: "What you get, and what you set in the engine",
    intro: "Typical frame counts for each motion, and exactly which files an animation downloads as.",
    rows: [
      { label: "Idle", value: "2–6 frames at 4–8 fps. SpriteLab's idle breathing is a 24-frame deformation of the original sprite (2 credits)." },
      { label: "Walk / run", value: "4–8 frames at 8–12 fps (walk) or 10–14 fps (run)." },
      { label: "Attack", value: "3–8 frames, timed unevenly: long wind-up, very short strike, held follow-through." },
      { label: "AI key poses", value: "4, 6 or 9 poses (6, 8 or 10 credits); smooth mode adds in-betweens for 8, 12 or 18 frames." },
      { label: "Downloads", value: "Horizontal sprite sheet PNG, every frame as its own PNG in a ZIP, and a GIF preview." },
      { label: "Engine pack", value: "Godot SpriteFrames .tres, Unity frame folders, GameMaker _stripN strips and per-frame hitboxes.json." },
    ],
    notes: [
      "Every frame in a SpriteLab sheet has the same size and the character stands on the same ground line, so engines can slice it by cell size and the pivot does not jitter. The engine pack goes a step further: Godot gets a SpriteFrames resource with fps and loop flags set, Unity gets one folder of numbered frames per animation, and GameMaker gets strips whose names tell it how many frames to cut.",
      "What stays with you is game feel. Exported frames are evenly timed; holding a wind-up frame longer, adding a few frames of hit-stop on impact, deciding which attack frames are active, and matching walk speed to movement speed all happen in your engine. The hitboxes in hitboxes.json are detected from the pixels — a useful first draft, not a balanced combat system.",
    ],
    links: [
      { label: "How many frames should a sprite animation have?", href: "/guides/how-many-frames-per-sprite-animation" },
      { label: "Hitboxes and hurtboxes from sprite sheets", href: "/guides/hitboxes-and-hurtboxes-from-sprite-sheets" },
      { label: "How to import sprite strips into GameMaker", href: "/guides/how-to-import-sprite-strips-into-gamemaker" },
    ],
  },

  "rpg-character-creator": {
    kind: "specs",
    id: "rpg-specs",
    eyebrow: "top-down rpg setup",
    title: "Character specs for a top-down RPG",
    intro: "The numbers and conventions behind a character that walks around a tile map without glitches.",
    rows: [
      { label: "Canvas", value: "16×24 or 16×32 on 16 px tiles; 32×48 or 32×64 on 32 px tiles." },
      { label: "Directions", value: "4 for tile-based RPGs; 8 for free-moving action and isometric games." },
      { label: "Walk frames", value: "3–4 per direction for 16–32 px characters; 6–8 for larger sprites." },
      { label: "Row order", value: "Pick one and keep it. RPG Maker: down, left, right, up. SpriteLab: down, right, up, left." },
      { label: "Collision", value: "A small box at the feet, not the whole sprite, so the character can pass behind walls and trees." },
      { label: "Draw order", value: "Sort by the y of the feet (Y Sort in Godot, Transparency Sort Axis in Unity, depth = -y in GameMaker)." },
    ],
    notes: [
      "A top-down hero needs the same design seen from four sides, and that is where most character art breaks: the back view grows a pixel taller, the cape changes colour, the sword moves hands. In SpriteLab you make the character once, then animate it into a 4-direction view sheet or a 4-direction walk (4 steps facing down, right and up, with the left row mirrored from the right), all at the same size on one ground line.",
      "Mirroring is a real trade-off: a character with a sword in the right hand holds it in the left when facing left. If your hero has a strong asymmetric feature, plan to fix the left row by hand or draw it separately.",
    ],
    links: [
      { label: "How to make a 4-direction top-down RPG character", href: "/guides/how-to-make-a-4-direction-top-down-rpg-character" },
      { label: "How many frames should a sprite animation have?", href: "/guides/how-many-frames-per-sprite-animation" },
    ],
  },

  "game-weapon-generator": {
    kind: "specs",
    id: "weapon-specs",
    eyebrow: "weapons in a game",
    title: "One weapon, three jobs",
    intro: "The same sword usually appears as a pickup, an inventory icon and part of an attack. Each has different needs.",
    rows: [
      { label: "Pickup / world", value: "Same pixel density as your characters; a short bob or shine animation helps it read as collectable." },
      { label: "Inventory icon", value: "Drawn to fill a 32, 48 or 64 px slot, often at a 45° diagonal; readable as a silhouette." },
      { label: "In hand", value: "Drawn as part of the character's attack frames, or as a separate sprite with its origin at the grip." },
      { label: "Rotation", value: "Avoid free rotation of pixel art — it breaks the grid. Draw the angles you need (often 8)." },
      { label: "Hitbox", value: "Slightly smaller than the blade, active only on the strike frames." },
    ],
    notes: [
      "A weapon sprite on its own is most useful for pickups, shops and inventory icons. For the weapon in a character's hand, the cleanest result in a 2D game is usually to animate the character holding it: the swing then has proper anticipation and follow-through, and the blade stays in the same hand in every frame.",
      "If you attach weapons as separate sprites instead (common in top-down games with many weapons), set the sprite's origin at the grip so it rotates around the hand, keep the weapon at the character's pixel density, and pre-draw angles rather than rotating pixel art freely. When you animate a SpriteLab character with a weapon, the engine pack's hitboxes.json marks the frames where the blade reaches out — a starting point for your attack's active frames.",
    ],
    links: [
      { label: "Hitboxes and hurtboxes from sprite sheets", href: "/guides/hitboxes-and-hurtboxes-from-sprite-sheets" },
      { label: "AI game icon generator", href: "/ai-game-icon-generator" },
    ],
  },

  "ai-tileset-generator": {
    kind: "specs",
    id: "tile-specs",
    eyebrow: "tiles in an engine",
    title: "Tile sizes and tilemap setup",
    intro: "How a single seamless tile becomes part of a level, and where SpriteLab stops.",
    rows: [
      { label: "Tile size", value: "16×16 or 32×32 for most pixel games; 64×64 and up for painted art." },
      { label: "SpriteLab output", value: "1024×1024 PNG; pixel-art tiles sit on a 128-pixel grid, so a nearest downscale gives 128×128." },
      { label: "Godot 4", value: "Add the PNG as a TileSet atlas source; set the tile size to match the image after downscaling." },
      { label: "Unity", value: "Pixels Per Unit = tile size, Point filter, then a Tile Palette on a Grid with cell size 1." },
      { label: "Animated tiles", value: "Water and lava loop well at 4–8 frames, 6–10 fps." },
      { label: "Not included", value: "Autotile sets (edges, corners, 47-tile blobs) — those you assemble or draw yourself." },
    ],
    notes: [
      "A seamless tile repeats without visible lines because its left edge continues into its right edge and its top into its bottom. That makes it ideal for large areas of floor, wall, water or lava. What it does not give you is transitions — grass meeting a path, a cliff edge, a shoreline. Those need edge and corner tiles drawn to fit together, which SpriteLab does not generate.",
      "Big repeating areas show repetition. Break it up by generating two or three variants of the same surface with the same prompt and style, and scatter decoration sprites (rocks, flowers, cracks) on a layer above. If you pack tiles into an atlas, add padding or extrude the edges by a pixel to avoid thin seams when the camera moves.",
    ],
    links: [
      { label: "How to make seamless tiles for 2D games", href: "/guides/how-to-make-seamless-tiles-for-2d-games" },
      { label: "Sprite sheet layout: strips, grids and atlases", href: "/guides/sprite-sheet-layout-and-texture-atlases" },
    ],
  },

  "ai-game-icon-generator": {
    kind: "specs",
    id: "icon-specs",
    eyebrow: "icons in a ui",
    title: "Icon sizes and readability",
    intro: "Icons are read in a fraction of a second, often at a small size. These rules keep a set usable.",
    rows: [
      { label: "Common sizes", value: "16 or 24 px for status effects, 32 or 48 px for inventories and hotbars, 64 px for skill trees and shops." },
      { label: "Readability", value: "Check every icon at its real size; the silhouette alone should say what it is." },
      { label: "Consistency", value: "Same frame, light direction, outline and palette for the whole set." },
      { label: "Rarity / state", value: "Better done in the UI (border colour, glow, greyed-out) than baked into each icon." },
      { label: "Scaling", value: "Pixel icons scale by whole numbers only: a 32 px icon shows at 64 or 96, not 80." },
    ],
    notes: [
      "An icon that looks great at 512 pixels can be unreadable at 32. Detail disappears first; what survives is the silhouette and two or three strong colour areas. When you generate or draw icons, downscale them to the size your UI uses before judging them, and prefer simple, bold subjects over busy scenes.",
      "Keep the parts of the icon that vary by state out of the art. If a sword can be common, rare or legendary, draw one sword and let the inventory slot change its border colour; if a skill can be on cooldown, darken it in the UI. That keeps the set small and the states consistent. SpriteLab icons come framed and centred on a transparent outside, so the frame is part of the art — decide early whether you want the frame there or in your UI.",
    ],
    links: [
      { label: "How to keep AI game art consistent", href: "/guides/how-to-keep-ai-game-art-consistent" },
      { label: "Pixel art sprite sizes for games", href: "/guides/pixel-art-sprite-sizes-for-games" },
    ],
  },
};
