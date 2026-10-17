// =============================================================================
// Shared facts about SpriteLab — homepage FAQ, FAQPage JSON-LD and
// /llms-full.txt all read from here so humans, search engines and AI
// assistants get the same (true) answers.
// =============================================================================

import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CREDITS } from "@/config/signup";
import { RELAUNCH } from "@/config/relaunch";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "@/config/animations";

// Same numbers as CREDIT_COSTS in src/lib/services/generation.ts. That module
// pulls the image pipeline, so the public FAQ does not import it.
const STANDARD_CREDITS = 1;
const HD_CREDITS = 3;

export interface Faq { q: string; a: string }

const animationPrices = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames} key poses ${o.credits}`).join(", ");
const smoothPrices = ANIMATION_FRAME_OPTIONS.map((o) => String(animationCredits(o.frames, true))).join(", ");
const directionPrices = ROTATIONS.map((r) => `${r.label} ${r.credits}`).join(", ");

export const QUESTS_FAQ: Faq = {
  q: "Can I earn more free credits?",
  a: "You can earn more free credits by completing onboarding and weekly quests in the app.",
};

export const RETURNING_BONUS_FAQ: Faq = {
  q: "I got an email about 15 bonus credits. Is that different?",
  a: `That email was the welcome-back offer for accounts created before 7 October 2026. Those accounts now get ${RELAUNCH.RETURNING_BONUS} credits the first time they open the app before 31 December 2026. If you already received ${RELAUNCH.PREVIOUS_RETURNING_BONUS}, the next visit adds ${RELAUNCH.RETURNING_TOP_UP}, so the welcome-back total is ${RELAUNCH.RETURNING_BONUS}. New accounts get ${SIGNUP_CREDITS} free credits on signup.`,
};

const COST_ANSWER = `Sign up and you get ${SIGNUP_CREDITS} free credits, no credit card needed. A Standard sprite costs ${STANDARD_CREDITS} credit and HD costs ${HD_CREDITS}. A rigged idle loop costs ${RIG_CREDITS} credits. AI animations cost ${animationPrices} credits, and smooth mode (on by default) brings those to ${smoothPrices}. Direction sheets cost ${directionPrices} credits. Monthly plans start at £5 for 250 credits, and one-off credit packs never expire.`;

export const HOME_FAQ: Faq[] = [
  {
    q: "Can I get my character from 4 or 8 directions?",
    a: "Yes. In Animate, pick \"4 directions\" or \"8 directions\" for any character or creature and SpriteLab draws the same sprite from the front, sides and back (every 45° for 8) — same size, same ground line, one view per frame. It's made for top-down and isometric games.",
  },
  {
    q: "Do I need a powerful computer or to install anything?",
    a: "No. SpriteLab runs in the browser on Windows, Mac, Linux and phones — the AI runs on our servers, so any device works.",
  },
  {
    q: "What is SpriteLab?",
    a: "SpriteLab is an AI game asset generator for indie game developers. You describe an asset in a sentence and get a game-ready 2D sprite — a transparent PNG, with pixel art snapped to a real pixel grid — that you can animate into a sprite sheet and drop into Unity, Godot or GameMaker.",
  },
  {
    q: "Is SpriteLab related to Code.org's Sprite Lab?",
    a: "No. Sprite Lab on Code.org is a free coding course for students. SpriteLab (sprite-lab.com) is a separate, independent tool that uses AI to make sprites, animations and sprite sheets for people building their own games. The two aren't connected, and a Code.org account doesn't work here.",
  },
  {
    q: "How is it different from a general AI image generator?",
    a: "Every result is post-processed for games: the background is removed to transparency, pixel art is snapped to one pixel grid and a limited palette, outlines are kept consistent, and sprites can be animated into frame-aligned sprite sheets and organised into project packs. You get assets, not illustrations.",
  },
  {
    q: "Can I use the assets in a commercial game?",
    a: COMMERCIAL_LICENCE_ANSWER,
  },
  {
    q: "Can SpriteLab animate sprites?",
    a: "Yes. Pick a sprite and choose idle, walk, run, attack, jump, cast, hurt, flying, a turnaround or describe your own motion. SpriteLab suggests motions that suit the specific sprite and returns a horizontal sprite sheet PNG, the individual frames and a GIF — 4, 6 or 9 key poses, or up to 18 frames with smooth in-betweens.",
  },
  {
    q: "Does it work with Unity and Godot?",
    a: "Yes. Sprites are standard transparent PNGs and sprite sheets are horizontal strips of equal-size frames. In Unity, set the texture to Sprite (2D), Multiple, and slice it by cell size in the Sprite Editor. In Godot 4, use the PNG in a Sprite2D or add the sheet to an AnimatedSprite2D's SpriteFrames with 'Add frames from sprite sheet'.",
  },
  {
    q: "What art styles are available?",
    a: "Twelve: Pixel 16-bit, Pixel HD, Isometric Pixel, Isometric, Isometric Cartoon, Hand Painted, Anime, Chibi, Dark Fantasy, Cartoon, Vector and Realistic.",
  },
  {
    q: "Can I make tiles for my levels?",
    a: "Yes. Choose Environment → Floor Tiles or Wall Tiles to get a square tile that repeats without visible seams, and animate water or lava tiles into looping frames.",
  },
  {
    q: "How do projects work?",
    a: "Create a project for your game, generate into it, and accept or decline each result. Accepted sprites are filed into folders by type automatically (characters, enemies, weapons, items…), and you can download the whole project as a ZIP pack.",
  },
  {
    q: "How much does it cost?",
    a: COST_ANSWER,
  },
  RETURNING_BONUS_FAQ,
  QUESTS_FAQ,
  {
    q: "Do credits expire?",
    a: "Free credits and credit packs never expire. Subscription credits refresh every month.",
  },
  {
    q: "How long does a generation take?",
    a: "A sprite usually takes 10–20 seconds. Animations take about 25–90 seconds depending on the number of frames and smooth mode.",
  },
  {
    q: "Does SpriteLab have an API or 3D models?",
    a: "Not at the moment. SpriteLab is a web app focused on 2D game assets; there is no public API, MCP server or 3D model generation.",
  },
];

export const ENGINE_GUIDES = {
  unity: [
    "Download the sprite (PNG) or the sprite sheet from SpriteLab.",
    "Drag the file into your Unity project's Assets folder.",
    "Select it and set Texture Type to 'Sprite (2D and UI)'. For pixel art set Filter Mode to 'Point (no filter)' and Compression to 'None'.",
    "For a sprite sheet set Sprite Mode to 'Multiple', open the Sprite Editor, choose Slice → Grid By Cell Size and enter the frame width and height (every SpriteLab frame has the same size), then Apply.",
    "Select the sliced frames and drag them into the Scene — Unity creates an Animation clip; adjust the sample rate (e.g. 8–12 fps).",
  ],
  godot: [
    "Download the sprite (PNG) or the sprite sheet from SpriteLab and copy it into your Godot project folder.",
    "For pixel art, set Project Settings → Rendering → Textures → Default Texture Filter to 'Nearest' so pixels stay sharp.",
    "Single sprite: add a Sprite2D node and drag the PNG into its Texture property.",
    "Animation: add an AnimatedSprite2D, create new SpriteFrames, click 'Add frames from sprite sheet', set Horizontal to the number of frames and Vertical to 1, select all frames and add them.",
    "Set the animation speed (e.g. 8–12 FPS), enable Loop for idle and walk cycles, and call play() from your script.",
  ],
};
