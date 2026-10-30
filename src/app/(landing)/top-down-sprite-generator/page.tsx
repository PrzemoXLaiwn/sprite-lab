import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { ROTATIONS } from "@/config/animations";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CTA } from "@/config/signup";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/top-down-sprite-generator";
const TITLE = "Top-Down Sprite Generator for RPGs | SpriteLab";
const DESCRIPTION =
  "Make top-down RPG sprites: a 4-direction walk (down, right, up, left) and standing turnarounds in 4 or 8 directions, one size, one ground line.";

const walk = ROTATIONS.find((r) => r.id === "walk4dir")!;
const four = ROTATIONS.find((r) => r.id === "rotate4")!;
const eight = ROTATIONS.find((r) => r.id === "rotate8")!;

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "top-down sprite generator",
    "RPG sprite generator",
    "top down character sprite",
    "4 direction sprite sheet",
    "8 direction sprite",
    "RPG Maker style sprites",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function TopDownSpriteGeneratorPage() {
  return (
    <SeoLanding
      slug="top-down-sprite-generator"
      appName="SpriteLab Top-Down Sprite Generator"
      breadcrumb="Top-Down Sprite Generator"
      appDescription="Generate a top-down game character once, then export standing views in 4 or 8 directions and a 4-direction walk sheet with a shared size and ground line."
      h1={
        <>
          Top-down sprite generator
          <span className="sr-only"> for </span>
          <br />
          RPGs and isometric games
        </>
      }
      subtitle="Make the character once. Then get the facings a tile-based game actually uses: standing views, and a walk that faces down, right, up and left without redrawing the design."
      trust={["4-direction walk", "4 and 8 standing views", "one ground line", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/knight.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/goblin-archer.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/fox-mage.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "outputs",
          eyebrow: "what you export",
          title: <>Three sheets, and what each is for</>,
          intro: "Pick these in Animate, on a character or creature you already generated. They are not separate art styles.",
          cols: 3,
          cards: [
            {
              title: "4 directions",
              body: `Standing poses: front, right, back, left. ${four.credits} credits. Use them as the idle facing when the player stops, and as the reference for any walk you draw by hand.`,
            },
            {
              title: "8 directions",
              body: `The same sprite every 45 degrees. ${eight.credits} credits. Standing turnaround for isometric and free-moving games. It is not an 8-direction walk.`,
            },
            {
              title: "4-direction walk",
              body: `${walk.frames} frames, 4 rows of 4 steps, in the order down, right, up, left. ${walk.credits} credits. The left row is mirrored from the right.`,
            },
          ],
        },
        {
          kind: "specs",
          id: "row-order",
          eyebrow: "row order",
          title: <>Agree the rows before you write movement code</>,
          intro: "A character that walks backwards on the first run is almost always a row-order mismatch, not a bad sprite.",
          rows: [
            { label: "SpriteLab walk", value: "Row 1 down (toward the camera), row 2 right, row 3 up (away), row 4 left. 4 steps each. Left is a mirror of right." },
            { label: "RPG Maker MV / MZ", value: "Down, left, right, up, often 3 frames. Convert if you mix packs." },
            { label: "Standing 4", value: "Front, right, back, left. One frame each, same canvas, same ground line." },
            { label: "Standing 8", value: "Front, front-right, right, back-right, back, back-left, left, front-left." },
            { label: "Not included", value: "An animated walk in all 8 directions. Draw the diagonals, or mirror, if the game needs them." },
            { label: "Engine pack", value: "The walk is split into walk_down, walk_right, walk_up and walk_left for Godot, Unity and GameMaker." },
          ],
          notes: [
            "Mirroring the left row halves the work and looks fine on a symmetric villager. It breaks on a sword, a shield, a scar, a one-sided pauldron, or a light that is meant to come from the top-left: the flipped row swaps them. If the hero is asymmetric, plan to fix the left row in a pixel editor.",
            "When the player stops, show a standing frame for that facing, or the passing pose of the walk (feet together). Stopping on the first stride frame freezes the character mid-step.",
            "Front and back walks read poorly at small sizes because the legs move toward the camera. A one-pixel body bob and a slightly exaggerated arm swing read as walking; a physically accurate stride often looks like standing still.",
          ],
          links: [
            { label: "How to make a 4-direction top-down character", href: "/guides/how-to-make-a-4-direction-top-down-rpg-character" },
            { label: "8-direction walk cycle", href: "/guides/how-to-make-an-8-direction-walk-cycle" },
            { label: "RPG character creator", href: "/rpg-character-creator" },
          ],
        },
        {
          kind: "steps",
          id: "how",
          eyebrow: "how",
          title: <>From one sentence to a walk sheet</>,
          steps: [
            { title: "Generate the character facing the camera", body: "Use the top-down view in the generator so the first sprite is already the down-facing design. Clothes, weapon and colours belong in the prompt. The pose stays calm so the later views match." },
            { title: "Lock the style", body: "Every NPC and enemy in the same game should use that style. Mixing a side-view hero with top-down villagers is the mistake that makes a village look like two games." },
            { title: "Export the walk or the turnaround", body: "4-direction walk if the character moves on a tile grid. 4 or 8 standing directions if you only need facing, or you will animate the walk yourself." },
            { title: "Point your movement code at this row order", body: "Down, right, up, left. If your controller already assumes RPG Maker's order, remap the rows once in a single function and use it for every character." },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Does this make RPG Maker character sheets?", a: "It makes a 4-direction walk in SpriteLab's order: down, right, up, left, four frames per row, with left mirrored from right. RPG Maker MV/MZ sheets are often down, left, right, up with three frames. Reorder the rows if you need that layout. SpriteLab does not export an RPG Maker character file." },
        { q: "Can I get an 8-direction walk?", a: "Not as an animation. You can generate the character standing in 8 directions, then draw or mirror the diagonal walks. Animated 8-direction sets are a reason to look at a pixel-art specialist instead." },
        { q: "Why does the sword jump hands when the character faces left?", a: "The left row is a horizontal mirror of the right row. Anything held on one side swaps. Fix that row by hand if the asymmetry matters." },
        { q: "What about the floor?", a: "A top-down character needs tiles that share its pixel density. Seamless floor and wall tiles are a separate tool, and they are not an autotile set.", link: { label: "AI tileset generator", href: "/ai-tileset-generator" } },
        { q: "Can I sell the game?", a: COMMERCIAL_LICENCE_ANSWER },
      ]}
      cta={{
        title: <>Make the down-facing hero first</>,
        body: "Then turn that sprite into the walk sheet, instead of prompting four different characters.",
        button: SIGNUP_CTA,
      }}
    />
  );
}
