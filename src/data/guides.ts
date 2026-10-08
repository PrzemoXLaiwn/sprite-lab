// =============================================================================
// Game Dev Guides — long-form, answer-first articles for /guides.
// Every SpriteLab claim here must match the product facts in geo-content.ts.
// The first paragraph of each guide answers the question directly (that is
// the passage search engines and AI assistants tend to quote).
// =============================================================================

import { ENGINE_GUIDES } from "@/data/geo-content";

export interface GuideImage {
  src: string;
  alt: string;
  /** Render with nearest-neighbour scaling (pixel art). */
  pixel?: boolean;
}

export interface GuideSection {
  heading: string;
  /** Paragraphs. */
  body: string[];
  list?: string[];
  /** Ordered steps — sections with steps feed the HowTo JSON-LD. */
  steps?: string[];
  image?: GuideImage;
}

export interface GuideFaq {
  q: string;
  a: string;
}

export interface Guide {
  slug: string;
  title: string;
  /** ≤155 characters. */
  description: string;
  /** ISO date. */
  updated: string;
  readingMinutes: number;
  sections: GuideSection[];
  faq: GuideFaq[];
}

const UPDATED = "2026-10-08";

export const GUIDES: Guide[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-make-a-sprite-sheet-with-ai",
    title: "How to Make a Sprite Sheet with AI",
    description:
      "Turn one AI-generated sprite into a game-ready sprite sheet: pick a motion, choose frame count, export equal-size frames and import them into your engine.",
    updated: UPDATED,
    readingMinutes: 7,
    sections: [
      {
        heading: "The short answer",
        body: [
          "To make a sprite sheet with AI, first generate a single character sprite on a transparent background, then animate that exact sprite into a motion such as a walk cycle and export the frames as one image of equal-size cells. The equal frame size is what matters: it lets Unity, Godot or GameMaker slice the sheet automatically by cell size.",
          "General image generators struggle with this because they redraw the character from scratch for every frame, so the face, colours and proportions drift. A workflow built for game assets keeps the character fixed and only changes the pose. Below is the full process, from the first sprite to a looping animation in your engine.",
        ],
      },
      {
        heading: "What a sprite sheet actually is",
        body: [
          "A sprite sheet is a single image that contains every frame of one or more animations, laid out on a grid. The engine loads one texture and shows a different rectangle of it each frame, which is cheaper than loading dozens of separate files and keeps all frames perfectly aligned.",
          "There are two common layouts. A horizontal strip puts every frame of one animation in a single row: a 6-frame walk at 64×64 pixels becomes a 384×64 image. A grid sheet stacks several animations as rows (idle, walk, attack…) in one larger texture. Strips are the simplest to import and to reason about; you can always pack them into an atlas later.",
        ],
        list: [
          "Every frame must be the same width and height.",
          "The character should stand on the same baseline in every frame, so feet do not jitter.",
          "The background must be transparent, not white or a checkerboard baked into the pixels.",
          "Frames are read left to right, in playback order.",
        ],
      },
      {
        heading: "Step 1: generate a clean base sprite",
        body: [
          "The base sprite is the reference every frame will be built from, so get it right before animating. Use a side view for platformers and side-scrollers, and a clear, full-body pose with arms slightly away from the body so limbs are readable once they start moving. Avoid capes, long weapons or effects that run off the edge of the canvas.",
          "In SpriteLab you describe the character in a sentence, pick one of the 12 art styles (for example Pixel 16-bit or Hand Painted) and get a transparent PNG. Pixel art results are snapped to a real pixel grid with a limited palette and a consistent outline, which makes later frames easier to keep consistent.",
        ],
        image: { src: "/showcase/knight.png", alt: "Pixel art knight sprite with sword and shield on a transparent background", pixel: true },
      },
      {
        heading: "Step 2: choose the motion and frame count",
        body: [
          "Frame count is a trade-off between smoothness, file size and cost. Classic pixel art games use surprisingly few frames: 4 for an idle breath, 6 to 8 for a walk cycle, 3 to 6 for an attack. A walk cycle needs at least the contact, down, passing and up poses for each leg to read as walking.",
          "SpriteLab's Animate tool offers idle, walk, run, attack, jump, cast, hurt, fly, a turnaround or a custom motion you describe, and it suggests motions that fit the sprite you picked. You choose 4, 6 or 9 key poses; smooth mode adds AI in-between frames for 8, 12 or 18 frames total. Animation costs 1 credit per frame, so a 6-frame walk costs 6 credits and a smoothed 12-frame walk costs 12.",
        ],
        image: { src: "/showcase/anim-witch-walk.gif", alt: "Animated pixel art witch walk cycle generated from a single sprite", pixel: true },
      },
      {
        heading: "Step 3: export and check the sheet",
        body: [
          "Export the animation as a horizontal sprite sheet: one row of equal-size frames on a transparent background. SpriteLab also gives you the individual frames as a ZIP and a GIF preview, which is handy for sharing or for engines and tools that prefer separate files.",
          "Before importing, check three things: the image width divided by the number of frames is a whole number, the last frame flows back into the first without a pop, and the feet stay on the same line. If a single frame is off, it is usually faster to regenerate the animation than to repair it by hand.",
        ],
      },
      {
        heading: "Step 4: import it into your engine",
        body: [
          "Because every frame is the same size, slicing is mechanical. In Unity you slice by cell size in the Sprite Editor; in Godot 4 you add the sheet to an AnimatedSprite2D with 'Add frames from sprite sheet'. The Unity workflow looks like this:",
        ],
        steps: ENGINE_GUIDES.unity,
      },
      {
        heading: "Frame rate and polish",
        body: [
          "Most 2D sprite animations play between 8 and 12 frames per second. A walk cycle with 6 frames at 10 fps loops roughly every 0.6 seconds, which matches a relaxed walking pace; raise the fps for running. Match the movement speed of the character in code to the stride so the feet do not appear to slide.",
          "For pixel art, always turn off texture filtering (Point in Unity, Nearest in Godot) and scale by whole numbers. Smoothing filters blur the pixel edges and make a crisp sheet look like a low-quality JPEG.",
        ],
      },
    ],
    faq: [
      {
        q: "Can AI make a sprite sheet from one image?",
        a: "Yes. The reliable approach is to generate one base sprite first and then animate that same sprite into frames, rather than prompting for a whole sheet at once. SpriteLab's Animate tool does this and exports a horizontal sprite sheet, a frames ZIP and a GIF.",
      },
      {
        q: "How many frames should a walk cycle have?",
        a: "Six to eight frames is the common range for 2D games. Four frames can work for small pixel sprites; 12 or more gives smoother motion for larger, higher-resolution characters.",
      },
      {
        q: "What size should sprite sheet frames be?",
        a: "Any size works as long as every frame is identical in width and height. Common pixel art sizes are 32×32, 48×48 and 64×64; higher-resolution games often use 128×128 or larger.",
      },
      {
        q: "Does SpriteLab make 8-direction sprite sheets?",
        a: "No. SpriteLab animates a sprite in the view it was generated in and can produce a turnaround, but it does not output complete 8-direction movement sets.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-make-pixel-art-sprites-for-games",
    title: "How to Make Pixel Art Sprites for Games",
    description:
      "Pick a sprite resolution, limit your palette, use clean outlines and scale with nearest-neighbour. A practical pixel art checklist for game developers.",
    updated: UPDATED,
    readingMinutes: 7,
    sections: [
      {
        heading: "The short answer",
        body: [
          "To make pixel art sprites for games, decide on one sprite size (for example 32×32) and one game resolution first, draw or generate on that exact grid with a small limited palette and a consistent outline, then scale up only by whole numbers using nearest-neighbour filtering. Those four decisions — grid, palette, outline, scaling — matter more than drawing talent for making sprites look like they belong in the same game.",
        ],
      },
      {
        heading: "1. Choose your resolution before anything else",
        body: [
          "Pixel art is defined by its grid. Pick a base sprite size that fits your game's camera: 16×16 suits retro and tile-based games, 32×32 is the most common middle ground, and 48×48 or 64×64 gives room for facial expressions and detailed weapons.",
          "Then pick a low internal game resolution that scales cleanly to common screens. 320×180 and 640×360 both scale by whole numbers to 1920×1080 (6× and 3×). Rendering at a low resolution and scaling the whole frame up keeps every pixel the same size on screen, which is the single biggest visual tell of professional pixel art.",
        ],
        list: [
          "16×16: very readable, tiny palettes, fast to produce.",
          "32×32: room for a face and a weapon; the most common choice.",
          "64×64 and up: detailed characters, bosses and portraits.",
          "Keep tiles, characters and items at the same pixel density — never mix a 16px sword with a 64px hero at the same scale.",
        ],
      },
      {
        heading: "2. Limit the palette",
        body: [
          "A small shared palette is what makes a set of sprites feel unified. Many games use 16 to 32 colours for everything. Public palettes such as PICO-8 (16 colours), DawnBringer 32 and Endesga 32 are good starting points and are free to use.",
          "Within the palette, build ramps of 3 to 5 shades per material and shift the hue as you go darker (towards blue or purple) and lighter (towards yellow). Hue-shifted ramps look richer than simply darkening the same colour. Choose one light direction — top-left is conventional — and shade every sprite from it.",
        ],
      },
      {
        heading: "3. Use a consistent outline",
        body: [
          "Outlines separate a sprite from busy backgrounds. A 1-pixel dark outline is the safest default for small sprites. Selective outlining (selout), where the outline takes a darker shade of the adjacent colour instead of pure black, looks softer and suits larger sprites. Whichever you choose, use it on every character and item; mixing outlined and unoutlined sprites is very noticeable.",
          "Watch for 'jaggies' (uneven stair-steps on curves) and orphan pixels that do not connect to anything. Lines look smoothest when the step lengths change gradually, such as 3-2-1 rather than 3-1-3.",
        ],
        image: { src: "/showcase/slime.png", alt: "Pixel art green slime sprite with a dark one-pixel outline", pixel: true },
      },
      {
        heading: "4. Scale with nearest-neighbour, by whole numbers",
        body: [
          "Never resize pixel art with bilinear or bicubic filtering — it blurs the edges. Use nearest-neighbour scaling and whole-number factors (2×, 3×, 4×). A 32px sprite shown at 3× becomes 96px with every pixel a crisp 3×3 block; shown at 2.5× some pixels become 2 wide and some 3, which makes sprites shimmer as they move.",
          "In engines this means Filter Mode 'Point (no filter)' and Compression 'None' in Unity, or Default Texture Filter 'Nearest' in Godot 4, plus a camera setup that snaps to whole pixels (Unity's Pixel Perfect Camera, Godot's integer stretch scaling).",
        ],
      },
      {
        heading: "5. Avoid mixels and fake pixel art",
        body: [
          "Mixels are pixels of different sizes in the same scene — usually caused by scaling one sprite by a different factor, rotating pixel art freely, or using AI images that only look pixelated. Many AI image models produce 'pixel art style' pictures whose pixels are not aligned to any grid; zoom in and you see blurred blocks of uneven size and hundreds of near-identical colours.",
          "SpriteLab handles this in post-processing: Pixel 16-bit, Pixel HD and Isometric Pixel results are snapped to a real pixel grid with a limited palette and a consistent outline, on a transparent background. If you need a bigger file for a store page or a print, its free pixel-perfect upscale goes up to 4096px without blurring.",
        ],
        image: { src: "/showcase/fire-sword.png", alt: "Pixel art flaming sword snapped to a clean pixel grid", pixel: true },
      },
      {
        heading: "A practical workflow",
        body: ["Whether you draw by hand, generate with AI, or mix both, this order keeps things consistent:"],
        steps: [
          "Fix the game resolution, sprite size and palette in a short style sheet before making any assets.",
          "Make one hero sprite and treat it as the reference for outline, shading direction and detail level.",
          "Produce the rest of the assets at the same size and against the same palette; reject anything that breaks the rules rather than trying to fix it later.",
          "Clean up by hand in an editor such as Aseprite or LibreSprite: remove stray pixels, fix eyes and hands, check the silhouette in pure black.",
          "Import with point/nearest filtering, no compression, and whole-number scaling, then review the sprites in-game against real backgrounds.",
        ],
      },
    ],
    faq: [
      {
        q: "What is the best size for pixel art sprites?",
        a: "32×32 is the most common choice because it balances readability and detail. 16×16 suits retro and tile-heavy games; 64×64 or larger suits detailed characters. What matters most is using the same pixel density for every asset.",
      },
      {
        q: "How many colours should a pixel art palette have?",
        a: "Most indie pixel art games use 16 to 32 colours in total. Fewer colours make sprites easier to keep consistent and give the game a cohesive look.",
      },
      {
        q: "Why does my pixel art look blurry in my game engine?",
        a: "The engine is filtering the texture. Set the filter to Point (Unity) or Nearest (Godot), disable compression for small sprites, and scale only by whole numbers.",
      },
      {
        q: "Can AI generate real pixel art?",
        a: "Raw AI images usually only imitate pixel art. Tools that post-process the output onto a real pixel grid with a limited palette, as SpriteLab does for its pixel styles, produce sprites you can edit pixel by pixel.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-import-sprite-sheets-into-unity",
    title: "How to Import Sprite Sheets into Unity",
    description:
      "Import a sprite sheet into Unity 2D: set Sprite Mode to Multiple, slice by cell size, fix pixel art blur with Point filtering and build an Animation clip.",
    updated: UPDATED,
    readingMinutes: 6,
    sections: [
      {
        heading: "The short answer",
        body: [
          "To import a sprite sheet into Unity, drag the PNG into your Assets folder, set Texture Type to 'Sprite (2D and UI)' and Sprite Mode to 'Multiple', then open the Sprite Editor and use Slice → Grid By Cell Size with your frame width and height. Select the sliced frames and drag them into the Scene to create an animation. For pixel art, also set Filter Mode to 'Point (no filter)' and Compression to 'None'.",
        ],
      },
      {
        heading: "Before you start",
        body: [
          "The Sprite Editor comes from the 2D Sprite package, which is installed automatically in Unity's 2D templates. If the Sprite Editor button is missing in an existing 3D or URP project, install '2D Sprite' from Window → Package Manager.",
          "You also need to know the frame size. If the sheet is a single horizontal row, the frame width is the image width divided by the number of frames and the height is the image height. SpriteLab sprite sheets are exactly this kind of strip: one row of equal-size frames on a transparent background.",
        ],
      },
      {
        heading: "Step-by-step import",
        body: ["These steps work in Unity 2022 LTS and Unity 6:"],
        steps: ENGINE_GUIDES.unity,
      },
      {
        heading: "Import settings that matter",
        body: [
          "Pixels Per Unit (PPU) decides how big the sprite is in world units. Set it to your tile or character size — for 32×32 sprites, a PPU of 32 makes one sprite exactly one Unity unit. Use the same PPU for every asset in the game so pixels line up between characters and tiles.",
          "The pivot controls where the sprite is anchored. For characters, set the slice pivot to Bottom (or Bottom Center) so the feet sit on the ground and the sprite does not appear to sink or float when you swap animations.",
        ],
        list: [
          "Filter Mode: Point (no filter) for pixel art; Bilinear for painted or vector-style art.",
          "Compression: None for small pixel art; compression adds colour artefacts.",
          "Max Size: at least as large as the texture's longest side, otherwise Unity downscales it.",
          "Mesh Type: Full Rect avoids occasional edge clipping on tightly packed frames.",
          "Generate Mip Maps: off for 2D sprites.",
        ],
      },
      {
        heading: "Creating and tuning the animation",
        body: [
          "When you drag several sliced sprites into the Scene at once, Unity asks where to save a new Animation clip and creates a GameObject with a Sprite Renderer and an Animator. Open Window → Animation → Animation to preview it. If the sample rate field is hidden, enable 'Show Sample Rate' from the window's options menu and set 8–12 for most pixel art.",
          "To combine several animations (idle, walk, attack) on one character, add each clip to the same Animator Controller and connect them with transitions driven by parameters such as a 'Speed' float. For snappy 2D games, turn off 'Has Exit Time' and set transition duration to 0 so frames switch instantly.",
        ],
        image: { src: "/showcase/anim-knight-idle.gif", alt: "Pixel art knight idle animation ready to slice into Unity sprites", pixel: true },
      },
      {
        heading: "Fixing common problems",
        body: [],
        list: [
          "Blurry pixel art: Filter Mode is not Point, compression is on, or the camera is not scaling by whole numbers. Add the Pixel Perfect Camera component (URP 2D or the 2D Pixel Perfect package) with matching PPU.",
          "Thin lines or bleeding between frames: use Point filtering, turn off mip maps, and if needed add padding when slicing or pack sprites into a Sprite Atlas with padding.",
          "Character jitters while animating: frames have different pivots or the character is not on the same baseline in every frame. Use a consistent Bottom pivot.",
          "Wrong number of frames after slicing: the cell size does not divide the image exactly. Recheck the frame width and height.",
        ],
      },
    ],
    faq: [
      {
        q: "Why is the Sprite Editor button greyed out in Unity?",
        a: "Either the texture is not set to 'Sprite (2D and UI)' or the 2D Sprite package is not installed. Change the Texture Type, click Apply, and install the package from the Package Manager if needed.",
      },
      {
        q: "Should I use Grid By Cell Size or Automatic slicing?",
        a: "Use Grid By Cell Size for animation sheets. Automatic slicing trims each frame to its visible pixels, giving frames different sizes and pivots, which makes animations jitter.",
      },
      {
        q: "What Pixels Per Unit should I use?",
        a: "Match your base sprite or tile size, such as 16 or 32, and keep it identical across all assets in the project.",
      },
      {
        q: "Can SpriteLab export a Unity project or prefab?",
        a: "No. SpriteLab exports standard PNG sprites, horizontal sprite sheets, frame ZIPs and GIFs, which you import with the normal Unity workflow above.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-use-sprite-sheets-in-godot-4",
    title: "How to Use Sprite Sheets in Godot 4",
    description:
      "Use sprite sheets in Godot 4 with AnimatedSprite2D and SpriteFrames, or Sprite2D hframes with AnimationPlayer. Includes pixel-perfect settings.",
    updated: UPDATED,
    readingMinutes: 6,
    sections: [
      {
        heading: "The short answer",
        body: [
          "To use a sprite sheet in Godot 4, add an AnimatedSprite2D node, create a new SpriteFrames resource, click 'Add frames from sprite sheet', set Horizontal to the number of frames and Vertical to the number of rows, select the frames and add them. Set the animation speed in FPS, enable Loop for cycles like idle and walk, and call play(\"walk\") from your script. For pixel art, set the default texture filter to Nearest so pixels stay sharp.",
        ],
      },
      {
        heading: "Two ways to animate a sheet",
        body: [
          "Godot 4 gives you two good options. AnimatedSprite2D with a SpriteFrames resource is the quickest: you get a visual frame editor, per-animation FPS and looping, and simple play() calls. It is the right default for characters and enemies.",
          "Sprite2D with hframes and vframes plus an AnimationPlayer is more flexible. You set Hframes to the number of columns, then keyframe the 'frame' property over time. Because AnimationPlayer can also key hitboxes, sounds and method calls on the same timeline, many developers use it for attacks where a hitbox must appear on a specific frame.",
        ],
      },
      {
        heading: "Step-by-step with AnimatedSprite2D",
        body: [],
        steps: ENGINE_GUIDES.godot,
      },
      {
        heading: "Pixel-perfect settings",
        body: [
          "Godot 4 filters textures per canvas item rather than at import. The project-wide default lives at Project Settings → Rendering → Textures → Canvas Textures → Default Texture Filter; set it to Nearest for pixel art. You can override it on individual nodes with the Texture Filter property under CanvasItem → Texture.",
          "For the window, set Display → Window → Stretch → Mode to 'viewport' and the base viewport size to your low game resolution (for example 320×180 or 640×360). From Godot 4.2, Stretch → Scale Mode 'integer' keeps scaling to whole numbers. Enabling Rendering → 2D → Snap 2D Transforms to Pixel helps avoid sub-pixel shimmer on moving sprites.",
        ],
        list: [
          "Default Texture Filter: Nearest.",
          "Stretch Mode: viewport, Scale Mode: integer (4.2+).",
          "Snap 2D Transforms to Pixel: on for strict pixel art.",
          "Keep all sprites at the same pixel density so they line up with the TileMap.",
        ],
      },
      {
        heading: "Driving the animation from code",
        body: [
          "A minimal character script in GDScript checks velocity and switches animations: if the body is moving horizontally, play 'walk' and set flip_h from the direction; otherwise play 'idle'. Calling play() with the animation that is already running does not restart it, so it is safe to call every frame.",
          "For one-shot animations such as attack or hurt, disable Loop in SpriteFrames and connect the animation_finished signal to return to idle. Use the frame_changed signal, or an AnimationPlayer track, if gameplay needs to react on a specific frame.",
        ],
        image: { src: "/showcase/anim-dog-jump.gif", alt: "Animated pixel art dog jump made with the SpriteLab Animate tool", pixel: true },
      },
      {
        heading: "Alternative: Sprite2D + AnimationPlayer",
        body: [
          "If you need frame-exact gameplay events, this setup keeps everything on one timeline. It takes a minute longer than SpriteFrames but scales well to complex attacks.",
        ],
        steps: [
          "Add a Sprite2D node and assign the sprite sheet to its Texture.",
          "In the Inspector under Animation, set Hframes to the number of frames in the row (and Vframes to the number of rows, usually 1).",
          "Add an AnimationPlayer as a sibling, create a new animation and set its length (for example 0.6 s for 6 frames at 10 FPS).",
          "Select the Sprite2D and click the key icon next to the Frame property at each time step, increasing the frame number by one each time.",
          "Set the track's update mode to Discrete, enable looping for cycles, and add extra tracks for hitboxes, sounds or method calls on the frames where they belong.",
        ],
      },
      {
        heading: "Where the sheet comes from",
        body: [
          "Godot's sheet import is easiest when every frame is the same size and the sheet is a single row, because Horizontal equals the frame count and Vertical is 1. SpriteLab's Animate tool exports exactly that — a transparent horizontal strip of equal-size frames, plus a frames ZIP if you prefer to drag individual images into SpriteFrames, and a GIF to preview.",
        ],
      },
    ],
    faq: [
      {
        q: "Should I use AnimatedSprite2D or AnimationPlayer in Godot 4?",
        a: "Use AnimatedSprite2D for straightforward frame animation. Use Sprite2D with AnimationPlayer when you need to keyframe other properties, such as hitboxes or sounds, in sync with specific frames.",
      },
      {
        q: "Why are my sprites blurry in Godot 4?",
        a: "The texture filter is Linear. Set Project Settings → Rendering → Textures → Canvas Textures → Default Texture Filter to Nearest, or change Texture Filter on the node.",
      },
      {
        q: "How do I set the FPS of an AnimatedSprite2D animation?",
        a: "In the SpriteFrames panel, select the animation and change the speed value (FPS) next to the animation list. 8–12 FPS suits most pixel art.",
      },
      {
        q: "Is there a SpriteLab Godot plugin?",
        a: "No. SpriteLab exports standard PNG files and sprite sheets that you import with Godot's built-in tools; no plugin is required.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-make-seamless-tiles-for-2d-games",
    title: "How to Make Seamless Tiles for 2D Games",
    description:
      "Make seamless floor and wall tiles: match opposite edges, test in a 3×3 grid, break repetition with variants and set up tilemaps in Unity and Godot.",
    updated: UPDATED,
    readingMinutes: 7,
    sections: [
      {
        heading: "The short answer",
        body: [
          "A seamless tile is a square image whose left edge continues into its right edge and whose top edge continues into its bottom, so copies placed side by side show no visible line. To make one, keep the texture's detail evenly spread, use the offset (wrap-around) trick to move the seams into the middle where you can paint over them, and always test the tile in at least a 3×3 grid before using it in a level.",
        ],
      },
      {
        heading: "Pick a tile size and stick to it",
        body: [
          "Tile size defines your level grid. 16×16 and 32×32 are the standard sizes for pixel art; painted and high-resolution games often use 64, 128 or 256. Characters and props should share the tile's pixel density: if a tile is 32 pixels for one metre of ground, a human character is usually around 48 to 64 pixels tall.",
          "Use the same size for every tile in a tileset and make the size a power of two or a clean multiple of your sprite size. It simplifies import settings, camera snapping and collision.",
        ],
      },
      {
        heading: "How to make a tile seamless by hand",
        body: ["This works in any image editor, from Aseprite to GIMP or Photoshop:"],
        steps: [
          "Create the base texture at your exact tile size, keeping light, colour and detail density roughly even across the whole square.",
          "Offset the image by half its width and height with wrap-around (Photoshop: Filter → Other → Offset; GIMP: Layer → Transform → Offset, 'Wrap around'). The former edges now meet in a cross in the middle.",
          "Paint over the visible seam in the middle, blending the textures without touching the outer edges.",
          "Offset back by the same amount, or simply leave it — the tile now wraps on every side.",
          "Test by filling a 3×3 or larger grid with the tile and look for lines, hard colour steps and obvious repeating features.",
        ],
      },
      {
        heading: "Hiding repetition",
        body: [
          "A tile can be technically seamless and still look like wallpaper. The eye picks up any distinctive feature — a single large stone, a dark crack, a flower — repeating at fixed intervals. Keep the base tile calm and spread detail evenly; save distinctive details for separate variant tiles or decoration sprites placed on top.",
          "Make two to four variants of common floors (grass, dirt, stone) with the same base colours and edges but different small details, and scatter them randomly. Both Unity and Godot can randomise variants for you: Unity's Random Tile from the 2D Tilemap Extras package, and Godot's TileSet probability values when painting.",
        ],
        image: { src: "/showcase/tile-grass.png", alt: "Seamless pixel art grass floor tile", pixel: true },
      },
      {
        heading: "Floor tiles vs. wall tiles",
        body: [
          "Top-down floors are the easiest case: one tile that repeats in both directions. Walls need more thought. In a side view or three-quarter top-down view, a wall usually has a top cap, a face and a base, and the face only has to repeat horizontally (and sometimes vertically for tall walls). Brick and stone patterns must line up their mortar across the edges, so start the pattern exactly at the tile boundary.",
          "In SpriteLab, choose Environment → Floor Tiles or Wall Tiles to get a square tile that repeats without visible seams, in any of the art styles. Water and lava tiles can be animated into looping frames.",
        ],
        image: { src: "/showcase/tile-stone-wall.png", alt: "Seamless pixel art stone wall tile", pixel: true },
      },
      {
        heading: "Transitions and autotiles: know the limit",
        body: [
          "A single seamless tile covers a whole area of one material. Where grass meets dirt, or a wall meets the floor, you need transition tiles: edges, outer corners and inner corners. A full set for automatic terrain painting is commonly 16 tiles (simple corners) or 47 tiles (the 'blob' set that covers every neighbour combination). Godot 4's Terrains and Unity's Rule Tiles use these sets to choose the right piece automatically.",
          "SpriteLab does not generate autotile or 47-tile sets; it makes individual seamless floor and wall tiles. A practical approach is to generate the base materials, then draw the transition edges by hand from those tiles, or hide transitions with decoration sprites such as rocks, bushes and rubble.",
        ],
      },
      {
        heading: "Animated water and lava tiles",
        body: [
          "Animated tiles must loop in time and stay seamless in space on every frame. Keep the animation subtle: slow ripples and highlights read better than large waves when a whole lake is made of the same tile. Four to eight frames at a low frame rate is plenty.",
          "In Godot 4, set up animation directly in the TileSet editor by adding animation columns and a frame duration to the tile. In Unity, use the Animated Tile from 2D Tilemap Extras and assign the frames and speed.",
        ],
        image: { src: "/showcase/anim-water.gif", alt: "Animated seamless pixel art water tile looping", pixel: true },
      },
    ],
    faq: [
      {
        q: "How do I check whether a tile is seamless?",
        a: "Fill at least a 3×3 grid with the tile at 100% zoom and look for straight lines, brightness changes at edges and repeating features. Many editors, including Aseprite, have a tiled preview mode.",
      },
      {
        q: "What size should game tiles be?",
        a: "16×16 or 32×32 for most pixel art games; 64×64 and above for painted or high-resolution art. Use one size for the whole tileset.",
      },
      {
        q: "Can SpriteLab make a full autotile tileset?",
        a: "No. SpriteLab makes individual seamless floor and wall tiles and animated water and lava tiles, not 16- or 47-tile autotile sets.",
      },
      {
        q: "Why can I still see a grid pattern in my seamless tile?",
        a: "The tile probably has a distinctive feature or uneven lighting that repeats. Flatten the lighting, spread detail evenly, and add variant tiles or decorations.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-keep-ai-game-art-consistent",
    title: "How to Keep AI Game Art Consistent",
    description:
      "Keep AI game art consistent: lock one style, palette, outline, perspective and pixel density, reuse a prompt template and curate assets in projects.",
    updated: UPDATED,
    readingMinutes: 7,
    sections: [
      {
        heading: "The short answer",
        body: [
          "To keep AI game art consistent, lock the variables that define a style before you generate anything — one art style, one perspective, one pixel density, one outline rule and a limited palette — and reuse the same prompt template for every asset. Then curate ruthlessly: accept only results that match your reference sprite and regenerate the rest. Consistency comes from constraints and selection, not from a single perfect prompt.",
        ],
      },
      {
        heading: "Why AI art drifts",
        body: [
          "Image models sample a fresh picture every time. Small changes in wording, subject or even the order of words can shift line weight, colour temperature, camera angle and level of detail. One sprite on its own can look great; twenty sprites made over a week often look like they come from five different games.",
          "The fix is the same discipline traditional art teams use: a style guide, a reference asset and a review step. AI makes production fast, which makes the review step more important, not less.",
        ],
      },
      {
        heading: "Write a one-page style sheet",
        body: ["Before generating, decide and write down:"],
        list: [
          "Art style: one style for the whole game (for example Pixel 16-bit or Hand Painted), not a mix.",
          "Perspective: side view, top-down, three-quarter or isometric. Mixing a side-view hero with top-down enemies is the most common consistency failure.",
          "Pixel density: the sprite and tile size (for example 32 px per tile, characters 48 px tall). Never scale assets by different amounts.",
          "Palette: 16–32 colours, with named ramps for skin, metal, foliage and stone.",
          "Outline: 1 px dark outline, selective outline, or none — for every asset.",
          "Light direction: usually top-left, applied everywhere.",
        ],
      },
      {
        heading: "Use a prompt template",
        body: [
          "Keep the style words fixed and change only the subject. A template like '[subject], side view, full body, [two or three colour words], simple shapes' keeps the framing constant while you swap 'goblin archer' for 'armoured knight'. Describe the subject's colours with the same small vocabulary every time instead of inventing new adjectives per asset.",
          "In SpriteLab the style is a setting rather than prompt wording: pick one of the 12 art styles once and leave it alone. Pixel styles (Pixel 16-bit, Pixel HD, Isometric Pixel) are snapped to a real pixel grid with a limited palette and a consistent outline, which removes the biggest sources of drift — uneven pixel size and stray colours — automatically.",
        ],
        image: { src: "/showcase/goblin-archer.png", alt: "Pixel art goblin archer generated in the same style as the knight sprite", pixel: true },
      },
      {
        heading: "Pick a reference sprite and judge against it",
        body: [
          "Choose your best early result as the reference — often the main character — and compare every new asset to it side by side at game scale. Ask four quick questions: is the outline the same weight, is the shading from the same side, is the detail level similar, and would the two sprites look right standing next to each other in a scene? If any answer is no, regenerate.",
          "For animation, consistency is easier when you animate the approved sprite itself instead of generating new poses from text. SpriteLab's Animate tool works this way: it animates the sprite you chose into idle, walk, attack and other motions, so the character keeps its design across frames.",
        ],
        image: { src: "/showcase/armored-knight.png", alt: "Pixel art armoured knight used as a style reference sprite", pixel: true },
      },
      {
        heading: "Organise and curate in one project",
        body: [
          "Keeping every candidate in one folder makes drift invisible until it is in the game. Work per game instead. In SpriteLab, create a project for your game, generate into it and accept or decline each result; accepted sprites are filed into folders by type (characters, enemies, weapons, items…) automatically, and you can download the whole project as a ZIP pack. Declining off-style results keeps the pack clean so you are always comparing new assets against approved ones.",
        ],
        steps: [
          "Create one project per game and write the style sheet in your design doc.",
          "Generate the reference sprite and accept it.",
          "Generate the remaining assets with the same style setting and prompt template.",
          "Compare each result to the reference at game scale; accept matches, decline the rest.",
          "Download the project ZIP and apply final palette and outline clean-up in a pixel editor if needed.",
        ],
      },
      {
        heading: "Finish with a manual pass",
        body: [
          "A short manual pass fixes what generation misses. Index all sprites to your palette in Aseprite or a similar editor, check that outlines use the same colour, and remove stray pixels around hands and weapons. Put everything into one test scene with your tiles and UI: inconsistencies that are invisible in a gallery jump out immediately in context.",
          "Be honest about limits: AI is excellent for producing a large, coherent first pass of characters, items, icons and tiles, but a handful of hero assets — the player character, key bosses, the title screen — usually benefit from extra hand polish.",
        ],
      },
    ],
    faq: [
      {
        q: "How do I get the same character in different poses with AI?",
        a: "Animate the approved sprite rather than prompting for new poses from text. Re-prompting redraws the character and changes details; animating the existing sprite keeps its design.",
      },
      {
        q: "Should I mix art styles in one game?",
        a: "Generally no. Choose one style, perspective and pixel density for all in-game assets. UI icons can be slightly simplified, but should share the palette and outline rules.",
      },
      {
        q: "How do I make AI pixel art use one palette?",
        a: "Use a generator that limits the palette, then index every sprite to your chosen palette in a pixel editor such as Aseprite for an exact match.",
      },
      {
        q: "Can I use SpriteLab assets commercially?",
        a: "Yes. Assets generated with SpriteLab can be used in commercial games, with no attribution required.",
      },
    ],
  },
];

export function getGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
