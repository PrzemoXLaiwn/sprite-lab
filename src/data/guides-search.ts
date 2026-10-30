// =============================================================================
// Search-intent guides (Oct 2026). Same shape as guides.ts.
// SpriteLab facts must match geo-content.ts, the licence config and the
// view/pose lines in src/config/prompts/sprite-prompt.ts.
// =============================================================================

import type { Guide } from "@/data/guides";
import { COMMERCIAL_LICENCE_ANSWER, LICENCE_CHANGE_DATE } from "@/config/licence";
import { SIGNUP_CREDITS } from "@/config/signup";

const UPDATED = "2026-10-30";

export const SEARCH_GUIDES: Guide[] = [
  {
    slug: "how-to-prompt-an-ai-sprite-generator",
    title: "How to Prompt an AI Sprite Generator",
    description:
      "Write sprite prompts that come back as game assets: subject, materials, colours and view. What to leave out so the result stays animatable.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-keep-ai-game-art-consistent", "how-to-make-pixel-art-sprites-for-games", "how-many-frames-per-sprite-animation"],
    tools: ["/ai-sprite-generator", "/game-character-generator", "/pixel-art-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "A useful sprite prompt names the subject, two or three materials or colours, and nothing else that the tool already decides for you. In SpriteLab the view is a control (side, front, top-down, or the default slight three-quarter) and a character's pose defaults to a calm A-pose so the sprite can be animated later. Put the camera in that control, not as a sentence that fights it.",
          "Skip the background, the art-quality adjectives, and a second pose. The background is removed. 'Masterpiece' does not change the pixels. 'Running with a sword raised' draws a one-off illustration you cannot turn into a walk cycle, because the next prompt will invent a different person.",
        ],
      },
      {
        heading: "What the generator already fills in",
        body: [
          "General image models expect you to describe the camera, the lighting rig and the backdrop, because those are part of a picture. A sprite tool treats them as settings. SpriteLab's character default is a standing A-pose: arms a little away from the body, feet apart, neutral face. That empty space around the limbs is what lets a later walk or attack read. If you ask for crossed arms, a cape wrapped around the torso, or a weapon held across the chest, the silhouette welds itself together and the animation has nothing to move.",
          "Creatures are not forced into that A-pose. A slime, a wolf or a dragon gets a calm standing pose that fits the body. Objects (swords, potions, chests) are drawn as the object, not as a character holding them, unless you asked for a character.",
          "Tiles are the exception to all of this. A floor tile should describe a surface that runs to the edges — 'mossy dungeon bricks' — not a hero standing on a patch of floor. The tile prompt is a texture, and the page for tiles explains why there is no outline and no background removal.",
        ],
        image: { src: "/showcase/knight.png", alt: "Pixel art knight sprite in a calm standing pose on a transparent background", pixel: true },
      },
      {
        heading: "A prompt you can reuse",
        body: [
          "Keep a skeleton and change one slot per character. The skeleton is what makes the cast look like one game. The slot is what makes this character not the last one.",
        ],
        table: {
          head: ["Slot", "What to write", "Example"],
          rows: [
            ["Subject", "Species or role, one noun phrase", "village blacksmith"],
            ["Clothes and prop", "The thing you will recognise at game size", "leather apron, short hammer"],
            ["Colours", "Two or three, not a palette essay", "soot grey and dull orange"],
            ["View", "Set it in the view control, and do not contradict it", "side view, for a platformer"],
            ["Style", "Pick it in the style control, once per game", "Pixel 16-bit"],
          ],
        },
        after: [
          "The full prompt is then short: 'village blacksmith, leather apron, short hammer, soot grey and dull orange'. Side view and Pixel 16-bit are settings. If you also type 'front view, cinematic lighting, unreal engine, trending on artstation', you have asked for two cameras and a render, and the sprite will split the difference.",
        ],
      },
      {
        heading: "View: pick one and stop describing it",
        body: [
          "Side view is a strict profile facing right: one eye, nose toward the right edge. Use it for platformers and any character who will walk left and right by flipping. Front view is straight at the camera, shoulders level. Use it for portraits, dialogue busts and any 'facing down' top-down idle if you would rather not use the top-down camera. Top-down is the high three-quarter RPG angle: you see the top of the head and the shoulders, and the body is shorter below them. The default, if you leave the control alone, is a slight three-quarter facing the viewer. That looks the most like a character illustration and the least like a game sprite. It is a reasonable choice for an icon or a static NPC. It is a poor choice for a walk cycle.",
          "Do not write a second angle in the prompt. 'Side view, but looking back over her shoulder' is two cameras. The model will honour one of them on one run and the other on the next, and your cast will not share a horizon.",
        ],
      },
      {
        heading: "What to leave out",
        body: [
          "These phrases show up in copied prompt lists and make sprites worse:",
        ],
        list: [
          "Backgrounds, scenes and weather. 'In a dark forest at night' becomes part of the picture and then a messy alpha cut.",
          "Quality words: masterpiece, best quality, 8k, unreal, octane, artstation. They do not select a sprite style. The style control does.",
          "A pose you will need as animation. Generate the idle design. Animate that file for the run, the swing and the flinch.",
          "Text on clothing, signs or labels. The letters will be wrong, and you will spend longer fixing them than drawing them.",
          "Several characters in one prompt. You will get a group shot, not three sprites. One subject per generation.",
          "A demanded pixel size ('32x32, crisp'). Say the style. Size the result in the engine or a pixel editor, by whole numbers.",
        ],
      },
      {
        heading: "Pixel art prompts are plainer than painted ones",
        body: [
          "On a 32-pixel body there is room for a silhouette, a face, and one prop. 'Ornate ceremonial armour with engraved prayers and a gem on every plate' becomes a brown noise. 'Knight, closed helm, tower shield, desaturated blue' survives. Pixel styles in SpriteLab are snapped to a grid with a limited palette after generation, so you do not need to beg for 'true pixel art, no anti-aliasing' in the sentence. You do need to pick Pixel 16-bit, Pixel HD or Isometric Pixel. Leaving the style on Hand Painted and writing 'pixel' in the prompt is how you get a painting of pixels.",
          "If the whole game shares a palette, generate in one pixel style and then index the keepers to your palette in Aseprite or LibreSprite. The generator limits colours per image. It does not know that your hero's red and your potion's red must be the same red.",
        ],
        image: { src: "/showcase/goblin-archer.png", alt: "Small pixel art goblin archer with a bow, readable as a silhouette", pixel: true },
      },
      {
        heading: "Worked examples",
        body: [
          "Same idea, two wordings. The short one is the sprite. The long one is a poster.",
        ],
        table: {
          head: ["You want", "Write this", "Do not write this"],
          rows: [
            ["Platformer hero", "scout, short cloak, wooden bow, moss green", "elven ranger running through a moonlit forest, dynamic pose, masterpiece"],
            ["Top-down villager", "baker, white cap, flour on the apron", "character sheet, front side and back, turnaround, RPG Maker"],
            ["Enemy", "round slime, single highlight, dull green", "cute slime monster in a dungeon, 4k, volumetric light"],
            ["Item", "round glass flask, red liquid, cork", "health potion on a wooden table, product photo, studio lighting"],
            ["Floor", "mossy stone bricks, even mortar", "a knight standing on a dungeon floor"],
          ],
        },
        after: [
          "The turnaround row is the one people get wrong most often. Asking for 'front, side and back in one image' produces a character sheet you then have to slice by hand, and the three views will not share a height. Generate the down-facing (or side-facing) design once. Use Animate's 4-direction or 8-direction export for the other angles. Those are separate frames of the sprite you kept, at one size, on one ground line.",
        ],
      },
      {
        heading: "After the first result",
        body: [
          "Judge at game size, not at 800%. If the silhouette reads and the colours belong to your game, keep it and animate it. If the helmet is wrong, say what is wrong in a short edit rather than starting from a brand new prompt: you are more likely to keep the body you already accepted. If the style is wrong, change the style control and regenerate. Do not keep an almost-right sprite in the project folder. It becomes the reference you compare later characters against, and the cast drifts toward it.",
          "When you are happy with one character, copy the skeleton and change the subject. That is the whole method. A longer version of keeping a cast consistent, including light direction and outline rules, is the consistency guide. Frame counts for the animation you make next are in the frames guide.",
        ],
      },
    ],
    faq: [
      {
        q: "Should I describe the pose?",
        a: "Only if you want a single static picture. For anything you will animate, leave the character in the default standing pose and animate that sprite.",
      },
      {
        q: "How do I get a side view and a front view of the same character?",
        a: "Generate one view and approve it, then use the direction tools in Animate. Prompting the other view from scratch draws a different character.",
      },
      {
        q: "Why does my sprite have a background?",
        a: "The prompt asked for a place, or the subject was hard to separate from a busy description. Name the object or character only. SpriteLab removes the background on sprites; tiles are meant to fill the square and are not cut out.",
      },
      {
        q: "Can I ask for exact hex colours?",
        a: "You can name colours in words. A hex code is not a reliable instruction. For a strict palette, index the finished sprites in a pixel editor.",
      },
    ],
  },
  {
    slug: "can-you-use-ai-sprites-in-a-commercial-game",
    title: "Can You Use AI Sprites in a Commercial Game?",
    description:
      "Yes on a paid SpriteLab plan, no on the free plan. What you can ship in a game, what you cannot sell as a stock pack, and what changed on 17 October 2026.",
    updated: UPDATED,
    published: UPDATED,
    related: ["how-to-keep-ai-game-art-consistent", "free-game-sprites-without-an-artist", "what-is-a-sprite-in-gaming"],
    tools: ["/2d-game-asset-generator", "/ai-sprite-generator", "/pricing"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "You can ship SpriteLab sprites in a commercial game if they were generated while a Starter, Pro or Studio plan was active. You do not have to credit SpriteLab. You cannot take those sprites and sell them on their own as a stock pack or a sprite library. The free plan, and anything made without an account, is personal and non-commercial.",
          `That split took effect on ${LICENCE_CHANGE_DATE}. Assets generated on the free plan before that date keep the licence that applied when they were created. Read the terms for the full wording. This guide is the practical version for someone deciding whether a jam build can become a paid game.`,
        ],
      },
      {
        heading: "What 'commercial' means here",
        body: [
          "Commercial use is selling the game, or giving it away in a way that earns money: a price on Steam or itch.io, a paid mobile build, a Patreon build that buyers download, a client project you were paid to make. Putting the game in a portfolio, a jam with no prize money you keep, or a free download with no sales is the personal side. If the same files later go into a paid build, those files need to have been generated on a paid plan.",
          "The licence follows the asset, not the account you happen to be on today. A sprite made on the free plan stays non-commercial even if you subscribe next week. Generate it again while the paid plan is active if you want to ship it. A sprite made on Starter stays usable in your commercial game if you later cancel, because it was generated while the plan was active. Cancelling does not reach back and un-license files you already made under that plan. It does stop you making new commercial files.",
        ],
      },
      {
        heading: "What you can ship",
        body: [
          "Inside your own game, paid-plan sprites can be the player, the enemies, the tiles, the icons and the UI, with no attribution line. You can edit them. You can animate them. You can trace over them in Aseprite until none of the original pixels remain; at that point you have drawn a new sprite, and the interesting question is your own copyright in the drawing, not SpriteLab's licence. You can commission a friend to clean up a sheet you generated on a paid plan and still ship it.",
          "You can use the same hero across a series of your games. The restriction is not 'one game'. The restriction is that you are using the art inside products you made, not reselling the art as the product.",
        ],
        list: [
          "A paid Steam or itch.io game.",
          "A free game that later gets a price, if the shipped art was generated on a paid plan.",
          "A client game, if you generated the art on your paid plan (or the client's) and the contract says the client receives the game, not a reusable asset pack.",
          "Edited, upscaled, recoloured and animated versions of those sprites.",
        ],
      },
      {
        heading: "What you cannot do",
        body: [
          "You may not sell or give away the generated images on their own as stock assets, an asset pack or a sprite library. That restriction applies even on Studio, and it applies to older files too. A pack on itch.io, a marketplace listing, or a drive of PNGs for other developers is the thing the terms forbid. Selling your game, with the sprites inside it, is not.",
          "You also cannot take free-plan sprites and drop them into a paid game because you 'only used them as placeholders and then forgot'. Placeholders that ship are the art. If a jam build used free-plan art and you want to sell the jam game, replace those files with ones generated on a paid plan, or redraw them.",
        ],
        table: {
          head: ["Situation", "Allowed?"],
          rows: [
            ["Sell a game that contains paid-plan sprites", "Yes"],
            ["Credit line required on a paid plan", "No"],
            ["Sell a sprite pack made of those sprites", "No"],
            ["Ship free-plan sprites in a paid game", "No"],
            ["Use free-plan sprites in a free, non-commercial jam", "Yes, personal use"],
            [`Free-plan sprites made before ${LICENCE_CHANGE_DATE}`, "The licence from the day they were made"],
            ["Tries made with no account, then sold", "No — non-commercial"],
          ],
        },
      },
      {
        heading: "The free plan is a trial of the tool, not a licence",
        body: [
          `A new account gets ${SIGNUP_CREDITS} credits and no card is required. That is enough to see whether the style fits a game. It is not a grant of commercial rights. The pricing page is where the paid plans start; this guide will not invent a discount. If the only thing in the way of shipping is the licence, a month of the cheapest paid plan costs less than replacing a cast, and you generate the files you will actually ship while that plan is active.`,
          "Other generators are different. Some free tiers allow commercial use, some forbid it, some are silent. Silence is not permission. If you mix SpriteLab art with art from another tool, each file follows the licence of the tool that made it. The comparison pages on this site quote what those tools publish about themselves, and they go stale, so re-read the other tool's terms before you rely on a sentence from a review.",
        ],
      },
      {
        heading: "A practical way to not get this wrong",
        body: [
          "Keep paid-plan exports in a folder that is obviously the shipping art, and free-plan experiments somewhere else. When a sprite is approved for the game, note the date and that a paid plan was active. You do not need a lawyer for that. You need to be able to answer 'which plan made this file?' six months later when you press the release button.",
          "If you are about to charge money and you are not sure, assume the file is non-commercial and regenerate it on a paid plan. Regeneration is cheaper than pulling a build. And if you want the exact clauses rather than this summary, they are in the terms. The one-paragraph version used across the site is the same rule:",
        ],
        after: [
          COMMERCIAL_LICENCE_ANSWER,
        ],
      },
    ],
    faq: [
      {
        q: "Do I have to credit SpriteLab?",
        a: "Not on Starter, Pro or Studio. The free plan is not a commercial licence, so the credit question does not come up: you cannot sell that art in the first place.",
      },
      {
        q: "I made the sprites before I subscribed. Can I sell the game now?",
        a: `Only if those sprites were generated while a paid plan was active, or they are free-plan sprites from before ${LICENCE_CHANGE_DATE} and the licence at that time allowed it. Subscribing later does not re-licence old free-plan files. Generate them again on the paid plan.`,
      },
      {
        q: "Can I sell the sprites as an asset pack?",
        a: "No. You may not sell generated assets on their own as stock packs or a sprite library. Selling your game is fine. Selling the art as the product is not.",
      },
      {
        q: "What about a game jam that becomes a paid game?",
        a: "Jam prototypes often use the free plan. Before you add a price, replace any free-plan art with art generated on a paid plan, or with art you drew yourself.",
      },
      {
        q: "Is this the full legal text?",
        a: COMMERCIAL_LICENCE_ANSWER,
      },
    ],
  },
  {
    slug: "free-game-sprites-without-an-artist",
    title: "Free Game Sprites Without Hiring an Artist",
    description:
      "How to get 2D game sprites with no art budget: free editors, CC0 packs, and what a free AI grant does and does not let you ship.",
    updated: UPDATED,
    published: UPDATED,
    related: ["can-you-use-ai-sprites-in-a-commercial-game", "how-to-prompt-an-ai-sprite-generator", "pixel-art-sprite-sizes-for-games"],
    tools: ["/2d-game-asset-generator", "/pixel-art-generator", "/ai-sprite-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "You have four honest options, and most solo games use more than one. Draw the few sprites that matter in a free editor. Download a pack whose licence you have actually read. Generate a first cast with a free AI grant and treat it as a prototype unless the licence says you can sell it. Hire someone only for the character the player stares at for the whole game.",
          "What does not work is saving images out of a search result, or assuming every 'free' button means commercial use. Free is a price. The licence is a separate sentence, and it is the sentence that decides whether the game can be sold.",
        ],
      },
      {
        heading: "Draw the small set yourself",
        body: [
          "A platformer can read as a game with a player, one enemy, a tile and a coin. That is an evening in a pixel editor if you stay at 16 or 32 pixels and you copy shapes you already understand. You do not need to be an artist to draw a rectangle with legs. You need a grid, nearest-neighbour zoom, and the patience to stop adding detail.",
          "LibreSprite is a free desktop editor in the same family as Aseprite. Piskel runs in the browser and is enough for a jam sprite. Aseprite is the editor most pixel-art tutorials assume; it is paid if you buy the build, and the source can be compiled. Any of them exports a transparent PNG and a sheet. The size guide on this site is the one to read before you pick 16, 32 or 64, because that choice decides how many tiles fit on screen.",
        ],
        list: [
          "One internal resolution, scaled by whole numbers. 320×180 or 640×360 both divide into 720p and 1080p.",
          "One outline rule and one light direction, even if the drawing is crude.",
          "A walk of 4 to 6 frames. More frames will not rescue a silhouette that does not read.",
        ],
        image: { src: "/showcase/slime.png", alt: "Simple pixel art slime sprite with a readable round silhouette", pixel: true },
      },
      {
        heading: "Packs, if you read the licence file",
        body: [
          "Kenney publishes a large set of game-ready 2D and 3D assets and has for years shipped them as CC0, which means you can use them in a commercial game without attribution. Confirm that on the zip you downloaded. A mirror, a repack, or an 'HD remake' by someone else is not Kenney's licence.",
          "itch.io is full of free and 'name your own price' packs. The price being zero does not tell you if you can sell a game. Open the licence on that specific page. Some say CC0. Some say free for commercial use with credit. Some say non-commercial, jam use only. Some say you cannot use the pack in a asset-pack of your own, which is the same restriction SpriteLab has, and it still allows a game. If the page does not say, do not ship it.",
          "Mixing three packs is how games end up with three outline thicknesses. Pick one pack as the base and draw or generate only the gaps. A Kenney character next to a painted AI hero looks like a collision, not a cast.",
        ],
      },
      {
        heading: "A free AI grant is for finding the style",
        body: [
          `SpriteLab gives a new account ${SIGNUP_CREDITS} credits, with no card. A standard sprite is one credit, so the grant covers a player, a few enemies, some items and a tile or two, or one animation if you would rather see a walk cycle. That is the right use: decide if this style is the game. The free plan is personal and non-commercial. Shipping those files in a paid game is not allowed. The commercial-use guide spells out the date the rule changed and what to do with a jam build you later want to sell.`,
          "Other AI sprite tools publish their own free tiers. Some are trials, some are perpetual with a watermark, some allow commercial use on the free tier and charge for an API. Those facts move. The comparison pages here quote each tool's own site and the date they were checked. Use them to choose a tool. Then read that tool's terms yourself before you put a price on the game. Do not trust a roundup, including this one, over the licence on the vendor's site.",
        ],
        table: {
          head: ["Route", "Money", "Your time", "Sell the game?"],
          rows: [
            ["Draw in LibreSprite or Piskel", "None", "High for a whole cast, low for a few sprites", "Yes, you drew it"],
            ["Kenney CC0 pack", "None", "Low, plus matching your own gaps", "Yes, if the zip you downloaded says CC0"],
            ["itch.io free pack", "None or a tip", "Low, plus a licence check", "Only if that page says so"],
            [`SpriteLab, ${SIGNUP_CREDITS} credit grant`, "None to try", "Low", "No, until the art is made on a paid plan"],
            ["SpriteLab paid plan", "From £5/month", "Low", "Yes, inside your game, not as a stock pack"],
            ["Hire an artist for the hero", "A commission", "Waiting, and art direction", "Yes, if the contract assigns it"],
          ],
        },
      },
      {
        heading: "Where hiring still wins",
        body: [
          "Pay a person for the thing the camera holds on. The main character's face, a boss with a specific silhouette, an attack that has to hit on a particular frame. Those are art direction. Generating ten of them and picking one is a prototype. It is a bad way to get the one drawing your game will be recognised by.",
          "Do not pay a person to draw forty potions, seventeen sword recolours and a second tileset 'just in case'. That is the work a generator or a CC0 pack is for, and spending the art budget there is why solo projects run out of money before the game is fun. Generate or download the long tail. Redraw the few icons that do not read. Keep one folder of shipping art and be able to say, for each file, whether you drew it, bought a licence, or generated it on a plan that allows the sale.",
        ],
      },
      {
        heading: "A weekend plan that does not pretend",
        body: [
          "Saturday: pick 32-pixel pixel art or a single painted style, not both. Draw or generate the player in side view or top-down, matching the camera. Put a floor tile under them. If the tile's pixels and the character's pixels disagree, stop and fix that before you make anything else.",
          "Sunday: one enemy, one projectile or weapon, one pickup, an idle and a walk on the player only. Import the sheet into the engine with nearest-neighbour filtering and a shared pivot. If it feels like a game, you have earned the right to make more art. If it does not, more sprites will not save it. The frames guide and the engine guides (Unity, Godot, GameMaker) are the next reading once the first loop is on screen, not before.",
        ],
        image: { src: "/showcase/health-potion.png", alt: "Pixel art health potion sprite, the kind of small item a pack or a generator covers", pixel: true },
      },
    ],
    faq: [
      {
        q: "What is the fastest free option?",
        a: "A CC0 pack whose licence you have checked, for anything generic, plus one evening drawing the player so the game is not only that pack.",
      },
      {
        q: "Can I sell a game made with SpriteLab's free credits?",
        a: `Not with the files the free grant produced. ${SIGNUP_CREDITS} credits are for trying the tool. Commercial use starts when the sprites are generated on Starter, Pro or Studio. See the commercial-use guide for the cutoff date.`,
      },
      {
        q: "Are Kenney's assets really free for commercial games?",
        a: "They have been published as CC0, which allows commercial use without attribution. Read the licence in the download you actually have. A reupload may not be CC0.",
      },
      {
        q: "Is it cheaper to learn pixel art than to generate it?",
        a: "For a handful of 16-pixel sprites, drawing is cheaper and you own the result outright. For a village of NPCs, a dungeon of tiles and a inventory of items, generation or a pack is how you finish. Most games do both.",
      },
    ],
  },
];
