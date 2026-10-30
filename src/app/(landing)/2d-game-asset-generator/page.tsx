import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { RIG_CREDITS } from "@/config/animations";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CREDITS, SIGNUP_CTA, SIGNUP_ON_SIGNUP } from "@/config/signup";
import { SHOWCASE } from "@/data/showcase";
import { CREDIT_COSTS } from "@/lib/services/generation";

const URL = "https://www.sprite-lab.com/2d-game-asset-generator";
const TITLE = "2D Game Asset Generator for Indie Devs | SpriteLab";
const DESCRIPTION =
  "A budget 2D game asset generator: characters, tiles, items, icons and sprite sheets as transparent PNGs for Unity, Godot and GameMaker.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "2D game asset generator",
    "game asset generator",
    "AI game assets",
    "indie game art generator",
    "2D game sprites",
    "AI assets for indie games",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function TwoDGameAssetGeneratorPage() {
  return (
    <SeoLanding
      slug="2d-game-asset-generator"
      appName="SpriteLab 2D Game Asset Generator"
      breadcrumb="2D Game Asset Generator"
      appDescription="Generate the 2D assets a small game needs — characters, creatures, weapons, items, icons, seamless tiles and sprite-sheet animations — as transparent PNGs for Unity, Godot and GameMaker."
      h1={
        <>
          2D game asset generator
          <span className="sr-only"> for </span>
          <br />
          indie games on a budget
        </>
      }
      subtitle="You do not need a full art department to put a 2D game on screen. You need a player, a floor, a few enemies, items and the animations those things play. SpriteLab makes those files. It does not make the game."
      trust={[SIGNUP_ON_SIGNUP, "No card", `standard sprite ${CREDIT_COSTS.normal} credit`, "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/knight.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/tile-grass.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/fire-sword.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/health-potion.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "steps",
          id: "order",
          eyebrow: "a sensible order",
          title: <>What to make first</>,
          intro: "This is the order that wastes the fewest credits. Each step has its own page if you want the file format.",
          steps: [
            { title: "Lock the camera and the style", body: "Side view or top-down. One pixel density. One of the 12 styles. Write it down before the first prompt, because the second asset will not remember it for you." },
            { title: "The player", body: `A standard sprite costs ${CREDIT_COSTS.normal} credit. HD costs ${CREDIT_COSTS.hd}. Keep one design. That file is the scale every enemy and prop is judged against.` },
            { title: "The ground", body: "A seamless floor tile and, if the game has rooms, a wall tile. These repeat. They are not a full autotile set with corners and transitions." },
            { title: "Enemies, items, icons", body: "A handful, in the same style. Icons are for the hotbar and inventory. Weapons can be their own sprites and also part of the character's attack." },
            { title: "Motion, last", body: `Animate the sprites you kept. A rigged idle is ${RIG_CREDITS} credits. A walk or attack is a sprite sheet of equal frames, plus a GIF and an engine pack. Do not animate a character you have not approved.` },
          ],
        },
        {
          kind: "cards",
          id: "files",
          eyebrow: "the files",
          title: <>What a 2D game actually imports</>,
          cols: 2,
          cards: [
            { title: "Sprites", body: "Transparent PNG. Pixel styles sit on a real grid with a limited palette, so nearest-neighbour scaling stays sharp.", image: { src: "/showcase/goblin-archer.png", alt: "Pixel art goblin archer sprite", pixel: true } },
            { title: "Sprite sheets", body: "One row of equal-size frames. Unity slices by cell size, Godot loads them into SpriteFrames, GameMaker splits a _stripN file.", image: { src: "/showcase/anim-witch-walk.webp", alt: "Pixel art witch walk-cycle sprite sheet", pixel: true } },
            { title: "Tiles", body: "Square, edge to edge, checked so copies meet without a seam. Water and lava can loop. Grass-to-dirt transitions are still your job.", image: { src: "/showcase/tile-grass.png", alt: "Seamless pixel art grass tile", pixel: true } },
            { title: "Icons", body: "Framed, centred, readable small. Use them for skills and items. Do not bake cooldown state into the picture; grey it out in the UI.", image: { src: "/showcase/icon-1.png", alt: "Pixel art skill icon with a frame", pixel: true } },
          ],
        },
        {
          kind: "cards",
          id: "limits",
          eyebrow: "limits",
          title: <>What this will not do for you</>,
          intro: "A generator that claims to replace an art team usually means it will not say where it stops. These are the stops.",
          cols: 2,
          cards: [
            { title: "Not 3D, not audio, not a level", body: "No models, no sound, no tilemap of your whole dungeon. You still place tiles and write the game." },
            { title: "Not an autotile blob", body: "Single seamless tiles, yes. A 47-tile set of edges and corners, no." },
            { title: "Not an 8-direction walk", body: "Standing views in 4 and 8 directions, and a 4-direction walk with the left row mirrored. Diagonal walk cycles are not generated." },
            { title: "Not an API", body: "It is a web app. There is no public API or editor plugin. You download PNGs and import them." },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Is a game asset generator the same as an image generator?", a: "An image generator gives you a picture, often with a background and a new character every time. A game asset generator has to hand you a transparent sprite, a tile that repeats, or a sheet of equal frames. SpriteLab is the second kind, for 2D only." },
        { q: "How much does a first batch cost?", a: `A new account starts with ${SIGNUP_CREDITS} credits, no card. A standard sprite is ${CREDIT_COSTS.normal} credit and HD is ${CREDIT_COSTS.hd}. Animations and direction sheets cost more because they are several frames. Monthly plans start at £5. The pricing page lists every action.` , link: { label: "Pricing", href: "/pricing" } },
        { q: "Which engines can import the files?", a: "Unity, Godot 4 and GameMaker. You get PNGs, and an engine pack with a Godot SpriteFrames resource, Unity frame folders, GameMaker _stripN strips and hitboxes.json.", link: { label: "Sprite sheet generator", href: "/sprite-sheet-generator" } },
        { q: "Can I ship a commercial game with them?", a: COMMERCIAL_LICENCE_ANSWER, link: { label: "What the licence allows", href: "/guides/can-you-use-ai-sprites-in-a-commercial-game" } },
        { q: "What if I only need one kind of asset?", a: "Use the page for that file. Sprites, pixel art, tiles, icons, weapons, characters, top-down sheets, and the three engine import pages are separate so the instructions match the job." },
      ]}
      cta={{
        title: <>Make the player sprite before the rest of the cast</>,
        body: `${SIGNUP_CREDITS} credits on signup. Enough to see if the style fits the game before you spend anything.`,
        button: SIGNUP_CTA,
      }}
    />
  );
}
