// =============================================================================
// Long-form engine and craft guides (Oct 2026). Same shape as guides.ts.
// SpriteLab facts here must match the code: engine pack layout in
// src/lib/export/engine-pack.ts, frame options in src/config/animations.ts,
// 4-direction walk assembly in src/lib/services/animation-service.ts.
// =============================================================================

import type { Guide } from "@/data/guides";

const UPDATED = "2026-10-13";

export const ENGINE_CRAFT_GUIDES: Guide[] = [
  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-import-sprite-strips-into-gamemaker",
    title: "How to Import Sprite Strips into GameMaker",
    description:
      "Import sprite strips into GameMaker with the _stripN naming rule, set the origin, pick a collision mask that does not snag on walls, and keep pixel art sharp.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-many-frames-per-sprite-animation", "hitboxes-and-hurtboxes-from-sprite-sheets", "pixel-art-sprite-sizes-for-games"],
    tools: ["/gamemaker-sprite-generator", "/ai-sprite-animation-generator", "/pixel-art-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "Name the file so it ends in _stripN, where N is the number of frames (for example spr_player_walk_strip6.png), and import it into a sprite. GameMaker reads the suffix and cuts the image into N equal frames from left to right. Then set the origin to Bottom Centre for characters, give the sprite a manual rectangle collision mask (or a separate mask sprite), set the playback speed in frames per second, and turn off 'Interpolate colours between pixels' if the game is pixel art.",
          "The rest of this guide explains each of those settings, the problems they prevent, and how to read per-frame hitboxes from a JSON file in GML. Menu names are from GameMaker 2024 releases; older versions of GameMaker Studio 2 use the same settings in slightly different places.",
        ],
      },
      {
        heading: "How the _stripN rule works",
        body: [
          "GameMaker checks the end of an image's file name when you import it. If the name ends in _strip followed by a number, the image is treated as a horizontal strip and split into that many frames of equal width. A 384×64 file called spr_slime_idle_strip6.png becomes a 64×64 sprite with six frames. The suffix is removed from the sprite name, so the resource is called spr_slime_idle.",
          "The rule only works for single-row strips with frames of identical width. If the image width does not divide exactly by N, the last frame is cut short and the animation wobbles. Check the arithmetic before importing: 384 / 6 = 64, so every frame is 64 pixels wide.",
        ],
        list: [
          "Good: spr_knight_attack_strip9.png — 9 frames, the suffix is the very last part of the name.",
          "Not recognised: spr_knight_strip9_attack.png — anything after the number breaks the rule.",
          "Not recognised: spr_knight_attack_9.png — the word strip is required.",
          "For multi-row sheets use Image → Convert to Frames in the Sprite Editor instead (set frame width, height, number of frames and frames per row).",
        ],
      },
      {
        heading: "Step-by-step import",
        body: ["This takes about a minute per animation once the file names are right:"],
        steps: [
          "In the Asset Browser, create a new Sprite and name it after the animation, for example spr_player_walk.",
          "Click Import in the sprite window and choose the strip file ending in _stripN. GameMaker shows N frames in the frame strip at the bottom of the editor.",
          "Open the Origin drop-down and choose Bottom Centre for characters and enemies, Middle Centre for projectiles and pickups.",
          "In Collision Mask, set Mode to Manual and Type to Rectangle, then drag the rectangle so it covers the feet and torso but not the weapon or a flowing cape.",
          "Set the playback speed field to Frames per second and enter the speed you want (8–12 for most pixel art walks, see the frame-count guide).",
          "Repeat for each animation, keeping the same canvas size and origin across all of a character's sprites so swapping sprite_index never shifts the character.",
        ],
      },
      {
        heading: "Origin: why Bottom Centre",
        body: [
          "The origin is the point that sits at the instance's x and y. If idle and walk have their origins in different places, the character jumps by a few pixels every time the animation changes. Bottom Centre puts x, y between the feet, which makes ground checks simple (the ground is at y), makes depth sorting by y correct in top-down games, and keeps a horizontal flip with image_xscale = -1 from moving the character sideways.",
          "This only works if every frame has the character standing on the same baseline. Strips exported by SpriteLab are built that way: each frame is the same size, the figure is aligned to a shared ground line, and the background is transparent. If you made the frames yourself, put a temporary 1-pixel line at the feet in your editor and check that it never moves.",
        ],
      },
      {
        heading: "Collision masks that do not snag on walls",
        body: [
          "By default GameMaker builds the mask automatically from the opaque pixels of each frame. That is convenient and almost always wrong for a moving character: when the sword swings out in an attack frame, the mask grows, and the character can get pushed into or stuck inside a wall. 'Precise per frame' makes this worse and is also slower.",
          "The standard fix is to separate the body that collides with the world from the art that animates. Either give every character sprite the same manual rectangle, or create one plain sprite (for example spr_player_mask, a 12×20 rectangle with Bottom Centre origin) and assign it once:",
        ],
        code: {
          lang: "gml",
          caption: "Create event of obj_player",
          text: `// Collide with the world using one fixed box,
// whatever animation is playing.
mask_index = spr_player_mask;

sprite_index = spr_player_idle;
image_speed = 1; // play at the sprite's own fps`,
        },
      },
      {
        heading: "Switching animations in GML",
        body: [
          "Set sprite_index when the state changes, and reset image_index only when you switch to a different sprite, otherwise the animation restarts every step and appears frozen on frame 0. For one-shot animations such as an attack, the Animation End event fires when the last frame has played; use it to return to idle.",
        ],
        code: {
          lang: "gml",
          caption: "Step event — minimal platformer state",
          text: `var _move = keyboard_check(vk_right) - keyboard_check(vk_left);
hsp = _move * 2;

var _next = (_move != 0) ? spr_player_walk : spr_player_idle;
if (attacking) _next = spr_player_attack;

if (sprite_index != _next) {
    sprite_index = _next;
    image_index = 0;
}
if (_move != 0) image_xscale = sign(_move);`,
        },
      },
      {
        heading: "Keeping pixel art sharp",
        body: [
          "Blurry pixel art in GameMaker almost always comes from texture interpolation or from a camera that scales by a fraction. Turn off interpolation in Game Options → (your platform) → Graphics → Interpolate colours between pixels, or call gpu_set_texfilter(false) at game start. Then make the camera size a whole-number fraction of the viewport: a 320×180 camera in a 1280×720 viewport is exactly 4×, and the same camera in a 1920×1080 window is 6×.",
          "Texture pages can also bleed. If you see thin lines from a neighbouring sprite at the edge of a frame, increase the texture group border, keep sprites at whole-pixel positions (floor or round x and y before drawing), and avoid scaling individual sprites by non-integer amounts.",
        ],
        list: [
          "Interpolate colours between pixels: off.",
          "Camera 320×180 or 640×360, viewport an exact multiple of it.",
          "Draw at whole-pixel coordinates; do not rotate pixel sprites by arbitrary angles.",
          "One pixel density for every sprite in the game.",
        ],
      },
      {
        heading: "Reading per-frame hitboxes from JSON",
        body: [
          "A collision mask is one shape per sprite; fighting and action games need different attack and damage boxes on different frames. SpriteLab's engine pack includes a hitboxes.json file next to the strips with, for every animation and frame, a hurtbox (the body) and a hitbox (the part that reaches out — a blade, a fist, a breath attack) in frame pixels measured from the top-left corner. A frame with no strike has a hitbox of null. The boxes are detected automatically from the pixels, so treat them as a solid first draft, not a final balance pass.",
          "Add the file under Included Files, load it once, and convert a frame box into room coordinates using the sprite's origin offset. This example checks the strike against enemies during an attack:",
        ],
        code: {
          lang: "gml",
          caption: "Load once (e.g. in a controller's Create event)",
          text: `var _buf = buffer_load("hitboxes.json");
global.hitboxes = json_parse(buffer_read(_buf, buffer_string));
buffer_delete(_buf);

// In obj_player's Step event, while attacking:
var _frames = global.hitboxes.animations.attack.frames;
var _box = _frames[floor(image_index)].hitbox;
if (is_struct(_box)) {
    var _l = x - sprite_xoffset + _box.x;
    if (image_xscale < 0) _l = x + sprite_xoffset - _box.x - _box.w;
    var _t = y - sprite_yoffset + _box.y;
    var _enemy = collision_rectangle(_l, _t, _l + _box.w, _t + _box.h, obj_enemy, false, true);
    if (_enemy != noone) with (_enemy) take_hit(other.id);
}`,
        },
      },
      {
        heading: "Using SpriteLab strips in GameMaker",
        body: [
          "SpriteLab does not make GameMaker projects or objects; it makes the art and a predictable file layout. When you animate a sprite in SpriteLab and download the engine pack, the gamemaker folder contains one strip per animation already named with the frame count, such as attack_strip6.png. A 4-direction walk comes out as four strips: walk_down_strip4, walk_right_strip4, walk_up_strip4 and walk_left_strip4. Import them as above; you still set the origin, the mask and the code yourself.",
          "Animation frames are delivered at 256 pixels tall. For pixel art that is a 128-pixel grid scaled 2× with nearest-neighbour, so if your game uses a smaller sprite size, scale the strip down by a whole number in a pixel editor before importing rather than scaling the instance in GameMaker.",
        ],
        image: { src: "/showcase/anim-knight-idle.webp", alt: "Pixel art knight idle animation exported as an equal-width strip", pixel: true },
      },
    ],
    faq: [
      {
        q: "Why did GameMaker import my strip as one wide frame?",
        a: "The file name must end in _strip followed by the frame count, with nothing after the number except the extension, such as walk_strip8.png. Otherwise use Image → Convert to Frames in the Sprite Editor.",
      },
      {
        q: "What origin should a GameMaker character sprite use?",
        a: "Bottom Centre for characters and enemies, so x and y sit between the feet. Use the same origin and canvas size for every animation of the character.",
      },
      {
        q: "Should I use precise collision masks for characters?",
        a: "Usually not. Use a manual rectangle or a separate mask sprite assigned to mask_index, and handle attacks with separate per-frame hitboxes.",
      },
      {
        q: "How do I stop pixel art from blurring in GameMaker?",
        a: "Turn off 'Interpolate colours between pixels' in Game Options (or call gpu_set_texfilter(false)) and keep the camera at a whole-number fraction of the viewport size.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "pixel-art-sprite-sizes-for-games",
    title: "Pixel Art Sprite Sizes for Games: 16, 32 or 64?",
    description:
      "How to choose a pixel art sprite size: 16×16 vs 32×32 vs 64×64, how many tiles fit on screen, integer scaling to 1080p and how to set it up in your engine.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-make-pixel-art-sprites-for-games", "how-many-frames-per-sprite-animation", "sprite-sheet-layout-and-texture-atlases"],
    tools: ["/pixel-art-generator", "/ai-tileset-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "Pick the sprite size from the screen, not the other way round. Decide how many tiles the player should see across the screen, choose a low internal resolution that scales by a whole number to common displays (320×180, 384×216, 480×270 or 640×360), and divide. With 16×16 tiles, 320×180 shows 20 tiles across; with 32×32 tiles, 640×360 also shows 20. Both scale cleanly to 1920×1080 (6× and 3×). Most indie games land on 16 or 32 pixel tiles with characters one to two tiles tall.",
        ],
      },
      {
        heading: "What the common sizes are good for",
        body: [
          "Sprite size controls three things at once: how much detail a sprite can carry, how much art you have to produce, and how big the world feels on screen. Smaller sprites are faster to draw and animate, and they read better at a glance; larger sprites carry faces, armour detail and readable weapons, but every extra frame costs much more work.",
        ],
        table: {
          head: ["Size", "Typical use", "Detail you can show"],
          rows: [
            ["8×8", "Tiny retro tiles, bullets, particles", "A silhouette and 2–3 colours"],
            ["16×16", "Tiles and characters in retro or tile-based games", "Readable pose, eyes as 1–2 pixels"],
            ["16×24 / 16×32", "Characters that stand on 16px tiles", "Head, body and legs clearly separated"],
            ["32×32", "The common middle ground for characters and tiles", "Face, simple armour, a readable weapon"],
            ["48×48", "Action games with bigger characters", "Expressions, layered clothing"],
            ["64×64 and up", "Bosses, fighting games, portraits", "Detailed faces, materials, large weapons"],
          ],
        },
      },
      {
        heading: "How many tiles fit on screen",
        body: [
          "The internal resolution divided by the tile size gives the visible play area. This number shapes the design more than art style does: a dungeon crawler wants room to see enemies coming, a platformer wants enough horizontal space to plan jumps, a cosy farming game can afford a closer camera.",
          "Note that 180 is not a multiple of 16, so a 320×180 screen shows 11.25 tiles vertically. That is normal and fine; the camera simply cuts a tile in half at the edge. If you need whole tiles vertically, 320×176 or 384×224 work, but they no longer scale to 1080p exactly.",
        ],
        table: {
          head: ["Internal resolution", "16px tiles", "32px tiles", "Scale to 1920×1080"],
          rows: [
            ["320×180", "20 × 11.25", "10 × 5.6", "6×"],
            ["384×216", "24 × 13.5", "12 × 6.75", "5×"],
            ["480×270", "30 × 16.9", "15 × 8.4", "4×"],
            ["640×360", "40 × 22.5", "20 × 11.25", "3×"],
          ],
        },
      },
      {
        heading: "Integer scaling, and what happens on other screens",
        body: [
          "Pixel art should be scaled by whole numbers so every source pixel becomes the same square block on screen. At 3× each pixel is 3×3; at 2.5× some pixels are 2 wide and some 3, and that unevenness shimmers whenever the camera moves. Render the whole game to a small surface at the internal resolution, then scale that surface up — do not scale individual sprites.",
          "Not every screen is a multiple of your resolution. A 320×180 game on a 1280×800 display (Steam Deck) scales 4× to 1280×720 and leaves 40 pixels of border top and bottom. On a 1366×768 laptop it also scales 4× and leaves a border on all sides. Accept the border (filled with black or a frame), or allow a little extra visible area on those screens instead of a fractional scale.",
        ],
        list: [
          "1280×720: 320×180 at 4×, 640×360 at 2×.",
          "1920×1080: 320×180 at 6×, 480×270 at 4×, 640×360 at 3×.",
          "2560×1440: 320×180 at 8×, 640×360 at 4×.",
          "3840×2160: 320×180 at 12×, 640×360 at 6×.",
        ],
      },
      {
        heading: "Character size versus tile size",
        body: [
          "Characters do not have to match the tile size exactly, but the pixel density must match: a 16px tile and a 32px character drawn at the same pixel scale look fine together; a 16px tile next to a 64px character that was shrunk to fit looks like two different games. Common pairings are a 16×16 tile with a 16×24 or 16×32 character, and a 32×32 tile with a 32×48 or 32×64 character.",
          "Leave a little empty space in the frame for animation. A character that fills its 32×32 canvas edge to edge has no room to swing a sword or lean into a run. Many developers draw on a canvas a size up (48×48 for a 32px character) and keep the body centred, with the feet on the same row in every frame.",
        ],
        image: { src: "/showcase/armored-knight.png", alt: "Pixel art armored knight sprite with room around the figure for animation", pixel: true },
      },
      {
        heading: "Setting it up in Godot, Unity and GameMaker",
        body: [
          "Every engine can do pixel-perfect scaling; the names differ.",
        ],
        list: [
          "Godot 4: Project Settings → Display → Window: Viewport Width/Height 320×180, Stretch Mode 'viewport', Scale Mode 'integer' (Godot 4.2+). Rendering → Textures → Default Texture Filter 'Nearest'.",
          "Unity: set Pixels Per Unit on every sprite to your tile size (16 or 32), Filter Mode 'Point (no filter)', Compression 'None', and add a Pixel Perfect Camera with Assets PPU = the same value and Reference Resolution = 320×180.",
          "GameMaker: a room camera of 320×180 and a viewport of 1280×720 or 1920×1080; turn off 'Interpolate colours between pixels' in Game Options.",
        ],
      },
      {
        heading: "Checking a sprite's real pixel size",
        body: [
          "Many 'pixel art' images, especially from general AI image tools, are drawn at high resolution and only look pixelated. Zoom in: if the blocks are uneven, blurred at the edges or contain gradients, the image is not on a pixel grid and will never scale cleanly. Real pixel art can be scaled down by its block size with nearest-neighbour and back up without changing.",
          "SpriteLab snaps its pixel styles (Pixel 16-bit, Pixel HD, Isometric Pixel) to one pixel grid and a limited palette, and delivers them pre-scaled by a whole number so they are easy to preview. Animation frames, for example, are 256 pixels tall: a 128-pixel grid doubled. If your game uses 32 or 64 pixel characters, scale the image down by the block size in a pixel editor (Aseprite: Sprite → Sprite Size with the Nearest-neighbor method) rather than in the engine, then clean up the few pixels that need it. The tool does not choose your game's resolution for you; that decision stays with you and should come first.",
        ],
      },
      {
        heading: "A decision checklist",
        body: ["Write these down before making any assets, and keep them in the project's readme:"],
        steps: [
          "Target display: 1920×1080 first, then the others you care about (Steam Deck, laptops, phones).",
          "Internal resolution that divides into it: 320×180, 384×216, 480×270 or 640×360.",
          "Tile size: 16 or 32 in most cases; check how many tiles fit on screen.",
          "Character canvas: the tile size or one step larger, with feet on a fixed row.",
          "Palette size and outline rule, shared by every sprite.",
          "Engine settings: nearest filtering, no compression, integer scaling, whole-pixel positions.",
        ],
      },
    ],
    faq: [
      {
        q: "Is 16×16 or 32×32 better for pixel art?",
        a: "Neither is better in general. 16×16 is faster to produce and reads well in retro and tile-based games; 32×32 gives room for faces and readable weapons. Choose from the number of tiles you want on screen at your internal resolution.",
      },
      {
        q: "What resolution should a pixel art game use?",
        a: "320×180 and 640×360 are the most common because they scale by whole numbers to 1280×720, 1920×1080 and 4K. 384×216 and 480×270 also scale cleanly to 1080p.",
      },
      {
        q: "Why does my pixel art shimmer when the camera moves?",
        a: "It is being scaled by a non-integer factor or drawn at sub-pixel positions. Scale the whole screen by a whole number and round sprite and camera positions to whole pixels.",
      },
      {
        q: "Can I mix 16px and 32px sprites?",
        a: "Yes, as long as they are drawn at the same pixel density and scaled by the same factor. A 32px boss next to 16px enemies is fine; a sprite shrunk from 64px to 32px is not.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-many-frames-per-sprite-animation",
    title: "How Many Frames Should a Sprite Animation Have?",
    description:
      "Frame counts and fps for idle, walk, run, attack, jump, hurt and death animations, how to time frames unevenly, and how to match walk speed to movement.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-make-a-sprite-sheet-with-ai", "hitboxes-and-hurtboxes-from-sprite-sheets", "how-to-make-a-4-direction-top-down-rpg-character"],
    tools: ["/walk-cycle-generator", "/ai-sprite-animation-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "For most 2D games: an idle needs 2–6 frames at 4–8 fps, a walk 4–8 frames at 8–12 fps, a run 6–8 frames at 10–14 fps, an attack 3–8 frames with uneven timing, a hurt reaction 2–3 frames and a death 4–8 frames. Fewer frames are not a shortcut that looks cheap; they are a style. What makes an animation feel good is timing — which frames you hold and which you skip — far more than the raw count.",
        ],
      },
      {
        heading: "Frame count and fps by animation type",
        body: [
          "These ranges are starting points for pixel art and hand-drawn 2D sprites. Smaller sprites (16–32 px) sit at the low end; larger, higher-resolution characters need more frames because every movement covers more pixels and gaps become visible.",
        ],
        table: {
          head: ["Animation", "Frames", "Speed", "Notes"],
          rows: [
            ["Idle", "2–6", "4–8 fps", "Subtle breathing; loops; must not draw attention"],
            ["Walk", "4–8", "8–12 fps", "Contact, down, passing, up for each leg"],
            ["Run", "6–8", "10–14 fps", "Longer stride, a frame with both feet off the ground"],
            ["Attack", "3–8", "uneven", "Anticipation, strike, follow-through, recovery"],
            ["Jump", "3–5 poses", "state-driven", "Take-off, rise, apex, fall, land as separate states"],
            ["Hurt", "2–3", "8–12 fps", "Short and readable; often with a flash"],
            ["Death", "4–8", "8–10 fps", "Does not loop; holds the last frame"],
          ],
        },
      },
      {
        heading: "The poses that carry each motion",
        body: [
          "Before deciding how many frames to draw, decide which poses the motion cannot do without. Everything else is an in-between, and in-betweens are the first thing to cut when a sprite is small or time is short.",
          "A walk has four key poses per step: contact (both feet on the ground, legs widest apart), down (the body at its lowest, weight on the front leg), passing (the back leg swings past the standing leg) and up (the body at its highest as it pushes off). Draw them for the left step, mirror the leg roles for the right, and you have an 8-frame cycle. Drop down and up and you have the classic 4-frame walk; the up-and-down bob of the head then has to be faked by moving the whole sprite one pixel on the passing frames.",
          "An attack needs at least anticipation (pulling back), strike (the weapon at full extension, often with a smear or motion trail) and recovery (returning to the guard pose). A run differs from a walk by a frame where both feet are off the ground and by a forward lean. A hurt reaction only needs a recoil pose and the return, which is why two or three frames are enough when combined with a white flash or a knock-back.",
        ],
      },
      {
        heading: "Loop length: the arithmetic",
        body: [
          "The duration of one loop is frames divided by fps. A 6-frame walk at 10 fps loops every 0.6 seconds, an 8-frame walk at 12 fps every 0.67 seconds. A relaxed human walk takes roughly one second for a full cycle of two steps, so game walks are usually a little faster than life, which reads as lively rather than sluggish.",
          "Engines differ in how they express speed. Godot's SpriteFrames uses fps per animation. GameMaker sprites use frames per second or frames per game frame. Unity clips have a sample rate, and the spacing of keyframes on the timeline sets how long each sprite shows. They all come down to the same number: how long each drawing stays on screen.",
        ],
      },
      {
        heading: "Hold some frames longer than others",
        body: [
          "Even timing is what makes many generated or beginner animations feel floaty. Real motion accelerates and decelerates: an attack has a slow wind-up, an almost instant strike and a held follow-through. Showing every frame for the same time flattens that.",
          "A typical 6-frame sword attack might be timed like this at a base of 12 fps: wind-up 2 frames held for 3 ticks each, strike 1 frame for 1 tick, impact 1 frame for 2 ticks, follow-through 2 frames for 2 ticks each. The player sees the anticipation clearly, the hit lands immediately, and the recovery leaves a window for the enemy to punish.",
        ],
        list: [
          "Godot 4: each frame in SpriteFrames has a duration multiplier; set the wind-up frames to 2.0 or 3.0.",
          "Unity: spread keyframes unevenly on the Animation timeline, or duplicate a sprite key.",
          "GameMaker: duplicate frames in the Sprite Editor, or use a Sequence with per-frame lengths.",
          "Any engine: an impact pause (hit-stop) of 2–6 game frames when an attack connects sells the hit better than extra drawings.",
        ],
      },
      {
        heading: "Match the walk to the movement speed",
        body: [
          "Foot sliding happens when the character moves across the ground faster or slower than its feet move. Measure how far a planted foot travels backwards over one full cycle in your sheet — that is the distance the body should move in one loop. Then movement speed in pixels per second is that distance divided by the loop duration.",
          "Example: in an 8-frame walk at 10 fps (0.8 s per loop) the planted foot covers 32 pixels per cycle, so the character should move at 32 / 0.8 = 40 pixels per second. If your design needs a faster character, raise the animation fps proportionally rather than just increasing the speed, or the feet will skate.",
        ],
        code: {
          lang: "gdscript",
          caption: "Godot 4: tie animation speed to movement speed",
          text: `const STRIDE_PX := 32.0     # distance per walk cycle, measured on the sheet
const FRAMES := 8
const BASE_FPS := 10.0

func _physics_process(_delta: float) -> void:
    var speed := velocity.length()
    if speed > 1.0:
        $AnimatedSprite2D.play("walk")
        # 40 px/s plays at the authored 10 fps; faster movement plays faster.
        var authored_speed := STRIDE_PX / (FRAMES / BASE_FPS)
        $AnimatedSprite2D.speed_scale = speed / authored_speed
    else:
        $AnimatedSprite2D.play("idle")
        $AnimatedSprite2D.speed_scale = 1.0`,
        },
      },
      {
        heading: "Jumps are states, not one animation",
        body: [
          "A jump is controlled by physics, so its length changes with how long the player holds the button. Rather than one long animation, split it into short pieces and pick by vertical velocity: a take-off frame or two on the ground, a rising pose while velocity points up, an apex pose when it is near zero, a falling pose while it points down, and a landing squash of 1–2 frames when the character touches the ground.",
        ],
        image: { src: "/showcase/anim-dog-jump.gif", alt: "Pixel art dog jump animation from crouch to landing", pixel: true },
      },
      {
        heading: "Where more frames do not help",
        body: [
          "Extra frames cost time to draw, review and fix, and at small sizes they can make animation look mushy: if a 16 px character's arm moves one pixel between frames, adding an in-between that also moves it one pixel just doubles the frame without adding motion. The test is whether each new frame shows a pose the player can actually see.",
          "More frames do help for large sprites, slow and smooth motions (a floating spirit, a waving flag, water), and anything filmed in close-up such as a portrait or a title screen.",
        ],
      },
      {
        heading: "How SpriteLab's frame options map to this",
        body: [
          "In SpriteLab's Animate tool you choose 4, 6 or 9 key poses for an AI animation (7, 11 or 12 credits). Smooth mode adds AI in-between frames, giving 8, 12 or 18 frames for 5 or 7 extra credits. The preview sets a starting speed — 8 fps for 4 poses, 10 fps for 6 and 12 fps for 9; smooth mode doubles it so the loop keeps the same length — which you can change before downloading. Idle breathing and hovering are done differently: the original sprite is gently deformed over 24 frames instead of redrawn, which avoids flicker and costs 3 credits.",
          "What SpriteLab does not do is time the frames for you: every frame in the exported strip is shown for the same time. Holding wind-up frames, adding hit-stop and matching walk speed to movement all happen in your engine, as described above.",
        ],
        image: { src: "/showcase/anim-witch-walk.webp", alt: "Pixel art witch walk cycle with evenly spaced frames", pixel: true },
      },
    ],
    faq: [
      {
        q: "How many frames should a walk cycle have?",
        a: "Four to eight frames for most 2D games. Four is enough for small pixel sprites; eight gives a smoother, heavier walk for larger characters.",
      },
      {
        q: "What fps should pixel art animations run at?",
        a: "Usually 8–12 fps for walks and attacks, 4–8 fps for idles. The game itself still runs at 60 fps; only the sprite changes less often.",
      },
      {
        q: "Why does my attack animation feel weak?",
        a: "The timing is probably even. Hold the anticipation frames longer, make the strike frame very short, and add a brief hit-stop when the attack connects.",
      },
      {
        q: "How do I stop feet sliding in a walk cycle?",
        a: "Measure how far a planted foot moves per loop and set the movement speed to that distance divided by the loop duration, or scale the animation speed with the movement speed.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "how-to-make-a-4-direction-top-down-rpg-character",
    title: "How to Make a 4-Direction Top-Down RPG Character",
    description:
      "Build a 4-direction RPG character sheet: row order conventions, when mirroring left from right works, standing frames, input handling and the usual pitfalls.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-many-frames-per-sprite-animation", "how-to-use-sprite-sheets-in-godot-4", "sprite-sheet-layout-and-texture-atlases"],
    tools: ["/walk-cycle-generator", "/top-down-sprite-generator", "/rpg-character-creator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "A 4-direction top-down character needs the same walk drawn facing down (towards the camera), right, up (away from the camera) and left, usually as a grid with one direction per row and 3–4 frames per row. Pick a row order and keep it for every character in the game, decide whether the left row is a mirrored copy of the right row, and use a standing frame per direction for when the player stops. In code, choose the facing from the dominant input axis and play the matching row.",
        ],
      },
      {
        heading: "Row order: there is no single standard",
        body: [
          "Different tools and asset packs order the rows differently, and mixing them is the most common reason a character walks backwards on the first try. Write your order down and convert every sheet you buy or make into it.",
        ],
        table: {
          head: ["Source", "Row 1", "Row 2", "Row 3", "Row 4", "Frames per row"],
          rows: [
            ["RPG Maker MV/MZ character sheets", "Down", "Left", "Right", "Up", "3"],
            ["LPC (Liberated Pixel Cup) walk sheets", "Up", "Left", "Down", "Right", "9"],
            ["SpriteLab 4-direction walk", "Down", "Right", "Up", "Left", "4"],
          ],
        },
      },
      {
        heading: "Frames per direction",
        body: [
          "Three frames per row (left step, standing, right step, played as 1-2-3-2) is the classic minimum and still looks good at 16–32 px. Four frames gives a cleaner cycle: left foot forward, feet passing, right foot forward, feet passing. Six to eight frames per row makes sense for larger characters or a slower, heavier walk.",
          "Front and back views are harder than side views because the legs move towards and away from the camera. The movement shows mostly as one leg being slightly lower and the body bobbing by one pixel. Exaggerate the bob and the arm swing a little; at small sizes a physically accurate walk often reads as standing still.",
        ],
      },
      {
        heading: "Mirroring left from right: when it works",
        body: [
          "Drawing only the right-facing row and flipping it horizontally for the left halves the side-view work, and most players never notice. It breaks on anything asymmetric, because the flipped copy swaps it to the other side:",
        ],
        list: [
          "Weapons and shields: a sword in the right hand ends up in the left hand when the character faces left.",
          "Hair partings, eye patches, scars, badges and single shoulder pads jump sides.",
          "Lighting: if the art is lit from the top-left, the flipped row is lit from the top-right.",
          "Text or symbols on clothing read backwards.",
        ],
        after: [
          "If the character has a strong asymmetric feature, draw both side rows. Otherwise mirroring is a reasonable trade, and in engines it is free: flip the sprite at runtime (flip_h in Godot, flipX on Unity's SpriteRenderer, image_xscale = -1 in GameMaker) and you do not even need the fourth row. Keeping a real left row in the sheet is still useful if you plan to fix those details later.",
        ],
      },
      {
        heading: "Standing still: which frame to show",
        body: [
          "When the player stops, show a neutral pose for the current facing. If you have no separate idle per direction, use the passing frame of the walk (feet together), not the first frame — the first frame of most walk cycles is a stride, and stopping on it looks like the character froze mid-step.",
          "A separate set of standing poses for all four directions is the cleaner solution. It can be as simple as one frame per direction, or a slow 2–4 frame breathing loop for each.",
        ],
        image: { src: "/showcase/rotate-knight.png", alt: "Pixel art knight shown from the front, right, back and left as a direction sheet", pixel: true },
      },
      {
        heading: "Choosing the facing from input",
        body: [
          "Read the movement input as a vector and pick the axis with the larger magnitude. On a perfect diagonal both are equal; resolve ties by keeping the current facing, otherwise the character flickers between two rows when the stick sits near 45°. Store the last facing so the standing pose points the way the player was walking.",
        ],
        code: {
          lang: "gdscript",
          caption: "Godot 4: CharacterBody2D with walk_down / walk_right / walk_up / walk_left",
          text: `extends CharacterBody2D

const SPEED := 60.0
var facing := "down"
@onready var anim: AnimatedSprite2D = $AnimatedSprite2D

func _physics_process(_delta: float) -> void:
    var input := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
    velocity = input * SPEED
    move_and_slide()

    if input == Vector2.ZERO:
        anim.animation = "walk_" + facing
        anim.stop()
        anim.frame = 1  # feet passing: a neutral standing pose
        return

    if absf(input.x) > absf(input.y):
        facing = "right" if input.x > 0.0 else "left"
    elif absf(input.y) > absf(input.x):
        facing = "down" if input.y > 0.0 else "up"
    # equal: keep the current facing to avoid flicker on diagonals

    anim.play("walk_" + facing)`,
        },
      },
      {
        heading: "Top-down pitfalls",
        body: ["These problems show up in almost every first top-down prototype:"],
        list: [
          "Collision box on the whole sprite: use a small box at the feet only, so the character can walk 'behind' the top of a wall or tree.",
          "Wrong draw order: sort by the y of the feet (Godot: enable Y Sort on the parent and put the origin at the feet; Unity: Transparency Sort Axis (0, 1, 0) with a bottom pivot; GameMaker: depth = -y).",
          "Different heights per direction: the back view drawn a pixel taller than the front makes the character pop when turning. Keep the same canvas and ground line for every row.",
          "Diagonal speed: normalise the input vector (Input.get_vector already does) so diagonals are not 41% faster.",
          "Animation speed tied to frames, not distance: a walk that loops at 6 fps should move a matching distance per loop, or the feet slide.",
        ],
      },
      {
        heading: "When eight directions are worth it",
        body: [
          "Eight directions add the four diagonals: down-right, up-right, up-left and down-left. They matter when the character moves freely rather than along a grid — twin-stick shooters, action RPGs, isometric games — because a character walking diagonally while facing straight sideways looks like it is sliding. On a tile grid where movement is mostly horizontal and vertical, the diagonals are rarely seen and the extra work is hard to justify.",
          "The cost is real: eight directions is roughly twice the art of four for every animation that needs facing, not just the walk. With mirroring, you draw five directions (down, down-right, right, up-right, up) and flip three. For input, split the circle into eight 45° sectors around the movement angle instead of comparing the axes, and add a few degrees of hysteresis at the borders so an analogue stick resting near a boundary does not flicker between two rows.",
        ],
      },
      {
        heading: "Making the sheet with SpriteLab",
        body: [
          "SpriteLab's Animate tool has a '4-direction walk' option for characters and creatures (12 credits). It draws the walk facing the viewer, facing right and facing away — 4 steps each — from the sprite you already made, and builds the left row by mirroring the right row, so the asymmetry caveats above apply. The result is a 4×4 sheet in the order down, right, up, left at 6 fps, with every frame the same size on one ground line. The engine pack splits it into walk_down, walk_right, walk_up and walk_left for Godot, Unity and GameMaker.",
          "For standing poses, the separate '4 directions' option (6 credits) draws the same sprite from the front, right, back and left in a neutral stance — useful as idle frames. SpriteLab does not make a different idle animation per direction, and it cannot guarantee that a held item stays in the correct hand after mirroring; check those frames and fix them in a pixel editor if your character carries something distinctive.",
        ],
        image: { src: "/showcase/rotate-lizard.webp", alt: "Pixel art lizard creature drawn from four directions at the same size", pixel: true },
      },
    ],
    faq: [
      {
        q: "What order should the rows of a 4-direction sprite sheet be in?",
        a: "Any order works if it is consistent. Common ones are down, left, right, up (RPG Maker) and up, left, down, right (LPC). SpriteLab uses down, right, up, left.",
      },
      {
        q: "Can I mirror the right-facing walk for the left?",
        a: "Yes, unless the character is visibly asymmetric. Mirroring moves weapons to the other hand and flips lighting, hair partings and markings.",
      },
      {
        q: "How many frames does a top-down walk need?",
        a: "Three or four per direction is enough for 16–32 px characters. Larger sprites look better with six to eight.",
      },
      {
        q: "Should a top-down character have 4 or 8 directions?",
        a: "Four is enough for most tile-based RPGs and much less work. Eight suits free-moving action games and isometric views, at twice the art.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "hitboxes-and-hurtboxes-from-sprite-sheets",
    title: "Hitboxes and Hurtboxes from Sprite Sheets",
    description:
      "Hitboxes, hurtboxes and pushboxes for 2D sprites: active frames, per-frame boxes from a sprite sheet, and code for Godot 4, Unity and GameMaker.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-many-frames-per-sprite-animation", "how-to-import-sprite-strips-into-gamemaker", "how-to-use-sprite-sheets-in-godot-4"],
    tools: ["/ai-sprite-animation-generator", "/game-weapon-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "Give every animated character three kinds of box: a pushbox (or collision box) that collides with walls and other bodies and never changes, a hurtbox that covers the body and can be damaged, and a hitbox that only exists on the frames where an attack can land. Store hurtbox and hitbox rectangles per frame, in pixels relative to the frame, and move them with the animation. Turn the hitbox on during the active frames only and make sure each swing hits each target once.",
        ],
      },
      {
        heading: "Three boxes, three jobs",
        body: [
          "Mixing these up is behind most 'my sword pushes enemies through walls' and 'I got hit by the end of an animation' bugs. Keep them on separate collision layers so each only meets what it should.",
        ],
        table: {
          head: ["Box", "What it does", "Changes per frame?", "Collides with"],
          rows: [
            ["Pushbox", "Stops the character at walls and other bodies", "No (or rarely: crouching)", "World, other pushboxes"],
            ["Hurtbox", "Where the character can be hit", "Yes, follows the body", "Enemy hitboxes"],
            ["Hitbox", "What deals damage", "Yes, only on active frames", "Enemy hurtboxes"],
          ],
        },
      },
      {
        heading: "Startup, active and recovery frames",
        body: [
          "Every attack has three phases. Startup is the wind-up before it can hit; active frames are when the hitbox exists; recovery is the time after, when the attacker is vulnerable. The ratio of the three is what makes an attack feel fast, heavy, safe or risky, and it is the main thing you tune in a combat system — not the drawings.",
          "In a 6-frame sword swing, frames 1–2 are typically startup, frames 3–4 active, frames 5–6 recovery. A light jab might have one startup frame and one active frame; a heavy overhead can have four startup frames. If the art is generated or drawn by someone else, decide the active frames after looking at the animation: the hitbox should appear on the first frame where the weapon is clearly travelling at the target.",
        ],
      },
      {
        heading: "Converting sprite frames into game frames",
        body: [
          "Animations play at 8–12 fps, but the game logic usually runs at 60 updates per second, and combat timing is easier to reason about in those game frames. At 10 fps each sprite frame stays on screen for 6 game frames (100 ms); at 12 fps for 5 (about 83 ms). A 6-frame attack at 10 fps lasts 36 game frames, 0.6 seconds.",
          "That gives you concrete numbers to tune. If frames 3 and 4 of that attack are active, the hitbox exists for 12 game frames — 200 ms — which is generous; making only frame 3 active halves it. Startup of 2 sprite frames is 12 game frames, about the shortest wind-up a player can still react to visually. Recovery of 2 frames leaves a 200 ms window to punish a missed swing. When an attack feels too fast or too slow, change the timing of individual frames first and keep the drawings.",
          "Do the hit detection in the physics or fixed update, not in rendering, and read the current animation frame there. Otherwise a slow frame can skip the one update where the hitbox overlapped.",
        ],
      },
      {
        heading: "Storing boxes per frame",
        body: [
          "The simplest portable format is a list of rectangles per animation, one entry per frame, in pixels of the frame with the origin at the top-left. Store null when there is no box. Keeping it in a data file rather than in code lets you tweak numbers without recompiling and reuse them across engines.",
          "This is the format of the hitboxes.json file in SpriteLab's engine pack:",
        ],
        code: {
          lang: "json",
          caption: "hitboxes.json (shortened, example values)",
          text: `{
  "character": "knight",
  "animations": {
    "attack": {
      "fps": 10,
      "loop": false,
      "frameWidth": 256,
      "frameHeight": 256,
      "frames": [
        { "hurtbox": { "x": 92, "y": 60, "w": 70, "h": 172 }, "hitbox": null },
        { "hurtbox": { "x": 90, "y": 62, "w": 72, "h": 170 }, "hitbox": null },
        { "hurtbox": { "x": 96, "y": 64, "w": 70, "h": 168 }, "hitbox": { "x": 170, "y": 70, "w": 78, "h": 60 } }
      ]
    }
  }
}`,
        },
      },
      {
        heading: "How the automatic boxes are found",
        body: [
          "SpriteLab detects these boxes from the pixels, which is worth understanding before you trust them. The hurtbox is the range of columns and rows that contain a solid share of the sprite's opaque pixels, so a thin sword or a wisp of fire does not stretch the body. The hitbox is made of the opaque pixels that stick out beyond that body and were not already there in the animation's first frame — so a sword resting at the character's side is ignored, and the same sword swung forward counts as a strike. When nothing reaches out, the hitbox is null.",
          "This works well for clear strikes: a weapon swing, a punch, a breath attack, a lunge. It cannot know your design: it does not separate startup from active frames, it may mark a big follow-through as a hitbox, and it boxes the whole reach of a wide swing as one rectangle. Use the numbers as a first draft, then disable the hitbox on frames you consider startup or recovery and shrink boxes that feel unfair.",
        ],
        image: { src: "/showcase/flame-blade.png", alt: "Pixel art flaming sword whose blade would form the hitbox in an attack frame", pixel: true },
      },
      {
        heading: "Godot 4: moving boxes with the animation",
        body: [
          "Put two Area2D nodes under the character — Hurtbox and Hitbox — each with a CollisionShape2D using a RectangleShape2D (tick 'Local to Scene' on the shape so instances do not share it). On frame_changed, read the current frame's boxes and convert them from frame pixels to node coordinates. AnimatedSprite2D is centred by default, so subtract half the frame size, mirror x when the sprite is flipped, and multiply by the sprite's scale.",
        ],
        after: [
          "Godot only exports resources by default. Because hitboxes.json is a plain data file, add *.json to 'Filters to export non-resource files/folders' in the export preset's Resources tab, or the file will be missing from the exported game even though it works in the editor.",
        ],
        code: {
          lang: "gdscript",
          caption: "Godot 4.x",
          text: `extends CharacterBody2D

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var hurt_shape: CollisionShape2D = $Hurtbox/CollisionShape2D
@onready var hit_shape: CollisionShape2D = $Hitbox/CollisionShape2D
var boxes: Dictionary = {}

func _ready() -> void:
    var text := FileAccess.get_file_as_string("res://spritelab_knight/hitboxes.json")
    boxes = JSON.parse_string(text)["animations"]
    sprite.frame_changed.connect(_sync_boxes)
    sprite.animation_changed.connect(_sync_boxes)
    _sync_boxes()

func _sync_boxes() -> void:
    var anim: Dictionary = boxes.get(String(sprite.animation), {})
    if anim.is_empty():
        return
    var frame: Dictionary = anim["frames"][sprite.frame]
    var size := Vector2(anim["frameWidth"], anim["frameHeight"])
    _apply(hurt_shape, frame["hurtbox"], size)
    _apply(hit_shape, frame["hitbox"], size)

func _apply(shape: CollisionShape2D, box, frame_size: Vector2) -> void:
    if box == null:
        shape.set_deferred("disabled", true)
        return
    var rect_size := Vector2(box["w"], box["h"])
    var center := Vector2(box["x"], box["y"]) + rect_size / 2.0 - frame_size / 2.0
    if sprite.flip_h:
        center.x = -center.x
    (shape.shape as RectangleShape2D).size = rect_size * sprite.scale.abs()
    shape.position = sprite.position + center * sprite.scale.abs()
    shape.set_deferred("disabled", false)`,
        },
      },
      {
        heading: "Unity: setting a BoxCollider2D from frame pixels",
        body: [
          "Unity measures in world units and y points up, so convert with your Pixels Per Unit and flip the y axis. With a Bottom Center pivot (recommended for characters), the frame's bottom edge is at local y = 0. JsonUtility cannot read objects keyed by animation name, so either parse the file with the Newtonsoft Json package (com.unity.nuget.newtonsoft-json) or convert it once into a ScriptableObject. The conversion itself is a few lines:",
        ],
        code: {
          lang: "csharp",
          caption: "Bottom Center pivot; call from an Animation Event or when the frame changes",
          text: `public static void ApplyBox(BoxCollider2D col, RectInt box, int frameW, int frameH,
                            float ppu, bool flipX)
{
    float cx = (box.x + box.width / 2f - frameW / 2f) / ppu;
    float cy = (frameH - box.y - box.height / 2f) / ppu;   // y up, from the feet
    col.offset = new Vector2(flipX ? -cx : cx, cy);
    col.size = new Vector2(box.width / ppu, box.height / ppu);
}`,
        },
      },
      {
        heading: "GameMaker and other engines",
        body: [
          "In GameMaker, keep the world collision on a fixed mask_index and test the strike with collision_rectangle, converting from frame pixels with sprite_xoffset and sprite_yoffset; the GameMaker strip guide has a complete example. In any other engine the conversion is the same idea: frame position minus the sprite's origin, mirrored when the sprite is flipped, times the sprite's scale.",
        ],
      },
      {
        heading: "Rules that prevent most combat bugs",
        body: [],
        list: [
          "One hit per swing: keep a list of targets already hit during the current attack and clear it when the attack starts.",
          "Hitboxes only on active frames; never leave them on during recovery.",
          "Hurtboxes slightly smaller than the art, hitboxes slightly smaller than the weapon — players forgive near-misses, not hits that never touched.",
          "Put boxes on dedicated layers so a hitbox never collides with walls or with its owner.",
          "Draw the boxes in a debug view (Godot: Debug → Visible Collision Shapes) and step through attacks one frame at a time.",
          "If you flip the sprite, flip the boxes in the same frame, not one frame later.",
        ],
      },
    ],
    faq: [
      {
        q: "What is the difference between a hitbox and a hurtbox?",
        a: "A hitbox deals damage and exists only while an attack is active. A hurtbox is the area that can receive damage, usually covering the body on every frame.",
      },
      {
        q: "Should hitboxes match the sprite exactly?",
        a: "No. Most games make them slightly smaller than the art so hits feel fair, and use simple rectangles rather than pixel-precise shapes.",
      },
      {
        q: "Can hitboxes be generated automatically from a sprite sheet?",
        a: "A first draft can. SpriteLab's engine pack includes per-frame hurtboxes and hitboxes detected from the pixels; you still choose the active frames and tune sizes for your game.",
      },
      {
        q: "Why does my character get stuck in walls when attacking?",
        a: "The world collision uses the animated sprite's mask, which grows when the weapon swings. Use a fixed collision box for movement and separate per-frame hitboxes for attacks.",
      },
    ],
  },

  // ───────────────────────────────────────────────────────────────────────────
  {
    slug: "sprite-sheet-layout-and-texture-atlases",
    title: "Sprite Sheet Layout: Strips, Grids and Texture Atlases",
    description:
      "Strips, grid sheets and packed atlases compared: frame padding, texture bleeding, texture size limits and memory, with settings for Unity, Godot and GameMaker.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-import-sprite-sheets-into-unity", "how-to-use-sprite-sheets-in-godot-4", "pixel-art-sprite-sizes-for-games"],
    tools: ["/ai-sprite-animation-generator", "/ai-sprite-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "Keep your source animations as simple strips or grids of equal-size frames — they are easy to slice, edit and replace — and let the engine pack them into texture atlases for the build. Use equal cells with a shared baseline for animations, add 1–2 pixels of padding (or extrusion) around frames that are filtered or scaled, keep single textures at or below 4096 pixels on a side if you target older phones, and remember that an uncompressed RGBA texture costs width × height × 4 bytes of video memory.",
        ],
      },
      {
        heading: "Three layouts and when to use them",
        body: [
          "A horizontal strip holds one animation in one row. It is the easiest format to reason about: frame width is image width divided by frame count, and every engine can split it. A grid sheet stacks several rows — several animations, or several directions of one animation — on one image. A packed atlas places sprites of different sizes wherever they fit, trimming empty space, and keeps a data file with each sprite's rectangle and offset.",
        ],
        table: {
          head: ["Layout", "Best for", "Watch out for"],
          rows: [
            ["Strip (1 row)", "One animation; editing and swapping", "Long strips get very wide"],
            ["Grid (rows × cols)", "Directional walks, small animation sets", "Everyone must agree on row order"],
            ["Packed atlas", "Shipping builds, many sprites, mobile", "Needs a data file; trimmed frames need offsets"],
          ],
        },
      },
      {
        heading: "Why equal cells matter for animation",
        body: [
          "When every frame has the same width and height and the character stands on the same row of pixels in each, slicing is mechanical and the pivot stays still. Trimmed frames — each cut to its visible pixels — save memory but give every frame a different size; without stored offsets the character jumps around as the animation plays. Atlas tools handle this by remembering each frame's original position; Unity's automatic slicing does not, which is why animation sheets should be sliced by cell size, not automatically.",
        ],
      },
      {
        heading: "Padding, bleeding and extrusion",
        body: [
          "Texture bleeding is a thin line of a neighbouring frame appearing at the edge of a sprite. It happens when the GPU samples slightly outside a frame's rectangle: with bilinear filtering, with mipmaps, or when sprites are drawn at non-integer positions or scales. Pixel art drawn with nearest filtering at whole-pixel positions rarely bleeds; painted art that is filtered and scaled almost always will without padding.",
          "Padding is empty transparent space between frames, typically 2 pixels (4–8 with mipmaps). Extrusion repeats each frame's edge pixels outward into that space, so even if the sampler strays, it picks up the right colour — important for tiles, which have opaque edges. Atlas packers add both for you; hand-made sheets often have neither.",
        ],
        list: [
          "Unity Sprite Atlas: Padding 2, 4 or 8; turn off Allow Rotation and Tight Packing if sprites look cut off.",
          "Godot 4: TileSet atlases have Margins and Separation; for animation sheets, Nearest filtering avoids most bleeding.",
          "GameMaker: texture groups have a Border setting; increase it if neighbouring sprites bleed in.",
        ],
      },
      {
        heading: "Texture size limits and memory",
        body: [
          "Desktop GPUs accept 8192 or 16384 pixel textures; 4096 is the safe maximum if you support older phones and some web targets. Engines also have their own import caps: Unity's default Max Size is 2048, so a wider sheet is silently scaled down at import, which blurs pixel art and breaks slicing. Raise Max Size to at least the sheet's longest side.",
          "Long strips hit these limits sooner than you expect. An 18-frame animation at 256 pixels per frame is 4608 pixels wide — over 4096 and over Unity's default. Split it into rows, export individual frames and let the engine pack them, or downscale the art if your game uses smaller sprites anyway.",
        ],
        table: {
          head: ["Texture", "Uncompressed RGBA", "With mipmaps (+33%)"],
          rows: [
            ["1024 × 1024", "4 MiB", "≈5.3 MiB"],
            ["2048 × 2048", "16 MiB", "≈21.3 MiB"],
            ["4096 × 4096", "64 MiB", "≈85.3 MiB"],
            ["4608 × 256 strip", "4.5 MiB", "2D sprites usually skip mipmaps"],
          ],
        },
      },
      {
        heading: "Do textures still need to be powers of two?",
        body: [
          "For plain 2D sprites, no: modern engines and GPUs handle any size. Powers of two still matter in specific cases — some compressed formats on older mobile hardware require them, mipmapping behaves best with them, and atlas packers often round page sizes up to them anyway. If you let the engine build atlases, you do not need to think about this for individual sheets.",
        ],
      },
      {
        heading: "Letting the engine pack the atlas",
        body: [
          "All three popular engines can build atlases from separate sprites for you, which is usually the best of both worlds: you keep simple source files and the build gets efficient textures.",
          "In Unity, create a Sprite Atlas asset (Assets → Create → 2D → Sprite Atlas), add the folders that hold a character's sprites and enable Sprite Packer Mode in Project Settings → Editor. Sprites keep their own import settings and pivots; the atlas only changes how they are stored. Godot 4 imports each PNG as its own texture and does not pack sprites automatically; for many small images you can use an AtlasTexture per region of a sheet — which is exactly what a SpriteFrames .tres does — or a texture packer before import. GameMaker always packs sprites onto texture pages; group the sprites that appear together into the same texture group so a level does not need to swap pages while it draws.",
          "Whichever engine you use, pack by usage, not by type: one atlas for the player and their effects, one per enemy family, one for UI. That keeps memory down because only the atlases a scene actually needs are loaded.",
        ],
      },
      {
        heading: "Naming and folder conventions",
        body: [
          "A predictable naming scheme saves more time than any packing trick. Name files by character, animation and, where relevant, direction and frame count: knight_attack_strip6.png, knight_walk_down_strip4.png. Keep one folder per character, keep the source sheets out of the build folder if your engine packs atlases from separate frames, and write the frame size, fps, pivot and row order into a small readme or data file next to the art.",
          "SpriteLab's engine pack follows this pattern for one character: a godot folder with a SpriteFrames .tres and one strip per animation in godot/sheets, a unity folder with one subfolder of numbered frames per animation, a gamemaker folder with _stripN files, a hitboxes.json with per-frame boxes, fps and loop flags, and a README.txt. A 4-direction walk is split into one strip per direction.",
        ],
        image: { src: "/showcase/anim-witch-walk.webp", alt: "Pixel art witch walk animation exported as equal-size frames", pixel: true },
      },
      {
        heading: "A layout checklist",
        body: ["Before importing a sheet into any engine, check:"],
        steps: [
          "Image width divided by columns, and height divided by rows, are whole numbers.",
          "The character's feet sit on the same pixel row in every frame of the animation.",
          "The background is real transparency, not a white or checkerboard fill.",
          "No texture is larger than your target platform and the engine's import Max Size allow.",
          "Filtered or scaled art has padding or extrusion; pixel art uses nearest filtering.",
          "Row order and frame counts are written down next to the files.",
        ],
      },
    ],
    faq: [
      {
        q: "Should I use a sprite sheet or individual images?",
        a: "Either works for source files. Engines pack individual images into atlases for the build, so choose whatever is easiest to edit; equal-size strips are the most portable.",
      },
      {
        q: "How much padding should sprite sheet frames have?",
        a: "Two pixels is a common default; use 4–8 if mipmaps are enabled. Pixel art drawn with nearest filtering at whole-pixel positions often needs none.",
      },
      {
        q: "What is the maximum sprite sheet size?",
        a: "4096×4096 is safe on almost all hardware including older phones; desktop GPUs accept 8192 or 16384. Unity's default import Max Size is 2048, so raise it for larger sheets.",
      },
      {
        q: "Why do lines appear at the edges of my sprites?",
        a: "Texture bleeding from neighbouring frames. Add padding or extrusion, use nearest filtering for pixel art, turn off mipmaps for 2D sprites and draw at whole-pixel positions.",
      },
    ],
  },
];
