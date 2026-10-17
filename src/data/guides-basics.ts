// =============================================================================
// Basics and direction guides (Oct 2026). Same shape as guides.ts.
// SpriteLab facts here must match the code: direction order and prices in
// src/config/animations.ts (ROTATIONS, DIRECTION_NAMES), engine pack in
// src/lib/export/engine-pack.ts.
// =============================================================================

import type { Guide } from "@/data/guides";

const UPDATED = "2026-10-17";

export const BASICS_GUIDES: Guide[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "what-is-a-sprite-in-gaming",
    title: "What Is a Sprite in Gaming?",
    description:
      "A sprite is a 2D image a game moves around on screen: characters, items, effects. Where the word comes from, sprites vs sprite sheets, and how they're made.",
    updated: UPDATED,
    published: UPDATED,
    related: ["pixel-art-sprite-sizes-for-games", "sprite-sheet-layout-and-texture-atlases", "how-to-make-pixel-art-sprites-for-games"],
    tools: ["/ai-sprite-generator", "/sprite-sheet-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "A sprite is a 2D image that a game draws and moves on its own, separately from the background: the player character, an enemy, a coin, a fireball, a health bar. It usually has a transparent background so only the object shows, and it is often one frame of an animation stored together with the other frames in a sprite sheet. Today almost every 2D game and many 3D games' menus and effects are built from sprites.",
        ],
      },
      {
        heading: "Where the word comes from",
        body: [
          "The term comes from home computers and consoles of the late 1970s and 1980s. Their video chips could draw a few small images, called sprites, on top of the background in hardware and move them by changing a position register, without redrawing the screen. Texas Instruments engineers are usually credited with the name, used for the movable objects of the TMS9918 video chip; the image of a little sprite floating over the scene stuck.",
          "Those hardware sprites came with hard limits that shaped how old games look. The Commodore 64 had eight hardware sprites of 24×21 pixels. The NES could show 64 sprites of 8×8 or 8×16 pixels, but only eight on one horizontal line, which is why characters flicker when many of them line up. Bigger characters were made of several sprites moving together.",
          "Modern engines have no such limits. A sprite is now simply a textured rectangle the GPU draws, and a game can show thousands at once. The word stayed, and so did the habits it brought: transparent backgrounds, frames of equal size, and art designed to read at a small size.",
        ],
      },
      {
        heading: "What counts as a sprite",
        body: [
          "Anything that is drawn as its own image and can move, change or disappear independently is a sprite. Tiles are related but usually handled differently: they sit on a fixed grid and are drawn by a tile map rather than as separate objects.",
        ],
        table: {
          head: ["Kind", "Examples", "Typical notes"],
          rows: [
            ["Characters", "Player, enemies, NPCs, bosses", "Animated: idle, walk, attack, hurt; often several directions"],
            ["Items and pickups", "Coins, potions, keys, weapons on the ground", "Often a short loop such as a bob or a sparkle"],
            ["Icons", "Inventory items, skills, status effects", "Square, readable at 32–64 px"],
            ["Effects", "Explosions, slashes, magic, dust", "Short one-shot animations, often additive blending"],
            ["UI", "Buttons, bars, frames, cursors", "Often 9-sliced so they stretch without distortion"],
            ["Tiles", "Floor, walls, platforms", "Grid-aligned and seamless; drawn by a tile map"],
          ],
        },
      },
      {
        heading: "Sprite, sprite sheet, texture atlas",
        body: [
          "These three words are often mixed up. A sprite is one image, or one frame. A sprite sheet is one image file holding several frames, usually of one animation, in a regular grid or a single row, so the engine can cut it by cell size. A texture atlas packs many different sprites into one texture, often at irregular positions, with a data file that says where each one is.",
          "Engines prefer sheets and atlases because drawing many sprites from one texture is faster than switching between hundreds of small files. For you, the practical difference is how you slice them: a sheet with equal cells needs only the frame size, an atlas needs its data file.",
        ],
        image: { src: "/showcase/sheet-witch-walk.png", alt: "Pixel art witch walk cycle as a sprite sheet of six equal frames in one row", pixel: true },
      },
      {
        heading: "What makes a sprite ready for a game",
        body: [
          "A nice picture is not yet a usable sprite. Before it goes into a game, check a few things:",
        ],
        list: [
          "Real transparency: an alpha channel, not a white background and not a checkerboard painted into the image.",
          "The right view for your camera: side view for platformers, top-down or three-quarter for RPGs.",
          "A consistent scale: every sprite drawn at the same pixel density, so a mouse is smaller than a dragon.",
          "A sensible origin or pivot, usually bottom centre for characters, so the feet stay on the ground.",
          "For animations, frames of equal size with the body aligned, so the character doesn't slide or jitter.",
          "For pixel art, a real grid with no blurred edges, scaled by whole numbers with nearest-neighbour filtering.",
        ],
        after: [
          "Common sizes for pixel-art characters are 16×16, 32×32 and 64×64 pixels, scaled up on screen. Which one suits your game depends on the camera and how much detail you want; the sprite sizes guide goes through the trade-offs.",
        ],
      },
      {
        heading: "How sprites are made",
        body: [
          "There are three common routes, and most games mix them.",
          "Drawing them yourself in a pixel editor such as Aseprite, LibreSprite or Piskel, or in a painting program for hand-drawn styles. This gives full control and a consistent style, and it takes the most time: a polished animated character can take days.",
          "Using asset packs from places like itch.io or OpenGameArt. They are fast and often cheap or free, but check each licence, and expect to adjust colours and sizes so packs from different artists match.",
          "Generating them with an AI sprite generator. SpriteLab, for example, makes a sprite from a sentence as a transparent PNG, snaps pixel styles to a real grid with a limited palette, and can animate the sprite into a sprite sheet. It is quickest for prototypes, variants and items; signature characters often still get a manual pass in a pixel editor.",
        ],
      },
    ],
    faq: [
      {
        q: "What is a sprite in a video game?",
        a: "A 2D image the game draws and moves independently of the background, such as a character, an item or an effect, usually with a transparent background.",
      },
      {
        q: "Why are they called sprites?",
        a: "The name comes from early video chips that could draw small movable images over the background in hardware; engineers at Texas Instruments are usually credited with calling them sprites.",
      },
      {
        q: "Is a sprite the same as a sprite sheet?",
        a: "No. A sprite is one image or frame; a sprite sheet is one file that holds many frames, usually of an animation, laid out in a grid or a row.",
      },
      {
        q: "Are sprites only used in pixel-art games?",
        a: "No. Hand-painted, vector and cartoon 2D games use sprites too, and 3D games use them for effects, icons and interface elements.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-make-an-8-direction-walk-cycle",
    title: "How to Make an 8-Direction Walk Cycle",
    description:
      "Plan, draw and wire up an 8-direction walk: which five directions to draw, frame counts, mirroring, row order and picking the facing in Godot and Unity.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-make-a-4-direction-top-down-rpg-character", "how-many-frames-per-sprite-animation", "sprite-sheet-layout-and-texture-atlases"],
    tools: ["/sprite-sheet-generator", "/rpg-character-creator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "An 8-direction walk is the same walk cycle drawn facing south, south-east, east, north-east and north, with the other three directions (south-west, west, north-west) usually mirrored from their east-side twins. Give every direction the same number of frames, often 6 or 8, keep the character on one ground line and at one size in all of them, and store one direction per row. In code, split the movement angle into eight 45° sectors and play the row for the sector the input points into.",
        ],
      },
      {
        heading: "Do you need eight directions?",
        body: [
          "Four directions are enough for most tile-based RPGs, where movement is mostly horizontal and vertical. Eight start to matter when the character moves freely: twin-stick shooters, action RPGs, isometric games and anything controlled with an analogue stick. There, a character walking diagonally while facing straight sideways looks like it is sliding.",
          "The cost is real. Every animation that has a facing, not just the walk, needs the extra directions: idle, run, attack and hurt too. With mirroring you draw five directions instead of three, so plan on roughly 1.7 times the art of a 4-direction character for each animation.",
        ],
      },
      {
        heading: "Directions, angles and row order",
        body: [
          "There is no standard order for the rows of an 8-direction sheet; asset packs and tools all differ. Pick one, write it down and use it for every character. One clear option is to go round the compass from south:",
        ],
        table: {
          head: ["Row", "Direction", "Faces", "Input angle (y down)", "Mirror of"],
          rows: [
            ["1", "S", "Towards the camera", "67.5°–112.5°", "—"],
            ["2", "SE", "Front-right three-quarter", "22.5°–67.5°", "—"],
            ["3", "E", "Right profile", "−22.5°–22.5°", "—"],
            ["4", "NE", "Back-right three-quarter", "−67.5°–−22.5°", "—"],
            ["5", "N", "Away from the camera", "−112.5°–−67.5°", "—"],
            ["6", "NW", "Back-left three-quarter", "−157.5°–−112.5°", "NE"],
            ["7", "W", "Left profile", "157.5°–180° and −180°–−157.5°", "E"],
            ["8", "SW", "Front-left three-quarter", "112.5°–157.5°", "SE"],
          ],
        },
        after: [
          "The angles assume screen coordinates with y pointing down, as in Godot and GameMaker's room space. In Unity, where y points up, north and south swap signs.",
        ],
      },
      {
        heading: "Frames and timing",
        body: [
          "Every direction should have the same frame count and the same timing. If the east walk has 8 frames and the south-east walk has 6, the steps fall out of rhythm when the player turns, and the character seems to stumble.",
          "Six frames per direction is a good middle ground for 32–64 px characters: contact, down, passing for each foot. Eight frames gives a smoother, heavier walk for bigger sprites. Four can work at 16–24 px, where there is little room for in-betweens anyway. Play walks at about 8–12 frames per second and tie the playback speed to the movement speed so the feet don't skate.",
        ],
      },
      {
        heading: "Drawing the diagonal directions",
        body: [
          "The diagonals are where 8-direction walks usually go wrong. A few rules keep them believable:",
        ],
        list: [
          "Draw the three-quarter turnaround first, a standing pose for every direction, and animate from it. A walk can only be as consistent as its standing poses.",
          "Keep the head size, body height and ground line identical across all eight directions; check by stacking the standing poses on top of each other.",
          "In the south-east and north-east views, the far leg and arm are partly hidden. Let them overlap the body rather than shrinking them.",
          "Move the feet along the walking direction, which on screen is diagonal: each step goes a little down-right (SE) or up-right (NE), not straight sideways.",
          "Exaggerate the vertical bob and the arm swing slightly. At small sizes an accurate walk often reads as standing still.",
        ],
        image: { src: "/showcase/rotate-knight.png", alt: "Pixel art knight standing poses from the front, right, back and left, the base for a walk cycle", pixel: true },
      },
      {
        heading: "Mirroring and its catches",
        body: [
          "Mirroring the east side for the west side saves three of eight directions, and engines flip sprites for free (flip_h in Godot, flipX on Unity's SpriteRenderer, image_xscale = -1 in GameMaker). It breaks on asymmetric characters: a sword in the right hand ends up in the left, hair partings and scars jump sides, and light from the top-left becomes light from the top-right. If those details matter, draw all eight directions; the 4-direction guide covers the same trade-off in more detail.",
        ],
      },
      {
        heading: "Picking the facing from input",
        body: [
          "Read the movement as a vector, take its angle and round it to the nearest 45° sector. Only update the facing while the character is actually moving, so the last direction is kept when the player stops. With an analogue stick, add a few degrees of hysteresis at the sector borders: change direction only when the angle is clearly inside a new sector, otherwise the sprite flickers between two rows when the stick rests near a border.",
          "In Unity, an Animator Blend Tree of type 2D Simple Directional with the eight walk clips placed at their directions does the same job without code. In GameMaker, use point_direction and divide by 45.",
        ],
        code: {
          lang: "gdscript",
          caption: "Godot 4: choose one of eight walk animations from the movement vector",
          text: `const DIRS := ["e", "se", "s", "sw", "w", "nw", "n", "ne"]
var facing := "s"

func update_facing(velocity: Vector2) -> void:
	if velocity.length() < 1.0:
		$AnimatedSprite2D.play("idle_" + facing)
		return
	# angle() is 0 pointing right and grows clockwise (y points down)
	var sector := int(round(velocity.angle() / (PI / 4.0)))
	sector = (sector % 8 + 8) % 8
	facing = DIRS[sector]
	$AnimatedSprite2D.play("walk_" + facing)`,
        },
      },
      {
        heading: "What SpriteLab can and can't do here",
        body: [
          `SpriteLab doesn't generate an 8-direction walk cycle. It has two related tools. "8 directions" (10 credits) draws your sprite standing in all eight directions in the order front, front-right, right, back-right, back, back-left, left, front-left, at the same size on one ground line: a turnaround you can use as the standing poses and as the reference for drawing diagonal walk frames. "4-direction walk" (12 credits) animates the walk facing down, right, up and left, 4 steps each, with the left row mirrored from the right.`,
          "A practical route is to take the 4-direction walk for the cardinal rows, use the 8-direction turnaround for the diagonal standing poses, and draw the diagonal walk frames in a pixel editor on top of those poses, keeping the same frame count and timing as the cardinal rows. The engine pack splits the 4-direction walk into walk_down, walk_right, walk_up and walk_left for Godot, Unity and GameMaker, which you can rename to match the scheme above.",
        ],
      },
    ],
    faq: [
      {
        q: "Which directions do I have to draw for an 8-direction walk?",
        a: "Usually five: south, south-east, east, north-east and north. South-west, west and north-west can be mirrored, unless the character is visibly asymmetric.",
      },
      {
        q: "How many frames should each direction have?",
        a: "The same number in every direction: 6 is a good default for 32–64 px characters, 8 for larger or heavier ones, 4 for very small sprites.",
      },
      {
        q: "4 or 8 directions for a top-down game?",
        a: "Four for tile-based movement, eight for free movement with a stick or the mouse, such as twin-stick shooters, action RPGs and isometric games.",
      },
      {
        q: "Can SpriteLab make an 8-direction walk?",
        a: "Not as one animation. It draws an 8-direction standing turnaround and a 4-direction walk; the diagonal walk frames are drawn on top of those.",
      },
    ],
  },
];
