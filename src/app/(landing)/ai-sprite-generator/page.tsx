import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { COMMERCIAL_LICENCE_ANSWER } from "@/config/licence";
import { LANDING_SPECS } from "@/data/landing-specs";
import { SHOWCASE } from "@/data/showcase";
import { SIGNUP_CREDITS, SIGNUP_CTA, SIGNUP_ON_SIGNUP } from "@/config/signup";

const URL = "https://www.sprite-lab.com/ai-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "Sprite Maker & AI Sprite Generator for 2D Games | SpriteLab" },
  description:
    `Free online sprite maker: describe a character, monster, weapon or item and get a 2D game sprite as a transparent PNG. ${SIGNUP_CREDITS} free credits on signup.`,
  keywords: ["sprite maker", "sprite creator", "AI sprite generator", "2D sprite maker", "game sprite generator", "create sprites online", "free sprite maker", "sprite maker online", "2D sprite generator"],
  openGraph: {
    title: "Sprite Maker & AI Sprite Generator for 2D Games | SpriteLab",
    description: "Describe a sprite, get a game-ready transparent PNG. Characters, creatures, weapons, items — then animate them.",
    url: URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sprite Maker & AI Sprite Generator for 2D Games | SpriteLab",
    description: `Free online sprite maker: describe a character, monster, weapon or item and get a 2D game sprite as a transparent PNG. ${SIGNUP_CREDITS} free credits on signup.`,
  },
  alternates: { canonical: URL },
};

export default function AiSpriteGeneratorPage() {
  return (
    <SeoLanding
      slug="ai-sprite-generator"
      appName="SpriteLab AI Sprite Generator"
      breadcrumb="Sprite Maker"
      appDescription="Generate game-ready 2D sprites from a text prompt — characters, creatures, weapons, items and props — as transparent PNGs, and animate them into sprite sheets."
      heroLine="ai sprite generator for games"
      h1={
        <>
          AI Sprite Generator —
          <br />
          the online sprite maker for 2D games
        </>
      }
      subtitle="Create sprites online from one sentence: describe a character, monster, weapon or item and get a clean transparent PNG, on a real pixel grid for pixel art, ready for your engine. No drawing and nothing to install."
      trust={[SIGNUP_ON_SIGNUP, "No card", "transparent png", "commercial licence on paid plans"]}
      floating={[
        { src: "/showcase/knight.png", alt: "", pixel: true, cls: "left-[7%] top-[30%] w-24 animate-float" },
        { src: "/showcase/health-potion.png", alt: "", pixel: true, cls: "left-[14%] top-[62%] w-14 animate-float [animation-delay:1.2s]" },
        { src: "/showcase/fox-mage.png", alt: "", pixel: true, cls: "right-[8%] top-[26%] w-24 animate-float [animation-delay:0.6s]" },
        { src: "/showcase/slime.png", alt: "", pixel: true, cls: "right-[15%] top-[60%] w-16 animate-float [animation-delay:1.8s]" },
      ]}
      sections={[
        {
          kind: "features",
          id: "game-ready",
          eyebrow: "why it's game-ready",
          title: (
            <>
              Sprites, not illustrations
            </>
          ),
          intro: "General image generators give you a picture on a background. As a game sprite generator, SpriteLab cleans every result up so it drops straight into a game.",
          cards: [
            { title: "Transparent background", body: "The background is removed automatically — including the gaps between an arm and a sword — with no halo around the edges." },
            { title: "A real pixel grid", body: "Pixel-art results are snapped to one consistent pixel grid with a limited palette, so they stay crisp when scaled with nearest-neighbour." },
            { title: "Consistent outline", body: "Pixel styles get one thin outline, so sprites from the same session look like they belong to the same game." },
            { title: "Animate it", body: "Turn any sprite into an idle, walk, attack or custom animation and export a horizontal sprite sheet plus a GIF." },
          ],
        },
        { kind: "gallery", items: SHOWCASE },
        {
          kind: "cards",
          id: "what",
          eyebrow: "what you can make",
          title: (
            <>
              Every asset type a 2D game needs
            </>
          ),
          cols: 4,
          cards: [
            { title: "Characters", items: ["Heroes", "Enemies", "NPCs", "Bosses"], image: { src: "/showcase/armored-knight.png", alt: "Pixel art armored knight sprite made with SpriteLab", pixel: true } },
            { title: "Creatures", items: ["Animals", "Dragons", "Slimes", "Elementals"], image: { src: "/showcase/slime.png", alt: "Pixel art slime monster sprite made with SpriteLab", pixel: true } },
            { title: "Weapons & armor", items: ["Swords", "Bows", "Staffs", "Shields"], image: { src: "/showcase/fire-sword.png", alt: "Pixel art fire sword sprite made with SpriteLab", pixel: true } },
            { title: "Items & loot", items: ["Potions", "Food", "Keys", "Chests"], image: { src: "/showcase/health-potion.png", alt: "Pixel art health potion sprite made with SpriteLab", pixel: true } },
          ],
        },
        {
          kind: "steps",
          id: "how-to-use",
          eyebrow: "how to use the sprite maker",
          title: <>Make a sprite in three steps</>,
          intro: "Works in any browser on a computer or a phone.",
          steps: [
            { title: "Describe the sprite", body: "Type what it is and what makes it yours: “a goblin archer with a crooked bow and a leather hood”. Materials, colours and mood help; the view and pose are set for you (a calm A-pose for characters, ready to animate)." },
            { title: "Pick the type and style", body: "Character, creature, weapon, item, icon, environment or tile, in one of 12 styles from 16-bit pixel art to hand-painted. The style decides the outline, palette and shading." },
            { title: "Download, tweak or animate", body: "Download the transparent PNG, upscale it pixel-perfect for free, edit it with a sentence, or animate it into a sprite sheet with walk, attack or your own move." },
          ],
        },
        {
          kind: "cards",
          id: "vs-hand",
          eyebrow: "sprite maker vs drawing by hand",
          title: <>When to generate and when to draw</>,
          intro: "A sprite creator doesn't replace a pixel artist, and drawing every asset by hand isn't always the best use of a solo developer's time. Most games end up mixing both.",
          cols: 2,
          cards: [
            {
              title: "Generate when",
              body: "You need many assets fast, want to test ideas before committing, or don't draw yourself.",
              items: ["Prototypes and game jams", "Enemy and item variants", "Inventory items and loot", "Placeholder art you replace later", "Trying ten designs before choosing one"],
            },
            {
              title: "Draw by hand when",
              body: "A single asset carries the game's identity or needs exact, frame-by-frame control.",
              items: ["Your main character's final design", "Frame-precise fighting-game moves", "Very small sprites (8×8, 16×16)", "A strict palette or style guide", "Fixing details on generated sprites"],
            },
          ],
        },
        {
          kind: "prompts",
          eyebrow: "example prompts",
          title: (
            <>
              Try these prompts
            </>
          ),
          prompts: [
            "a goblin archer with a crooked bow and leather hood",
            "a red dragon with spread wings, side view",
            "a glass flask of bubbling green poison with a skull label",
            "an armored knight with a tower shield",
            "a wooden treasure chest overflowing with gold",
            "a fox mage holding a glowing staff",
          ],
        },
        LANDING_SPECS["ai-sprite-generator"],
      ]}
      faq={[
        { q: "What is an AI sprite generator?", a: "It is a tool that creates game sprites — characters, items, weapons and props — from a text description. SpriteLab is built for game developers: results come out as transparent PNGs, and pixel art is snapped to a real pixel grid." },
        { q: "Are the sprites transparent?", a: "Yes. The background is removed automatically on every sprite, including enclosed gaps, so you get a clean PNG with an alpha channel." },
        { q: "Is this sprite maker free?", a: `Sign up free for ${SIGNUP_CREDITS} credits. No card needed. After that there are monthly plans and one-off credit packs.` },
        { q: "Is it a sprite editor like Aseprite or Piskel?", a: "No. In a sprite editor you draw every pixel yourself; SpriteLab generates the whole sprite from a description. The results are ordinary PNGs, so you can open them in Aseprite, Piskel or any editor to touch up details." },
        { q: "Can I animate the sprites?", a: "Yes. Open any sprite in Animate, pick a suggested motion (idle, walk, attack, jump…) or describe your own, and download a sprite sheet, the frames and a GIF.", link: { label: "See the sprite sheet format", href: "/sprite-sheet-generator" } },
        { q: "Can I use the sprites commercially?", a: COMMERCIAL_LICENCE_ANSWER },
      ]}
      cta={{
        title: (
          <>
            Make your first sprite
          </>
        ),
        body: `Sign up free for ${SIGNUP_CREDITS} credits. No card needed.`,
        button: SIGNUP_CTA,
      }}
    />
  );
}
