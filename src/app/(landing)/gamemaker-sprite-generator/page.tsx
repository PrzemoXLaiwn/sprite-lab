import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CTA } from "@/config/signup";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/gamemaker-sprite-generator";
const TITLE = "GameMaker Sprite Generator — AI Strips | SpriteLab";
const DESCRIPTION =
  "Generate 2D sprites for GameMaker and import them with the _stripN file name. Equal frames, Bottom Centre origin, a fixed collision mask, sharp pixels.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "GameMaker sprite generator",
    "AI sprites for GameMaker",
    "GameMaker sprite sheet",
    "GameMaker Studio 2 sprites",
    "stripN sprite import",
    "pixel art GameMaker",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function GameMakerSpriteGeneratorPage() {
  return (
    <SeoLanding
      slug="gamemaker-sprite-generator"
      appName="SpriteLab — AI Sprites for GameMaker"
      breadcrumb="GameMaker Sprite Generator"
      appDescription="Generate 2D sprites and animations with AI and import them into GameMaker as horizontal strips that the _stripN file name slices into equal frames."
      h1={
        <>
          GameMaker sprite generator
          <span className="sr-only">: </span>
          <br />
          strips the IDE already slices
        </>
      }
      subtitle="Describe a character or item, animate it, and download a horizontal strip whose file name tells GameMaker how many frames to cut. No plugin. The engine pack names the file for you."
      trust={["transparent png", "_stripN import", "equal-size frames", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/anim-knight-idle.webp", alt: "", pixel: true, cls: "" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/anim-witch-walk.webp", alt: "", pixel: true, cls: "" },
        { src: "/showcase/health-potion.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "steps",
          id: "import",
          eyebrow: "import",
          title: <>Import a strip in GameMaker</>,
          intro: "Menu names are from current GameMaker releases. GameMaker Studio 2 has the same settings in slightly different places.",
          steps: [
            { title: "Download the strip", body: "From SpriteLab, take the sprite sheet PNG or the engine pack. The pack puts each animation at gamemaker/<name>_stripN.png, where N is the frame count." },
            { title: "Keep the _stripN suffix last", body: "GameMaker only auto-slices a name that ends in _strip followed by the frame count. spr_knight_walk_strip6.png works. spr_knight_strip6_walk.png does not, because something follows the number." },
            { title: "Import into a sprite", body: "Create a sprite in the Asset Browser and click Import. A 6-frame strip whose width divides evenly by 6 shows six frames along the bottom of the editor. The suffix is dropped from the resource name." },
            { title: "Set one origin for the whole character", body: "Bottom Centre for characters and enemies, so x and y sit between the feet. Middle Centre for projectiles and pickups. Use the same origin on idle, walk and attack or the instance jumps when sprite_index changes." },
            { title: "Give it a mask that does not swing", body: "Automatic masks grow when a sword frame sticks out and the character gets stuck in walls. Set Collision Mask to a manual rectangle around the body, or assign one mask sprite with mask_index." },
            { title: "Turn interpolation off for pixel art", body: "In the sprite, disable 'Interpolate colours between pixels'. Pixel art from SpriteLab is on a real grid; interpolation blurs it the moment the camera moves a fraction of a pixel." },
          ],
        },
        {
          kind: "features",
          eyebrow: "why the strip fits",
          title: <>What GameMaker needs from a sprite</>,
          cards: [
            { title: "One row, equal cells", body: "The _stripN rule only works on a single horizontal row of identical widths. Every SpriteLab animation frame is the same size, so the division comes out whole." },
            { title: "A shared baseline", body: "The figure stands on one ground line in every frame. Bottom Centre then stays between the feet across idle, walk and attack." },
            { title: "Transparent, not painted checkers", body: "The background is alpha, including gaps inside the silhouette. GameMaker's mask reads the opaque pixels, not a baked checkerboard." },
            { title: "Engine pack, not a plugin", body: "The download is ordinary PNGs plus hitboxes.json. Import them like any other art. There is nothing to install in the IDE." },
          ],
        },
        {
          kind: "specs",
          id: "settings",
          eyebrow: "settings worth writing down",
          title: <>Origins, speed and the file name</>,
          intro: "Write these next to the sprite the first time. The second animation should not be a fresh set of guesses.",
          rows: [
            { label: "File name", value: "gamemaker/<animation>_stripN.png — N is the frame count, and it must be the last part of the name" },
            { label: "Origin", value: "Bottom Centre for anything that stands on the ground. Same origin on every animation of that object." },
            { label: "Collision", value: "Manual rectangle, or one mask sprite assigned with mask_index. Not Precise per frame." },
            { label: "Speed", value: "Frames per second, usually 8–12 for a walk and slower for an idle. The room can still run at 60." },
            { label: "Pixel art", value: "Interpolate colours between pixels: off." },
            { label: "Hitboxes", value: "hitboxes.json in the engine pack — a hurtbox and a hitbox per frame, measured from the top-left of the cell. A draft, not a tuned combat system." },
          ],
          notes: [
            "Check the arithmetic before you import. A strip that is 1,536 pixels wide with 6 frames has 256-pixel cells. If the width does not divide by N, the last frame is short and the character wobbles.",
            "Flipping with image_xscale = -1 keeps the origin in place only when the origin is on the centre line. Bottom Centre does that. A left-edge origin slides the character sideways on every turn.",
            "SpriteLab does not ship a GameMaker extension or a .yyp. You import PNGs. The long version of this import, including reading hitboxes in GML, is the GameMaker guide.",
          ],
          links: [
            { label: "How to import sprite strips into GameMaker", href: "/guides/how-to-import-sprite-strips-into-gamemaker" },
            { label: "Sprite sheet generator", href: "/sprite-sheet-generator" },
            { label: "How many frames per sprite animation", href: "/guides/how-many-frames-per-sprite-animation" },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Do I need a GameMaker plugin?", a: "No. You import PNG strips. The engine pack names each file so the _stripN rule slices it. There is no marketplace asset to install." },
        { q: "Why didn't GameMaker split my sheet?", a: "The name has to end in _strip and the frame count, with nothing after the number. Multi-row sheets are not auto-split; use Image → Convert to Frames, or export one strip per animation." },
        { q: "The character jumps when the animation changes.", a: "Idle and walk have different origins, or the feet are not on the same line. Set every sprite for that object to Bottom Centre. SpriteLab frames already share a baseline." },
        { q: "My pixel art looks blurry.", a: "Turn off 'Interpolate colours between pixels' on the sprite. Also avoid scaling the instance by a fractional amount; whole-number image_xscale and image_yscale keep the grid." },
        { q: "Can I sell a GameMaker game made with these sprites?", a: COMMERCIAL_LICENCE_ANSWER, link: { label: "Commercial use, in detail", href: "/guides/can-you-use-ai-sprites-in-a-commercial-game" } },
      ]}
      cta={{
        title: <>Drop a strip into the Asset Browser</>,
        body: "Generate a sprite, animate it, and import the _stripN file.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
