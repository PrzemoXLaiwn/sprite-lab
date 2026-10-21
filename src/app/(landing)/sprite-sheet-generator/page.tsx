import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { ANIMATION_FRAME_OPTIONS, ROTATIONS, animationCredits } from "@/config/animations";
import { SIGNUP_CREDITS, SIGNUP_CTA } from "@/config/signup";

const URL = "https://www.sprite-lab.com/sprite-sheet-generator";
const TITLE = "Sprite Sheet Generator — AI Frames to PNG Atlas | SpriteLab";
const DESCRIPTION =
  "Make sprite sheets with AI: equal-size frames on a transparent PNG, 4- and 8-direction sheets, a frames ZIP and engine packs for Godot, Unity and GameMaker.";

// Prices come from the same config the animate route charges from
const sheetPrices = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames} frames ${o.credits} credits`).join(", ");
const smoothPrices = ANIMATION_FRAME_OPTIONS.map((o) => `${o.frames * 2} frames ${animationCredits(o.frames, true)}`).join(", ");
const rotation = (id: string) => ROTATIONS.find((r) => r.id === id)!;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: ["sprite sheet generator", "sprite sheet maker", "AI sprite sheet", "sprite atlas generator", "sprite map generator", "2D sprite animation", "walk cycle sprite sheet", "8 direction sprite sheet"],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function SpriteSheetGeneratorPage() {
  return (
    <SeoLanding
      slug="sprite-sheet-generator"
      appName="SpriteLab Sprite Sheet Generator"
      appDescription="Generate a game sprite with AI, animate it and download a sprite sheet of equal-size frames on a transparent background, with a frames ZIP, a GIF and engine packs for Godot, Unity and GameMaker."
      breadcrumb="Sprite Sheet Generator"
      h1={<>Sprite Sheet Generator</>}
      subtitle="Describe a character, pick how it moves and download a sprite sheet: one row of equal-size frames on a transparent PNG, plus the single frames, a GIF and a pack your engine opens as it is."
      trust={["equal-size frames", "transparent png", "4 and 8 directions", "godot, unity, gamemaker"]}
      floating={[
        { src: "/showcase/anim-car-drive.gif", alt: "", pixel: true, cls: "" },
        { src: "/showcase/anim-witch-walk.webp", alt: "", pixel: true, cls: "" },
        { src: "/showcase/anim-dragon-breath.webp", alt: "", pixel: true, cls: "" },
        { src: "/showcase/anim-dog-jump.gif", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "sheets",
          id: "examples",
          eyebrow: "real output",
          title: <>Sprite sheets made with SpriteLab</>,
          intro: "Each sheet below is a real SpriteLab export, shown at a whole-pixel scale. The orange lines mark the frame cells.",
          sheets: [
            {
              src: "/showcase/sheet-witch-walk.png",
              alt: "Pixel art witch walk cycle sprite sheet, 6 frames in one row, 1536×256 px, made with SpriteLab",
              title: "Witch walk cycle",
              body: "6 frames, walking in place so your game moves the character. Sheet: 1536×256 px.",
              frames: 6, frameWidth: 256, frameHeight: 256, fps: 10,
            },
            {
              src: "/showcase/sheet-dragon-breath.png",
              alt: "Pixel art dragon fire breath attack sprite sheet, 7 wide frames in one row, 3402×256 px, made with SpriteLab",
              title: "Dragon fire breath",
              body: "When an attack reaches out, the frames get wider instead of the dragon getting smaller: 486×256 px cells. Sheet: 3402×256 px.",
              frames: 7, frameWidth: 486, frameHeight: 256, fps: 10,
            },
            {
              src: "/showcase/rotate-knight.png",
              alt: "Pixel art knight 4-direction sprite sheet facing front, right, back and left, 1024×256 px, made with SpriteLab",
              title: "Knight, 4 directions",
              body: "The same knight from the front, right, back and left, same size and same ground line. Sheet: 1024×256 px.",
              frames: 4, frameWidth: 256, frameHeight: 256, fps: 2,
            },
          ],
        },
        {
          kind: "specs",
          id: "format",
          eyebrow: "the format",
          title: <>What you download</>,
          intro: "A sprite sheet, sometimes called a sprite atlas or sprite map, is one image that holds every frame of an animation. SpriteLab keeps it as simple as engines like it.",
          rows: [
            { label: "Layout", value: "One horizontal row, frames left to right in play order, no padding between cells" },
            { label: "Cell size", value: "Every frame the same size, 256 px tall; wide attacks get wider cells" },
            { label: "Frames", value: "4, 6 or 9 key poses, or 8, 12 or 18 with smooth mode" },
            { label: "Directions", value: "4 directions (front, right, back, left), 8 directions every 45°, or a 4-direction walk of 4 rows × 4 steps" },
            { label: "Background", value: "Real alpha transparency" },
            { label: "Downloads", value: "Sheet PNG, single frames in a ZIP, a GIF preview, and an engine pack" },
            { label: "Engine pack", value: "Godot SpriteFrames .tres, numbered Unity frames, GameMaker strips and hitboxes.json" },
          ],
          notes: [
            "Because every cell is the same size and there is no padding, slicing is one setting in any engine: in Unity, Sprite Mode Multiple and Slice → Grid By Cell Size with the frame width and height; in Godot 4, 'Add frames from sprite sheet' with Horizontal set to the frame count and Vertical to 1; in GameMaker, import the strip and it splits itself.",
            "The frames are aligned on the body, so the feet stay on one baseline and nothing slides or bobs that shouldn't. In pixel styles every frame shares one pixel grid and one palette, so colours don't flicker from frame to frame and the character keeps its size.",
            "If you'd rather not slice anything, take the engine pack. It is one ZIP per character with a ready SpriteFrames resource for Godot, a folder of numbered frames per animation for Unity, strips GameMaker splits on import, and hitboxes.json with a body box and a strike box for every frame.",
          ],
          links: [
            { label: "Sprite sheet layout: strips, grids and texture atlases", href: "/guides/sprite-sheet-layout-and-texture-atlases" },
            { label: "Sprites for Godot 4", href: "/godot-sprite-generator" },
            { label: "Sprites for Unity", href: "/unity-sprite-generator" },
            { label: "AI sprite animation: idle, walk, attack", href: "/ai-sprite-animation-generator" },
          ],
        },
        {
          kind: "steps",
          eyebrow: "how to make one",
          title: <>From a sentence to a sprite sheet</>,
          steps: [
            { title: "Make the sprite", body: `Describe it, pick a style and get a transparent sprite. Sign up for ${SIGNUP_CREDITS} free credits.` },
            { title: "Pick the motion", body: "Idle, walk, run, attack, jump, cast, hurt, a turnaround or your own move. Choose 4, 6 or 9 frames and turn on smooth mode if you want in-betweens." },
            { title: "Download the sheet", body: "Sheet PNG, frames ZIP, GIF or the engine pack. Every result is saved in your assets, so you can come back for another format later." },
          ],
        },
      ]}
      faq={[
        { q: "What frame size do the sprite sheets use?", a: "Frames are 256 px tall. Most are square (256×256); when an attack or effect reaches out, the cells get wider so the character keeps its size. Pixel art sits on a 128-pixel grid drawn at 2×, so you can halve it with nearest-neighbour scaling and keep every pixel." },
        { q: "Are all frames the same size?", a: "Yes. Every frame in a sheet has the same width and height, laid out in one row with no padding, so you can slice it by cell size in any engine." },
        { q: "How do I cut the sheet in Unity or Godot?", a: "Unity: set Sprite Mode to Multiple, open the Sprite Editor and use Slice → Grid By Cell Size with the frame width and height. Godot 4: in an AnimatedSprite2D's SpriteFrames, click 'Add frames from sprite sheet' and set Horizontal to the number of frames and Vertical to 1. Or skip slicing and use the engine pack." },
        { q: "Can I upload my own sprite and turn it into a sheet?", a: "Not at the moment. Animations start from a sprite made in SpriteLab, so the style, outline and transparency are already right for animating." },
        { q: "How much does a sprite sheet cost?", a: `Animations cost ${sheetPrices}. Smooth mode doubles the frames: ${smoothPrices} credits. Turnarounds cost ${rotation("rotate4").credits} credits for 4 directions and ${rotation("rotate8").credits} for 8, and a 4-direction walk ${rotation("walk4dir").credits}. You get ${SIGNUP_CREDITS} free credits when you sign up, no card needed.` },
        { q: "What's the difference between a sprite sheet and a sprite atlas?", a: "A sprite sheet usually holds the frames of one animation in a regular grid; an atlas packs many different sprites into one texture, often at irregular positions with a data file. SpriteLab exports regular sheets, which every engine can slice without a data file." },
      ]}
      cta={{
        title: <>Make your first sprite sheet</>,
        body: "Generate a sprite, animate it and download the sheet in a couple of minutes.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
