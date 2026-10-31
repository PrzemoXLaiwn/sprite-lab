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
      "What SpriteLab's terms allow: commercial games on a paid plan, personal use on the free plan, and no sprite packs. A summary, not legal advice.",
    updated: "2026-10-31",
    published: UPDATED,
    related: ["how-to-keep-ai-game-art-consistent", "free-game-sprites-without-an-artist", "what-is-a-sprite-in-gaming"],
    tools: ["/terms", "/pricing", "/2d-game-asset-generator"],
    sections: [
      {
        heading: "The short answer",
        body: [
          "This page is a plain-language summary of SpriteLab's terms (section 9). It is not legal advice, and it is not the contract. If a sentence here and the terms disagree, the terms win. The terms are the page linked from the footer and from the tools on this article.",
          "You can use an output in a commercial game when it was generated while the account was on Starter, Pro or Studio, including a lifetime purchase of that plan. You do not have to credit SpriteLab. You cannot sell or give away outputs on their own as stock assets, an asset pack or a sprite library. That pack rule applies even on a paid plan. Outputs generated on the Free plan, or with no account, are personal and non-commercial only.",
          `The licence is fixed when the file is generated. It depends on the plan that was active then, not on whether the credit came from the free allowance, a subscription or a credit pack. Buying a credit pack does not by itself change your plan or grant a commercial licence. Changing plan later does not change the licence of files already made. Cancelling a paid plan does not take away a commercial licence you already have for outputs generated while that plan was active.`,
        ],
      },
      {
        heading: "What the terms call commercial",
        body: [
          "On a paid plan the terms allow any lawful purpose, including commercial games and products, without attribution. They do not define commercial use as 'anything with a price tag' and then list exceptions. On the Free plan, and for tries with no account, the terms say personal, non-commercial use only. You may not sell the output, monetise it, or use it in a product, game, service or promotion for a business.",
          "A free download is not automatically personal use. If the game, service or promotion is for a business, the free-plan wording still forbids it, price or no price. A file you only meant as a placeholder is still the file if it ships. When you are not sure which side a release is on, treat the file as non-commercial and generate the shipping art again while a paid plan is active.",
          `That paid-versus-free split took effect on ${LICENCE_CHANGE_DATE}. Assets generated on the Free plan before that date keep the licence that applied when they were created. Under the terms then in force, commercial use was allowed, without attribution, together with the restriction on selling or giving away outputs as stock packs. The terms say the same previous licence applies to other outputs created before that date.`,
        ],
      },
      {
        heading: "What you can ship",
        body: [
          "Paid-plan outputs can be the player, the enemies, the tiles, the icons and the UI inside games and other products you are allowed to use them in, with no attribution line. The same character can appear in more than one of your games. The terms do not limit you to a single title. They limit resale of the art as the product.",
          "You can edit, upscale, recolour and animate an output you are allowed to use. The terms do not say that redrawing over a sprite until the original pixels are gone creates a new work that leaves the contract. They also do not promise that an output is protected by copyright, or that you can stop someone else using similar material. Whether a particular output is protected, and in which country, is called out in the terms as uncertain. This guide will not add a theory the contract does not state.",
        ],
        list: [
          "A game or product that includes outputs generated on Starter, Pro, Studio or a lifetime purchase of that plan.",
          "The same outputs after you cancel, because they were generated while the paid plan was active.",
          "Edited, upscaled, recoloured and animated versions of those outputs, still inside a product the licence allows.",
          "Free-plan outputs from before the date above, under the licence that applied that day, still subject to the pack rule.",
        ],
      },
      {
        heading: "What you cannot do",
        body: [
          "You may not sell or give away outputs on their own as stock assets, asset packs or a sprite library. The terms call this a contractual restriction. It applies despite the assignment of rights in the output, whether or not you have a commercial licence, and it applies to outputs created before the date above. A pack on itch.io, a marketplace listing, or a folder of PNGs for other developers is the thing that clause describes. Selling your game, with outputs inside it that you are allowed to use commercially, is what the terms still allow.",
          "You also cannot put free-plan outputs, or outputs made with no account, into a product, game, service or promotion for a business. Subscribing next week does not re-licence those files. A credit pack bought while you are on the Free plan does not either. Generate the shipping files again while Starter, Pro, Studio or the matching lifetime plan is active.",
        ],
        table: {
          head: ["Situation", "What the terms say"],
          rows: [
            ["Game contains outputs made on Starter, Pro, Studio or lifetime", "Commercial use allowed, no attribution required"],
            ["Same outputs after you cancel that paid plan", "The commercial licence already earned stays"],
            ["Sell or give away the outputs as a sprite pack", "Not allowed, including older files"],
            ["Free plan, or no account, used in a business product or paid game", "Not allowed"],
            ["Credit pack bought on the Free plan", "Does not grant a commercial licence"],
            ["Subscribe later, then ship the old free-plan files", "Not allowed. Generate them again on a paid plan"],
            [`Free-plan outputs made before ${LICENCE_CHANGE_DATE}`, "Keep that day's licence. Commercial use was allowed then. The pack rule still applies"],
            ["Personal, non-commercial use of free-plan outputs", "That is what the Free plan allows"],
          ],
        },
      },
      {
        heading: "The free credits are a trial of the tool",
        body: [
          `A new account gets ${SIGNUP_CREDITS} credits and no card is required. That is enough to see whether a style fits a game. It is not a commercial licence. The pricing page lists the paid plans. This guide does not change those prices. If the shipping art is the thing in the way, generate it while a paid plan is active rather than hoping a later subscription covers files you already have.`,
          "Other generators publish different free tiers. Some allow commercial use, some forbid it, some say nothing. Silence on someone else's site is not permission, and a sentence on a comparison page here is not their contract. If you mix SpriteLab outputs with art from another tool, each file follows the terms of the tool that made it. Re-read those terms before you rely on them.",
        ],
      },
      {
        heading: "Other limits the terms actually state",
        body: [
          "As between you and SpriteLab, the terms assign to you any rights SpriteLab has in outputs generated for you. That assignment does not remove the limits in section 9. Those limits apply even where you hold rights in an output.",
          "AI models can produce similar outputs for different users. Outputs are not exclusive to you. You are responsible for how you use them, including checking that they do not infringe someone else's rights before you rely on them commercially, especially if the prompt referred to an existing character, brand, game or artist. Do not present outputs as hand-made if that would mislead people, for example where a store or a jam requires disclosure of AI use.",
          "If you publish outputs in the community gallery, you give SpriteLab a licence to display them on SpriteLab until you remove them. That display licence is separate from whether you may sell a game.",
        ],
      },
      {
        heading: "A practical way to stay inside the rule",
        body: [
          "Keep paid-plan exports in a folder that is obviously the shipping art, and free-plan experiments somewhere else. When a sprite is approved for the game, note the date and which plan was active. The question you want to be able to answer at release is 'which plan made this file?', not 'which plan am I on today?'.",
          "If you are about to charge money, or ship a business product, and you are not sure, assume the file is non-commercial and generate it again on a paid plan. The one-paragraph version used on the rest of the site is the same rule. The full clauses are in the terms:",
        ],
        after: [
          COMMERCIAL_LICENCE_ANSWER,
        ],
      },
    ],
    faq: [
      {
        q: "Do I have to credit SpriteLab?",
        a: "Not when the output was generated on Starter, Pro or Studio, including a lifetime purchase of that plan. The Free plan is personal and non-commercial, so attribution is not a way to make those files sellable.",
      },
      {
        q: "I made the sprites before I subscribed. Can I sell the game now?",
        a: `Only if those files were generated while a paid plan was active, or they were generated before ${LICENCE_CHANGE_DATE} and the licence at that time allowed commercial use. Subscribing later does not re-licence old Free-plan files. A credit pack does not either. Generate them again while a paid plan is active.`,
      },
      {
        q: "Can I sell the sprites as an asset pack?",
        a: "No. The terms say you may not sell or give away outputs on their own as stock assets, asset packs or a sprite library. That applies even with a commercial licence, and it applies to older files. Selling a game that includes outputs you are allowed to use commercially is different, and the terms allow it.",
      },
      {
        q: "What about a game jam that becomes a paid game?",
        a: "If the jam files were generated on the Free plan after the licence change, they are personal and non-commercial. Before the game is a paid product, or a product for a business, replace those files with outputs generated on a paid plan, or with art you have another right to use.",
      },
      {
        q: "Is this the full legal text?",
        a: "No. This is a summary of section 9 of the terms so you can see the shape of the rule. It is not legal advice. The terms are the contract, and they control if anything here is shorter or less precise.",
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
