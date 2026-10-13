// =============================================================================
// Product guide — how SpriteLab works, in plain words.
// Single source for the homepage guide tabs, /how-it-works and in-app tips.
// Costs are read from the real config so the copy can't drift from billing.
// =============================================================================

import { CREDIT_COSTS, STYLE_MATCH_CREDITS } from "@/lib/services/generation";
import { ANIMATION_FRAME_OPTIONS, RIG_CREDITS, ROTATIONS, animationCredits } from "@/config/animations";
import { RELAUNCH, relaunchActive } from "@/config/relaunch";

export const SIGNUP_CREDITS = RELAUNCH.SIGNUP_CREDITS;
export const GUEST_TRIES = 3;

/** "10 free credits" or "10 free credits + 10 launch bonus" while the relaunch runs. */
export function signupOffer(now = new Date()): { credits: number; bonus: number; bonusUntil: string | null } {
  const active = relaunchActive(now);
  return {
    credits: SIGNUP_CREDITS,
    bonus: active ? RELAUNCH.NEW_USER_BONUS : 0,
    bonusUntil: active ? new Date(RELAUNCH.ENDS_AT).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : null,
  };
}

const frames = ANIMATION_FRAME_OPTIONS.map((o) => o.frames);

export type GuideId = "generate" | "animate" | "projects" | "credits";

export interface GuideStep {
  title: string;
  body: string;
}

export interface GuideSection {
  id: GuideId;
  tab: string;
  title: string;
  lead: string;
  steps: GuideStep[];
  tips: string[];
  /** Where to try it in the app */
  href: string;
  cta: string;
}

export const GUIDE: GuideSection[] = [
  {
    id: "generate",
    tab: "Create",
    title: "Create a sprite from one sentence",
    lead: "Describe what you need — SpriteLab draws it, removes the background and snaps pixel art to a clean grid.",
    steps: [
      { title: "Pick an asset type", body: "Characters, creatures, weapons, items, tiles, icons… The type tells the AI how to frame and size the sprite." },
      { title: "Describe it", body: "What it is, colours and materials — e.g. “iron sword with a red gem in the hilt”. Any language works." },
      { title: "Choose a style", body: "12 styles. Pixel 16-bit is the favourite; Hand Painted, Anime, Chibi and Isometric are a click away." },
      { title: "Standard or HD", body: `Standard costs ${CREDIT_COSTS.normal} credit and takes ~10 s. HD costs ${CREDIT_COSTS.hd} credits for finer detail.` },
    ],
    tips: [
      "Stuck for ideas? Hit “Surprise me”.",
      "Press “Match style” on a sprite you like — every next sprite comes out in the same style and pixel size.",
      "Hover any sprite in Explore and press Try to reuse its prompt.",
      "Characters and creatures can be drawn from the side, front or top-down.",
      "Every result is saved to Assets as a transparent PNG.",
    ],
    href: "/generate",
    cta: "Open the generator",
  },
  {
    id: "animate",
    tab: "Animate",
    title: "Animate anything — not just people",
    lead: "Pick a sprite and a motion. The AI looks at your sprite first, so a dragon breathes fire, a dog trots and a car drives.",
    steps: [
      { title: "Choose a sprite", body: "Any sprite from your Assets — or upload your own." },
      { title: "Pick a motion", body: "Idle, walk, attack, jump… plus moves suggested for that exact sprite. Or describe your own." },
      { title: "Pick the frame count", body: `${frames.join(", ")} key poses from ${ANIMATION_FRAME_OPTIONS[0].credits} credits. “Smooth motion” doubles the frames with AI in-betweens. Idle loops are rigged from your sprite for just ${RIG_CREDITS} credits.` },
      { title: "Download", body: "A sprite sheet PNG, every frame separately and a GIF preview — ready to slice in Unity or Godot." },
    ],
    tips: [
      "Idle is a calm breathing loop — the feet never step.",
      "Top-down game? Pick 4 or 8 directions to get your character from every side.",
      "Water and lava tiles animate into seamless loops.",
      "Preview the loop at any speed before you download.",
    ],
    href: "/animate",
    cta: "Try an animation",
  },
  {
    id: "projects",
    tab: "Projects",
    title: "Keep your game's assets in one place",
    lead: "A project is a folder for one game. Generate into it, keep the good ones, download everything as a pack.",
    steps: [
      { title: "Create a project", body: "One per game — “Dungeon crawler”, “Space shooter”…" },
      { title: "Generate into it", body: "Accept or decline each result. Declined sprites stay in Assets, out of your pack." },
      { title: "Auto-sorted folders", body: "Accepted sprites file themselves into Characters, Enemies, Weapons, Items… Auto-sort tidies everything again." },
      { title: "Download the pack", body: "The whole project as one ZIP, folders included. Projects are free." },
    ],
    tips: [
      "Open the generator from a folder and new sprites land in that folder.",
      "Everything you ever generated is also in Assets.",
    ],
    href: "/projects",
    cta: "Start a project",
  },
  {
    id: "credits",
    tab: "Credits",
    title: "What things cost",
    lead: "Credits are the only currency. You always see the price on the button before you click.",
    steps: [
      { title: "Free to start", body: `${GUEST_TRIES} tries without an account, then ${SIGNUP_CREDITS} free credits when you sign up — no card.` },
      { title: "Failed? Refunded", body: "If a generation fails, its credits go straight back to your balance." },
      { title: "Track your usage", body: "The Usage page lists every generation and what it cost." },
      { title: "Top up any time", body: "Monthly plans from £5 for 250 credits, or one-off packs that never expire." },
    ],
    tips: [],
    href: "/usage",
    cta: "See your usage",
  },
];

/** Price list shown in the Credits tab and on /how-it-works. */
export const PRICE_LIST: { item: string; cost: string; note?: string }[] = [
  { item: "Sprite — Standard", cost: `${CREDIT_COSTS.normal} credit` },
  { item: "Sprite — HD", cost: `${CREDIT_COSTS.hd} credits` },
  { item: "Sprite — matching another sprite’s style", cost: `${STYLE_MATCH_CREDITS} credits` },
  { item: "Idle loop (rigged, 24 frames)", cost: `${RIG_CREDITS} credits` },
  ...ROTATIONS.map((r) => ({ item: `${r.label} (${r.kind === "walk" ? "RPG walk sheet" : "rotation sheet"})`, cost: `${r.credits} credits` })),
  ...ANIMATION_FRAME_OPTIONS.map((o) => ({ item: `AI animation — ${o.frames} frames`, cost: `${o.credits} credits`, note: `smooth (${o.frames * 2} frames): ${animationCredits(o.frames, true)} credits` })),
  { item: "Variation of a sprite", cost: "3 credits" },
  { item: "Edit a sprite (describe + paint the area)", cost: "5 credits" },
  { item: "Remove background", cost: "1 credit", note: "Starter plan and up" },
  { item: "Upscale — pixel-perfect", cost: "free" },
  { item: "Upscale — AI 2× / 4×", cost: "1–2 credits", note: "paid plans" },
  { item: "Projects & ZIP export", cost: "free" },
];
