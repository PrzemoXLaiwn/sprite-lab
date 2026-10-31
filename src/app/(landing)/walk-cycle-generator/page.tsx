import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { ANIMATION_FRAME_OPTIONS, ROTATIONS, animationCredits } from "@/config/animations";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CREDITS, SIGNUP_CTA } from "@/config/signup";

const URL = "https://www.sprite-lab.com/walk-cycle-generator";
const TITLE = "Walk Cycle Generator for 2D Game Sprites | SpriteLab";
const DESCRIPTION =
  "Make a walk cycle from a game sprite: an in-place side view, or a 4-direction top-down sheet. Equal frames, one ground line, PNG and engine pack.";

const walk = ROTATIONS.find((r) => r.id === "walk4dir")!;
const sidePrices = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames} frames ${o.credits} credits`).join(", ");
const smoothPrices = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames * 2} frames ${animationCredits(o.frames, true)} credits`).join(", ");

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "walk cycle generator",
    "AI walk cycle",
    "sprite walk cycle",
    "2D walk animation",
    "4 direction walk cycle",
    "side view walk cycle",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function WalkCycleGeneratorPage() {
  return (
    <SeoLanding
      slug="walk-cycle-generator"
      appName="SpriteLab Walk Cycle Generator"
      breadcrumb="Walk cycle generator"
      appDescription="Generate a walk cycle from a 2D game sprite: an in-place side-view loop, or a 4-direction top-down sheet with the left row mirrored from the right. Equal-size frames on one ground line."
      h1={
        <>
          Walk cycle generator
          <span className="sr-only"> for </span>
          <br />
          side-view and top-down games
        </>
      }
      subtitle="A walk cycle is the loop a character plays while your game moves them. SpriteLab builds that loop from a sprite you already kept, so the face, clothes and colours do not change between frames. It does not draw an 8-direction walk."
      trust={["in-place side view", "4-direction RPG sheet", "equal frames, one ground line", "engine pack for Godot, Unity, GameMaker"]}
      floating={[
        { src: "/showcase/anim-witch-walk.webp", alt: "", pixel: true, cls: "" },
        { src: "/showcase/knight.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/sheet-witch-walk.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/rotate-knight.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "sheets",
          id: "example",
          eyebrow: "real output",
          title: <>A side-view walk, one row of frames</>,
          intro: "This is a SpriteLab export, shown at a whole-pixel scale. The orange lines are the frame cells. The character walks in place. Your movement code is what carries them across the level.",
          sheets: [
            {
              src: "/showcase/sheet-witch-walk.png",
              alt: "Pixel art witch walk cycle sprite sheet, six equal frames in one row, made with SpriteLab",
              title: "Witch walk, side view",
              body: "Six frames. The dress does not grow legs it did not have. Sheet: 1536×256 px, each cell 256×256.",
              frames: 6,
              frameWidth: 256,
              frameHeight: 256,
              fps: 10,
            },
          ],
        },
        {
          kind: "cards",
          id: "which",
          eyebrow: "which walk",
          title: <>Pick the walk that matches the camera</>,
          intro: "These are three different jobs. Mixing them is how a platformer hero ends up walking toward the camera.",
          cols: 3,
          cards: [
            {
              title: "Side-view walk",
              body: "Profile facing right, looping in place. Use it for platformers and side-scrollers. Flip the sprite for left. Choose 4, 6 or 9 key poses; smooth mode draws an in-between after each one.",
            },
            {
              title: "4-direction walk",
              body: `${walk.frames} frames, four rows of four steps: down, right, up, left. ${walk.credits} credits. The left row is a mirror of the right. This is the top-down and tile-RPG sheet.`,
            },
            {
              title: "8-direction walk",
              body: "Not generated. You can export standing poses every 45 degrees, then draw the diagonal steps yourself. The guide covers row order, mirroring and the catches.",
            },
          ],
        },
        {
          kind: "specs",
          id: "timing",
          eyebrow: "timing",
          title: <>Poses, speed, and why feet slide</>,
          intro: "The sheet is even frames. The feel of the walk is mostly what you do with those frames in the engine.",
          rows: [
            { label: "Key poses", value: "Contact (feet widest), passing (legs together). A 4-frame walk is those two poses for each foot. 6 and 8 frames add the down and up of the body." },
            { label: "Side-view price", value: `${sidePrices}. Smooth mode: ${smoothPrices}.` },
            { label: "Playback", value: "About 8–12 frames per second for a walk, higher for a run. Loop it." },
            { label: "In place", value: "The character does not travel across the sheet. If the game also moves them, and the stride does not match that speed, the feet look like they skate." },
            { label: "Ground line", value: "Every frame is the same size and the body stays on one baseline, so the pivot does not bounce when the loop repeats." },
            { label: "Stopping", value: "When the player stops, show a standing pose or the passing frame (feet together). The first frame of most walks is a stride." },
            { label: "8 directions", value: "Standing turnaround only. Diagonal walk frames are yours to draw." },
          ],
          notes: [
            "Measure one full cycle on the sheet: how far a foot would travel if it were on the ground. That distance, divided by the time of one loop, is the speed the character should move in the game. Change the speed or the fps until they agree. Sliding is a mismatch, not a bad drawing.",
            "A sword, shield or scar swaps sides when the left row is mirrored. If the hero is asymmetric, fix that row in your art tool. A symmetric villager can ship the mirror.",
            "Front and back walks are harder to read than a side view, because the legs move toward the camera. A small body bob and a clear arm swing read as walking at game size. A physically accurate stride often looks like standing still.",
          ],
          links: [
            { label: "Top-down sprite generator: row order and the 4-direction sheet", href: "/top-down-sprite-generator" },
            { label: "How to make an 8-direction walk cycle", href: "/guides/how-to-make-an-8-direction-walk-cycle" },
            { label: "How many frames should a sprite animation have?", href: "/guides/how-many-frames-per-sprite-animation" },
            { label: "Sprite sheet format and engine slicing", href: "/sprite-sheet-generator" },
          ],
        },
        {
          kind: "steps",
          id: "how",
          eyebrow: "how",
          title: <>From one sprite to a looping walk</>,
          steps: [
            { title: "Generate the character in the camera you will ship", body: "Side view for a platformer, top-down for an RPG. A dramatic three-quarter pose will not turn into a clean walk. Keep the arms off the body and the whole figure inside the frame." },
            { title: "Animate that sprite, do not prompt a new one", body: "Asking again for 'the same knight walking' draws a different knight. Open the sprite you kept and choose walk, or the 4-direction walk if the game is top-down." },
            { title: "Download the sheet or the engine pack", body: "Horizontal PNG, a ZIP of frames, a GIF, and a pack: Godot SpriteFrames, Unity frame folders, GameMaker strips, plus hitboxes.json." },
            { title: "Match the loop to movement", body: `Play it at 8–12 fps, loop it, and set the character's speed so the feet land where the cycle says they land. Sign up for ${SIGNUP_CREDITS} free credits if you want to try it on your own sprite.` },
          ],
        },
      ]}
      faq={[
        {
          q: "Does the walk cycle move the character across the image?",
          a: "No. Frames are a loop in place, at one size, on one ground line. The game moves the sprite. That is what lets the same cycle play at different speeds.",
        },
        {
          q: "How many frames should a walk have?",
          a: "Four reads clearly at small pixel sizes: contact and passing for each foot. Six is the usual middle, as in the witch sheet above. Eight and up is for larger sprites, where missing in-betweens become obvious. Smooth mode doubles 4, 6 or 9 key poses.",
          link: { label: "Frame counts for idle, walk, run and attack", href: "/guides/how-many-frames-per-sprite-animation" },
        },
        {
          q: "Can I get a walk in four directions?",
          a: `Yes. The 4-direction walk is ${walk.frames} frames: down, right, up and left, four steps each, ${walk.credits} credits. Left is mirrored from right. It is not an RPG Maker file. RPG Maker sheets are often down, left, right, up with three frames, so remap the rows if you need that order.`,
          link: { label: "Top-down sprite generator", href: "/top-down-sprite-generator" },
        },
        {
          q: "Can I get an 8-direction walk?",
          a: "No. SpriteLab can draw the character standing in eight directions, which is a turnaround, not a walk. Diagonal walk frames have to be drawn. Five directions are usually enough if you mirror the west side, unless the character is visibly asymmetric.",
          link: { label: "How to make an 8-direction walk cycle", href: "/guides/how-to-make-an-8-direction-walk-cycle" },
        },
        {
          q: "What if the feet slide?",
          a: "The cycle and the movement speed disagree. Measure the stride on the sheet and set the character's speed, or the animation fps, so one loop covers that distance. Also check you are not stopping on a stride frame.",
        },
        {
          q: "Can I use the walk in a commercial game?",
          a: COMMERCIAL_LICENCE_ANSWER,
        },
      ]}
      cta={{
        title: <>Make the walk from the sprite you kept</>,
        body: "One character, then the cycle. Not a new character for every frame.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
