import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { RIG_CREDITS } from "@/config/animations";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { SIGNUP_CREDITS, SIGNUP_CTA, SIGNUP_ON_SIGNUP } from "@/config/signup";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/game-character-generator";
const TITLE = "AI Character Sprite Generator for 2D Games | SpriteLab";
const DESCRIPTION =
  "Generate AI character sprites for a 2D cast: one hero, enemies and NPCs that share a style, size and outline. Transparent PNG, ready to animate.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  keywords: [
    "AI character sprite",
    "AI character sprite generator",
    "game character generator",
    "2D character sprite generator",
    "enemy sprite generator",
    "NPC generator",
    "game character sprites",
  ],
  openGraph: { title: TITLE, description: DESCRIPTION, url: URL, type: "website" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  alternates: { canonical: URL },
};

export default function GameCharacterGeneratorPage() {
  return (
    <SeoLanding
      slug="game-character-generator"
      appName="SpriteLab AI Character Sprite Generator"
      breadcrumb="AI character sprite"
      appDescription="Generate AI character sprites for a consistent 2D cast — the player, enemies and NPCs — as transparent PNGs that share a style, pixel density and outline, then animate them."
      h1={
        <>
          AI character sprite generator
          <span className="sr-only"> for </span>
          <br />
          a cast that matches
        </>
      }
      subtitle="One hero is easy. A game needs that hero, three enemies and a shopkeeper that look like they were drawn for the same camera. Generate them as sprites, not as illustrations, and animate the ones that move."
      trust={[SIGNUP_ON_SIGNUP, "No card", "transparent png", "same outline across the cast"]}
      floating={[
        { src: "/showcase/armored-knight.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/goblin-archer.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/fox-mage.png", alt: "", pixel: true, cls: "" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "" },
      ]}
      sections={[
        {
          kind: "cards",
          id: "cast",
          eyebrow: "the cast",
          title: <>What to generate, and in what order</>,
          intro: "Start with the character the player stares at. Everything else is sized and styled against that sprite.",
          cols: 2,
          cards: [
            { title: "The player", body: "Full body, calm pose, arms off the torso so a later walk does not fuse the limbs. Side view for a platformer, top-down for an RPG. This sprite is the scale reference.", image: { src: "/showcase/knight.png", alt: "Pixel art knight sprite used as a scale reference", pixel: true } },
            { title: "Enemies", body: "Same style, same view, readable at the same size as the hero or an obvious multiple of it. A boss can be larger. A slime should not accidentally be as tall as the knight.", image: { src: "/showcase/slime.png", alt: "Pixel art slime enemy sprite", pixel: true } },
            { title: "NPCs", body: "Fewer details than the hero. A shopkeeper needs a silhouette and one prop (apron, hat, staff), not a second main character's worth of belts and trim.", image: { src: "/showcase/fox-mage.png", alt: "Pixel art fox mage NPC sprite", pixel: true } },
            { title: "The moves", body: "Animate the approved sprite. Prompting again for 'the same knight walking' draws a different knight. Idle, walk and attack should be the character you already kept.", image: { src: "/showcase/anim-knight-idle.webp", alt: "Animated pixel art knight idle loop", pixel: true } },
          ],
        },
        {
          kind: "checklist",
          id: "lock",
          eyebrow: "before the second character",
          title: <>Lock these, or the cast drifts</>,
          intro: "Write them down. Paste them into every prompt. Change one thing per character: the role, not the camera.",
          items: [
            "One style for the whole game. Pixel 16-bit with a hand-painted villager looks like a collage.",
            "One view. Side-view hero, top-down enemies: two games sharing a screen.",
            "One pixel density. Scale by whole numbers. Do not shrink a sprite until the pixels match.",
            "One outline rule. A 1 px dark outline on the hero and no outline on the goblin makes the goblin look pasted on.",
            "One light direction. Top-left on the hero, top-right on the NPC, and the scene never sits still.",
            "A margin inside the canvas so weapons and hair are not clipped. The feet land on the same baseline once you animate.",
          ],
        },
        {
          kind: "steps",
          id: "how",
          eyebrow: "how",
          title: <>Make the next character look related</>,
          steps: [
            { title: "Approve one sprite", body: "Generate a few versions of the hero. Keep one. Decline the almost-right ones; they become the style the rest of the cast quietly copies." },
            { title: "Reuse the prompt skeleton", body: "Keep style, view and outline words. Swap only the noun and the one detail that makes this character: 'village blacksmith, leather apron, hammer' instead of 'armored knight, tower shield'." },
            { title: "Check them side by side at game size", body: "A difference you can only see zoomed to 800% does not matter. A heavier outline or a different head-to-body ratio does. Judge at the size the camera uses." },
            { title: "Animate the keeper, not a new prompt", body: `Open that sprite in Animate. A rigged idle costs ${RIG_CREDITS} credits and deforms the sprite you kept, instead of drawing a new character.` },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
      ]}
      faq={[
        { q: "Is this the same as an RPG character creator?", a: "The RPG page is about fantasy roles: heroes, bosses, dungeon monsters. This page is about keeping any cast consistent — a platformer, a shooter, a village — so the second character does not become a different art style.", link: { label: "RPG character creator", href: "/rpg-character-creator" } },
        { q: "Can I get the same character in another pose by describing it again?", a: "You will get a relative, not the same character. Generate the design once, then animate that sprite for idle, walk and attack.", link: { label: "Walk cycle generator", href: "/walk-cycle-generator" } },
        { q: "What prompt actually matters?", a: "Species or role, clothes, materials, two or three colours, and the view that matches your camera. Skip 'masterpiece', 'trending' and a background. The background is removed.", link: { label: "How to prompt a sprite", href: "/guides/how-to-prompt-an-ai-sprite-generator" } },
        { q: "Do the characters have transparent backgrounds?", a: "Yes. You get a PNG with alpha, including the gaps between an arm and a weapon." },
        { q: "Can I use them in a commercial game?", a: COMMERCIAL_LICENCE_ANSWER },
      ]}
      cta={{
        title: <>Start with one character you would actually ship</>,
        body: `Sign up for ${SIGNUP_CREDITS} free credits and keep the sprite that fits the game. No card.`,
        button: SIGNUP_CTA,
      }}
    />
  );
}
