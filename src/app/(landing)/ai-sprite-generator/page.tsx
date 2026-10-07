import type { Metadata } from "next";
import { SeoLanding } from "@/components/landing/SeoLanding";
import { SHOWCASE } from "@/data/showcase";

const URL = "https://www.sprite-lab.com/ai-sprite-generator";

export const metadata: Metadata = {
  title: { absolute: "AI Sprite Generator for Games — Transparent PNG Sprites | SpriteLab" },
  description:
    "Generate game-ready 2D sprites with AI: characters, creatures, weapons, items and props as transparent PNGs, in 12 art styles. Animate them into sprite sheets. Free to try.",
  keywords: ["AI sprite generator", "sprite generator", "game sprite maker", "2D sprite generator", "AI game sprites", "transparent PNG sprites", "sprite creator online"],
  openGraph: {
    title: "AI Sprite Generator for Games — SpriteLab",
    description: "Describe a sprite, get a game-ready transparent PNG. Characters, creatures, weapons, items — then animate them.",
    url: URL,
    type: "website",
  },
  alternates: { canonical: URL },
};

export default function AiSpriteGeneratorPage() {
  return (
    <SeoLanding
      slug="ai-sprite-generator"
      appName="SpriteLab AI Sprite Generator"
      appDescription="Generate game-ready 2D sprites from a text prompt — characters, creatures, weapons, items and props — as transparent PNGs, and animate them into sprite sheets."
      heroLine="ai sprite generator for games"
      h1={
        <>
          AI Sprite Generator
          <br />
          <span className="text-[#FF8A3D]">game-ready in one sentence</span>
        </>
      }
      subtitle="Describe a character, monster, weapon or item and get a clean sprite with a transparent background — on a real pixel grid for pixel art, ready for your engine."
      trust={["3 free tries, no account", "10 credits on signup", "transparent png", "commercial use"]}
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
              Sprites, not <span className="text-[#FF8A3D]">illustrations</span>
            </>
          ),
          intro: "General image generators give you a picture on a background. SpriteLab cleans every result up so it drops straight into a game.",
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
              Every <span className="text-[#FF8A3D]">asset type</span> a 2D game needs
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
          eyebrow: "how it works",
          title: (
            <>
              From prompt to <span className="text-[#FF8A3D]">game asset</span>
            </>
          ),
          steps: [
            { title: "Pick the asset type and style", body: "Characters, creatures, weapons, items, icons, environment or tiles — in one of 12 styles from 16-bit pixel art to hand-painted." },
            { title: "Describe it", body: "“A goblin archer with a crooked bow, leather hood” — materials, colours and mood all help." },
            { title: "Download or animate", body: "Get a transparent PNG, upscale it pixel-perfect for free, or animate it into a sprite sheet." },
          ],
        },
        {
          kind: "prompts",
          eyebrow: "example prompts",
          title: (
            <>
              Try these <span className="text-[#FF8A3D]">prompts</span>
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
      ]}
      faq={[
        { q: "What is an AI sprite generator?", a: "It is a tool that creates game sprites — characters, items, weapons and props — from a text description. SpriteLab is built for game developers: results come out as transparent PNGs, and pixel art is snapped to a real pixel grid." },
        { q: "Are the sprites transparent?", a: "Yes. The background is removed automatically on every sprite, including enclosed gaps, so you get a clean PNG with an alpha channel." },
        { q: "Can I animate the sprites?", a: "Yes. Open any sprite in Animate, pick a suggested motion (idle, walk, attack, jump…) or describe your own, and download a sprite sheet, the frames and a GIF." },
        { q: "Can I use the sprites commercially?", a: "Yes, assets you generate can be used in commercial games with no attribution required." },
      ]}
      cta={{
        title: (
          <>
            Make your first <span className="text-[#FF8A3D]">sprite</span>
          </>
        ),
        body: "Three free tries without an account, 10 free credits when you sign up.",
        button: "Get 10 free credits",
      }}
    />
  );
}
